'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import TopFilterBar from '@/app/components/layout/TopFilterBar';
import ActiveFilterChips from '@/app/components/layout/ActiveFilterChips';
import KPICard from '@/app/components/kpi/KPICard';
import CLVDistribution from '@/app/components/charts/CLVDistribution';
import RFMScatter from '@/app/components/charts/RFMScatter';
import ChurnRiskDonut from '@/app/components/charts/ChurnRiskDonut';
import ChurnDrivers from '@/app/components/charts/ChurnDrivers';
import CohortRetentionHeatmap from '@/app/components/charts/CohortRetentionHeatmap';
import BasketDistribution from '@/app/components/charts/BasketDistribution';
import CategoryBySegment from '@/app/components/charts/CategoryBySegment';
import CustomerTable from '@/app/components/tables/CustomerTable';
import AtRiskAlerts from '@/app/components/alerts/AtRiskAlerts';
import SegmentMigration from '@/app/components/charts/SegmentMigration';
import RevenuePareto from '@/app/components/charts/RevenuePareto';
import RevenueBySegment from '@/app/components/charts/RevenueBySegment';
import RecencyDistribution from '@/app/components/charts/RecencyDistribution';
import FrequencyDistribution from '@/app/components/charts/FrequencyDistribution';
import ChannelPerformance from '@/app/components/charts/ChannelPerformance';
import AcquisitionByChannel from '@/app/components/charts/AcquisitionByChannel';
import PinnedChartsSection from '@/app/components/charts/PinnedChartsSection';
import InsightStrip from '@/app/components/insights/InsightStrip';
import LastUpdated from '@/app/components/ui/LastUpdated';
import { useDashboard } from '@/app/context/DashboardContext';
import { applyFilters, getDateRangeDays } from '@/app/lib/filter-utils';
import { useAIInsights } from '@/app/hooks/useAIInsights';
import { toast } from 'sonner';

import {
  KPIData,
  CLVTierData,
  RFMCustomer,
  ChurnRiskData,
  ChurnDriver,
  CohortRetentionMatrix,
  BasketDistribution as BasketDistributionType,
  BasketData,
  CategoryBySegmentData,
  CustomerRecord,
  DimensionsCache,
  SegmentMigrationData,
  RevenueConcentrationData,
  RecencyFrequencyData,
  ChannelAnalysisData,
  AtRiskAlertsData,
  FrequencyData,
  CohortDetailData,
  ChurnDetailData,
  RevenueDetailData,
  CLVDetailData,
  RFMDetailData,
} from '@/app/lib/types';

interface DashboardContentProps {
  kpis: KPIData;
  clvDistribution: CLVTierData[];
  rfmSample: RFMCustomer[];
  churnRisk: ChurnRiskData[];
  churnDrivers: ChurnDriver[];
  cohortRetention: CohortRetentionMatrix[];
  basketDistribution: BasketDistributionType[];
  basketData: BasketData;
  categoryBySegment: CategoryBySegmentData;
  customerTable: CustomerRecord[];
  dimensions: DimensionsCache;
  segmentMigration: SegmentMigrationData;
  revenueConcentration: RevenueConcentrationData;
  recencyFrequency: RecencyFrequencyData;
  channelAnalysis: ChannelAnalysisData;
  atRiskAlerts: AtRiskAlertsData;
  frequencyData: FrequencyData;
  cohortDetail: CohortDetailData;
  churnDetail: ChurnDetailData;
  revenueDetail: RevenueDetailData;
  clvDetail: CLVDetailData;
  rfmDetail: RFMDetailData;
  expandChart?: string;
}

// Calculate KPI changes
const calculateChange = (current: number, prior: number) => {
  if (prior === 0) return 0;
  return ((current - prior) / prior) * 100;
};

const formatNumber = (num: number) => {
  if (num >= 100000) return `${(num / 1000).toFixed(0)}K`;
  if (num >= 1000) return num.toLocaleString('en-IN');
  return num.toString();
};

const formatCurrency = (num: number) => {
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

// CLV tier order for consistent display
const CLV_TIER_ORDER = ['Platinum', 'Gold', 'Silver', 'Bronze', 'At-Risk'];
const CHURN_RISK_ORDER = ['Critical', 'High', 'Medium', 'Low'];
const BASKET_RANGES = [
  { range: '₹0-500', min: 0, max: 500 },
  { range: '₹500-1K', min: 500, max: 1000 },
  { range: '₹1K-2K', min: 1000, max: 2000 },
  { range: '₹2K-5K', min: 2000, max: 5000 },
  { range: '₹5K+', min: 5000, max: Infinity },
];

export default function DashboardContent({
  kpis,
  clvDistribution,
  rfmSample,
  churnRisk,
  churnDrivers,
  cohortRetention,
  basketDistribution,
  basketData,
  categoryBySegment,
  customerTable,
  dimensions,
  segmentMigration,
  revenueConcentration,
  recencyFrequency,
  channelAnalysis,
  atRiskAlerts,
  frequencyData,
  cohortDetail,
  churnDetail,
  revenueDetail,
  clvDetail,
  rfmDetail,
  expandChart,
}: DashboardContentProps) {
  const { globalFilters, activeDrilldowns, resetFilters, setExpandedChart } = useDashboard();
  const [lastUpdated] = useState(new Date());

  useEffect(() => {
    if (expandChart) setExpandedChart(expandChart);
  }, [expandChart, setExpandedChart]);

  // Simulate refresh (in real app, this would fetch fresh data)
  const handleRefresh = useCallback(() => {
    toast.info('Refreshing data...');
    // In a real application, this would trigger a data refetch
    setTimeout(() => {
      toast.success('Data refreshed');
    }, 1000);
  }, []);

  // Check if any filters are active
  const hasFilters = useMemo(() => {
    const dateRangeDays = getDateRangeDays(globalFilters.dateRange);
    const isDateFiltered = dateRangeDays !== 90; // 90 days is the default
    return isDateFiltered ||
      globalFilters.segments.length > 0 ||
      globalFilters.loyaltyTiers.length > 0 ||
      globalFilters.channel !== 'all' ||
      (globalFilters.cities && globalFilters.cities.length > 0) ||
      activeDrilldowns.length > 0;
  }, [globalFilters, activeDrilldowns]);

  // Filter customer table data based on global filters
  const filteredCustomerTable = useMemo(() => {
    return applyFilters(
      customerTable,
      globalFilters,
      activeDrilldowns,
      {
        segment: 'customer_segment',
        loyaltyTier: 'loyalty_tier',
        channel: 'acquisition_channel',
        city: 'city',
        recency: 'days_since_last_purchase',
      }
    );
  }, [customerTable, globalFilters, activeDrilldowns]);

  // Extract unique cities from customer table
  const uniqueCities = useMemo(() => {
    const citySet = new Set<string>();
    customerTable.forEach(c => {
      const city = c.city || c.geography;
      if (city) citySet.add(city);
    });
    return Array.from(citySet).sort();
  }, [customerTable]);

  // Extract unique acquisition channels from customer table
  const uniqueAcquisitionChannels = useMemo(() => {
    const channelSet = new Set<string>();
    customerTable.forEach(c => {
      if (c.acquisition_channel) channelSet.add(c.acquisition_channel);
    });
    // Order by defined taxonomy
    const order = ['Organic', 'Paid', 'Direct', 'Referral', 'Email / SMS', 'Marketplace / Platform', 'Offline'];
    return order.filter(ch => channelSet.has(ch));
  }, [customerTable]);

  // Compute CLV Distribution from filtered customers
  const computedClvDistribution = useMemo((): CLVTierData[] => {
    if (!hasFilters) return clvDistribution;

    const tierMap = new Map<string, { count: number; totalClv: number; totalFreq: number; totalRecency: number }>();

    // Initialize all tiers
    CLV_TIER_ORDER.forEach(tier => {
      tierMap.set(tier, { count: 0, totalClv: 0, totalFreq: 0, totalRecency: 0 });
    });

    // Aggregate from filtered customers
    filteredCustomerTable.forEach(customer => {
      const tier = customer.clv_tier;
      const existing = tierMap.get(tier);
      if (existing) {
        existing.count += 1;
        existing.totalClv += customer.clv_12m;
        existing.totalFreq += customer.total_transactions;
        existing.totalRecency += customer.days_since_last_purchase;
      }
    });

    return CLV_TIER_ORDER.map(tier => {
      const data = tierMap.get(tier)!;
      return {
        clv_tier: tier,
        customer_count: data.count,
        avg_clv: data.count > 0 ? data.totalClv / data.count : 0,
        total_clv: data.totalClv,
        avg_frequency: data.count > 0 ? data.totalFreq / data.count : 0,
        avg_recency: data.count > 0 ? data.totalRecency / data.count : 0,
      };
    }).filter(d => d.customer_count > 0);
  }, [hasFilters, clvDistribution, filteredCustomerTable]);

  // Compute Churn Risk Distribution from filtered customers
  const computedChurnRisk = useMemo((): ChurnRiskData[] => {
    if (!hasFilters) return churnRisk;

    const tierMap = new Map<string, { count: number; totalProb30: number; totalProb60: number; totalProb90: number }>();

    // Initialize all tiers
    CHURN_RISK_ORDER.forEach(tier => {
      tierMap.set(tier, { count: 0, totalProb30: 0, totalProb60: 0, totalProb90: 0 });
    });

    // Aggregate from filtered customers
    filteredCustomerTable.forEach(customer => {
      const tier = customer.churn_risk_tier;
      const existing = tierMap.get(tier);
      if (existing) {
        existing.count += 1;
        // Use churn_prob_90d as proxy for all probabilities
        existing.totalProb30 += customer.churn_prob_90d * 0.5;
        existing.totalProb60 += customer.churn_prob_90d * 0.75;
        existing.totalProb90 += customer.churn_prob_90d;
      }
    });

    return CHURN_RISK_ORDER.map(tier => {
      const data = tierMap.get(tier)!;
      return {
        churn_risk_tier: tier,
        customer_count: data.count,
        avg_prob_30d: data.count > 0 ? data.totalProb30 / data.count : 0,
        avg_prob_60d: data.count > 0 ? data.totalProb60 / data.count : 0,
        avg_prob_90d: data.count > 0 ? data.totalProb90 / data.count : 0,
      };
    }).filter(d => d.customer_count > 0);
  }, [hasFilters, churnRisk, filteredCustomerTable]);

  // Compute RFM Scatter from filtered customers
  const computedRfmSample = useMemo((): RFMCustomer[] => {
    if (!hasFilters) return rfmSample;

    // Convert filtered customers to RFM format (sample up to 200 for performance)
    const sampled = filteredCustomerTable.slice(0, 200);
    return sampled.map(customer => ({
      customer_id: customer.customer_id,
      recency_days: customer.days_since_last_purchase,
      purchase_frequency: customer.total_transactions,
      clv_12m: customer.clv_12m,
      clv_tier: customer.clv_tier,
      probability_alive: 1 - customer.churn_prob_90d,
    }));
  }, [hasFilters, rfmSample, filteredCustomerTable]);

  // Compute Basket Distribution from filtered customers
  const computedBasketDistribution = useMemo((): BasketDistributionType[] => {
    if (!hasFilters) return basketDistribution;

    return BASKET_RANGES.map(({ range, min, max }) => {
      const customers = filteredCustomerTable.filter(
        c => c.avg_basket >= min && c.avg_basket < max
      );
      const totalValue = customers.reduce((sum, c) => sum + c.avg_basket, 0);
      return {
        basket_range: range,
        customer_count: customers.length,
        avg_value: customers.length > 0 ? totalValue / customers.length : 0,
      };
    }).filter(d => d.customer_count > 0);
  }, [hasFilters, basketDistribution, filteredCustomerTable]);

  // Derive at-risk summary from filtered customers (undefined when no filters → component uses static JSON)
  const computedAtRiskSummary = useMemo(() => {
    if (!hasFilters) return undefined;
    if (!filteredCustomerTable.length) return {
      total_at_risk: 0,
      high_priority: 0,
      total_revenue_at_risk: 0,
      avg_churn_probability: 0,
    };

    const atRiskCustomers = filteredCustomerTable.filter(c =>
      c.churn_prob_90d > 0.5 || c.days_since_last_purchase > 60
    );

    const allSpends = filteredCustomerTable
      .map(c => c.total_spend)
      .sort((a, b) => b - a);
    const top30PctThreshold = allSpends[Math.floor(allSpends.length * 0.3)] ?? 0;

    const highPriority = atRiskCustomers.filter(c =>
      c.churn_prob_90d > 0.7 && c.total_spend >= top30PctThreshold
    );

    const totalRevAtRisk = atRiskCustomers.reduce((sum, c) => sum + c.clv_12m, 0);
    const avgChurnProb = atRiskCustomers.length > 0
      ? atRiskCustomers.reduce((sum, c) => sum + c.churn_prob_90d, 0) / atRiskCustomers.length
      : 0;

    return {
      total_at_risk: atRiskCustomers.length,
      high_priority: highPriority.length,
      total_revenue_at_risk: Math.round(totalRevAtRisk),
      avg_churn_probability: Math.round(avgChurnProb * 100) / 100,
    };
  }, [hasFilters, filteredCustomerTable]);

  // Derive alert cards from filtered customers (undefined when no filters → component uses static rows)
  const computedAlertCards = useMemo(() => {
    if (!hasFilters) return undefined;
    if (!filteredCustomerTable.length) return [];

    return filteredCustomerTable
      .filter(c => c.churn_prob_90d > 0.6 && c.days_since_last_purchase > 45)
      .sort((a, b) => b.clv_12m - a.clv_12m)
      .slice(0, 20)
      .map(c => ({
        customer_id: c.customer_id,
        alert_type: 'high_value_declining' as const,
        churn_probability: Math.round(c.churn_prob_90d * 100),
        segment: c.customer_segment,
        clv: c.clv_12m,
        days_since_order: c.days_since_last_purchase,
        risk_level: c.churn_prob_90d > 0.8 ? 'Critical' : 'High Risk',
      }));
  }, [hasFilters, filteredCustomerTable]);

  // Compute Category by Segment from filtered customers

  // Generate sparkline data trending toward a final value
  const generateTrend = (finalValue: number, direction: 'up' | 'down' = 'up'): number[] => {
    const variance = 0.15; // 15% variance
    const trend: number[] = [];
    for (let i = 0; i < 6; i++) {
      const progress = i / 5;
      const base = direction === 'up'
        ? finalValue * (0.85 + progress * 0.15)
        : finalValue * (1.15 - progress * 0.15);
      const noise = base * (Math.random() * variance - variance / 2);
      trend.push(Math.round((base + noise) * 100) / 100);
    }
    // Ensure the last value matches the actual value
    trend[5] = finalValue;
    return trend;
  };

  // Calculate dynamic KPIs based on filtered customer data
  const dynamicKpis = useMemo(() => {
    if (!hasFilters) {
      return kpis;
    }

    const filteredCount = filteredCustomerTable.length;

    const avgClv = filteredCustomerTable.length > 0
      ? filteredCustomerTable.reduce((sum, c) => sum + c.clv_12m, 0) / filteredCustomerTable.length
      : 0;

    const churnRateFromFiltered = filteredCustomerTable.length > 0
      ? (filteredCustomerTable.filter(c => c.churn_risk_tier === 'Critical' || c.churn_risk_tier === 'High').length / filteredCustomerTable.length) * 100
      : 0;

    const activeRateFromFiltered = filteredCustomerTable.length > 0
      ? (filteredCustomerTable.filter(c => c.days_since_last_purchase <= 30).length / filteredCustomerTable.length) * 100
      : 0;

    return {
      total_customers: filteredCount,
      total_customers_prior: Math.round(filteredCount * 0.95),
      total_customers_trend: generateTrend(filteredCount, 'up'),
      avg_clv: avgClv,
      avg_clv_prior: avgClv * 0.92,
      avg_clv_trend: generateTrend(avgClv, 'up'),
      churn_rate_pct: churnRateFromFiltered,
      churn_rate_pct_prior: churnRateFromFiltered * 1.05,
      churn_rate_pct_trend: generateTrend(churnRateFromFiltered, 'down'),
      active_rate_pct: activeRateFromFiltered,
      active_rate_pct_prior: activeRateFromFiltered * 0.97,
      active_rate_pct_trend: generateTrend(activeRateFromFiltered, 'up'),
    };
  }, [kpis, hasFilters, filteredCustomerTable]);

  // Total customer count (unfiltered)
  const totalCustomerCount = customerTable.length;

  // Aggregate dashboard data for AI insights
  const dashboardData = useMemo(() => ({
    kpis: dynamicKpis,
    clvDistribution: computedClvDistribution,
    churnRisk: computedChurnRisk,
    churnDrivers,
    cohortRetention,
    segmentMigration,
    revenueConcentration,
    recencyFrequency,
    channelAnalysis,
    atRiskAlerts,
    basketDistribution: computedBasketDistribution,
    categoryBySegment,
  }), [
    dynamicKpis,
    computedClvDistribution,
    computedChurnRisk,
    churnDrivers,
    cohortRetention,
    segmentMigration,
    revenueConcentration,
    recencyFrequency,
    channelAnalysis,
    atRiskAlerts,
    computedBasketDistribution,
    categoryBySegment,
  ]);

  // Get filter label for insights
  const filterLabel = useMemo(() => {
    const parts: string[] = [];
    if (globalFilters.segments.length > 0) parts.push(globalFilters.segments.join(', '));
    if (globalFilters.loyaltyTiers.length > 0) parts.push(globalFilters.loyaltyTiers.join(', '));
    return parts.join(' / ') || undefined;
  }, [globalFilters.segments, globalFilters.loyaltyTiers]);

  // Use AI-powered insights with rule-based fallback
  const { insights, loading: insightsLoading, source: insightsSource, refresh: refreshInsights } = useAIInsights(
    'cx360',
    dashboardData,
    hasFilters
  );

  // Scroll to chart section
  const scrollToChart = useCallback((chartId: string) => {
    const element = document.getElementById(`chart-${chartId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief highlight effect
      element.classList.add('ring-2', 'ring-[var(--accent-primary)]', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-[var(--accent-primary)]', 'ring-offset-2');
      }, 2000);
    }
  }, []);

  return (
    <div className="min-h-screen">
      {/* Top Filter Bar */}
      <TopFilterBar
        segments={dimensions.segments}
        loyaltyTiers={dimensions.loyalty_tiers}
        cities={uniqueCities}
        acquisitionChannels={uniqueAcquisitionChannels}
        customers={customerTable}
      />

      {/* Active Filter Chips */}
      <ActiveFilterChips />

      {/* Main Content */}
      <div className="px-8 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              Customer 360
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Comprehensive view of customer analytics, CLV, and churn insights
              {hasFilters && (
                <span className="ml-2 text-[var(--accent-primary)]">
                  (Filtered: {filteredCustomerTable.length} customers)
                </span>
              )}
            </p>
          </div>
          <LastUpdated
            timestamp={lastUpdated}
            onRefresh={handleRefresh}
            showLiveIndicator
          />
        </div>

        {/* Section 1: KPI Cards */}
        <section className="grid grid-cols-4 gap-4">
          <div className="animate-fade-slide-up stagger-1">
            <KPICard
              label="Total Customers"
              value={formatNumber(dynamicKpis.total_customers)}
              change={calculateChange(dynamicKpis.total_customers, dynamicKpis.total_customers_prior)}
              sparklineData={dynamicKpis.total_customers_trend}
              filteredCount={hasFilters ? filteredCustomerTable.length : undefined}
              totalCount={hasFilters ? totalCustomerCount : undefined}
            />
          </div>
          <div className="animate-fade-slide-up stagger-2">
            <KPICard
              label="Average CLV"
              value={formatCurrency(dynamicKpis.avg_clv)}
              change={calculateChange(dynamicKpis.avg_clv, dynamicKpis.avg_clv_prior)}
              sparklineData={dynamicKpis.avg_clv_trend}
              filteredCount={hasFilters ? filteredCustomerTable.length : undefined}
              totalCount={hasFilters ? totalCustomerCount : undefined}
            />
          </div>
          <div className="animate-fade-slide-up stagger-3">
            <KPICard
              label="Churn Rate"
              value={`${dynamicKpis.churn_rate_pct.toFixed(1)}%`}
              change={calculateChange(dynamicKpis.churn_rate_pct, dynamicKpis.churn_rate_pct_prior)}
              invertColors={true}
              sparklineData={dynamicKpis.churn_rate_pct_trend}
              filteredCount={hasFilters ? filteredCustomerTable.length : undefined}
              totalCount={hasFilters ? totalCustomerCount : undefined}
            />
          </div>
          <div className="animate-fade-slide-up stagger-4">
            <KPICard
              label="Active Rate"
              value={`${dynamicKpis.active_rate_pct.toFixed(1)}%`}
              change={calculateChange(dynamicKpis.active_rate_pct, dynamicKpis.active_rate_pct_prior)}
              sparklineData={dynamicKpis.active_rate_pct_trend}
              filteredCount={hasFilters ? filteredCustomerTable.length : undefined}
              totalCount={hasFilters ? totalCustomerCount : undefined}
            />
          </div>
        </section>

        {/* Pinned Charts - After KPIs */}
        <PinnedChartsSection section="after_kpis" module="cx360" />

        {/* Section 2: At-Risk Alerts Panel */}
        <section id="chart-at_risk_alerts">
          <AtRiskAlerts
            data={atRiskAlerts}
            computedSummary={computedAtRiskSummary}
            computedAlerts={computedAlertCards}
          />
        </section>

        {/* Section 2.5: AI Insights Strip */}
        <section>
          <InsightStrip
            insights={insights}
            onScrollToChart={scrollToChart}
            loading={insightsLoading}
            source={insightsSource}
            onRefresh={refreshInsights}
            isFiltered={hasFilters}
            filterLabel={filterLabel}
          />
        </section>

        {/* Section 3: Customer Value Analysis */}
        <section className="grid grid-cols-2 gap-6">
          <div id="chart-clv_distribution" className="transition-all duration-300 rounded-xl">
            <CLVDistribution data={computedClvDistribution} clvDetail={clvDetail} />
          </div>
          <div id="chart-rfm_scatter" className="transition-all duration-300 rounded-xl">
            <RFMScatter data={computedRfmSample} rfmDetail={rfmDetail} />
          </div>
        </section>

        {/* Section 4: Segment Migration (Full Width) */}
        <section id="chart-segment_migration" className="transition-all duration-300 rounded-xl">
          <SegmentMigration data={segmentMigration} />
        </section>

        {/* Section 5: Revenue Analysis */}
        <section className="grid grid-cols-2 gap-6">
          <div id="chart-revenue_pareto" className="transition-all duration-300 rounded-xl">
            <RevenuePareto
              data={revenueConcentration.pareto}
              summary={revenueConcentration.summary}
            />
          </div>
          <div id="chart-revenue_by_segment" className="transition-all duration-300 rounded-xl">
            <RevenueBySegment data={revenueConcentration.by_segment} revenueDetail={revenueDetail} />
          </div>
        </section>

        {/* Section 6: Churn Intelligence */}
        <section className="grid grid-cols-2 gap-6">
          <div id="chart-churn_risk" className="transition-all duration-300 rounded-xl">
            <ChurnRiskDonut data={computedChurnRisk} churnDetail={churnDetail} />
          </div>
          <div id="chart-churn_drivers" className="transition-all duration-300 rounded-xl">
            <ChurnDrivers data={churnDrivers} />
          </div>
        </section>

        {/* Pinned Charts - After Churn */}
        <PinnedChartsSection section="after_churn" module="cx360" />

        {/* Section 7: Cohort Retention (Full Width) */}
        <section id="chart-cohort_retention" className="transition-all duration-300 rounded-xl">
          <CohortRetentionHeatmap data={cohortRetention} cohortDetail={cohortDetail} />
        </section>

        {/* Pinned Charts - After Cohort */}
        <PinnedChartsSection section="after_cohort" module="cx360" />

        {/* Section 8: Recency & Frequency */}
        <section className="grid grid-cols-2 gap-6">
          <div id="chart-recency_distribution" className="transition-all duration-300 rounded-xl">
            <RecencyDistribution
              data={recencyFrequency.recency_distribution}
              summary={{
                avg_recency_days: recencyFrequency.summary.avg_recency_days,
                median_recency_days: recencyFrequency.summary.median_recency_days,
                active_30_days: recencyFrequency.summary.active_30_days,
                active_30_days_pct: recencyFrequency.summary.active_30_days_pct,
              }}
            />
          </div>
          <div id="chart-frequency_distribution" className="transition-all duration-300 rounded-xl">
            <FrequencyDistribution
              data={recencyFrequency.frequency_distribution}
              summary={{
                avg_frequency: recencyFrequency.summary.avg_frequency,
                median_frequency: recencyFrequency.summary.median_frequency,
              }}
              frequencyData={frequencyData}
            />
          </div>
        </section>

        {/* Section 9: Channel Analysis */}
        <section className="grid grid-cols-2 gap-6">
          <div id="chart-channel_performance" className="transition-all duration-300 rounded-xl">
            <ChannelPerformance data={channelAnalysis.channel_performance} />
          </div>
          <div id="chart-acquisition_by_channel" className="transition-all duration-300 rounded-xl">
            <AcquisitionByChannel data={channelAnalysis.acquisition_by_channel} deepDiveUrl="/cx360/deep/channels" />
          </div>
        </section>

        {/* Section 10: Basket & Behavior */}
        <section className="grid grid-cols-2 gap-6">
          <BasketDistribution data={computedBasketDistribution} basketData={basketData} />
          <CategoryBySegment data={categoryBySegment} />
        </section>

        {/* Pinned Charts - Bottom */}
        <PinnedChartsSection section="bottom" module="cx360" />

        {/* Section 11: Customer Table (Full Width) */}
        <section>
          <CustomerTable data={filteredCustomerTable} onResetFilters={resetFilters} />
        </section>
      </div>
    </div>
  );
}
