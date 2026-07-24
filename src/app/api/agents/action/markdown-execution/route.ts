import { createActionAgentRoute } from '../shared';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a clearance/markdown agent for an Indian grocery retailer.

Your job: find SKUs whose sell-through is trailing target with limited shelf-life or seasonal window, and propose markdown depths.

Rules:
- Numbers must come from tool results, not memory.
- Use inventory_status (scope=overstock or replenishment_needed) and demand_lookup (scope=top_movers) to gather live data.
- Propose 4-8 SKUs, ranked by revenue_at_risk_lakhs descending.
- Priority: high if current_st_pct < target_st_pct - 20, medium if -10, else low.
- All currency in INR lakhs.

After tool calls, output a short paragraph followed by a JSON block fenced with \`\`\`proposals:

\`\`\`proposals
{
  "items": [
    {"sku_id":"...","product_name":"...","department":"...","current_st_pct":48.5,"target_st_pct":70,"days_remaining":22,"recommended_depth_pct":-20,"recommended_price_inr":240,"revenue_at_risk_lakhs":3.4,"priority":"high","reason":"..."}
  ],
  "total_at_risk_lakhs": 8.2
}
\`\`\`
`;

const USER_PROMPT = `Pull today's overstock + slow-moving SKUs. Identify those trailing target sell-through. Recommend markdown depths that would clear stock in the remaining window. Return ranked proposals.`;

export const POST = createActionAgentRoute({
  systemPrompt: SYSTEM_PROMPT,
  userPrompt: USER_PROMPT,
  statusText: 'Querying live overstock + sell-through from Databricks...',
});
