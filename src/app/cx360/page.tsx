// Force dynamic rendering to avoid static generation issues with JSON imports
export const dynamic = 'force-dynamic';

import DashboardContent from './DashboardContent';

// Import raw cache data
import kpisData from '../../../cache/cx360_kpis.json';
import clvDistributionData from '../../../cache/cx360_clv_distribution.json';
import rfmSampleData from '../../../cache/cx360_rfm_sample.json';
import churnRiskData from '../../../cache/cx360_churn_risk.json';
import churnDriversData from '../../../cache/cx360_churn_drivers.json';
import cohortRetentionData from '../../../cache/cx360_cohort_retention.json';
import basketDistributionData from '../../../cache/cx360_basket_distribution.json';
import categoryBySegmentData from '../../../cache/cx360_category_by_segment.json';
import customerTableData from '../../../cache/cx360_customer_table.json';
import dimensionsData from '../../../cache/dimensions.json';
import segmentMigrationData from '../../../cache/cx360_segment_migration.json';
import revenueConcentrationData from '../../../cache/cx360_revenue_concentration.json';
import recencyFrequencyData from '../../../cache/cx360_recency_frequency.json';
import channelAnalysisData from '../../../cache/cx360_channel_analysis.json';
import atRiskAlertsData from '../../../cache/cx360_at_risk_alerts.json';

// Import transformation functions
import {
  transformKPIs,
  transformCLVTiers,
  transformRFMCustomers,
  transformChurnRisk,
  transformChurnDrivers,
  transformCohortRetention,
  transformBasketDistribution,
  transformCategoryBySegment,
  transformCustomerRecords,
  transformDimensions,
  transformSegmentMigration,
  transformRevenueConcentration,
  transformRecencyFrequency,
  transformChannelAnalysis,
  transformAtRiskAlerts,
} from '@/app/lib/cache-transform';

// Transform Databricks data to expected TypeScript types
const kpis = transformKPIs(kpisData as unknown);
const clvDistribution = transformCLVTiers(clvDistributionData as unknown[]);
const rfmSample = transformRFMCustomers(rfmSampleData as unknown[]);
const churnRisk = transformChurnRisk(churnRiskData as unknown[]);
const churnDrivers = transformChurnDrivers(churnDriversData as unknown[]);
const cohortRetention = transformCohortRetention(cohortRetentionData as unknown[]);
const basketDistribution = transformBasketDistribution(basketDistributionData as unknown[]);
const categoryBySegment = transformCategoryBySegment(categoryBySegmentData as unknown[]);
const customerTable = transformCustomerRecords(customerTableData as unknown[]);
const dimensions = transformDimensions(dimensionsData as unknown[]);
const segmentMigration = transformSegmentMigration(segmentMigrationData as unknown);
const revenueConcentration = transformRevenueConcentration(revenueConcentrationData as unknown);
const recencyFrequency = transformRecencyFrequency(recencyFrequencyData as unknown);
const channelAnalysis = transformChannelAnalysis(channelAnalysisData as unknown);
const atRiskAlerts = transformAtRiskAlerts(atRiskAlertsData as unknown);

export default function CX360Page() {
  return (
    <DashboardContent
      kpis={kpis}
      clvDistribution={clvDistribution}
      rfmSample={rfmSample}
      churnRisk={churnRisk}
      churnDrivers={churnDrivers}
      cohortRetention={cohortRetention}
      basketDistribution={basketDistribution}
      categoryBySegment={categoryBySegment}
      customerTable={customerTable}
      dimensions={dimensions}
      segmentMigration={segmentMigration}
      revenueConcentration={revenueConcentration}
      recencyFrequency={recencyFrequency}
      channelAnalysis={channelAnalysis}
      atRiskAlerts={atRiskAlerts}
    />
  );
}
