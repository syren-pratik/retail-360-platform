'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { PriceIntelAISuggestion } from '@/app/lib/price-intel-types';
import { formatMoneyAuto } from '@/app/lib/format-money';

interface Props {
  suggestions: PriceIntelAISuggestion[];
}

const BADGE_STYLES = {
  green: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  red:   'bg-rose-100 text-rose-700 border border-rose-200',
  amber: 'bg-amber-100 text-amber-700 border border-amber-200',
};

const TYPE_ICONS: Record<string, string> = {
  raise_depth: '↑',
  cut_spend:   '↓',
  extend:      '⟳',
  pause:       '⏸',
  redirect:    '→',
};

export default function PromoAISuggestions({ suggestions }: Props) {
  const [applied, setApplied] = useState<Set<string>>(new Set());

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-violet-500" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Suggestions</h3>
        <span className="text-xs text-[var(--text-tertiary)]">{suggestions.length} recommendations</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {suggestions.slice(0, 4).map((s) => {
          const isApplied = applied.has(s.id);
          return (
            <div key={s.id} className="border border-[var(--border-default)] rounded-lg p-3 hover:bg-[var(--bg-secondary)] transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLES[s.badge_color]}`}>
                  {s.badge_label}
                </span>
                <span className="text-xs text-[var(--text-tertiary)] shrink-0">{(s.confidence * 100).toFixed(0)}%</span>
              </div>
              <p className="text-xs font-medium text-[var(--text-primary)] mb-1 leading-tight">
                <span className="mr-1 text-[var(--text-tertiary)]">{TYPE_ICONS[s.type]}</span>
                {s.campaign_name}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] leading-tight line-clamp-2 mb-2">{s.explanation}</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[var(--text-tertiary)]">{s.sku_or_category}</span>
                <span className="text-[11px] font-medium text-emerald-600">{formatMoneyAuto(s.financial_impact_inr)}</span>
              </div>
              <button
                disabled={isApplied}
                className={`w-full text-[11px] py-1 px-2 rounded font-medium transition-all ${
                  isApplied
                    ? 'bg-emerald-100 text-emerald-700 cursor-default'
                    : 'bg-[var(--accent-primary)] text-white hover:opacity-90'
                }`}
                onClick={() => {
                  console.log('Applied suggestion:', s.id, s.badge_label);
                  setApplied((prev) => new Set([...Array.from(prev), s.id]));
                }}
              >
                {isApplied ? 'Applied ✓' : s.action_label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
