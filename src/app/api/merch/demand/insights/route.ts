import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

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
  console.warn('Failed to initialize Anthropic client for merch demand insights');
}

const CACHE_PATH = path.join(process.cwd(), 'cache', 'merch_demand', 'insights.json');
const CORE_PATH = path.join(process.cwd(), 'cache', 'merch_demand', 'core.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface InsightCacheFile {
  generated_at: string;
  insights: Insight[];
  source: 'claude' | 'fallback';
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

function readCache(): InsightCacheFile | null {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    const parsed: InsightCacheFile = JSON.parse(raw);
    const age = Date.now() - new Date(parsed.generated_at).getTime();
    if (age < CACHE_TTL_MS) return parsed;
  } catch {
    // cache miss or parse error
  }
  return null;
}

function writeCache(data: InsightCacheFile): void {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    console.warn('Failed to write merch demand insights cache');
  }
}

interface CoreKPIs {
  demand_at_risk_inr: number;
  demand_at_risk_sku_count: number;
  overstock_exposure_inr: number;
  next_event?: { event_name: string; days_until: number; skus_not_ramped: number };
  forecast_accuracy_30d_pct: number;
}

interface CoreModelCard {
  production_model?: { mape_pct_last_30d?: number; bias_pct?: number };
  accuracy_by_department?: { department: string; mape_pct: number }[];
}

interface CoreActionItem {
  action_type: string;
  context: string;
  recommendation: string;
  revenue_impact_inr: number;
}

interface CoreData {
  kpis: CoreKPIs;
  model_card?: CoreModelCard;
  action_items?: CoreActionItem[];
  anomalies?: { deviation_pct: number; hypothesis: string; status: string }[];
}

function buildFallbackInsights(ctx: CoreData): Insight[] {
  const k = ctx.kpis;
  const insights: Insight[] = [];

  const demandAtRiskL = (k.demand_at_risk_inr / 100000).toFixed(1);
  insights.push({
    id: 'merch-fallback-1',
    type: 'risk',
    severity: k.demand_at_risk_inr > 3000000 ? 'critical' : 'warning',
    title: `₹${demandAtRiskL}L demand at risk from stockouts`,
    description: `${k.demand_at_risk_sku_count} SKUs face understock risk in the next 14 days. Urgent replenishment action required.`,
    metric: `₹${demandAtRiskL}L`,
    source: 'fallback',
    action: 'Review replenishment orders for flagged SKUs',
    relatedChart: 'forecast-vs-actual',
  });

  if (k.overstock_exposure_inr > 500000) {
    const overstockL = (k.overstock_exposure_inr / 100000).toFixed(1);
    insights.push({
      id: 'merch-fallback-2',
      type: 'risk',
      severity: 'warning',
      title: `₹${overstockL}L tied up in excess inventory`,
      description: `Overstock exposure across ${k.demand_at_risk_sku_count > 5 ? 'multiple' : 'several'} SKUs is reducing working capital efficiency.`,
      metric: `₹${overstockL}L`,
      source: 'fallback',
      action: 'Run markdown or inter-store transfer for overstocked SKUs',
      relatedChart: 'forecast-vs-actual',
    });
  }

  if (k.next_event) {
    insights.push({
      id: 'merch-fallback-3',
      type: 'opportunity',
      severity: k.next_event.skus_not_ramped > 50 ? 'warning' : 'info',
      title: `${k.next_event.event_name} in ${k.next_event.days_until} days`,
      description: `${k.next_event.skus_not_ramped} SKUs are not yet ramped for the upcoming event. Demand lift expected across key categories.`,
      metric: `${k.next_event.skus_not_ramped} SKUs`,
      source: 'fallback',
      action: 'Review event ramp plan and accelerate replenishment',
      relatedChart: 'demand-decomposition',
    });
  }

  const mape = ctx.model_card?.production_model?.mape_pct_last_30d;
  if (mape != null) {
    insights.push({
      id: 'merch-fallback-4',
      type: mape > 15 ? 'risk' : 'trend',
      severity: mape > 20 ? 'critical' : mape > 15 ? 'warning' : 'info',
      title: `Forecast MAPE at ${mape.toFixed(1)}% over last 30 days`,
      description: `${mape > 15 ? 'Above acceptable threshold — systematic error needs investigation.' : 'Model accuracy is within acceptable bounds for operational planning.'}`,
      metric: `${mape.toFixed(1)}%`,
      source: 'fallback',
      action: mape > 15 ? 'Review feature engineering and model calibration' : undefined,
      relatedChart: 'accuracy-heatmap',
    });
  }

  return insights;
}

function buildContext(core: CoreData): string {
  const k = core.kpis;
  const topActions = (core.action_items ?? []).slice(0, 5);
  const topAnomalies = (core.anomalies ?? []).slice(0, 5);
  const deptAccuracy = core.model_card?.accuracy_by_department ?? [];

  return `Analyze this Merchandise Demand Forecasting dashboard data and generate exactly 4 actionable insights:

KPI SUMMARY:
- Demand at risk (stockout): ₹${(k.demand_at_risk_inr / 100000).toFixed(1)}L across ${k.demand_at_risk_sku_count} SKUs
- Overstock exposure: ₹${(k.overstock_exposure_inr / 100000).toFixed(1)}L
- Forecast accuracy (30d): ${k.forecast_accuracy_30d_pct}%
- Model MAPE (30d): ${core.model_card?.production_model?.mape_pct_last_30d ?? 'N/A'}%
- Forecast bias: ${core.model_card?.production_model?.bias_pct ?? 'N/A'}%
${k.next_event ? `- Next event: ${k.next_event.event_name} in ${k.next_event.days_until} days (${k.next_event.skus_not_ramped} SKUs not ramped)` : ''}

ACCURACY BY DEPARTMENT:
${deptAccuracy.map(d => `- ${d.department}: ${d.mape_pct}% MAPE`).join('\n')}

TOP DEMAND ACTIONS:
${topActions.map(a => `- [${a.action_type}] ${a.context} → ${a.recommendation} (₹${(a.revenue_impact_inr / 100000).toFixed(1)}L impact)`).join('\n')}

ANOMALIES (open):
${topAnomalies.map(a => `- ${a.deviation_pct > 0 ? '+' : ''}${a.deviation_pct}% deviation: ${a.hypothesis}`).join('\n')}

Generate exactly 4 insights. Return ONLY the JSON array.`;
}

export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

  if (!refresh) {
    const cached = readCache();
    if (cached) {
      return NextResponse.json({ insights: cached.insights, source: 'cache' });
    }
  }

  let core: CoreData;
  try {
    core = JSON.parse(fs.readFileSync(CORE_PATH, 'utf-8')) as CoreData;
  } catch {
    return NextResponse.json({ insights: [], source: 'error', error: 'Core data unavailable' }, { status: 500 });
  }

  if (!client || !process.env.ANTHROPIC_API_KEY) {
    const fallback = buildFallbackInsights(core);
    const cacheData: InsightCacheFile = {
      generated_at: new Date().toISOString(),
      insights: fallback,
      source: 'fallback',
    };
    writeCache(cacheData);
    return NextResponse.json({ insights: fallback, source: 'fallback' });
  }

  try {
    const systemPrompt = `You are a demand planning expert analyzing a Merchandise Forecasting dashboard for an Indian retail company.

RULES:
- Return ONLY a valid JSON array. No markdown, no backticks, no explanation outside the JSON.
- Return exactly 4 insights, ranked by business impact.
- Each insight must reference specific departments, SKUs counts, or ₹ values from the data.
- Focus on ACTIONABLE insights — what should the planning team do?
- Use ₹ for currency values in Indian format (L = lakhs, Cr = crores).

JSON format:
[
  {
    "type": "trend" | "anomaly" | "opportunity" | "risk",
    "severity": "critical" | "warning" | "info" | "positive",
    "title": "Short headline (max 8 words)",
    "description": "1-2 sentence explanation with specific numbers from the data",
    "metric": "The key number (e.g., '₹46L' or '88.7%')",
    "action": "What the planning team should do",
    "relatedChart": "forecast-vs-actual" | "accuracy-heatmap" | "demand-decomposition" | "lost-sales" | "feature-importance"
  }
]

Prioritize: 1) Revenue at risk / stockouts, 2) Event readiness gaps, 3) Forecast accuracy issues, 4) Growth or efficiency opportunities.`;

    const userMessage = buildContext(core);

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
      id: `merch-insight-${Date.now()}-${i}`,
      source: 'claude',
    }));

    const cacheData: InsightCacheFile = {
      generated_at: new Date().toISOString(),
      insights,
      source: 'claude',
    };
    writeCache(cacheData);

    return NextResponse.json({ insights, source: 'claude' });
  } catch (err) {
    console.error('Merch demand insight generation failed:', err);
    const fallback = buildFallbackInsights(core);
    return NextResponse.json({ insights: fallback, source: 'fallback' });
  }
}
