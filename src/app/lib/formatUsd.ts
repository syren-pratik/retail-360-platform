// USD formatting utilities — mirrors merch-format.ts API so swaps are mechanical.
// Pure functions, no side effects, no imports.
//
// Examples:
//   formatUsd(1_250_000)       === "$1.3M"
//   formatUsd(340_000)         === "$340K"
//   formatUsd(4_250)           === "$4,250"
//   formatUsd(-1_250_000)      === "-$1.3M"
//   formatUsd(0)               === "$0"
//   formatUsd(undefined)       === "$0"
//   formatUsdCents(42.5)       === "$42.50"
//   formatUsdCents(99.999)     === "$100.00"
//   formatUsdCents(123.45)     === "$123" (>= $100 drops cents)

export interface FormatUsdOptions {
  /** Force a specific scale: 'M', 'K', or 'none' (always plain dollars). */
  scale?: 'M' | 'K' | 'none';
  /** Number of decimals on scaled values (default: 1). */
  decimals?: number;
}

/**
 * Format a USD number with adaptive scale: $1.2M, $340K, $4,250.
 * Mirrors {@link formatLakhsCrores} so swap is mechanical.
 *
 * Examples:
 *   formatUsd(46_960_000) === "$47.0M"
 *   formatUsd(340_000)    === "$340K"
 *   formatUsd(4250)       === "$4,250"
 *   formatUsd(-1200)      === "-$1,200"
 *   formatUsd(0)          === "$0"
 */
export function formatUsd(n: number | null | undefined, opts: FormatUsdOptions = {}): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '$0';
  const decimals = opts.decimals ?? 1;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (opts.scale === 'none') {
    return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
  }
  if (opts.scale === 'M') return `${sign}$${(abs / 1_000_000).toFixed(decimals)}M`;
  if (opts.scale === 'K') return `${sign}$${(abs / 1_000).toFixed(decimals)}K`;

  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(decimals)}M`;
  if (abs >= 1_000)     return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
  return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
}

/**
 * Plain USD with full comma grouping, no scaling: $1,250,000.
 * Equivalent to formatINR for grocery tenant.
 *
 * Examples:
 *   formatUsdPlain(1_250_000) === "$1,250,000"
 *   formatUsdPlain(-42)       === "-$42"
 */
export function formatUsdPlain(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '$0';
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`;
}

/**
 * Preserve cents under $100; drop them above for readability.
 *
 * Examples:
 *   formatUsdCents(42.5)   === "$42.50"
 *   formatUsdCents(0.99)   === "$0.99"
 *   formatUsdCents(123.45) === "$123"
 *   formatUsdCents(-12.5)  === "-$12.50"
 *   formatUsdCents(0)      === "$0.00"
 */
export function formatUsdCents(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '$0.00';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 100) {
    return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
  }
  return `${sign}$${abs.toFixed(2)}`;
}

/**
 * Scaled USD for axes: $1.2M, $340K, $4.3K, $42.
 * Equivalent shape to formatLakhsCrores axis use.
 */
export function formatUsdScaled(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '$0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(decimals)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(decimals)}K`;
  return `${sign}$${Math.round(abs)}`;
}
