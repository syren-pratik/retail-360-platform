import type { PriceIntelCore, PriceIntelPrecomputed, PriceIntelSKUDetail } from './price-intel-types';

export async function fetchPriceIntelCore(): Promise<PriceIntelCore> {
  const res = await fetch('/api/price-intel/payload', { cache: 'default' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string })?.error ?? `fetchPriceIntelCore: HTTP ${res.status} ${res.statusText}`,
    );
  }
  return res.json() as Promise<PriceIntelCore>;
}

export async function fetchPriceIntelPrecomputed(): Promise<PriceIntelPrecomputed> {
  const res = await fetch('/api/price-intel/payload?type=precomputed', { cache: 'default' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string })?.error ?? `fetchPriceIntelPrecomputed: HTTP ${res.status} ${res.statusText}`,
    );
  }
  return res.json() as Promise<PriceIntelPrecomputed>;
}

export async function fetchPriceIntelSKUDetail(skuId: string): Promise<PriceIntelSKUDetail> {
  const res = await fetch(
    `/api/price-intel/payload?type=sku&sku_id=${encodeURIComponent(skuId)}`,
    { cache: 'default' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string })?.error ?? `fetchPriceIntelSKUDetail: HTTP ${res.status} ${res.statusText}`,
    );
  }
  return res.json() as Promise<PriceIntelSKUDetail>;
}
