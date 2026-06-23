'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart2, List, Grid, GitBranch, Layers } from 'lucide-react';
import type { MerchDemandFullPayload } from '@/app/lib/merch-demand-types';
import DeepDiveHeader from '../shared/DeepDiveHeader';
import DeepDiveKPIStrip from '../shared/DeepDiveKPIStrip';
import DeepDiveTabs from '../shared/DeepDiveTabs';
import AccuracyOverviewTab from './tabs/AccuracyOverviewTab';
import BySKUTab from './tabs/BySKUTab';
import ByDimensionTab from './tabs/ByDimensionTab';
import BiasAnalysisTab from './tabs/BiasAnalysisTab';
import FeatureDeepDiveTab from './tabs/FeatureDeepDiveTab';

const TABS = [
  { id: 'overview',      label: 'Accuracy Overview', icon: <BarChart2 size={14} /> },
  { id: 'by-sku',        label: 'By SKU',             icon: <List size={14} /> },
  { id: 'by-dimension',  label: 'By Dimension',       icon: <Grid size={14} /> },
  { id: 'bias',          label: 'Bias Analysis',      icon: <GitBranch size={14} /> },
  { id: 'features',      label: 'Feature Deep Dive',  icon: <Layers size={14} /> },
];

const VALID_TABS = new Set(TABS.map((t) => t.id));

interface Props {
  core: MerchDemandFullPayload;
}

export default function AccuracyDeepDive({ core }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') ?? 'overview';
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'overview';

  const handleTabChange = useCallback(
    (tabId: string) => {
      router.push(`?tab=${tabId}`, { scroll: false });
    },
    [router],
  );

  const modelCard = core.model_card ?? {};
  const testMape = ((modelCard.test_mape as number) ?? 0.159) * 100;
  const testBias = ((modelCard.test_bias as number) ?? -0.01293) * 100;
  const trainingRows = (modelCard.training_rows as number) ?? 1_240_000;
  const nFeatures = (modelCard.n_features as number) ?? 47;
  const overallMape = 100 - core.kpis.forecast_accuracy_30d_pct;

  const tiles = [
    {
      label: 'Overall MAPE',
      value: `${overallMape.toFixed(1)}%`,
      subtext: 'lower is better',
    },
    {
      label: 'Test MAPE',
      value: `${testMape.toFixed(1)}%`,
      subtext: 'holdout benchmark',
    },
    {
      label: 'Bias',
      value: `${testBias.toFixed(2)}%`,
      subtext: 'negative = under-forecast',
      color: testBias < 0 ? ('warning' as const) : ('positive' as const),
    },
    {
      label: 'Training rows',
      value: trainingRows.toLocaleString('en-IN'),
      subtext: `${nFeatures} features`,
    },
  ];

  const handleExportCSV = useCallback(() => {
    const rows = [
      ['Metric', 'Value'],
      ['Overall MAPE', `${overallMape.toFixed(1)}%`],
      ['Test MAPE', `${testMape.toFixed(1)}%`],
      ['Bias', `${testBias.toFixed(2)}%`],
      ['Training Rows', trainingRows.toLocaleString('en-IN')],
      ['Features', nFeatures.toString()],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accuracy-model-intelligence.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [overallMape, testMape, testBias, trainingRows, nFeatures]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <DeepDiveHeader
        title="Accuracy & Model Intelligence"
        subtitle="Deep Dive"
        backLabel="← Back to Demand"
        backHref="/merchandise/demand"
        onExportCSV={handleExportCSV}
      />
      <DeepDiveKPIStrip tiles={tiles} />
      <DeepDiveTabs tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="px-8 py-6 space-y-6">
        {activeTab === 'overview'      && <AccuracyOverviewTab core={core} />}
        {activeTab === 'by-sku'        && <BySKUTab core={core} />}
        {activeTab === 'by-dimension'  && <ByDimensionTab core={core} />}
        {activeTab === 'bias'          && <BiasAnalysisTab core={core} />}
        {activeTab === 'features'      && <FeatureDeepDiveTab core={core} />}
      </div>
    </div>
  );
}
