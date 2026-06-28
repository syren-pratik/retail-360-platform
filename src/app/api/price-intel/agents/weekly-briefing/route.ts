import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { priceIntelLookup, supplierHealth, inventoryStatus } from '@/app/lib/dbx-tools';

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

type ActionPriority = 'urgent' | 'review' | 'info';

interface TopAction {
  priority: ActionPriority;
  action: string;
  impact_inr: number;
}

interface WeeklyBriefingResult {
  headline: string;
  performance_summary: string;
  top_actions: TopAction[];
  risks: string[];
  opportunities: string[];
  next_week_focus: string;
}

interface ActionQueueItem {
  action_title?: string;
  description?: string;
  financial_impact_inr?: number;
  priority?: string;
  alert_type?: string;
  category?: string;
  [key: string]: unknown;
}

interface HeadlineData {
  sentence?: string;
  revenue_vs_target_pct?: number;
  margin_status?: string;
  [key: string]: unknown;
}

interface WeeklyBriefingBody {
  kpis: Record<string, unknown>;
  campaigns: unknown[];
  action_queue: ActionQueueItem[];
  forecast: Record<string, unknown>;
  headline: HeadlineData;
}

function resolvePriority(item: ActionQueueItem): ActionPriority {
  if (item.priority === 'urgent') return 'urgent';
  if (item.priority === 'review' || item.priority === 'medium') return 'review';
  return 'info';
}

function computeFallback(body: WeeklyBriefingBody): WeeklyBriefingResult {
  const kpis = body.kpis ?? {};
  const action_queue = body.action_queue ?? [];
  const headline = body.headline;

  // Headline from headline.sentence
  const headlineText =
    headline?.sentence ??
    'Weekly pricing brief — review actions and opportunities below.';

  // Performance summary from KPIs
  const revPct = kpis?.revenue_vs_target_pct as number | undefined;
  const marginPp = kpis?.margin_pp_delta as number | undefined;
  const performance_summary =
    `Revenue is ${revPct != null ? `${revPct > 0 ? '+' : ''}${revPct}% vs target` : 'tracking inline with plan'}. ` +
    `Gross margin ${marginPp != null ? `${marginPp > 0 ? 'improved' : 'declined'} by ${Math.abs(marginPp)}pp` : 'is stable'}. ` +
    `${action_queue.length} pricing actions pending review this week.`;

  // Top 3 actions sorted by financial_impact_inr desc
  const sorted_actions = [...action_queue]
    .sort(
      (a, b) =>
        (b.financial_impact_inr ?? 0) - (a.financial_impact_inr ?? 0)
    )
    .slice(0, 3);

  const top_actions: TopAction[] = sorted_actions.map((item) => ({
    priority: resolvePriority(item),
    action:
      item.action_title ??
      item.description ??
      `Review ${item.category ?? 'pricing'} action`,
    impact_inr: item.financial_impact_inr ?? 0,
  }));

  // Risks from urgent priority items
  const risks = action_queue
    .filter((item) => item.priority === 'urgent')
    .slice(0, 4)
    .map(
      (item) =>
        item.action_title ??
        item.description ??
        'Urgent pricing action requires immediate attention'
    );

  if (risks.length === 0) {
    risks.push('No critical risks flagged — maintain monitoring cadence');
  }

  // Opportunities from elasticity_opportunity alert type
  const opportunities = action_queue
    .filter((item) => item.alert_type === 'elasticity_opportunity')
    .slice(0, 4)
    .map(
      (item) =>
        item.action_title ??
        item.description ??
        'Elasticity window open — consider selective price increase'
    );

  if (opportunities.length === 0) {
    opportunities.push(
      'Monitor price elasticity signals in high-velocity categories for raise opportunities'
    );
  }

  const nextWeekFocus =
    top_actions.length > 0
      ? `Priority next week: resolve ${top_actions[0].priority === 'urgent' ? 'urgent' : 'top'} action — "${top_actions[0].action}" (₹${(top_actions[0].impact_inr / 100000).toFixed(1)}L impact). Continue scanning for elasticity opportunities.`
      : 'Maintain current price positions; reassess competitive landscape mid-week.';

  return {
    headline: headlineText,
    performance_summary,
    top_actions,
    risks,
    opportunities,
    next_week_focus: nextWeekFocus,
  };
}

export async function POST(request: NextRequest) {
  const body: WeeklyBriefingBody = await request.json();

  if (!client) {
    const result = computeFallback(body);
    return NextResponse.json(result);
  }

  // Fan out live Databricks queries for real KPIs. Degrades gracefully on per-call failure.
  let dbxContext = '';
  try {
    const [recs, gaps, suppliers, invHealth] = await Promise.all([
      priceIntelLookup({ scope: 'recommendations', limit: 10 }),
      priceIntelLookup({ scope: 'competitive_gaps', limit: 10 }),
      supplierHealth({ scope: 'underperformers', filter: { max_on_time_pct: 80 } }),
      inventoryStatus({ scope: 'health_summary' }),
    ]);
    const ctx: Record<string, unknown> = {};
    if (recs.success && recs.data?.length) ctx.top_price_recommendations = recs.data;
    if (gaps.success && gaps.data?.length) ctx.competitive_gaps = gaps.data;
    if (suppliers.success && suppliers.data?.length) ctx.underperforming_suppliers = suppliers.data;
    if (invHealth.success && invHealth.data?.length) ctx.inventory_health_by_department = invHealth.data;
    if (Object.keys(ctx).length) {
      dbxContext = `Real current state from Databricks (live this week):\n${JSON.stringify(ctx, null, 2)}\n\nGround the brief in these actual numbers — cite specific SKUs, suppliers, and departments where relevant.\n\n`;
    }
  } catch (err) {
    console.warn('weekly-briefing: dbx context fetch failed, continuing without:', err);
  }

  const prompt = `${dbxContext}Generate a weekly pricing intelligence brief for Indian retail leadership. Return ONLY valid JSON — no markdown, no extra text.

KPIs this week: ${JSON.stringify(body.kpis ?? {})}
Active campaigns: ${JSON.stringify(body.campaigns ?? [])}
Action queue (${(body.action_queue ?? []).length} items): ${JSON.stringify((body.action_queue ?? []).slice(0, 15))}
Forecast data: ${JSON.stringify(body.forecast ?? [])}
Headline context: ${JSON.stringify(body.headline ?? {})}

Return JSON schema:
{
  "headline": "<1-sentence headline for the week>",
  "performance_summary": "<2-3 sentence summary of this week's pricing performance>",
  "top_actions": [
    { "priority": "urgent|review|info", "action": "<string>", "impact_inr": <number> }
  ],
  "risks": ["<string>"],
  "opportunities": ["<string>"],
  "next_week_focus": "<string>"
}

Include 3-5 top_actions, 2-4 risks, 2-4 opportunities. Be specific and data-driven. Use INR for all monetary values.`;

  try {
    const response = await client.messages.create({
      model: modelName,
      max_tokens: 2000,
      system:
        'You are a head of pricing strategy for a large Indian omnichannel retailer. You produce concise, actionable weekly briefs for category directors. Return ONLY valid JSON matching the exact schema provided.',
      messages: [{ role: 'user', content: prompt }],
    });

    const raw =
      response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const result: WeeklyBriefingResult = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (err) {
    console.error('weekly-briefing agent error:', err);
    const result = computeFallback(body);
    return NextResponse.json(result);
  }
}
