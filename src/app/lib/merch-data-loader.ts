import type { MerchDemandFullPayload } from './merch-demand-types';

export async function fetchMerchDemandPayload(): Promise<MerchDemandFullPayload> {
  const res = await fetch('/api/merch/demand/payload', { cache: 'default' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `fetchMerchDemandPayload: HTTP ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<MerchDemandFullPayload>;
}

export interface MerchSKUDetailPoint {
  date: string;
  is_actual: boolean;
  actual_units: number | null;
  forecast_units: number;
  lower_95: number;
  upper_95: number;
  revenue_inr: number;
}

export interface MerchSKUDetailData {
  sku_id: string;
  product_name: string;
  series: MerchSKUDetailPoint[];
}

export async function fetchMerchDemandSKU(skuId: string): Promise<MerchSKUDetailData> {
  const res = await fetch(`/api/merch/demand/payload?type=sku&sku_id=${encodeURIComponent(skuId)}`, { cache: 'default' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `fetchMerchDemandSKU: HTTP ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<MerchSKUDetailData>;
}
