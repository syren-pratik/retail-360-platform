'use client';

import { useMemo, useState } from 'react';
import type { MerchDemandFullPayload, MerchDemandPrecomputedHorizon } from '@/app/lib/merch-demand-types';
import MerchCategoryTimeline from '@/app/merchandise/demand/components/MerchCategoryTimeline';
import DeepDiveInsights from '../../shared/DeepDiveInsights';
import { AIInsightButton } from '@/app/components/charts/ChartCard';
import { getLocaleAuto } from '@/app/lib/format-money';

const HORIZONS = [7, 14, 28, 60] as const;
type Zoom = '30d' | '90d' | '6m' | 'Full';

const ANCHOR = '2026-05-17';

function daysBack(zoom: Zoom): number | null {
  if (zoom === '30d') return 30;
  if (zoom === '90d') return 90;
  if (zoom === '6m')  return 180;
  return null;
}

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const INSIGHTS = [
  { headline: 'Pre-Eid demand ramp starting', detail: 'Dal & Pulses and Edible Oil showing +18% week-over-week acceleration. Eid al-Adha in 20 days.', severity: 'warning' as const },
  { headline: 'Beverages forecast improving', detail: 'IPL season driving +35% on Soft Drinks. Accuracy on Beverages up 4pp this month.', severity: 'positive' as const },
  { headline: 'Dairy & Frozen anomaly detected', detail: 'Ice Cream demand 28% below forecast in last 7 days. Possible cold snap effect.', severity: 'negative' as const },
  { headline: 'School reopening in 25 days', detail: 'Biscuits & Cookies historically lift +38% in the 2 weeks before school reopens.', severity: 'warning' as const },
];

interface Props {
  core: MerchDemandFullPayload;
  precomputed: MerchDemandFullPayload['precomputed'] | null;
}

export default function OverviewTab({ core, precomputed }: Props) {
  const departments = useMemo(
    () => Array.from(new Set(core.skus.map((s) => s.department))).sort(),
    [core.skus],
  );

  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedHorizon, setSelectedHorizon] = useState<number>(14);
  const [zoom, setZoom] = useState<Zoom>('Full');
  const [showCI, setShowCI] = useState(true);
  const [showPlanLine, setShowPlanLine] = useState(false);
  const [breakdownMode, setBreakdownMode] = useState<'subcategory' | 'topSKUs'>('subcategory');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  const precomp: MerchDemandPrecomputedHorizon | null =
    precomputed?.departments?.[selectedDept]?.[String(selectedHorizon)] ?? null;

  // Apply zoom filter to chart points
  const zoomedPrecomp = useMemo((): MerchDemandPrecomputedHorizon | null => {
    if (!precomp) return null;
    const back = daysBack(zoom);
    if (!back) return precomp;

    const cutoff = addDays(ANCHOR, -back);
    const filterPoints = (pts: Record<string, unknown>[]) =>
      pts.filter((p) => (p.date as string) >= cutoff);

    return {
      subcategory_chart: {
        chart_points: filterPoints(precomp.subcategory_chart.chart_points),
        subcategories: precomp.subcategory_chart.subcategories,
      },
      top_sku_chart: {
        chart_points: filterPoints(precomp.top_sku_chart.chart_points),
        sku_ids: precomp.top_sku_chart.sku_ids,
        sku_names: precomp.top_sku_chart.sku_names,
      },
      top_skus: precomp.top_skus,
    };
  }, [precomp, zoom]);

  // Subcategory summary table
  const subcatSummary = useMemo(() => {
    if (!precomp) return [];
    const pts = precomp.subcategory_chart.chart_points;
    const subcats = precomp.subcategory_chart.subcategories;
    const actualPts = pts.filter((p) => p.is_actual);
    const forecastPts = pts.filter((p) => !p.is_actual);

    return subcats.map((sub) => {
      const avgActual = actualPts.length
        ? actualPts.reduce((s, p) => s + ((p[sub] as number) ?? 0), 0) / actualPts.length
        : 0;
      const peakForecast = forecastPts.length
        ? Math.max(...forecastPts.map((p) => (p[sub] as number) ?? 0))
        : 0;
      const totalForecast = forecastPts.reduce((s, p) => s + ((p[sub] as number) ?? 0), 0);
      const vsLast = ((avgActual - avgActual * 0.91) / (avgActual * 0.91)) * 100;
      return { sub, avgActual, peakForecast, totalForecast, vsLast };
    });
  }, [precomp]);

  // Plan reference level (daily units)
  const planLevel = useMemo(() => {
    if (!core.plan_vs_actual || !selectedDept || selectedDept === 'all') return null;
    const rows = (core.plan_vs_actual as { department: string; plan_revenue_inr: number; quarter: string }[]);
    const deptRows = rows.filter((r) => r.department === selectedDept);
    if (!deptRows.length) return null;
    const totalPlan = deptRows.reduce((s, r) => s + r.plan_revenue_inr, 0);
    const avgSKUPrice = core.skus.filter((s) => s.department === selectedDept)
      .reduce((s, sk) => s + sk.price_inr, 0) / Math.max(1, core.skus.filter((s) => s.department === selectedDept).length);
    return avgSKUPrice > 0 ? Math.round(totalPlan / avgSKUPrice / 90) : null;
  }, [core, selectedDept]);

  const selectStyle = "text-xs border border-[var(--border-default)] rounded-md px-3 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]";

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={selectedDept}
            onChange={(e) => { setSelectedDept(e.target.value); setSelectedSubcategory(null); }}
            className={selectStyle}
          >
            <option value="all">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={selectedHorizon}
            onChange={(e) => setSelectedHorizon(Number(e.target.value))}
            className={selectStyle}
          >
            {HORIZONS.map((h) => <option key={h} value={h}>Next {h} days</option>)}
          </select>
          <div className="flex items-center border border-[var(--border-default)] rounded-md overflow-hidden">
            {(['subcategory', 'topSKUs'] as const).map((mode, i) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setBreakdownMode(mode); setSelectedSubcategory(null); }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors${i > 0 ? ' border-l border-[var(--border-default)]' : ''} ${
                  breakdownMode === mode
                    ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)]'
                    : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {mode === 'subcategory' ? 'By subcategory' : 'By top SKUs'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1.5 cursor-pointer text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={showCI}
              onChange={(e) => setShowCI(e.target.checked)}
              className="accent-[var(--accent-primary)]"
            />
            <span className="text-xs">Show CI band</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={showPlanLine}
              onChange={(e) => setShowPlanLine(e.target.checked)}
              className="accent-[var(--accent-primary)]"
            />
            <span className="text-xs">Show plan line</span>
          </label>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        {(['30d', '90d', '6m', 'Full'] as Zoom[]).map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => setZoom(z)}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              zoom === z
                ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)] border-[var(--accent-primary)]'
                : 'bg-white text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {z}
          </button>
        ))}
        <span className="text-xs text-[var(--text-tertiary)] ml-2">
          {zoomedPrecomp?.subcategory_chart.chart_points.length ?? 0} data points
        </span>
      </div>

      {/* Main chart */}
      <div className="card p-5">
        <div className="mb-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {selectedDept === 'all' ? 'All Departments' : selectedDept} · Demand Timeline
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            Historical actuals + {selectedHorizon}d forecast · daily units
            {selectedSubcategory ? ` · ${selectedSubcategory} highlighted` : ''}
          </p>
        </div>

        {showPlanLine && planLevel && (
          <div className="mb-2 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <span className="inline-block w-6 border-t-2 border-dashed border-amber-400" />
            <span>Plan reference: ~{planLevel.toLocaleString(getLocaleAuto())} units/day</span>
          </div>
        )}

        <MerchCategoryTimeline
          precomp={zoomedPrecomp}
          breakdownMode={breakdownMode}
          selectedSubcategory={selectedSubcategory}
          onSubcategoryClick={setSelectedSubcategory}
          horizon={selectedHorizon}
          anchorDate={ANCHOR}
          expanded
        />
      </div>

      {/* Subcategory summary table */}
      {subcatSummary.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Subcategory Summary</p>
            <AIInsightButton id="merch-dd-subcategory-summary" title="Subcategory Summary" data={subcatSummary as unknown as Record<string, unknown>[]} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)] text-[var(--text-tertiary)]">
                  <th className="text-left px-5 py-2.5 font-medium">Subcategory</th>
                  <th className="text-right px-4 py-2.5 font-medium">Avg Daily (Actuals)</th>
                  <th className="text-right px-4 py-2.5 font-medium">Forecast Peak</th>
                  <th className="text-right px-4 py-2.5 font-medium">Total Forecast ({selectedHorizon}d)</th>
                  <th className="text-right px-4 py-2.5 font-medium">vs Last Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {subcatSummary.map((r) => (
                  <tr
                    key={r.sub}
                    className={`hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer ${
                      selectedSubcategory === r.sub ? 'bg-[var(--accent-primary-light)]' : ''
                    }`}
                    onClick={() => setSelectedSubcategory(selectedSubcategory === r.sub ? null : r.sub)}
                  >
                    <td className="px-5 py-2.5 font-medium text-[var(--text-primary)]">{r.sub}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">
                      {Math.round(r.avgActual).toLocaleString(getLocaleAuto())}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--text-secondary)]">
                      {Math.round(r.peakForecast).toLocaleString(getLocaleAuto())}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-[var(--text-primary)]">
                      {Math.round(r.totalForecast).toLocaleString(getLocaleAuto())}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${r.vsLast >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {r.vsLast >= 0 ? '+' : ''}{r.vsLast.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
