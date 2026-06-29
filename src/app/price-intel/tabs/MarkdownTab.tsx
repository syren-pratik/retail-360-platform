'use client';

import { useRouter } from 'next/navigation';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatPercent } from '@/app/lib/merch-format';
import MarkdownHeatmap from '../components/MarkdownHeatmap';
import MarkdownQueue from '../components/MarkdownQueue';
import MarkdownCadenceChart from '../components/MarkdownCadenceChart';
import MarkdownSellThrough from '../components/MarkdownSellThrough';
import MarkdownAgingBuckets from '../components/MarkdownAgingBuckets';
import PriceIntelMarkdownCadenceLadder from '../components/PriceIntelMarkdownCadenceLadder';
import PriceIntelSizeColorPriceGrid from '../components/PriceIntelSizeColorPriceGrid';
import { getLocaleAuto } from '@/app/lib/format-money';
import { useTenant } from '@/app/context/TenantContext';

type Persona = 'category_manager' | 'pricing_analyst' | 'vp_commercial';

interface Props {
  core: PriceIntelCore;
  onSKUSelect: (skuId: string) => void;
  persona: Persona;
}

function DeepDiveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-md hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 6V2h4M10 6v4H6M7.5 2H10v2.5M4.5 10H2V7.5" />
      </svg>
      Deep Dive
    </button>
  );
}

export default function MarkdownTab({ core, onSKUSelect, persona }: Props) {
  const router = useRouter();
  const { isApparel } = useTenant();

  const pendingItems = core.markdown_queue.filter((i) => i.status === 'pending');
  const totalUnitsAtRisk = pendingItems.reduce((s, i) => s + i.units_at_risk, 0);
  const minDaysRemaining = pendingItems.length > 0
    ? Math.min(...pendingItems.map((i) => i.days_remaining))
    : 0;

  if (persona === 'vp_commercial') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Markdown Summary</h3>
            <p className="text-xs text-[var(--text-secondary)]">Sell-through health · units at risk</p>
          </div>
          <DeepDiveButton onClick={() => router.push('/price-intel/deep-dive/markdown')} />
        </div>

        {/* 3 summary tiles */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-6">
            <p className="text-xs text-[var(--text-secondary)] mb-2">Overall Sell-Through</p>
            <p className={`text-3xl font-semibold ${core.kpis.sell_through_vs_target >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatPercent(core.kpis.sell_through_pct)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              {core.kpis.sell_through_vs_target > 0 ? '+' : ''}{core.kpis.sell_through_vs_target.toFixed(1)}pp vs target
            </p>
          </div>
          <div className="card p-6">
            <p className="text-xs text-[var(--text-secondary)] mb-2">Units at Risk</p>
            <p className="text-3xl font-semibold text-amber-600">
              {totalUnitsAtRisk.toLocaleString(getLocaleAuto())}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">{pendingItems.length} SKUs pending markdown</p>
          </div>
          <div className="card p-6">
            <p className="text-xs text-[var(--text-secondary)] mb-2">Days to Season Close</p>
            <p className={`text-3xl font-semibold ${minDaysRemaining <= 7 ? 'text-rose-600' : minDaysRemaining <= 14 ? 'text-amber-600' : 'text-[var(--text-primary)]'}`}>
              {minDaysRemaining}d
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Earliest window closes</p>
          </div>
        </div>

        {/* Top 5 markdown candidates */}
        <div>
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Top 5 Markdown Candidates</h4>
          <MarkdownQueue
            items={pendingItems.sort((a, b) => b.urgency_score - a.urgency_score).slice(0, 5)}
            onSKUSelect={onSKUSelect}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isApparel && core.markdown_cadence_ladder && core.size_color_price_grid && (
        <div className="grid grid-cols-2 gap-4">
          <PriceIntelMarkdownCadenceLadder steps={core.markdown_cadence_ladder} />
          <PriceIntelSizeColorPriceGrid grid={core.size_color_price_grid} />
        </div>
      )}

      {/* Sell-through heatmap */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Sell-Through Heatmap</h3>
            <p className="text-xs text-[var(--text-secondary)]">8-week view by category</p>
          </div>
          <DeepDiveButton onClick={() => router.push('/price-intel/deep-dive/markdown')} />
        </div>
        <MarkdownHeatmap rows={core.sell_through_heatmap} />
      </div>

      {/* Queue table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Markdown Queue</h3>
            <p className="text-xs text-[var(--text-secondary)]">Pending decisions sorted by urgency</p>
          </div>
          <DeepDiveButton onClick={() => router.push('/price-intel/deep-dive/markdown')} />
        </div>
        <MarkdownQueue items={core.markdown_queue} onSKUSelect={onSKUSelect} />
      </div>

      {/* Cadence + sell-through + aging */}
      <div className="grid grid-cols-3 gap-4">
        <MarkdownCadenceChart items={core.markdown_queue} />
        <MarkdownSellThrough kpis={core.kpis} trend12w={core.kpis.trend_12w} />
        <MarkdownAgingBuckets aging={core.inventory_aging} />
      </div>
    </div>
  );
}
