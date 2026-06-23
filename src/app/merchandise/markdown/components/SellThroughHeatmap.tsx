'use client';

import { useState } from 'react';
import type { HeatmapCategory, HeatmapWeekCell } from '../markdown-types';

// ─── Color scale: cream → deep orange (0-10, 10-30, 30-50, 50-70, 70%+) ──────
function getCellColor(pct: number, target: number): string {
  if (pct === 0) return 'bg-[#FDF8F3] text-gray-300'; // future week

  const gap = pct - target;

  if (pct >= 70) return 'bg-[#92400E] text-white';       // >70%: darkest orange-brown
  if (pct >= 50) return 'bg-[#C2410C] text-white';       // 50-70%: dark orange
  if (pct >= 30) {
    if (gap >= -3) return 'bg-[#EA580C] text-white';     // 30-50% on pace: orange
    return 'bg-[#F97316] text-white';                    // 30-50% behind: light orange
  }
  if (pct >= 10) {
    if (gap >= -5) return 'bg-[#FED7AA] text-orange-900'; // 10-30% near pace
    return 'bg-[#FFEDD5] text-orange-800';               // 10-30% behind
  }
  return 'bg-[#FFF7ED] text-orange-400';                 // <10%: lightest cream
}

function getPaceIndicator(gap: number): { icon: string; color: string } {
  if (gap >= 2) return { icon: '▲', color: 'text-emerald-300' };
  if (gap >= -3) return { icon: '●', color: 'text-yellow-200' };
  if (gap >= -8) return { icon: '▼', color: 'text-red-300' };
  return { icon: '▼▼', color: 'text-red-200' };
}

// ─── Drill Panel (shown when a cell is clicked) ───────────────────────────────
interface DrillPanelProps {
  category: string;
  cell: HeatmapWeekCell;
  onClose: () => void;
}

function DrillPanel({ category, cell, onClose }: DrillPanelProps) {
  const gap = cell.pace_gap_pct;
  const isAhead = gap >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/30" />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-start justify-between">
          <div>
            <div className="text-xs text-[var(--text-tertiary)] mb-0.5">Heatmap Drill — {category}</div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Week {cell.week_number} Sell-Through Analysis
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Pace comparison */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-[var(--bg-secondary)] rounded-lg">
              <div className="text-xl font-semibold text-[var(--text-primary)]">
                {cell.actual_sell_through_pct.toFixed(1)}%
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">Actual ST%</div>
            </div>
            <div className="text-center p-3 bg-[var(--bg-secondary)] rounded-lg">
              <div className="text-xl font-semibold text-[var(--text-primary)]">
                {cell.target_sell_through_pct.toFixed(1)}%
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">Target ST%</div>
            </div>
            <div className={`text-center p-3 rounded-lg ${isAhead ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className={`text-xl font-semibold ${isAhead ? 'text-emerald-700' : 'text-red-600'}`}>
                {gap >= 0 ? '+' : ''}{gap.toFixed(1)} pp
              </div>
              <div className={`text-xs mt-0.5 ${isAhead ? 'text-emerald-600' : 'text-red-500'}`}>
                {isAhead ? 'Ahead of plan' : 'Behind plan'}
              </div>
            </div>
          </div>

          {/* Units detail */}
          <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
            <div>
              <div className="text-sm font-semibold text-blue-800">
                {cell.units_sold_this_week.toLocaleString('en-IN')} units
              </div>
              <div className="text-xs text-blue-600">Sold this specific week</div>
            </div>
          </div>

          {/* Context */}
          <div className="text-xs text-[var(--text-secondary)] space-y-1">
            <p>
              <strong>Target methodology:</strong> Season target ÷ total weeks, front-loaded for perishables.
              Beverages &amp; Dairy targets are front-loaded — 60% of total target should clear in first 7 of 14 weeks.
            </p>
            {!isAhead && (
              <p className="text-amber-700">
                <strong>Action:</strong> At this pace gap, cx360 recommends reviewing Markdown Queue for
                {' '}{category} SKUs. A deepened markdown applied now recovers more margin than waiting.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button className="btn-primary text-xs flex-1">
              Open Markdown Queue for {category}
            </button>
            <button className="btn-secondary text-xs flex-1">
              AI Suggestion for this week
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Heatmap ─────────────────────────────────────────────────────────────
interface Props {
  categories: HeatmapCategory[];
  currentWeek: number;
  totalWeeks: number;
}

export default function SellThroughHeatmap({ categories, currentWeek, totalWeeks }: Props) {
  const [selected, setSelected] = useState<{
    category: HeatmapCategory;
    cell: HeatmapWeekCell;
  } | null>(null);

  const weekNumbers = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Sell-Through Pace Heatmap
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Cumulative sell-through % by category × season week · Click any cell to drill in
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] flex-shrink-0">
          <div className="flex items-center gap-1">
            <div className="w-5 h-4 rounded bg-[#FFF7ED]" />
            <span>&lt;10%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-4 rounded bg-[#FFEDD5]" />
            <span>10–30%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-4 rounded bg-[#FED7AA]" />
            <span>30–50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-4 rounded bg-[#F97316]" />
            <span>50–70%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-4 rounded bg-[#C2410C]" />
            <span>70%+</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {/* Category label column */}
              <th className="text-left pr-3 pb-2 text-xs font-medium text-[var(--text-tertiary)] w-36 flex-shrink-0">
                Category
              </th>
              {weekNumbers.map((w) => (
                <th
                  key={w}
                  className={`text-center pb-2 text-[10px] font-medium w-10 ${
                    w === currentWeek
                      ? 'text-orange-600'
                      : w > currentWeek
                      ? 'text-[var(--border-default)]'
                      : 'text-[var(--text-tertiary)]'
                  }`}
                >
                  {w === currentWeek ? (
                    <span className="relative">
                      W{w}
                      <span className="absolute -top-0.5 -right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    </span>
                  ) : (
                    `W${w}`
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="space-y-1">
            {categories.map((cat) => (
              <tr key={cat.name} className="group">
                {/* Category name */}
                <td className="pr-3 py-1 align-middle">
                  <div className="text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
                    {cat.name}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">
                    {cat.season_window === 'evergreen'
                      ? 'Year-round'
                      : cat.name.includes('Dairy') || cat.name.includes('Beverage')
                      ? 'Front-loaded'
                      : 'Linear pace'}
                  </div>
                </td>

                {/* Week cells */}
                {cat.weekly_data.map((cell) => {
                  const colorClass = getCellColor(
                    cell.actual_sell_through_pct,
                    cell.target_sell_through_pct,
                  );
                  const pace = cell.week_number <= currentWeek
                    ? getPaceIndicator(cell.pace_gap_pct)
                    : null;

                  return (
                    <td
                      key={cell.week_number}
                      className="py-1 px-0.5"
                      onClick={() =>
                        cell.week_number <= currentWeek &&
                        setSelected({ category: cat, cell })
                      }
                    >
                      <div
                        className={`
                          relative w-10 h-10 rounded flex flex-col items-center justify-center
                          text-[10px] font-semibold transition-all duration-150
                          ${colorClass}
                          ${cell.week_number <= currentWeek ? 'cursor-pointer hover:ring-2 hover:ring-orange-400 hover:ring-offset-1 hover:scale-105' : ''}
                          ${cell.is_current_week ? 'ring-2 ring-orange-500 ring-offset-1' : ''}
                        `}
                        title={
                          cell.week_number <= currentWeek
                            ? `${cat.name} · Wk ${cell.week_number}: ${cell.actual_sell_through_pct.toFixed(1)}% actual vs ${cell.target_sell_through_pct.toFixed(1)}% target (${cell.pace_gap_pct >= 0 ? '+' : ''}${cell.pace_gap_pct.toFixed(1)} pp)`
                            : `Wk ${cell.week_number} — future`
                        }
                      >
                        <span className="leading-none">
                          {cell.week_number <= currentWeek
                            ? `${Math.round(cell.actual_sell_through_pct)}%`
                            : '—'}
                        </span>
                        {pace && (
                          <span className={`text-[8px] leading-none mt-0.5 ${pace.color}`}>
                            {pace.icon}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer explainer */}
      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-tertiary)] flex flex-wrap gap-x-4 gap-y-1">
        <span><span className="text-emerald-600 font-bold">▲</span> Ahead of pace (&gt;+2 pp)</span>
        <span><span className="text-yellow-500 font-bold">●</span> On track (±3 pp)</span>
        <span><span className="text-red-500 font-bold">▼</span> Behind pace (−4 to −8 pp)</span>
        <span><span className="text-red-400 font-bold">▼▼</span> Critical (&lt;−8 pp) — AI markdown triggered</span>
        <span className="ml-auto">Databricks: fact_sales_transactions × fact_inventory_daily × markdown_plan_targets</span>
      </div>

      {/* Drill panel modal */}
      {selected && (
        <DrillPanel
          category={selected.category.name}
          cell={selected.cell}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
