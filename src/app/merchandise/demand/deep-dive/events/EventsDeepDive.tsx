'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Calendar, Activity, BarChart2, TrendingUp, DollarSign } from 'lucide-react';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import DeepDiveHeader from '../shared/DeepDiveHeader';
import DeepDiveKPIStrip from '../shared/DeepDiveKPIStrip';
import DeepDiveTabs from '../shared/DeepDiveTabs';
import EventCalendarTab from './tabs/EventCalendarTab';
import RampStatusTab from './tabs/RampStatusTab';
import HistoricalLiftTab from './tabs/HistoricalLiftTab';
import DemandRampTab from './tabs/DemandRampTab';
import CostOfUnreadinessTab from './tabs/CostOfUnreadinessTab';

const ANCHOR = '2026-05-17';

function daysUntil(anchor: string, target: string): number {
  return Math.round(
    (new Date(target + 'T00:00:00').getTime() - new Date(anchor + 'T00:00:00').getTime()) /
      86400000,
  );
}

const TABS = [
  { id: 'calendar', label: 'Event Calendar', icon: <Calendar size={14} /> },
  { id: 'ramp', label: 'Ramp Status', icon: <Activity size={14} /> },
  { id: 'historical', label: 'Historical Lift', icon: <BarChart2 size={14} /> },
  { id: 'ramp-curve', label: 'Demand Ramp Curve', icon: <TrendingUp size={14} /> },
  { id: 'cost', label: 'Cost of Unreadiness', icon: <DollarSign size={14} /> },
];

const VALID_TABS = new Set(TABS.map((t) => t.id));

interface Props {
  core: MerchDemandFullPayload;
}

export default function EventsDeepDive({ core }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') ?? 'calendar';
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'calendar';

  const handleTabChange = useCallback(
    (tabId: string) => {
      router.push(`?tab=${tabId}`, { scroll: false });
    },
    [router],
  );

  const nextEvent = core.kpis.next_event;
  const rampReadiness =
    ((core.kpis.next_event as unknown as Record<string, unknown>).ramp_readiness_pct as number) ??
    72.3;

  const tiles = [
    {
      label: 'Events next 90 days',
      value: String(
        core.events.filter((e) => {
          const d = daysUntil(ANCHOR, e.date);
          return d >= 0 && d <= 90;
        }).length,
      ),
    },
    {
      label: 'SKUs not ramped',
      value: String(nextEvent.skus_not_ramped),
      subtext: `for ${nextEvent.event_name}`,
      color: 'warning' as const,
    },
    {
      label: 'Ramp readiness',
      value: `${rampReadiness.toFixed(1)}%`,
      trend: { value: -8.2, label: 'below target', invertColors: true },
    },
    {
      label: 'Revenue at risk',
      value: formatLakhsCrores(nextEvent.skus_not_ramped * 15000),
      subtext: 'if no action taken',
      color: 'negative' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <DeepDiveHeader
        title="Events Intelligence"
        subtitle="Deep Dive"
        backLabel="Demand"
        backHref="/merchandise/demand"
      />
      <DeepDiveKPIStrip tiles={tiles} />
      <DeepDiveTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="px-8 py-6 space-y-6">
        {activeTab === 'calendar' && <EventCalendarTab core={core} />}
        {activeTab === 'ramp' && <RampStatusTab core={core} />}
        {activeTab === 'historical' && <HistoricalLiftTab core={core} />}
        {activeTab === 'ramp-curve' && <DemandRampTab core={core} />}
        {activeTab === 'cost' && <CostOfUnreadinessTab core={core} />}
      </div>
    </div>
  );
}
