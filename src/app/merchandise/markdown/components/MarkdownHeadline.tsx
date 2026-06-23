'use client';

import { AlertTriangle, CalendarCheck, PackageX, TrendingUp } from 'lucide-react';
import type { MarkdownHeadlineStats } from '../markdown-types';

interface Props {
  headline: MarkdownHeadlineStats;
  activeSeason: {
    name: string;
    current_week: number;
    total_weeks: number;
    end_date: string;
  };
}

function formatInr(paisa: number): string {
  if (paisa >= 1_00_000) return `₹${(paisa / 1_00_000).toFixed(1)}L`;
  if (paisa >= 1_000) return `₹${(paisa / 1_000).toFixed(1)}K`;
  return `₹${paisa}`;
}

export default function MarkdownHeadline({ headline, activeSeason }: Props) {
  const exitDate = new Date(headline.season_exit_date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const weekProgress = (activeSeason.current_week / activeSeason.total_weeks) * 100;

  return (
    <div className="bg-white border border-[var(--border-default)] rounded-lg overflow-hidden">
      {/* Top bar: season progress */}
      <div className="h-1 bg-[var(--bg-tertiary)] relative">
        <div
          className="absolute left-0 top-0 h-full bg-orange-400 transition-all duration-700"
          style={{ width: `${weekProgress}%` }}
        />
      </div>

      <div className="px-6 py-4">
        <div className="flex items-start justify-between gap-6">
          {/* Title block */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                {activeSeason.name}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                Week {activeSeason.current_week} of {activeSeason.total_weeks}
              </span>
            </div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Markdown Clearance Cockpit
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Season exit {exitDate} · {headline.days_to_season_exit} days remaining to clear
            </p>
          </div>

          {/* Quick action hint */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2 flex-shrink-0">
            <span>Click any heatmap cell to drill into that category × week</span>
          </div>
        </div>

        {/* 4 headline stats */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          {/* Active SKUs */}
          <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={18} className="text-blue-600" />
            </div>
            <div>
              <div className="text-xl font-semibold text-[var(--text-primary)]">
                {headline.active_markdown_skus.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">Active markdown SKUs</div>
            </div>
          </div>

          {/* On track */}
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CalendarCheck size={18} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-xl font-semibold text-emerald-700">
                {headline.on_track_pct}%
              </div>
              <div className="text-xs text-emerald-600">On pace to clear</div>
            </div>
          </div>

          {/* SKUs flagged */}
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div>
              <div className="text-xl font-semibold text-amber-700">
                {headline.skus_flagged_at_risk}
              </div>
              <div className="text-xs text-amber-600">SKUs flagged at risk</div>
            </div>
          </div>

          {/* Inventory at risk */}
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <PackageX size={18} className="text-red-600" />
            </div>
            <div>
              <div className="text-xl font-semibold text-red-700">
                {formatInr(headline.inventory_at_risk_inr)}
              </div>
              <div className="text-xs text-red-600">Inventory at write-off risk</div>
            </div>
          </div>
        </div>

        {/* How calculated — collapsed context */}
        <div className="mt-3 text-xs text-[var(--text-tertiary)] flex flex-wrap gap-x-4 gap-y-1">
          <span>Active SKUs: enrolled in markdown program with WOS &gt; remaining season weeks</span>
          <span>·</span>
          <span>At-risk: predicted sell-through &lt;70% at current weekly pace</span>
          <span>·</span>
          <span>Write-off risk: at-risk units × cost price (Databricks: dim_product)</span>
        </div>
      </div>
    </div>
  );
}
