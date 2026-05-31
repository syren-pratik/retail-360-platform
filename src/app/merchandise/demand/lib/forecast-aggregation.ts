import type {
  MerchDemandForecastPoint,
  MerchDemandSKU,
  MerchDemandStore,
  MerchDemandChannel,
  MerchDemandSKUDrivers,
  MerchDemandDriverContribution,
  MerchDemandFullPayload,
  MerchDemandAnomaly,
  MerchDemandPromo,
  MerchDemandLaunch,
  MerchDemandEvent,
  MerchDemandEventLift,
} from '@/app/lib/merch-demand-types';
import type { MerchFilterState, MerchGeoScope } from '../MerchFilterContext';

// ─── Scope filtering ─────────────────────────────────────────────────────────

export function filterSKUsByScope(
  skus: MerchDemandSKU[],
  state: Pick<MerchFilterState, 'department' | 'category' | 'subcategories' | 'skuSearch'>,
): MerchDemandSKU[] {
  let result = skus;
  if (state.department) result = result.filter(s => s.department === state.department);
  if (state.category) result = result.filter(s => s.category === state.category);
  if (state.subcategories.length > 0) {
    const subSet = new Set(state.subcategories);
    result = result.filter(s => subSet.has(s.subcategory));
  }
  if (state.skuSearch.trim()) {
    const q = state.skuSearch.toLowerCase();
    result = result.filter(
      s => s.product_name.toLowerCase().includes(q) || s.sku_id.toLowerCase().includes(q),
    );
  }
  return result;
}

export function filterStoresByScope(
  stores: MerchDemandStore[],
  geography: MerchGeoScope,
  channel: MerchFilterState['channel'],
): MerchDemandStore[] {
  let result = stores;
  if (geography.scope !== 'all_india' && geography.value != null) {
    switch (geography.scope) {
      case 'region':
        result = result.filter(s => s.region === geography.value);
        break;
      case 'city':
        result = result.filter(s => s.city === geography.value);
        break;
      case 'tier':
        result = result.filter(s => String(s.tier) === geography.value);
        break;
      case 'store':
        result = result.filter(s => s.store_id === geography.value);
        break;
    }
  }
  if (channel !== 'All') {
    const ch = channel as MerchDemandChannel;
    result = result.filter(s => s.channels.includes(ch));
  }
  return result;
}

// ─── Chart data types ─────────────────────────────────────────────────────────

export interface FlatChartPoint {
  date: string;
  is_actual: boolean;
  total: number;
  lower_95: number | null;
  ci_range: number | null;
  [key: string]: unknown;
}

// ─── CI helper ───────────────────────────────────────────────────────────────

function computeCI(pts: MerchDemandForecastPoint[]): { lower_95: number; ci_range: number } {
  let totalForecast = 0;
  let sumRelHalfWidth = 0;
  let ciCount = 0;
  for (const p of pts) {
    const f = p.forecast_units ?? 0;
    totalForecast += f;
    if (f > 0 && p.lower_95 != null && p.upper_95 != null) {
      sumRelHalfWidth += (p.upper_95 - p.lower_95) / 2 / f;
      ciCount++;
    }
  }
  const relHW = ciCount > 0 ? sumRelHalfWidth / ciCount : 0.1;
  return {
    lower_95: Math.max(0, totalForecast * (1 - relHW)),
    ci_range: totalForecast * 2 * relHW,
  };
}

// ─── Aggregation by subcategory ───────────────────────────────────────────────

export interface SubcatAggResult {
  chartData: FlatChartPoint[];
  subcategories: string[];
}

export function aggregateByDateAndSubcategory(
  points: MerchDemandForecastPoint[],
  skuMap: Map<string, MerchDemandSKU>,
  skuIdSet: Set<string>,
  storeIdSet: Set<string>,
): SubcatAggResult {
  const byDate = new Map<string, MerchDemandForecastPoint[]>();
  const subcatSet = new Set<string>();

  for (const p of points) {
    if (!skuIdSet.has(p.sku_id) || !storeIdSet.has(p.store_id)) continue;
    const sku = skuMap.get(p.sku_id);
    if (!sku) continue;
    subcatSet.add(sku.subcategory);
    const arr = byDate.get(p.date);
    if (arr) arr.push(p);
    else byDate.set(p.date, [p]);
  }

  const subcategories = Array.from(subcatSet).sort();
  const sortedDates = Array.from(byDate.keys()).sort();

  const chartData: FlatChartPoint[] = sortedDates.map(date => {
    const pts = byDate.get(date)!;
    const isActual = pts.some(p => p.is_actual);

    const point: FlatChartPoint = {
      date,
      is_actual: isActual,
      total: 0,
      lower_95: null,
      ci_range: null,
    };

    for (const p of pts) {
      const sku = skuMap.get(p.sku_id);
      if (!sku) continue;
      const units = isActual ? (p.actual_units ?? 0) : (p.forecast_units ?? 0);
      point[sku.subcategory] = ((point[sku.subcategory] as number | undefined) ?? 0) + units;
      point.total += units;
    }

    if (!isActual) {
      const ci = computeCI(pts);
      point.lower_95 = ci.lower_95;
      point.ci_range = ci.ci_range;
    }

    return point;
  });

  return { chartData, subcategories };
}

// ─── Aggregation by top SKUs ──────────────────────────────────────────────────

export interface TopSKUAggResult {
  chartData: FlatChartPoint[];
  skuIds: string[];
  skuNames: Record<string, string>;
}

export function aggregateByDateAndTopSKUs(
  points: MerchDemandForecastPoint[],
  skuMap: Map<string, MerchDemandSKU>,
  skuIdSet: Set<string>,
  storeIdSet: Set<string>,
  topN = 5,
): TopSKUAggResult {
  const byDate = new Map<string, MerchDemandForecastPoint[]>();
  const skuForecastTotals = new Map<string, number>();

  for (const p of points) {
    if (!skuIdSet.has(p.sku_id) || !storeIdSet.has(p.store_id)) continue;
    if (!p.is_actual) {
      skuForecastTotals.set(p.sku_id, (skuForecastTotals.get(p.sku_id) ?? 0) + (p.forecast_units ?? 0));
    }
    const arr = byDate.get(p.date);
    if (arr) arr.push(p);
    else byDate.set(p.date, [p]);
  }

  const topSkuIds = Array.from(skuForecastTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([id]) => id);
  const topSkuSet = new Set(topSkuIds);

  const skuNames: Record<string, string> = { Others: 'Others' };
  for (const id of topSkuIds) {
    const sku = skuMap.get(id);
    skuNames[id] = sku ? sku.product_name.substring(0, 20) : id;
  }

  const seriesIds = [...topSkuIds, 'Others'];
  const sortedDates = Array.from(byDate.keys()).sort();

  const chartData: FlatChartPoint[] = sortedDates.map(date => {
    const pts = byDate.get(date)!;
    const isActual = pts.some(p => p.is_actual);

    const point: FlatChartPoint = {
      date,
      is_actual: isActual,
      total: 0,
      lower_95: null,
      ci_range: null,
    };

    for (const p of pts) {
      const units = isActual ? (p.actual_units ?? 0) : (p.forecast_units ?? 0);
      const key = topSkuSet.has(p.sku_id) ? p.sku_id : 'Others';
      point[key] = ((point[key] as number | undefined) ?? 0) + units;
      point.total += units;
    }

    if (!isActual) {
      const ci = computeCI(pts);
      point.lower_95 = ci.lower_95;
      point.ci_range = ci.ci_range;
    }

    return point;
  });

  return { chartData, skuIds: seriesIds, skuNames };
}

// ─── SKU drill panel ──────────────────────────────────────────────────────────

export interface SKURiskBadge {
  label: 'On Track' | 'Under-forecast risk' | 'Over-forecast risk' | 'Anomaly detected';
  variant: 'neutral' | 'warning' | 'negative';
}

export interface TopSKURow {
  sku: MerchDemandSKU;
  sparkline: number[];
  revenue_at_stake: number;
  risk: SKURiskBadge;
}

function computeRiskBadge(pts: MerchDemandForecastPoint[]): SKURiskBadge {
  const actuals = pts.filter(p => p.is_actual && p.actual_units != null && p.forecast_units != null);
  if (actuals.length < 3) return { label: 'On Track', variant: 'neutral' };
  const recent = actuals.slice(-7);
  const sumActual = recent.reduce((s, p) => s + (p.actual_units ?? 0), 0);
  const sumForecast = recent.reduce((s, p) => s + (p.forecast_units ?? 0), 0);
  if (sumForecast === 0) return { label: 'On Track', variant: 'neutral' };
  const ratio = sumActual / sumForecast;
  if (ratio < 0.8) return { label: 'Under-forecast risk', variant: 'warning' };
  if (ratio > 1.2) return { label: 'Over-forecast risk', variant: 'warning' };
  return { label: 'On Track', variant: 'neutral' };
}

export function getTopSKUsInScope(
  points: MerchDemandForecastPoint[],
  skuMap: Map<string, MerchDemandSKU>,
  skuIdSet: Set<string>,
  storeIdSet: Set<string>,
  horizon: number,
  topN = 10,
): TopSKURow[] {
  const bySku = new Map<string, MerchDemandForecastPoint[]>();

  for (const p of points) {
    if (!skuIdSet.has(p.sku_id) || !storeIdSet.has(p.store_id)) continue;
    const arr = bySku.get(p.sku_id);
    if (arr) arr.push(p);
    else bySku.set(p.sku_id, [p]);
  }

  // Determine which dates fall in the forecast horizon
  const allForecastDates = new Set<string>();
  bySku.forEach(pts => pts.forEach(p => { if (!p.is_actual) allForecastDates.add(p.date); }));
  const sortedForecastDates = Array.from(allForecastDates).sort().slice(0, horizon);
  const horizonDateSet = new Set(sortedForecastDates);

  const skuRevenues: { skuId: string; revenue: number }[] = [];
  bySku.forEach((pts, skuId) => {
    const revenue = pts
      .filter(p => !p.is_actual && horizonDateSet.has(p.date))
      .reduce((s, p) => s + p.revenue_inr, 0);
    skuRevenues.push({ skuId, revenue });
  });
  skuRevenues.sort((a, b) => b.revenue - a.revenue);

  return skuRevenues.slice(0, topN).map(({ skuId, revenue }) => {
    const sku = skuMap.get(skuId)!;
    const pts = bySku.get(skuId)!;
    const forecastPts = pts.filter(p => !p.is_actual && horizonDateSet.has(p.date));

    const dayMap = new Map<string, number>();
    for (const p of forecastPts) {
      dayMap.set(p.date, (dayMap.get(p.date) ?? 0) + (p.forecast_units ?? 0));
    }
    const sparkline = sortedForecastDates.map(d => dayMap.get(d) ?? 0);

    return { sku, sparkline, revenue_at_stake: revenue, risk: computeRiskBadge(pts) };
  });
}

// ─── Sprint 3: SKU detail view helpers ───────────────────────────────────────

export interface SKUForecastPoint {
  date: string;
  is_actual: boolean;
  actual_units: number | null;
  forecast_units: number | null;
  lower_95: number | null;
  upper_95: number | null;
  revenue_inr: number;
}

export function getSKUForecastSeries(
  sku: MerchDemandSKU,
  points: MerchDemandForecastPoint[],
  filters: MerchFilterState,
  payload: MerchDemandFullPayload,
): SKUForecastPoint[] {
  const filteredStores = filterStoresByScope(payload.stores, filters.geography, filters.channel);
  const storeSet = new Set(filteredStores.map(s => s.store_id));

  // Group by date, filtering to this SKU + filtered stores
  const byDate = new Map<string, MerchDemandForecastPoint[]>();
  for (const p of points) {
    if (p.sku_id !== sku.sku_id) continue;
    // store_id 'ALL' means aggregate across all stores — bypass store filter
    if (p.store_id !== 'ALL' && !storeSet.has(p.store_id)) continue;
    const arr = byDate.get(p.date);
    if (arr) arr.push(p);
    else byDate.set(p.date, [p]);
  }

  // Determine horizon: take first filters.horizon forecast dates
  const allForecastDates = Array.from(
    new Set(
      Array.from(byDate.entries())
        .filter(([, pts]) => pts.some(p => !p.is_actual))
        .map(([d]) => d)
    )
  ).sort();
  const horizonForecastDates = new Set(allForecastDates.slice(0, filters.horizon));

  const sortedDates = Array.from(byDate.keys()).sort().filter(d => {
    const pts = byDate.get(d)!;
    const isActual = pts.some(p => p.is_actual);
    return isActual || horizonForecastDates.has(d);
  });

  return sortedDates.map(date => {
    const pts = byDate.get(date)!;
    const isActual = pts.some(p => p.is_actual);

    const actualSum = pts.reduce((s, p) => s + (p.actual_units ?? 0), 0);
    const forecastSum = pts.reduce((s, p) => s + (p.forecast_units ?? 0), 0);
    const revenueSum = pts.reduce((s, p) => s + p.revenue_inr, 0);

    let lower_95: number | null = null;
    let upper_95: number | null = null;

    if (!isActual) {
      let sumRelHW = 0, ciCount = 0;
      for (const p of pts) {
        const f = p.forecast_units ?? 0;
        if (f > 0 && p.lower_95 != null && p.upper_95 != null) {
          sumRelHW += (p.upper_95 - p.lower_95) / 2 / f;
          ciCount++;
        }
      }
      const relHW = ciCount > 0 ? sumRelHW / ciCount : 0.1;
      lower_95 = Math.max(0, forecastSum * (1 - relHW));
      upper_95 = forecastSum * (1 + relHW);
    }

    return {
      date,
      is_actual: isActual,
      actual_units: isActual ? actualSum : null,
      forecast_units: !isActual ? forecastSum : null,
      lower_95,
      upper_95,
      revenue_inr: revenueSum,
    };
  });
}

export function getSKUDrivers(
  sku: MerchDemandSKU,
  sku_drivers: MerchDemandSKUDrivers[],
): MerchDemandDriverContribution[] | null {
  const entry = sku_drivers.find(d => d.sku_id === sku.sku_id && d.store_id === 'ALL');
  if (!entry) return null;
  return [...entry.top_drivers].sort(
    (a, b) => Math.abs(b.contribution_pct) - Math.abs(a.contribution_pct),
  );
}

export interface SKUMeta {
  has_anomaly: boolean;
  anomaly: MerchDemandAnomaly | null;
  has_active_promo: boolean;
  promo: MerchDemandPromo | null;
  launch_info: MerchDemandLaunch | null;
  relevant_event: { event: MerchDemandEvent; lift: MerchDemandEventLift } | null;
}

export function getSKUMeta(sku: MerchDemandSKU, payload: MerchDemandFullPayload): SKUMeta {
  const anomaly = payload.anomalies.find(a => a.sku_id === sku.sku_id && a.status === 'open') ?? null;

  const promo = payload.promos.find(
    p => p.status === 'active' && p.sku_ids.includes(sku.sku_id),
  ) ?? null;

  const launch_info = payload.launches.find(l => l.sku_id === sku.sku_id) ?? null;

  const anchor = payload.data_window.forecast_start;
  const anchorDate = new Date(anchor + 'T00:00:00');
  const limit = new Date(anchorDate);
  limit.setDate(limit.getDate() + 30);
  const limitStr = limit.toISOString().slice(0, 10);

  const relevantEventEntry = payload.events
    .filter(e => e.date >= anchor && e.date <= limitStr)
    .map(e => {
      const lift = payload.event_lifts.find(
        l => l.event_id === e.event_id && l.category === sku.category,
      );
      return lift ? { event: e, lift } : null;
    })
    .find(Boolean) ?? null;

  return {
    has_anomaly: !!anomaly,
    anomaly,
    has_active_promo: !!promo,
    promo,
    launch_info,
    relevant_event: relevantEventEntry,
  };
}

// ─── What-if simulator ────────────────────────────────────────────────────────

export interface WhatIfParams {
  price_change_pct: number;
  promo_active: boolean;
  promo_depth_pct: 0 | 10 | 15 | 20 | 25 | 30;
  promo_type: 'Flat %' | 'BOGO' | 'Bundle';
  weather_shock: 'none' | 'heatwave' | 'unseasonal_rain' | 'cold_spell';
}

export const DEFAULT_WHATIF_PARAMS: WhatIfParams = {
  price_change_pct: 0,
  promo_active: false,
  promo_depth_pct: 20,
  promo_type: 'Flat %',
  weather_shock: 'none',
};

export function hasNonDefaultParams(p: WhatIfParams): boolean {
  return p.price_change_pct !== 0 || p.promo_active || p.weather_shock !== 'none';
}

const PRICE_ELASTICITY: Record<'A' | 'B' | 'C', number> = { A: -0.6, B: -1.2, C: -1.8 };
const PROMO_TYPE_MULT: Record<WhatIfParams['promo_type'], number> = {
  'Flat %': 1.0,
  BOGO: 1.15,
  Bundle: 0.9,
};

function weatherFactor(sku: MerchDemandSKU, shock: WhatIfParams['weather_shock']): number {
  if (shock === 'none' || !sku.is_weather_sensitive) return 1.0;
  if (shock === 'heatwave') {
    return ['Beverages', 'Dairy & Frozen'].includes(sku.department) ? 1.5 : 1.0;
  }
  if (shock === 'unseasonal_rain') {
    if (sku.department === 'Beverages') return 0.75;
    if (sku.department === 'Snacks & Biscuits') return 1.2;
    return 1.0;
  }
  if (shock === 'cold_spell') {
    return ['Tea', 'Coffee'].includes(sku.category) ? 1.25 : 1.0;
  }
  return 1.0;
}

export interface WhatIfResult {
  adjustedSeries: Array<SKUForecastPoint & { adjusted_forecast: number | null }>;
  impacts: {
    demand_change_pct: number;
    revenue_change_inr: number;
    margin_change_pp: number;
  };
}

export function computeWhatIfForecast(
  baseSeries: SKUForecastPoint[],
  sku: MerchDemandSKU,
  params: WhatIfParams,
): WhatIfResult {
  const elasticity = PRICE_ELASTICITY[sku.velocity_class];
  const priceFactor = 1 + (params.price_change_pct / 100) * elasticity;

  const promoFactor = params.promo_active
    ? 1 + (params.promo_depth_pct / 100) * 1.8 * PROMO_TYPE_MULT[params.promo_type]
    : 1.0;

  const wFactor = weatherFactor(sku, params.weather_shock);

  const combinedFactor = priceFactor * promoFactor * wFactor;

  let sumOriginal = 0;
  let sumAdjusted = 0;

  const adjustedSeries = baseSeries.map(p => {
    if (p.is_actual || p.forecast_units == null) {
      return { ...p, adjusted_forecast: null };
    }
    const orig = p.forecast_units;
    const adj = Math.max(0, Math.round(orig * combinedFactor));
    sumOriginal += orig;
    sumAdjusted += adj;
    return { ...p, adjusted_forecast: adj };
  });

  const demand_change_pct =
    sumOriginal > 0 ? ((sumAdjusted - sumOriginal) / sumOriginal) * 100 : 0;

  const newPriceInr = sku.price_inr * (1 + params.price_change_pct / 100);
  const newRevenue = sumAdjusted * newPriceInr;
  const oldRevenue = sumOriginal * sku.price_inr;
  const revenue_change_inr = newRevenue - oldRevenue;

  // Margin: cost is fixed; new gross margin adjusts for new price and promo discount
  const costInr = sku.price_inr * (1 - sku.margin_pct / 100);
  const rawNewMargin = newPriceInr > 0
    ? ((newPriceInr - costInr) / newPriceInr) * 100 -
      (params.promo_active ? params.promo_depth_pct : 0)
    : sku.margin_pct;
  const newMarginPct = Math.max(-100, rawNewMargin);
  const margin_change_pp = newMarginPct - sku.margin_pct;

  return { adjustedSeries, impacts: { demand_change_pct, revenue_change_inr, margin_change_pp } };
}
