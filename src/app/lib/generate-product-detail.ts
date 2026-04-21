import { SKUForecast } from './demand-types';

export interface StoreDemand {
  store: string;
  city: string;
  region: string;
  forecast: number;
  actual: number;
  confidence: number;
  topFeatures: string[];
}

export interface DailyDemand {
  date: string;
  forecast: number;
  actual: number | null;
  lowerBound: number;
  upperBound: number;
}

export interface HourlyPattern {
  day: string;
  hour: number;
  demand: number;
}

export interface ProductDetail extends SKUForecast {
  category: string;
  subcategory: string;
  avgDailyDemand: number;
  forecastAccuracy: number;
  confidenceScore: number;
  dailyDemand: DailyDemand[];
  storeBreakdown: StoreDemand[];
  hourlyPattern: HourlyPattern[];
  topFeatures: { feature: string; importance: number }[];
  recentEvents: { date: string; event: string; impact: number }[];
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
  { name: 'Mumbai Central', city: 'Mumbai', region: 'West' },
  { name: 'Mumbai Andheri', city: 'Mumbai', region: 'West' },
  { name: 'Delhi Connaught', city: 'Delhi', region: 'North' },
  { name: 'Delhi Saket', city: 'Delhi', region: 'North' },
  { name: 'Bangalore Koramangala', city: 'Bangalore', region: 'South' },
  { name: 'Bangalore Indiranagar', city: 'Bangalore', region: 'South' },
  { name: 'Chennai T.Nagar', city: 'Chennai', region: 'South' },
  { name: 'Hyderabad Jubilee', city: 'Hyderabad', region: 'South' },
  { name: 'Pune FC Road', city: 'Pune', region: 'West' },
  { name: 'Kolkata Park Street', city: 'Kolkata', region: 'East' },
];

const features = [
  'Historical Sales (Lag 7)',
  'Day of Week',
  'Price',
  'Promotion Flag',
  'Month',
  'Festival Flag',
  'Temperature',
  'Store Size',
];

const subcategories: Record<string, string[]> = {
  'Grocery': ['Staples', 'Cooking Essentials', 'Packaged Foods'],
  'Dairy': ['Milk & Cream', 'Butter & Spreads', 'Cheese', 'Yogurt'],
  'Beverages': ['Soft Drinks', 'Juices', 'Water', 'Energy Drinks'],
  'Snacks': ['Chips', 'Namkeen', 'Biscuits', 'Chocolates'],
  'Personal Care': ['Soaps', 'Shampoos', 'Skincare', 'Oral Care'],
  'Household': ['Cleaning', 'Laundry', 'Kitchen'],
  'Frozen Foods': ['Ready to Cook', 'Ice Cream', 'Frozen Snacks'],
  'Bakery': ['Bread', 'Cakes', 'Pastries'],
  'Fresh Produce': ['Fruits', 'Vegetables'],
  'Ready to Eat': ['Instant Meals', 'Canned Foods'],
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function generateProductDetail(product: SKUForecast): ProductDetail {
  const random = seededRandom(product.product_id);

  // Parse numeric values from string fields
  const forecast7d = parseFloat(product.forecast_7d) || 0;
  const stockDays = parseFloat(product.days_of_stock) || 0;

  // Derive trend based on stock risk
  const trend: 'up' | 'down' | 'stable' =
    product.stockout_risk === 'High' ? 'up' :
    product.stockout_risk === 'Low' ? 'down' : 'stable';

  // Determine category and subcategory
  const category = product.department;
  const subcatOptions = subcategories[category] || ['General'];
  const subcategory = subcatOptions[randomBetween(random, 0, subcatOptions.length - 1)];

  // Generate daily demand (60 days history + 14 days forecast)
  const dailyDemand: DailyDemand[] = [];
  const now = new Date();
  const avgDaily = Math.round(forecast7d / 7) || 10;

  // Historical data (60 days)
  for (let i = 60; i >= 1; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const dayOfWeek = date.getDay();
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.25 : 1;
    const variance = randomDecimal(random, 0.7, 1.3);

    const actual = Math.round(avgDaily * weekendMultiplier * variance);
    const forecast = Math.round(actual * randomDecimal(random, 0.9, 1.1));

    dailyDemand.push({
      date: date.toISOString().split('T')[0],
      forecast,
      actual,
      lowerBound: Math.round(forecast * 0.85),
      upperBound: Math.round(forecast * 1.15),
    });
  }

  // Forecast data (14 days)
  for (let i = 0; i < 14; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);

    const dayOfWeek = date.getDay();
    const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.25 : 1;
    const trendMultiplier = trend === 'up' ? 1 + (i * 0.01) : trend === 'down' ? 1 - (i * 0.01) : 1;
    const variance = randomDecimal(random, 0.9, 1.1);

    const forecast = Math.round(avgDaily * weekendMultiplier * trendMultiplier * variance);

    dailyDemand.push({
      date: date.toISOString().split('T')[0],
      forecast,
      actual: null,
      lowerBound: Math.round(forecast * 0.8),
      upperBound: Math.round(forecast * 1.2),
    });
  }

  // Generate store breakdown
  const storeBreakdown: StoreDemand[] = stores.map((store) => {
    const storeForecast = Math.round((forecast7d / stores.length) * randomDecimal(random, 0.6, 1.4));
    const storeActual = Math.round(storeForecast * randomDecimal(random, 0.85, 1.15));
    const confidence = randomDecimal(random, 0.7, 0.98);

    // Pick random top features for this store
    const shuffledFeatures = [...features].sort(() => random() - 0.5);
    const topFeatures = shuffledFeatures.slice(0, 3);

    return {
      store: store.name,
      city: store.city,
      region: store.region,
      forecast: storeForecast,
      actual: storeActual,
      confidence,
      topFeatures,
    };
  });

  // Generate hourly pattern
  const hourlyPattern: HourlyPattern[] = [];
  DAYS.forEach((day) => {
    for (let hour = 6; hour <= 22; hour++) {
      let demand = avgDaily / 17; // Base hourly demand

      // Time of day patterns
      if (hour >= 9 && hour <= 11) demand *= 1.3;  // Morning peak
      if (hour >= 12 && hour <= 13) demand *= 1.5; // Lunch peak
      if (hour >= 18 && hour <= 20) demand *= 1.8; // Evening peak

      // Weekend patterns
      if (day === 'Saturday' || day === 'Sunday') {
        demand *= 1.3;
        if (hour >= 10 && hour <= 14) demand *= 1.2; // Weekend lunch
      }

      hourlyPattern.push({
        day,
        hour,
        demand: Math.round(demand * randomDecimal(random, 0.8, 1.2)),
      });
    }
  });

  // Generate top features
  const topFeatures = features
    .slice(0, 5)
    .map((feature, i) => ({
      feature,
      importance: randomDecimal(random, 0.3 - i * 0.05, 0.4 - i * 0.05),
    }))
    .sort((a, b) => b.importance - a.importance);

  // Generate recent events
  const events = [
    'Price reduction 10%',
    'Competitor stockout',
    'Weekend promotion',
    'Festival season start',
    'New store launch nearby',
    'Weather impact - rain',
    'Holiday period',
  ];

  const recentEvents = [];
  for (let i = 0; i < 3; i++) {
    const daysAgo = randomBetween(random, 1, 14);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    recentEvents.push({
      date: date.toISOString().split('T')[0],
      event: events[randomBetween(random, 0, events.length - 1)],
      impact: randomDecimal(random, -15, 25),
    });
  }

  // Compute derived values for backward compatibility
  const accuracy = product.accuracy ?? randomDecimal(random, 85, 98);

  return {
    ...product,
    // Add computed/derived fields for backward compatibility
    sku: product.product_id,
    name: product.product_name,
    forecast7d,
    stockDays,
    trend,
    accuracy,
    bias: product.bias ?? randomDecimal(random, -5, 5),
    abcClass: product.abcClass ?? (randomDecimal(random, 0, 1) < 0.2 ? 'A' : randomDecimal(random, 0, 1) < 0.5 ? 'B' : 'C'),
    actual7d: product.actual7d ?? Math.round(forecast7d * randomDecimal(random, 0.9, 1.1)),
    category,
    subcategory,
    avgDailyDemand: avgDaily,
    forecastAccuracy: accuracy,
    confidenceScore: randomDecimal(random, 0.7, 0.95),
    dailyDemand,
    storeBreakdown,
    hourlyPattern,
    topFeatures,
    recentEvents,
  };
}
