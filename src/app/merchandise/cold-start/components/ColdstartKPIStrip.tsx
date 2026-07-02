'use client';

import React from 'react';
import KPICard from '@/app/components/kpi/KPICard';
import type { ColdstartKPIs } from '@/app/lib/coldstart-types';

interface Props {
  kpis: ColdstartKPIs;
}

export default function ColdstartKPIStrip({ kpis }: Props) {
  const improvementChange = `vs ${(kpis.naive_mape * 100).toFixed(1)}% naive`;
  const convergedPct = Math.round((kpis.converged_skus / kpis.total_skus) * 100);

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Champion MAPE */}
      <div className="animate-fade-slide-up stagger-1">
        <KPICard
          label="Champion MAPE"
          value={`${(kpis.champion_mape * 100).toFixed(1)}%`}
          change={-kpis.improvement_pct}
          changeLabel={improvementChange}
          invertColors={true}
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-1 px-1">
          Fix 2: Blending · 90-day holdout
        </p>
      </div>

      {/* Improvement vs Naive */}
      <div className="animate-fade-slide-up stagger-2">
        <KPICard
          label="Improvement vs Naive"
          value={`${kpis.improvement_pct.toFixed(1)}%`}
          change={kpis.improvement_pct}
          changeLabel="MAPE reduction"
          invertColors={false}
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-1 px-1">
          {(kpis.naive_mape * 100).toFixed(1)}% → {(kpis.champion_mape * 100).toFixed(1)}%
        </p>
      </div>

      {/* Cold-Start SKUs */}
      <div className="animate-fade-slide-up stagger-3">
        <KPICard
          label="Cold-Start SKUs"
          value={String(kpis.total_skus)}
          change={0}
          changeLabel={`${kpis.converged_skus} converged (${convergedPct}%)`}
          invertColors={false}
          filteredCount={kpis.converged_skus}
          totalCount={kpis.total_skus}
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-1 px-1">
          target city launch cohort
        </p>
      </div>

      {/* Convergence Day */}
      <div className="animate-fade-slide-up stagger-4">
        <KPICard
          label="Model Convergence"
          value={`Day ${kpis.convergence_day}`}
          change={-(kpis.holdout_days - kpis.convergence_day)}
          changeLabel={`${kpis.holdout_days - kpis.convergence_day}d before holdout end`}
          invertColors={true}
        />
        <p className="text-xs text-[var(--text-tertiary)] mt-1 px-1">
          When blending beats naive consistently
        </p>
      </div>
    </div>
  );
}
