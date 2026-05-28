'use client';

import React, { useState } from 'react';
import {
  Cloud,
  TrendingUp,
  Activity,
  Calendar,
  Tag,
  MapPin,
  Layers,
  DollarSign,
  Database,
  Building2,
  Sparkles,
} from 'lucide-react';
import type { ColdstartExternalSignal, ColdstartSignalIntegration } from '@/app/lib/coldstart-types';

interface Props {
  signals: ColdstartExternalSignal[];
  integration: ColdstartSignalIntegration;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Cloud,
  TrendingUp,
  Activity,
  Calendar,
  Tag,
  MapPin,
  Layers,
  DollarSign,
  Database,
  Building2,
  Sparkles,
};

const LAYER_STYLES: Record<string, { badge: string; border: string; bg: string }> = {
  Silver: { badge: 'bg-slate-100 text-slate-700 border border-slate-200', border: 'border-slate-200', bg: 'bg-slate-50' },
  Gold:   { badge: 'bg-amber-100 text-amber-700 border border-amber-200', border: 'border-amber-200', bg: 'bg-amber-50'  },
  ML:     { badge: 'bg-blue-100  text-blue-700  border border-blue-200',  border: 'border-blue-200',  bg: 'bg-blue-50'   },
};

function formatRows(n: number): string {
  if (n >= 1e8) return `${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

export default function ColdstartExternalSignals({ signals, integration }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const kpiTiles = [
    { label: 'Total Signals', value: String(integration.total_signals), sub: 'Silver · Gold · ML' },
    { label: 'Feature Columns', value: String(integration.total_columns), sub: 'across all tables' },
    { label: 'Total Rows', value: `${integration.total_rows_millions}M`, sub: 'training + inference' },
    { label: 'Used in Model', value: String(integration.used_in_cold_start_model), sub: `of ${integration.total_signals} signals active` },
  ];

  return (
    <div className="space-y-4">
      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-3">
        {kpiTiles.map((tile) => (
          <div key={tile.label} className="card p-4">
            <p className="text-xs text-[var(--text-secondary)] mb-1">{tile.label}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{tile.value}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{tile.sub}</p>
          </div>
        ))}
      </div>

      {/* Layer flow viz */}
      <div className="card px-5 py-3">
        <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide mb-2 font-medium">Data Pipeline Flow</p>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {[
            { label: 'Bronze', count: 28, style: 'bg-orange-100 text-orange-700 border border-orange-200' },
            { label: 'Silver', count: 28, style: LAYER_STYLES.Silver.badge },
            { label: 'Gold',   count: 4,  style: LAYER_STYLES.Gold.badge   },
            { label: 'ML',     count: 1,  style: LAYER_STYLES.ML.badge     },
          ].map((layer, i, arr) => (
            <React.Fragment key={layer.label}>
              <span className={`px-2.5 py-1 rounded-full font-medium ${layer.style}`}>
                {layer.label} <span className="opacity-70">({layer.count})</span>
              </span>
              {i < arr.length - 1 && (
                <span className="text-[var(--text-tertiary)]">→</span>
              )}
            </React.Fragment>
          ))}
          <span className="ml-2 text-[var(--text-tertiary)] text-[10px]">· tables used in cold-start pipeline</span>
        </div>
      </div>

      {/* Signal grid */}
      <div className="grid grid-cols-3 gap-3">
        {signals.map((sig) => {
          const Icon = ICON_MAP[sig.icon_name] ?? Database;
          const layerStyle = LAYER_STYLES[sig.layer];
          const isExpanded = expandedId === sig.signal_id;

          return (
            <div
              key={sig.signal_id}
              className={`card border ${layerStyle.border} transition-all duration-200 cursor-pointer`}
              onClick={() => setExpandedId(isExpanded ? null : sig.signal_id)}
            >
              <div className="p-4">
                {/* Header row */}
                <div className="flex items-start gap-3 mb-2">
                  <div className={`p-1.5 rounded-md ${layerStyle.bg} shrink-0`}>
                    <Icon className={`w-4 h-4 ${sig.layer === 'Silver' ? 'text-slate-600' : sig.layer === 'Gold' ? 'text-amber-600' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] leading-snug">{sig.display_name}</p>
                    <p className="text-[10px] font-mono text-[var(--text-tertiary)] mt-0.5 truncate">{sig.source_table}</p>
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${layerStyle.badge}`}>
                    {sig.layer}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    sig.freshness_status === 'fresh'
                      ? 'bg-emerald-100 text-emerald-700'
                      : sig.freshness_status === 'stale'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {sig.freshness_status}
                  </span>
                  {!sig.used_in_model && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                      not active
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-2.5 grid grid-cols-3 gap-1 text-center">
                  <div>
                    <p className="text-[11px] font-bold text-[var(--text-primary)]">{formatRows(sig.n_rows)}</p>
                    <p className="text-[9px] text-[var(--text-tertiary)]">rows</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--text-primary)]">{sig.n_columns}</p>
                    <p className="text-[9px] text-[var(--text-tertiary)]">cols</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--text-primary)]">{sig.refresh_cadence}</p>
                    <p className="text-[9px] text-[var(--text-tertiary)]">refresh</p>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className={`border-t ${layerStyle.border} ${layerStyle.bg} px-4 py-3 space-y-2`}>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{sig.description}</p>
                  <div>
                    <p className="text-[10px] font-medium text-[var(--text-primary)] mb-1">Key features</p>
                    <div className="flex flex-wrap gap-1">
                      {sig.key_features.map((f) => (
                        <span key={f} className="text-[10px] font-mono bg-white border border-[var(--border-default)] px-1.5 py-0.5 rounded">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 text-[10px] text-[var(--text-tertiary)]">
                    <span>{sig.coverage_start} → {sig.coverage_end}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
