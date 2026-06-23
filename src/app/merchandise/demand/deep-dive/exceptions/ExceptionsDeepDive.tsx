'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { List, Grid, Store, Clock } from 'lucide-react';
import type { MerchDemandFullPayload, MerchDemandActionItem } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import DeepDiveHeader from '../shared/DeepDiveHeader';
import DeepDiveKPIStrip from '../shared/DeepDiveKPIStrip';
import DeepDiveTabs from '../shared/DeepDiveTabs';
import AllExceptionsTab from './tabs/AllExceptionsTab';
import ByCategoryTab from './tabs/ByCategoryTab';
import ByStoreTab from './tabs/ByStoreTab';
import TimelineTab from './tabs/TimelineTab';

type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

function derivePriority(item: MerchDemandActionItem): Priority {
  const absImpact = Math.abs(item.revenue_impact_inr);
  if (absImpact >= 400_000 || (item.action_type === 'understock_risk' && item.days_to_impact <= 2))
    return 'Critical';
  if (absImpact >= 150_000 || item.days_to_impact <= 5) return 'High';
  if (absImpact >= 50_000) return 'Medium';
  return 'Low';
}

const TABS = [
  { id: 'all',      label: 'All Exceptions',    icon: <List size={14} /> },
  { id: 'category', label: 'By Category',       icon: <Grid size={14} /> },
  { id: 'store',    label: 'By Store',          icon: <Store size={14} /> },
  { id: 'timeline', label: 'Exception Timeline', icon: <Clock size={14} /> },
];

const VALID_TABS = new Set(TABS.map((t) => t.id));

interface Props {
  core: MerchDemandFullPayload;
}

export default function ExceptionsDeepDive({ core }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') ?? 'all';
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'all';

  const handleTabChange = useCallback(
    (tabId: string) => {
      router.push(`?tab=${tabId}`, { scroll: false });
    },
    [router],
  );

  const criticalCount = core.action_items.filter((i) => derivePriority(i) === 'Critical').length;
  const highConfCount = core.action_items.filter((i) => i.confidence === 'High').length;
  const totalRevAtStake = core.action_items.reduce(
    (s, i) => s + Math.abs(i.revenue_impact_inr),
    0,
  );

  const tiles = [
    { label: 'Total exceptions', value: String(core.action_items.length) },
    { label: 'Critical', value: String(criticalCount), color: 'negative' as const },
    { label: 'Revenue at stake', value: formatLakhsCrores(totalRevAtStake), color: 'warning' as const },
    {
      label: 'Avg confidence',
      value: `${core.action_items.length > 0 ? Math.round((highConfCount / core.action_items.length) * 100) : 0}% high`,
      color: 'default' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <DeepDiveHeader
        title="Exceptions Deep Dive"
        subtitle="Action Items & Alerts"
        backHref="/merchandise/demand"
        backLabel="← Back to Demand"
      />
      <DeepDiveKPIStrip tiles={tiles} />
      <DeepDiveTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="px-8 py-6 space-y-6">
        {activeTab === 'all' && <AllExceptionsTab core={core} />}
        {activeTab === 'category' && <ByCategoryTab core={core} />}
        {activeTab === 'store' && <ByStoreTab core={core} />}
        {activeTab === 'timeline' && <TimelineTab core={core} />}
      </div>
    </div>
  );
}
