'use client';

import { TrendingUp, TrendingDown, DollarSign, Percent, Target, BarChart3, Database } from 'lucide-react';
import { PriceKPIsData } from '@/app/lib/price-types';

interface PriceKPICardsProps {
  data: PriceKPIsData | null | undefined;
}

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
}

function Sparkline({ data, color, height = 24 }: SparklineProps) {
  // Handle empty or invalid data
  if (!data || (data ?? []).length < 2) {
    return <svg width="100%" height={height} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / ((data ?? []).length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatValue(value: number, unit: string): string {
  if (unit === '₹') {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${(value ?? 0).toLocaleString('en-IN')}`;
  }
  if (unit === '%') return `${(value ?? 0).toFixed(1)}%`;
  if (unit === 'x') return `${(value ?? 0).toFixed(2)}x`;
  return (value ?? 0).toFixed(1);
}

function getChangePercent(current: number, prior: number): number {
  if (prior === 0) return 0;
  return ((current - prior) / prior) * 100;
}

export default function PriceKPICards({ data }: PriceKPICardsProps) {
  // Handle null/undefined data gracefully
  if (!data) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card p-4 flex flex-col items-center justify-center h-[140px]">
            <Database className="h-6 w-6 text-gray-300 mb-2" />
            <p className="text-xs text-[var(--text-tertiary)]">No data</p>
          </div>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      key: 'revenue_impact',
      label: data?.revenue_impact?.label ?? 'Revenue Impact',
      value: data?.revenue_impact?.value ?? 0,
      prior: data?.revenue_impact?.prior ?? 0,
      unit: data?.revenue_impact?.unit ?? '₹',
      sparkline: data?.sparklines?.revenue_impact ?? [],
      icon: DollarSign,
      color: '#10B981',
      positiveIsGood: true,
    },
    {
      key: 'avg_margin_current',
      label: data?.avg_margin_current?.label ?? 'Current Margin',
      value: data?.avg_margin_current?.value ?? 0,
      prior: data?.avg_margin_current?.prior ?? 0,
      unit: data?.avg_margin_current?.unit ?? '%',
      sparkline: data?.sparklines?.margin_current ?? [],
      icon: Percent,
      color: '#F59E0B',
      positiveIsGood: true,
    },
    {
      key: 'avg_margin_projected',
      label: data?.avg_margin_projected?.label ?? 'Projected Margin',
      value: data?.avg_margin_projected?.value ?? 0,
      prior: data?.avg_margin_projected?.prior ?? 0,
      unit: data?.avg_margin_projected?.unit ?? '%',
      sparkline: data?.sparklines?.margin_projected ?? [],
      icon: Target,
      color: '#10B981',
      positiveIsGood: true,
    },
    {
      key: 'promo_roi',
      label: data?.promo_roi?.label ?? 'Promo ROI',
      value: data?.promo_roi?.value ?? 0,
      prior: data?.promo_roi?.prior ?? 0,
      unit: data?.promo_roi?.unit ?? 'x',
      sparkline: data?.sparklines?.promo_roi ?? [],
      icon: BarChart3,
      color: '#6366F1',
      positiveIsGood: true,
    },
    {
      key: 'competitive_index',
      label: data?.competitive_index?.label ?? 'Competitive Index',
      value: data?.competitive_index?.value ?? 0,
      prior: data?.competitive_index?.prior ?? 0,
      unit: data?.competitive_index?.unit ?? '',
      sparkline: data?.sparklines?.competitive_index ?? [],
      icon: Target,
      color: '#8B5CF6',
      positiveIsGood: false, // Higher competitive index means we're priced higher
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {(kpis ?? []).map((kpi) => {
        const change = getChangePercent(kpi.value, kpi.prior);
        const isPositive = change > 0;
        const isGood = kpi.positiveIsGood ? isPositive : !isPositive;
        const Icon = kpi.icon;

        return (
          <div
            key={kpi.key}
            className="card p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${kpi.color}15` }}>
                <Icon size={18} style={{ color: kpi.color }} />
              </div>
              <div className="w-16 h-6">
                <Sparkline data={kpi.sparkline} color={kpi.color} />
              </div>
            </div>

            <div className="text-2xl font-semibold text-[var(--text-primary)] mb-1">
              {formatValue(kpi.value, kpi.unit)}
            </div>

            <div className="text-xs text-[var(--text-tertiary)] mb-2">
              {kpi.label}
            </div>

            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp size={12} className={isGood ? 'text-green-500' : 'text-red-500'} />
              ) : (
                <TrendingDown size={12} className={isGood ? 'text-green-500' : 'text-red-500'} />
              )}
              <span className={`text-xs font-medium ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{(change ?? 0).toFixed(1)}%
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">vs prior</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
