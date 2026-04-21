/**
 * Mock SQL Executor
 * Parses SQL patterns and returns realistic mock data for testing.
 * This will be replaced with real Databricks queries later.
 */

type MockRecord = Record<string, string | number | null>;

// Mock data generators
const segments = ['Premium', 'Loyal', 'Regular', 'Occasional', 'New'];
const loyaltyTiers = ['Platinum', 'Gold', 'Silver', 'Bronze', 'None'];
const clvTiers = ['Platinum', 'Gold', 'Silver', 'Bronze', 'At-Risk'];
const churnRiskTiers = ['Critical', 'High', 'Medium', 'Low'];
const categories = ['Electronics', 'Fashion', 'Grocery', 'Beauty', 'Home & Living'];
const channels = ['Online', 'In-Store', 'Both'];

function generateCustomerId(index: number): string {
  return `CUST${String(10000 + index).slice(1)}`;
}

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

// Pattern matchers and data generators
export async function executeMockQuery(sql: string): Promise<MockRecord[]> {
  const sqlLower = sql.toLowerCase();

  // COUNT queries (KPI card)
  if (sqlLower.includes('count(') && sqlLower.includes('customer_id') && !sqlLower.includes('group by')) {
    return [{ total_customers: 156842 }];
  }

  // Churn by segment
  if (sqlLower.includes('churn') && sqlLower.includes('customer_segment') && sqlLower.includes('group by')) {
    return segments.map((segment) => ({
      customer_segment: segment,
      customers: randomBetween(15000, 45000),
      avg_churn_rate: segment === 'Occasional' ? 34.2 :
                      segment === 'New' ? 28.7 :
                      segment === 'Regular' ? 18.3 :
                      segment === 'Loyal' ? 11.3 : 8.1,
    }));
  }

  // CLV by segment
  if (sqlLower.includes('clv') && sqlLower.includes('customer_segment') && sqlLower.includes('group by')) {
    return segments.map((segment) => ({
      customer_segment: segment,
      customers: randomBetween(15000, 45000),
      avg_clv: segment === 'Premium' ? 85240 :
               segment === 'Loyal' ? 42680 :
               segment === 'Regular' ? 18450 :
               segment === 'Occasional' ? 6820 : 2150,
    }));
  }

  // Loyalty tier distribution
  if (sqlLower.includes('loyalty_tier') && sqlLower.includes('group by') && sqlLower.includes('count')) {
    return loyaltyTiers.map((tier) => ({
      loyalty_tier: tier,
      customer_count: tier === 'None' ? 52480 :
                      tier === 'Bronze' ? 45892 :
                      tier === 'Silver' ? 28934 :
                      tier === 'Gold' ? 18420 : 11116,
    }));
  }

  // CLV tier distribution
  if (sqlLower.includes('clv_tier') && sqlLower.includes('group by') && sqlLower.includes('count')) {
    return clvTiers.map((tier) => ({
      clv_tier: tier,
      customer_count: tier === 'Bronze' ? 52480 :
                      tier === 'Silver' ? 45892 :
                      tier === 'At-Risk' ? 26894 :
                      tier === 'Gold' ? 23156 : 8420,
      avg_clv: tier === 'Platinum' ? 85240 :
               tier === 'Gold' ? 42680 :
               tier === 'Silver' ? 18450 :
               tier === 'Bronze' ? 6820 : 2150,
    }));
  }

  // Churn risk tier distribution
  if (sqlLower.includes('churn_risk_tier') && sqlLower.includes('group by')) {
    return churnRiskTiers.map((tier) => ({
      churn_risk_tier: tier,
      customer_count: tier === 'Low' ? 69774 :
                      tier === 'Medium' ? 45678 :
                      tier === 'High' ? 28934 : 12456,
      avg_churn_prob: tier === 'Critical' ? 0.9456 :
                      tier === 'High' ? 0.7421 :
                      tier === 'Medium' ? 0.3856 : 0.1245,
    }));
  }

  // Top customers by CLV
  if (sqlLower.includes('order by') && sqlLower.includes('clv') && sqlLower.includes('desc') && sqlLower.includes('limit')) {
    const limitMatch = sql.match(/limit\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 10;

    return Array.from({ length: limit }, (_, i) => ({
      customer_id: generateCustomerId(i),
      customer_segment: i < 3 ? 'Premium' : i < 6 ? 'Loyal' : 'Regular',
      loyalty_tier: i < 2 ? 'Platinum' : i < 5 ? 'Gold' : 'Silver',
      total_spend_lifetime: randomDecimal(150000, 500000) - (i * 20000),
      clv_12m: randomDecimal(80000, 150000) - (i * 5000),
      clv_tier: i < 3 ? 'Platinum' : i < 6 ? 'Gold' : 'Silver',
    }));
  }

  // Comparison queries (2 segments)
  if (sqlLower.includes("in ('premium'") || sqlLower.includes("in (\"premium\"") ||
      (sqlLower.includes('premium') && sqlLower.includes('occasional'))) {
    return [
      {
        customer_segment: 'Premium',
        customers: 15250,
        avg_spend: 125840.50,
        avg_basket: 4520.30,
      },
      {
        customer_segment: 'Occasional',
        customers: 42370,
        avg_spend: 6840.25,
        avg_basket: 856.40,
      },
    ];
  }

  // Category distribution
  if (sqlLower.includes('top_category') && sqlLower.includes('group by')) {
    return categories.map((category) => ({
      top_category: category,
      customer_count: randomBetween(20000, 45000),
      avg_spend: randomDecimal(5000, 50000),
    }));
  }

  // Channel distribution
  if (sqlLower.includes('preferred_channel') && sqlLower.includes('group by')) {
    return channels.map((channel) => ({
      preferred_channel: channel,
      customer_count: channel === 'Online' ? 68420 :
                      channel === 'In-Store' ? 52340 : 36082,
    }));
  }

  // Feature importance
  if (sqlLower.includes('feature') && sqlLower.includes('shap')) {
    return [
      { feature_name: 'Days Since Last Purchase', importance: 0.2846, direction: 'positive' },
      { feature_name: 'Purchase Frequency', importance: 0.1987, direction: 'negative' },
      { feature_name: 'Avg Basket Value Trend', importance: 0.1568, direction: 'negative' },
      { feature_name: 'Customer Tenure', importance: 0.1424, direction: 'negative' },
      { feature_name: 'Returns Rate', importance: 0.1289, direction: 'positive' },
    ];
  }

  // Cohort retention
  if (sqlLower.includes('cohort') && sqlLower.includes('retention')) {
    return [
      { cohort_month: '2024-01', period_number: 0, retention_rate: 100 },
      { cohort_month: '2024-01', period_number: 1, retention_rate: 68.5 },
      { cohort_month: '2024-01', period_number: 2, retention_rate: 52.3 },
      { cohort_month: '2024-02', period_number: 0, retention_rate: 100 },
      { cohort_month: '2024-02', period_number: 1, retention_rate: 71.2 },
    ];
  }

  // Average metrics (single value)
  if (sqlLower.includes('avg(') && !sqlLower.includes('group by')) {
    if (sqlLower.includes('clv')) {
      return [{ avg_clv: 12450.75 }];
    }
    if (sqlLower.includes('churn')) {
      return [{ avg_churn_rate: 18.4 }];
    }
    if (sqlLower.includes('basket')) {
      return [{ avg_basket_value: 1856.40 }];
    }
  }

  // Default: Return sample customer data
  return Array.from({ length: 10 }, (_, i) => ({
    customer_id: generateCustomerId(i),
    customer_segment: randomFromArray(segments),
    loyalty_tier: randomFromArray(loyaltyTiers),
    total_spend: randomDecimal(5000, 150000),
    total_transactions: randomBetween(5, 80),
    avg_basket: randomDecimal(500, 5000),
    clv_12m: randomDecimal(2000, 80000),
    churn_probability: randomDecimal(0.05, 0.85, 4),
  }));
}
