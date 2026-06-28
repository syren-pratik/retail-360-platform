import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { cookies } from 'next/headers';

function getTenantFromCookie(): 'india_grocery' | 'us_apparel' {
  try {
    const raw = cookies().get('rct_tenant')?.value;
    return raw === 'us_apparel' ? 'us_apparel' : 'india_grocery';
  } catch {
    return 'india_grocery';
  }
}

// Initialize Anthropic client - supports Azure AI Foundry
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
      client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }
} catch {
  console.warn('Failed to initialize Anthropic client for insights');
}

// In-memory cache for insights (don't call Claude on every request)
interface InsightCache {
  data: Insight[];
  timestamp: number;
  module: string;
  tenant: 'india_grocery' | 'us_apparel';
}

interface Insight {
  id?: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  description: string;
  metric?: string;
  action?: string;
  relatedChart?: string;
  source?: string;
}

let insightCache: InsightCache | null = null;
const INSIGHT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function POST(request: NextRequest) {
  const { module, dashboardData, forceRefresh } = await request.json();
  const cookieTenant = getTenantFromCookie();

  // Check cache (unless force refresh) — keyed by both module and tenant so apparel/grocery
  // don't bleed into each other.
  if (
    !forceRefresh &&
    insightCache &&
    insightCache.module === module &&
    insightCache.tenant === cookieTenant &&
    Date.now() - insightCache.timestamp < INSIGHT_CACHE_TTL
  ) {
    return NextResponse.json({ insights: insightCache.data, source: 'cache' });
  }

  if (!process.env.ANTHROPIC_API_KEY || !client) {
    return NextResponse.json({ insights: [], source: 'unavailable', error: 'No API key configured' });
  }

  try {
    const tenant = getTenantFromCookie();
    const systemPrompt = getInsightSystemPrompt(module, tenant);
    const userMessage = buildDataSummary(module, dashboardData, tenant);

    const response = await client.messages.create({
      model: modelName,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Extract text response
    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => {
        if (block.type === 'text') return block.text;
        return '';
      })
      .join('');

    // Parse JSON from response (handle potential markdown wrapping)
    let cleanJson = text.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.slice(7);
    }
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    const insights: Insight[] = JSON.parse(cleanJson);

    // Add IDs to insights
    const insightsWithIds = insights.map((insight, index) => ({
      ...insight,
      id: `ai-insight-${Date.now()}-${index}`,
      source: 'ai',
    }));

    // Cache the result
    insightCache = { data: insightsWithIds, timestamp: Date.now(), module, tenant: cookieTenant };

    return NextResponse.json({ insights: insightsWithIds, source: 'claude' });
  } catch (error) {
    console.error('Insight generation failed:', error);
    return NextResponse.json({
      insights: [],
      source: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function getInsightSystemPrompt(module: string, tenant: 'india_grocery' | 'us_apparel' = 'india_grocery'): string {
  const isApparel = tenant === 'us_apparel';
  const businessContext = isApparel
    ? 'a US apparel retail company'
    : 'an Indian retail company';
  const currencyRule = isApparel
    ? '- Use $ for currency values. Format large numbers in thousands (K) or millions (M).'
    : '- Use ₹ for currency values. Format large numbers in lakhs (L) or crores (Cr).';
  const metricExample = isApparel ? "'34.2%' or '$420K'" : "'34.2%' or '₹4.2L'";

  if (module === 'cx360') {
    return `You are a retail analytics expert analyzing a Customer 360 dashboard for ${businessContext}.

Your job is to identify the most important, actionable insights from the data provided.

RULES:
- Return ONLY a valid JSON array. No markdown, no backticks, no explanation outside the JSON.
- Return exactly 4-6 insights, ranked by business impact.
- Each insight must have a specific number or metric — never vague.
- Focus on ACTIONABLE insights — what should the business DO about this?
${currencyRule}
- Be specific: name the segments, tiers, categories involved.

JSON format:
[
  {
    "type": "trend" | "anomaly" | "opportunity" | "risk",
    "severity": "critical" | "warning" | "info" | "positive",
    "title": "Short headline (max 8 words)",
    "description": "1-2 sentence explanation with specific numbers",
    "metric": "The key number (e.g., ${metricExample})",
    "action": "What the business should do about this",
    "relatedChart": "clv-distribution" | "churn-risk" | "cohort-retention" | "segment-migration" | "revenue-pareto" | "channel-analysis" | "basket-distribution" | "at-risk-alerts" | "recency-distribution" | "frequency-distribution"
  }
]

Prioritize:
1. Revenue at risk (high-value customers churning)
2. Significant segment shifts (large groups moving down)
3. Unusual patterns (sudden changes, outliers)
4. Growth opportunities (underserved segments, channel shifts)`;
  }

  if (module === 'demand') {
    return `You are a demand planning expert analyzing a Demand Forecasting dashboard for ${businessContext}.

Your job is to identify forecast accuracy issues, demand anomalies, and optimization opportunities.

RULES:
- Return ONLY a valid JSON array. No markdown, no backticks, no explanation outside the JSON.
- Return exactly 4-6 insights, ranked by business impact.
- Each insight must reference specific departments, SKUs, or metrics.
- Focus on ACTIONABLE insights — what should the planning team do?
${currencyRule}

JSON format:
[
  {
    "type": "trend" | "anomaly" | "opportunity" | "risk",
    "severity": "critical" | "warning" | "info" | "positive",
    "title": "Short headline (max 8 words)",
    "description": "1-2 sentence explanation with specific numbers",
    "metric": "The key number",
    "action": "What the planning team should do",
    "relatedChart": "forecast-vs-actual" | "accuracy-heatmap" | "demand-decomposition" | "hourly-heatmap" | "lost-sales" | "feature-importance" | "model-comparison"
  }
]

Prioritize:
1. Forecast accuracy problems (high MAPE, systematic bias)
2. Lost sales / stockout impact
3. Demand spikes or drops
4. Model performance issues`;
  }

  return '';
}

function buildDataSummary(module: string, data: Record<string, unknown>, tenant: 'india_grocery' | 'us_apparel' = 'india_grocery'): string {
  const cur = tenant === 'us_apparel' ? '$' : '₹';
  if (module === 'cx360') {
    const kpis = data.kpis as Record<string, unknown> | undefined;
    return `Analyze this Customer 360 dashboard data and generate insights:

KPI SUMMARY:
- Total customers: ${kpis?.total_customers || 'N/A'}
- Average CLV: ${cur}${kpis?.avg_clv || 'N/A'}
- Churn rate (30-day): ${kpis?.churn_rate_pct || 'N/A'}%
- Active customer rate: ${kpis?.active_rate_pct || 'N/A'}%

CLV DISTRIBUTION BY TIER:
${JSON.stringify(data.clvDistribution || [], null, 2)}

CHURN RISK DISTRIBUTION:
${JSON.stringify(data.churnRisk || [], null, 2)}

CHURN DRIVERS (top features by importance):
${JSON.stringify((data.churnDrivers as unknown[] | undefined)?.slice(0, 8) || [], null, 2)}

COHORT RETENTION (recent data):
${JSON.stringify((data.cohortRetention as unknown[] | undefined)?.slice(-6) || [], null, 2)}

SEGMENT SUMMARY:
${JSON.stringify(data.segmentMigration || {}, null, 2)}

REVENUE CONCENTRATION:
${JSON.stringify(data.revenueConcentration || {}, null, 2)}

CHANNEL ANALYSIS:
${JSON.stringify(data.channelAnalysis || {}, null, 2)}

RECENCY/FREQUENCY:
${JSON.stringify(data.recencyFrequency || {}, null, 2)}

AT-RISK CUSTOMERS:
${JSON.stringify(data.atRiskAlerts || {}, null, 2)}

Generate 4-6 insights. Return ONLY the JSON array.`;
  }

  if (module === 'demand') {
    const kpis = data.kpis as Record<string, unknown> | undefined;
    return `Analyze this Demand Forecasting dashboard data and generate insights:

KPI SUMMARY:
- Forecast accuracy: ${(kpis?.forecast_accuracy as Record<string, unknown>)?.value || 'N/A'}%
- Forecast bias: ${(kpis?.forecast_bias as Record<string, unknown>)?.value || 'N/A'}%
- Total forecasted demand: ${(kpis?.total_forecast_demand as Record<string, unknown>)?.value || 'N/A'} units
- Lost sales: ${cur}${(kpis?.lost_sales as Record<string, unknown>)?.value || 'N/A'}

ACCURACY BY DEPARTMENT:
${JSON.stringify(data.accuracyByDept || [], null, 2)}

LOST SALES TOP SKUs:
${JSON.stringify((data.lostSales as Record<string, unknown[]> | undefined)?.top_skus?.slice(0, 5) || [], null, 2)}

FEATURE IMPORTANCE:
${JSON.stringify((data.featureImportance as Record<string, unknown[]> | undefined)?.global?.slice(0, 8) || [], null, 2)}

MODEL COMPARISON:
${JSON.stringify(data.modelComparison || [], null, 2)}

DEMAND ALERTS:
${JSON.stringify(data.alerts || [], null, 2)}

Generate 4-6 insights. Return ONLY the JSON array.`;
  }

  return '';
}

// GET endpoint to check insight status
export async function GET() {
  return NextResponse.json({
    cacheValid: insightCache ? Date.now() - insightCache.timestamp < INSIGHT_CACHE_TTL : false,
    cacheAge: insightCache ? Math.round((Date.now() - insightCache.timestamp) / 1000 / 60) : null,
    cacheModule: insightCache?.module || null,
    insightCount: insightCache?.data.length || 0,
  });
}
