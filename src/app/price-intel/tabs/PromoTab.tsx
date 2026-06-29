'use client';

import { useRouter } from 'next/navigation';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';
import PromoROITrend from '../components/PromoROITrend';
import PromoMechanicROI from '../components/PromoMechanicROI';
import PromoAISuggestions from '../components/PromoAISuggestions';
import PromoCampaignsTable from '../components/PromoCampaignsTable';
import PromoSegmentLift from '../components/PromoSegmentLift';

type Persona = 'category_manager' | 'pricing_analyst' | 'vp_commercial';

interface Props {
  core: PriceIntelCore;
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

export default function PromoTab({ core, persona }: Props) {
  const router = useRouter();

  if (persona === 'vp_commercial') {
    const top3 = [...core.campaigns].sort((a, b) => b.roi - a.roi).slice(0, 3);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Promo Performance</h3>
            <p className="text-xs text-[var(--text-secondary)]">ROI trend · top campaigns</p>
          </div>
          <DeepDiveButton onClick={() => router.push('/price-intel/deep-dive/promo')} />
        </div>
        <PromoROITrend trend={core.promo_roi_trend} />
        <div className="card p-4">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Top 3 Campaigns by ROI</h4>
          <div className="space-y-3">
            {top3.map((c, i) => (
              <div key={c.campaign_id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-[var(--text-tertiary)] w-5 shrink-0">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">{c.campaign_name}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{c.department} · {c.mechanic}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-emerald-600">{c.roi.toFixed(2)}×</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{formatMoneyAuto(c.incremental_revenue_inr)} incr.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ROI trend + mechanic ROI */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">ROI Trends & Mechanic Analysis</h3>
            <p className="text-xs text-[var(--text-secondary)]">14-week rolling · mechanic effectiveness</p>
          </div>
          <DeepDiveButton onClick={() => router.push('/price-intel/deep-dive/promo')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <PromoROITrend trend={core.promo_roi_trend} />
          <PromoMechanicROI mechanics={core.mechanic_roi} />
        </div>
      </div>

      {/* AI suggestions */}
      <PromoAISuggestions suggestions={core.ai_suggestions} />

      {/* Pricing analyst: confidence scores section */}
      {persona === 'pricing_analyst' && (
        <div className="card p-4">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">Model Confidence Scores</h4>
          <div className="space-y-2">
            {core.ai_suggestions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-primary)] flex-1 truncate">{s.campaign_name} — {s.sku_or_category}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-24 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${s.confidence * 100}%`,
                        background: s.confidence >= 0.8 ? '#10B981' : s.confidence >= 0.6 ? '#F59E0B' : '#F43F5E',
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-[var(--text-secondary)] w-8">{(s.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaigns table + segment lift */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Campaigns & Segment Lift</h3>
            <p className="text-xs text-[var(--text-secondary)]">All campaigns · lift by customer segment</p>
          </div>
          <DeepDiveButton onClick={() => router.push('/price-intel/deep-dive/promo')} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <PromoCampaignsTable campaigns={core.campaigns} />
          </div>
          <PromoSegmentLift segments={core.lift_by_segment} />
        </div>
      </div>
    </div>
  );
}
