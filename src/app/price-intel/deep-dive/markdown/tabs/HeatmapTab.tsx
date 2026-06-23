'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PriceIntelCore, PriceIntelHeatmapRow } from '@/app/lib/price-intel-types';

interface Props { core: PriceIntelCore }

type Mode = 'PACE' | 'MARGIN' | 'UNITS';

function heatColor(v: number, target: number): { bg: string; text: string } {
  const ratio = v / target;
  if (ratio >= 1.05) return { bg: '#D1FAE5', text: '#065F46' };
  if (ratio >= 0.90) return { bg: '#FEF3C7', text: '#92400E' };
  if (ratio >= 0.70) return { bg: '#FEE2E2', text: '#991B1B' };
  return { bg: '#FCA5A5', text: '#7F1D1D' };
}

const WEEKS = Array.from({ length: 14 }, (_, i) => `W${i + 1}`);

export default function HeatmapTab({ core }: Props) {
  const [mode, setMode] = useState<Mode>('PACE');
  const [selectedCat, setSelectedCat] = useState<PriceIntelHeatmapRow | null>(null);

  const heatData = core.sell_through_heatmap;

  function getCellValue(row: PriceIntelHeatmapRow, wIdx: number): number {
    const base = row.values[wIdx] ?? 0;
    if (mode === 'MARGIN') return Math.round(base * 0.22 * 100) / 100;
    if (mode === 'UNITS') return Math.round(base * 120);
    return base;
  }

  function getCellDisplay(row: PriceIntelHeatmapRow, wIdx: number): string {
    const v = getCellValue(row, wIdx);
    if (mode === 'PACE') return `${v}%`;
    if (mode === 'MARGIN') return `${v.toFixed(1)}%`;
    return String(v);
  }

  const velocityData = selectedCat
    ? selectedCat.values.map((v, i) => ({ week: `W${i + 1}`, sell_through: v, target: selectedCat.target_pct }))
    : [];

  return (
    <div className="px-8 py-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1">
          {(['PACE', 'MARGIN', 'UNITS'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                mode === m ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <span className="text-xs text-[var(--text-secondary)]">Click any cell to view velocity chart</span>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-default)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Sell-through Heatmap · {mode}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">12 categories × 14 weeks</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
                  <th className="text-left px-4 py-3 text-[var(--text-tertiary)] font-medium w-36 sticky left-0 bg-[var(--bg-secondary)]">Category</th>
                  {WEEKS.map((w) => (
                    <th key={w} className="px-2 py-3 text-[var(--text-tertiary)] font-medium text-center min-w-[52px]">{w}</th>
                  ))}
                  <th className="px-4 py-3 text-[var(--text-tertiary)] font-medium text-center">Target</th>
                </tr>
              </thead>
              <tbody>
                {heatData.map((row) => (
                  <tr
                    key={row.category}
                    className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-secondary)]"
                  >
                    <td className="px-4 py-2.5 font-medium text-[var(--text-primary)] sticky left-0 bg-[var(--bg-primary)]">
                      <button
                        className="text-left hover:text-[var(--accent-primary)] transition-colors"
                        onClick={() => setSelectedCat(selectedCat?.category === row.category ? null : row)}
                      >
                        {row.category}
                      </button>
                    </td>
                    {row.values.map((_, wIdx) => {
                      const v = getCellValue(row, wIdx);
                      const display = getCellDisplay(row, wIdx);
                      const colors = heatColor(v, row.target_pct);
                      return (
                        <td
                          key={wIdx}
                          className="px-2 py-2.5 text-center cursor-pointer"
                          onClick={() => setSelectedCat(selectedCat?.category === row.category ? null : row)}
                        >
                          <span
                            className="inline-block px-1.5 py-1 rounded font-semibold tabular-nums text-[11px] min-w-[44px]"
                            style={{ background: colors.bg, color: colors.text }}
                          >
                            {display}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-center text-[var(--text-tertiary)] font-medium">{row.target_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="px-6 py-3 border-t border-[var(--border-default)] flex items-center gap-4">
            <span className="text-[10px] text-[var(--text-tertiary)]">vs target:</span>
            {[['≥105%', '#D1FAE5', '#065F46'], ['90–105%', '#FEF3C7', '#92400E'], ['70–90%', '#FEE2E2', '#991B1B'], ['<70%', '#FCA5A5', '#7F1D1D']].map(([l, bg, tc]) => (
              <div key={l} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: bg, border: `1px solid ${tc}` }} />
                <span className="text-[10px] text-[var(--text-tertiary)]">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Velocity chart panel */}
        {selectedCat && (
          <div className="w-72 shrink-0 card p-5">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{selectedCat.category}</h4>
            <p className="text-xs text-[var(--text-secondary)] mb-4">Sell-through velocity vs target</p>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={velocityData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                  <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#111827' }} stroke="#D1D5DB" />
                  <YAxis tick={{ fontSize: 9, fill: '#111827' }} domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} stroke="#D1D5DB" />
                  <Tooltip
                    contentStyle={{ fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                    formatter={(v: unknown, name: unknown) => [`${v}%`, name === 'sell_through' ? 'Sell-through' : 'Target']}
                  />
                  <Line dataKey="target" stroke="#94A3B8" strokeDasharray="4 2" dot={false} strokeWidth={1} />
                  <Line dataKey="sell_through" stroke="#4F46E5" strokeWidth={2} dot={{ r: 3, fill: '#4F46E5' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-xs text-[var(--text-secondary)]">
              Target: <span className="font-medium text-[var(--text-primary)]">{selectedCat.target_pct}%</span>
              {' · '}Latest: <span className="font-medium text-[var(--text-primary)]">
                {selectedCat.values[selectedCat.values.length - 1] ?? 0}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
