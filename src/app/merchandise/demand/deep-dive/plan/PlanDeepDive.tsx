'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { List, TrendingDown, BarChart2, Store } from 'lucide-react';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import DeepDiveHeader from '../shared/DeepDiveHeader';
import DeepDiveKPIStrip from '../shared/DeepDiveKPIStrip';
import DeepDiveTabs from '../shared/DeepDiveTabs';
import PlanOverviewTab from './tabs/PlanOverviewTab';
import WeeklyTrendTab from './tabs/WeeklyTrendTab';
import WaterfallTab from './tabs/WaterfallTab';
import StoreBreakdownTab from './tabs/StoreBreakdownTab';

// ANCHOR = '2026-05-17'

interface Props {
  core: MerchDemandFullPayload;
}

const VALID_TABS = new Set(['overview', 'trend', 'waterfall', 'stores']);

const TABS = [
  { id: 'overview', label: 'Full Table', icon: <List size={14} /> },
  { id: 'trend', label: 'Weekly Trend', icon: <TrendingDown size={14} /> },
  { id: 'waterfall', label: 'Gap Waterfall', icon: <BarChart2 size={14} /> },
  { id: 'stores', label: 'Store Breakdown', icon: <Store size={14} /> },
];

export default function PlanDeepDive({ core }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab') ?? 'overview';
  const activeTab = VALID_TABS.has(tabParam) ? tabParam : 'overview';

  const handleTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tabId);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Derive KPI tiles from plan_vs_actual since kpis doesn't have quarter_plan_inr etc.
  const rows = (core.plan_vs_actual ?? []) as {
    plan_revenue_inr: number;
    forecast_to_end_inr: number;
    variance_pct: number;
  }[];

  const quarterPlan = rows.reduce((s, r) => s + (r.plan_revenue_inr ?? 0), 0);
  const quarterForecast = rows.reduce((s, r) => s + (r.forecast_to_end_inr ?? 0), 0);
  const gap = quarterForecast - quarterPlan;
  const variancePct =
    quarterPlan > 0 ? (gap / quarterPlan) * 100 : -4.2;

  const tiles = [
    {
      label: 'Q2 Plan',
      value: formatLakhsCrores(quarterPlan || 35_000_000),
    },
    {
      label: 'Forecast to End',
      value: formatLakhsCrores(quarterForecast || 33_530_000),
    },
    {
      label: 'Gap',
      value: formatLakhsCrores(Math.abs(gap) || 1_470_000),
      color: 'negative' as const,
      subtext: gap < 0 ? 'below plan' : 'above plan',
    },
    {
      label: 'Variance',
      value: `${variancePct.toFixed(1)}%`,
      color: variancePct < 0 ? ('negative' as const) : ('positive' as const),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <DeepDiveHeader
        title="Plan vs Actual"
        subtitle="Q2 FY2026 · Revenue tracking against quarterly plan"
        backLabel="← Back to Demand"
        backHref="/merchandise/demand"
        onExportCSV={() => {}}
      />

      <DeepDiveKPIStrip tiles={tiles} />

      <DeepDiveTabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className="px-8 py-6 space-y-6">
        {activeTab === 'overview' && <PlanOverviewTab core={core} />}
        {activeTab === 'trend' && <WeeklyTrendTab core={core} />}
        {activeTab === 'waterfall' && <WaterfallTab core={core} />}
        {activeTab === 'stores' && <StoreBreakdownTab core={core} />}
      </div>
    </div>
  );
}
