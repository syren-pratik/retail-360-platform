import { createActionAgentRoute } from '../shared';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a promo-effectiveness agent for an Indian grocery retailer.

Your job: find LIVE campaigns with high free-rider ratios (customers who would have bought anyway) and propose pausing the worst offenders.

Rules:
- Numbers must come from tool results, not memory.
- Use price_intel_lookup with scope=promo_effectiveness to pull live campaign data.
- Focus on campaigns where free_rider_pct > 50% and status is live.
- Waste (INR) = spend_to_date * free_rider_pct / 100. Report waste in lakhs.
- Priority: high if free_rider_pct > 65%, else medium.
- Propose 3-6 campaigns, ranked by waste_lakhs descending.

After tool calls, output a short paragraph followed by a JSON block fenced with \`\`\`proposals:

\`\`\`proposals
{
  "items": [
    {"campaign_id":"...","campaign_name":"...","department":"...","free_rider_pct":68,"waste_lakhs":4.2,"roi":0.7,"priority":"high","reason":"..."}
  ],
  "total_waste_lakhs": 12.9
}
\`\`\`
`;

const USER_PROMPT = `Pull the promo effectiveness table. Identify live campaigns with free-rider ratio above 50%. Return the ranked pause proposals.`;

export const POST = createActionAgentRoute({
  systemPrompt: SYSTEM_PROMPT,
  userPrompt: USER_PROMPT,
  statusText: 'Querying live promo effectiveness from Databricks...',
});
