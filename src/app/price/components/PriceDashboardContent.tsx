'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePrice } from '@/app/context/PriceContext';
import {
  PriceKPIsData,
  PriceRecommendation,
  PriceAlert,
  MarginDistributionData,
  CostPassthrough as CostPassthroughType,
  ABTest,
  MarkdownData,
  PromoCalendarItem,
} from '@/app/lib/price-types';
import { getPriceAction, getElasticityCategory } from '@/app/lib/price-types';

import PriceFilterBar from './PriceFilterBar';
import PriceKPICards from './PriceKPICards';
import PriceAlerts from './PriceAlerts';
import RecommendationSummary from './RecommendationSummary';
import PriceWaterfall from './PriceWaterfall';
import RevenueImpactScatter from './RevenueImpactScatter';
import PriceRecommendationTable from './PriceRecommendationTable';
import MarginDistribution from './MarginDistribution';
import CostPassthrough from './CostPassthrough';
import PriceABTests from './PriceABTests';
import MarkdownPerformance from './MarkdownPerformance';
import MarkdownRecovery from './MarkdownRecovery';
import PromoCalendar from './PromoCalendar';

interface PriceDashboardContentProps {
  kpis: PriceKPIsData;
  recommendations: PriceRecommendation[];
  alerts: PriceAlert[];
  marginDistribution: MarginDistributionData;
  costPassthrough: CostPassthroughType[];
  abTests: ABTest[];
  markdownData: MarkdownData;
  promoCalendar: PromoCalendarItem[];
}

export default function PriceDashboardContent({
  kpis,
  recommendations,
  alerts,
  marginDistribution,
  costPassthrough,
  abTests,
  markdownData,
  promoCalendar,
}: PriceDashboardContentProps) {
  const router = useRouter();
  const { filters } = usePrice();

  // Filter recommendations based on context filters
  const filteredRecommendations = useMemo(() => {
    let result = [...recommendations];

    // Filter by department
    if (filters.departments.length > 0) {
      result = result.filter((r) => (filters.departments ?? '').includes(r.department));
    }

    // Filter by category
    if (filters.categories.length > 0) {
      result = result.filter((r) => (filters.categories ?? '').includes(r.category));
    }

    // Filter by recommendation priority
    if (filters.recommendationPriority !== 'all') {
      result = result.filter((r) => r.recommendation_priority === filters.recommendationPriority);
    }

    // Filter by price action
    if (filters.priceAction !== 'all') {
      result = result.filter((r) => {
        const action = getPriceAction(r.price_change_pct);
        return action === filters.priceAction;
      });
    }

    // Filter by elasticity range
    if (filters.elasticityRange !== 'all') {
      result = result.filter((r) => {
        const category = getElasticityCategory(r.elasticity_estimate);
        return category === filters.elasticityRange;
      });
    }

    return result;
  }, [recommendations, filters]);

  // Calculate filtered KPIs
  const filteredKPIs = useMemo(() => {
    if (filteredRecommendations.length === (recommendations ?? []).length) {
      return kpis;
    }

    const totalRevenueImpact = filteredRecommendations.reduce((sum, r) => sum + r.revenue_impact, 0);
    const avgCurrentMargin = filteredRecommendations.reduce((sum, r) => sum + r.current_margin_pct, 0) / ((filteredRecommendations ?? []).length || 1);
    const avgProjectedMargin = filteredRecommendations.reduce((sum, r) => sum + r.projected_margin_pct, 0) / ((filteredRecommendations ?? []).length || 1);

    return {
      ...kpis,
      revenue_impact: { ...kpis.revenue_impact, value: totalRevenueImpact },
      avg_margin_current: { ...kpis.avg_margin_current, value: avgCurrentMargin },
      avg_margin_projected: { ...kpis.avg_margin_projected, value: avgProjectedMargin },
    };
  }, [kpis, filteredRecommendations, (recommendations ?? []).length]);

  const handleProductClick = (productId: string) => {
    router.push(`/price/product/${productId}`);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Filter Bar */}
      <PriceFilterBar />

      <div className="p-6 space-y-6">
        {/* Section 1: KPI Cards */}
        <PriceKPICards data={filteredKPIs} />

        {/* Section 2: Alerts Panel */}
        <PriceAlerts alerts={alerts} />

        {/* Section 3: Recommendation Summary + Waterfall + Scatter */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Recommendation Overview
          </h2>
          <RecommendationSummary recommendations={filteredRecommendations} />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Price Optimization Analysis
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <PriceWaterfall
              recommendations={filteredRecommendations}
              onProductClick={handleProductClick}
            />
            <RevenueImpactScatter
              recommendations={filteredRecommendations}
              onProductClick={handleProductClick}
            />
          </div>
        </section>

        {/* Section 7: Margin & Cost Analysis */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Margin & Cost Analysis
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <MarginDistribution data={marginDistribution} />
            <CostPassthrough data={costPassthrough} />
          </div>
        </section>

        {/* Section 8: A/B Test Results */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Price Testing
          </h2>
          <PriceABTests data={abTests} />
        </section>

        {/* Section 9: Markdown & Clearance */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Markdown & Clearance
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <MarkdownPerformance data={markdownData} />
            <MarkdownRecovery data={markdownData} />
          </div>
        </section>

        {/* Section 10: Promo Calendar */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Promotional Planning
          </h2>
          <PromoCalendar data={promoCalendar} />
        </section>

        {/* Recommendation Table */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            All Recommendations
          </h2>
          <PriceRecommendationTable
            recommendations={filteredRecommendations}
            onProductClick={handleProductClick}
          />
        </section>
      </div>
    </div>
  );
}
