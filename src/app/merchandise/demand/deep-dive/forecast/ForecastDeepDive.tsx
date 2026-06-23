'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { BarChart2, MapPin, Layers, AlertCircle, Search, TrendingUp } from 'lucide-react';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import DeepDiveHeader from '../shared/DeepDiveHeader';
import DeepDiveKPIStrip from '../shared/DeepDiveKPIStrip';
import DeepDiveTabs from '../shared/DeepDiveTabs';
import OverviewTab from './tabs/OverviewTab';
import GeographyTab from './tabs/GeographyTab';
import ChannelTab from './tabs/ChannelTab';
import AnomaliesTab from './tabs/AnomaliesTab';
import SKUDetailTab from './tabs/SKUDetailTab';
import YoYTab from './tabs/YoYTab';

const TABS = [
  { id: 'overview',   label: 'Overview',         icon: <BarChart2 size={14} /> },
  { id: 'geography',  label: 'By Geography',     icon: <MapPin size={14} /> },
  { id: 'channel',    label: 'By Channel',       icon: <Layers size={14} /> },
  { id: 'anomalies',  label: 'Anomalies',        icon: <AlertCircle size={14} /> },
  { id: 'sku-detail', label: 'SKU Detail',       icon: <Search size={14} /> },
  { id: 'yoy',        label: 'Year-over-Year',   icon: <TrendingUp size={14} /> },
];

const VALID_TABS = new Set(TABS.map((t) => t.id));

interface Props {
  core: MerchDemandFullPayload;
  precomputed: MerchDemandFullPayload['precomputed'] | null;
}

export default function ForecastDeepDive({ core, precomputed }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') ?? 'overview';
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'overview';

  const [selectedSKUId, setSelectedSKUId] = useState<string | null>(null);

  const handleTabChange = useCallback(
    (tabId: string) => {
      router.push(`?tab=${tabId}`, { scroll: false });
    },
    [router],
  );

  const kpiTiles = [
    {
      label: 'Demand at Risk',
      value: formatLakhsCrores(core.kpis.demand_at_risk_inr),
      trend: { value: 32.0, label: 'vs 4 weeks ago', invertColors: true },
      color: 'negative' as const,
    },
    {
      label: 'Forecast Accuracy',
      value: `${core.kpis.forecast_accuracy_30d_pct}%`,
      trend: { value: 1.4, label: 'vs 4 weeks ago' },
      color: 'positive' as const,
    },
    {
      label: 'Active SKUs',
      value: core.skus.length.toString(),
      subtext: `5 departments · ${core.stores.length} stores`,
    },
    {
      label: 'Next Event',
      value: core.kpis.next_event.event_name,
      subtext: `${core.kpis.next_event.days_until}d away · ${core.kpis.next_event.skus_not_ramped} SKUs not ramped`,
      color: 'warning' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <DeepDiveHeader title="Forecast Explorer" subtitle="Deep Dive" />
      <DeepDiveKPIStrip tiles={kpiTiles} />
      <DeepDiveTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewTab core={core} precomputed={precomputed} />
        )}
        {activeTab === 'geography' && (
          <GeographyTab core={core} />
        )}
        {activeTab === 'channel' && (
          <ChannelTab core={core} precomputed={precomputed} />
        )}
        {activeTab === 'anomalies' && (
          <AnomaliesTab core={core} precomputed={precomputed} />
        )}
        {activeTab === 'sku-detail' && (
          <SKUDetailTab
            core={core}
            selectedSKUId={selectedSKUId}
            onSKUSelect={setSelectedSKUId}
          />
        )}
        {activeTab === 'yoy' && (
          <YoYTab core={core} precomputed={precomputed} />
        )}
      </div>
    </div>
  );
}
