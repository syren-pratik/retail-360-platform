'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TrendingUp, GitBranch, Calendar } from 'lucide-react';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';
import DeepDiveHeader from '@/app/merchandise/demand/deep-dive/shared/DeepDiveHeader';
import DeepDiveKPIStrip from '@/app/merchandise/demand/deep-dive/shared/DeepDiveKPIStrip';
import DeepDiveTabs from '@/app/merchandise/demand/deep-dive/shared/DeepDiveTabs';
import ForecastTab from './tabs/ForecastTab';
import ScenariosTab from './tabs/ScenariosTab';
import CalendarTab from './tabs/CalendarTab';

const TABS = [
  { id: 'forecast',  label: '14W Forecast', icon: <TrendingUp size={14} /> },
  { id: 'scenarios', label: 'Scenarios',    icon: <GitBranch size={14} /> },
  { id: 'calendar',  label: 'Calendar',     icon: <Calendar size={14} /> },
];
const VALID = new Set(TABS.map((t) => t.id));

interface Props {
  core: PriceIntelCore;
  onSKUSelect: (skuId: string) => void;
}

export default function ForecastingDeepDive({ core }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get('tab') ?? 'forecast';
  const activeTab = VALID.has(raw) ? raw : 'forecast';

  const handleTabChange = useCallback(
    (id: string) => router.push(`?tab=${id}`, { scroll: false }),
    [router],
  );

  const totalRevenue = core.forecast_14w.reduce((s, d) => s + d.forecast_revenue_inr, 0);
  const totalMargin  = core.forecast_14w.reduce((s, d) => s + d.forecast_margin_inr, 0);
  const avgCI = core.forecast_14w.reduce((s, d) => s + (d.upper_ci_inr - d.lower_ci_inr), 0) / Math.max(1, core.forecast_14w.length);
  const avgCIPct = (avgCI / (totalRevenue / core.forecast_14w.length) * 100).toFixed(1);

  const kpiTiles = [
    {
      label: '14W Projected Revenue',
      value: formatMoneyAuto(totalRevenue),
      color: 'positive' as const,
    },
    {
      label: '14W Projected Margin',
      value: formatMoneyAuto(totalMargin),
      subtext: `${((totalMargin / totalRevenue) * 100).toFixed(1)}% margin`,
      color: 'positive' as const,
    },
    {
      label: 'Forecast Confidence',
      value: `±${avgCIPct}%`,
      subtext: 'avg CI width',
      color: 'default' as const,
    },
    {
      label: 'Active Campaigns',
      value: String(core.campaigns.filter((c) => c.status === 'live').length),
      subtext: `of ${core.campaigns.length} total`,
      color: 'default' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <DeepDiveHeader
        title="Forecasting"
        subtitle="14W revenue forecast, scenarios & campaign calendar"
        backLabel="← Back to Price Intel"
        backHref="/price-intel"
      />
      <DeepDiveKPIStrip tiles={kpiTiles} />
      <DeepDiveTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="bg-[var(--bg-secondary)]">
        {activeTab === 'forecast'  && <ForecastTab core={core} />}
        {activeTab === 'scenarios' && <ScenariosTab core={core} />}
        {activeTab === 'calendar'  && <CalendarTab core={core} />}
      </div>
    </div>
  );
}
