'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import { RFM_SEGMENTS } from '@/app/lib/dbx-fixtures';
import { useTenant } from '@/app/context/TenantContext';
import { buildAgentSKUContext } from './agent-skus';

interface Props {
  core: PriceIntelCore;
}

interface PromoScenarioResult {
  net_roi: number;
  incremental_revenue_inr: number;
  free_rider_estimate_pct: number;
  margin_impact_pp: number;
  recommendation: string;
  warnings: string[];
  scenario_comparison: { label: string; roi: number; margin_pp: number }[];
}

interface FormState {
  sku_id: string;
  discount_pct: number;
  duration_weeks: '1' | '2' | '4';
  mechanic: 'flat_off' | 'pct_off' | 'combo' | 'bogo' | 'cashback';
  segment: string;
}

const DURATION_OPTIONS: { label: string; value: FormState['duration_weeks'] }[] = [
  { label: '1 week', value: '1' },
  { label: '2 weeks', value: '2' },
  { label: '4 weeks', value: '4' },
];

const MECHANIC_OPTIONS: { label: string; value: FormState['mechanic'] }[] = [
  { label: 'Flat Off', value: 'flat_off' },
  { label: 'Percentage Off', value: 'pct_off' },
  { label: 'Combo Deal', value: 'combo' },
  { label: 'BOGO', value: 'bogo' },
  { label: 'Cashback', value: 'cashback' },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SEGMENT_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Customers', value: 'all' },
  ...RFM_SEGMENTS.map((s) => ({ label: s, value: s })),
];

function MetricCard({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
      <span
        className={`text-xl font-bold ${
          positive === true
            ? 'text-emerald-600'
            : positive === false
            ? 'text-rose-600'
            : 'text-[var(--text-primary)]'
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-[var(--text-tertiary)]">{sub}</span>}
    </div>
  );
}

export default function PromoScenarioAgent({ core }: Props) {
  const { isApparel } = useTenant();
  const ctx = buildAgentSKUContext(core, isApparel);
  const skuList = ctx.skus;
  const { currency, unitLabel, unitDivisor, segments } = ctx;
  const SEGMENT_OPTIONS_DYNAMIC = [
    { label: 'All Customers', value: 'all' },
    ...segments.map((s) => ({ label: s, value: s })),
  ];

  const [form, setForm] = useState<FormState>({
    sku_id: skuList[0]?.product_id ?? '',
    discount_pct: 15,
    duration_weeks: '2',
    mechanic: 'pct_off',
    segment: 'all',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PromoScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const skuData = skuList.find((s) => s.product_id === form.sku_id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/price-intel/agents/promo-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku_id: form.sku_id,
          discount_pct: form.discount_pct,
          duration_weeks: Number(form.duration_weeks),
          mechanic: form.mechanic,
          segment: form.segment,
          sku_data: skuData,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as PromoScenarioResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const maxBarRoi =
    result && result.scenario_comparison.length > 0
      ? Math.max(...result.scenario_comparison.map((s) => Math.abs(s.roi)), 0.01)
      : 1;

  return (
    <div className="space-y-5">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SKU selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Select SKU</label>
          <select
            value={form.sku_id}
            onChange={(e) => setForm((f) => ({ ...f, sku_id: e.target.value }))}
            className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-40"
          >
            {skuList.map((sku) => (
              <option key={sku.product_id} value={sku.product_id}>
                {sku.product_id} · {sku.category_l1} ({currency}{(sku.revenue_inr_7d / unitDivisor).toFixed(1)}{unitLabel} last 7d)
              </option>
            ))}
          </select>
        </div>

        {/* Discount depth slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Discount Depth
            </label>
            <span className="text-sm font-semibold text-[var(--accent-primary)]">
              {form.discount_pct}%
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={form.discount_pct}
            onChange={(e) =>
              setForm((f) => ({ ...f, discount_pct: Number(e.target.value) }))
            }
            className="w-full accent-[var(--accent-primary)]"
          />
          <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
            <span>5%</span>
            <span>50%</span>
          </div>
        </div>

        {/* Duration */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">Duration</label>
          <div className="flex gap-3">
            {DURATION_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="duration"
                  value={opt.value}
                  checked={form.duration_weeks === opt.value}
                  onChange={() => setForm((f) => ({ ...f, duration_weeks: opt.value }))}
                  className="accent-[var(--accent-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Mechanic + Segment row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Mechanic</label>
            <select
              value={form.mechanic}
              onChange={(e) =>
                setForm((f) => ({ ...f, mechanic: e.target.value as FormState['mechanic'] }))
              }
              className="text-sm bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-40"
            >
              {MECHANIC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Segment</label>
            <select
              value={form.segment}
              onChange={(e) =>
                setForm((f) => ({ ...f, segment: e.target.value }))
              }
              className="text-sm bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-40"
            >
              {SEGMENT_OPTIONS_DYNAMIC.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !form.sku_id}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--accent-primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Analyzing scenario…
            </>
          ) : (
            <>
              <TrendingUp size={15} />
              Run Simulation
            </>
          )}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="Net ROI"
              value={`${result.net_roi.toFixed(2)}x`}
              positive={result.net_roi >= 1}
            />
            <MetricCard
              label="Incremental Revenue"
              value={formatLakhsCrores(result.incremental_revenue_inr)}
              positive={result.incremental_revenue_inr > 0}
            />
            <MetricCard
              label="Free Rider Est."
              value={`${result.free_rider_estimate_pct.toFixed(1)}%`}
              positive={result.free_rider_estimate_pct < 30}
            />
          </div>

          {/* Recommendation */}
          <div
            className={`flex items-start gap-2.5 p-3.5 rounded-lg border text-sm ${
              result.net_roi >= 1
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <CheckCircle size={15} className="flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{result.recommendation}</p>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={13} className="text-amber-600" />
                <span className="text-xs font-semibold text-amber-700">Warnings</span>
              </div>
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                    <span className="mt-1 flex-shrink-0 w-1 h-1 rounded-full bg-amber-500" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Scenario comparison bar chart */}
          {result.scenario_comparison.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-[var(--text-secondary)] mb-3">
                Scenario Comparison — ROI
              </p>
              <div className="space-y-2.5">
                {result.scenario_comparison.map((sc, i) => {
                  const widthPct = Math.max(
                    4,
                    Math.round((Math.abs(sc.roi) / maxBarRoi) * 100)
                  );
                  const isPositive = sc.roi >= 1;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-tertiary)] w-24 flex-shrink-0 truncate">
                        {sc.label}
                      </span>
                      <div className="flex-1 h-5 bg-[var(--bg-secondary)] rounded overflow-hidden">
                        <div
                          className={`h-full rounded transition-all ${
                            isPositive ? 'bg-emerald-500' : 'bg-rose-400'
                          }`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-semibold w-12 text-right flex-shrink-0 ${
                          isPositive ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {sc.roi.toFixed(2)}x
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
