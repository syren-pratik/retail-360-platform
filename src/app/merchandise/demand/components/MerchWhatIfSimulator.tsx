'use client';

import type { MerchDemandSKU } from '@/app/lib/merch-demand-types';
import type { WhatIfParams } from '../lib/forecast-aggregation';

const PROMO_DEPTHS: WhatIfParams['promo_depth_pct'][] = [10, 15, 20, 25, 30];
const PROMO_TYPES: WhatIfParams['promo_type'][] = ['Flat %', 'BOGO', 'Bundle'];
const WEATHER_OPTIONS: { value: WhatIfParams['weather_shock']; label: string }[] = [
  { value: 'none', label: 'No shock' },
  { value: 'heatwave', label: 'Heatwave' },
  { value: 'unseasonal_rain', label: 'Unseasonal rain' },
  { value: 'cold_spell', label: 'Cold spell' },
];

interface Props {
  sku: MerchDemandSKU;
  params: WhatIfParams;
  onChange: (p: WhatIfParams) => void;
}

export default function MerchWhatIfSimulator({ sku, params, onChange }: Props) {
  const set = <K extends keyof WhatIfParams>(key: K, value: WhatIfParams[K]) =>
    onChange({ ...params, [key]: value });

  const priceSign = params.price_change_pct > 0 ? '+' : '';
  const priceColor =
    params.price_change_pct > 0 ? 'text-rose-600' :
    params.price_change_pct < 0 ? 'text-emerald-600' :
    'text-[var(--text-primary)]';

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-[var(--text-primary)]">What-if Simulator</p>

      {/* ── Price slider ── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[var(--text-secondary)]">Price change</span>
          <span className={`text-[10px] font-semibold tabular-nums ${priceColor}`}>
            {priceSign}{params.price_change_pct}%
          </span>
        </div>
        <input
          type="range"
          min={-30}
          max={30}
          step={1}
          value={params.price_change_pct}
          onChange={e => set('price_change_pct', Number(e.target.value))}
          className="w-full h-1.5 accent-[var(--accent-primary)] cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-[var(--text-tertiary)] mt-0.5">
          <span>-30%</span>
          <span>0</span>
          <span>+30%</span>
        </div>
      </div>

      {/* ── Promo toggle ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-[var(--text-secondary)]">Promotion</span>
          <button
            type="button"
            onClick={() => set('promo_active', !params.promo_active)}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              params.promo_active ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-default)]'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transform transition-transform ${
                params.promo_active ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {params.promo_active && (
          <div className="space-y-1.5 pl-0">
            {/* Depth selector */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[9px] text-[var(--text-tertiary)] w-10 flex-shrink-0">Depth</span>
              {PROMO_DEPTHS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set('promo_depth_pct', d)}
                  className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                    params.promo_depth_pct === d
                      ? 'bg-[var(--accent-primary-light)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-medium'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {d}%
                </button>
              ))}
            </div>

            {/* Type selector */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[var(--text-tertiary)] w-10 flex-shrink-0">Type</span>
              {PROMO_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('promo_type', t)}
                  className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors ${
                    params.promo_type === t
                      ? 'bg-[var(--accent-primary-light)] border-[var(--accent-primary)] text-[var(--accent-primary)] font-medium'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Weather shock (only for weather-sensitive SKUs) ── */}
      {sku.is_weather_sensitive && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[var(--text-secondary)]">Weather scenario</span>
          </div>
          <select
            value={params.weather_shock}
            onChange={e => set('weather_shock', e.target.value as WhatIfParams['weather_shock'])}
            className="w-full text-[10px] border border-[var(--border-default)] rounded-md px-2 py-1 bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
          >
            {WEATHER_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Reset link ── */}
      <button
        type="button"
        onClick={() => onChange({
          price_change_pct: 0,
          promo_active: false,
          promo_depth_pct: 20,
          promo_type: 'Flat %',
          weather_shock: 'none',
        })}
        className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors"
      >
        Reset to baseline
      </button>
    </div>
  );
}
