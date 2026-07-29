'use client';

import { useRouter } from 'next/navigation';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';
import PriceIntelActionQueue from '../components/PriceIntelActionQueue';
import PriceIntelLiveActivity from '../components/PriceIntelLiveActivity';
import PriceIntelMarginWaterfall from '../components/PriceIntelMarginWaterfall';
import PriceIntelChannelChart from '../components/PriceIntelChannelChart';
import PriceIntelMarkdownCadenceLadder from '../components/PriceIntelMarkdownCadenceLadder';
import PriceIntelBrandVsPLGap from '../components/PriceIntelBrandVsPLGap';
import PriceIntelReturnsMarginOverlay from '../components/PriceIntelReturnsMarginOverlay';
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

export default function OverviewTab({ core, onSKUSelect, persona }: Props) {
  const router = useRouter();
  const { isApparel, isRetail } = useTenant();

  if (persona === 'vp_commercial') {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Executive Summary</h3>
            <p className="text-xs text-[var(--text-secondary)]">Top-line pricing performance</p>
          </div>
          <DeepDiveButton onClick={() => router.push('/price-intel/deep-dive/overview')} />
        </div>
        <div className="grid grid-cols-4 gap-4 mt-6">
          {[
            {
              label: 'Margin Leakage',
              value: formatMoneyAuto(core.kpis.total_margin_leakage_inr),
              color: 'text-rose-600',
              sub: 'this week',
            },
            {
              label: 'Margin Realization',
              value: `${core.kpis.margin_realization_pct.toFixed(1)}%`,
              color: core.kpis.margin_realization_pct > 80 ? 'text-emerald-600' : 'text-rose-600',
              sub: `${core.kpis.margin_realization_trend > 0 ? '+' : ''}${core.kpis.margin_realization_trend.toFixed(1)}pp vs last week`,
            },
            {
              label: 'Active Alerts',
              value: String(core.kpis.active_alerts),
              color: 'text-amber-600',
              sub: `${core.action_queue.filter((i) => i.priority === 'urgent').length} urgent`,
            },
            {
              label: 'Sell-Through',
              value: `${core.kpis.sell_through_pct.toFixed(1)}%`,
              color: core.kpis.sell_through_vs_target >= 0 ? 'text-emerald-600' : 'text-rose-600',
              sub: `${core.kpis.sell_through_vs_target > 0 ? '+' : ''}${core.kpis.sell_through_vs_target.toFixed(1)}pp vs target`,
            },
          ].map((tile) => (
            <div key={tile.label} className="card p-6">
              <p className="text-xs text-[var(--text-secondary)] mb-2">{tile.label}</p>
              <p className={`text-3xl font-semibold ${tile.color}`}>{tile.value}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">{tile.sub}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action queue + live activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Action Queue & Live Activity</h3>
            <p className="text-xs text-[var(--text-secondary)]">Pending decisions · real-time signals</p>
          </div>
          <DeepDiveButton onClick={() => router.push('/price-intel/deep-dive/overview')} />
        </div>
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: persona === 'pricing_analyst' ? '1fr' : '1fr 1fr',
            minHeight: 320,
          }}
        >
          <PriceIntelActionQueue items={core.action_queue} onSKUSelect={onSKUSelect} />
          {persona !== 'pricing_analyst' && (
            <PriceIntelLiveActivity items={core.live_activity} />
          )}
        </div>
      </div>

      {/* Margin waterfall + channel performance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Margin & Channel Analysis</h3>
            <p className="text-xs text-[var(--text-secondary)]">Waterfall breakdown · channel revenue lift</p>
          </div>
          <DeepDiveButton onClick={() => router.push('/price-intel/deep-dive/overview')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <PriceIntelMarginWaterfall bars={core.margin_waterfall} />
          <PriceIntelChannelChart channels={core.channel_performance} />
        </div>
      </div>

      {/* Pricing analyst: also show live activity below */}
      {persona === 'pricing_analyst' && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Live Activity</h3>
          <PriceIntelLiveActivity items={core.live_activity} />
        </div>
      )}

      {isApparel && core.markdown_cadence_ladder && core.brand_vs_pl_gap && core.returns_margin_overlay && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Apparel Lifecycle & Brand Mix</h3>
              <p className="text-xs text-[var(--text-secondary)]">Markdown ladder · brand vs PL · returns-adjusted margin</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <PriceIntelMarkdownCadenceLadder steps={core.markdown_cadence_ladder} />
            <PriceIntelBrandVsPLGap rows={core.brand_vs_pl_gap} />
          </div>
          <div className="mt-4">
            <PriceIntelReturnsMarginOverlay overlay={core.returns_margin_overlay} />
          </div>
        </div>
      )}
    </div>
  );
}
