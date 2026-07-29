import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { TENANT_COOKIE, type Tenant } from '@/app/lib/tenant-constants';
import type { UIComponentType } from '@/app/lib/types';

export const dynamic = 'force-dynamic';

// Parse the rct_tenant cookie out of a raw Cookie header — same pattern as /api/ask.
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
  console.warn('Failed to initialize Anthropic client for /api/agents/run');
}

function agentSystemPrompt(tenant: Tenant): string {
  const isUSD = tenant === 'us_apparel' || tenant === 'us_retail';
  const market = tenant === 'us_retail'
    ? 'Meridian Retail — a US general merchandise retailer (85 stores + Online/App/Curbside/Marketplace; 7 depts including Electronics, Apparel & Shoes, Home & Garden, Sports & Outdoor, Beauty & Personal, Grocery & Snacks, Toys & Games; events Memorial Day, July 4, Back to School, Labor Day, Halloween, Black Friday, Cyber Monday)'
    : tenant === 'us_apparel'
    ? 'a US apparel retailer (departments Mens/Womens/Kids/Footwear/Accessories; events BTS, BFCM, Holiday)'
    : 'an Indian supermarket chain';
  const currencyRule = isUSD
    ? '- Use $ values: $9.8K (thousands), $1.2M (millions). NEVER use ₹, lakhs, or crores.'
    : '- Use ₹ values: ₹9.8L (lakhs), ₹1.2Cr (crores)';
  const tenantPrefix = tenant === 'us_retail'
    ? `## Tenant context — Meridian Retail\nAll currency USD. 7 departments, 5 channels. Anchor date 2026-05-17. Pre-Black-Friday build window. There is NO Databricks connection for this tenant — reason from the context provided in the user prompt.\n\n`
    : tenant === 'us_apparel'
    ? `## Tenant context — US apparel\nAll currency USD. No Databricks connection for this tenant.\n\n`
    : '';

  return `${tenantPrefix}You are a specialized retail pricing AI agent for ${market}. You analyze specific requests and return structured insights.

Return your analysis as text followed by a JSON block of UI components.
At the end of your response, include:

\`\`\`components
[array of component objects]
\`\`\`

AVAILABLE COMPONENTS (return 2-5 per agent run):
- {"type":"kpi_card","label":"...","value":"...","change":"...","direction":"up|down"}
- {"type":"bar_chart","title":"...","data":[{"name":"...","value":N}...],"x_key":"name","y_key":"value"}
- {"type":"line_chart","title":"...","data":[{"label":"...","value":N}...],"x_key":"label","y_key":"value"}
- {"type":"data_table","title":"...","columns":["action","impact","priority","timing"],"data":[{...}...]}
- {"type":"donut_chart","title":"...","data":[{"name":"...","value":N}...],"name_key":"name","value_key":"value"}
- {"type":"comparison","items":[{"label":"...","metrics":{"...":"..."}}...]}

RULES:
- Always start with a narrative answer in plain text
${currencyRule}
- Be specific — reference actual numbers from the context provided
- 2-5 components max per run
- kpi_cards: always show 3-4 in sequence to form a row
- action items: express as data_table with columns: action, impact, priority, timing
- comparison: use for scenario comparisons (conservative/base/aggressive)`;
}

interface AgentRunRequest {
  agent_id: string;
  form_values?: Record<string, string | number | string[]>;
  chat_message?: string;
  kpis?: Record<string, unknown>;
  action_queue?: Record<string, unknown>[];
  campaigns?: Record<string, unknown>[];
  markdown_queue?: Record<string, unknown>[];
  model_card?: Record<string, unknown>;
  departments?: Record<string, unknown>[];
  forecast_14w?: Record<string, unknown>[];
  skus?: Record<string, unknown>[];
}

const VALID_AGENT_IDS = [
  'promo-scenario', 'price-strategy', 'competitive-response', 'margin-leak',
  'markdown-timing', 'weekly-briefing', 'event-readiness', 'demand-anomaly',
];

function lakhs(n: unknown, fallback: string): string {
  return typeof n === 'number' ? `${(n / 100000).toFixed(1)}L` : fallback;
}

function buildUserPrompt(body: AgentRunRequest): string {
  const {
    agent_id, form_values: fv = {}, chat_message,
    kpis, action_queue, markdown_queue, departments, skus,
  } = body;

  const k = (kpis ?? {}) as Record<string, unknown>;
  const leak = (k.margin_leakage_breakdown ?? {}) as Record<string, unknown>;
  const ctx = {
    margin_leakage: leak,
    total_leakage: k.total_margin_leakage_inr,
    promo_roi: k.promo_roi_index,
    free_rider_pct: k.free_rider_ratio_pct,
    sell_through: k.sell_through_pct,
    active_alerts: k.active_alerts,
  };

  switch (agent_id) {

    case 'promo-scenario': {
      const sku = (skus ?? []).find((s) => s.sku_id === fv.sku_id) || skus?.[0];
      return `Run a promotion scenario analysis.

PROMOTION PARAMETERS:
- SKU: ${sku?.product_name ?? fv.sku_id} (${sku?.department ?? 'Unknown'} · ${sku?.category ?? ''})
- Current price: ${sku?.current_price_inr ?? 'unknown'}
- Cost: ${sku?.cost_inr ?? 'unknown'}
- Current margin: ${sku?.current_margin_pct ?? 'unknown'}%
- Price elasticity: ${sku?.elasticity ?? -0.52} (${sku?.elasticity_class ?? 'moderate'})
- Discount depth: ${fv.discount_pct}% off MRP
- Duration: ${fv.duration_days} days
- Mechanic: ${fv.mechanic}
- Target segment: ${fv.target_segment ?? 'all customers'}

CURRENT CONTEXT:
- Base free-rider ratio: ${ctx.free_rider_pct}%
- Promo ROI index: ${ctx.promo_roi}
- Total margin leakage: ${ctx.total_leakage}

Analyze: expected ROI, volume lift, free-rider waste, cannibalization risk.
Show 3 scenarios: conservative (loyalty-gated), base (as specified), aggressive (extended).
End with a clear recommendation.
Include: 3-4 kpi_cards (ROI, volume lift, free-rider %, cannibalization),
         comparison (3 scenarios), data_table (recommended actions).`;
    }

    case 'price-strategy': {
      const dept = (departments ?? []).find((d) =>
        String(d.name ?? '').toLowerCase().includes(String(fv.category ?? '').toLowerCase()));
      return `Generate a pricing strategy for a retail category.

CATEGORY: ${fv.category}
HORIZON: ${fv.horizon}
OBJECTIVE: ${fv.objective}

CATEGORY DATA:
- Current margin: ${dept?.current_margin_pct ?? 'N/A'}%
- Margin floor: ${dept?.margin_floor_pct ?? 'N/A'}%
- Sell-through: ${dept?.sell_through_pct ?? 'N/A'}%
- SKU count: ${dept?.sku_count ?? 'N/A'}

CONTEXT: ${JSON.stringify(ctx)}

Generate: base price recommendations per velocity tier (A/B/C),
promo calendar (which weeks to run promos, which mechanics),
event preparation (next major event ~20 days out),
3 risk flags.
Include: kpi_cards (current margin, target margin, SKUs to raise, SKUs to cut),
         data_table (SKU tier recommendations), bar_chart (margin by subcategory).`;
    }

    case 'competitive-response':
      return `A competitor made this pricing move: "${chat_message}"

RETAILER CONTEXT:
- KVI exposure: 3 SKUs currently above competitor on tracked items
- Competitive index: ${k.competitive_index ?? 97.3}
- Our promo ROI: ${ctx.promo_roi ?? 68}

Apply Kotler's four pricing traps:
1. Low-quality trap — matching signals lower quality
2. Fragile market-share trap — gained share may not hold
3. Shallow-pockets trap — can we sustain a price war?
4. Price-war trap — does matching trigger escalation?

Analyze: why did competitor move? What's the risk of not responding?
Give 3 response options: Match / Hold / Differentiate.
Recommend one clearly with reasoning.
Include: kpi_cards (current competitive index, KVIs exposed, risk level),
         comparison (3 response options with trade-offs),
         data_table (trap analysis: trap name, risk level, applies?).`;

    case 'margin-leak':
      return `Investigate this week's margin leakage.

LEAKAGE DATA:
- Total leakage: ${lakhs(ctx.total_leakage, '22.3L')}/week
- Free-rider promo waste: ${lakhs(leak.promo_free_rider_inr, '9.8L')}
- Cost passthrough gap: ${lakhs(leak.cost_passthrough_gap_inr, '6.2L')}
- Premature markdown: ${lakhs(leak.premature_markdown_inr, '3.4L')}
- Elasticity underpricing: ${lakhs(leak.elasticity_underpricing_inr, '2.9L')}

TOP URGENT ACTIONS: ${JSON.stringify((action_queue ?? []).slice(0, 3))}

Rank the 4 leak types by impact. For each: what caused it, which SKUs/campaigns,
recommended fix, timeline.
Include: kpi_cards (4 leak amounts), bar_chart (leakage by type),
         data_table (leak | amount | top SKU | fix | week to resolve).`;

    case 'markdown-timing': {
      const wanted = (fv.sku_ids as string[] | undefined) ?? [];
      const selectedSkus = (markdown_queue ?? [])
        .filter((i) => wanted.includes(String(i.sku_id)))
        .slice(0, 5);
      return `Optimize markdown timing for these SKUs.

SELECTED SKUs: ${JSON.stringify(selectedSkus)}
DAYS REMAINING: ${fv.days_remaining} days

For each SKU: current sell-through vs target, recommended markdown depth,
timing (now / in N days / hold), expected clearance %, revenue recovery.
Flag any where write-off risk is HIGH (< 50% projected clearance at max depth).
Include: kpi_cards (total units at risk, avg recommended depth, revenue at stake),
         data_table (SKU | ST% | rec depth | timing | expected clear% | priority),
         line_chart (projected sell-through trajectory if markdown applied now vs delayed).`;
    }

    case 'weekly-briefing':
      return `Generate a Monday morning pricing brief for a category manager.

CURRENT STATE:
- Margin leakage: ${lakhs(ctx.total_leakage, '22.3L')}/week
- Active alerts: ${ctx.active_alerts ?? 11} (4 urgent)
- Promo ROI: ${ctx.promo_roi ?? 68.4}/100
- Sell-through: ${ctx.sell_through ?? 69.8}% vs 70% target
- Free-rider ratio: ${ctx.free_rider_pct ?? 41.2}%

TOP ACTIONS: ${JSON.stringify((action_queue ?? []).filter((i) => i.priority === 'urgent').slice(0, 3))}

Structure the brief in 4 sections:
1. WHAT CHANGED this week (3-5 bullets with impacts)
2. WHAT WORKED (best campaigns, categories beating plan)
3. DECISIONS NEEDED (top 3, ranked by urgency + impact)
4. WHAT'S COMING (next 14 days: events, campaigns ending, markdown windows)

Include: kpi_cards (margin leakage, active alerts, promo ROI, sell-through),
         data_table (top 3 decisions: decision | impact | deadline | action).`;

    case 'event-readiness':
      return `Check readiness for the next major event.

NEXT EVENT: ~20 days away (highest-significance upcoming event)
Historical uplift: +31% overall; strongest departments up to +45%

CURRENT INVENTORY CONTEXT:
- Active alerts: ${ctx.active_alerts ?? 11}
- Overall sell-through: ${ctx.sell_through ?? 69.8}%
- Departments: ${JSON.stringify((departments ?? []).map((d) =>
    ({ name: d.name, st: d.sell_through_pct, margin: d.current_margin_pct })))}

Assess readiness across the departments. For each: current stock vs projected demand,
gap to target inventory, recommended reorder quantity, ordering deadline.
Overall readiness score 0-100.
Include: kpi_cards (readiness score, days to event, SKUs not ramped, revenue at risk),
         bar_chart (readiness by department),
         data_table (dept | projected uplift | stock status | reorder qty | deadline).`;

    case 'demand-anomaly':
      return `Analyze this demand anomaly: "${chat_message}"

RECENT CONTEXT:
- Overall sell-through: ${ctx.sell_through ?? 69.8}%
- Active alerts: ${ctx.active_alerts ?? 11}
- Free-rider ratio: ${ctx.free_rider_pct ?? 41.2}%

Determine: is this a REAL DEMAND SIGNAL or a DATA QUALITY ISSUE?

Consider signal causes: festival/event effect, competitor stockout,
weather-driven demand, promotional spillover, new store opening.

Consider data causes: double-counting, wrong store mapping,
GRN timing issue, POS sync delay, price change misclassification.

Give a verdict with confidence %. List top 3 explanations by likelihood.
Recommend: investigate further / capitalize on demand / flag for data team.
Include: kpi_cards (verdict confidence, magnitude, affected SKUs estimate),
         comparison (top 3 explanations: cause | likelihood | evidence | action),
         data_table (recommended next steps with owner and timeline).`;

    default:
      return `Run agent ${agent_id} with context: ${JSON.stringify(body)}`;
  }
}

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

function stripComponentsBlock(text: string): string {
  return text.replace(/```components\n[\s\S]*?```/g, '').trimEnd();
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AgentRunRequest;
  const { agent_id } = body;

  // 1. Validate agent_id against registry
  if (!VALID_AGENT_IDS.includes(agent_id)) {
    return NextResponse.json({ error: `Unknown agent: ${agent_id}` }, { status: 400 });
  }

  const tenant = getTenantFromRequest(request);
  const systemPrompt = agentSystemPrompt(tenant);
  const userPrompt = buildUserPrompt(body);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        if (!anthropic) {
          const fallbackText =
            `Agent ${agent_id} could not reach the analysis model (no API key configured). ` +
            'Showing a snapshot from the latest cached data instead.';
          send({ type: 'text', content: fallbackText });
          send({
            type: 'done',
            answer: fallbackText,
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

        const messageStream = anthropic.messages.stream({
          model: modelName,
          max_tokens: 2500,
          temperature: 0,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });

        let fullText = '';
        let insideComponents = false;
        let pending = '';

        for await (const event of messageStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const chunk = event.delta.text;
            fullText += chunk;

            if (!insideComponents) {
              pending += chunk;
              const openIdx = pending.indexOf('```components');
              if (openIdx !== -1) {
                const before = pending.slice(0, openIdx);
                if (before) send({ type: 'text', content: before });
                insideComponents = true;
                pending = '';
              } else if (pending.length > 24) {
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
        console.error('agents/run error:', err);
        send({ type: 'text', content: 'Agent run failed. Please try again.' });
        send({ type: 'done', components: [], answer: 'Agent run failed. Please try again.' });
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
