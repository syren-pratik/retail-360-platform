'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Grid, List, BarChart2, Archive } from 'lucide-react';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import DeepDiveHeader from '@/app/merchandise/demand/deep-dive/shared/DeepDiveHeader';
import DeepDiveKPIStrip from '@/app/merchandise/demand/deep-dive/shared/DeepDiveKPIStrip';
import DeepDiveTabs from '@/app/merchandise/demand/deep-dive/shared/DeepDiveTabs';
import HeatmapTab from './tabs/HeatmapTab';
import QueueTab from './tabs/QueueTab';
import CadenceTab from './tabs/CadenceTab';
import AgingTab from './tabs/AgingTab';
import { getLocaleAuto } from '@/app/lib/format-money';

const TABS = [
  { id: 'heatmap', label: 'Heatmap',  icon: <Grid size={14} /> },
  { id: 'queue',   label: 'Queue',    icon: <List size={14} /> },
  { id: 'cadence', label: 'Cadence',  icon: <BarChart2 size={14} /> },
  { id: 'aging',   label: 'Aging',    icon: <Archive size={14} /> },
];
const VALID = new Set(TABS.map((t) => t.id));

interface Props {
  core: PriceIntelCore;
  onSKUSelect: (skuId: string) => void;
}

export default function MarkdownDeepDive({ core, onSKUSelect }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab') ?? 'heatmap';
  const activeTab = VALID.has(raw) ? raw : 'heatmap';

  const handleTabChange = useCallback(
    (id: string) => router.push(`?tab=${id}`, { scroll: false }),
    [router],
  );

  // Overall sell-through
  const avgST = core.sell_through_heatmap.reduce((sum, row) => {
    const last = row.values[row.values.length - 1] ?? 0;
    return sum + last;
  }, 0) / Math.max(1, core.sell_through_heatmap.length);

  const avgTarget = core.sell_through_heatmap.reduce((sum, row) => sum + row.target_pct, 0) / Math.max(1, core.sell_through_heatmap.length);

  const queueDepthAvg = core.markdown_queue.length > 0
    ? core.markdown_queue.reduce((s, i) => s + Math.abs(i.recommended_depth_pct), 0) / core.markdown_queue.length
    : 0;

  const totalUnitsAtRisk = core.markdown_queue.reduce((s, i) => s + i.units_at_risk, 0);

  const kpiTiles = [
    {
      label: 'Avg Sell-through vs Target',
      value: `${avgST.toFixed(1)}%`,
      subtext: `target ${avgTarget.toFixed(0)}%`,
      color: avgST >= avgTarget ? 'positive' as const : 'negative' as const,
    },
    {
      label: 'Avg Markdown Depth',
      value: `${queueDepthAvg.toFixed(0)}%`,
      subtext: `${core.markdown_queue.length} items in queue`,
      color: 'warning' as const,
    },
    {
      label: 'Units at Clearance Risk',
      value: totalUnitsAtRisk.toLocaleString(getLocaleAuto()),
      color: 'negative' as const,
    },
    {
      label: 'Days to Season Close',
      value: `${core.markdown_queue[0]?.days_remaining ?? '—'}`,
      subtext: 'earliest deadline',
      color: 'warning' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <DeepDiveHeader
        title="Markdown Intelligence"
        subtitle="Sell-through, clearance queue & inventory aging"
        backLabel="← Back to Price Intel"
        backHref="/price-intel"
      />
      <DeepDiveKPIStrip tiles={kpiTiles} />
      <DeepDiveTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="bg-[var(--bg-secondary)]">
        {activeTab === 'heatmap' && <HeatmapTab core={core} />}
        {activeTab === 'queue'   && <QueueTab core={core} />}
        {activeTab === 'cadence' && <CadenceTab core={core} />}
        {activeTab === 'aging'   && <AgingTab core={core} onSKUSelect={onSKUSelect} />}
      </div>
    </div>
  );
}
