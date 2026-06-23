'use client';

import { useState } from 'react';
import { FileText, Loader2, RefreshCw, AlertTriangle, Lightbulb, CheckSquare } from 'lucide-react';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';

interface Props {
  core: PriceIntelCore;
}

interface WeeklyBrief {
  headline: string;
  performance_summary: string;
  top_actions: { priority: 'urgent' | 'review' | 'info'; action: string; impact_inr: number }[];
  risks: string[];
  opportunities: string[];
  next_week_focus: string;
}

const PRIORITY_CONFIG: Record<
  'urgent' | 'review' | 'info',
  { label: string; badge: string; border: string }
> = {
  urgent: {
    label: 'Urgent',
    badge: 'bg-rose-100 text-rose-700',
    border: 'border-rose-200',
  },
  review: {
    label: 'Review',
    badge: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200',
  },
  info: {
    label: 'Info',
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
  },
};

export default function WeeklyBriefingAgent({ core }: Props) {
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/price-intel/agents/weekly-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpis: core.kpis,
          campaigns: core.campaigns.slice(0, 5),
          action_queue: core.action_queue.slice(0, 10),
          forecast: core.forecast_14w.slice(0, 4),
          headline: core.headline,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as WeeklyBrief;
      setBrief(data);
      setGeneratedAt(new Date().toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'medium' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  /* ── Empty state ── */
  if (!brief && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
          <FileText size={26} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Weekly Pricing Brief</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1 max-w-xs">
            Synthesizes all price intel data into a weekly executive summary
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 max-w-sm text-left">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={generate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
        >
          <FileText size={15} />
          Generate Weekly Brief
        </button>
      </div>
    );
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3 text-[var(--text-tertiary)]">
        <Loader2 size={28} className="animate-spin text-emerald-500" />
        <p className="text-sm">Generating brief…</p>
      </div>
    );
  }

  /* ── Result ── */
  if (!brief) return null;

  return (
    <div className="space-y-5">
      {/* Headline */}
      <div>
        <h3 className="text-lg font-bold text-[var(--text-primary)] leading-snug">
          {brief.headline}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
          {brief.performance_summary}
        </p>
      </div>

      {/* 2-col grid: Actions | Risks & Opportunities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Actions */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <CheckSquare size={14} className="text-[var(--text-tertiary)]" />
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              Actions
            </span>
          </div>
          <div className="space-y-2">
            {brief.top_actions.map((item, i) => {
              const cfg = PRIORITY_CONFIG[item.priority];
              return (
                <div
                  key={i}
                  className={`card p-3 border ${cfg.border} flex flex-col gap-1.5`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs font-medium text-emerald-600 ml-auto">
                      {formatLakhsCrores(item.impact_inr)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed">{item.action}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Risks & Opportunities */}
        <div className="space-y-3">
          {/* Risks */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle size={13} className="text-rose-500" />
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                Risks
              </span>
            </div>
            <ul className="space-y-1.5">
              {brief.risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-rose-700">
                  <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-rose-400" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>

          {/* Opportunities */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb size={13} className="text-emerald-500" />
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                Opportunities
              </span>
            </div>
            <ul className="space-y-1.5">
              {brief.opportunities.map((opp, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-700">
                  <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {opp}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Next week focus */}
      <div className="rounded-lg p-4 bg-amber-50 border border-amber-200">
        <p className="text-xs font-semibold text-amber-700 mb-1.5 uppercase tracking-wide">
          Next Week Focus
        </p>
        <p className="text-sm text-amber-800 leading-relaxed">{brief.next_week_focus}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        {generatedAt && (
          <span className="text-xs text-[var(--text-tertiary)]">Generated {generatedAt}</span>
        )}
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-md px-2.5 py-1.5 hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50 ml-auto"
        >
          <RefreshCw size={12} />
          Regenerate
        </button>
      </div>
    </div>
  );
}
