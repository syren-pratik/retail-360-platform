'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useDemand } from '@/app/context/DemandContext';

interface CategoryDemand {
  category: string;
  month: string;
  demand: number;
}

interface GeographyDemand {
  region: string;
  city: string;
  demand: number;
  growth: number;
}

interface MonthlyCatGeoData {
  byCategory: CategoryDemand[];
  byGeography: GeographyDemand[];
}

interface MonthlyCatGeoProps {
  data: MonthlyCatGeoData;
}

type ViewType = 'category' | 'geography';

const CATEGORY_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
const GEO_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B'];

export default function MonthlyCatGeo({ data }: MonthlyCatGeoProps) {
  const [view, setView] = useState<ViewType>('category');
  const { addDrilldown } = useDemand();

  // Safe data access
  const byCategory = data?.byCategory ?? [];
  const byGeography = data?.byGeography ?? [];

  // Early return if no data
  if (byCategory.length === 0 && byGeography.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-[var(--text-tertiary)]">No category/geography data available</p>
      </div>
    );
  }

  // Transform data for category view (grouped by month)
  const getCategoryChartData = () => {
    const months = Array.from(new Set(byCategory.map((d) => d.month)));
    const cats = Array.from(new Set(byCategory.map((d) => d.category)));

    return months.map((month) => {
      const monthData: Record<string, string | number> = { month };
      cats.forEach((cat) => {
        const item = byCategory.find((d) => d.month === month && d.category === cat);
        monthData[cat] = item?.demand || 0;
      });
      return monthData;
    });
  };

  // Transform data for geography view (grouped by region)
  const getGeoChartData = () => {
    const regions = Array.from(new Set(byGeography.map((d) => d.region)));
    return regions.map((region) => {
      const regionData: Record<string, string | number> = { region };
      const citiesInRegion = byGeography.filter((d) => d.region === region);
      let total = 0;
      citiesInRegion.forEach((city) => {
        regionData[city.city] = city.demand;
        total += city.demand;
      });
      regionData.total = total;
      return regionData;
    });
  };

  const handleBarClick = (field: string, value: string) => {
    addDrilldown({
      source: 'monthly-cat-geo',
      field,
      value,
      label: `${field === 'month' ? 'Month' : 'Region'}: ${value}`,
    });
  };

  const categories = Array.from(new Set(byCategory.map((d) => d.category)));
  const cities = Array.from(new Set(byGeography.map((d) => d.city)));

  return (
    <div className="h-full flex flex-col">
      {/* Toggle buttons */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setView('category')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            view === 'category'
              ? 'bg-[var(--accent-primary)] text-white'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          By Category
        </button>
        <button
          onClick={() => setView('geography')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            view === 'geography'
              ? 'bg-[var(--accent-primary)] text-white'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          By Geography
        </button>
      </div>

      {/* Chart */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          {view === 'category' ? (
            <BarChart
              data={getCategoryChartData()}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
                        <p className="font-semibold mb-2">{label}</p>
                        {payload.map((entry) => (
                          <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-sm"
                                style={{ backgroundColor: entry.color }}
                              />
                              {entry.name}
                            </span>
                            <span className="font-medium">
                              {Number(entry.value).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                        <p className="mt-2 text-[var(--accent-primary)] text-[10px]">Click to drill down</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="rect"
                iconSize={10}
                wrapperStyle={{ fontSize: 11 }}
              />
              {categories.map((cat, i) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                  radius={[2, 2, 0, 0]}
                  onClick={(_, __, e) => {
                    const payload = (e as unknown as { payload?: { month?: string } })?.payload;
                    if (payload?.month) handleBarClick('month', String(payload.month));
                  }}
                />
              ))}
            </BarChart>
          ) : (
            <BarChart
              data={getGeoChartData()}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="region"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-lg text-xs">
                        <p className="font-semibold mb-2">{label}</p>
                        {payload.filter(p => p.name !== 'total').map((entry) => (
                          <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-sm"
                                style={{ backgroundColor: entry.color }}
                              />
                              {entry.name}
                            </span>
                            <span className="font-medium">
                              {Number(entry.value).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                        <p className="mt-2 text-[var(--accent-primary)] text-[10px]">Click to drill down</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="rect"
                iconSize={10}
                wrapperStyle={{ fontSize: 11 }}
              />
              {cities.slice(0, 4).map((city, i) => (
                <Bar
                  key={city}
                  dataKey={city}
                  stackId="a"
                  fill={GEO_COLORS[i % GEO_COLORS.length]}
                  radius={i === cities.slice(0, 4).length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                  onClick={(_, __, e) => {
                    const payload = (e as unknown as { payload?: { region?: string } })?.payload;
                    if (payload?.region) handleBarClick('region', String(payload.region));
                  }}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
