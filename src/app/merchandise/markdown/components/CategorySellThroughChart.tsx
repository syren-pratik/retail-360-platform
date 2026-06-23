'use client';

import { useState } from 'react';
import type { CategorySellThrough } from '../markdown-types';

function formatInr(val: number): string {
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)}L`;
  if (val >= 1_000) return `₹${(val / 1_000).toFixed(0)}K`;
  return val > 0 ? `₹${val}` : '—';
}

interface Props {
  data: CategorySellThrough[];
  onCategoryClick?: (category: string) => void;
}

export default function CategorySellThroughChart({ data, onCategoryClick }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Sort: at-risk first, then by gap descending (most behind first)
  const sorted = [...data].sort((a, b) => {
    if (a.is_at_risk && !b.is_at_risk) return -1;
    if (!a.is_at_risk && b.is_at_risk) return 1;
    return a.gap_pct - b.gap_pct;
  });

  const maxPct = 100;

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Sell-Through vs Plan — Top Categories
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Actual sell-through % vs season plan at Week 8 · Click a row to drill in
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-8 h-2 rounded bg-orange-400" />
            Actual ST%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-0.5 h-4 bg-indigo-600" />
            Plan
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((cat, idx) => {
          const isHovered = hoveredIdx === idx;
          const actualWidth = (cat.actual_pct / maxPct) * 100;
          const planPosition = (cat.plan_pct / maxPct) * 100;
          const isAtRisk = cat.is_at_risk;

          const barColor = isAtRisk
            ? cat.gap_pct < -10
              ? 'bg-red-500'
              : 'bg-amber-500'
            : 'bg-orange-400';

          const gapColor = isAtRisk
            ? cat.gap_pct < -10
              ? 'text-red-600'
              : 'text-amber-600'
            : 'text-emerald-600';

          return (
            <div
              key={cat.category}
              className={`group rounded-lg p-2.5 cursor-pointer transition-all ${
                isHovered ? 'bg-[var(--bg-secondary)]' : ''
              } ${isAtRisk ? 'ring-1 ring-amber-200' : ''}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onCategoryClick?.(cat.category)}
            >
              {/* Row header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {isAtRisk && (
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                  )}
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {cat.category}
                  </span>
                  {isAtRisk && cat.at_risk_inr > 0 && (
                    <span className="badge badge-negative text-[10px]">
                      {formatInr(cat.at_risk_inr)} at risk
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[var(--text-tertiary)]">
                    Plan: {cat.plan_pct.toFixed(1)}%
                  </span>
                  <span className={`font-semibold ${gapColor}`}>
                    {cat.gap_pct >= 0 ? '+' : ''}{cat.gap_pct.toFixed(1)} pp
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {cat.actual_pct.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="relative h-5 bg-[var(--bg-tertiary)] rounded-full overflow-visible">
                {/* Actual bar */}
                <div
                  className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${actualWidth}%` }}
                />

                {/* Plan marker (vertical line) */}
                <div
                  className="absolute top-[-3px] w-0.5 h-[calc(100%+6px)] bg-indigo-600 rounded-full z-10 shadow-sm"
                  style={{ left: `${planPosition}%` }}
                  title={`Plan: ${cat.plan_pct.toFixed(1)}%`}
                />

                {/* Plan label — shown on hover */}
                {isHovered && (
                  <div
                    className="absolute -top-5 transform -translate-x-1/2 text-[9px] text-indigo-600 font-medium whitespace-nowrap"
                    style={{ left: `${planPosition}%` }}
                  >
                    Plan {cat.plan_pct.toFixed(0)}%
                  </div>
                )}
              </div>

              {/* Hover detail */}
              {isHovered && (
                <div className="mt-1.5 text-[10px] text-[var(--text-tertiary)] flex gap-3">
                  {isAtRisk ? (
                    <>
                      <span className="text-amber-600">
                        Behind plan by {Math.abs(cat.gap_pct).toFixed(1)} pp —
                        apply markdown to recover velocity before season exit
                      </span>
                      <span className="ml-auto text-blue-600 cursor-pointer">Open queue →</span>
                    </>
                  ) : (
                    <span className="text-emerald-600">
                      {cat.gap_pct > 5
                        ? 'Ahead of plan — consider whether pace needs rebalancing'
                        : 'On track — no immediate action required'}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-tertiary)]">
        Plan built from 3-year historical pacing + seasonal index · Databricks: markdown_plan_targets × fact_sales_transactions
      </div>
    </div>
  );
}
