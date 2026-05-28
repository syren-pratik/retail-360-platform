'use client';

import React, { useState } from 'react';
import type { ColdstartMethodology as MethodologyType } from '@/app/lib/coldstart-types';
import { ChevronDown } from 'lucide-react';

interface Props {
  methodology: MethodologyType;
}

export default function ColdstartMethodology({ methodology }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card">
      {/* Accordion header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Methodology</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Algorithm details, training data, and MLflow experiment
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`text-[var(--text-secondary)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Accordion body */}
      {open && (
        <div className="mt-4 grid grid-cols-2 gap-6 text-xs border-t border-[var(--border-default)] pt-4">
          {/* Left column: algorithm + features */}
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Algorithm</p>
              <p className="text-[var(--text-primary)] leading-relaxed">{methodology.algorithm}</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Features</p>
              <div className="flex flex-wrap gap-1.5">
                {methodology.features.map((f) => (
                  <span
                    key={f}
                    className="px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-[10px] font-mono"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Convergence Criterion</p>
              <p className="text-[var(--text-primary)] font-mono text-[11px] bg-[var(--bg-secondary)] px-2.5 py-1.5 rounded">
                {methodology.convergence_criterion}
              </p>
            </div>
          </div>

          {/* Right column: training stats + MLflow */}
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Training Data</p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Training rows</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {methodology.training_data_rows.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Holdout rows</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {methodology.holdout_data_rows.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Total rows</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {(methodology.training_data_rows + methodology.holdout_data_rows).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Train / holdout split</span>
                  <span className="font-mono text-[var(--text-primary)]">
                    {((methodology.training_data_rows / (methodology.training_data_rows + methodology.holdout_data_rows)) * 100).toFixed(1)}% / {((methodology.holdout_data_rows / (methodology.training_data_rows + methodology.holdout_data_rows)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">Iterations</p>
              <p className="font-mono font-bold text-xl text-[var(--text-primary)]">{methodology.n_iterations}</p>
              <p className="text-[var(--text-tertiary)] text-[10px]">cross-validation folds over analog city pool</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5">MLflow Experiment</p>
              <p className="font-mono text-[11px] bg-[var(--bg-secondary)] px-2.5 py-1.5 rounded text-[var(--text-primary)] break-all">
                {methodology.mlflow_experiment}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
