import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target: 50,000 customers with realistic distributions

const TOTAL_CUSTOMERS = 50000;

// Segment distribution (should add up to 100%)
const SEGMENTS = [
  { name: 'High-Value (VIP)', pct: 7 },
  { name: 'Low Risk (Active)', pct: 28 },
  { name: 'Medium Risk', pct: 16 },
  { name: 'High Risk (At-Risk)', pct: 12 },
  { name: 'New Customers', pct: 17 },
  { name: 'Churned', pct: 8 },
  { name: 'Low-Value', pct: 12 },
];

// Loyalty tier distribution
const LOYALTY_TIERS = [
  { name: 'Platinum', pct: 5 },
  { name: 'Gold', pct: 12 },
  { name: 'Silver', pct: 23 },
  { name: 'Bronze', pct: 25 },
  { name: 'Non-Member', pct: 35 },
];

// Channel distribution
const CHANNELS = [
  { name: 'Paid Ads (Google/Meta)', pct: 25 },
  { name: 'Organic Search', pct: 19 },
  { name: 'Direct Traffic', pct: 16 },
  { name: 'Referral', pct: 13 },
  { name: 'Email / SMS', pct: 11 },
  { name: 'Marketplace', pct: 9 },
  { name: 'Offline (Store/Event)', pct: 7 },
];

// CLV tier distribution
const CLV_TIERS = [
  { name: 'Platinum', pct: 15 },
  { name: 'Gold', pct: 20 },
  { name: 'Silver', pct: 35 },
  { name: 'Bronze', pct: 30 },
];

// Churn risk distribution
const CHURN_RISK_TIERS = [
  { name: 'Low Risk', pct: 45 },
  { name: 'Medium Risk', pct: 30 },
  { name: 'High Risk', pct: 20 },
  { name: 'Critical', pct: 5 },
];

// Geography distribution
const GEOGRAPHIES = [
  { name: 'Delhi NCR', pct: 18 },
  { name: 'Mumbai', pct: 16 },
  { name: 'Bangalore', pct: 14 },
  { name: 'Chennai', pct: 10 },
  { name: 'Hyderabad', pct: 10 },
  { name: 'Kolkata', pct: 8 },
  { name: 'Pune', pct: 7 },
  { name: 'Ahmedabad', pct: 6 },
  { name: 'Jaipur', pct: 5 },
  { name: 'Lucknow', pct: 3 },
  { name: 'Chandigarh', pct: 2 },
  { name: 'Kochi', pct: 1 },
];

// Top categories
const CATEGORIES = ['Electronics', 'Fashion', 'Grocery', 'Beauty', 'Home & Living', 'Sports', 'Books', 'Toys'];

function weightedRandom<T extends { name: string; pct: number }>(items: T[]): string {
  const total = items.reduce((sum, item) => sum + item.pct, 0);
  let random = Math.random() * total;
  for (const item of items) {
    random -= item.pct;
    if (random <= 0) return item.name;
  }
  return items[items.length - 1].name;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals: number = 2): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

interface Customer {
  customer_id: string;
  customer_segment: string;
  loyalty_tier: string;
  total_spend: string;
  total_transactions: string;
  avg_basket: string;
  days_since_last_purchase: string;
  clv_12m: string;
  clv_tier: string;
  churn_prob_90d: string;
  churn_risk_tier: string;
  preferred_channel: string;
  geography: string;
  top_category: string;
}

function generateCustomers(): Customer[] {
  const customers: Customer[] = [];

  for (let i = 0; i < TOTAL_CUSTOMERS; i++) {
    const segment = weightedRandom(SEGMENTS);
    const loyaltyTier = weightedRandom(LOYALTY_TIERS);
    const channel = weightedRandom(CHANNELS);
    const clvTier = weightedRandom(CLV_TIERS);
    const churnRiskTier = weightedRandom(CHURN_RISK_TIERS);
    const geography = weightedRandom(GEOGRAPHIES);
    const topCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

    // Generate spend based on segment
    let totalSpend: number;
    let avgBasket: number;
    let transactions: number;
    let daysSinceLastPurchase: number;
    let churnProb: number;
    let clv12m: number;

    switch (segment) {
      case 'High-Value (VIP)':
        totalSpend = randomBetween(500000, 2500000);
        avgBasket = randomBetween(2000, 5000);
        transactions = randomBetween(50, 200);
        daysSinceLastPurchase = randomBetween(1, 30);
        churnProb = randomDecimal(0.01, 0.15);
        clv12m = randomBetween(200000, 500000);
        break;
      case 'Low Risk (Active)':
        totalSpend = randomBetween(100000, 500000);
        avgBasket = randomBetween(1000, 2500);
        transactions = randomBetween(20, 80);
        daysSinceLastPurchase = randomBetween(1, 45);
        churnProb = randomDecimal(0.05, 0.25);
        clv12m = randomBetween(80000, 200000);
        break;
      case 'Medium Risk':
        totalSpend = randomBetween(50000, 200000);
        avgBasket = randomBetween(800, 1800);
        transactions = randomBetween(10, 40);
        daysSinceLastPurchase = randomBetween(30, 75);
        churnProb = randomDecimal(0.25, 0.50);
        clv12m = randomBetween(40000, 100000);
        break;
      case 'High Risk (At-Risk)':
        totalSpend = randomBetween(30000, 150000);
        avgBasket = randomBetween(600, 1500);
        transactions = randomBetween(5, 30);
        daysSinceLastPurchase = randomBetween(60, 120);
        churnProb = randomDecimal(0.50, 0.80);
        clv12m = randomBetween(20000, 60000);
        break;
      case 'New Customers':
        totalSpend = randomBetween(5000, 50000);
        avgBasket = randomBetween(500, 1500);
        transactions = randomBetween(1, 10);
        daysSinceLastPurchase = randomBetween(1, 60);
        churnProb = randomDecimal(0.10, 0.40);
        clv12m = randomBetween(10000, 50000);
        break;
      case 'Churned':
        totalSpend = randomBetween(10000, 100000);
        avgBasket = randomBetween(400, 1200);
        transactions = randomBetween(3, 20);
        daysSinceLastPurchase = randomBetween(120, 365);
        churnProb = randomDecimal(0.80, 0.99);
        clv12m = randomBetween(5000, 20000);
        break;
      case 'Low-Value':
      default:
        totalSpend = randomBetween(5000, 30000);
        avgBasket = randomBetween(300, 800);
        transactions = randomBetween(2, 15);
        daysSinceLastPurchase = randomBetween(30, 150);
        churnProb = randomDecimal(0.30, 0.60);
        clv12m = randomBetween(5000, 25000);
        break;
    }

    customers.push({
      customer_id: `CUS-${String(i + 1).padStart(8, '0')}`,
      customer_segment: segment,
      loyalty_tier: loyaltyTier,
      total_spend: totalSpend.toFixed(2),
      total_transactions: transactions.toString(),
      avg_basket: avgBasket.toFixed(2),
      days_since_last_purchase: daysSinceLastPurchase.toString(),
      clv_12m: clv12m.toFixed(2),
      clv_tier: clvTier,
      churn_prob_90d: churnProb.toFixed(4),
      churn_risk_tier: churnRiskTier,
      preferred_channel: channel,
      geography: geography,
      top_category: topCategory,
    });
  }

  return customers;
}

function main() {
  console.log(`Generating ${TOTAL_CUSTOMERS.toLocaleString()} customers...`);
  const customers = generateCustomers();

  const outputPath = path.join(__dirname, '../cache/cx360_customer_table.json');
  fs.writeFileSync(outputPath, JSON.stringify(customers, null, 2));
  console.log(`Written to ${outputPath}`);

  // Verify distribution
  console.log('\nSegment distribution:');
  const segments: Record<string, number> = {};
  customers.forEach(c => { segments[c.customer_segment] = (segments[c.customer_segment] || 0) + 1; });
  Object.entries(segments).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.toLocaleString()} (${((v / TOTAL_CUSTOMERS) * 100).toFixed(1)}%)`);
  });

  console.log('\nLoyalty tier distribution:');
  const tiers: Record<string, number> = {};
  customers.forEach(c => { tiers[c.loyalty_tier] = (tiers[c.loyalty_tier] || 0) + 1; });
  Object.entries(tiers).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.toLocaleString()} (${((v / TOTAL_CUSTOMERS) * 100).toFixed(1)}%)`);
  });

  console.log('\nChannel distribution:');
  const channels: Record<string, number> = {};
  customers.forEach(c => { channels[c.preferred_channel] = (channels[c.preferred_channel] || 0) + 1; });
  Object.entries(channels).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v.toLocaleString()} (${((v / TOTAL_CUSTOMERS) * 100).toFixed(1)}%)`);
  });
}

main();
