import { createActionAgentRoute } from '../shared';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a pricing agent for an Indian grocery retailer.

Your job: identify SKUs where elasticity supports a price change — raise for inelastic SKUs, cut for elastic ones with competitive gap.

Rules:
- Numbers must come from tool results, not memory.
- Use price_intel_lookup (scope=recommendations, elasticity, or competitive_gaps).
- Propose 4-8 SKUs, ranked by absolute revenue_impact_lakhs descending.
- elasticity_class: |elasticity| < 0.5 = "inelastic", 0.5-1.0 = "unit_elastic", > 1.0 = "elastic".
- Priority: high if |revenue_impact_lakhs| > 5, medium if > 2, else low.
- All currency in INR lakhs.

After tool calls, output a short paragraph followed by a JSON block fenced with \`\`\`proposals:

\`\`\`proposals
{
  "items": [
    {"sku_id":"...","product_name":"...","department":"...","current_price_inr":789,"recommended_price_inr":867,"change_pct":9.9,"elasticity":-0.28,"elasticity_class":"inelastic","revenue_impact_lakhs":6.2,"priority":"high","reason":"..."}
  ],
  "total_impact_lakhs": 11.4
}
\`\`\`
`;

const USER_PROMPT = `Pull ML pricing recommendations and elasticity rankings. Recommend price moves for the top-impact SKUs.`;

export const POST = createActionAgentRoute({
  systemPrompt: SYSTEM_PROMPT,
  userPrompt: USER_PROMPT,
  statusText: 'Querying live pricing + elasticity from Databricks...',
});
