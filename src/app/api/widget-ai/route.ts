import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
let anthropic: Anthropic | null = null;
let modelName = 'claude-sonnet-4-20250514';

try {
  if (process.env.ANTHROPIC_API_KEY) {
    if (process.env.AZURE_ENDPOINT) {
      anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.AZURE_ENDPOINT,
      });
      modelName = process.env.AZURE_MODEL_NAME || 'claude-sonnet-4-5';
    } else {
      anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }
} catch {
  console.warn('Failed to initialize Anthropic client for widget AI');
}

// Cache per chart + filter combination (5 min TTL)
const widgetCache = new Map<string, { result: WidgetAnalysis; timestamp: number }>();
const WIDGET_CACHE_TTL = 5 * 60 * 1000;

interface WidgetAnalysis {
  insight: string;
  metrics: Array<{
    label: string;
    value: string;
    color: 'positive' | 'negative' | 'warning' | 'neutral';
  }>;
  follow_ups: Array<{
    label: string;
    prompt: string;
  }>;
}

const WIDGET_AI_PROMPT = `You analyze a single dashboard chart and provide a brief, insightful summary.

Return ONLY valid JSON:
{
  "insight": "1-2 sentences — the key finding. Use **bold** for numbers. Be specific.",
  "metrics": [
    { "label": "short label", "value": "₹3,251", "color": "positive|negative|warning|neutral" }
  ],
  "follow_ups": [
    { "label": "Short question (4 words max)", "prompt": "Full question to send to main AI chat" }
  ]
}

Rules:
- insight: MAX 2 sentences. Lead with the finding, not description.
- metrics: 2-3 key numbers from the data. Formatted nicely (₹, %, K for thousands).
- follow_ups: 2-3 natural next questions. First word should be a verb (Show, Why, Compare, Find).
- NEVER describe what the chart shows — tell the user what it MEANS.
- Use ₹ for currency, % for rates, K/L for large numbers.

Bad: "This bar chart shows the distribution of customers across 5 CLV tiers."
Good: "At-Risk is your largest tier at **12.4K** — 68% of customers have CLV below ₹1,000."`;

function getMockAnalysis(chartTitle: string, chartType: string, data: unknown[]): WidgetAnalysis {
  // Generate mock analysis based on chart title and data
  const dataLength = Array.isArray(data) ? (data ?? []).length : 0;

  if ((chartTitle ?? '').toLowerCase().includes('churn')) {
    return {
      insight: 'Occasional shoppers have the highest churn at **34.2%**, 3x higher than Premium customers. Focus retention efforts here.',
      metrics: [
        { label: 'Highest Churn', value: '34.2%', color: 'negative' },
        { label: 'At Risk', value: '12.4K', color: 'warning' },
        { label: 'Lowest Churn', value: '8.1%', color: 'positive' },
      ],
      follow_ups: [
        { label: 'Why is churn high?', prompt: 'What is driving high churn in the Occasional segment?' },
        { label: 'Compare to last month', prompt: 'Compare churn rates to last month by segment' },
        { label: 'Show at-risk list', prompt: 'Show me the list of high-value customers at risk of churning' },
      ],
    };
  }

  if ((chartTitle ?? '').toLowerCase().includes('clv') || (chartTitle ?? '').toLowerCase().includes('lifetime')) {
    return {
      insight: 'At-Risk is your largest tier at **12.4K** customers — 68% have CLV below ₹1,000. Platinum has 2x the CLV but only 3% of customers.',
      metrics: [
        { label: 'Top CLV', value: '₹3,251', color: 'positive' },
        { label: 'At-Risk Count', value: '12.4K', color: 'warning' },
        { label: 'Below ₹1K', value: '68%', color: 'negative' },
      ],
      follow_ups: [
        { label: 'Why At-Risk so large?', prompt: 'Why is the At-Risk tier so large compared to other tiers?' },
        { label: 'Upgrade opportunities', prompt: 'Which At-Risk customers have the highest potential to upgrade?' },
        { label: 'CLV trend over time', prompt: 'Show me the CLV distribution trend over the last 6 months' },
      ],
    };
  }

  if ((chartTitle ?? '').toLowerCase().includes('segment') || (chartTitle ?? '').toLowerCase().includes('migration')) {
    return {
      insight: '**23%** of Regular customers upgraded to Loyal this quarter, but **15%** of Loyal downgraded — a net gain of only 2.1K.',
      metrics: [
        { label: 'Upgraded', value: '23%', color: 'positive' },
        { label: 'Downgraded', value: '15%', color: 'negative' },
        { label: 'Net Gain', value: '2.1K', color: 'neutral' },
      ],
      follow_ups: [
        { label: 'Why downgrades?', prompt: 'What is causing Loyal customers to downgrade?' },
        { label: 'Compare quarters', prompt: 'Compare segment migration between Q1 and Q2' },
        { label: 'Upgrade drivers', prompt: 'What behaviors drive customers to upgrade segments?' },
      ],
    };
  }

  if ((chartTitle ?? '').toLowerCase().includes('cohort') || (chartTitle ?? '').toLowerCase().includes('retention')) {
    return {
      insight: 'January cohort has the best 6-month retention at **45%**. Recent cohorts (Apr-Jun) show concerning **28%** drop-off after month 1.',
      metrics: [
        { label: 'Best Retention', value: '45%', color: 'positive' },
        { label: 'Avg M1 Dropoff', value: '28%', color: 'warning' },
        { label: 'Best Cohort', value: 'Jan 24', color: 'neutral' },
      ],
      follow_ups: [
        { label: 'What made Jan special?', prompt: 'What made the January cohort retain better than others?' },
        { label: 'Fix recent drop-off', prompt: 'What actions can improve retention for recent cohorts?' },
        { label: 'Retention by channel', prompt: 'Show cohort retention broken down by acquisition channel' },
      ],
    };
  }

  if ((chartTitle ?? '').toLowerCase().includes('forecast') || (chartTitle ?? '').toLowerCase().includes('accuracy')) {
    return {
      insight: 'Dairy has the highest MAPE at **18.2%**, while Grocery is best at **8.5%**. Model V3 outperforms V2 by **4pp** on average.',
      metrics: [
        { label: 'Best MAPE', value: '8.5%', color: 'positive' },
        { label: 'Worst MAPE', value: '18.2%', color: 'negative' },
        { label: 'Model Gap', value: '4pp', color: 'neutral' },
      ],
      follow_ups: [
        { label: 'Why Dairy worse?', prompt: 'What is causing poor forecast accuracy in the Dairy department?' },
        { label: 'Improve model V3', prompt: 'What features could improve model V3 accuracy further?' },
        { label: 'Accuracy by store', prompt: 'Show forecast accuracy breakdown by store' },
      ],
    };
  }

  if ((chartTitle ?? '').toLowerCase().includes('price') || (chartTitle ?? '').toLowerCase().includes('elasticity')) {
    return {
      insight: '**42 products** have elastic demand (>1.5) — price increases would reduce revenue. Snacks category is most elastic at **2.1**.',
      metrics: [
        { label: 'Elastic SKUs', value: '42', color: 'warning' },
        { label: 'Most Elastic', value: '2.1', color: 'negative' },
        { label: 'Inelastic', value: '158', color: 'positive' },
      ],
      follow_ups: [
        { label: 'Which to reprice?', prompt: 'Which inelastic products should we consider for price increases?' },
        { label: 'Snacks deep dive', prompt: 'Why is the Snacks category so price elastic?' },
        { label: 'Revenue impact', prompt: 'What is the potential revenue impact of repricing elastic products?' },
      ],
    };
  }

  // Default analysis
  return {
    insight: `This ${chartType} shows **${dataLength}** data points. The distribution suggests actionable patterns worth exploring further.`,
    metrics: [
      { label: 'Data Points', value: String(dataLength), color: 'neutral' },
      { label: 'Categories', value: String(Math.min(dataLength, 5)), color: 'neutral' },
    ],
    follow_ups: [
      { label: 'Drill deeper', prompt: `Show me more details about the ${chartTitle}` },
      { label: 'Compare periods', prompt: `Compare ${chartTitle} across different time periods` },
      { label: 'Export data', prompt: `Export the data from ${chartTitle} to CSV` },
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const { chartId, chartTitle, chartType, data, filters, module } = await request.json();

    // Validate required fields
    if (!chartId || !chartTitle) {
      return NextResponse.json(
        { error: 'chartId and chartTitle are required' },
        { status: 400 }
      );
    }

    // Cache key
    const cacheKey = `${chartId}_${JSON.stringify(filters || {})}`;
    const cached = widgetCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < WIDGET_CACHE_TTL) {
      return NextResponse.json(cached.result);
    }

    // If no API key, return mock analysis
    if (!process.env.ANTHROPIC_API_KEY || !anthropic) {
      const mockResult = getMockAnalysis(chartTitle, chartType || 'chart', data || []);
      widgetCache.set(cacheKey, { result: mockResult, timestamp: Date.now() });
      return NextResponse.json(mockResult);
    }

    // Call Claude for real analysis
    const response = await anthropic.messages.create({
      model: modelName,
      max_tokens: 500,
      system: WIDGET_AI_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this ${chartType || 'chart'} titled "${chartTitle}".

Data (first 20 rows):
${JSON.stringify((data || []).slice(0, 20), null, 2)}

Active filters: ${JSON.stringify(filters || {})}
Module: ${module || 'cx360'}

Generate analysis. Return ONLY valid JSON.`,
        },
      ],
    });

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    const text = textBlocks.map((block) => block.text).join('');

    let result: WidgetAnalysis;
    try {
      result = JSON.parse(text);
    } catch {
      // If parsing fails, return mock
      result = getMockAnalysis(chartTitle, chartType || 'chart', data || []);
    }

    // Cache the result
    widgetCache.set(cacheKey, { result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Widget AI error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze chart' },
      { status: 500 }
    );
  }
}
