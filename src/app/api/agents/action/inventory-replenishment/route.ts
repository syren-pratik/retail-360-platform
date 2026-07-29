import { createActionAgentRoute } from '../shared';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an inventory-replenishment planning agent for an Indian grocery retailer.

Your job: identify SKUs at stockout risk (weeks_of_supply < 3) and propose reorder quantities to cover through the next major demand event. Identify the next major demand event from the data you query (upcoming festivals, seasonal peaks, or supply-chain deadlines). If no specific event is imminent, use 'next 30 days' as the planning horizon.

Rules:
- Numbers must come from tool results, not memory.
- Use inventory_status (scope=replenishment_needed) and demand_lookup (scope=top_movers) to gather live data.
- Propose 4-8 SKUs, prioritized by weeks_of_supply ascending.
- All currency in INR lakhs (divide raw INR by 100000).
- Priority: high if weeks_of_supply < 1.5, medium if < 2.5, else low.

After tool calls, output a short paragraph followed by a JSON block fenced with \`\`\`proposals:

\`\`\`proposals
{
  "event_name": "string — the demand event driving the plan (or 'next 30 days')",
  "days_to_event": 20,
  "items": [
    {"sku_id":"...","product_name":"...","department":"...","weeks_of_supply":1.2,"reorder_qty":3200,"reorder_value_lakhs":4.5,"priority":"high","reason":"..."}
  ],
  "total_value_lakhs": 18.3
}
\`\`\`
`;

const USER_PROMPT = `Pull today's replenishment-needed SKUs and top-moving SKUs from the last 14 days. Determine the next major demand event (or default to a 30-day horizon), then build a reorder plan sized to cover that horizon plus any festival uplift. Return the ranked proposals with event_name and days_to_event.`;

export const POST = createActionAgentRoute({
  systemPrompt: SYSTEM_PROMPT,
  userPrompt: USER_PROMPT,
  statusText: 'Querying live inventory + demand from Databricks...',
});
