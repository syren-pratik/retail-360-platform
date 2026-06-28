// Force dynamic rendering — the tenant cookie is read per request to swap
// grocery ↔ apparel cache.
export const dynamic = 'force-dynamic';

import DashboardContent from './DashboardContent';
import { loadCache } from '@/app/lib/cache-loader';

import {
  transformKPIs,
  transformCLVTiers,
  transformRFMCustomers,
  transformChurnRisk,
  transformChurnDrivers,
  transformCohortRetention,
  transformBasketDistribution,
  transformBasketData,
  transformFrequencyData,
  transformCategoryBySegment,
  transformCustomerRecords,
  transformDimensions,
  transformSegmentMigration,
  transformRevenueConcentration,
  transformRecencyFrequency,
  transformChannelAnalysis,
  transformAtRiskAlerts,
  transformCohortDetail,
  transformChurnDetail,
  transformRevenueDetail,
  transformCLVDetail,
  transformRFMDetail,
} from '@/app/lib/cache-transform';

export default async function CX360Page({ searchParams }: { searchParams: { expand?: string } }) {
  // Parallel load — loadCache reads tenant cookie + falls back to grocery
  // if the apparel mirror doesn't exist for a given file.
  const [
    kpisData,
    clvDistributionData,
    rfmSampleData,
    churnRiskData,
    churnDriversData,
    cohortRetentionData,
    basketDistributionData,
    categoryBySegmentData,
    customerTableData,
    dimensionsData,
    segmentMigrationData,
    revenueConcentrationData,
    recencyFrequencyData,
    channelAnalysisData,
    atRiskAlertsData,
    frequencyDetailData,
    cohortDetailData,
    churnDetailData,
    revenueDetailData,
    clvDetailData,
    rfmDetailData,
    returnsByReasonData,
    brandAffinityData,
    returnReasonWaterfallData,
  ] = await Promise.all([
    loadCache('cx360_kpis.json'),
    loadCache('cx360_clv_distribution.json'),
    loadCache('cx360_rfm_sample.json'),
    loadCache('cx360_churn_risk.json'),
    loadCache('cx360_churn_drivers.json'),
    loadCache('cx360_cohort_retention.json'),
    loadCache('cx360_basket_distribution.json'),
    loadCache('cx360_category_by_segment.json'),
    loadCache('cx360_customer_table.json'),
    loadCache('dimensions.json'),
    loadCache('cx360_segment_migration.json'),
    loadCache('cx360_revenue_concentration.json'),
    loadCache('cx360_recency_frequency.json'),
    loadCache('cx360_channel_analysis.json'),
    loadCache('cx360_at_risk_alerts.json'),
    loadCache('cx360_frequency_detail.json'),
    loadCache('cx360_cohort_detail.json'),
    loadCache('cx360_churn_detail.json'),
    loadCache('cx360_revenue_detail.json'),
    loadCache('cx360_clv_detail.json'),
    loadCache('cx360_rfm_detail.json'),
    loadCache('cx360_returns_by_reason.json').catch(() => null),
    loadCache('cx360_brand_affinity.json').catch(() => null),
    loadCache('cx360_return_reason_waterfall.json').catch(() => null),
  ]);

  // Transform Databricks data to expected TypeScript types
  const kpis = transformKPIs(kpisData);
  const clvDistribution = transformCLVTiers(clvDistributionData as unknown[]);
  const rfmSample = transformRFMCustomers(rfmSampleData as unknown[]);
  const churnRisk = transformChurnRisk(churnRiskData as unknown[]);
  const churnDrivers = transformChurnDrivers(churnDriversData as unknown[]);
  const cohortRetention = transformCohortRetention(cohortRetentionData as unknown[]);
  const basketDistribution = transformBasketDistribution(
    (basketDistributionData as unknown as Record<string, unknown>).distribution as unknown[] ?? [],
  );
  const basketData = transformBasketData(basketDistributionData);
  const categoryBySegment = transformCategoryBySegment(categoryBySegmentData);
  const customerTable = transformCustomerRecords(customerTableData as unknown[]);
  const dimensions = transformDimensions(dimensionsData as unknown[]);
  const segmentMigration = transformSegmentMigration(segmentMigrationData);
  const revenueConcentration = transformRevenueConcentration(revenueConcentrationData);
  const recencyFrequency = transformRecencyFrequency(recencyFrequencyData);
  const channelAnalysis = transformChannelAnalysis(channelAnalysisData);
  const atRiskAlerts = transformAtRiskAlerts(atRiskAlertsData);
  const frequencyData = transformFrequencyData(frequencyDetailData);
  const cohortDetail = transformCohortDetail(cohortDetailData);
  const churnDetail = transformChurnDetail(churnDetailData);
  const revenueDetail = transformRevenueDetail(revenueDetailData);
  const clvDetail = transformCLVDetail(clvDetailData);
  const rfmDetail = transformRFMDetail(rfmDetailData);

  return (
    <DashboardContent
      expandChart={searchParams.expand}
      kpis={kpis}
      clvDistribution={clvDistribution}
      rfmSample={rfmSample}
      churnRisk={churnRisk}
      churnDrivers={churnDrivers}
      cohortRetention={cohortRetention}
      basketDistribution={basketDistribution}
      basketData={basketData}
      categoryBySegment={categoryBySegment}
      customerTable={customerTable}
      dimensions={dimensions}
      segmentMigration={segmentMigration}
      revenueConcentration={revenueConcentration}
      recencyFrequency={recencyFrequency}
      channelAnalysis={channelAnalysis}
      atRiskAlerts={atRiskAlerts}
      frequencyData={frequencyData}
      cohortDetail={cohortDetail}
      churnDetail={churnDetail}
      revenueDetail={revenueDetail}
      clvDetail={clvDetail}
      rfmDetail={rfmDetail}
      returnsByReason={returnsByReasonData as unknown as Parameters<typeof DashboardContent>[0]['returnsByReason']}
      brandAffinity={brandAffinityData as unknown as Parameters<typeof DashboardContent>[0]['brandAffinity']}
      returnReasonWaterfall={returnReasonWaterfallData as unknown as Parameters<typeof DashboardContent>[0]['returnReasonWaterfall']}
    />
  );
}
