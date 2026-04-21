import { CustomerRecord } from './types';

export interface MonthlySpend {
  month: string;
  amount: number;
}

export interface CategorySpend {
  category: string;
  amount: number;
}

export interface ChannelSplit {
  channel: string;
  count: number;
}

export interface Transaction {
  date: string;
  store: string;
  items: number;
  amount: number;
  channel: string;
  had_promo: boolean;
}

export interface CustomerDetail extends CustomerRecord {
  monthly_spend: MonthlySpend[];
  category_spend: CategorySpend[];
  channel_split: ChannelSplit[];
  recent_transactions: Transaction[];
  ai_insights: string[];
  probability_alive: number;
  predicted_purchases_12m: number;
  price_sensitivity: 'Low' | 'Medium' | 'High';
  member_since: string;
}

// Seeded random number generator for deterministic results
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return function() {
    hash = Math.sin(hash) * 10000;
    return hash - Math.floor(hash);
  };
}

function randomBetween(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function randomDecimal(random: () => number, min: number, max: number): number {
  return Number((random() * (max - min) + min).toFixed(2));
}

const stores = [
  'Mumbai-Central', 'Mumbai-Andheri', 'Mumbai-Bandra',
  'Bangalore-Koramangala', 'Bangalore-Indiranagar',
  'Delhi-Connaught', 'Delhi-Saket',
  'Chennai-T.Nagar', 'Hyderabad-Jubilee',
  'Pune-FC Road', 'Kolkata-Park Street'
];

const categories = [
  'Electronics', 'Fashion', 'Grocery', 'Beauty',
  'Home & Living', 'Sports', 'Books', 'Toys'
];

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function generateCustomerDetail(customer: CustomerRecord): CustomerDetail {
  const random = seededRandom(customer.customer_id);

  // Generate monthly spend (last 12 months)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const avgMonthlySpend = customer.total_spend / Math.max(customer.total_transactions / 2, 12);

  const monthly_spend: MonthlySpend[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const year = currentMonth - i < 0 ? currentYear - 1 : currentYear;
    const variance = randomDecimal(random, 0.6, 1.4);
    monthly_spend.push({
      month: `${months[monthIndex]} ${year.toString().slice(2)}`,
      amount: Math.round(avgMonthlySpend * variance),
    });
  }

  // Generate category spend (top 5 categories)
  const shuffledCategories = [...categories].sort(() => random() - 0.5);
  const topCategories = shuffledCategories.slice(0, 5);
  // Ensure top_category is first
  const topCatIndex = topCategories.indexOf(customer.top_category);
  if (topCatIndex > 0) {
    topCategories.splice(topCatIndex, 1);
    topCategories.unshift(customer.top_category);
  } else if (topCatIndex === -1) {
    topCategories[0] = customer.top_category;
  }

  const category_spend: CategorySpend[] = topCategories.map((category, index) => {
    const share = index === 0 ? randomDecimal(random, 0.35, 0.45) :
                  index === 1 ? randomDecimal(random, 0.2, 0.25) :
                  index === 2 ? randomDecimal(random, 0.12, 0.18) :
                  index === 3 ? randomDecimal(random, 0.08, 0.12) :
                  1 - (0.4 + 0.22 + 0.15 + 0.1); // remainder
    const amount = Math.round(customer.total_spend * share);
    return { category, amount };
  });

  // Generate channel split
  const channel_split: ChannelSplit[] = [];
  if (customer.preferred_channel === 'Online') {
    channel_split.push(
      { channel: 'Online', count: Math.round(customer.total_transactions * randomDecimal(random, 0.7, 0.85)) },
      { channel: 'In-Store', count: Math.round(customer.total_transactions * randomDecimal(random, 0.15, 0.3)) }
    );
  } else if (customer.preferred_channel === 'In-Store') {
    channel_split.push(
      { channel: 'In-Store', count: Math.round(customer.total_transactions * randomDecimal(random, 0.7, 0.85)) },
      { channel: 'Online', count: Math.round(customer.total_transactions * randomDecimal(random, 0.15, 0.3)) }
    );
  } else {
    channel_split.push(
      { channel: 'Online', count: Math.round(customer.total_transactions * randomDecimal(random, 0.45, 0.55)) },
      { channel: 'In-Store', count: Math.round(customer.total_transactions * randomDecimal(random, 0.45, 0.55)) }
    );
  }

  // Generate recent transactions (last 10)
  const recent_transactions: Transaction[] = [];
  let daysAgo = customer.days_since_last_purchase;
  for (let i = 0; i < 10; i++) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const isOnline = random() < (customer.preferred_channel === 'Online' ? 0.75 :
                                  customer.preferred_channel === 'In-Store' ? 0.25 : 0.5);

    recent_transactions.push({
      date: date.toISOString().split('T')[0],
      store: isOnline ? 'Online' : stores[randomBetween(random, 0, stores.length - 1)],
      items: randomBetween(random, 2, 15),
      amount: Math.round(customer.avg_basket * randomDecimal(random, 0.6, 1.5)),
      channel: isOnline ? 'Online' : 'In-Store',
      had_promo: random() < 0.35,
    });

    daysAgo += randomBetween(random, 7, 30);
  }

  // Generate AI insights based on customer profile
  const ai_insights: string[] = [];

  // CLV-based insight
  if (customer.clv_tier === 'Platinum' || customer.clv_tier === 'Gold') {
    ai_insights.push(
      `This customer's basket value has increased ${randomBetween(random, 12, 25)}% over the last 3 months, indicating growing engagement.`
    );
  } else if (customer.clv_tier === 'At-Risk') {
    ai_insights.push(
      `Average order value has declined ${randomBetween(random, 15, 30)}% compared to 6 months ago. Consider personalized win-back offers.`
    );
  } else {
    ai_insights.push(
      `Consistent purchasing pattern with ${randomBetween(random, 2, 4)} orders per month on average.`
    );
  }

  // Churn-based insight
  if (customer.churn_risk_tier === 'Critical' || customer.churn_risk_tier === 'High') {
    ai_insights.push(
      `Purchase frequency has declined significantly. Last ${randomBetween(random, 2, 4)} orders were smaller than historical average.`
    );
  } else if (customer.churn_risk_tier === 'Low') {
    ai_insights.push(
      `Strong loyalty signals: responds well to new product launches and seasonal campaigns.`
    );
  } else {
    ai_insights.push(
      `Moderate engagement level. Personalized recommendations could increase purchase frequency.`
    );
  }

  // Category/behavior insight
  const secondaryCategory = topCategories[1];
  if (customer.preferred_channel === 'Both') {
    ai_insights.push(
      `Omnichannel shopper who browses online but prefers in-store pickup. ${randomBetween(random, 40, 60)}% of orders use click-and-collect.`
    );
  } else if (customer.total_transactions > 50) {
    ai_insights.push(
      `Shifting interest from ${customer.top_category} to ${secondaryCategory}. Consider cross-category recommendations.`
    );
  } else {
    ai_insights.push(
      `Responds well to bundle offers — ${randomBetween(random, 2, 4)} of last 5 purchases used promotional bundles.`
    );
  }

  // Calculate probability alive and predictions
  const probability_alive = customer.churn_risk_tier === 'Critical' ? randomDecimal(random, 0.3, 0.5) :
                            customer.churn_risk_tier === 'High' ? randomDecimal(random, 0.5, 0.7) :
                            customer.churn_risk_tier === 'Medium' ? randomDecimal(random, 0.7, 0.85) :
                            randomDecimal(random, 0.85, 0.98);

  const predicted_purchases_12m = Math.round(
    (customer.total_transactions / 12) * probability_alive * randomDecimal(random, 0.8, 1.2) * 10
  ) / 10;

  // Price sensitivity based on avg basket and segment
  const price_sensitivity: 'Low' | 'Medium' | 'High' =
    customer.customer_segment === 'Premium' ? 'Low' :
    customer.customer_segment === 'Loyal' ? (random() < 0.7 ? 'Low' : 'Medium') :
    customer.customer_segment === 'Occasional' ? (random() < 0.7 ? 'High' : 'Medium') :
    'Medium';

  // Member since date (deterministic based on customer_id)
  const memberYear = 2020 + randomBetween(random, 0, 4);
  const memberMonth = randomBetween(random, 0, 11);
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
