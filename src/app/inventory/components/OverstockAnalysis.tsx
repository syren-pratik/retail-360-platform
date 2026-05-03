'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, Line, CartesianGrid,
} from 'recharts';
import type { OverstockData } from './InventoryDashboardContent';

interface Props {
  data: OverstockData | null;
}

export default function OverstockAnalysis({ data }: Props) {
  const [tab, setTab] = useState<'categories' | 'waterfall' | 'trend'>('categories');

  const summary = data?.summary;
  const byCategory = data?.by_category ?? [];
  const waterfall = data?.markdown_waterfall ?? [];
  const trend = data?.trend_vs_purchasing ?? [];

  const trendDisplay = tab === 'trend'
    ? (summary?.trend === 'improving' ? '↓ Improving' : summary?.trend === 'declining' ? '↑ Worsening' : '→ Stable')
    : null;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Overstock Analysis</h3>
          {summary && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              ₹{summary.overstock_value_cr.toFixed(1)}Cr overstock
              {' · '}
              ₹{summary.dead_stock_value_cr.toFixed(1)}Cr dead stock
              {' · '}
              <span className="text-amber-600 font-medium">{summary.markdown_risk_skus} markdown-risk SKUs</span>
            </p>
          )}
        </div>
        {trendDisplay && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            summary?.trend === 'improving' ? 'bg-emerald-50 text-emerald-700' :
            summary?.trend === 'declining' ? 'bg-red-50 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {trendDisplay}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {([
          { key: 'categories', label: 'By Category' },
          { key: 'waterfall', label: 'Markdown Risk' },
          { key: 'trend', label: 'vs Purchasing' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              tab === t.key
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'categories' && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCategory} margin={{ top: 0, right: 8, bottom: 20, left: 4 }}>
              <XAxis
                dataKey="category"
                tick={{ fontSize: 9 }}
                tickFormatter={v => v.length > 9 ? v.slice(0, 8) + '…' : v}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${v}Cr`} />
              <Tooltip
                formatter={(v: unknown, name: unknown) => [
                  `₹${(v as number).toFixed(2)}Cr`,
                  name === 'slow_moving_cr' ? 'Slow Moving' : 'Dead Stock',
                ]}
              />
              <Bar dataKey="slow_moving_cr" name="slow_moving_cr" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
              <Bar dataKey="dead_stock_cr" name="dead_stock_cr" stackId="a" fill="#EF4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 justify-center mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              <span className="text-[10px] text-[var(--text-secondary)]">Slow Moving</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
              <span className="text-[10px] text-[var(--text-secondary)]">Dead Stock</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'waterfall' && (
        <div className="space-y-2 overflow-y-auto max-h-64">
          {waterfall.map((stage, i) => {
            const isNeg = stage.type === 'negative';
            const isResult = stage.type === 'result';
            const isTotal = stage.type === 'total';
            const pct = Math.min(100, (Math.abs(stage.value_cr) / 20) * 100);
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)] w-36 truncate shrink-0">{stage.stage}</span>
                <div className="flex-1 h-5 bg-[var(--bg-secondary)] rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${pct}%`,
                      background: isResult ? '#3B82F6' : isTotal ? '#6366F1' : isNeg ? '#EF4444' : '#10B981',
                    }}
                  />
                </div>
                <span className={`text-xs font-medium w-16 text-right ${
                  isNeg ? 'text-red-600' : isResult ? 'text-blue-600' : isTotal ? 'text-indigo-600' : 'text-emerald-600'
                }`}>
                  {isNeg ? '-' : ''}₹{Math.abs(stage.value_cr).toFixed(1)}Cr
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'trend' && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${v}Cr`} />
              <Tooltip formatter={(v: unknown, name: unknown) => [
                `₹${(v as number).toFixed(1)}Cr`,
                name === 'overstock_cr' ? 'Overstock' : 'Purchase Volume',
              ]} />
              <Bar dataKey="purchase_volume_cr" name="purchase_volume_cr" fill="#E0E7FF" radius={[3, 3, 0, 0]} />
              <Line dataKey="overstock_cr" name="overstock_cr" stroke="#EF4444" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 justify-center mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-indigo-100 border border-indigo-300" />
              <span className="text-[10px] text-[var(--text-secondary)]">Purchase Volume</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-0.5 bg-red-400" />
              <span className="text-[10px] text-[var(--text-secondary)]">Overstock</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
