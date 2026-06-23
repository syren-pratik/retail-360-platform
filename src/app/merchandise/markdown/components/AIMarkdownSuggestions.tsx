'use client';

import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, MapPin, Database } from 'lucide-react';
import type { AIMarkdownSuggestion } from '../markdown-types';

const DRIVER_LABELS: Record<string, { label: string; color: string }> = {
  sell_through_pace: { label: 'Sell-through pace', color: 'text-amber-700 bg-amber-50' },
  expiry_proximity:  { label: 'Expiry proximity',  color: 'text-red-700 bg-red-50'    },
  season_exit:       { label: 'Season exit',       color: 'text-orange-700 bg-orange-50' },
  store_variance:    { label: 'Store variance',    color: 'text-blue-700 bg-blue-50'   },
};

function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 85 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold ${score >= 85 ? 'text-emerald-600' : score >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
        {score}%
      </span>
    </div>
  );
}

interface CardProps {
  suggestion: AIMarkdownSuggestion;
  index: number;
}

function SuggestionCard({ suggestion: s, index }: CardProps) {
  const [expanded, setExpanded] = useState(index === 0); // first card open by default
  const driver = DRIVER_LABELS[s.primary_driver] ?? { label: s.primary_driver, color: 'text-gray-600 bg-gray-50' };

  return (
    <div className="border border-[var(--border-default)] rounded-xl overflow-hidden hover:border-[var(--accent-primary)] transition-colors">
      {/* Card header — always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Brand + category */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded bg-[var(--accent-primary-light)] flex items-center justify-center flex-shrink-0">
                <Sparkles size={12} className="text-[var(--accent-primary)]" />
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">{s.brand} · {s.category}</span>
              <span className={`badge text-[10px] ${driver.color}`}>{driver.label}</span>
            </div>

            {/* Headline */}
            <div className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
              {s.recommendation_headline}
            </div>

            {/* Consumer framing — the key India insight */}
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full">
              <span className="text-xs font-bold text-orange-700">{s.consumer_facing_framing}</span>
              <span className="text-[10px] text-orange-500">shelf talker framing</span>
            </div>
          </div>

          {/* Right: price + expand */}
          <div className="flex items-start gap-3 flex-shrink-0">
            <div className="text-right">
              <div className="text-xl font-bold text-[var(--accent-primary)]">₹{s.recommended_price_inr}</div>
              <div className="text-[10px] text-[var(--text-tertiary)]">−{s.markdown_depth_pct.toFixed(0)}% from MRP</div>
            </div>
            {expanded ? (
              <ChevronUp size={16} className="text-[var(--text-tertiary)] mt-1" />
            ) : (
              <ChevronDown size={16} className="text-[var(--text-tertiary)] mt-1" />
            )}
          </div>
        </div>

        {/* Confidence + projected impact — always visible */}
        <div className="mt-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="text-[10px] text-[var(--text-tertiary)] mb-1">AI confidence</div>
            <ConfidenceBar score={s.confidence_score} />
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs font-semibold text-emerald-600">
              +{s.projected_additional_units.toLocaleString('en-IN')} units
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">projected recovery</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs font-semibold text-emerald-600">
              ₹{(s.projected_revenue_recovery_inr / 1_000).toFixed(0)}K recovered
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">revenue recovery</div>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[var(--border-subtle)] px-4 pb-4 pt-3 space-y-3 bg-[var(--bg-secondary)]">
          {/* Reasoning */}
          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
              <Sparkles size={11} className="text-[var(--accent-primary)]" />
              AI Reasoning
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-white rounded-lg p-3 border border-[var(--border-default)]">
              {s.reasoning}
            </p>
          </div>

          {/* Store-specific notes */}
          {s.store_specific_notes.length > 0 && (
            <div>
              <div className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
                <MapPin size={11} className="text-[var(--text-tertiary)]" />
                Store-Level Recommendations
              </div>
              <div className="space-y-1.5">
                {s.store_specific_notes.map((note, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)] bg-white rounded-lg p-2.5 border border-[var(--border-default)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-1" />
                    {note}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
                Metro stores clear 2-3× faster than Tier-3. Same SKU needs different markdown depth by store type.
                cx360 splits approval by store cluster when variance is &gt; 10 pp.
              </p>
            </div>
          )}

          {/* Data inputs */}
          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
              <Database size={11} className="text-[var(--text-tertiary)]" />
              Databricks Inputs
            </div>
            <div className="space-y-1">
              {s.data_inputs.map((input, i) => (
                <div key={i} className="text-[10px] text-[var(--text-tertiary)] font-mono bg-white px-2 py-1 rounded border border-[var(--border-default)]">
                  {input}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button className="btn-primary text-xs flex-1">
              Apply to Markdown Queue
            </button>
            <button className="btn-secondary text-xs px-3">
              Override depth
            </button>
            <button className="btn-secondary text-xs px-3">
              Snooze 7d
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
interface Props {
  suggestions: AIMarkdownSuggestion[];
}

export default function AIMarkdownSuggestions({ suggestions }: Props) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-[var(--accent-primary)]" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              AI-Driven Markdown Suggestions
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Generated by cx360 from sell-through pace, expiry proximity, response curves, and store variance
          </p>
        </div>
        <span className="badge badge-neutral text-[10px]">{suggestions.length} suggestions</span>
      </div>

      {/* How AI generates suggestions — collapsed methodology */}
      <div className="mb-4 p-3 bg-[var(--accent-primary-light)] rounded-lg text-xs text-[var(--accent-primary)] space-y-1">
        <div className="font-semibold mb-1">How cx360 AI calculates markdown depth:</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
          <span><strong>1.</strong> Current ST% vs target pace → measures urgency</span>
          <span><strong>2.</strong> Days to season exit / product expiry → deadline weight</span>
          <span><strong>3.</strong> Historical markdown response curves → velocity at each depth</span>
          <span><strong>4.</strong> Store-level ST variation → per-store depth differentiation</span>
        </div>
        <div className="mt-1 text-[10px] opacity-75">
          Indian consumer insight applied: &ldquo;₹X off&rdquo; framing generates 2× impulse vs &ldquo;X% off&rdquo; for grocery (FMCG market research 2024-2025).
          cx360 auto-generates shelf talker text in INR-off framing for every recommendation.
        </div>
      </div>

      {/* Suggestion cards */}
      <div className="space-y-3">
        {suggestions.map((s, i) => (
          <SuggestionCard key={s.sku_id} suggestion={s} index={i} />
        ))}
      </div>
    </div>
  );
}
