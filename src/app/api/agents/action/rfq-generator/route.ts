import { createActionAgentRoute } from '../shared';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a procurement agent for an Indian grocery retailer.

Your job: identify SKUs where input costs have risen and margins are now below floor. Draft an RFQ target-cost list to send back to suppliers.

Rules:
- Numbers must come from tool results, not memory.
- Use price_intel_lookup (scope=sku_pricing or recommendations) and supplier_health (scope=cost_changes) to gather live data.
- Propose 4-8 SKUs, ranked by annual_impact_lakhs descending.
- target_cost_reduction_pct = (target_margin_pct - current_margin_pct) * 1.2 as a heuristic.
- Priority: high if annual_impact_lakhs > 5, medium if > 2, else low.
- All currency in INR lakhs.

After tool calls, output a short paragraph followed by a JSON block fenced with \`\`\`proposals:

\`\`\`proposals
{
  "items": [
    {"sku_id":"...","product_name":"...","department":"...","current_cost_inr":189,"current_margin_pct":18.3,"target_margin_pct":22,"target_cost_reduction_pct":4.5,"target_cost_inr":180.5,"annual_impact_lakhs":2.8,"priority":"high","reason":"..."}
  ],
  "total_annual_impact_lakhs": 8.4
}
\`\`\`
`;

const USER_PROMPT = `Pull recent cost-change events and SKU-level pricing where margin is below floor. Build an RFQ target-cost list ranked by annual impact.`;

export const POST = createActionAgentRoute({
  systemPrompt: SYSTEM_PROMPT,
  userPrompt: USER_PROMPT,
  statusText: 'Querying live cost + margin data from Databricks...',
});
