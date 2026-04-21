'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Activity,
  Calendar,
} from 'lucide-react';
import {
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { ProductDetail } from '@/app/lib/generate-product-detail';

interface ProductDetailContentProps {
  product: ProductDetail;
}

const ABC_COLORS = {
  A: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  B: 'bg-amber-100 text-amber-700 border-amber-200',
  C: 'bg-gray-100 text-gray-600 border-gray-200',
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

function getTrendIcon(trend: 'up' | 'down' | 'stable') {
  if (trend === 'up') return <TrendingUp size={16} className="text-emerald-500" />;
  if (trend === 'down') return <TrendingDown size={16} className="text-rose-500" />;
  return <Minus size={16} className="text-gray-400" />;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.85) return 'text-emerald-600';
  if (confidence >= 0.7) return 'text-amber-600';
  return 'text-rose-600';
}

export default function ProductDetailContent({ product }: ProductDetailContentProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prepare hourly heatmap data
  const hourlyMap = new Map<string, number>();
  product.hourlyPattern.forEach((p) => {
    hourlyMap.set(`${p.day}-${p.hour}`, p.demand);
  });
  const maxHourlyDemand = Math.max(...product.hourlyPattern.map((p) => p.demand));
  const minHourlyDemand = Math.min(...product.hourlyPattern.map((p) => p.demand));

  const getHeatmapColor = (value: number) => {
    const normalized = (value - minHourlyDemand) / (maxHourlyDemand - minHourlyDemand);
    if (normalized < 0.25) return 'bg-blue-50';
    if (normalized < 0.5) return 'bg-blue-100';
    if (normalized < 0.75) return 'bg-blue-300';
    return 'bg-blue-500';
  };

  const handleExport = () => {
    const data = {
      product: {
        sku: product.sku,
        name: product.name,
        department: product.department,
        category: product.category,
        subcategory: product.subcategory,
      },
      forecast: product.dailyDemand,
      stores: product.storeBreakdown,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product.sku}_forecast.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-[var(--border-default)] px-6 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/demand"
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Demand Dashboard</span>
          </Link>
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6 space-y-6">
        {/* Product Header */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-lg bg-[var(--accent-primary-light)] flex items-center justify-center">
              <Package size={28} className="text-[var(--accent-primary)]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                  {product.sku}
                </h1>
                <span className="text-lg text-[var(--text-secondary)]">—</span>
                <span className="text-lg text-[var(--text-primary)]">{product.name}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="px-2.5 py-1 rounded text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                  {product.department}
                </span>
                <span className="px-2.5 py-1 rounded text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                  {product.subcategory}
                </span>
                <span className={`px-2.5 py-1 rounded text-xs font-medium border ${ABC_COLORS[product.abcClass ?? 'C']}`}>
                  ABC Class: {product.abcClass ?? 'C'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(product.trend ?? 'stable')}
              <span className="text-sm text-[var(--text-secondary)]">
                {product.trend === 'up' ? 'Trending Up' : product.trend === 'down' ? 'Trending Down' : 'Stable'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            label="Avg Daily Demand"
            value={product.avgDailyDemand.toLocaleString('en-IN')}
            icon={Activity}
            iconBg="bg-blue-500"
          />
          <KPICard
            label="Forecast Accuracy"
            value={`${product.forecastAccuracy}%`}
            icon={Target}
            iconBg="bg-emerald-500"
          />
          <KPICard
            label="Trend"
            value={(product.trend ?? 'stable').charAt(0).toUpperCase() + (product.trend ?? 'stable').slice(1)}
            icon={TrendingUp}
            iconBg="bg-amber-500"
          />
          <KPICard
            label="Confidence"
            value={`${(product.confidenceScore * 100).toFixed(0)}%`}
            icon={Calendar}
            iconBg="bg-purple-500"
          />
        </div>

        {/* Forecast vs Actual Chart */}
        <div className="card">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            Forecast vs Actual (60d History + 14d Forecast)
          </h3>
          <div className="h-[300px]">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={product.dailyDemand} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                    interval={6}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
                            <p className="font-semibold mb-2">{label}</p>
                            <div className="space-y-1">
                              <div className="flex justify-between gap-4">
                                <span>Forecast</span>
                                <span className="font-medium">{data.forecast?.toLocaleString('en-IN')}</span>
                              </div>
                              {data.actual !== null && (
                                <div className="flex justify-between gap-4">
                                  <span>Actual</span>
                                  <span className="font-medium">{data.actual?.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                              <div className="flex justify-between gap-4 text-[var(--text-tertiary)]">
                                <span>Range</span>
                                <span>{data.lowerBound} - {data.upperBound}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="line" wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stroke="transparent"
                    fill="#6366F120"
                    name="Confidence Interval"
                  />
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stroke="transparent"
                    fill="#ffffff"
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={false}
                    name="Forecast"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    name="Actual"
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-[var(--bg-secondary)] rounded animate-pulse" />
            )}
          </div>
        </div>

        {/* Store Breakdown and Top Features */}
        <div className="grid grid-cols-2 gap-6">
          {/* Demand by Store */}
          <div className="card">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
              Demand by Store
            </h3>
            <div className="h-[280px]">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={product.storeBreakdown.slice(0, 8)}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="store"
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      width={75}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
                              <p className="font-semibold mb-1">{data.store}</p>
                              <p className="text-[var(--text-tertiary)] mb-2">{data.city}, {data.region}</p>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-4">
                                  <span>Forecast</span>
                                  <span className="font-medium">{data.forecast.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span>Confidence</span>
                                  <span className={`font-medium ${getConfidenceColor(data.confidence)}`}>
                                    {(data.confidence * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="forecast" radius={[0, 4, 4, 0]}>
                      {product.storeBreakdown.slice(0, 8).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.confidence >= 0.85 ? '#10B981' : entry.confidence >= 0.7 ? '#F59E0B' : '#EF4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-[var(--bg-secondary)] rounded animate-pulse" />
              )}
            </div>
          </div>

          {/* Top Feature Drivers */}
          <div className="card">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
              Top Feature Drivers
            </h3>
            <div className="h-[280px]">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={product.topFeatures}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                      tickLine={false}
                      axisLine={false}
                      width={95}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
                              <p className="font-semibold mb-1">{data.feature}</p>
                              <div className="flex justify-between gap-4">
                                <span>Importance</span>
                                <span className="font-medium">{(data.importance * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="importance" fill="#6366F1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-[var(--bg-secondary)] rounded animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Seasonality Pattern */}
        <div className="card">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            Seasonality Pattern (Day x Hour)
          </h3>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-1.5 text-left font-medium text-[var(--text-tertiary)] w-16">Day</th>
                  {HOURS.map((hour) => (
                    <th key={hour} className="p-1 text-center font-medium text-[var(--text-tertiary)] min-w-[32px]">
                      {hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day}>
                    <td className="p-1.5 font-medium text-[var(--text-secondary)]">{day.slice(0, 3)}</td>
                    {HOURS.map((hour) => {
                      const demand = hourlyMap.get(`${day}-${hour}`) || 0;
                      return (
                        <td
                          key={hour}
                          className={`p-1 text-center ${getHeatmapColor(demand)}`}
                          title={`${day} ${hour}:00 - ${demand} units`}
                        >
                          <span className="text-[10px]">
                            {demand > maxHourlyDemand * 0.5 ? demand : ''}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Store-Level Forecast Table */}
        <div className="card">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            Store-Level Forecast
          </h3>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  <th className="px-3 py-2.5 text-left font-medium text-[var(--text-secondary)]">Store</th>
                  <th className="px-3 py-2.5 text-left font-medium text-[var(--text-secondary)]">City</th>
                  <th className="px-3 py-2.5 text-left font-medium text-[var(--text-secondary)]">Region</th>
                  <th className="px-3 py-2.5 text-right font-medium text-[var(--text-secondary)]">Forecast</th>
                  <th className="px-3 py-2.5 text-right font-medium text-[var(--text-secondary)]">Confidence</th>
                  <th className="px-3 py-2.5 text-left font-medium text-[var(--text-secondary)]">Top Features</th>
                </tr>
              </thead>
              <tbody>
                {product.storeBreakdown.map((store) => (
                  <tr key={store.store} className="border-t border-[var(--border-subtle)]">
                    <td className="px-3 py-2.5 font-medium text-[var(--text-primary)]">{store.store}</td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">{store.city}</td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">{store.region}</td>
                    <td className="px-3 py-2.5 text-right font-medium">{store.forecast.toLocaleString('en-IN')}</td>
                    <td className={`px-3 py-2.5 text-right font-medium ${getConfidenceColor(store.confidence)}`}>
                      {(store.confidence * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {store.topFeatures.map((feature) => (
                          <span
                            key={feature}
                            className="px-1.5 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded text-[10px]"
                          >
                            {feature.length > 15 ? feature.slice(0, 13) + '...' : feature}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
}

function KPICard({ label, value, icon: Icon, iconBg }: KPICardProps) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`p-2 rounded-lg ${iconBg}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
        <p className="text-lg font-semibold text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}
