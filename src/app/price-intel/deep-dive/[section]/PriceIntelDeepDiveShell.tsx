'use client';

import { useEffect, useState, Suspense } from 'react';
import { fetchPriceIntelCore } from '@/app/lib/price-intel-loader';
import type { PriceIntelCore, PriceIntelSKU } from '@/app/lib/price-intel-types';
import PriceIntelSKUDrawer from '../../components/PriceIntelSKUDrawer';
import OverviewDeepDive from '../overview/OverviewDeepDive';
import PromoDeepDive from '../promo/PromoDeepDive';
import MarkdownDeepDive from '../markdown/MarkdownDeepDive';
import ForecastingDeepDive from '../forecasting/ForecastingDeepDive';

interface Props {
  section: string;
}

const Spinner = (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
    <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
  </div>
);

export default function PriceIntelDeepDiveShell({ section }: Props) {
  const [core, setCore] = useState<PriceIntelCore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSKUId, setSelectedSKUId] = useState<string | null>(null);
  const [selectedSKU, setSelectedSKU] = useState<PriceIntelSKU | null>(null);

  useEffect(() => {
    fetchPriceIntelCore()
      .then((c) => setCore(c))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  function handleSKUSelect(skuId: string) {
    if (!core) return;
    const sku = core.skus.find((s) => s.sku_id === skuId);
    if (!sku) return; // Campaign IDs (CAMP-*) don't map to SKUs
    setSelectedSKUId(skuId);
    setSelectedSKU(sku);
  }

  function handleDrawerClose() {
    setSelectedSKUId(null);
    setSelectedSKU(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-secondary)]">Loading Price Intel…</p>
        </div>
      </div>
    );
  }

  if (error || !core) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)]">
        <div className="card max-w-md w-full text-center p-8">
          <p className="text-sm text-rose-600 mb-3">{error ?? 'Failed to load. Run: npm run gen:price-intel'}</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm">Retry</button>
        </div>
      </div>
    );
  }

  function renderSection() {
    switch (section) {
      case 'overview':
        return (
          <Suspense fallback={Spinner}>
            <OverviewDeepDive core={core!} onSKUSelect={handleSKUSelect} />
          </Suspense>
        );
      case 'promo':
        return (
          <Suspense fallback={Spinner}>
            <PromoDeepDive core={core!} onSKUSelect={handleSKUSelect} />
          </Suspense>
        );
      case 'markdown':
        return (
          <Suspense fallback={Spinner}>
            <MarkdownDeepDive core={core!} onSKUSelect={handleSKUSelect} />
          </Suspense>
        );
      case 'forecasting':
        return (
          <Suspense fallback={Spinner}>
            <ForecastingDeepDive core={core!} onSKUSelect={handleSKUSelect} />
          </Suspense>
        );
      default:
        return (
          <div className="p-12 text-center">
            <p className="text-rose-500 text-sm">Unknown section: <span className="font-mono">{section}</span></p>
          </div>
        );
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: '100vh' }}>
      {/* Main content — shrinks when drawer opens */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {renderSection()}
      </div>

      {/* SKU Detail Drawer */}
      {selectedSKUId && (
        <div
          style={{
            width: 480,
            flexShrink: 0,
            height: '100vh',
            position: 'sticky',
            top: 0,
            overflowY: 'auto',
            background: 'var(--bg-primary)',
            borderLeft: '0.5px solid var(--border-default)',
            zIndex: 20,
          }}
        >
          <PriceIntelSKUDrawer
            skuId={selectedSKUId}
            sku={selectedSKU}
            onClose={handleDrawerClose}
          />
        </div>
      )}
    </div>
  );
}
