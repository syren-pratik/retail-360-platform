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

type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';

interface KotlerAnalysis {
  competitive_position: string;
  threat_level: ThreatLevel;
  recommended_response: string;
  price_adjustment_pct: number;
  supporting_actions: string[];
  market_share_risk_pct: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CompetitiveResponseBody {
  messages: ChatMessage[];
  context: {
    kpis: Record<string, unknown>;
    departments: unknown[];
  };
}

interface CompetitiveResponseResult {
  reply: string;
  analysis?: KotlerAnalysis;
  source: 'claude' | 'fallback';
}

function computeFallback(body: CompetitiveResponseBody): CompetitiveResponseResult {
  const lastUserMessage = [...body.messages]
    .reverse()
    .find((m) => m.role === 'user')?.content ?? '';

  const has15pct = /15\s*%/i.test(lastUserMessage);
  const hasCritical = /massive|aggressive|flood|dominate/i.test(lastUserMessage);

  let threat_level: ThreatLevel = 'medium';
  let price_adjustment_pct = -5;
  let market_share_risk_pct = 12;

  if (has15pct) {
    threat_level = 'medium';
    price_adjustment_pct = -8;
    market_share_risk_pct = 15;
  } else if (hasCritical) {
    threat_level = 'high';
    price_adjustment_pct = -12;
    market_share_risk_pct = 22;
  }

  const analysis: KotlerAnalysis = {
    competitive_position: 'Market Challenger',
    threat_level,
    recommended_response: `Selective price match on high-visibility SKUs (${price_adjustment_pct}%) while defending margin on premium lines.`,
    price_adjustment_pct,
    supporting_actions: [
      'Activate loyalty double-points campaign for next 2 weeks',
      'Brief store managers on competitive situation',
      'Increase share-of-shelf on category leaders',
    ],
    market_share_risk_pct,
  };

  return {
    reply: `Based on the Kotler competitive response framework, this is a ${threat_level} threat requiring a targeted counter-move. I recommend a selective price adjustment of ${price_adjustment_pct}% on key battleground SKUs rather than a broad markdown. See the analysis block for the full response plan.`,
    analysis,
    source: 'fallback',
  };
}


// Backward-compat: flat fields stay for AgentsTab; components[] for the canvas.
function deriveComponents(result: CompetitiveResponseResult): UIComponentType[] {
  const a = result.analysis;
  if (!a) return [];
  return [
    { type: 'kpi_card', label: 'Threat Level', value: a.threat_level.toUpperCase(), direction: a.threat_level === 'low' ? 'up' : 'down' },
    { type: 'kpi_card', label: 'Price Adjustment', value: `${a.price_adjustment_pct > 0 ? '+' : ''}${a.price_adjustment_pct}%`, direction: a.price_adjustment_pct >= 0 ? 'up' : 'down' },
    { type: 'kpi_card', label: 'Market Share Risk', value: `${a.market_share_risk_pct}%`, direction: a.market_share_risk_pct > 5 ? 'down' : 'up' },
    {
      type: 'data_table',
      title: 'Supporting Actions',
      columns: ['action'],
      data: (a.supporting_actions ?? []).map((s) => ({ action: s })),
    },
  ];
}

export async function POST(request: NextRequest) {
  const body: CompetitiveResponseBody = await request.json();

  if (!client) {
    { const result = computeFallback(body); return NextResponse.json({ ...result, components: deriveComponents(result) }); }
  }

  // Fetch live competitive gap data from Databricks to ground reasoning.
  // Degrades gracefully on failure.
  let dbxContext = '';
  try {
    const gaps = await priceIntelLookup({ scope: 'competitive_gaps', limit: 30 });
    if (gaps.success && gaps.data?.length) {
      dbxContext = `\n\nReal current competitive gaps from Databricks (our_price vs competitor_price, gaps >5%):\n${JSON.stringify(gaps.data, null, 2)}\n\nReason over these actual competitor prices when assessing threat and recommending response.`;
    }
  } catch (err) {
    console.warn('competitive-response: dbx context fetch failed, continuing without:', err);
  }

  try {
    const response = await client.messages.create({
      model: modelName,
      max_tokens: 1500,
      system: `You are a competitive pricing strategist using the Kotler framework for ${agentMarket(agentTenant())} retail. When the user describes a competitor pricing move, respond conversationally AND include a JSON analysis block at the end of your response wrapped in <analysis> tags. The analysis should follow this schema: { "competitive_position": "<string>", "threat_level": "low|medium|high|critical", "recommended_response": "<string>", "price_adjustment_pct": <number>, "supporting_actions": ["<string>"], "market_share_risk_pct": <number> }. Keep response text brief (2-3 sentences) before the analysis block.${dbxContext}`,
      messages: body.messages,
    });

    const raw =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract <analysis>...</analysis> block
    const analysisMatch = raw.match(/<analysis>([\s\S]*?)<\/analysis>/i);
    const reply = raw.replace(/<analysis>[\s\S]*?<\/analysis>/i, '').trim();

    let analysis: KotlerAnalysis | undefined;
    if (analysisMatch) {
      try {
        const cleanedJson = analysisMatch[1]
          .replace(/```json\s*/gi, '')
          .replace(/```/g, '')
          .trim();
        analysis = JSON.parse(cleanedJson) as KotlerAnalysis;
      } catch {
        console.warn('Failed to parse analysis block from Claude response');
      }
    }

    { const result: CompetitiveResponseResult = { reply, analysis, source: 'claude' }; return NextResponse.json({ ...result, components: deriveComponents(result) }); }
  } catch (err) {
    console.error('competitive-response agent error:', err);
    { const result = computeFallback(body); return NextResponse.json({ ...result, components: deriveComponents(result) }); }
  }
}
