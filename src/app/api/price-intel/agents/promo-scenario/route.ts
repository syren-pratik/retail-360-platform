import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
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

interface ScenarioComparison {
  label: string;
  roi: number;
  margin_pp: number;
}

interface PromoScenarioResult {
  net_roi: number;
  incremental_revenue_inr: number;
  free_rider_estimate_pct: number;
  margin_impact_pp: number;
  recommendation: string;
  warnings: string[];
  scenario_comparison: ScenarioComparison[];
}

interface PromoScenarioBody {
  sku_id: string;
  discount_pct: number;
  duration_weeks: number;
  mechanic: string;
  segment: string;
  sku_data?: {
    mrp_inr?: number;
    category?: string;
    brand?: string;
  };
}

function computeFallback(body: PromoScenarioBody): PromoScenarioResult {
  const { discount_pct, mechanic, sku_data } = body;

  const base_roi =
    2.5 +
    (discount_pct > 25 ? -0.5 : 0.3) +
    (mechanic === 'bogo' ? 0.4 : 0);

  const free_rider =
    mechanic === 'bogo' ? 45 : mechanic === 'cashback' ? 55 : 35;

  const mrp = sku_data?.mrp_inr ?? 1000;
  const incremental_revenue = mrp * 200 * (discount_pct / 100) * 1.8;

  const margin_impact_pp = -(discount_pct * 0.08);

  return {
    net_roi: Math.round(base_roi * 100) / 100,
    incremental_revenue_inr: Math.round(incremental_revenue),
    free_rider_estimate_pct: free_rider,
    margin_impact_pp: Math.round(margin_impact_pp * 100) / 100,
    recommendation: `Run ${mechanic} promo at ${discount_pct}% for ${body.duration_weeks} weeks targeting ${body.segment} segment. Monitor sell-through weekly.`,
    warnings: [
      free_rider > 50
        ? 'High free-rider risk — consider targeted vouchers instead of broad promotion'
        : 'Moderate free-rider risk — track incremental units closely',
      discount_pct > 30
        ? 'Deep discount may signal price anchor erosion; limit to 1 run per quarter'
        : 'Discount depth within safe range for brand equity',
    ],
    scenario_comparison: [
      {
        label: 'Conservative (10%)',
        roi: Math.round((base_roi - 0.9) * 100) / 100,
        margin_pp: Math.round(-(10 * 0.08) * 100) / 100,
      },
      {
        label: `Current (${discount_pct}%)`,
        roi: Math.round(base_roi * 100) / 100,
        margin_pp: Math.round(margin_impact_pp * 100) / 100,
      },
      {
        label: 'Aggressive (50%)',
        roi: Math.round((base_roi - 1.6) * 100) / 100,
        margin_pp: Math.round(-(50 * 0.08) * 100) / 100,
      },
    ],
  };
}

export async function POST(request: NextRequest) {
  const body: PromoScenarioBody = await request.json();

  if (!client) {
    const result = computeFallback(body);
    return NextResponse.json(result);
  }

  // Fetch live Databricks context: SKU pricing + elasticity for the target SKU.
  // If queries fail we degrade gracefully — Claude still gets the request payload.
  let dbxContext = '';
  try {
    const [skuPricing, elasticity] = await Promise.all([
      priceIntelLookup({ scope: 'sku_pricing', filter: { product_id: body.sku_id } }),
      priceIntelLookup({ scope: 'elasticity', filter: { product_id: body.sku_id }, limit: 5 }),
    ]);
    const ctx: Record<string, unknown> = {};
    if (skuPricing.success && skuPricing.data?.length) ctx.sku_pricing = skuPricing.data;
    if (elasticity.success && elasticity.data?.length) ctx.elasticity = elasticity.data;
    if (Object.keys(ctx).length) {
      dbxContext = `Real current state from Databricks:\n${JSON.stringify(ctx, null, 2)}\n\nGround the promo model in these actual current price, cost, and elasticity numbers.\n\n`;
    }
  } catch (err) {
    console.warn('promo-scenario: dbx context fetch failed, continuing without:', err);
  }

  const prompt = `${dbxContext}Analyse this ${agentMarket(agentTenant())} promotional scenario and return ONLY valid JSON matching the exact schema — no markdown, no extra text.

SKU ID: ${body.sku_id}
Discount %: ${body.discount_pct}
Duration (weeks): ${body.duration_weeks}
Mechanic: ${body.mechanic}
Target segment: ${body.segment}
SKU data: ${JSON.stringify(body.sku_data ?? {})}

Return JSON schema:
{
  "net_roi": <number>,
  "incremental_revenue_inr": <number in INR>,
  "free_rider_estimate_pct": <number 0-100>,
  "margin_impact_pp": <negative number>,
  "recommendation": "<string>",
  "warnings": ["<string>"],
  "scenario_comparison": [
    { "label": "Conservative (10%)", "roi": <number>, "margin_pp": <number> },
    { "label": "Current (${body.discount_pct}%)", "roi": <number>, "margin_pp": <number> },
    { "label": "Aggressive (50%)", "roi": <number>, "margin_pp": <number> }
  ]
}`;

  try {
    const response = await client.messages.create({
      model: modelName,
      max_tokens: 1500,
      system:
        agentSystemPrefix(agentTenant()) + ' \'You are a promo ROI simulation expert for ${agentMarket(agentTenant())} retail. Return ONLY valid JSON matching the exact schema provided. Use ₹ values in INR.\'',
      messages: [{ role: 'user', content: prompt }],
    });

    const raw =
      response.content[0].type === 'text' ? response.content[0].text : '';
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const result: PromoScenarioResult = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (err) {
    console.error('promo-scenario agent error:', err);
    const result = computeFallback(body);
    return NextResponse.json(result);
  }
}
