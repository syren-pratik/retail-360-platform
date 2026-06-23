'use client';

import { useState, useEffect } from 'react';
import { fetchPriceIntelCore } from '@/app/lib/price-intel-loader';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import PromoROIExpansion from '../promo-roi/PromoROIExpansion';
import FreeRiderExpansion from '../free-rider/FreeRiderExpansion';
import SellThroughExpansion from '../sell-through/SellThroughExpansion';
import MarginLeakageExpansion from '../margin-leakage/MarginLeakageExpansion';
import ForecastExpansion from '../forecast/ForecastExpansion';

interface Props {
  chartId: string;
}

export default function ChartExpansionShell({ chartId }: Props) {
  const [core, setCore] = useState<PriceIntelCore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPriceIntelCore()
      .then(setCore)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3">
        <div className="animate-spin w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
        <span className="text-sm text-[var(--text-secondary)]">Loading analysis…</span>
      </div>
    );
  }

  if (error || !core) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-sm text-rose-600">
        {error ?? 'Failed to load data. Run: npm run gen:price-intel'}
      </div>
    );
  }

  switch (chartId) {
    case 'promo-roi':      return <PromoROIExpansion core={core} />;
    case 'free-rider':     return <FreeRiderExpansion core={core} />;
    case 'sell-through':   return <SellThroughExpansion core={core} />;
    case 'margin-leakage': return <MarginLeakageExpansion core={core} />;
    case 'forecast':       return <ForecastExpansion core={core} />;
    default:
      return (
        <div className="p-8 text-[var(--text-secondary)]">Chart not found: {chartId}</div>
      );
  }
}
