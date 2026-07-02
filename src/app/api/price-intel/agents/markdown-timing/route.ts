import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { agentTenant, agentSystemPrefix, agentCurrencySymbol, agentMarket } from '@/app/lib/agent-tenant';
import { inventoryStatus } from '@/app/lib/dbx-tools';

let client: Anthropic | null = null;
let modelName = 'claude-sonnet-4-5-20250514';

try {
  if (process.env.ANTHROPIC_API_KEY) {
    if (process.env.AZURE_ENDPOINT) {
      client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.AZURE_ENDPOINT,
      });
      modelName = process.env.AZURE_MODEL_NAME || 'claude-sonnet-4-5';
    } else {
      client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }
} catch {
  console.warn('Failed to initialize Anthropic client');
}

type UrgencyLevel = 'immediate' | 'this_week' | 'next_2_weeks' | 'monitor';

interface ScheduleItem {
  sku_id: string;
  product_name: string;
  recommended_week: number;
  depth_pct: number;
  expected_sell_through_pct: number;
  recovery_inr: number;
  urgency: UrgencyLevel;
}

interface MarkdownTimingResult {
  total_recovery_inr: number;
  avg_depth_pct: number;
  schedule: ScheduleItem[];
  risks: string[];
  timeline_summary: string;
}

interface MarkdownItem {
  sku_id?: string;
  product_name?: string;
  days_remaining?: number;
  recommended_depth_pct?: number;
  revenue_at_risk_inr?: number;
  current_stock_units?: number;
  [key: string]: unknown;
}

interface MarkdownTimingBody {
  sku_ids: string[];
  goal: string;
  season_end_weeks: number;
  markdown_items: MarkdownItem[];
}

function resolveUrgency(days_remaining: number): UrgencyLevel {
  if (days_remaining < 7) return 'immediate';
  if (days_remaining < 14) return 'this_week';
  if (days_remaining < 28) return 'next_2_weeks';
  return 'monitor';
}

function computeFallback(body: MarkdownTimingBody, dbxOverstock?: Record<string, unknown>[]): MarkdownTimingResult {
  const goal = body.goal ?? 'Clear overstock before season-end';
  const season_end_weeks = body.season_end_weeks ?? 8;
  let markdown_items = body.markdown_items;

  // If the caller didn't pass items, seed from Databricks overstock data
  if ((!markdown_items || markdown_items.length === 0) && dbxOverstock?.length) {
    markdown_items = dbxOverstock.slice(0, 20).map((row) => ({
      sku_id: row.product_id as string,
      product_name: (row.product_id as string) || 'unknown SKU',
      days_remaining: Math.max(7, Math.round((row.dos as number) ?? 30)),
      recommended_depth_pct: 25,
      revenue_at_risk_inr: Math.round(((row.closing_stock_qty as number) ?? 100) * 200),
      current_stock_units: row.closing_stock_qty as number,
    }));
  }
  markdown_items = markdown_items ?? [];

  const schedule: ScheduleItem[] = markdown_items.map((item, i) => {
    const days = item.days_remaining ?? season_end_weeks * 7;
    const urgency = resolveUrgency(days);
    const depth = item.recommended_depth_pct ?? 20;
    const recovery = Math.round((item.revenue_at_risk_inr ?? 200000) * 0.75);
    const sell_through =
      urgency === 'immediate'
        ? 92
        : urgency === 'this_week'
        ? 85
        : urgency === 'next_2_weeks'
        ? 75
        : 60;

    return {
      sku_id: item.sku_id ?? body.sku_ids?.[i] ?? `SKU-${i + 1}`,
      product_name: item.product_name ?? `Product ${i + 1}`,
      recommended_week: Math.max(1, Math.ceil(days / 7)),
      depth_pct: depth,
      expected_sell_through_pct: sell_through,
      recovery_inr: recovery,
      urgency,
    };
  });

  const total_recovery_inr = schedule.reduce(
    (sum, s) => sum + s.recovery_inr,
    0
  );
  const avg_depth_pct =
    schedule.length > 0
      ? Math.round(
          schedule.reduce((sum, s) => sum + s.depth_pct, 0) / schedule.length
        )
      : 20;

  const immediateCount = schedule.filter((s) => s.urgency === 'immediate').length;

  return {
    total_recovery_inr,
    avg_depth_pct,
    schedule,
    risks: [
      immediateCount > 0
        ? `${immediateCount} SKU(s) require immediate markdown to avoid total write-off`
        : 'No critical markdowns required this week',
      avg_depth_pct > 30
        ? 'Average markdown depth exceeds 30% — review category-level brand perception impact'
        : 'Markdown depth within acceptable range',
      `Goal: ${goal}. Ensure floor teams are briefed before pricing changes go live.`,
    ],
    timeline_summary: `${schedule.length} SKUs scheduled across ${season_end_weeks} weeks. ${immediateCount} immediate actions required. Projected recovery: ₹${(total_recovery_inr / 100000).toFixed(1)}L at avg ${avg_depth_pct}% depth.`,
  };
}

export async function POST(request: NextRequest) {
  const body: MarkdownTimingBody = await request.json();

  // Fetch live overstock data from Databricks ONCE — used both as Claude context and fallback seed.
  let dbxOverstock: Record<string, unknown>[] | undefined;
  let dbxContext = '';
  try {
    const overstock = await inventoryStatus({ scope: 'overstock', limit: 50 });
    if (overstock.success && overstock.data?.length) {
      dbxOverstock = overstock.data;
      dbxContext = `Real overstocked SKUs from Databricks (with current days-of-stock):\n${JSON.stringify(overstock.data, null, 2)}\n\nUse these actual overstock positions when scheduling markdowns.\n\n`;
    }
  } catch (err) {
    console.warn('markdown-timing: dbx context fetch failed, continuing without:', err);
  }

  if (!client) {
    return NextResponse.json(computeFallback(body, dbxOverstock));
  }

  const prompt = `${dbxContext}Create an optimised markdown timing schedule for ${agentMarket(agentTenant())} retail end-of-season clearance. Return ONLY valid JSON — no markdown formatting, no extra text.

Goal: ${body.goal}
Season end (weeks from now): ${body.season_end_weeks}
SKU IDs: ${(body.sku_ids ?? []).join(', ') || '(none — use Databricks overstock above)'}
Markdown items: ${JSON.stringify(body.markdown_items ?? [])}

Return JSON schema:
{
  "total_recovery_inr": <number>,
  "avg_depth_pct": <number>,
  "schedule": [
    {
      "sku_id": "<string>",
      "product_name": "<string>",
      "recommended_week": <integer 1-${body.season_end_weeks}>,
      "depth_pct": <number>,
      "expected_sell_through_pct": <number 0-100>,
      "recovery_inr": <number>,
      "urgency": "immediate|this_week|next_2_weeks|monitor"
    }
  ],
  "risks": ["<string>"],
  "timeline_summary": "<string>"
}`;

  try {
    const response = await client.messages.create({
      model: modelName,
      max_tokens: 1500,
      system:
        'You are an inventory markdown optimisation expert for Indian fashion and general merchandise retail. Return ONLY valid JSON. All monetary values in INR.',
      messages: [{ role: 'user', content: prompt }],
    });

    const raw =
      response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const result: MarkdownTimingResult = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (err) {
    console.error('markdown-timing agent error:', err);
    return NextResponse.json(computeFallback(body, dbxOverstock));
  }
}
