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
  return (tenant === 'us_apparel' || tenant === 'us_retail') ? formatUsd(v) : formatLakhsCrores(v);
}

/** Plain (no scaling, full commas) money formatter, tenant-aware. */
export function formatMoneyPlainForTenant(n: number | null | undefined, tenant: Tenant): string {
  const v = n ?? 0;
  return (tenant === 'us_apparel' || tenant === 'us_retail') ? formatUsdPlain(v) : formatINR(v);
}

/** Locale string for `toLocaleString` / `toLocaleDateString` calls. */
export function getLocaleForTenant(tenant: Tenant): string {
  return (tenant === 'us_apparel' || tenant === 'us_retail') ? 'en-US' : 'en-IN';
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

/**
 * Format a number that is already in crores (₹Cr) for the grocery tenant.
 * For the apparel tenant, treat the same number as USD millions ($M).
 * Used for the Inventory/Supply cache fields named `*_cr` which carry
 * apparel-USD-millions when tenant=us_apparel.
 */
export function formatCrOrUsdM(n: number | string | null | undefined, tenant: Tenant): string {
  const v = typeof n === 'string' ? Number(n) || 0 : n ?? 0;
  if ((tenant === 'us_apparel' || tenant === 'us_retail')) {
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}B`;
    return `$${v.toFixed(1)}M`;
  }
  if (Math.abs(v) >= 1000) return `₹${(v / 100).toFixed(1)}KCr`;
  return `₹${v.toFixed(1)}Cr`;
}

export function formatCrOrUsdMAuto(n: number | string | null | undefined): string {
  return formatCrOrUsdM(n, getRuntimeTenant());
}

export function useFormatCrOrUsdM() {
  const { tenant } = useTenant();
  return (n: number | string | null | undefined) => formatCrOrUsdM(n, tenant);
}

/**
 * Format a number that is already in lakhs for grocery (₹L), as USD thousands ($K)
 * for apparel. Used for finer-grain cache fields.
 */
export function formatLOrUsdK(n: number | string | null | undefined, tenant: Tenant): string {
  const v = typeof n === 'string' ? Number(n) || 0 : n ?? 0;
  if ((tenant === 'us_apparel' || tenant === 'us_retail')) return `$${v.toFixed(0)}K`;
  return `₹${v.toFixed(1)}L`;
}

export function formatLOrUsdKAuto(n: number | string | null | undefined): string {
  return formatLOrUsdK(n, getRuntimeTenant());
}

/**
 * Convert a "days" value into the tenant's preferred horizon unit.
 * Grocery: "Xd". Apparel: "Yw" (weeks = days/7, rounded).
 */
export function formatDaysOrWeeks(n: number | null | undefined, tenant: Tenant): string {
  const v = n ?? 0;
  if ((tenant === 'us_apparel' || tenant === 'us_retail')) return `${Math.round(v / 7)}w`;
  return `${v.toFixed(0)}d`;
}

export function formatDaysOrWeeksAuto(n: number | null | undefined): string {
  return formatDaysOrWeeks(n, getRuntimeTenant());
}

export function useFormatDaysOrWeeks() {
  const { tenant } = useTenant();
  return (n: number | null | undefined) => formatDaysOrWeeks(n, tenant);
}
