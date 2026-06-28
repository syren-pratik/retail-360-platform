import {
  CLVTierData,
  ChurnRiskData,
  CohortRetentionMatrix,
  RevenueConcentrationData,
  SegmentMigrationData,
  RecencyFrequencyData,
  ChannelAnalysisData,
  AtRiskAlertsData,
} from './types';
import { formatMoneyAuto } from './format-money';

export interface Insight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  description: string;
  metric?: string;
  source: string;
  action?: string;
  relatedChart?: string;
}

interface InsightEngineData {
  clvDistribution: CLVTierData[];
  churnRisk: ChurnRiskData[];
  cohortRetention: CohortRetentionMatrix[];
  revenueConcentration: RevenueConcentrationData;
  segmentMigration: SegmentMigrationData;
  recencyFrequency: RecencyFrequencyData;
  channelAnalysis: ChannelAnalysisData;
  atRiskAlerts: AtRiskAlertsData;
}

// Generate unique ID for insights
const generateId = () => `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Analyze CLV Distribution
function analyzeCLVDistribution(data: CLVTierData[]): Insight[] {
  const insights: Insight[] = [];
  const totalCustomers = data.reduce((sum, d) => sum + d.customer_count, 0);

  // Check if any tier has > 30% concentration
  data.forEach((tier) => {
    const pct = (tier.customer_count / totalCustomers) * 100;
    if (pct > 30) {
      insights.push({
        id: generateId(),
        type: 'risk',
        severity: tier.clv_tier === 'At-Risk' ? 'critical' : 'warning',
        title: `${tier.clv_tier} tier dominates customer base`,
        description: `${tier.clv_tier} holds ${pct.toFixed(0)}% of customers. ${tier.clv_tier === 'At-Risk' ? 'Urgent attention needed.' : 'Consider diversifying.'}`,
        metric: `${pct.toFixed(0)}%`,
        source: 'clv_distribution',
        action: tier.clv_tier === 'At-Risk' ? 'Launch retention campaigns' : 'Develop tier upgrade programs',
        relatedChart: 'clv_distribution',
      });
    }
  });

  // Check if At-Risk is larger than healthy tiers
  const atRiskTier = data.find((d) => d.clv_tier === 'At-Risk');
  const healthyTiers = data.filter((d) => d.clv_tier !== 'At-Risk');
  if (atRiskTier) {
    const largerThanAll = healthyTiers.every((t) => atRiskTier.customer_count > t.customer_count);
    if (largerThanAll && healthyTiers.length > 0) {
      insights.push({
        id: generateId(),
        type: 'anomaly',
        severity: 'critical',
        title: 'At-Risk is your largest segment',
        description: `${atRiskTier.customer_count.toLocaleString('en-IN')} customers need immediate attention to prevent churn.`,
        metric: atRiskTier.customer_count.toLocaleString('en-IN'),
        source: 'clv_distribution',
        action: 'Prioritize win-back campaigns',
        relatedChart: 'clv_distribution',
      });
    }
  }

  return insights;
}

// Analyze Churn Risk
function analyzeChurnRisk(data: ChurnRiskData[]): Insight[] {
  const insights: Insight[] = [];
  const totalCustomers = data.reduce((sum, d) => sum + d.customer_count, 0);

  // Calculate weighted average churn probability
  const weightedProb = data.reduce((sum, d) => sum + d.avg_prob_30d * d.customer_count, 0) / totalCustomers;

  if (weightedProb > 0.25) {
    insights.push({
      id: generateId(),
      type: 'risk',
      severity: 'critical',
      title: 'Churn probability dangerously high',
      description: `Average 30-day churn probability is ${(weightedProb * 100).toFixed(0)}%, well above the 25% threshold.`,
      metric: `${(weightedProb * 100).toFixed(0)}%`,
      source: 'churn_risk',
      action: 'Implement emergency retention measures',
      relatedChart: 'churn_risk',
    });
  }

  // Check Critical + High risk concentration
  const criticalHigh = data.filter((d) => d.churn_risk_tier === 'Critical' || d.churn_risk_tier === 'High');
  const criticalHighPct = (criticalHigh.reduce((sum, d) => sum + d.customer_count, 0) / totalCustomers) * 100;

  if (criticalHighPct > 30) {
    insights.push({
      id: generateId(),
      type: 'risk',
      severity: 'warning',
      title: `${criticalHighPct.toFixed(0)}% in high churn risk`,
      description: `Nearly a third of customers are at high or critical churn risk. Revenue impact could be significant.`,
      metric: `${criticalHighPct.toFixed(0)}%`,
      source: 'churn_risk',
      action: 'Segment and target with personalized offers',
      relatedChart: 'churn_risk',
    });
  }

  return insights;
}

// Analyze Cohort Retention
function analyzeCohortRetention(data: CohortRetentionMatrix[]): Insight[] {
  const insights: Insight[] = [];

  if (!data || data.length < 2) return insights;

  // Filter out cohorts with invalid data
  const validCohorts = data.filter((c) => c && c.cohort_month && c.retention && c.retention.length > 0);
  if (validCohorts.length < 2) return insights;

  // Calculate average M1 retention across all cohorts
  const m1Values = validCohorts.filter((c) => c.retention.length > 1).map((c) => c.retention[1]);
  if (m1Values.length === 0) return insights;
  const avgM1 = m1Values.reduce((sum, v) => sum + (v || 0), 0) / m1Values.length;

  // Check if latest cohort has lower M1 retention
  const latestCohort = validCohorts[validCohorts.length - 1];
  if (latestCohort && latestCohort.retention.length > 1 && latestCohort.retention[1] !== null) {
    const latestM1 = latestCohort.retention[1];
    if (latestM1 < avgM1 - 5) {
      insights.push({
        id: generateId(),
        type: 'trend',
        severity: 'warning',
        title: 'Recent cohort retention declining',
        description: `${formatMonth(latestCohort.cohort_month)} cohort retaining ${(avgM1 - latestM1).toFixed(0)}% worse than average at M1.`,
        metric: `${latestM1.toFixed(0)}%`,
        source: 'cohort_retention',
        action: 'Investigate onboarding experience',
        relatedChart: 'cohort_retention',
      });
    }
  }

  // Check for cohorts showing recovery at M3+ (limit to avoid too many insights)
  let recoveryCount = 0;
  for (const cohort of validCohorts) {
    if (recoveryCount >= 2) break; // Limit to 2 recovery insights
    if (cohort && cohort.cohort_month && cohort.retention && cohort.retention.length >= 4) {
      const m2 = cohort.retention[2];
      const m3 = cohort.retention[3];
      if (m2 !== null && m3 !== null && m3 > m2) {
        insights.push({
          id: generateId(),
          type: 'opportunity',
          severity: 'positive',
          title: `${formatMonth(cohort.cohort_month)} showing recovery`,
          description: `This cohort improved retention from M2 (${m2.toFixed(0)}%) to M3 (${m3.toFixed(0)}%). Identify success factors.`,
          metric: `+${(m3 - m2).toFixed(1)}%`,
          source: 'cohort_retention',
          relatedChart: 'cohort_retention',
        });
        recoveryCount++;
      }
    }
  }

  return insights;
}

// Analyze Revenue Concentration
function analyzeRevenueConcentration(data: RevenueConcentrationData): Insight[] {
  const insights: Insight[] = [];
  const top10Pct = data.summary?.top_10_pct_revenue ?? 0;

  if (top10Pct === 0) return insights;

  // Pareto insight (always generate)
  const paretoStrength = top10Pct > 50 ? 'strong' : top10Pct > 35 ? 'moderate' : 'weak';
  insights.push({
    id: generateId(),
    type: paretoStrength === 'strong' ? 'risk' : 'trend',
    severity: paretoStrength === 'strong' ? 'warning' : 'info',
    title: `Top 10% drive ${top10Pct.toFixed(0)}% of revenue`,
    description: `Pareto effect is ${paretoStrength}. ${paretoStrength === 'strong' ? 'High dependency on few customers.' : 'Relatively balanced revenue distribution.'}`,
    metric: `${top10Pct.toFixed(0)}%`,
    source: 'revenue_concentration',
    action: paretoStrength === 'strong' ? 'Grow mid-tier customer spend' : undefined,
    relatedChart: 'revenue_pareto',
  });

  // High Gini coefficient
  if (data.summary.gini_coefficient > 0.7) {
    insights.push({
      id: generateId(),
      type: 'risk',
      severity: 'warning',
      title: 'Revenue inequality very high',
      description: `Gini coefficient of ${data.summary.gini_coefficient.toFixed(2)} indicates severe revenue concentration risk.`,
      metric: data.summary.gini_coefficient.toFixed(2),
      source: 'revenue_concentration',
      action: 'Diversify customer revenue base',
      relatedChart: 'revenue_pareto',
    });
  }

  return insights;
}

// Analyze Segment Migration
function analyzeSegmentMigration(data: SegmentMigrationData): Insight[] {
  const insights: Insight[] = [];

  // Net migration direction
  if (data.summary.downgraded > data.summary.upgraded) {
    const netNegative = data.summary.downgraded - data.summary.upgraded;
    insights.push({
      id: generateId(),
      type: 'trend',
      severity: 'warning',
      title: 'Net negative segment migration',
      description: `${netNegative.toLocaleString('en-IN')} more customers downgraded than upgraded this quarter.`,
      metric: `-${netNegative.toLocaleString('en-IN')}`,
      source: 'segment_migration',
      action: 'Focus on tier upgrade programs',
      relatedChart: 'segment_migration',
    });
  } else if (data.summary.upgraded > data.summary.downgraded) {
    const netPositive = data.summary.upgraded - data.summary.downgraded;
    insights.push({
      id: generateId(),
      type: 'opportunity',
      severity: 'positive',
      title: 'Net positive segment migration',
      description: `${netPositive.toLocaleString('en-IN')} more customers upgraded than downgraded this quarter.`,
      metric: `+${netPositive.toLocaleString('en-IN')}`,
      source: 'segment_migration',
      relatedChart: 'segment_migration',
    });
  }

  // High churn from specific tiers
  const totalByTier: Record<string, number> = {};
  data.flows.forEach((flow) => {
    totalByTier[flow.from] = (totalByTier[flow.from] || 0) + flow.count;
  });

  data.flows
    .filter((flow) => flow.to === 'Lost')
    .forEach((flow) => {
      const tierTotal = totalByTier[flow.from] || 1;
      const churnPct = (flow.count / tierTotal) * 100;
      if (churnPct > 15 && flow.from !== 'Lost') {
        insights.push({
          id: generateId(),
          type: 'risk',
          severity: churnPct > 25 ? 'critical' : 'warning',
          title: `${flow.from} tier losing ${churnPct.toFixed(0)}% to churn`,
          description: `${flow.count.toLocaleString('en-IN')} ${flow.from} customers churned this quarter. Investigate causes.`,
          metric: `${churnPct.toFixed(0)}%`,
          source: 'segment_migration',
          action: `Target ${flow.from} with retention campaign`,
          relatedChart: 'segment_migration',
        });
      }
    });

  return insights;
}

// Analyze Recency/Frequency
function analyzeRecencyFrequency(data: RecencyFrequencyData): Insight[] {
  const insights: Insight[] = [];

  // Dormant customers (90+ days)
  const dormantBuckets = data.recency_distribution.filter((d) =>
    d.range.includes('90') || d.range.includes('180') || d.range.includes('+')
  );
  const dormantPct = dormantBuckets.reduce((sum, d) => sum + d.pct, 0);

  if (dormantPct > 20) {
    insights.push({
      id: generateId(),
      type: 'risk',
      severity: dormantPct > 30 ? 'critical' : 'warning',
      title: `${dormantPct.toFixed(0)}% customers dormant`,
      description: `Over ${dormantPct.toFixed(0)}% haven't purchased in 90+ days. Re-engagement needed.`,
      metric: `${dormantPct.toFixed(0)}%`,
      source: 'recency_distribution',
      action: 'Launch win-back email campaign',
      relatedChart: 'recency_distribution',
    });
  }

  // Low frequency customers
  const lowFreqBuckets = data.frequency_distribution.filter((d) =>
    d.range.includes('1 order') || d.range.includes('2-3')
  );
  const lowFreqPct = lowFreqBuckets.reduce((sum, d) => sum + d.pct, 0);

  if (lowFreqPct > 50) {
    insights.push({
      id: generateId(),
      type: 'opportunity',
      severity: 'info',
      title: 'Repeat purchase opportunity',
      description: `${lowFreqPct.toFixed(0)}% of customers have ≤3 orders. Focus on increasing purchase frequency.`,
      metric: `${lowFreqPct.toFixed(0)}%`,
      source: 'frequency_distribution',
      action: 'Implement loyalty program incentives',
      relatedChart: 'frequency_distribution',
    });
  }

  return insights;
}

// Analyze Channel Performance
function analyzeChannelAnalysis(data: ChannelAnalysisData): Insight[] {
  const insights: Insight[] = [];

  // Find best and worst performing channels
  const channels = data.channel_performance;
  if (!channels || channels.length === 0) return insights;

  const bestRetention = channels.reduce((best, ch) =>
    ch.retention_rate > best.retention_rate ? ch : best, channels[0]
  );
  const worstRetention = channels.reduce((worst, ch) =>
    ch.retention_rate < worst.retention_rate ? ch : worst, channels[0]
  );

  if (bestRetention.retention_rate - worstRetention.retention_rate > 15) {
    insights.push({
      id: generateId(),
      type: 'opportunity',
      severity: 'info',
      title: `${bestRetention.channel} leads in retention`,
      description: `${bestRetention.channel} retention (${bestRetention.retention_rate}%) is ${(bestRetention.retention_rate - worstRetention.retention_rate).toFixed(0)}% higher than ${worstRetention.channel}.`,
      metric: `${bestRetention.retention_rate}%`,
      source: 'channel_performance',
      action: `Apply ${bestRetention.channel} success factors to other channels`,
      relatedChart: 'channel_performance',
    });
  }

  // Multi-channel value
  const multiChannelStats = data.multi_channel;
  const multiChannelLift = (multiChannelStats.three_plus_channels.avg_clv / multiChannelStats.single_channel.avg_clv - 1) * 100;

  if (multiChannelLift > 100) {
    insights.push({
      id: generateId(),
      type: 'opportunity',
      severity: 'positive',
      title: 'Multi-channel customers 3x more valuable',
      description: `Customers using 3+ channels have ${multiChannelLift.toFixed(0)}% higher CLV. Drive cross-channel engagement.`,
      metric: `${multiChannelLift.toFixed(0)}%`,
      source: 'channel_analysis',
      action: 'Incentivize second-channel adoption',
      relatedChart: 'channel_performance',
    });
  }

  // Best ROI acquisition channel
  const channelsWithROI = data.acquisition_by_channel.filter((ch) => ch.ltv_cac_ratio !== null);
  const bestROI = channelsWithROI.length > 0
    ? channelsWithROI.reduce((best, ch) =>
        (ch.ltv_cac_ratio || 0) > (best.ltv_cac_ratio || 0) ? ch : best, channelsWithROI[0]
      )
    : null;

  if (bestROI && bestROI.ltv_cac_ratio && bestROI.ltv_cac_ratio > 5) {
    insights.push({
      id: generateId(),
      type: 'opportunity',
      severity: 'positive',
      title: `${bestROI.channel} has ${bestROI.ltv_cac_ratio.toFixed(1)}x LTV/CAC`,
      description: `Excellent acquisition efficiency. Consider increasing ${bestROI.channel} budget.`,
      metric: `${bestROI.ltv_cac_ratio.toFixed(1)}x`,
      source: 'acquisition_channel',
      action: `Scale ${bestROI.channel} acquisition spend`,
      relatedChart: 'acquisition_by_channel',
    });
  }

  return insights;
}

// Analyze At-Risk Alerts
function analyzeAtRiskAlerts(data: AtRiskAlertsData): Insight[] {
  const insights: Insight[] = [];

  // High-value at-risk revenue
  const revenueAtRisk = data.summary.total_revenue_at_risk;
  if (revenueAtRisk > 10000000) { // > 1 Cr
    insights.push({
      id: generateId(),
      type: 'risk',
      severity: 'critical',
      title: `${formatMoneyAuto(revenueAtRisk)} revenue at risk`,
      description: `${data.summary.high_priority} high-priority customers need immediate attention.`,
      metric: formatMoneyAuto(revenueAtRisk),
      source: 'at_risk_alerts',
      action: 'Activate high-touch retention for top accounts',
      relatedChart: 'at_risk_alerts',
    });
  }

  return insights;
}

// Helper function to format month
function formatMonth(monthStr: string | undefined | null): string {
  if (!monthStr || typeof monthStr !== 'string') return 'Unknown';
  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;
  const [year, month] = parts;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIndex = parseInt(month) - 1;
  if (monthIndex < 0 || monthIndex >= 12) return monthStr;
  return `${months[monthIndex]} ${year?.slice(2) || ''}`;
}

// Main insight generation function
export function generateInsights(data: InsightEngineData): Insight[] {
  const allInsights: Insight[] = [];

  // Run all analyzers
  allInsights.push(...analyzeCLVDistribution(data.clvDistribution));
  allInsights.push(...analyzeChurnRisk(data.churnRisk));
  allInsights.push(...analyzeCohortRetention(data.cohortRetention));
  allInsights.push(...analyzeRevenueConcentration(data.revenueConcentration));
  allInsights.push(...analyzeSegmentMigration(data.segmentMigration));
  allInsights.push(...analyzeRecencyFrequency(data.recencyFrequency));
  allInsights.push(...analyzeChannelAnalysis(data.channelAnalysis));
  allInsights.push(...analyzeAtRiskAlerts(data.atRiskAlerts));

  // Sort by severity (critical > warning > info > positive)
  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    positive: 3,
  };

  allInsights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Return max 8 insights
  return allInsights.slice(0, 8);
}

// Get insights relevant to a specific chart
export function getInsightsForChart(insights: Insight[], chartId: string): Insight[] {
  return insights.filter((insight) => insight.relatedChart === chartId);
}

// ============================================
// DEMAND FORECASTING INSIGHT ENGINE
// ============================================

interface DepartmentAccuracy {
  department: string;
  accuracy: number;
  mape: number;
  bias: number;
  skuCount: number;
  trend: number;
}

interface LostSalesItem {
  sku: string;
  name: string;
  department: string;
  lostUnits: number;
  lostRevenue: number;
  stockoutDays: number;
  reason: string;
}

interface ModelComparisonItem {
  model: string;
  mape: number;
  accuracy: number;
  rmse: number;
  mae: number;
  trainingTime: string;
  isActive: boolean;
}

interface DemandInsightData {
  accuracyByDept: DepartmentAccuracy[];
  lostSales: {
    top_skus: LostSalesItem[];
    trend: { date: string; fulfilled: number; lost: number }[];
  };
  modelComparison: ModelComparisonItem[];
  kpis: {
    forecastAccuracy: number;
    mape: number;
    stockoutRate: number;
    excessInventoryPct: number;
  };
}

// Analyze department accuracy
function analyzeDeptAccuracy(data: DepartmentAccuracy[]): Insight[] {
  const insights: Insight[] = [];

  // Accuracy warnings
  data.forEach((dept) => {
    if (dept.mape > 15) {
      insights.push({
        id: generateId(),
        type: 'risk',
        severity: 'warning',
        title: `${dept.department} accuracy is poor`,
        description: `MAPE of ${dept.mape}% — well above the 10% target. Review model features.`,
        metric: `${dept.mape}%`,
        source: 'accuracy_by_dept',
        action: 'Review feature engineering for this department',
        relatedChart: 'accuracy-heatmap',
      });
    }
  });

  // Bias alerts
  data.forEach((dept) => {
    if (Math.abs(dept.bias) > 10) {
      insights.push({
        id: generateId(),
        type: 'anomaly',
        severity: 'critical',
        title: `${dept.department} forecast bias`,
        description: `Model ${dept.bias > 0 ? 'over' : 'under'}-forecasting by ${Math.abs(dept.bias).toFixed(1)}%. Systematic error needs correction.`,
        metric: `${dept.bias > 0 ? '+' : ''}${dept.bias.toFixed(1)}%`,
        source: 'accuracy_by_dept',
        action: 'Investigate bias source and adjust model',
        relatedChart: 'accuracy-trend',
      });
    }
  });

  // Accuracy improving trend
  const improvingDepts = data.filter((d) => d.trend > 2);
  if (improvingDepts.length > 0) {
    const bestImproving = improvingDepts.reduce((a, b) => a.trend > b.trend ? a : b);
    insights.push({
      id: generateId(),
      type: 'opportunity',
      severity: 'positive',
      title: `${bestImproving.department} accuracy improving`,
      description: `Forecast accuracy improved by ${bestImproving.trend.toFixed(1)}% this period. Identify success factors.`,
      metric: `+${bestImproving.trend.toFixed(1)}%`,
      source: 'accuracy_by_dept',
      relatedChart: 'accuracy-trend',
    });
  }

  return insights;
}

// Analyze lost sales
function analyzeLostSales(lostSales: DemandInsightData['lostSales']): Insight[] {
  const insights: Insight[] = [];

  if (!lostSales?.top_skus || lostSales.top_skus.length === 0) return insights;

  const totalLost = lostSales.top_skus.reduce((sum, s) => sum + s.lostRevenue, 0);

  if (totalLost > 500000) {
    insights.push({
      id: generateId(),
      type: 'risk',
      severity: 'critical',
      title: `${formatMoneyAuto(totalLost)} in lost sales`,
      description: `Top driver: ${lostSales.top_skus[0]?.name || 'Unknown'} in ${lostSales.top_skus[0]?.department || 'Unknown'}`,
      metric: formatMoneyAuto(totalLost),
      source: 'lost_sales',
      action: 'Review inventory levels for top SKUs',
      relatedChart: 'lost-sales',
    });
  }

  // Identify supply chain issues
  const supplyDelayCount = lostSales.top_skus.filter((s) => s.reason === 'Supply delay').length;
  if (supplyDelayCount >= 3) {
    insights.push({
      id: generateId(),
      type: 'risk',
      severity: 'warning',
      title: 'Supply chain delays affecting multiple SKUs',
      description: `${supplyDelayCount} SKUs impacted by supply delays. Coordinate with procurement.`,
      metric: `${supplyDelayCount} SKUs`,
      source: 'lost_sales',
      action: 'Escalate to supply chain team',
      relatedChart: 'lost-sales-skus',
    });
  }

  // Forecast error pattern
  const forecastErrorCount = lostSales.top_skus.filter((s) => s.reason === 'Forecast error').length;
  if (forecastErrorCount >= 2) {
    insights.push({
      id: generateId(),
      type: 'anomaly',
      severity: 'warning',
      title: 'Forecast errors causing stockouts',
      description: `${forecastErrorCount} SKUs with lost sales due to forecast errors. Model refinement needed.`,
      metric: `${forecastErrorCount} SKUs`,
      source: 'lost_sales',
      action: 'Review forecast model for these SKUs',
      relatedChart: 'lost-sales-skus',
    });
  }

  return insights;
}

// Analyze model performance
function analyzeModelPerformance(models: ModelComparisonItem[]): Insight[] {
  const insights: Insight[] = [];

  if (!models || models.length === 0) return insights;

  const activeModel = models.find((m) => m.isActive);
  const bestModel = models.reduce((a, b) => a.accuracy > b.accuracy ? a : b, models[0]);

  // Check if active model is not the best
  if (activeModel && bestModel && activeModel.model !== bestModel.model) {
    const accuracyGap = bestModel.accuracy - activeModel.accuracy;
    if (accuracyGap > 1) {
      insights.push({
        id: generateId(),
        type: 'opportunity',
        severity: 'info',
        title: `${bestModel.model} outperforms active model`,
        description: `${bestModel.model} shows ${accuracyGap.toFixed(1)}% better accuracy. Consider switching.`,
        metric: `+${accuracyGap.toFixed(1)}%`,
        source: 'model_comparison',
        action: 'Evaluate model switch in production',
        relatedChart: 'model-comparison',
      });
    }
  }

  return insights;
}

// Analyze KPIs
function analyzeDemandKPIs(kpis: DemandInsightData['kpis']): Insight[] {
  const insights: Insight[] = [];

  // High stockout rate
  if (kpis.stockoutRate > 5) {
    insights.push({
      id: generateId(),
      type: 'risk',
      severity: kpis.stockoutRate > 10 ? 'critical' : 'warning',
      title: `Stockout rate at ${kpis.stockoutRate}%`,
      description: `Above acceptable threshold of 5%. Revenue impact likely significant.`,
      metric: `${kpis.stockoutRate}%`,
      source: 'demand_kpis',
      action: 'Review safety stock levels',
      relatedChart: 'forecast-vs-actual',
    });
  }

  // High excess inventory
  if (kpis.excessInventoryPct > 15) {
    insights.push({
      id: generateId(),
      type: 'risk',
      severity: 'warning',
      title: `${kpis.excessInventoryPct}% excess inventory`,
      description: `Working capital tied up in excess stock. Consider promotional clearance.`,
      metric: `${kpis.excessInventoryPct}%`,
      source: 'demand_kpis',
      action: 'Run clearance promotions',
      relatedChart: 'forecast-vs-actual',
    });
  }

  // Good forecast accuracy
  if (kpis.forecastAccuracy > 95) {
    insights.push({
      id: generateId(),
      type: 'opportunity',
      severity: 'positive',
      title: 'Excellent forecast accuracy',
      description: `Overall accuracy of ${kpis.forecastAccuracy}% exceeds target. Model performing well.`,
      metric: `${kpis.forecastAccuracy}%`,
      source: 'demand_kpis',
      relatedChart: 'accuracy-heatmap',
    });
  }

  return insights;
}

// Main demand insight generation function
export function generateDemandInsights(data: DemandInsightData): Insight[] {
  const allInsights: Insight[] = [];

  // Run all demand analyzers
  if (data.accuracyByDept) {
    allInsights.push(...analyzeDeptAccuracy(data.accuracyByDept));
  }
  if (data.lostSales) {
    allInsights.push(...analyzeLostSales(data.lostSales));
  }
  if (data.modelComparison) {
    allInsights.push(...analyzeModelPerformance(data.modelComparison));
  }
  if (data.kpis) {
    allInsights.push(...analyzeDemandKPIs(data.kpis));
  }

  // Sort by severity
  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    positive: 3,
  };

  allInsights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Return max 6 insights for demand
  return allInsights.slice(0, 6);
}
