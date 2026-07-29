'use client';

/**
 * Tenant context — switches the demo dataset between India Grocery and US Apparel.
 *
 * SSR-safe via cookie (read on first render), then mirrored to localStorage on
 * client mount so subsequent navigations stay consistent. Cookie is the source
 * of truth on the server; localStorage prevents flicker on client navigation.
 *
 * Default: india_grocery. Apparel pivot is CX360-only — other modules ignore
 * the tenant and always render Indian grocery data.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { setRuntimeTenant } from '@/app/lib/tenant-runtime';
import {
  TENANT_COOKIE as _TENANT_COOKIE,
  TENANT_LS_KEY as _TENANT_LS_KEY,
  DEFAULT_TENANT as _DEFAULT_TENANT,
  type Tenant as _Tenant,
} from '@/app/lib/tenant-constants';

// Re-export the constants/type for callers that still import from this module.
export const TENANT_COOKIE = _TENANT_COOKIE;
export const TENANT_LS_KEY = _TENANT_LS_KEY;
export const DEFAULT_TENANT = _DEFAULT_TENANT;
export type Tenant = _Tenant;

interface TenantContextValue {
  tenant: Tenant;
  setTenant: (next: Tenant) => void;
  isApparel: boolean;
  isGrocery: boolean;
  isRetail: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((c) => c.startsWith(name + '='));
  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  // 365-day expiry; SameSite=Lax so it works on normal nav
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function isValidTenant(v: string | null): v is Tenant {
  return v === 'india_grocery' || v === 'us_apparel' || v === 'us_retail';
}

export function TenantProvider({
  children,
  initialTenant,
}: {
  children: React.ReactNode;
  initialTenant?: Tenant;
}) {
  // Initial value: prefer SSR-provided value, else cookie, else default. Computed
  // synchronously to avoid the first render mismatching the persisted value.
  const [tenant, setTenantState] = useState<Tenant>(() => {
    if (initialTenant) return initialTenant;
    const fromCookie = readCookie(TENANT_COOKIE);
    if (isValidTenant(fromCookie)) return fromCookie;
    return DEFAULT_TENANT;
  });

  // On mount, reconcile localStorage with cookie (cookie wins — it's authoritative).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromCookie = readCookie(TENANT_COOKIE);
    const fromLS = window.localStorage.getItem(TENANT_LS_KEY);
    const winner: Tenant = isValidTenant(fromCookie)
      ? fromCookie
      : isValidTenant(fromLS)
        ? fromLS
        : DEFAULT_TENANT;
    if (winner !== tenant) setTenantState(winner);
    window.localStorage.setItem(TENANT_LS_KEY, winner);
    if (!isValidTenant(fromCookie)) writeCookie(TENANT_COOKIE, winner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTenant = (next: Tenant) => {
    writeCookie(TENANT_COOKIE, next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TENANT_LS_KEY, next);
      // Per spec: full page reload — avoids stale chart data + caches in memory.
      window.location.reload();
    } else {
      setTenantState(next);
    }
  };

  // Sync the module-level register so non-hook formatters (formatMoneyAuto et al.)
  // see the right tenant during render — including SSR. This must happen during
  // render (not in useEffect) so the very first paint matches SSR output.
  setRuntimeTenant(tenant);

  const value: TenantContextValue = {
    tenant,
    setTenant,
    isApparel: tenant === 'us_apparel',
    isGrocery: tenant === 'india_grocery',
    isRetail: tenant === 'us_retail',
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used within TenantProvider');
  return ctx;
}
