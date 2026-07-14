import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { TENANT_COOKIE, type Tenant } from '@/app/lib/tenant-constants';
import type { UIComponentType } from '@/app/lib/types';

export const dynamic = 'force-dynamic';

// Parse the rct_tenant cookie out of a raw Cookie header. Same pattern as
// /api/chat — cookies() from next/headers has burned us in streaming scope.
function getTenantFromRequest(request: NextRequest): Tenant {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${TENANT_COOKIE}=`));
  const value = match?.split('=')[1];
  return value === 'us_apparel' ? 'us_apparel' : 'india_grocery';
}

// Initialize Anthropic client - supports both direct Anthropic and Azure AI Foundry
let anthropic: Anthropic | null = null;
let modelName = 'claude-sonnet-4-5-20250514';

try {
  if (process.env.ANTHROPIC_API_KEY) {
    if (process.env.AZURE_ENDPOINT) {
      anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.AZURE_ENDPOINT,
      });
      modelName = process.env.AZURE_MODEL_NAME || 'claude-sonnet-4-5';
    } else {
      anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }
} catch {
  console.warn('Failed to initialize Anthropic client for /api/ask');
}

const COMPONENTS_SPEC = `When answering questions, you can return visual components alongside your text answer.
At the end of your response, if charts or data would help, return a JSON block:

\`\`\`components
[
  { "type": "kpi_card", "label": "...", "value": "...", "change": "...", "direction": "up|down" },
  { "type": "bar_chart", "title": "...", "data": [...], "x_key": "...", "y_key": "..." },
  { "type": "line_chart", "title": "...", "data": [...], "x_key": "...", "y_key": "..." },
  { "type": "data_table", "title": "...", "columns": [...], "data": [...] },
  { "type": "donut_chart", "title": "...", "data": [...], "name_key": "...", "value_key": "..." },
  { "type": "comparison", "items": [{ "label": "...", "metrics": { "...": "..." } }] }
]
\`\`\`

Rules for components:
- Return 1-4 components maximum per response
- Only return components when they genuinely help (not for every response)
- kpi_card: always include change and direction when trend data is available
- bar_chart/line_chart: data array must have at least 3 points
- Component data must reference real numbers from the conversation context`;

const ASK_SYSTEM_PROMPT_GROCERY = `You are an AI analyst for an Indian supermarket retail
intelligence platform called Retail 360. You have access to real pricing, demand,
and customer data from the retailer's Databricks warehouse.

${COMPONENTS_SPEC}
- Use ₹ values in Indian format (lakhs/crores): ₹22.3L, ₹1.2Cr
- All numbers in INR unless otherwise specified

You know the following about this retailer's current state:
- 200 SKUs across 5 departments: Grocery & Staples, Beverages, Dairy & Frozen,
  Snacks & Biscuits, Personal Care
- Total margin leakage: ₹22.3L/week (free-rider waste ₹9.8L, cost passthrough ₹6.2L,
  premature markdown ₹3.4L, elasticity gap ₹2.9L)
- Promo ROI trend: W1=2.48× to W14=3.52× (improving)
- Overall sell-through: 69.8% vs 70% target
- 11 active pricing alerts (4 urgent, 4 review, 3 info)
- Anchor date: 2026-05-17
- Next event: Eid al-Adha in ~20 days

Be concise, specific, and action-oriented. Reference real ₹ values from the data above.
When asked about a specific SKU or category, draw on the context you know.`;

const ASK_SYSTEM_PROMPT_APPAREL = `You are an AI analyst for a US apparel retail
intelligence platform called Retail 360. You have access to real pricing, demand,
and customer data from the retailer's Databricks warehouse.

${COMPONENTS_SPEC}
- Use $ values in US format (thousands/millions): $22.3K, $1.2M
- All numbers in USD. NEVER use ₹, lakhs, or crores.

You know the following about this retailer's current state:
- 200 SKUs across 5 departments: Mens, Womens, Kids, Footwear, Accessories
- Brands: Nike, Levi, Lululemon, VF Corp, PVH, Adidas, Gap, Under Armour, and private label
- Total margin leakage: $1.82M/week (BFCM-overlap free-rider $0.78M, premature
  markdowns $0.42M, returns-margin leak $0.34M, elasticity gap $0.28M)
- Margin realization: 85.8% (-0.4pp WoW); RAGM (returns-adjusted gross margin): 44.6%
- Overall sell-through: 62.9% vs 65% target
- Returns rates: Womens dresses 22%, denim 16-18%, footwear 16%
- 29 active pricing alerts
- Anchor date: 2026-06-29
- Next event: Back-to-School peak in ~26 days; BFCM after

Be concise, specific, and action-oriented. Reference real $ values from the data above.
When asked about a specific SKU or category, draw on the context you know.`;

const VALID_COMPONENT_TYPES = [
  'bar_chart', 'line_chart', 'donut_chart', 'data_table', 'kpi_card', 'comparison', 'text_only',
];

function extractComponents(text: string): UIComponentType[] {
  const match = text.match(/```components\n([\s\S]*?)```/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c) =>
      c && typeof c === 'object' &&
      typeof c.type === 'string' &&
      VALID_COMPONENT_TYPES.includes(c.type)
    ) as UIComponentType[];
  } catch {
    return [];
  }
}

/** Strip the ```components block from displayed text so the raw JSON never shows. */
function stripComponentsBlock(text: string): string {
  return text.replace(/```components\n[\s\S]*?```/g, '').trimEnd();
}

interface AskRequestBody {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  module?: string;
  tenant?: string;
}

export async function POST(request: NextRequest) {
  const body: AskRequestBody = await request.json();
  const tenant = getTenantFromRequest(request);
  const systemPrompt = tenant === 'us_apparel' ? ASK_SYSTEM_PROMPT_APPAREL : ASK_SYSTEM_PROMPT_GROCERY;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        if (!anthropic) {
          // No API key — deterministic fallback so the screen still works.
          const fallbackText =
            'I could not reach the analysis model (no API key configured). ' +
            'Here is a snapshot from the latest cached data instead.';
          send({ type: 'text', content: fallbackText });
          send({
            type: 'done',
            components: [
              tenant === 'us_apparel'
                ? { type: 'kpi_card', label: 'Margin Leakage', value: '$1.82M/wk', change: '-0.4pp', direction: 'down' }
                : { type: 'kpi_card', label: 'Margin Leakage', value: '₹22.3L/wk', change: '-0.4pp', direction: 'down' },
            ] satisfies UIComponentType[],
          });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        const anthropicMessages = (body.messages ?? [])
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content }));

        const messageStream = anthropic.messages.stream({
          model: modelName,
          max_tokens: 2000,
          temperature: 0,
          system: systemPrompt,
          messages: anthropicMessages,
        });

        let fullText = '';
        let insideComponents = false;
        let pending = '';

        for await (const event of messageStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const chunk = event.delta.text;
            fullText += chunk;

            // Suppress streaming of the ```components block so raw JSON
            // never flashes on screen; it is parsed at the end instead.
            if (!insideComponents) {
              pending += chunk;
              const openIdx = pending.indexOf('```components');
              if (openIdx !== -1) {
                const before = pending.slice(0, openIdx);
                if (before) send({ type: 'text', content: before });
                insideComponents = true;
                pending = '';
              } else if (pending.length > 24) {
                // Flush all but a tail long enough to hold a split marker.
                const flushLen = pending.length - 16;
                send({ type: 'text', content: pending.slice(0, flushLen) });
                pending = pending.slice(flushLen);
              }
            }
          }
        }

        if (!insideComponents && pending) {
          send({ type: 'text', content: pending });
        }

        const components = extractComponents(fullText);
        send({ type: 'done', components, answer: stripComponentsBlock(fullText) });
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        console.error('ask route error:', err);
        send({ type: 'text', content: 'Something went wrong while analysing. Please try again.' });
        send({ type: 'done', components: [] });
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
