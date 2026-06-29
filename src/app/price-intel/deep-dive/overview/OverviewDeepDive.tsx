'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TrendingDown, Layers, List, Lightbulb } from 'lucide-react';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';
import DeepDiveHeader from '@/app/merchandise/demand/deep-dive/shared/DeepDiveHeader';
import DeepDiveKPIStrip from '@/app/merchandise/demand/deep-dive/shared/DeepDiveKPIStrip';
import DeepDiveTabs from '@/app/merchandise/demand/deep-dive/shared/DeepDiveTabs';
import MarginLeakageTab from './tabs/MarginLeakageTab';
import ChannelTab from './tabs/ChannelTab';
import ActionQueueTab from './tabs/ActionQueueTab';
import IntelligenceTab from './tabs/IntelligenceTab';

const TABS = [
  { id: 'margin-leakage', label: 'Margin Leakage',  icon: <TrendingDown size={14} /> },
  { id: 'channel',        label: 'Channel',          icon: <Layers size={14} /> },
  { id: 'action-queue',   label: 'Action Queue',     icon: <List size={14} /> },
  { id: 'intelligence',   label: 'Intelligence',     icon: <Lightbulb size={14} /> },
];
const VALID = new Set(TABS.map((t) => t.id));

interface Props {
  core: PriceIntelCore;
  onSKUSelect: (skuId: string) => void;
}

export default function OverviewDeepDive({ core, onSKUSelect }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab') ?? 'margin-leakage';
  const activeTab = VALID.has(raw) ? raw : 'margin-leakage';

  const handleTabChange = useCallback(
    (id: string) => router.push(`?tab=${id}`, { scroll: false }),
    [router],
  );

  const lb = core.kpis.margin_leakage_breakdown;

  const kpiTiles = [
    {
      label: 'Total Margin Leakage',
      value: formatMoneyAuto(core.kpis.total_margin_leakage_inr),
      subtext: 'per week',
      color: 'negative' as const,
    },
    {
      label: 'Margin Realization',
      value: `${core.kpis.margin_realization_pct}%`,
      trend: { value: core.kpis.margin_realization_trend, label: 'vs last week' },
      color: core.kpis.margin_realization_trend >= 0 ? 'positive' as const : 'negative' as const,
    },
    {
      label: 'Active Alerts',
      value: String(core.kpis.active_alerts),
      subtext: `${core.action_queue.filter((a) => a.priority === 'urgent').length} urgent`,
      color: 'warning' as const,
    },
    {
      label: 'Free-rider Ratio',
      value: `${core.kpis.free_rider_ratio_pct}%`,
      subtext: `${formatMoneyAuto(lb.promo_free_rider_inr)} waste`,
      color: 'negative' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <DeepDiveHeader
        title="Overview"
        subtitle="Margin leakage, channels & action queue"
        backLabel="← Back to Price Intel"
        backHref="/price-intel"
      />
      <DeepDiveKPIStrip tiles={kpiTiles} />
      <DeepDiveTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="bg-[var(--bg-secondary)]">
        {activeTab === 'margin-leakage' && <MarginLeakageTab core={core} />}
        {activeTab === 'channel'        && <ChannelTab core={core} />}
        {activeTab === 'action-queue'   && <ActionQueueTab core={core} onSKUSelect={onSKUSelect} />}
        {activeTab === 'intelligence'   && <IntelligenceTab core={core} />}
      </div>
    </div>
  );
}
