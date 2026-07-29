import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { TENANT_COOKIE, type Tenant } from '@/app/lib/tenant-constants';

// Read tenant from request cookie so currency/labels match the active demo skin
function getTenantFromRequest(request: NextRequest): Tenant {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${TENANT_COOKIE}=`));
  const value = match?.split('=')[1];
  if (value === 'us_apparel') return 'us_apparel';
  if (value === 'us_retail') return 'us_retail';
  return 'india_grocery';
}

function isUSD(tenant: Tenant): boolean {
  return tenant === 'us_apparel' || tenant === 'us_retail';
}

// Tenant-aware money formatter — $1,234 for USD tenants, ₹1,234 for grocery
function money(n: number, tenant: Tenant): string {
  const rounded = Math.round(n);
  if (isUSD(tenant)) {
    return `$${rounded.toLocaleString('en-US')}`;
  }
  return `₹${rounded.toLocaleString('en-IN')}`;
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
  console.warn('Failed to initialize Anthropic client for NBA');
}

// Per-customer cache
interface CacheEntry {
  actions: Action[];
  timestamp: number;
}

interface Action {
  priority: number;
  action_type: 'retain' | 'upsell' | 'cross_sell' | 'win_back' | 'reward' | 'no_action';
  title: string;
  description: string;
  offer: { type: string; detail: string };
  channel: string;
  urgency: 'immediate' | 'this_week' | 'this_month';
  expected_impact: string;
  confidence: 'high' | 'medium' | 'low';
}

const nbaCache = new Map<string, CacheEntry>();
const NBA_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  const { customerId, customerData, forceRefresh } = await request.json();
  const tenant = getTenantFromRequest(request);

  // Cache key includes tenant so apparel/grocery don't collide for the same customer id
  const cacheKey = `${tenant}::${customerId}`;
  if (!forceRefresh) {
    const cached = nbaCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < NBA_CACHE_TTL) {
      return NextResponse.json({ actions: cached.actions, source: 'cache' });
    }
  }

  if (!process.env.ANTHROPIC_API_KEY || !client) {
    return NextResponse.json({
      actions: generateRuleBasedActions(customerData, tenant),
      source: 'rules',
    });
  }

  try {
    const response = await client.messages.create({
      model: modelName,
      max_tokens: 1000,
      system: nbaSystemPrompt(tenant),
      messages: [{ role: 'user', content: buildCustomerContext(customerData, tenant) }],
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => {
        if (block.type === 'text') return block.text;
        return '';
      })
      .join('');

    // Parse JSON (handle potential markdown wrapping)
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

    const actions: Action[] = JSON.parse(cleanJson);

    // Cache (key already includes tenant from above)
    nbaCache.set(cacheKey, { actions, timestamp: Date.now() });

    return NextResponse.json({ actions, source: 'claude' });
  } catch (error) {
    console.error('NBA generation failed:', error);
    return NextResponse.json({
      actions: generateRuleBasedActions(customerData, tenant),
      source: 'rules',
    });
  }
}

function nbaSystemPrompt(tenant: Tenant): string {
  const usd = isUSD(tenant);
  const company = tenant === 'us_retail'
    ? 'Meridian Retail, a US general-merchandise chain (85 stores; Electronics, Apparel & Shoes, Home & Garden, Sports & Outdoor, Beauty & Personal, Grocery & Snacks, Toys & Games)'
    : tenant === 'us_apparel'
      ? 'a US omnichannel apparel retailer (Nike / Levi\'s / Lululemon scale)'
      : 'an Indian retail company';
  const currency = usd ? '$' : '₹';
  const offerExample = tenant === 'us_retail'
    ? "'15% off Electronics accessories' or 'Free shipping on next order'"
    : tenant === 'us_apparel'
      ? "'15% off Women\\'s Tops' or 'Free shipping on next order'"
      : "'15% off Dairy products' or 'Free delivery for 30 days'";
  const offerSpecificExample = tenant === 'us_retail'
    ? '"15% off Home & Garden"'
    : tenant === 'us_apparel'
      ? '"15% off Athletic Footwear"'
      : '"15% off Dairy"';
  const channels = usd
    ? '"email" | "sms" | "push" | "in_store" | "phone_call"'
    : '"email" | "sms" | "whatsapp" | "push" | "in_store" | "phone_call"';
  const impactExample = usd
    ? "'Retain $320 annual CLV' or 'Increase basket by $25'"
    : "'Retain ₹3,200 annual CLV' or 'Increase basket by ₹200'";

  return `You are a retail CX strategist for ${company}.
Given a customer's profile data, recommend exactly 3 prioritized actions.

Return ONLY a valid JSON array. No markdown, no backticks.

Each action must be specific, measurable, and immediately executable:

[
  {
    "priority": 1,
    "action_type": "retain" | "upsell" | "cross_sell" | "win_back" | "reward" | "no_action",
    "title": "Short action title (max 6 words)",
    "description": "2-3 sentences explaining WHY this action, with specific data points from the customer's profile. Reference actual numbers.",
    "offer": {
      "type": "discount" | "free_delivery" | "bundle" | "points" | "exclusive_access" | "personal_call" | "none",
      "detail": "Specific offer (e.g., ${offerExample})"
    },
    "channel": ${channels},
    "urgency": "immediate" | "this_week" | "this_month",
    "expected_impact": "Specific expected outcome (e.g., ${impactExample})",
    "confidence": "high" | "medium" | "low"
  }
]

RULES:
- Action 1 = highest priority, most impactful
- Reference the customer's actual data: their CLV, churn risk, top category, purchase patterns
- For high-churn customers: focus on retention first
- For low-churn high-CLV: focus on upsell/cross-sell
- For dormant customers: focus on win-back
- For new customers with growing baskets: focus on rewards/loyalty
- Be specific with offers — ${offerSpecificExample} not "send a discount"
- Use ${currency} for all monetary values
- If the customer is healthy and active, action 3 can be "no_action" with monitoring recommendation`;
}

interface CustomerData {
  customer_id: string;
  customer_segment: string;
  loyalty_tier: string;
  member_since?: string;
  clv_12m: number;
  clv_tier: string;
  total_spend: number;
  total_transactions: number;
  avg_basket: number;
  days_since_last_purchase: number;
  preferred_channel: string;
  top_category: string;
  purchase_frequency?: number;
  churn_prob_90d: number;
  churn_risk_tier: string;
  probability_alive?: number;
  monthly_spend?: number;
  price_sensitivity?: string;
}

function buildCustomerContext(data: CustomerData, tenant: Tenant): string {
  const churnPct = typeof data.churn_prob_90d === 'number'
    ? (data.churn_prob_90d * 100).toFixed(1)
    : 'N/A';
  const probAlive = data.probability_alive
    ? (data.probability_alive * 100).toFixed(1) + '%'
    : 'N/A';

  return `Analyze this customer and recommend 3 actions:

CUSTOMER PROFILE:
- Customer ID: ${data.customer_id}
- Segment: ${data.customer_segment}
- Loyalty Tier: ${data.loyalty_tier}
- Member Since: ${data.member_since || 'Unknown'}

VALUE METRICS:
- CLV (12-month): ${money(data.clv_12m, tenant)}
- CLV Tier: ${data.clv_tier}
- Total Lifetime Spend: ${money(data.total_spend, tenant)}
- Total Transactions: ${data.total_transactions}
- Average Basket Value: ${money(data.avg_basket, tenant)}

BEHAVIOR:
- Days Since Last Purchase: ${data.days_since_last_purchase}
- Preferred Channel: ${data.preferred_channel}
- Top Category: ${data.top_category}
- Purchase Frequency: ${data.purchase_frequency || 'N/A'} orders

RISK METRICS:
- Churn Probability (90-day): ${churnPct}%
- Churn Risk Tier: ${data.churn_risk_tier}
- Probability Alive: ${probAlive}

TRENDS (if available):
- Monthly spend trend: ${data.monthly_spend ? 'Available' : 'Not available'}
- Price sensitivity: ${data.price_sensitivity || 'Unknown'}

Return exactly 3 actions as a JSON array.`;
}

function generateRuleBasedActions(data: CustomerData, tenant: Tenant): Action[] {
  const actions: Action[] = [];
  const churnProb = typeof data.churn_prob_90d === 'number' ? data.churn_prob_90d : 0;
  // USD CLVs are ~order of magnitude lower in $ — adjust the upsell threshold
  const upsellThreshold = isUSD(tenant) ? 600 : 50000;
  // WhatsApp is India-centric; USD tenants use email for win-back
  const winBackChannel = isUSD(tenant) ? 'email' : 'whatsapp';

  // Rule 1: High churn → Retention
  if (churnProb > 0.5) {
    actions.push({
      priority: 1,
      action_type: 'retain',
      title: 'Urgent retention needed',
      description: `Churn probability is ${(churnProb * 100).toFixed(0)}%. Customer hasn't purchased in ${data.days_since_last_purchase} days. CLV at risk: ${money(data.clv_12m, tenant)}.`,
      offer: { type: 'discount', detail: `15% off ${data.top_category || 'next purchase'}` },
      channel: data.preferred_channel === 'Online' ? 'email' : 'sms',
      urgency: 'immediate',
      expected_impact: `Retain ${money(data.clv_12m, tenant)} annual CLV`,
      confidence: 'medium',
    });
  } else if (data.days_since_last_purchase > 60) {
    // Dormant → Win-back
    actions.push({
      priority: 1,
      action_type: 'win_back',
      title: 'Win-back campaign needed',
      description: `Customer dormant for ${data.days_since_last_purchase} days. Previously spent ${money(data.total_spend, tenant)} across ${data.total_transactions} orders.`,
      offer: { type: 'free_delivery', detail: 'Free delivery on next 3 orders' },
      channel: winBackChannel,
      urgency: 'this_week',
      expected_impact: `Re-activate customer worth ${money(data.clv_12m, tenant)}/year`,
      confidence: 'medium',
    });
  }

  // Rule 2: High CLV, low churn → Upsell
  if (data.clv_12m > upsellThreshold && churnProb < 0.3) {
    actions.push({
      priority: actions.length + 1,
      action_type: 'upsell',
      title: 'Premium upsell opportunity',
      description: `High-value customer with ${money(data.clv_12m, tenant)} CLV and low churn risk (${(churnProb * 100).toFixed(0)}%). Average basket: ${money(data.avg_basket, tenant)}.`,
      offer: { type: 'bundle', detail: `Premium bundle in ${data.top_category || 'top category'}` },
      channel: 'email',
      urgency: 'this_week',
      expected_impact: 'Increase basket by 20%',
      confidence: 'medium',
    });
  }

  // Rule 3: Cross-sell opportunity
  if (actions.length < 2 && data.total_transactions > 5) {
    actions.push({
      priority: actions.length + 1,
      action_type: 'cross_sell',
      title: 'Category expansion opportunity',
      description: `Customer loyal to ${data.top_category} with ${data.total_transactions} transactions. Opportunity to introduce adjacent categories.`,
      offer: { type: 'bundle', detail: `Sample pack from complementary category` },
      channel: 'email',
      urgency: 'this_week',
      expected_impact: 'Increase category penetration by 15%',
      confidence: 'medium',
    });
  }

  // Rule 4: Loyalty program engagement
  if (actions.length < 3 && data.loyalty_tier !== 'Platinum') {
    actions.push({
      priority: actions.length + 1,
      action_type: 'reward',
      title: 'Loyalty tier progression',
      description: `Customer is ${data.loyalty_tier} tier. Accelerate progression to increase retention and lifetime value.`,
      offer: { type: 'points', detail: 'Double points on next 3 purchases' },
      channel: 'push',
      urgency: 'this_month',
      expected_impact: 'Higher tier = 18% better retention',
      confidence: 'medium',
    });
  }

  // Fill remaining slots with no_action
  while (actions.length < 3) {
    actions.push({
      priority: actions.length + 1,
      action_type: 'no_action',
      title: 'Monitor and track',
      description: 'No immediate action required. Continue monitoring engagement patterns and purchase behavior.',
      offer: { type: 'none', detail: 'N/A' },
      channel: 'email',
      urgency: 'this_month',
      expected_impact: 'Maintain current trajectory',
      confidence: 'high',
    });
  }

  return actions.slice(0, 3);
}

// GET endpoint to check cache status
export async function GET(request: NextRequest) {
  const customerId = request.nextUrl.searchParams.get('customerId');

  if (customerId) {
    const cached = nbaCache.get(customerId);
    return NextResponse.json({
      cached: !!cached,
      cacheAge: cached ? Math.round((Date.now() - cached.timestamp) / 1000 / 60) : null,
      actionCount: cached?.actions.length || 0,
    });
  }

  return NextResponse.json({
    cacheSize: nbaCache.size,
    ttlMinutes: NBA_CACHE_TTL / 1000 / 60,
  });
}
