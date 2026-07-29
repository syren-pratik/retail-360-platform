/**
 * Shared helpers for Sprint AG3 action-agent API routes.
 *
 * These 6 routes all follow the same pattern:
 *   1. Initialize Anthropic (Azure-aware).
 *   2. Detect tenant off the cookie.
 *   3. Run a Claude-with-tools loop, streaming interim thinking + tool calls
 *      over SSE to the caller.
 *   4. Extract a ```proposals JSON block from the final assistant turn.
 *
 * Everything here is copied verbatim (in shape) from src/app/api/chat/route.ts
 * — do not diverge without updating both.
 */

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse, type NextRequest } from 'next/server';
import { dispatchTypedTool, type TypedToolName } from '@/app/lib/dbx-tools';
import { TENANT_COOKIE, type Tenant } from '@/app/lib/tenant-constants';
import type { UIComponentType } from '@/app/lib/types';

// ── Anthropic client init (mirrors chat/route.ts) ──────────────────────────

export function initAnthropicClient(): { client: Anthropic | null; model: string } {
  let client: Anthropic | null = null;
  let model = 'claude-sonnet-4-5-20250514';

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      if (process.env.AZURE_ENDPOINT) {
        client = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
          baseURL: process.env.AZURE_ENDPOINT,
        });
        model = process.env.AZURE_MODEL_NAME || 'claude-sonnet-4-5';
      } else {
        client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      }
    }
  } catch {
    // fall through — client stays null, routes return 500
  }

  return { client, model };
}

// ── Tenant detection (copied verbatim from chat/route.ts) ──────────────────

export function detectTenant(req: NextRequest): Tenant {
  const cookieHeader = req.headers.get('cookie') ?? '';
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${TENANT_COOKIE}=`));
  const value = match?.split('=')[1];
  if (value === 'us_apparel') return 'us_apparel';
  if (value === 'us_retail') return 'us_retail';
  return 'india_grocery';
}

function tenantContextForPrompt(tenant: Tenant): string {
  if (tenant === 'us_retail') {
    return `\n\n## Tenant context — Meridian Retail (US general retail)\nAll currency is USD ($). NEVER use ₹, lakhs, or crores. 7 departments: Electronics, Apparel & Shoes, Home & Garden, Sports & Outdoor, Beauty & Personal, Grocery & Snacks, Toys & Games. Channels: In-Store, Online, App, Curbside, Marketplace. Anchor date 2026-05-17. Key events: Memorial Day, July 4, Back to School, Labor Day, Halloween, Black Friday, Cyber Monday. NEVER reference Eid, Diwali, Monsoon, or Indian cities. There is NO live Databricks connection in this tenant — reason from the tenant context and the user's dashboard state provided in the prompt.`;
  }
  if (tenant === 'us_apparel') {
    return `\n\n## Tenant context — US apparel\nAll currency is USD ($). NEVER use ₹, lakhs, or crores. Departments: Mens/Womens/Kids/Footwear/Accessories. Key events: BTS, BFCM, Holiday, Memorial Day, July 4. There is NO live Databricks connection in this tenant — reason from the tenant context.`;
  }
  return '';
}

// ── SSE stream helper ──────────────────────────────────────────────────────

export function createSSEStream(): {
  stream: ReadableStream<Uint8Array>;
  send: (obj: unknown) => void;
  close: () => void;
} {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  let closed = false;
  const send = (obj: unknown) => {
    if (closed) return;
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
    } catch {
      /* stream closed under us */
    }
  };
  const close = () => {
    if (closed) return;
    closed = true;
    try {
      controller.close();
    } catch {
      /* already closed */
    }
  };
  return { stream, send, close };
}

// ── Tool schemas (copied verbatim from chat/route.ts TOOLS array) ──────────

export function getActionAgentTools(): Anthropic.Tool[] {
  return [
    {
      name: 'cx_lookup',
      description:
        "Look up customer 360 data: RFM segments, churn risk, top-CLV customers, cohort retention, or a single customer's 360 record. Live Databricks query against genome_customer_360. Use this for ANY customer question.",
      input_schema: {
        type: 'object' as const,
        properties: {
          scope: {
            type: 'string',
            enum: ['segment_summary', 'churn_risk', 'top_value', 'cohort', 'customer'],
            description:
              'segment_summary=aggregate by RFM; churn_risk=top at-risk; top_value=highest CLV; cohort=retention curves; customer=full single-customer record (needs customer_id)',
          },
          filter: {
            type: 'object',
            properties: {
              rfm_segment: { type: 'string' },
              churn_risk_tier: { type: 'string', enum: ['Very High', 'High', 'Medium', 'Low'] },
              clv_tier: { type: 'string', enum: ['Platinum', 'Gold', 'Silver', 'Bronze'] },
              city: { type: 'string' },
              customer_id: { type: 'string' },
            },
          },
          limit: { type: 'number', description: 'Max rows (default 50, capped at 500)' },
        },
        required: ['scope'],
      },
    },
    {
      name: 'inventory_status',
      description:
        "Live inventory state from Databricks: today's stockouts, replenishment recommendations, overstock, health by department, or per-SKU detail. Always pulls latest date_id automatically.",
      input_schema: {
        type: 'object' as const,
        properties: {
          scope: {
            type: 'string',
            enum: ['health_summary', 'stockouts_now', 'replenishment_needed', 'overstock', 'sku_lookup'],
          },
          filter: {
            type: 'object',
            properties: {
              city: { type: 'string' },
              store_type: { type: 'string' },
              department: { type: 'string' },
              abc_class: { type: 'string', enum: ['A', 'B', 'C'] },
              product_id: { type: 'string' },
            },
          },
          limit: { type: 'number', description: 'Max rows (default 50, capped at 500)' },
        },
        required: ['scope'],
      },
    },
    {
      name: 'demand_lookup',
      description:
        "Live demand and forecast from Databricks: rolled-up sales, top-moving SKUs, ML forecasts with CIs, festival uplift, or a SKU's daily trend.",
      input_schema: {
        type: 'object' as const,
        properties: {
          scope: { type: 'string', enum: ['sales_summary', 'top_movers', 'forecast', 'festival_uplift', 'sku_trend'] },
          filter: {
            type: 'object',
            properties: {
              department: { type: 'string' },
              category_l1: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              abc_class: { type: 'string', enum: ['A', 'B', 'C'] },
              product_id: { type: 'string' },
              festival_name: { type: 'string' },
              window_days: { type: 'number', description: 'Lookback window (default 7)' },
            },
          },
          limit: { type: 'number', description: 'Max rows (default 50, capped at 500)' },
        },
        required: ['scope'],
      },
    },
    {
      name: 'supplier_health',
      description:
        "Live supplier scorecard from Databricks: full OTIF table, underperformers (OTIF < X%), recent cost-change events, or one supplier's detail.",
      input_schema: {
        type: 'object' as const,
        properties: {
          scope: { type: 'string', enum: ['scorecard', 'underperformers', 'cost_changes', 'supplier_lookup'] },
          filter: {
            type: 'object',
            properties: {
              supplier_id: { type: 'string' },
              supplier_name: { type: 'string' },
              max_on_time_pct: { type: 'number', description: 'For underperformers — threshold (default 75)' },
            },
          },
          limit: { type: 'number' },
        },
        required: ['scope'],
      },
    },
    {
      name: 'price_intel_lookup',
      description:
        "Live pricing from Databricks: ML pricing recommendations ranked by revenue impact, elasticity ranking, competitive gaps (vs Blinkit/Zepto/etc.), promo effectiveness, or one SKU's full pricing picture.",
      input_schema: {
        type: 'object' as const,
        properties: {
          scope: { type: 'string', enum: ['recommendations', 'elasticity', 'competitive_gaps', 'promo_effectiveness', 'sku_pricing'] },
          filter: {
            type: 'object',
            properties: {
              category_l1: { type: 'string' },
              abc_class: { type: 'string', enum: ['A', 'B', 'C'] },
              product_id: { type: 'string' },
              promo_id: { type: 'string' },
              min_revenue_impact: { type: 'number', description: 'Absolute INR impact threshold' },
            },
          },
          limit: { type: 'number' },
        },
        required: ['scope'],
      },
    },
  ];
}

// ── Agent loop ─────────────────────────────────────────────────────────────

export type ThinkingCb = (text: string) => void;
export type ToolCallCb = (tool: string, input: Record<string, unknown>) => void;
export type ToolResultCb = (tool: string, result: unknown) => void;

const TYPED_TOOL_NAMES: ReadonlySet<string> = new Set([
  'cx_lookup',
  'inventory_status',
  'demand_lookup',
  'supplier_health',
  'price_intel_lookup',
]);

export async function runAgentLoop(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  tools: Anthropic.Tool[],
  onThinking: ThinkingCb,
  onToolCall: ToolCallCb,
  onToolResult: ToolResultCb,
  maxRounds = 5,
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userPrompt }];
  let finalText = '';

  for (let round = 0; round < maxRounds; round++) {
    const response: Anthropic.Message = await client.messages.create({
      model,
      max_tokens: 4000,
      system: systemPrompt,
      messages,
      ...(tools.length ? { tools } : {}),
    });

    // Collect text blocks (interim reasoning + potential final answer).
    let roundText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        roundText += block.text;
      }
    }
    if (roundText) {
      onThinking(roundText);
      finalText = roundText; // last-round text wins; captures ```proposals block
    }

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );

    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      break;
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResultContent: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const input = (block.input ?? {}) as Record<string, unknown>;
      onToolCall(block.name, input);

      if (!TYPED_TOOL_NAMES.has(block.name)) {
        toolResultContent.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: `Error: tool "${block.name}" not available in action-agent context`,
          is_error: true,
        });
        continue;
      }

      try {
        const result = await dispatchTypedTool(block.name as TypedToolName, input);
        onToolResult(block.name, result);
        toolResultContent.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result).slice(0, 20000),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onToolResult(block.name, { error: msg });
        toolResultContent.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: `Error: ${msg}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: 'user', content: toolResultContent });
  }

  return finalText;
}

// ── Small utility used by every route ──────────────────────────────────────

export function summarize(result: unknown): string {
  try {
    return JSON.stringify(result).slice(0, 160);
  } catch {
    return String(result).slice(0, 160);
  }
}

/**
 * Extract the first ```proposals ...``` fenced block from Claude's final text.
 * Returns the parsed JSON or throws.
 */
export function extractProposals(text: string): unknown {
  const match = text.match(/```proposals\s*\n([\s\S]*?)```/);
  if (!match) throw new Error('No ```proposals block in response');
  return JSON.parse(match[1]);
}

const VALID_COMPONENT_TYPES = new Set([
  'bar_chart',
  'line_chart',
  'donut_chart',
  'data_table',
  'kpi_card',
  'comparison',
  'text_only',
]);

/**
 * Extract the first ```components ...``` fenced block from Claude's final text.
 * Returns an empty array if the block is missing or malformed — never throws.
 */
export function extractComponents(text: string): UIComponentType[] {
  const match = text.match(/```components\s*\n([\s\S]*?)```/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c) => c && typeof c === 'object' && typeof c.type === 'string' && VALID_COMPONENT_TYPES.has(c.type),
    ) as UIComponentType[];
  } catch {
    return [];
  }
}

const COMPONENTS_APPENDIX = `

After the \`\`\`proposals block, also return a \`\`\`components block with 2-3 charts visualizing the same data:

\`\`\`components
[
  { "type": "bar_chart", "title": "SKU stock levels", "data": [{"name": "SKU name", "value": 1.8}], "x_key": "name", "y_key": "value" },
  { "type": "kpi_card", "label": "Total at risk", "value": "₹9.5L", "direction": "down" }
]
\`\`\`

Match the chart data to the proposals:
- inventory: bar chart of weeks_of_supply per SKU
- campaigns: bar chart of free_rider_pct per campaign
- markdown: bar chart of current_st_pct vs target per SKU
- price change: bar chart of revenue_impact_lakhs per SKU
- rfq: bar chart of target_cost_reduction_pct per SKU
- weekly: 2-3 KPI cards from the summary block

Use real numbers from your tool results. Return at most 3 components.`;

// ── High-level route factory used by all 6 action-agent routes ─────────────

export interface ActionAgentRouteConfig {
  systemPrompt: string;
  userPrompt: string;
  statusText: string;
}

export function createActionAgentRoute(cfg: ActionAgentRouteConfig) {
  return async function POST(req: NextRequest) {
    const { client, model } = initAnthropicClient();
    if (!client) return NextResponse.json({ error: 'No API key configured' }, { status: 500 });

    let tenant = detectTenant(req);
    let userInstructions: string | undefined;
    try {
      const body = (await req.json()) as { user_instructions?: string; tenant?: Tenant };
      userInstructions = body?.user_instructions?.trim() || undefined;
      if (body?.tenant === 'us_apparel' || body?.tenant === 'us_retail' || body?.tenant === 'india_grocery') {
        tenant = body.tenant;
      }
    } catch { /* no body — leave undefined */ }
    const isUSD = tenant === 'us_apparel' || tenant === 'us_retail';
    // For USD tenants, avoid Eid framing in the prompt (spec: substitute Black Friday / Holiday).
    let effectiveUserPrompt = cfg.userPrompt;
    if (isUSD) {
      effectiveUserPrompt = effectiveUserPrompt
        .replace(/Eid al-Adha/gi, 'Black Friday')
        .replace(/Eid/gi, 'Holiday')
        .replace(/Diwali/gi, 'Black Friday')
        .replace(/₹/g, '$')
        .replace(/lakhs?/gi, 'thousand')
        .replace(/crores?/gi, 'million');
    }
    const finalUserPrompt = userInstructions
      ? `${effectiveUserPrompt}\n\nUser instructions: "${userInstructions}"\nAdjust your proposals to follow these instructions exactly.`
      : effectiveUserPrompt;
    const effectiveSystemPrompt = tenantContextForPrompt(tenant) + cfg.systemPrompt;

    const { stream, send, close } = createSSEStream();

    (async () => {
      try {
        send({ type: 'status', text: cfg.statusText });
        const finalText = await runAgentLoop(
          client,
          model,
          effectiveSystemPrompt + COMPONENTS_APPENDIX,
          finalUserPrompt,
          // USD tenants have no Databricks access — Claude reasons purely from prompt context.
          isUSD ? [] : getActionAgentTools(),
          (text) => send({ type: 'thinking', text }),
          (tool, input) => send({ type: 'tool_call', tool, input }),
          (tool, result) => send({ type: 'tool_result', tool, summary: summarize(result) }),
        );

        try {
          const proposals = extractProposals(finalText);
          send({ type: 'proposals', data: proposals });
        } catch (e) {
          send({
            type: 'error',
            text: `Could not parse proposals: ${e instanceof Error ? e.message : String(e)}`,
          });
        }
        const components = extractComponents(finalText);
        if (components.length > 0) {
          send({ type: 'components', data: components });
        }
        send({ type: 'done' });
      } catch (err) {
        send({ type: 'error', text: err instanceof Error ? err.message : String(err) });
        send({ type: 'done' });
      } finally {
        close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  };
}
