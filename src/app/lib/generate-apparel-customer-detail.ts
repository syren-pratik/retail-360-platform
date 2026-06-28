// Apparel-flavored equivalent of generate-customer-detail.ts.
// Same shape (CustomerDetail) — but stores, categories, brands, AI insight copy
// all come from docs/apparel-cx360-spec.md so the per-customer 360 view feels
// like a real US apparel retailer when tenant=us_apparel.

import { CustomerRecord } from './types';
import { CustomerDetail, MonthlySpend, CategorySpend, ChannelSplit, Transaction } from './generate-customer-detail';

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  return function () {
    hash = Math.sin(hash) * 10000;
    return hash - Math.floor(hash);
  };
}

function randBetween(r: () => number, min: number, max: number): number {
  return Math.floor(r() * (max - min + 1)) + min;
}

function randDecimal(r: () => number, min: number, max: number): number {
  return Number((r() * (max - min) + min).toFixed(2));
}

// US apparel stores — abbreviated from docs/apparel-cx360-spec.md §1.12.
const APPAREL_STORES = [
  'Flagship SoHo NYC', 'Standard 5th Ave NYC', 'Outlet Woodbury Common',
  'Standard Brooklyn Atlantic', 'Flagship Newbury St Boston',
  'Standard Prudential Boston', 'Standard King of Prussia',
  'Standard Walnut St Philly', 'Flagship Mag Mile Chicago',
  'Outlet Aurora Premium', 'Standard Mall of America',
  'Flagship Lenox Square Atlanta', 'Standard SouthPark Charlotte',
  'Standard Aventura Mall', 'Standard Galleria Houston',
  'Flagship Galleria Dallas', 'Outlet Allen Premium',
  'Flagship S Congress Austin', 'Flagship Beverly Center LA',
  'Standard Grove LA', 'Outlet Citadel LA',
  'Flagship Union Sq SF', 'Standard Stanford Shopping',
  'Standard Fashion Valley San Diego', 'Standard Scottsdale Fashion Square',
  'Standard Forum Las Vegas', 'Standard Cherry Creek Denver',
  'Flagship University Village Seattle', 'Standard Pioneer Place Portland',
];

// Apparel categories (§1.2). Used to seed top-5 spend when customer record
// lacks a meaningful top_category.
const APPAREL_CATEGORIES = [
  'Crew Tee', 'Polo', 'Denim Jacket', 'Mom Jean', 'Skinny Jean',
  'Blouse', 'Hoodie', 'Sweater', 'Activewear Top', 'Activewear Bottom',
  'Sneaker', 'Boot', 'Sandal', 'Dress Shirt', 'Slim Chino',
];

// Apparel brands (§1.3). Fallback when customer record lacks top_brand.
const APPAREL_BRANDS = [
  'Nike', "Levi's", 'Lululemon', 'Adidas', 'Madewell', 'Gap',
  'Old Navy', 'H&M', 'Zara', 'Banana Republic', 'New Balance', 'Under Armour',
];

const NBA_HINTS_APPAREL = [
  'Send size-curve restock alert (Slim Jean W30 back in stock)',
  'Push BFCM early-access — high-CLV apparel buyer',
  'Offer denim-fit guide; recent return reason was "size wrong"',
  'Cross-sell complementary brand (Lululemon → Vuori) based on affinity score',
  'Trigger color-extension promo: bought Crew Tee Black → push Crew Tee White/Heather',
  'Back-to-School denim bundle — household with kids segment match',
];

const ONLINE_CHANNEL_NAMES = ['App', 'Online', 'Web'];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface ApparelCustomerExtras {
  top_brand?: string;
  return_rate_pct?: number;
}

export function generateApparelCustomerDetail(
  customer: CustomerRecord & ApparelCustomerExtras,
): CustomerDetail {
  const r = seededRandom(customer.customer_id);

  // ── Monthly spend (last 12 months) ──────────────────────────────────────
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const avgMonthlySpend = customer.total_spend / Math.max(customer.total_transactions / 2, 12);

  const monthly_spend: MonthlySpend[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const year = currentMonth - i < 0 ? currentYear - 1 : currentYear;
    const variance = randDecimal(r, 0.6, 1.4);
    monthly_spend.push({
      month: `${months[monthIndex]} ${year.toString().slice(2)}`,
      amount: Math.round(avgMonthlySpend * variance),
    });
  }

  // ── Top 5 categories — anchor on customer.top_category if it's apparel ──
  const cats = [...APPAREL_CATEGORIES].sort(() => r() - 0.5).slice(0, 5);
  const topCat = customer.top_category && customer.top_category !== 'Unknown'
    ? customer.top_category
    : cats[0];
  const idx = cats.indexOf(topCat);
  if (idx > 0) {
    cats.splice(idx, 1);
    cats.unshift(topCat);
  } else if (idx === -1) {
    cats[0] = topCat;
  }

  const category_spend: CategorySpend[] = cats.map((category, i) => {
    const share = i === 0 ? randDecimal(r, 0.35, 0.45)
      : i === 1 ? randDecimal(r, 0.2, 0.25)
      : i === 2 ? randDecimal(r, 0.12, 0.18)
      : i === 3 ? randDecimal(r, 0.08, 0.12)
      : 0.13;
    return { category, amount: Math.round(customer.total_spend * share) };
  });

  // ── Channel split (apparel uses App, Online, In-Store) ─────────────────
  const preferred = customer.preferred_channel || 'In-Store';
  const isDigital = ONLINE_CHANNEL_NAMES.includes(preferred);
  const channel_split: ChannelSplit[] = isDigital
    ? [
        { channel: 'Online', count: Math.round(customer.total_transactions * randDecimal(r, 0.7, 0.85)) },
        { channel: 'In-Store', count: Math.round(customer.total_transactions * randDecimal(r, 0.15, 0.3)) },
      ]
    : preferred === 'In-Store'
    ? [
        { channel: 'In-Store', count: Math.round(customer.total_transactions * randDecimal(r, 0.7, 0.85)) },
        { channel: 'Online', count: Math.round(customer.total_transactions * randDecimal(r, 0.15, 0.3)) },
      ]
    : [
        { channel: 'Online', count: Math.round(customer.total_transactions * randDecimal(r, 0.45, 0.55)) },
        { channel: 'In-Store', count: Math.round(customer.total_transactions * randDecimal(r, 0.45, 0.55)) },
      ];

  // ── Recent transactions ────────────────────────────────────────────────
  const recent_transactions: Transaction[] = [];
  let daysAgo = customer.days_since_last_purchase;
  for (let i = 0; i < 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const isOnline = r() < (isDigital ? 0.75 : preferred === 'In-Store' ? 0.25 : 0.5);
    recent_transactions.push({
      date: d.toISOString().split('T')[0],
      store: isOnline ? 'Online' : APPAREL_STORES[randBetween(r, 0, APPAREL_STORES.length - 1)],
      items: randBetween(r, 1, 5), // apparel baskets are smaller than grocery
      amount: Math.round(customer.avg_basket * randDecimal(r, 0.6, 1.6)),
      channel: isOnline ? 'Online' : 'In-Store',
      had_promo: r() < 0.4, // apparel promos run higher (BFCM/Memorial Day cadence)
    });
    daysAgo += randBetween(r, 10, 35);
  }

  // ── AI insights (apparel framing — brand, return rate, holidays) ───────
  const brand = customer.top_brand || APPAREL_BRANDS[randBetween(r, 0, APPAREL_BRANDS.length - 1)];
  const returnRate = customer.return_rate_pct ?? randDecimal(r, 0.08, 0.32);
  const ai_insights: string[] = [];

  if (customer.clv_tier === 'Platinum' || customer.clv_tier === 'Gold') {
    ai_insights.push(
      `Basket size up ${randBetween(r, 12, 25)}% over the last 3 months. Strong ${brand} loyalty — ${brand} represents ${randBetween(r, 35, 55)}% of basket value.`
    );
  } else if (customer.churn_risk_tier === 'High' || customer.churn_risk_tier === 'Critical') {
    ai_insights.push(
      `Spend has declined ${randBetween(r, 15, 30)}% vs 6 months ago. Last full-price purchase was BFCM — only markdown/clearance since. Consider a win-back offer.`
    );
  } else {
    ai_insights.push(
      `Steady apparel buyer: ${randBetween(r, 2, 4)} orders per quarter, consistent ${topCat} affinity.`
    );
  }

  // Return rate is the apparel-specific signal
  if (returnRate >= 0.25) {
    ai_insights.push(
      `Return rate is ${(returnRate * 100).toFixed(1)}% — above the apparel benchmark of 22%. Top return reason: size wrong. Offer a fit-quiz next session.`
    );
  } else if (returnRate <= 0.12) {
    ai_insights.push(
      `Low return rate (${(returnRate * 100).toFixed(1)}%) — high-confidence shopper. Safe to push premium full-price recommendations.`
    );
  } else {
    ai_insights.push(
      `Return rate (${(returnRate * 100).toFixed(1)}%) is in the apparel norm. Color and fit returns roughly balanced.`
    );
  }

  // Holiday / seasonality
  ai_insights.push(
    `${NBA_HINTS_APPAREL[randBetween(r, 0, NBA_HINTS_APPAREL.length - 1)]}.`
  );

  // ── Predictions ────────────────────────────────────────────────────────
  const probability_alive = customer.churn_risk_tier === 'Critical' ? randDecimal(r, 0.3, 0.5)
    : customer.churn_risk_tier === 'High' ? randDecimal(r, 0.5, 0.7)
    : customer.churn_risk_tier === 'Medium' ? randDecimal(r, 0.7, 0.85)
    : randDecimal(r, 0.85, 0.98);

  const predicted_purchases_12m = Math.round(
    (customer.total_transactions / 12) * probability_alive * randDecimal(r, 0.8, 1.2) * 10
  ) / 10;

  const price_sensitivity: 'Low' | 'Medium' | 'High' =
    customer.customer_segment === 'Style Leader' || customer.customer_segment === 'Fashion Forward' ? 'Low'
    : customer.customer_segment === 'Value Shopper' || customer.customer_segment === 'Markdown Hunter' ? 'High'
    : 'Medium';

  const memberYear = 2020 + randBetween(r, 0, 4);
  const memberMonth = randBetween(r, 0, 11);
  const member_since = `${months[memberMonth]} ${memberYear}`;

  return {
    ...customer,
    monthly_spend,
    category_spend,
    channel_split,
    recent_transactions,
    ai_insights,
    probability_alive,
    predicted_purchases_12m,
    price_sensitivity,
    member_since,
  };
}
