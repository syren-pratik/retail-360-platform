import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { UIComponentType } from '@/app/lib/types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { agentTenant, agentSystemPrefix, agentCurrencySymbol, agentMarket } from '@/app/lib/agent-tenant';
import { priceIntelLookup } from '@/app/lib/dbx-tools';

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

interface SKURecommendation {
  sku_id: string;
  product_name: string;
  action: 'raise' | 'hold' | 'lower';
  change_pct: number;
  reason: string;
}

interface PriceStrategyResult {
  strategy_label: string;
  rationale: string;
  sku_recommendations: SKURecommendation[];
  expected_margin_impact_pp: number;
  expected_revenue_impact_inr: number;
  risks: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface SKUItem {
  sku_id?: string;
  product_name?: string;
  mrp_inr?: number;
  margin_pct?: number;
  [key: string]: unknown;
}

interface PriceStrategyBody {
  category: string;
  horizon: string;
  objective: string;
  competitive_intensity: string;
  dept_data?: Record<string, unknown>;
  skus_in_category?: SKUItem[];
}

function computeFallback(body: PriceStrategyBody): PriceStrategyResult {
  const { objective, competitive_intensity, category, skus_in_category } = body;

  type ActionType = 'raise' | 'hold' | 'lower';

  const objectiveConfig: Record<
    string,
    {
      label: string;
      action: ActionType;
      changePct: number;
      marginImpact: number;
      revenueImpact: number;
      confidence: 'high' | 'medium' | 'low';
      rationale: string;
    }
  > = {
    maximize_margin: {
      label: 'Margin Maximisation Strategy',
      action: 'raise',
      changePct: 3.5,
      marginImpact: 1.8,
      revenueImpact: 850000,
      confidence: 'high',
      rationale: `Raise prices selectively on low-elasticity SKUs in ${category} to protect and grow gross margin while ${competitive_intensity} competitive pressure holds.`,
    },
    defend_share: {
      label: 'Market Share Defence Strategy',
      action: 'hold',
      changePct: 0,
      marginImpact: 0.1,
      revenueImpact: 120000,
      confidence: 'medium',
      rationale: `Hold current price points across ${category} to protect volume share against ${competitive_intensity} competitive moves. Invest savings in visibility.`,
    },
    clear_inventory: {
      label: 'Inventory Clearance Strategy',
      action: 'lower',
      changePct: -15,
      marginImpact: -3.2,
      revenueImpact: -280000,
      confidence: 'high',
      rationale: `Reduce prices 10-20% on aged inventory in ${category} to accelerate sell-through and free working capital before season-end.`,
    },
  };

  const cfg =
    objectiveConfig[objective] ?? objectiveConfig['defend_share'];

  const sourceSKUs: SKUItem[] = skus_in_category?.slice(0, 5) ?? [];
  const sku_recommendations: SKURecommendation[] =
    sourceSKUs.length > 0
      ? sourceSKUs.slice(0, 5).map((sku, i) => ({
          sku_id: sku.sku_id ?? `SKU-${i + 1}`,
          product_name: sku.product_name ?? `Product ${i + 1}`,
          action: cfg.action,
          change_pct: cfg.changePct,
          reason: `${cfg.action === 'raise' ? 'Low elasticity, room to grow margin' : cfg.action === 'lower' ? 'High inventory overhang, accelerate sell-through' : 'Competitive parity price point'} for ${sku.product_name ?? 'this SKU'}.`,
        }))
      : [
          {
            sku_id: 'SKU-001',
            product_name: `${category} Core Item A`,
            action: cfg.action,
            change_pct: cfg.changePct,
            reason: `Primary ${category} SKU — ${cfg.action} price to meet ${objective} objective.`,
          },
          {
            sku_id: 'SKU-002',
            product_name: `${category} Core Item B`,
            action: cfg.action,
            change_pct: cfg.changePct * 0.8,
            reason: `Secondary SKU with moderate elasticity — apply lighter ${cfg.action} adjustment.`,
          },
          {
            sku_id: 'SKU-003',
            product_name: `${category} Value Item`,
            action: 'hold',
            change_pct: 0,
            reason: 'High price-sensitivity — hold to avoid volume loss.',
          },
        ];

  return {
    strategy_label: cfg.label,
    rationale: cfg.rationale,
    sku_recommendations,
    expected_margin_impact_pp: cfg.marginImpact,
    expected_revenue_impact_inr: cfg.revenueImpact,
    risks: [
      competitive_intensity === 'high'
        ? 'High competitive intensity may neutralise price raises within 2-3 weeks'
        : 'Monitor competitor response bi-weekly',
      'Consumer price perception shift if changes exceed ±5% in a single move',
    ],
    confidence: cfg.confidence,
  };
}


// Backward-compat: flat fields stay for AgentsTab; components[] for the canvas.
function deriveComponents(result: PriceStrategyResult): UIComponentType[] {
  const sym = agentCurrencySymbol(agentTenant());
  const comps: UIComponentType[] = [
    { type: 'kpi_card', label: 'Margin Impact', value: `${result.expected_margin_impact_pp >= 0 ? '+' : ''}${result.expected_margin_impact_pp.toFixed(2)}pp`, direction: result.expected_margin_impact_pp >= 0 ? 'up' : 'down' },
    { type: 'kpi_card', label: 'Revenue Impact', value: `${sym}${Math.round(result.expected_revenue_impact_inr).toLocaleString()}`, direction: result.expected_revenue_impact_inr >= 0 ? 'up' : 'down' },
    { type: 'kpi_card', label: 'Confidence', value: result.confidence.toUpperCase(), direction: result.confidence === 'high' ? 'up' : 'down' },
  ];
  if (result.sku_recommendations?.length) {
    comps.push({
      type: 'data_table',
      title: 'SKU Recommendations',
      columns: ['sku_id', 'action', 'price_change_pct', 'rationale'],
      data: result.sku_recommendations.slice(0, 8) as unknown as Record<string, unknown>[],
    });
  }
  return comps;
}

export async function POST(request: NextRequest) {
  const body: PriceStrategyBody = await request.json();

  if (!client) {
    const result = computeFallback(body);
    return NextResponse.json({ ...result, components: deriveComponents(result) });
  }

  // Fetch live recommendations + elasticity for this category from Databricks.
  // Degrades gracefully on failure — Claude still gets the supplied skus_in_category.
  let dbxContext = '';
  try {
    const [recs, elasticity] = await Promise.all([
      priceIntelLookup({ scope: 'recommendations', filter: { category_l1: body.category }, limit: 20 }),
      priceIntelLookup({ scope: 'elasticity', filter: { category_l1: body.category }, limit: 20 }),
    ]);
    const ctx: Record<string, unknown> = {};
    if (recs.success && recs.data?.length) ctx.recommendations = recs.data;
    if (elasticity.success && elasticity.data?.length) ctx.elasticity = elasticity.data;
    if (Object.keys(ctx).length) {
      dbxContext = `Real current state from Databricks for category "${body.category}":\n${JSON.stringify(ctx, null, 2)}\n\nGround your strategy in these actual recommended prices and elasticity coefficients.\n\n`;
    }
  } catch (err) {
    console.warn('price-strategy: dbx context fetch failed, continuing without:', err);
  }

  const prompt = `${dbxContext}Build a price strategy recommendation for an Indian retail category and return ONLY valid JSON. No markdown, no commentary.

Category: ${body.category}
Planning horizon: ${body.horizon}
Objective: ${body.objective}
Competitive intensity: ${body.competitive_intensity}
Department data: ${JSON.stringify(body.dept_data ?? {})}
SKUs in category (sample): ${JSON.stringify((body.skus_in_category ?? []).slice(0, 10))}

Return JSON schema:
{
  "strategy_label": "<string>",
  "rationale": "<string>",
  "sku_recommendations": [
    { "sku_id": "<string>", "product_name": "<string>", "action": "raise|hold|lower", "change_pct": <number>, "reason": "<string>" }
  ],
  "expected_margin_impact_pp": <number>,
  "expected_revenue_impact_inr": <number>,
  "risks": ["<string>"],
  "confidence": "high|medium|low"
}`;

  try {
    const response = await client.messages.create({
      model: modelName,
      max_tokens: 1500,
      system:
        'You are a senior pricing strategist for a large Indian omnichannel retailer. Return ONLY valid JSON matching the exact schema provided. All monetary values in INR.',
      messages: [{ role: 'user', content: prompt }],
    });

    const raw =
      response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const result: PriceStrategyResult = JSON.parse(cleaned);

    return NextResponse.json({ ...result, components: deriveComponents(result) });
  } catch (err) {
    console.error('price-strategy agent error:', err);
    const result = computeFallback(body);
    return NextResponse.json({ ...result, components: deriveComponents(result) });
  }
}
