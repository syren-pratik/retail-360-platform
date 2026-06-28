// Tenant-aware money + locale helpers — single source of truth for "format
// this number as currency for the active tenant". Mirrors merch-format /
// formatUsd APIs so swaps are mechanical.

import { formatLakhsCrores, formatINR } from './merch-format';
import { formatUsd, formatUsdPlain } from './formatUsd';
import { useTenant, type Tenant } from '@/app/context/TenantContext';
import { getRuntimeTenant } from './tenant-runtime';

export type Currency = 'INR' | 'USD';

// ---------------------------------------------------------------------------
// Runtime tenant register lives in `tenant-runtime.ts` (separate module to
// avoid a circular import with TenantContext). TenantProvider syncs it during
// render so SSR HTML and the first client render produce identical money
// strings — eliminating the hydration mismatch that the old document.cookie
// reads caused on every CX360 chart in apparel mode.
// ---------------------------------------------------------------------------

/** Scaled (K / L / Cr / M) money formatter, tenant-aware. */
export function formatMoneyForTenant(n: number | null | undefined, tenant: Tenant): string {
  const v = n ?? 0;
  return tenant === 'us_apparel' ? formatUsd(v) : formatLakhsCrores(v);
}

/** Plain (no scaling, full commas) money formatter, tenant-aware. */
export function formatMoneyPlainForTenant(n: number | null | undefined, tenant: Tenant): string {
  const v = n ?? 0;
  return tenant === 'us_apparel' ? formatUsdPlain(v) : formatINR(v);
}

/** Locale string for `toLocaleString` / `toLocaleDateString` calls. */
export function getLocaleForTenant(tenant: Tenant): string {
  return tenant === 'us_apparel' ? 'en-US' : 'en-IN';
}

/**
 * Auto-tenant formatters — read from the runtime tenant register set by
 * TenantProvider. Safe to call from module-level functions, recharts tick
 * formatters, etc., where hooks aren't available. SSR-safe.
 */
export function formatMoneyAuto(n: number | null | undefined): string {
  return formatMoneyForTenant(n, getRuntimeTenant());
}

export function formatMoneyPlainAuto(n: number | null | undefined): string {
  return formatMoneyPlainForTenant(n, getRuntimeTenant());
}

export function getLocaleAuto(): string {
  return getLocaleForTenant(getRuntimeTenant());
}

/** React hook for client components — auto-tracks tenant changes. */
export function useFormatMoney() {
  const { tenant } = useTenant();
  return (n: number | null | undefined) => formatMoneyForTenant(n, tenant);
}

export function useFormatMoneyPlain() {
  const { tenant } = useTenant();
  return (n: number | null | undefined) => formatMoneyPlainForTenant(n, tenant);
}

export function useLocale() {
  const { tenant } = useTenant();
  return getLocaleForTenant(tenant);
}
