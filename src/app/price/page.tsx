'use client';

import { useEffect, useState } from 'react';
import PriceDashboardContent from './components/PriceDashboardContent';
import NoDataScreen from '@/app/components/ui/NoDataScreen';
import { Skeleton } from '@/app/components/ui/Skeleton';

// Type imports
import {
  PriceKPIsData,
  PriceRecommendation,
  PriceAlert,
  MarginDistributionData,
  CostPassthrough,
  ABTest,
  MarkdownData,
  PromoCalendarItem,
} from '@/app/lib/price-types';

interface PriceData {
  kpis: PriceKPIsData | null;
  recommendations: PriceRecommendation[];
  alerts: PriceAlert[];
  marginDistribution: MarginDistributionData | null;
  costPassthrough: CostPassthrough[];
  abTests: ABTest[];
  markdownData: MarkdownData | null;
  promoCalendar: PromoCalendarItem[];
}

export default function PricePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PriceData | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [
          kpisRes,
          recommendationsRes,
          alertsRes,
          marginRes,
          costRes,
          abTestsRes,
          markdownRes,
          promoRes,
        ] = await Promise.all([
          fetch('/api/cache/price_kpis'),
          fetch('/api/cache/price_recommendations'),
          fetch('/api/cache/price_alerts'),
          fetch('/api/cache/price_margin_distribution'),
          fetch('/api/cache/price_cost_passthrough'),
          fetch('/api/cache/price_ab_tests'),
          fetch('/api/cache/price_markdown'),
          fetch('/api/cache/price_promo_calendar'),
        ]);

        // Check if any failed
        const responses = [kpisRes, recommendationsRes, alertsRes, marginRes, costRes, abTestsRes, markdownRes, promoRes];
        for (const res of responses) {
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.details || 'Failed to fetch price data');
          }
        }

        // Parse all responses
        const [
          kpisData,
          recommendationsData,
          alertsData,
          marginData,
          costData,
          abTestsData,
          markdownData,
          promoData,
        ] = await Promise.all([
          kpisRes.json(),
          recommendationsRes.json(),
          alertsRes.json(),
          marginRes.json(),
          costRes.json(),
          abTestsRes.json(),
          markdownRes.json(),
          promoRes.json(),
        ]);

        setData({
          kpis: kpisData.data as PriceKPIsData,
          recommendations: recommendationsData.data as PriceRecommendation[],
          alerts: alertsData.data as PriceAlert[],
          marginDistribution: marginData.data as MarginDistributionData,
          costPassthrough: costData.data as CostPassthrough[],
          abTests: abTestsData.data as ABTest[],
          markdownData: markdownData.data as MarkdownData,
          promoCalendar: promoData.data as PromoCalendarItem[],
        });
      } catch (err) {
        console.error('Failed to fetch price data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  // Error or no data state
  if (error || !data || !data.kpis) {
    return (
      <NoDataScreen
        title="Price Data Not Available"
        description={error || 'Cache data has not been loaded. Please refresh the cache from Databricks.'}
        showRefreshButton={true}
        error={error}
      />
    );
  }

  return (
    <PriceDashboardContent
      kpis={data.kpis}
      recommendations={data.recommendations}
      alerts={data.alerts}
      marginDistribution={data.marginDistribution!}
      costPassthrough={data.costPassthrough}
      abTests={data.abTests}
      markdownData={data.markdownData!}
      promoCalendar={data.promoCalendar}
    />
  );
}
