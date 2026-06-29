'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TrendingUp, UserX, BarChart2, Users, Settings } from 'lucide-react';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';
import DeepDiveHeader from '@/app/merchandise/demand/deep-dive/shared/DeepDiveHeader';
import DeepDiveKPIStrip from '@/app/merchandise/demand/deep-dive/shared/DeepDiveKPIStrip';
import DeepDiveTabs from '@/app/merchandise/demand/deep-dive/shared/DeepDiveTabs';
import ROITrendTab from './tabs/ROITrendTab';
import FreeRiderTab from './tabs/FreeRiderTab';
import CampaignsTab from './tabs/CampaignsTab';
import SegmentLiftTab from './tabs/SegmentLiftTab';
import MechanicsTab from './tabs/MechanicsTab';

const TABS = [
  { id: 'roi-trend',     label: 'ROI Trend',      icon: <TrendingUp size={14} /> },
  { id: 'free-rider',    label: 'Free-rider',      icon: <UserX size={14} /> },
  { id: 'campaigns',     label: 'Campaigns',       icon: <BarChart2 size={14} /> },
  { id: 'segment-lift',  label: 'Segment Lift',    icon: <Users size={14} /> },
  { id: 'mechanics',     label: 'Mechanics + TPO', icon: <Settings size={14} /> },
];
const VALID = new Set(TABS.map((t) => t.id));

interface Props {
  core: PriceIntelCore;
  onSKUSelect: (skuId: string) => void;
}

export default function PromoDeepDive({ core, onSKUSelect }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab') ?? 'roi-trend';
  const activeTab = VALID.has(raw) ? raw : 'roi-trend';

  const handleTabChange = useCallback(
    (id: string) => router.push(`?tab=${id}`, { scroll: false }),
    [router],
  );

  const latestROI = core.promo_roi_trend[core.promo_roi_trend.length - 1]?.roi ?? 0;
  const totalIncremental = core.promo_roi_trend.reduce((s, d) => s + d.incremental_revenue_inr, 0);
  const bestMechanic = [...core.mechanic_roi].sort((a, b) => b.roi - a.roi)[0];

  const kpiTiles = [
    {
      label: 'Blended ROI (latest)',
      value: `${latestROI.toFixed(2)}×`,
      subtext: 'vs 3× goal',
      color: latestROI >= 3 ? 'positive' as const : 'warning' as const,
    },
    {
      label: 'Incremental Revenue (14W)',
      value: formatMoneyAuto(totalIncremental),
      color: 'positive' as const,
    },
    {
      label: 'Free-rider Waste',
      value: formatMoneyAuto(core.kpis.margin_leakage_breakdown.promo_free_rider_inr),
      subtext: `${core.kpis.free_rider_ratio_pct}% ratio`,
      color: 'negative' as const,
    },
    {
      label: 'Best Mechanic',
      value: bestMechanic?.mechanic ?? '—',
      subtext: `${bestMechanic?.roi.toFixed(1)}× avg ROI`,
      color: 'positive' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <DeepDiveHeader
        title="Promo Intelligence"
        subtitle="ROI trends, free-rider analysis & campaign deep dives"
        backLabel="← Back to Price Intel"
        backHref="/price-intel"
      />
      <DeepDiveKPIStrip tiles={kpiTiles} />
      <DeepDiveTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="bg-[var(--bg-secondary)]">
        {activeTab === 'roi-trend'    && <ROITrendTab core={core} />}
        {activeTab === 'free-rider'   && <FreeRiderTab core={core} onSKUSelect={onSKUSelect} />}
        {activeTab === 'campaigns'    && <CampaignsTab core={core} />}
        {activeTab === 'segment-lift' && <SegmentLiftTab core={core} />}
        {activeTab === 'mechanics'    && <MechanicsTab core={core} />}
      </div>
    </div>
  );
}
