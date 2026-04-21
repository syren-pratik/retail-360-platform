'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PriceRecommendation } from '@/app/lib/price-types';

interface RecommendationSummaryProps {
  recommendations: PriceRecommendation[];
}

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (absValue >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (absValue >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${(value ?? 0).toLocaleString('en-IN')}`;
}

export default function RecommendationSummary({ recommendations }: RecommendationSummaryProps) {
  const summary = useMemo(() => {
    // Convert string values to numbers (handles scientific notation from cache)
    const normalized = (recommendations ?? []).map(r => ({
      ...r,
      price_change_pct: Number(r.price_change_pct) || 0,
      revenue_impact: Number(r.revenue_impact) || 0,
    }));

    const increases = normalized.filter(r => r.price_change_pct > 1);
    const decreases = normalized.filter(r => r.price_change_pct < -1);
    const noChange = normalized.filter(r => r.price_change_pct >= -1 && r.price_change_pct <= 1);

    return {
      increases: {
        count: increases.length,
        avgChangePct: increases.length > 0
          ? increases.reduce((sum, r) => sum + r.price_change_pct, 0) / increases.length
          : 0,
        totalRevenueImpact: increases.reduce((sum, r) => sum + r.revenue_impact, 0),
      },
      decreases: {
        count: decreases.length,
        avgChangePct: decreases.length > 0
          ? decreases.reduce((sum, r) => sum + r.price_change_pct, 0) / decreases.length
          : 0,
        totalRevenueImpact: decreases.reduce((sum, r) => sum + r.revenue_impact, 0),
      },
      noChange: {
        count: noChange.length,
      },
    };
  }, [recommendations]);

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Price Increases */}
      <div className="card p-4 border-l-4 border-l-green-500">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-green-100">
            <TrendingUp size={16} className="text-green-600" />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Price Increases
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-2xl font-semibold text-[var(--text-primary)]">
              {summary.increases.count}
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">products</div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm font-medium text-green-600">
                +{(summary.increases.avgChangePct ?? 0).toFixed(1)}%
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">avg change</div>
            </div>
            <div className="h-8 w-px bg-[var(--border-subtle)]" />
            <div>
              <div className="text-sm font-medium text-green-600">
                {formatCurrency(summary.increases.totalRevenueImpact)}
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">revenue impact</div>
            </div>
          </div>
        </div>
      </div>

      {/* Price Decreases */}
      <div className="card p-4 border-l-4 border-l-red-500">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-red-100">
            <TrendingDown size={16} className="text-red-600" />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Price Decreases
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-2xl font-semibold text-[var(--text-primary)]">
              {summary.decreases.count}
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">products</div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm font-medium text-red-600">
                {(summary.decreases.avgChangePct ?? 0).toFixed(1)}%
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">avg change</div>
            </div>
            <div className="h-8 w-px bg-[var(--border-subtle)]" />
            <div>
              <div className="text-sm font-medium text-red-600">
                {formatCurrency(summary.decreases.totalRevenueImpact)}
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">revenue impact</div>
            </div>
          </div>
        </div>
      </div>

      {/* No Change */}
      <div className="card p-4 border-l-4 border-l-gray-400">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-gray-100">
            <Minus size={16} className="text-gray-600" />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            No Change
          </span>
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-2xl font-semibold text-[var(--text-primary)]">
              {summary.noChange.count}
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">products</div>
          </div>

          <div className="text-xs text-[var(--text-tertiary)]">
            Current pricing is optimal based on elasticity and competitive positioning
          </div>
        </div>
      </div>
    </div>
  );
}
