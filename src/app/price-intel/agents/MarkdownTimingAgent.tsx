'use client';

import { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  Info,
  Loader2,
  CalendarClock,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';

interface Props {
  core: PriceIntelCore;
}

type OptimizationGoal = 'maximize_recovery' | 'minimize_inventory_age' | 'balanced';

interface ScheduleItem {
  sku_id: string;
  product_name: string;
  recommended_week: number;
  depth_pct: number;
  expected_sell_through_pct: number;
  recovery_inr: number;
  urgency: 'immediate' | 'this_week' | 'next_2_weeks' | 'monitor';
}

interface MarkdownScheduleResult {
  total_recovery_inr: number;
  avg_depth_pct: number;
  schedule: ScheduleItem[];
  risks: string[];
  timeline_summary: string;
}

const GOAL_LABELS: Record<OptimizationGoal, string> = {
  maximize_recovery:     'Maximize Recovery',
  minimize_inventory_age: 'Minimize Inventory Age',
  balanced:              'Balanced',
};

const URGENCY_BADGE: Record<ScheduleItem['urgency'], { cls: string; label: string }> = {
  immediate:    { cls: 'bg-rose-100 text-rose-700',   label: 'Immediate'     },
  this_week:    { cls: 'bg-amber-100 text-amber-700', label: 'This Week'     },
  next_2_weeks: { cls: 'bg-blue-100 text-blue-700',   label: 'Next 2 Weeks'  },
  monitor:      { cls: 'bg-slate-100 text-slate-600', label: 'Monitor'       },
};

function UrgencyBadge({ urgency }: { urgency: ScheduleItem['urgency'] }) {
  const { cls, label } = URGENCY_BADGE[urgency];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function MarkdownTimingAgent({ core }: Props) {
  const pendingItems = core.markdown_queue
    .filter(i => i.status === 'pending')
    .slice(0, 15);

  const [selectedSKUs, setSelectedSKUs] = useState<Set<string>>(new Set());
  const [goal, setGoal] = useState<OptimizationGoal>('balanced');
  const [seasonEndWeeks, setSeasonEndWeeks] = useState<number>(8);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarkdownScheduleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleSKU(skuId: string) {
    setSelectedSKUs(prev => {
      const next = new Set(prev);
      if (next.has(skuId)) {
        next.delete(skuId);
      } else {
        next.add(skuId);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedSKUs(new Set(pendingItems.map(i => i.sku_id)));
  }

  function clearAll() {
    setSelectedSKUs(new Set());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSKUs.size === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const skuIds = Array.from(selectedSKUs);
      const markdownItems = core.markdown_queue.filter(i => selectedSKUs.has(i.sku_id));
      const res = await fetch('/api/price-intel/agents/markdown-timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku_ids: skuIds,
          goal,
          season_end_weeks: seasonEndWeeks,
          markdown_items: markdownItems,
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data: MarkdownScheduleResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Form card */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock size={16} className="text-[var(--accent-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Markdown Timing Agent</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* SKU multi-selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Select SKUs for markdown schedule
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-[var(--accent-primary)] hover:underline"
                >
                  All
                </button>
                <span className="text-xs text-[var(--text-tertiary)]">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-[var(--text-tertiary)] hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {pendingItems.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)] italic">No pending markdown items.</p>
            ) : (
              <div className="rounded-lg border border-[var(--border-default)] divide-y divide-[var(--border-default)] max-h-64 overflow-y-auto">
                {pendingItems.map(item => {
                  const checked = selectedSKUs.has(item.sku_id);
                  const urgencyScore = item.urgency_score;
                  const urgencyColor =
                    urgencyScore >= 8
                      ? 'bg-rose-100 text-rose-700'
                      : urgencyScore >= 5
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600';

                  return (
                    <label
                      key={item.sku_id}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSKU(item.sku_id)}
                        className="shrink-0 text-[var(--accent-primary)]"
                        aria-label={checked ? 'Deselect' : 'Select'}
                      >
                        {checked ? <CheckSquare size={15} /> : <Square size={15} className="text-[var(--text-tertiary)]" />}
                      </button>
                      <span className="flex-1 text-sm text-[var(--text-primary)] truncate">
                        {item.product_name}
                      </span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium ${urgencyColor}`}>
                        {urgencyScore.toFixed(0)}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-[var(--text-tertiary)]">
              {selectedSKUs.size} of {pendingItems.length} selected
            </p>
          </div>

          {/* Optimization goal */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Optimization Goal</label>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(GOAL_LABELS) as OptimizationGoal[]).map(g => (
                <label key={g} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="goal"
                    value={g}
                    checked={goal === g}
                    onChange={() => setGoal(g)}
                    className="accent-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{GOAL_LABELS[g]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Season end weeks */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Weeks to season end
              <span className="ml-1.5 font-bold text-[var(--text-primary)]">{seasonEndWeeks}w</span>
            </label>
            <input
              type="number"
              min={1}
              max={12}
              value={seasonEndWeeks}
              onChange={e => setSeasonEndWeeks(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-24 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || selectedSKUs.size === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
            {loading ? 'Building Schedule…' : 'Generate Schedule'}
          </button>
        </form>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
            <AlertTriangle size={13} />
            {error}
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="card p-4 space-y-5">
          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Total Recovery</p>
              <p className="text-xl font-bold text-emerald-600">
                {formatLakhsCrores(result.total_recovery_inr)}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Avg Markdown Depth</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">
                {result.avg_depth_pct.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Timeline summary */}
          <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
            <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800 leading-relaxed">{result.timeline_summary}</p>
          </div>

          {/* Schedule table */}
          {result.schedule.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Markdown Schedule</h4>
              <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
                      <th className="px-3 py-2 text-left font-medium text-[var(--text-tertiary)]">Product</th>
                      <th className="px-3 py-2 text-center font-medium text-[var(--text-tertiary)]">Week</th>
                      <th className="px-3 py-2 text-right font-medium text-[var(--text-tertiary)]">Depth</th>
                      <th className="px-3 py-2 text-left font-medium text-[var(--text-tertiary)]">Urgency</th>
                      <th className="px-3 py-2 text-right font-medium text-[var(--text-tertiary)]">Recovery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {result.schedule.map(item => (
                      <tr key={item.sku_id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="px-3 py-2 text-[var(--text-primary)] font-medium max-w-[160px] truncate">
                          {item.product_name}
                        </td>
                        <td className="px-3 py-2 text-center text-[var(--text-secondary)]">
                          W{item.recommended_week}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-[var(--text-primary)]">
                          {item.depth_pct.toFixed(0)}%
                        </td>
                        <td className="px-3 py-2">
                          <UrgencyBadge urgency={item.urgency} />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-emerald-600">
                          {formatLakhsCrores(item.recovery_inr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Risks */}
          {result.risks.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Risks</h4>
              <ul className="space-y-1.5">
                {result.risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                    <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
                    <span className="text-xs text-amber-800">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
