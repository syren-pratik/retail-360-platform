import { PriceProductRow } from './price-types';

// Seeded random number generator for deterministic data
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < (seed ?? []).length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return () => {
    hash = Math.sin(hash) * 10000;
    return hash - Math.floor(hash);
  };
}

export interface PriceHistoryPoint {
  month: string;
  our_price: number;
  competitor_price: number;
  cost_price: number;
  margin: number;
}

export interface DemandCurvePoint {
  price: number;
  demand: number;
  revenue: number;
  isOptimal: boolean;
  isCurrent: boolean;
}

export interface PromoHistoryItem {
  promo_id: string;
  date: string;
  type: string;
  discount_pct: number;
  lift_pct: number;
  roi: number;
}

export interface CompetitorPrice {
  competitor: string;
  price: number;
  diff_pct: number;
}

export interface ProductPricingDetail {
  product: PriceProductRow;
  priceHistory: PriceHistoryPoint[];
  demandCurve: DemandCurvePoint[];
  promoHistory: PromoHistoryItem[];
  competitors: CompetitorPrice[];
  aiRecommendation: string;
  dailyDemand: number;
  annualRevenue: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COMPETITORS = ['BigBasket', 'Blinkit', 'Zepto', 'DMart'];
const PROMO_TYPES = ['Flat 10%', 'Flat 15%', 'Flat 20%', 'BOGO', 'Bundle', 'Combo'];

export function generateProductPricingDetail(product: PriceProductRow): ProductPricingDetail {
  const rand = seededRandom(product.product_id);

  // Generate price history (12 months)
  const priceHistory: PriceHistoryPoint[] = [];
  let currentPrice = product.current_price * (0.92 + rand() * 0.08); // Start slightly lower
  let currentCost = product.cost_price * (0.95 + rand() * 0.05);
  let competitorPrice = product.competitor_avg * (0.95 + rand() * 0.1);

  for (let i = 0; i < 12; i++) {
    const monthIndex = (new Date().getMonth() - 11 + i + 12) % 12;

    // Occasional price changes
    if (rand() < 0.15) {
      currentPrice *= (1 + (rand() - 0.5) * 0.1);
    }
    if (rand() < 0.2) {
      currentCost *= (1 + (rand() - 0.3) * 0.08);
    }
    if (rand() < 0.15) {
      competitorPrice *= (1 + (rand() - 0.5) * 0.08);
    }

    // Ensure price is above cost
    currentPrice = Math.max(currentPrice, currentCost * 1.05);

    // Last month should be current values
    if (i === 11) {
      currentPrice = product.current_price;
      currentCost = product.cost_price;
      competitorPrice = product.competitor_avg;
    }

    priceHistory.push({
      month: MONTHS[monthIndex],
      our_price: Math.round(currentPrice * 100) / 100,
      competitor_price: Math.round(competitorPrice * 100) / 100,
      cost_price: Math.round(currentCost * 100) / 100,
      margin: Math.round(((currentPrice - currentCost) / currentPrice) * 1000) / 10,
    });
  }

  // Generate demand curve (price points from cost to MRP)
  const demandCurve: DemandCurvePoint[] = [];
  const baseDemand = 100 + rand() * 400; // Base daily demand
  const elasticity = product.elasticity;
  const priceRange = product.mrp - product.cost_price;
  const priceStep = priceRange / 10;

  let maxRevenue = 0;
  let optimalPriceIndex = 0;

  for (let i = 0; i <= 10; i++) {
    const price = product.cost_price + (priceStep * i);
    const priceChangePct = ((price - product.current_price) / product.current_price) * 100;
    const demandChange = 1 + (elasticity * (priceChangePct / 100));
    const demand = Math.max(0, baseDemand * demandChange);
    const revenue = demand * price;

    if (revenue > maxRevenue) {
      maxRevenue = revenue;
      optimalPriceIndex = i;
    }

    demandCurve.push({
      price: Math.round(price),
      demand: Math.round(demand),
      revenue: Math.round(revenue),
      isOptimal: false,
      isCurrent: Math.abs(price - product.current_price) < priceStep / 2,
    });
  }

  demandCurve[optimalPriceIndex].isOptimal = true;

  // Generate promo history (5-8 past promotions)
  const promoCount = 5 + Math.floor(rand() * 4);
  const promoHistory: PromoHistoryItem[] = [];

  for (let i = 0; i < promoCount; i++) {
    const promoType = PROMO_TYPES[Math.floor(rand() * (PROMO_TYPES ?? []).length)];
    const discountPct = promoType === 'BOGO' ? 50 :
                        (promoType ?? '').includes('%') ? parseInt((promoType ?? '').match(/\d+/)?.[0] || '10') :
                        10 + Math.floor(rand() * 15);

    // Lift is inversely related to elasticity (inelastic = lower lift from discounts)
    const baseLift = Math.abs(elasticity) * discountPct * 2;
    const lift = Math.round((baseLift + (rand() - 0.5) * 20) * 10) / 10;

    // ROI based on lift and discount
    const roi = Math.round(((lift / discountPct) * 0.8 + rand() * 0.4) * 100) / 100;

    const daysAgo = 30 + i * 30 + Math.floor(rand() * 15);
    const promoDate = new Date();
    promoDate.setDate(promoDate.getDate() - daysAgo);

    promoHistory.push({
      promo_id: `PRO-${(product.product_id ?? []).slice(-3)}-${String(i + 1).padStart(2, '0')}`,
      date: promoDate.toISOString().split('T')[0],
      type: promoType,
      discount_pct: discountPct,
      lift_pct: lift,
      roi,
    });
  }

  // Generate competitor prices
  const competitors: CompetitorPrice[] = (COMPETITORS ?? []).slice(0, 3 + Math.floor(rand() * 2)).map(name => {
    const variance = (rand() - 0.5) * 0.2; // ±10% variance
    const price = Math.round(product.competitor_avg * (1 + variance));
    return {
      competitor: name,
      price,
      diff_pct: Math.round(((price - product.current_price) / product.current_price) * 1000) / 10,
    };
  });

  // Calculate daily demand and annual revenue
  const currentDemandIndex = demandCurve.findIndex(d => d.isCurrent);
  const dailyDemand = currentDemandIndex >= 0 ? demandCurve[currentDemandIndex].demand : Math.round(baseDemand);
  const annualRevenue = dailyDemand * product.current_price * 365;

  // Generate AI recommendation
  const priceChangeAmt = product.recommended_price - product.current_price;
  const priceChangePct = ((priceChangeAmt) / product.current_price * 100).toFixed(1);
  const elasticityDesc = Math.abs(elasticity) < 0.5 ? 'highly inelastic' :
                         Math.abs(elasticity) < 1 ? 'inelastic' :
                         Math.abs(elasticity) < 1.5 ? 'elastic' : 'highly elastic';
  const competitivePos = product.competitive_index < 95 ? 'significantly below' :
                         product.competitive_index < 100 ? 'below' :
                         product.competitive_index < 105 ? 'at parity with' :
                         product.competitive_index < 110 ? 'above' : 'significantly above';

  const projectedVolumeLoss = Math.abs(elasticity * parseFloat(priceChangePct)).toFixed(1);
  const revenueImpact = Math.round(dailyDemand * priceChangeAmt * 365 * (1 - Math.abs(elasticity * parseFloat(priceChangePct)) / 100));

  let aiRecommendation = '';

  if (product.recommended_price > product.current_price) {
    aiRecommendation = `${product.product_name} is currently priced ${competitivePos} the competitor average at ₹${product.current_price} vs ₹${product.competitor_avg}. ` +
      `With an elasticity of ${(elasticity ?? 0).toFixed(2)} (${elasticityDesc}), ` +
      `a ₹${Math.abs(priceChangeAmt).toFixed(0)} increase to ₹${product.recommended_price} would reduce volume by only ~${projectedVolumeLoss}% ` +
      `while increasing annual revenue by approximately ₹${(revenueImpact / 100000).toFixed(1)}L. ` +
      `Current margin of ${(product.margin_pct ?? 0).toFixed(1)}% would improve to ${((product.recommended_price - product.cost_price) / product.recommended_price * 100).toFixed(1)}%.`;
  } else if (product.recommended_price < product.current_price) {
    aiRecommendation = `${product.product_name} is priced ${competitivePos} the competitor average. ` +
      `With an elasticity of ${(elasticity ?? 0).toFixed(2)} (${elasticityDesc}), the current premium pricing is costing sales. ` +
      `Reducing price by ₹${Math.abs(priceChangeAmt).toFixed(0)} to ₹${product.recommended_price} should increase volume by ~${Math.abs(elasticity * parseFloat(priceChangePct)).toFixed(1)}%, ` +
      `improving market share while maintaining a healthy margin of ${((product.recommended_price - product.cost_price) / product.recommended_price * 100).toFixed(1)}%.`;
  } else {
    aiRecommendation = `${product.product_name} is optimally priced at ₹${product.current_price}. ` +
      `The current competitive index of ${(product.competitive_index ?? 0).toFixed(1)} and elasticity of ${(elasticity ?? 0).toFixed(2)} (${elasticityDesc}) ` +
      `indicate that any price movement would likely reduce total revenue. ` +
      `Maintain current pricing and monitor competitive moves.`;
  }

  return {
    product,
    priceHistory,
    demandCurve,
    promoHistory,
    competitors,
    aiRecommendation,
    dailyDemand,
    annualRevenue,
  };
}
