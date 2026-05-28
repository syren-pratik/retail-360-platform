import type { MerchDemandFullPayload } from './merch-demand-types';

export async function fetchMerchDemandPayload(): Promise<MerchDemandFullPayload> {
  const res = await fetch('/api/merch/demand/payload', { cache: 'default' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body?.error ?? `fetchMerchDemandPayload: HTTP ${res.status} ${res.statusText}`
    );
  }
  return res.json() as Promise<MerchDemandFullPayload>;
}

// Stub — Sprint 4 will implement this for the SKU deep-dive page.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchMerchDemandSKU(_sku_id: string): Promise<never> {
  throw new Error('fetchMerchDemandSKU: not implemented (Sprint 4)');
}

// Stub — Sprint 5 will implement this for the category deep-dive page.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchMerchDemandCategory(_category: string): Promise<never> {
  throw new Error('fetchMerchDemandCategory: not implemented (Sprint 5)');
}
