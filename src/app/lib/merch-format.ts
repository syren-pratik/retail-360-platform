// Formatting utilities for the Merchandising Demand module.

import { getRuntimeTenant } from './tenant-runtime';
import { getLocaleAuto } from './format-money';

function isRuntimeUSD(): boolean {
  const t = getRuntimeTenant();
  return t === 'us_apparel' || t === 'us_retail';
}

export function formatINR(n: number): string {
  const symbol = isRuntimeUSD() ? '$' : '₹';
  return `${symbol}${Math.round(n).toLocaleString(getLocaleAuto())}`;
}

export function formatLakhsCrores(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (isRuntimeUSD()) {
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  }
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000)    return `${sign}₹${(abs / 100_000).toFixed(1)}L`;
  if (abs >= 1_000)      return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return formatINR(n);
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function formatPercentSigned(n: number, decimals = 1): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

export function formatDate(iso: string, style: 'short' | 'long' = 'short'): string {
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (style === 'long') {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Returns "today", "3d away", "in 2w", "5d ago", "3w ago"
export function formatDaysAway(targetIso: string, anchorIso: string): string {
  const target = new Date(targetIso + (targetIso.length === 10 ? 'T00:00:00' : ''));
  const anchor = new Date(anchorIso + (anchorIso.length === 10 ? 'T00:00:00' : ''));
  const diffMs = target.getTime() - anchor.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (diffDays === 0) return 'today';
  if (diffDays > 0) {
    if (diffDays < 14) return `${diffDays}d away`;
    return `in ${Math.round(diffDays / 7)}w`;
  }
  const absDays = Math.abs(diffDays);
  if (absDays < 14) return `${absDays}d ago`;
  return `${Math.round(absDays / 7)}w ago`;
}
