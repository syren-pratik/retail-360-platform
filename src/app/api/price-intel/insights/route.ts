import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { getTenantFromCookie } from '@/app/lib/cache-loader';

export const dynamic = 'force-dynamic';

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
  console.warn('Failed to initialize Anthropic client for price-intel insights');
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getCachePath(tenant: string): string {
  if (tenant === 'us_apparel') {
    return path.join(process.cwd(), 'cache', 'apparel', 'price_intel', 'insights.json');
  }
  return path.join(process.cwd(), 'cache', 'price_intel', 'insights.json');
}

function getCorePath(tenant: string): string {
  if (tenant === 'us_apparel') {
    return path.join(process.cwd(), 'cache', 'apparel', 'price_intel', 'core.json');
  }
  return path.join(process.cwd(), 'cache', 'price_intel', 'core.json');
}

interface Insight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  description: string;
  metric?: string;
  source: string;
  action?: string;
  relatedChart?: string;
}

interface InsightCacheFile {
  generated_at: string;
  insights: Insight[];
  source: 'claude' | 'fallback';
}

function readCache(tenant: string): InsightCacheFile | null {
  try {
    const raw = fs.readFileSync(getCachePath(tenant), 'utf-8');
    const parsed: InsightCacheFile = JSON.parse(raw);
    const age = Date.now() - new Date(parsed.generated_at).getTime();
    if (age < CACHE_TTL_MS) return parsed;
  } catch {
    // cache miss or parse error
  }
  return null;
}

function writeCache(data: InsightCacheFile, tenant: string): void {
  try {
    fs.writeFileSync(getCachePath(tenant), JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    console.warn('Failed to write price-intel insights cache');
  }
}

interface KPIs {
  margin_realization_pct: number;
  margin_realization_trend: number;
  promo_roi_index: number;
  free_rider_ratio_pct: number;
  total_margin_leakage_inr: number;
  margin_leakage_breakdown: {
    promo_free_rider_inr: number;
    cost_passthrough_gap_inr: number;
    premature_markdown_inr: number;
    elasticity_underpricing_inr: number;
  };
  sell_through_pct: number;
  sell_through_vs_target: number;
  active_alerts: number;
}

interface ActionItem {
  priority: string;
  alert_type: string;
  product_name: string;
  department: string;
  headline: string;
  financial_impact_inr: number;
  recommended_action: string;
}

interface Campaign {
  campaign_name: string;
  status: string;
  roi: number;
  incremental_revenue_inr: number;
}

interface MarkdownItem {
  revenue_at_risk_inr: number;
}

interface PromoRoiPoint {
  roi: number;
}

interface CoreData {
  anchor_date: string;
  headline: { sentence: string };
  kpis: KPIs;
  action_queue: ActionItem[];
  campaigns: Campaign[];
  markdown_queue: MarkdownItem[];
  promo_roi_trend: PromoRoiPoint[];
}

function buildContext(core: CoreData) {
  return {
    anchor_date: core.anchor_date,
    headline: core.headline.sentence,
    kpis: {
      margin_realization_pct: core.kpis.margin_realization_pct,
      margin_realization_trend: core.kpis.margin_realization_trend,
      promo_roi_index: core.kpis.promo_roi_index,
      free_rider_ratio_pct: core.kpis.free_rider_ratio_pct,
      total_margin_leakage_inr: core.kpis.total_margin_leakage_inr,
      margin_leakage_breakdown: core.kpis.margin_leakage_breakdown,
      sell_through_pct: core.kpis.sell_through_pct,
      sell_through_vs_target: core.kpis.sell_through_vs_target,
      active_alerts: core.kpis.active_alerts,
    },
    top_urgent_actions: core.action_queue
      .filter((i) => i.priority === 'urgent')
      .sort((a, b) => b.financial_impact_inr - a.financial_impact_inr)
      .slice(0, 3)
      .map((i) => ({
        alert_type: i.alert_type,
        product_name: i.product_name,
        department: i.department,
        headline: i.headline,
        financial_impact_inr: i.financial_impact_inr,
        recommended_action: i.recommended_action,
      })),
    best_campaign: core.campaigns.sort((a, b) => b.roi - a.roi)[0],
    worst_campaign: core.campaigns
      .filter((c) => c.status === 'live')
      .sort((a, b) => a.roi - b.roi)[0],
    markdown_at_risk_inr: core.markdown_queue.reduce((s, i) => s + i.revenue_at_risk_inr, 0),
    promo_roi_latest: core.promo_roi_trend[13].roi,
    promo_roi_w1: core.promo_roi_trend[0].roi,
  };
}

function buildFallbackInsights(core: CoreData): Insight[] {
  const ctx = buildContext(core);
  const k = ctx.kpis;

  return [
    {
      id: 'price-insight-1',
      type: 'risk',
      severity: 'critical',
      title: `₹${(k.total_margin_leakage_inr / 100000).toFixed(1)}L leaking this week`,
      description: `Margin leakage totals ₹${(k.total_margin_leakage_inr / 100000).toFixed(1)}L this week. Free-rider promo waste (₹${(k.margin_leakage_breakdown.promo_free_rider_inr / 100000).toFixed(1)}L) is the largest driver — promotions going to buyers who would have purchased anyway.`,
      metric: `₹${(k.total_margin_leakage_inr / 100000).toFixed(1)}L/week`,
      source: 'fallback',
      action: 'Switch Beverages and Snacks promos to loyalty-gated mechanics',
      relatedChart: 'price-intel-overview',
    },
    {
      id: 'price-insight-2',
      type: 'trend',
      severity: 'positive',
      title: 'Promo ROI climbing 4 consecutive weeks',
      description: `Blended promo ROI reached ${ctx.promo_roi_latest.toFixed(2)}× this week, up from ${ctx.promo_roi_w1.toFixed(2)}× at the start of the period. Bundle mechanics are outperforming % Off across Tier-2 stores.`,
      metric: `${ctx.promo_roi_latest.toFixed(2)}×`,
      source: 'fallback',
      relatedChart: 'price-intel-overview',
    },
    {
      id: 'price-insight-3',
      type: 'risk',
      severity: 'warning',
      title: ctx.top_urgent_actions[0]
        ? `Urgent: ${ctx.top_urgent_actions[0].product_name}`
        : 'Urgent actions require attention',
      description: ctx.top_urgent_actions[0]
        ? `${ctx.top_urgent_actions[0].headline} Recommended: ${ctx.top_urgent_actions[0].recommended_action}. ₹${(ctx.top_urgent_actions[0].financial_impact_inr / 100000).toFixed(1)}L at stake.`
        : `${k.active_alerts} pricing alerts require decisions today.`,
      metric: String(k.active_alerts),
      source: 'fallback',
      action: 'Review action queue and approve urgent items',
      relatedChart: 'price-intel-overview',
    },
    {
      id: 'price-insight-4',
      type: 'opportunity',
      severity: 'info',
      title: 'Sell-through behind target — act now',
      description: `Overall sell-through at ${k.sell_through_pct.toFixed(1)}%, which is ${Math.abs(k.sell_through_vs_target).toFixed(1)}pp below target. ₹${(ctx.markdown_at_risk_inr / 100000).toFixed(1)}L in inventory needs markdown decisions before the clearance window closes.`,
      metric: `${k.sell_through_vs_target > 0 ? '+' : ''}${k.sell_through_vs_target.toFixed(1)}pp`,
      source: 'fallback',
      action: 'Approve markdown queue items before sell-through gap widens',
      relatedChart: 'price-intel-overview',
    },
  ];
}

export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get('refresh') === 'true';
  const tenant = getTenantFromCookie();

  if (!refresh) {
    const cached = readCache(tenant);
    if (cached) {
      return NextResponse.json({ insights: cached.insights, source: 'cache' });
    }
  }

  let core: CoreData;
  try {
    core = JSON.parse(fs.readFileSync(getCorePath(tenant), 'utf-8')) as CoreData;
  } catch {
    return NextResponse.json(
      { insights: [], source: 'error', error: 'Price intel core data unavailable. Run: npm run gen:price-intel' },
      { status: 500 },
    );
  }

  if (!client || !process.env.ANTHROPIC_API_KEY) {
    const fallback = buildFallbackInsights(core);
    const cacheData: InsightCacheFile = {
      generated_at: new Date().toISOString(),
      insights: fallback,
      source: 'fallback',
    };
    writeCache(cacheData, tenant);
    return NextResponse.json({ insights: fallback, source: 'fallback' });
  }

  const ctx = buildContext(core);

  try {
    const systemPrompt = `You are a retail pricing analyst for an Indian supermarket chain. Based on this pricing data snapshot, generate exactly 4 concise actionable insights for a Category Manager.

RULES:
- Return ONLY a valid JSON array. No markdown, no backticks, no explanation outside the JSON.
- Return exactly 4 insights, ranked by business impact.
- Each insight must reference specific departments, SKUs, or ₹ values from the data.
- Focus on ACTIONABLE insights — what should the category manager do?
- Use ₹ for currency values in Indian format (L = lakhs, Cr = crores).

JSON format:
[
  {
    "type": "trend" | "anomaly" | "opportunity" | "risk",
    "severity": "critical" | "warning" | "info" | "positive",
    "title": "Short headline (max 8 words)",
    "description": "1-2 sentence explanation with specific numbers from the data",
    "metric": "The key number (e.g., '₹22.3L' or '3.52×')",
    "action": "What the category manager should do",
    "relatedChart": "price-intel-overview"
  }
]

Prioritize: 1) Margin leakage and free-rider waste, 2) Promo ROI trends, 3) Urgent action queue items, 4) Sell-through and markdown opportunities.`;

    const userMessage = `Analyze this Price Intelligence dashboard data and generate exactly 4 actionable insights:

${JSON.stringify(ctx, null, 2)}

Generate exactly 4 insights. Return ONLY the JSON array.`;

    const response = await client.messages.create({
      model: modelName,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('');

    let cleanJson = text.trim();
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
    if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
    cleanJson = cleanJson.trim();

    const parsed: Omit<Insight, 'id' | 'source'>[] = JSON.parse(cleanJson);
    const insights: Insight[] = parsed.map((ins, i) => ({
      ...ins,
      id: `price-insight-${Date.now()}-${i}`,
      source: 'claude',
    }));

    const cacheData: InsightCacheFile = {
      generated_at: new Date().toISOString(),
      insights,
      source: 'claude',
    };
    writeCache(cacheData, tenant);

    return NextResponse.json({ insights, source: 'claude' });
  } catch (err) {
    console.error('Price intel insight generation failed:', err);
    const fallback = buildFallbackInsights(core);
    return NextResponse.json({ insights: fallback, source: 'fallback' });
  }
}
