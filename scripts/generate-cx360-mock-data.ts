import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOTAL_CUSTOMERS = 50000;

// Weighted random selection helper
function weightedPick<T>(options: [T, number][]): T {
  const total = options.reduce((sum, [_, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [value, weight] of options) {
    r -= weight;
    if (r <= 0) return value;
  }
  return options[0][0];
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

// ============ DISTRIBUTIONS ============

const SEGMENTS: [string, number][] = [
  ['High-Value VIP', 5],
  ['Loyal Active', 15],
  ['Medium Risk', 20],
  ['High Risk', 15],
  ['Churned', 10],
  ['New Customers', 15],
  ['Low-Value', 20],
];

const CITIES: [string, number][] = [
  ['Mumbai', 18],
  ['Delhi NCR', 15],
  ['Bangalore', 12],
  ['Hyderabad', 10],
  ['Chennai', 9],
  ['Pune', 8],
  ['Kolkata', 7],
  ['Ahmedabad', 6],
  ['Jaipur', 5],
  ['Lucknow', 4],
  ['Chandigarh', 3],
  ['Kochi', 3],
];

const ACQUISITION_CHANNELS: [string, number][] = [
  ['Organic Search', 22],
  ['Paid Ads (Google/Meta)', 18],
  ['Direct Traffic', 15],
  ['Referral', 12],
  ['Email / SMS', 10],
  ['Marketplace', 8],
  ['Social Media', 8],
  ['Offline (Store Walk-in)', 7],
];

const SHOPPING_CHANNELS: [string, number][] = [
  ['In-Store', 45],
  ['Online', 30],
  ['Mobile App', 15],
  ['Omnichannel', 10],
];

const LOYALTY_TIERS: [string, number][] = [
  ['Platinum', 5],
  ['Gold', 15],
  ['Silver', 30],
  ['Bronze', 35],
  ['None', 15],
];

const CATEGORY_MAP: Record<string, [string, number][]> = {
  'High-Value VIP': [['Electronics', 30], ['Premium Foods', 25], ['Clothing', 20], ['Home & Kitchen', 15], ['Beauty', 10]],
  'Loyal Active': [['Grocery', 35], ['Dairy', 25], ['Household', 20], ['Beverages', 10], ['Snacks', 10]],
  'Medium Risk': [['Grocery', 30], ['Household', 25], ['Snacks', 20], ['Beverages', 15], ['Dairy', 10]],
  'High Risk': [['Personal Care', 25], ['Basic Grocery', 25], ['Snacks', 20], ['Beverages', 15], ['Household', 15]],
  'Churned': [['Grocery', 35], ['Snacks', 20], ['Household', 15], ['Dairy', 15], ['Beverages', 15]],
  'New Customers': [['Clothing', 25], ['Beauty', 25], ['Electronics', 20], ['Grocery', 15], ['Snacks', 15]],
  'Low-Value': [['Snacks', 30], ['Basic Grocery', 25], ['Beverages', 20], ['Household', 15], ['Dairy', 10]],
};

// ============ CUSTOMER GENERATION ============

interface Customer {
  customer_id: string;
  customer_segment: string;
  loyalty_tier: string;
  clv_12m: number;
  clv_tier: string;
  churn_prob_90d: number;
  churn_risk_tier: string;
  total_spend: number;
  total_transactions: number;
  avg_basket: number;
  days_since_last_purchase: number;
  preferred_channel: string;
  acquisition_channel: string;
  city: string;
  geography: string;
  top_category: string;
  probability_alive: number;
  purchase_frequency: number;
  recency_days: number;
}

function generateCustomers(): Customer[] {
  const customers: Customer[] = [];

  for (let i = 0; i < TOTAL_CUSTOMERS; i++) {
    const id = `CUST-${String(i).padStart(5, '0')}`;
    const segment = weightedPick(SEGMENTS);
    const city = weightedPick(CITIES);
    const acqChannel = weightedPick(ACQUISITION_CHANNELS);
    const shopChannel = weightedPick(SHOPPING_CHANNELS);

    let clv: number, churnProb: number, totalSpend: number, transactions: number;
    let avgBasket: number, recencyDays: number, loyaltyTier: string;

    switch (segment) {
      case 'High-Value VIP':
        clv = randomBetween(4500, 8000);
        churnProb = randomBetween(0.02, 0.15);
        totalSpend = randomBetween(80000, 200000);
        transactions = randomInt(40, 100);
        avgBasket = randomBetween(2000, 7500);
        recencyDays = randomInt(1, 15);
        loyaltyTier = Math.random() > 0.3 ? 'Platinum' : 'Gold';
        break;
      case 'Loyal Active':
        clv = randomBetween(2000, 4500);
        churnProb = randomBetween(0.05, 0.25);
        totalSpend = randomBetween(40000, 100000);
        transactions = randomInt(20, 60);
        avgBasket = randomBetween(800, 2500);
        recencyDays = randomInt(1, 30);
        loyaltyTier = Math.random() > 0.5 ? 'Gold' : 'Silver';
        break;
      case 'Medium Risk':
        clv = randomBetween(500, 2000);
        churnProb = randomBetween(0.25, 0.50);
        totalSpend = randomBetween(15000, 50000);
        transactions = randomInt(10, 35);
        avgBasket = randomBetween(500, 1200);
        recencyDays = randomInt(30, 75);
        loyaltyTier = Math.random() > 0.5 ? 'Silver' : 'Bronze';
        break;
      case 'High Risk':
        clv = randomBetween(200, 1200);
        churnProb = randomBetween(0.50, 0.75);
        totalSpend = randomBetween(8000, 33000);
        transactions = randomInt(5, 25);
        avgBasket = randomBetween(300, 900);
        recencyDays = randomInt(45, 105);
        loyaltyTier = Math.random() > 0.6 ? 'Bronze' : 'Silver';
        break;
      case 'Churned':
        clv = randomBetween(50, 400);
        churnProb = randomBetween(0.75, 0.95);
        totalSpend = randomBetween(3000, 18000);
        transactions = randomInt(2, 15);
        avgBasket = randomBetween(150, 600);
        recencyDays = randomInt(90, 270);
        loyaltyTier = 'Bronze';
        break;
      case 'New Customers':
        clv = randomBetween(300, 1800);
        churnProb = randomBetween(0.15, 0.35);
        totalSpend = randomBetween(500, 12000);
        transactions = randomInt(1, 6);
        avgBasket = randomBetween(400, 1500);
        recencyDays = randomInt(1, 45);
        loyaltyTier = 'None';
        break;
      case 'Low-Value':
      default:
        clv = randomBetween(50, 500);
        churnProb = randomBetween(0.30, 0.60);
        totalSpend = randomBetween(1000, 10000);
        transactions = randomInt(2, 12);
        avgBasket = randomBetween(80, 400);
        recencyDays = randomInt(20, 120);
        loyaltyTier = 'Bronze';
        break;
    }

    const topCategory = weightedPick(CATEGORY_MAP[segment] || [['Grocery', 100]]);

    // Derive CLV tier from CLV value
    let clvTier: string;
    if (clv >= 4500) clvTier = 'Platinum';
    else if (clv >= 2000) clvTier = 'Gold';
    else if (clv >= 500) clvTier = 'Silver';
    else clvTier = 'Bronze';

    // Derive churn risk tier
    let churnRiskTier: string;
    if (churnProb >= 0.75) churnRiskTier = 'Critical';
    else if (churnProb >= 0.50) churnRiskTier = 'High';
    else if (churnProb >= 0.25) churnRiskTier = 'Medium';
    else churnRiskTier = 'Low';

    customers.push({
      customer_id: id,
      customer_segment: segment,
      loyalty_tier: loyaltyTier,
      clv_12m: Math.round(clv * 100) / 100,
      clv_tier: clvTier,
      churn_prob_90d: Math.round(churnProb * 1000) / 1000,
      churn_risk_tier: churnRiskTier,
      total_spend: Math.round(totalSpend),
      total_transactions: transactions,
      avg_basket: Math.round(avgBasket),
      days_since_last_purchase: recencyDays,
      preferred_channel: shopChannel,
      acquisition_channel: acqChannel,
      city: city,
      geography: city, // Alias for backward compatibility
      top_category: topCategory,
      probability_alive: Math.round((1 - churnProb * 0.8) * 1000) / 1000,
      purchase_frequency: transactions,
      recency_days: recencyDays,
    });
  }

  return customers;
}

// ============ DERIVED DATA GENERATORS ============

function generateKPIs(customers: Customer[]) {
  const totalCustomers = customers.length;
  const avgClv = customers.reduce((sum, c) => sum + c.clv_12m, 0) / totalCustomers;
  const avgChurn = customers.reduce((sum, c) => sum + c.churn_prob_90d, 0) / totalCustomers;
  const activeCustomers = customers.filter(c => c.days_since_last_purchase < 90).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spend, 0);
  const avgBasket = customers.reduce((sum, c) => sum + c.avg_basket, 0) / totalCustomers;

  return {
    total_customers: totalCustomers,
    active_customers: activeCustomers,
    active_rate_pct: Math.round((activeCustomers / totalCustomers) * 1000) / 10,
    avg_clv: Math.round(avgClv),
    total_revenue: Math.round(totalRevenue),
    avg_basket_value: Math.round(avgBasket),
    churn_rate_pct: Math.round(avgChurn * 1000) / 10,
    new_customers_30d: customers.filter(c => c.customer_segment === 'New Customers' && c.days_since_last_purchase <= 30).length,
  };
}

function generateCLVDistribution(customers: Customer[]) {
  const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze'];
  return tiers.map(tier => {
    const tierCustomers = customers.filter(c => c.clv_tier === tier);
    const avgClv = tierCustomers.length > 0
      ? tierCustomers.reduce((sum, c) => sum + c.clv_12m, 0) / tierCustomers.length
      : 0;
    return {
      clv_tier: tier,
      customer_count: tierCustomers.length,
      avg_clv: Math.round(avgClv),
      total_clv: Math.round(tierCustomers.reduce((sum, c) => sum + c.clv_12m, 0)),
    };
  });
}

function generateChurnRisk(customers: Customer[]) {
  const tiers = ['Low', 'Medium', 'High', 'Critical'];
  return tiers.map(tier => {
    const tierCustomers = customers.filter(c => c.churn_risk_tier === tier);
    const avgProb = tierCustomers.length > 0
      ? tierCustomers.reduce((sum, c) => sum + c.churn_prob_90d, 0) / tierCustomers.length
      : 0;
    return {
      churn_risk_tier: tier,
      customer_count: tierCustomers.length,
      avg_prob_30d: Math.round(avgProb * 0.6 * 1000) / 1000,
      avg_prob_60d: Math.round(avgProb * 0.8 * 1000) / 1000,
      avg_prob_90d: Math.round(avgProb * 1000) / 1000,
      total_clv_at_risk: Math.round(tierCustomers.reduce((sum, c) => sum + c.clv_12m, 0)),
    };
  });
}

function generateRFMSample(customers: Customer[]) {
  // Sample 800 customers with good spread across segments
  const segments = Array.from(new Set(customers.map(c => c.customer_segment)));
  const samplesPerSegment = Math.ceil(800 / segments.length);

  const samples: Customer[] = [];
  for (const segment of segments) {
    const segmentCustomers = customers.filter(c => c.customer_segment === segment);
    const shuffled = segmentCustomers.sort(() => Math.random() - 0.5);
    samples.push(...shuffled.slice(0, samplesPerSegment));
  }

  return samples.slice(0, 800).map(c => ({
    customer_id: c.customer_id,
    recency_days: c.recency_days,
    frequency: c.total_transactions,
    monetary: c.clv_12m,
    clv_tier: c.clv_tier,
    customer_segment: c.customer_segment,
    r_score: Math.max(1, 5 - Math.floor(c.recency_days / 30)),
    f_score: Math.min(5, Math.floor(c.total_transactions / 10) + 1),
    m_score: c.clv_tier === 'Platinum' ? 5 : c.clv_tier === 'Gold' ? 4 : c.clv_tier === 'Silver' ? 3 : 2,
  }));
}

function generateBasketDistribution(customers: Customer[]) {
  const ranges = [
    { label: '₹0-200', min: 0, max: 200 },
    { label: '₹200-500', min: 200, max: 500 },
    { label: '₹500-1,000', min: 500, max: 1000 },
    { label: '₹1,000-2,000', min: 1000, max: 2000 },
    { label: '₹2,000-5,000', min: 2000, max: 5000 },
    { label: '₹5,000+', min: 5000, max: Infinity },
  ];

  return ranges.map(range => {
    const rangeCustomers = customers.filter(c => c.avg_basket >= range.min && c.avg_basket < range.max);
    const avgBasket = rangeCustomers.length > 0
      ? rangeCustomers.reduce((sum, c) => sum + c.avg_basket, 0) / rangeCustomers.length
      : 0;
    return {
      basket_range: range.label,
      customer_count: rangeCustomers.length,
      avg_basket: Math.round(avgBasket),
      pct_of_total: Math.round((rangeCustomers.length / customers.length) * 1000) / 10,
    };
  });
}

function generateCategoryBySegment(customers: Customer[]) {
  const segments = Array.from(new Set(customers.map(c => c.customer_segment)));
  const categories = Array.from(new Set(customers.map(c => c.top_category)));

  const result: Array<{segment: string; category: string; customer_count: number; total_spend: number}> = [];

  for (const segment of segments) {
    for (const category of categories) {
      const matching = customers.filter(c => c.customer_segment === segment && c.top_category === category);
      if (matching.length > 0) {
        result.push({
          segment,
          category,
          customer_count: matching.length,
          total_spend: Math.round(matching.reduce((sum, c) => sum + c.total_spend, 0)),
        });
      }
    }
  }

  return result;
}

function generateChannelAnalysis(customers: Customer[]) {
  // Acquisition channel analysis
  const acqChannels = Array.from(new Set(customers.map(c => c.acquisition_channel)));
  const acquisition = acqChannels.map(channel => {
    const channelCustomers = customers.filter(c => c.acquisition_channel === channel);
    return {
      channel,
      customer_count: channelCustomers.length,
      pct_of_total: Math.round((channelCustomers.length / customers.length) * 1000) / 10,
      avg_clv: Math.round(channelCustomers.reduce((sum, c) => sum + c.clv_12m, 0) / channelCustomers.length),
      total_revenue: Math.round(channelCustomers.reduce((sum, c) => sum + c.total_spend, 0)),
    };
  }).sort((a, b) => b.customer_count - a.customer_count);

  // Shopping channel analysis
  const shopChannels = Array.from(new Set(customers.map(c => c.preferred_channel)));
  const shopping = shopChannels.map(channel => {
    const channelCustomers = customers.filter(c => c.preferred_channel === channel);
    return {
      channel,
      customer_count: channelCustomers.length,
      pct_of_total: Math.round((channelCustomers.length / customers.length) * 1000) / 10,
      avg_basket: Math.round(channelCustomers.reduce((sum, c) => sum + c.avg_basket, 0) / channelCustomers.length),
      total_transactions: channelCustomers.reduce((sum, c) => sum + c.total_transactions, 0),
    };
  }).sort((a, b) => b.customer_count - a.customer_count);

  return { acquisition, shopping };
}

function generateAtRiskAlerts(customers: Customer[]) {
  // Top 15 high-value customers at risk of churning
  // Lower thresholds to capture medium-risk customers with good CLV
  const atRisk = customers
    .filter(c => c.clv_12m > 800 && c.churn_prob_90d > 0.25)
    .sort((a, b) => (b.clv_12m * b.churn_prob_90d) - (a.clv_12m * a.churn_prob_90d)) // Sort by potential loss
    .slice(0, 15)
    .map(c => ({
      customer_id: c.customer_id,
      customer_name: `Customer ${c.customer_id.split('-')[1]}`,
      segment: c.customer_segment,
      clv: Math.round(c.clv_12m),
      churn_probability: c.churn_prob_90d,
      days_since_last_order: c.days_since_last_purchase,
      alert_type: c.churn_prob_90d > 0.7 ? 'High' : c.churn_prob_90d > 0.5 ? 'Medium' : 'Low',
      recommended_action: c.churn_prob_90d > 0.7
        ? 'Urgent: Personal outreach with exclusive offer'
        : c.churn_prob_90d > 0.5
        ? 'Send personalized win-back campaign'
        : 'Schedule loyalty program engagement',
      potential_revenue_at_risk: Math.round(c.clv_12m * c.churn_prob_90d),
    }));

  return atRisk;
}

function generateSegmentMigration() {
  return {
    period: "Last Quarter → This Quarter",
    flows: [
      { from: "High-Value VIP", to: "High-Value VIP", count: 2100 },
      { from: "High-Value VIP", to: "Loyal Active", count: 300 },
      { from: "High-Value VIP", to: "Medium Risk", count: 100 },
      { from: "Loyal Active", to: "Loyal Active", count: 5800 },
      { from: "Loyal Active", to: "High-Value VIP", count: 450 },
      { from: "Loyal Active", to: "Medium Risk", count: 900 },
      { from: "Loyal Active", to: "High Risk", count: 350 },
      { from: "Medium Risk", to: "Medium Risk", count: 6500 },
      { from: "Medium Risk", to: "Loyal Active", count: 1200 },
      { from: "Medium Risk", to: "High Risk", count: 1800 },
      { from: "Medium Risk", to: "Churned", count: 500 },
      { from: "High Risk", to: "High Risk", count: 3800 },
      { from: "High Risk", to: "Churned", count: 2200 },
      { from: "High Risk", to: "Medium Risk", count: 1100 },
      { from: "High Risk", to: "Loyal Active", count: 400 },
      { from: "Churned", to: "Churned", count: 3800 },
      { from: "Churned", to: "High Risk", count: 600 },
      { from: "Churned", to: "Medium Risk", count: 400 },
      { from: "Churned", to: "New Customers", count: 200 },
      { from: "New Customers", to: "New Customers", count: 3500 },
      { from: "New Customers", to: "Loyal Active", count: 2000 },
      { from: "New Customers", to: "Medium Risk", count: 1200 },
      { from: "New Customers", to: "Churned", count: 800 },
      { from: "Low-Value", to: "Low-Value", count: 6500 },
      { from: "Low-Value", to: "Medium Risk", count: 1500 },
      { from: "Low-Value", to: "Churned", count: 1200 },
      { from: "Low-Value", to: "Loyal Active", count: 800 },
    ]
  };
}

function generateCohortRetention() {
  const cohorts = [
    { month: '2024-01', customers: 4250, retention: [1.00, 0.68, 0.52, 0.45, 0.41, 0.38] },
    { month: '2024-02', customers: 3890, retention: [1.00, 0.72, 0.55, 0.48, 0.43] },
    { month: '2024-03', customers: 4580, retention: [1.00, 0.65, 0.49, 0.40] },
    { month: '2024-04', customers: 5120, retention: [1.00, 0.70, 0.58] },
    { month: '2024-05', customers: 4800, retention: [1.00, 0.74] },
    { month: '2024-06', customers: 5200, retention: [1.00] },
  ];

  const result: Array<{cohort_month: string; period_number: number; retention_rate: number; original_customers: number}> = [];

  for (const cohort of cohorts) {
    for (let i = 0; i < cohort.retention.length; i++) {
      result.push({
        cohort_month: cohort.month,
        period_number: i,
        retention_rate: cohort.retention[i],
        original_customers: cohort.customers,
      });
    }
  }

  return result;
}

function generateChurnDrivers(customers: Customer[]) {
  // Analyze what drives churn
  const highChurnCustomers = customers.filter(c => c.churn_prob_90d > 0.5);
  const lowChurnCustomers = customers.filter(c => c.churn_prob_90d <= 0.25);

  const drivers = [
    {
      driver: 'Days Since Last Purchase',
      high_churn_avg: Math.round(highChurnCustomers.reduce((sum, c) => sum + c.days_since_last_purchase, 0) / highChurnCustomers.length),
      low_churn_avg: Math.round(lowChurnCustomers.reduce((sum, c) => sum + c.days_since_last_purchase, 0) / lowChurnCustomers.length),
      impact_score: 0.85,
    },
    {
      driver: 'Purchase Frequency',
      high_churn_avg: Math.round(highChurnCustomers.reduce((sum, c) => sum + c.total_transactions, 0) / highChurnCustomers.length),
      low_churn_avg: Math.round(lowChurnCustomers.reduce((sum, c) => sum + c.total_transactions, 0) / lowChurnCustomers.length),
      impact_score: 0.72,
    },
    {
      driver: 'Average Basket Value',
      high_churn_avg: Math.round(highChurnCustomers.reduce((sum, c) => sum + c.avg_basket, 0) / highChurnCustomers.length),
      low_churn_avg: Math.round(lowChurnCustomers.reduce((sum, c) => sum + c.avg_basket, 0) / lowChurnCustomers.length),
      impact_score: 0.65,
    },
    {
      driver: 'CLV Score',
      high_churn_avg: Math.round(highChurnCustomers.reduce((sum, c) => sum + c.clv_12m, 0) / highChurnCustomers.length),
      low_churn_avg: Math.round(lowChurnCustomers.reduce((sum, c) => sum + c.clv_12m, 0) / lowChurnCustomers.length),
      impact_score: 0.58,
    },
  ];

  return drivers;
}

function generateRecencyFrequency(customers: Customer[]) {
  const recencyBuckets = [
    { label: '0-7 days', min: 0, max: 7 },
    { label: '8-30 days', min: 8, max: 30 },
    { label: '31-60 days', min: 31, max: 60 },
    { label: '61-90 days', min: 61, max: 90 },
    { label: '90+ days', min: 91, max: Infinity },
  ];

  const frequencyBuckets = [
    { label: '1-2 orders', min: 1, max: 2 },
    { label: '3-5 orders', min: 3, max: 5 },
    { label: '6-10 orders', min: 6, max: 10 },
    { label: '11-20 orders', min: 11, max: 20 },
    { label: '20+ orders', min: 21, max: Infinity },
  ];

  const result: Array<{recency: string; frequency: string; customer_count: number}> = [];

  for (const r of recencyBuckets) {
    for (const f of frequencyBuckets) {
      const count = customers.filter(c =>
        c.recency_days >= r.min && c.recency_days <= r.max &&
        c.total_transactions >= f.min && c.total_transactions <= f.max
      ).length;

      result.push({
        recency: r.label,
        frequency: f.label,
        customer_count: count,
      });
    }
  }

  return result;
}

function generateRevenueConcentration(customers: Customer[]) {
  // Sort by total spend descending
  const sorted = [...customers].sort((a, b) => b.total_spend - a.total_spend);
  const totalRevenue = sorted.reduce((sum, c) => sum + c.total_spend, 0);

  const percentiles = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  let cumulativeRevenue = 0;

  return percentiles.map(pct => {
    const endIndex = Math.floor((pct / 100) * sorted.length);
    const startIndex = Math.floor(((pct - 10) / 100) * sorted.length);
    const segmentRevenue = sorted.slice(startIndex, endIndex).reduce((sum, c) => sum + c.total_spend, 0);
    cumulativeRevenue += segmentRevenue;

    return {
      percentile: `Top ${pct}%`,
      customer_count: endIndex,
      cumulative_revenue: Math.round(cumulativeRevenue),
      cumulative_pct: Math.round((cumulativeRevenue / totalRevenue) * 1000) / 10,
    };
  });
}

// ============ MAIN ============

function main() {
  console.log('Generating CX360 mock data...\n');

  // Generate master customer table
  console.log(`Generating ${TOTAL_CUSTOMERS.toLocaleString()} customers...`);
  const customers = generateCustomers();

  // Output directory
  const cacheDir = path.join(__dirname, '../cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Write all files
  const files: Record<string, unknown> = {
    'cx360_customer_table.json': customers,
    'cx360_kpis.json': generateKPIs(customers),
    'cx360_clv_distribution.json': generateCLVDistribution(customers),
    'cx360_churn_risk.json': generateChurnRisk(customers),
    'cx360_rfm_sample.json': generateRFMSample(customers),
    'cx360_basket_distribution.json': generateBasketDistribution(customers),
    'cx360_category_by_segment.json': generateCategoryBySegment(customers),
    'cx360_channel_analysis.json': generateChannelAnalysis(customers),
    'cx360_at_risk_alerts.json': generateAtRiskAlerts(customers),
    'cx360_segment_migration.json': generateSegmentMigration(),
    'cx360_cohort_retention.json': generateCohortRetention(),
    'cx360_churn_drivers.json': generateChurnDrivers(customers),
    'cx360_recency_frequency.json': generateRecencyFrequency(customers),
    'cx360_revenue_concentration.json': generateRevenueConcentration(customers),
  };

  for (const [filename, data] of Object.entries(files)) {
    const filepath = path.join(cacheDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`  ✓ ${filename}`);
  }

  // Print distributions
  console.log('\n--- Customer Distribution ---');

  console.log('\nSegments:');
  const segments: Record<string, number> = {};
  customers.forEach(c => { segments[c.customer_segment] = (segments[c.customer_segment] || 0) + 1; });
  Object.entries(segments).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.toLocaleString()} (${((v / TOTAL_CUSTOMERS) * 100).toFixed(1)}%)`);
  });

  console.log('\nCLV Tiers:');
  const clvTiers: Record<string, number> = {};
  customers.forEach(c => { clvTiers[c.clv_tier] = (clvTiers[c.clv_tier] || 0) + 1; });
  Object.entries(clvTiers).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.toLocaleString()} (${((v / TOTAL_CUSTOMERS) * 100).toFixed(1)}%)`);
  });

  console.log('\nChurn Risk Tiers:');
  const churnTiers: Record<string, number> = {};
  customers.forEach(c => { churnTiers[c.churn_risk_tier] = (churnTiers[c.churn_risk_tier] || 0) + 1; });
  Object.entries(churnTiers).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.toLocaleString()} (${((v / TOTAL_CUSTOMERS) * 100).toFixed(1)}%)`);
  });

  console.log('\nCities:');
  const cities: Record<string, number> = {};
  customers.forEach(c => { cities[c.city] = (cities[c.city] || 0) + 1; });
  Object.entries(cities).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.toLocaleString()} (${((v / TOTAL_CUSTOMERS) * 100).toFixed(1)}%)`);
  });

  console.log('\nAcquisition Channels:');
  const acqChannels: Record<string, number> = {};
  customers.forEach(c => { acqChannels[c.acquisition_channel] = (acqChannels[c.acquisition_channel] || 0) + 1; });
  Object.entries(acqChannels).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.toLocaleString()} (${((v / TOTAL_CUSTOMERS) * 100).toFixed(1)}%)`);
  });

  console.log('\n✓ All CX360 mock data generated successfully!');
}

main();
