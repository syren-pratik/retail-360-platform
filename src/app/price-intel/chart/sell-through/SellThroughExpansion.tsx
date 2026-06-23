'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import DeepDiveHeader from '@/app/merchandise/demand/deep-dive/shared/DeepDiveHeader';
import DeepDiveTabs from '@/app/merchandise/demand/deep-dive/shared/DeepDiveTabs';
import DeepDiveKPIStrip from '@/app/merchandise/demand/deep-dive/shared/DeepDiveKPIStrip';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';

interface Props {
  core: PriceIntelCore;
}

const TABS = [
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'velocity', label: 'Velocity' },
  { id: 'by-store-type', label: 'By Store Type' },
  { id: 'response-curves', label: 'Response Curves' },
];

const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

function cellColor(ratio: number): string {
  if (ratio >= 1.05) return 'bg-emerald-100 text-emerald-800';
  if (ratio >= 0.9) return 'bg-indigo-100 text-indigo-800';
  if (ratio >= 0.7) return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-800';
}

// ─── Heatmap Tab ──────────────────────────────────────────────────────────────

interface SelectedCell {
  rowIdx: number;
  weekIdx: number;
}

function HeatmapTab({ core }: { core: PriceIntelCore }) {
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  const selectedRow =
    selectedCell !== null ? core.sell_through_heatmap[selectedCell.rowIdx] : null;

  const velocityData = selectedRow
    ? WEEK_LABELS.map((wl, i) => ({
        week: wl,
        actual: selectedRow.values[i],
        target: selectedRow.target_pct,
      }))
    : [];

  return (
    <div className="flex gap-6">
      {/* Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide whitespace-nowrap">
                Category
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide whitespace-nowrap">
                Dept
              </th>
              {WEEK_LABELS.map((w) => (
                <th
                  key={w}
                  className="px-2 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide text-center"
                >
                  {w}
                </th>
              ))}
              <th className="px-2 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide text-center">
                Target
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {core.sell_through_heatmap.map((row, rowIdx) => (
              <tr
                key={row.category}
                className="hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <td className="px-3 py-2 font-medium text-[var(--text-primary)] whitespace-nowrap">
                  {row.category}
                </td>
                <td className="px-3 py-2 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                  {row.department}
                </td>
                {row.values.slice(0, 8).map((val, weekIdx) => {
                  const ratio = val / row.target_pct;
                  const isSelected =
                    selectedCell?.rowIdx === rowIdx &&
                    selectedCell?.weekIdx === weekIdx;
                  return (
                    <td key={weekIdx} className="px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCell(
                            isSelected ? null : { rowIdx, weekIdx }
                          )
                        }
                        className={`w-full min-h-[48px] px-2 py-1 rounded text-sm font-semibold tabular-nums transition-all ${cellColor(ratio)} ${
                          isSelected
                            ? 'ring-2 ring-offset-1 ring-indigo-500 scale-105'
                            : 'hover:scale-105'
                        }`}
                      >
                        {val.toFixed(1)}%
                      </button>
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center text-xs font-medium text-[var(--text-secondary)] tabular-nums">
                  {row.target_pct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Right panel */}
      {selectedRow && (
        <div className="w-72 shrink-0 border border-[var(--border-default)] rounded-xl p-4 bg-[var(--bg-secondary)]">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
            {selectedRow.category}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mb-3">
            {selectedRow.department} · Target: {selectedRow.target_pct.toFixed(1)}%
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={velocityData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#111827' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#111827' }} tickFormatter={(v: unknown) => `${v}%`} />
              <Tooltip formatter={(v: unknown) => `${(v as number).toFixed(1)}%`} />
              <ReferenceLine
                y={selectedRow.target_pct}
                stroke="#9ca3af"
                strokeDasharray="4 2"
                label={{ value: 'Target', position: 'right', fontSize: 10, fill: '#9ca3af' }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual pace"
                stroke="#f87171"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            W8 sell-through:{' '}
            <span
              className={`font-semibold ${
                selectedRow.values[7] >= selectedRow.target_pct - 5
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}
            >
              {selectedRow.values[7].toFixed(1)}%
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Velocity Tab ─────────────────────────────────────────────────────────────

function projectLinear(values: number[]): number[] {
  // Use last 3 weeks to extrapolate
  const last3 = values.slice(5, 8);
  const avg_delta =
    last3.length >= 2
      ? (last3[last3.length - 1] - last3[0]) / (last3.length - 1)
      : 0;
  const projected: number[] = [];
  let current = values[7];
  for (let i = 0; i < 6; i++) {
    current = Math.min(100, Math.max(0, current + avg_delta));
    projected.push(Math.round(current * 10) / 10);
  }
  return projected;
}

const PROJ_WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12', 'W13', 'W14'];

function VelocityTab({ core }: { core: PriceIntelCore }) {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const row = core.sell_through_heatmap[selectedIdx];
  const projected = projectLinear(row.values);

  const chartData = PROJ_WEEK_LABELS.map((wl, i) => {
    const isActual = i < 8;
    return {
      week: wl,
      actual: isActual ? row.values[i] : null,
      projected: !isActual ? projected[i - 8] : null,
      target: row.target_pct,
    };
  });

  const projectedEnd = projected[projected.length - 1];

  return (
    <div className="flex gap-6">
      {/* Category list */}
      <div className="w-56 shrink-0 space-y-1 max-h-[520px] overflow-y-auto pr-1">
        {core.sell_through_heatmap.map((r, idx) => {
          const behind = r.values[7] < r.target_pct - 5;
          return (
            <button
              key={r.category}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                selectedIdx === idx
                  ? 'bg-indigo-50 border border-indigo-200'
                  : 'hover:bg-[var(--bg-secondary)] border border-transparent'
              }`}
            >
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">{r.category}</p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                  {r.values[7].toFixed(1)}% / {r.target_pct.toFixed(1)}%
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    behind ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {behind ? 'Behind' : 'On track'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{row.category}</p>
        <p className="text-xs text-[var(--text-secondary)] mb-3">{row.department}</p>
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#111827' }} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v: unknown) => `${v}%`}
              tick={{ fontSize: 11, fill: '#111827' }}
            />
            <Tooltip
              formatter={(v: unknown) =>
                v !== null ? `${(v as number).toFixed(1)}%` : 'N/A'
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine
              x="W8"
              stroke="#6366f1"
              strokeDasharray="4 2"
              label={{ value: 'Today', position: 'top', fontSize: 11, fill: '#6366f1' }}
            />
            <Line
              type="monotone"
              dataKey="target"
              name="Target"
              stroke="#9ca3af"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#f87171"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#f87171' }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="projected"
              name="Projected"
              stroke="#3b82f6"
              strokeDasharray="4 2"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          At current pace:{' '}
          <span className="font-semibold">{projectedEnd.toFixed(1)}%</span> by season end
          {projectedEnd >= row.target_pct - 5 ? (
            <span className="ml-2 text-emerald-600 font-medium">✓ On track</span>
          ) : (
            <span className="ml-2 text-rose-600 font-medium">
              ↓ {(row.target_pct - projectedEnd).toFixed(1)}pp below target
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── By-Store-Type Tab ────────────────────────────────────────────────────────

const STORE_TYPES = ['Hypermarket', 'Supermarket', 'Express', 'DarkStore'];
const STORE_OFFSETS = [5, -3, 8, -10]; // fixed ±variation per store type

function mockStoreValue(base: number, storeIdx: number): number {
  const delta = STORE_OFFSETS[storeIdx] + ((storeIdx * 3 + 7) % 11) - 5;
  return Math.min(100, Math.max(0, base + delta));
}

function ByStoreTypeTab({ core }: { core: PriceIntelCore }) {
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-secondary)]">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Category
              </th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                Target
              </th>
              {STORE_TYPES.map((st) => (
                <th
                  key={st}
                  className="px-3 py-2.5 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide text-center"
                >
                  {st}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {core.sell_through_heatmap.map((row) => (
              <tr key={row.category} className="hover:bg-[var(--bg-secondary)] transition-colors">
                <td className="px-4 py-2.5 font-medium text-[var(--text-primary)] whitespace-nowrap">
                  {row.category}
                </td>
                <td className="px-3 py-2.5 text-[var(--text-secondary)] tabular-nums text-xs">
                  {row.target_pct.toFixed(1)}%
                </td>
                {STORE_TYPES.map((_, sIdx) => {
                  const val = mockStoreValue(row.values[7], sIdx);
                  const ratio = val / row.target_pct;
                  return (
                    <td key={sIdx} className="px-2 py-2 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded text-sm font-semibold tabular-nums ${cellColor(ratio)}`}
                      >
                        {val.toFixed(1)}%
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <span className="font-semibold">Insight:</span> Dark Stores show consistently lower
        sell-through vs Hypermarkets (+5pp avg gap). Express format outperforms on impulse categories
        (Biscuits, Tea) due to higher basket frequency.
      </div>
    </div>
  );
}

// ─── Response Curves Tab ──────────────────────────────────────────────────────

const DEPTH_POINTS = [0, 10, 15, 20, 25, 30, 40, 50, 60];

interface CurveCategory {
  name: string;
  color: string;
  data: number[];
}

const CURVE_CATEGORIES: CurveCategory[] = [
  { name: 'Edible Oil', color: '#6366f1', data: [72, 78, 83, 87, 91, 94, 97, 99, 99.5] },
  { name: 'Dal & Pulses', color: '#f87171', data: [68, 76, 82, 87, 92, 95, 98, 99, 99.5] },
  { name: 'Tea', color: '#f59e0b', data: [75, 80, 84, 88, 91, 93, 96, 98, 99] },
  { name: 'Biscuits', color: '#10b981', data: [65, 73, 80, 86, 91, 95, 97, 99, 99.5] },
];

function ResponseCurvesTab() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(CURVE_CATEGORIES.map((c) => [c.name, true]))
  );
  const [depthIdx, setDepthIdx] = useState<number>(4); // index into DEPTH_POINTS = 25%

  const chartData = DEPTH_POINTS.map((depth, dIdx) => {
    const point: Record<string, number> = { depth };
    for (const cat of CURVE_CATEGORIES) {
      point[cat.name] = cat.data[dIdx];
    }
    return point;
  });

  const selectedDepth = DEPTH_POINTS[depthIdx];
  const enabledCats = CURVE_CATEGORIES.filter((c) => enabled[c.name]);

  return (
    <div>
      {/* Checkboxes */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {CURVE_CATEGORIES.map((cat) => (
          <label key={cat.name} className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled[cat.name] ?? false}
              onChange={(e) =>
                setEnabled((prev) => ({ ...prev, [cat.name]: e.target.checked }))
              }
              className="rounded"
            />
            <span
              className="text-sm font-medium"
              style={{ color: enabled[cat.name] ? cat.color : '#9ca3af' }}
            >
              {cat.name}
            </span>
          </label>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={440}>
        <ComposedChart data={chartData} margin={{ top: 12, right: 24, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="depth"
            type="number"
            domain={[0, 60]}
            ticks={DEPTH_POINTS}
            label={{ value: 'Markdown Depth (%)', position: 'insideBottom', offset: -12, style: { fontSize: 11 } }}
            tickFormatter={(v: unknown) => `${v}%`}
            tick={{ fontSize: 11, fill: '#111827' }}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: unknown) => `${v}%`}
            tick={{ fontSize: 11, fill: '#111827' }}
            label={{ value: '% Units Cleared', angle: -90, position: 'insideLeft', offset: 8, style: { fontSize: 11 } }}
          />
          <Tooltip
            formatter={(v: unknown, name: unknown) =>
              [`${(v as number).toFixed(1)}%`, name as string] as [string, string]
            }
            labelFormatter={(label: unknown) => `Depth: ${label}%`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine
            x={selectedDepth}
            stroke="#6366f1"
            strokeDasharray="4 2"
            label={{
              value: `${selectedDepth}%`,
              position: 'top',
              fontSize: 11,
              fill: '#6366f1',
            }}
          />
          {CURVE_CATEGORIES.map((cat) =>
            enabled[cat.name] ? (
              <Line
                key={cat.name}
                type="monotone"
                dataKey={cat.name}
                stroke={cat.color}
                strokeWidth={2}
                dot={{ r: 3, fill: cat.color }}
              />
            ) : null
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Depth slider */}
      <div className="mt-4 px-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[var(--text-secondary)]">Markdown depth</span>
          <span className="text-sm font-semibold text-indigo-600">{selectedDepth}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={DEPTH_POINTS.length - 1}
          step={1}
          value={depthIdx}
          onChange={(e) => setDepthIdx(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <div className="mt-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
          <span className="font-semibold">At {selectedDepth}% depth:</span>{' '}
          {enabledCats.length > 0
            ? enabledCats
                .map(
                  (c) =>
                    `${c.name} clears ${c.data[depthIdx].toFixed(0)}%`
                )
                .join(' · ')
            : 'No categories selected'}
        </div>
      </div>

      <div className="mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
        <span className="font-semibold">Inflection point:</span> Most categories clear{' '}
        <span className="font-semibold">&gt;90%</span> of units at a{' '}
        <span className="font-semibold">−25% markdown</span> depth. Beyond 30%, marginal clearance
        gain drops sharply — avoid over-discounting to protect margin.
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function SellThroughExpansion({ core }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawView = searchParams.get('view') ?? 'heatmap';

  const handleView = useCallback(
    (v: string) => {
      router.push('?view=' + v, { scroll: false });
    },
    [router]
  );

  const behindCount = core.sell_through_heatmap.filter(
    (r) => r.values[7] < r.target_pct - 5
  ).length;

  const kpiTiles = [
    {
      label: 'Overall Sell-Through',
      value: `${core.kpis.sell_through_pct.toFixed(1)}%`,
    },
    {
      label: 'vs Target',
      value: `${core.kpis.sell_through_vs_target > 0 ? '+' : ''}${core.kpis.sell_through_vs_target.toFixed(1)}pp`,
      color: core.kpis.sell_through_vs_target >= 0
        ? ('positive' as const)
        : ('negative' as const),
    },
    {
      label: 'Categories Behind Target',
      value: String(behindCount),
    },
    {
      label: 'Markdown Queue',
      value: String(core.markdown_queue.length),
      subtext: 'items pending',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <DeepDiveHeader
        title="Sell-Through Analysis"
        subtitle="Weekly sell-through heatmap, velocity, and response curves"
        backLabel="← Back to Price Intel"
        backHref="/price-intel?tab=markdown"
      />
      <DeepDiveKPIStrip tiles={kpiTiles} />
      <DeepDiveTabs tabs={TABS} activeTab={rawView} onTabChange={handleView} />

      <div className="px-8 py-6">
        {rawView === 'heatmap' && <HeatmapTab core={core} />}
        {rawView === 'velocity' && <VelocityTab core={core} />}
        {rawView === 'by-store-type' && <ByStoreTypeTab core={core} />}
        {rawView === 'response-curves' && <ResponseCurvesTab />}
      </div>
    </div>
  );
}
