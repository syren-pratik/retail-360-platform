'use client';

import { useState } from 'react';
import PriceIntelChartCard from './PriceIntelChartCard';
import type { PriceIntelForecastPoint } from '@/app/lib/price-intel-types';
import { formatLakhsCrores, formatPercentSigned } from '@/app/lib/merch-format';

interface Props {
  forecast: PriceIntelForecastPoint[];
}

interface Scenario {
  id: string;
  label: string;
  priceChangePct: number;
  promoSpendChangePct: number;
  description: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'base',
    label: 'Base Case',
    priceChangePct: 0,
    promoSpendChangePct: 0,
    description: 'Current trajectory maintained',
  },
  {
    id: 'aggressive_promo',
    label: 'Aggressive Promo',
    priceChangePct: -5,
    promoSpendChangePct: +20,
    description: 'Deep discounts drive volume +18%, margin −4pp',
  },
  {
    id: 'price_optimize',
    label: 'Price Optimize',
    priceChangePct: +3,
    promoSpendChangePct: -15,
    description: 'Selective price increases, reduced promo waste',
  },
  {
    id: 'festival_boost',
    label: 'Festival Boost',
    priceChangePct: 0,
    promoSpendChangePct: +35,
    description: 'Festival calendar uplift — high volume window',
  },
];

function applyScenario(forecast: PriceIntelForecastPoint[], scenario: Scenario) {
  const revenueMultiplier = 1 + scenario.promoSpendChangePct / 100 * 0.4 + scenario.priceChangePct / 100 * 0.6;
  const marginMultiplier = 1 + scenario.priceChangePct / 100 * 1.2 - scenario.promoSpendChangePct / 100 * 0.15;

  const totalRevenue = forecast.reduce((s, p) => s + p.forecast_revenue_inr * revenueMultiplier, 0);
  const totalMargin = forecast.reduce((s, p) => s + p.forecast_margin_inr * marginMultiplier, 0);
  const baseRevenue = forecast.reduce((s, p) => s + p.forecast_revenue_inr, 0);
  const baseMargin = forecast.reduce((s, p) => s + p.forecast_margin_inr, 0);

  return { totalRevenue, totalMargin, baseRevenue, baseMargin };
}

export default function ForecastScenarioPlanner({ forecast }: Props) {
  const [active, setActive] = useState<string>('base');

  const activeScenario = SCENARIOS.find((s) => s.id === active) ?? SCENARIOS[0];
  const { totalRevenue, totalMargin, baseRevenue, baseMargin } = applyScenario(forecast, activeScenario);

  const revDelta = totalRevenue - baseRevenue;
  const marginDelta = totalMargin - baseMargin;

  return (
    <PriceIntelChartCard
      data={forecast as unknown as Record<string, unknown>[]}
      id="price-intel-scenario-planner"
      title="Scenario Planner"
      subtitle="Simulated 14-week impact"
      height={280}
      exportFilename="price_intel_scenarios"
    >
      <div className="flex flex-col gap-3 h-full">
        <div className="grid grid-cols-2 gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                active === s.id
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                  : 'border-[var(--border-default)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <p className={`text-xs font-semibold mb-0.5 ${active === s.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                {s.label}
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">{s.description}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="card p-3 bg-[var(--bg-secondary)]">
            <p className="text-[10px] text-[var(--text-tertiary)] mb-1">14W Revenue</p>
            <p className="text-base font-bold text-[var(--text-primary)]">{formatLakhsCrores(totalRevenue)}</p>
            <p className={`text-xs font-medium mt-0.5 ${revDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatPercentSigned((revDelta / baseRevenue) * 100)} vs base
            </p>
          </div>
          <div className="card p-3 bg-[var(--bg-secondary)]">
            <p className="text-[10px] text-[var(--text-tertiary)] mb-1">14W Margin</p>
            <p className="text-base font-bold text-[var(--text-primary)]">{formatLakhsCrores(totalMargin)}</p>
            <p className={`text-xs font-medium mt-0.5 ${marginDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatPercentSigned((marginDelta / baseMargin) * 100)} vs base
            </p>
          </div>
        </div>
      </div>
    </PriceIntelChartCard>
  );
}
