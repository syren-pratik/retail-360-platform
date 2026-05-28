'use client';

import InsightStrip from '@/app/components/insights/InsightStrip';

export default function MerchInsightsStrip() {
  return (
    <InsightStrip
      insights={[]}
      loading={true}
      source="claude"
      onRefresh={() => {}}
      isFiltered={false}
      onScrollToChart={() => {}}
    />
  );
}
