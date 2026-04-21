'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Package,
  Activity,
  ChevronRight,
  Maximize2,
  X,
} from 'lucide-react';
import { useDemand } from '@/app/context/DemandContext';
import DemandFilterBar from './DemandFilterBar';
import ForecastVsActual from './ForecastVsActual';
import AccuracyHeatmap from './AccuracyHeatmap';
import AccuracyTrend from './AccuracyTrend';
import DemandDecomposition from './DemandDecomposition';
import HourlyDemandHeatmap from './HourlyDemandHeatmap';
import MonthlyCatGeo from './MonthlyCatGeo';
import LostSalesTrend from './LostSalesTrend';
import LostSalesTopSKUs from './LostSalesTopSKUs';
import FeatureImportanceGlobal from './FeatureImportanceGlobal';
import FeatureImportanceByDept from './FeatureImportanceByDept';
import ModelComparison from './ModelComparison';
import SKUForecastTable from './SKUForecastTable';

import {
  DemandKPIs,
  ForecastDataPoint,
  DepartmentAccuracy,
  AccuracyTrendPoint,
  DemandAlert,
  DecompositionData,
  HourlyHeatmapPoint,
  MonthlyCatGeoData,
  LostSalesItem,
  FeatureImportance,
  ModelComparison as ModelComparisonType,
  SKUForecast,
} from '@/app/lib/demand-types';

// KPI Card Component
function KPICard({
  title,
  value,
  trend,
  trendLabel,
  icon: Icon,
  iconBg,
}: {
  title: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  icon: React.ElementType;
  iconBg: string;
}) {
  const isPositive = trend !== undefined && trend >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-sm text-[var(--text-secondary)] mb-1">{title}</p>
        <p className="text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-sm ${isPositive ? 'text-positive' : 'text-negative'}`}>
            <TrendIcon size={14} />
            <span>{isPositive ? '+' : ''}{trend.toFixed(1)}%</span>
            {trendLabel && <span className="text-[var(--text-tertiary)]">{trendLabel}</span>}
          </div>
        )}
      </div>
      <div className={`p-2 rounded-lg ${iconBg}`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  );
}

// Alert Card Component
function AlertCard({ alert }: { alert: DemandAlert }) {
  const severityStyles = {
    critical: 'border-l-red-500 bg-red-50',
    warning: 'border-l-amber-500 bg-amber-50',
    info: 'border-l-blue-500 bg-blue-50',
  };

  const severityTextStyles = {
    critical: 'text-red-700',
    warning: 'text-amber-700',
    info: 'text-blue-700',
  };

  return (
    <div className={`p-3 border-l-4 rounded-r-lg ${severityStyles[alert.severity]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold uppercase ${severityTextStyles[alert.severity]}`}>
              {alert.severity}
            </span>
            <span className="text-xs text-[var(--text-tertiary)]">•</span>
            <span className="text-xs text-[var(--text-tertiary)]">
              {new Date(alert.timestamp).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">
            {alert.title}
          </h4>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
            {alert.description}
          </p>
        </div>
        <span className={`text-sm font-semibold ${severityTextStyles[alert.severity]} ml-3`}>
          {alert.metric}
        </span>
      </div>
    </div>
  );
}

// Chart Section Component
function ChartSection({
  title,
  children,
  height = 'h-[300px]',
  onExpand,
  fullWidth = false,
}: {
  title: string;
  children: React.ReactNode;
  height?: string;
  onExpand?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <div className={`card ${fullWidth ? 'col-span-2' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        {onExpand && (
          <button
            onClick={onExpand}
            className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Maximize2 size={16} />
          </button>
        )}
      </div>
      <div className={height}>{children}</div>
    </div>
  );
}

// Expanded Modal
function ExpandedModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-8 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-secondary)] rounded-md text-[var(--text-secondary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

interface LostSalesData {
  top_skus: LostSalesItem[];
  trend: { date: string; fulfilled: number; lost: number }[];
}

export default function DemandDashboardContent() {
  const { setSelectedDepartment, expandedChart, setExpandedChart } = useDemand();

  // Data state
  const [kpis, setKpis] = useState<DemandKPIs | null>(null);
  const [forecastData, setForecastData] = useState<ForecastDataPoint[]>([]);
  const [accuracyByDept, setAccuracyByDept] = useState<DepartmentAccuracy[]>([]);
  const [accuracyTrend, setAccuracyTrend] = useState<AccuracyTrendPoint[]>([]);
  const [alerts, setAlerts] = useState<DemandAlert[]>([]);
  const [decomposition, setDecomposition] = useState<DecompositionData | null>(null);
  const [hourlyHeatmap, setHourlyHeatmap] = useState<HourlyHeatmapPoint[]>([]);
  const [monthlyCatGeo, setMonthlyCatGeo] = useState<MonthlyCatGeoData | null>(null);
  const [lostSales, setLostSales] = useState<LostSalesData | null>(null);
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance[]>([]);
  const [modelComparison, setModelComparison] = useState<ModelComparisonType[]>([]);
  const [skuTable, setSkuTable] = useState<SKUForecast[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const [
          kpisRes,
          forecastRes,
          deptRes,
          trendRes,
          alertsRes,
          decompositionRes,
          hourlyRes,
          catGeoRes,
          lostSalesRes,
          featuresRes,
          modelsRes,
          skuRes,
        ] = await Promise.all([
          fetch('/api/demand/kpis'),
          fetch('/api/demand/forecast'),
          fetch('/api/demand/accuracy-by-dept'),
          fetch('/api/demand/accuracy-trend'),
          fetch('/api/demand/alerts'),
          fetch('/api/demand/decomposition'),
          fetch('/api/demand/hourly-heatmap'),
          fetch('/api/demand/monthly-cat-geo'),
          fetch('/api/demand/lost-sales'),
          fetch('/api/demand/feature-importance'),
          fetch('/api/demand/model-comparison'),
          fetch('/api/demand/sku-table'),
        ]);

        const [
          kpisData,
          forecastData,
          deptData,
          trendData,
          alertsData,
          decompositionData,
          hourlyData,
          catGeoData,
          lostSalesData,
          featuresData,
          modelsData,
          skuData,
        ] = await Promise.all([
          kpisRes.json(),
          forecastRes.json(),
          deptRes.json(),
          trendRes.json(),
          alertsRes.json(),
          decompositionRes.json(),
          hourlyRes.json(),
          catGeoRes.json(),
          lostSalesRes.json(),
          featuresRes.json(),
          modelsRes.json(),
          skuRes.json(),
        ]);

        setKpis(kpisData);
        setForecastData(forecastData);
        setAccuracyByDept(deptData);
        setAccuracyTrend(trendData);
        setAlerts(alertsData);
        setDecomposition(decompositionData);
        setHourlyHeatmap(hourlyData);
        setMonthlyCatGeo(catGeoData);
        setLostSales(lostSalesData);
        setFeatureImportance(featuresData);
        setModelComparison(modelsData);
        setSkuTable(skuData);
      } catch (error) {
        console.error('Error fetching demand data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleDepartmentClick = (department: string) => {
    setSelectedDepartment(department);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-[var(--text-secondary)]">Loading demand data...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DemandFilterBar />

      <div className="flex-1 overflow-auto p-6">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              Demand Forecasting
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Model: {kpis?.modelVersion} • Last updated:{' '}
              {kpis?.lastUpdated
                ? new Date(kpis.lastUpdated).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-positive">
              {kpis?.coveragePct}% Coverage
            </span>
            <span className="badge badge-neutral">
              {kpis?.totalSkusTracked?.toLocaleString()} SKUs
            </span>
          </div>
        </div>

        {/* 1. KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <KPICard
            title="Forecast Accuracy"
            value={`${kpis?.forecastAccuracy || 0}%`}
            trend={kpis?.accuracyTrend}
            trendLabel="vs last period"
            icon={Target}
            iconBg="bg-[var(--chart-emerald)]"
          />
          <KPICard
            title="MAPE"
            value={`${kpis?.mape || 0}%`}
            trend={kpis?.mapeTrend}
            trendLabel="vs last period"
            icon={Activity}
            iconBg="bg-[var(--chart-amber)]"
          />
          <KPICard
            title="Stockout Rate"
            value={`${kpis?.stockoutRate || 0}%`}
            trend={kpis?.stockoutTrend}
            trendLabel="vs last period"
            icon={AlertTriangle}
            iconBg="bg-[var(--chart-rose)]"
          />
          <KPICard
            title="Excess Inventory"
            value={`${kpis?.excessInventoryPct || 0}%`}
            trend={kpis?.excessTrend}
            trendLabel="vs last period"
            icon={Package}
            iconBg="bg-[var(--chart-indigo)]"
          />
        </div>

        {/* 2. Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Forecast Alerts
              </h2>
              <button className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1">
                View all <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {alerts.slice(0, 3).map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {/* 3. Forecast vs Actual (Hero Chart) */}
        <div className="mb-6">
          <ChartSection
            title="Forecast vs Actual"
            height="h-[350px]"
            onExpand={() => setExpandedChart('forecast-vs-actual')}
            fullWidth
          >
            <ForecastVsActual data={forecastData} />
          </ChartSection>
        </div>

        {/* 4. Accuracy Heatmap + Accuracy Trend (50/50) */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <ChartSection
            title="Accuracy by Department"
            height="h-[320px]"
            onExpand={() => setExpandedChart('accuracy-heatmap')}
          >
            <AccuracyHeatmap
              data={accuracyByDept}
              onDepartmentClick={handleDepartmentClick}
            />
          </ChartSection>

          <ChartSection
            title="Accuracy Trend"
            height="h-[320px]"
            onExpand={() => setExpandedChart('accuracy-trend')}
          >
            <AccuracyTrend data={accuracyTrend} />
          </ChartSection>
        </div>

        {/* 5. Demand Decomposition (Full Width) */}
        {decomposition && (
          <div className="mb-6">
            <ChartSection
              title="Demand Decomposition"
              height="h-[350px]"
              onExpand={() => setExpandedChart('demand-decomposition')}
              fullWidth
            >
              <DemandDecomposition data={decomposition.components} />
            </ChartSection>
          </div>
        )}

        {/* 6. Hourly Heatmap + Monthly Cat/Geo (50/50) */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <ChartSection
            title="Hourly Demand Pattern"
            height="h-[320px]"
            onExpand={() => setExpandedChart('hourly-heatmap')}
          >
            <HourlyDemandHeatmap data={hourlyHeatmap} />
          </ChartSection>

          {monthlyCatGeo && (
            <ChartSection
              title="Demand by Category / Geography"
              height="h-[320px]"
              onExpand={() => setExpandedChart('monthly-cat-geo')}
            >
              <MonthlyCatGeo data={monthlyCatGeo} />
            </ChartSection>
          )}
        </div>

        {/* 7. Lost Sales Trend + Top SKUs (50/50) */}
        {lostSales && (
          <div className="grid grid-cols-2 gap-6 mb-6">
            <ChartSection
              title="Lost Sales Trend"
              height="h-[300px]"
              onExpand={() => setExpandedChart('lost-sales-trend')}
            >
              <LostSalesTrend data={lostSales.trend} />
            </ChartSection>

            <ChartSection
              title="Top SKUs by Lost Revenue"
              height="h-[300px]"
              onExpand={() => setExpandedChart('lost-sales-skus')}
            >
              <LostSalesTopSKUs data={lostSales.top_skus} />
            </ChartSection>
          </div>
        )}

        {/* 8. Feature Importance Global + By Department (50/50) */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <ChartSection
            title="Feature Importance (Global)"
            height="h-[300px]"
            onExpand={() => setExpandedChart('feature-importance-global')}
          >
            <FeatureImportanceGlobal data={featureImportance} />
          </ChartSection>

          <ChartSection
            title="Feature Importance by Department"
            height="h-[300px]"
            onExpand={() => setExpandedChart('feature-importance-dept')}
          >
            <FeatureImportanceByDept data={featureImportance} />
          </ChartSection>
        </div>

        {/* 9. Model Comparison (Full Width) */}
        <div className="mb-6">
          <ChartSection
            title="Model Comparison"
            height="h-[350px]"
            onExpand={() => setExpandedChart('model-comparison')}
            fullWidth
          >
            <ModelComparison data={modelComparison} />
          </ChartSection>
        </div>

        {/* 10. SKU Forecast Table (Full Width) */}
        <div className="mb-6">
          <div className="card">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
              SKU Forecast Table
            </h3>
            <div className="h-[500px]">
              <SKUForecastTable data={skuTable} />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Chart Modals */}
      {expandedChart === 'forecast-vs-actual' && (
        <ExpandedModal title="Forecast vs Actual" onClose={() => setExpandedChart(null)}>
          <ForecastVsActual data={forecastData} />
        </ExpandedModal>
      )}
      {expandedChart === 'accuracy-trend' && (
        <ExpandedModal title="Accuracy Trend" onClose={() => setExpandedChart(null)}>
          <AccuracyTrend data={accuracyTrend} />
        </ExpandedModal>
      )}
      {expandedChart === 'accuracy-heatmap' && (
        <ExpandedModal title="Accuracy by Department" onClose={() => setExpandedChart(null)}>
          <AccuracyHeatmap
            data={accuracyByDept}
            onDepartmentClick={handleDepartmentClick}
          />
        </ExpandedModal>
      )}
      {expandedChart === 'demand-decomposition' && decomposition && (
        <ExpandedModal title="Demand Decomposition" onClose={() => setExpandedChart(null)}>
          <DemandDecomposition data={decomposition.components} />
        </ExpandedModal>
      )}
      {expandedChart === 'hourly-heatmap' && (
        <ExpandedModal title="Hourly Demand Pattern" onClose={() => setExpandedChart(null)}>
          <HourlyDemandHeatmap data={hourlyHeatmap} />
        </ExpandedModal>
      )}
      {expandedChart === 'monthly-cat-geo' && monthlyCatGeo && (
        <ExpandedModal title="Demand by Category / Geography" onClose={() => setExpandedChart(null)}>
          <MonthlyCatGeo data={monthlyCatGeo} />
        </ExpandedModal>
      )}
      {expandedChart === 'lost-sales-trend' && lostSales && (
        <ExpandedModal title="Lost Sales Trend" onClose={() => setExpandedChart(null)}>
          <LostSalesTrend data={lostSales.trend} />
        </ExpandedModal>
      )}
      {expandedChart === 'lost-sales-skus' && lostSales && (
        <ExpandedModal title="Top SKUs by Lost Revenue" onClose={() => setExpandedChart(null)}>
          <LostSalesTopSKUs data={lostSales.top_skus} />
        </ExpandedModal>
      )}
      {expandedChart === 'feature-importance-global' && (
        <ExpandedModal title="Feature Importance (Global)" onClose={() => setExpandedChart(null)}>
          <FeatureImportanceGlobal data={featureImportance} />
        </ExpandedModal>
      )}
      {expandedChart === 'feature-importance-dept' && (
        <ExpandedModal title="Feature Importance by Department" onClose={() => setExpandedChart(null)}>
          <FeatureImportanceByDept data={featureImportance} />
        </ExpandedModal>
      )}
      {expandedChart === 'model-comparison' && (
        <ExpandedModal title="Model Comparison" onClose={() => setExpandedChart(null)}>
          <ModelComparison data={modelComparison} />
        </ExpandedModal>
      )}
    </div>
  );
}
