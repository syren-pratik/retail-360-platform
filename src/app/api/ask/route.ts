import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { TENANT_COOKIE, type Tenant } from '@/app/lib/tenant-constants';
import type { UIComponentType } from '@/app/lib/types';
import {
  ASK_ACTION_TOOLS,
  executeAskTool,
  getToolLabel,
  toolResultToString,
} from './action-tools';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Parse the rct_tenant cookie out of a raw Cookie header. Same pattern as
// /api/chat — cookies() from next/headers has burned us in streaming scope.
function getTenantFromRequest(request: NextRequest): Tenant {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${TENANT_COOKIE}=`));
  const value = match?.split('=')[1];
  if (value === 'us_apparel') return 'us_apparel';
  if (value === 'us_retail') return 'us_retail';
  return 'india_grocery';
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

const ACTION_CAPABILITIES = `

You also have ACTION TOOLS available. Use them when the user asks you to DO something
(not just analyze) — raise a PO, pause a campaign, execute a markdown, generate an RFQ,
or set a reminder. Rules:

- BEFORE using any write tool (raise_purchase_order, pause_campaign, execute_markdown,
  generate_rfq), first call check_erp_connection so the user sees the honest ERP state.
- BEFORE generating artifacts, use query_live_data to preview the affected SKUs /
  campaigns and share a short summary with the user.
- ALWAYS ask the user to confirm before running raise_purchase_order, pause_campaign,
  execute_markdown, or generate_rfq. Do not silently execute.
- After a write tool succeeds, briefly summarise what was produced (files, email
  recipient, Databricks reference). The UI renders the artifacts inline — do not paste
  raw JSON.
- set_reminder is safe to run without ERP checks.

When just answering an analytical question, do not use action tools.`;

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
When asked about a specific SKU or category, draw on the context you know.
${ACTION_CAPABILITIES}`;

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
When asked about a specific SKU or category, draw on the context you know.
${ACTION_CAPABILITIES}`;

const ASK_SYSTEM_PROMPT_RETAIL = `You are an AI analyst for Meridian Retail — a US general
merchandise retailer (85 stores plus DTC/App/Curbside/Marketplace). You have access to
pricing, demand, inventory, and customer data from the cached warehouse.

${COMPONENTS_SPEC}
- Use $ values in US format (thousands/millions): $22.3K, $1.2M
- All numbers in USD. NEVER use ₹, lakhs, or crores.

You know the following about this retailer's current state:
- 200 SKUs across 7 departments: Electronics (12% floor), Apparel & Shoes (45%),
  Home & Garden (38%), Sports & Outdoor (35%), Beauty & Personal (48%),
  Grocery & Snacks (22%), Toys & Games (40%)
- Channels: In-Store $1.2M, Online $890K, App $340K, Curbside $180K, Marketplace $95K
- Total margin leakage: $142K/week ($58K free-rider Electronics, $34K missed cost
  passthroughs, $28K premature markdowns, $12K elasticity gap, $10K returns)
- Margin realization: 81.4%; sell-through 74.2%; promo ROI index 71.2; free-rider 38.5%
- 14 active alerts
- Anchor date: 2026-05-17
- Season: Pre-Black Friday build · 187 days to Black Friday · Back to School winding down
- Brands include Samsung, Apple, Sony, LG, Levi's, Nike, Adidas, Dyson, KitchenAid,
  L'Oréal, Coca-Cola, LEGO, Nintendo, plus the Meridian private label

Be concise, specific, and action-oriented. Reference real $ values from the data above.
${ACTION_CAPABILITIES}`;

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

const MAX_ROUNDS = 8;

export async function POST(request: NextRequest) {
  const body: AskRequestBody = await request.json();
  const tenant = getTenantFromRequest(request);
  const systemPrompt =
    tenant === 'us_retail' ? ASK_SYSTEM_PROMPT_RETAIL :
    tenant === 'us_apparel' ? ASK_SYSTEM_PROMPT_APPAREL :
    ASK_SYSTEM_PROMPT_GROCERY;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch { /* closed */ }
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
              tenant === 'us_retail'
                ? { type: 'kpi_card', label: 'Margin Leakage', value: '$142K/wk', change: '-0.4pp', direction: 'down' }
                : tenant === 'us_apparel'
                ? { type: 'kpi_card', label: 'Margin Leakage', value: '$1.82M/wk', change: '-0.4pp', direction: 'down' }
                : { type: 'kpi_card', label: 'Margin Leakage', value: '₹22.3L/wk', change: '-0.4pp', direction: 'down' },
            ] satisfies UIComponentType[],
          });
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        const anthropicMessages: Anthropic.MessageParam[] = (body.messages ?? [])
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content }));

        let fullText = '';

        // ── Tool-use loop ────────────────────────────────────────────────
        for (let round = 0; round < MAX_ROUNDS; round++) {
          const response: Anthropic.Message = await anthropic.messages.create({
            model: modelName,
            max_tokens: 2000,
            temperature: 0,
            system: systemPrompt,
            messages: anthropicMessages,
            tools: ASK_ACTION_TOOLS,
          });

          // Stream text blocks in this round, and dispatch any tool_use blocks.
          for (const block of response.content) {
            if (block.type === 'text') {
              fullText += block.text;
              // Strip the components block from what we stream to the client;
              // it'll be parsed at the end.
              const cleaned = block.text.replace(/```components\n[\s\S]*?```/g, '');
              if (cleaned) send({ type: 'text', content: cleaned });
            }
          }

          const toolUseBlocks = response.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
          );

          if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
            break;
          }

          // Append the assistant's turn (contains the tool_use blocks).
          anthropicMessages.push({ role: 'assistant', content: response.content });

          // Execute each tool and collect tool_result blocks for the next turn.
          const toolResultContent: Anthropic.ToolResultBlockParam[] = [];
          for (const tuBlock of toolUseBlocks) {
            const toolName = tuBlock.name;
            const toolInput = (tuBlock.input ?? {}) as Record<string, unknown>;
            const label = getToolLabel(toolName);
            send({ type: 'tool_call', tool: toolName, label });

            const result = await executeAskTool(toolName, toolInput, (text) => {
              send({ type: 'tool_progress', tool: toolName, text });
            }, tenant);

            // Emit the visible action_result event (artifacts, erp results, etc.)
            send({
              type: 'action_result',
              tool: toolName,
              result: {
                success: result.success,
                summary: result.summary,
                artifacts: result.artifacts ?? [],
                erp_results: result.erp_results,
                available_actions: result.available_actions,
                databricks_ref: result.databricks_ref,
                rows_affected: result.rows_affected,
                preview: result.preview,
                reminder: result.reminder,
              },
            });

            toolResultContent.push({
              type: 'tool_result',
              tool_use_id: tuBlock.id,
              content: toolResultToString(result),
              is_error: !result.success,
            });
          }

          anthropicMessages.push({ role: 'user', content: toolResultContent });
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
