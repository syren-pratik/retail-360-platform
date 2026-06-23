'use client';

import { useRouter } from 'next/navigation';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import ForecastChart from '../components/ForecastChart';
import ForecastScenarioPlanner from '../components/ForecastScenarioPlanner';
import ForecastCalendar from '../components/ForecastCalendar';

type Persona = 'category_manager' | 'pricing_analyst' | 'vp_commercial';

interface Props {
  core: PriceIntelCore;
  persona: Persona;
}

function DeepDiveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-md hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 6V2h4M10 6v4H6M7.5 2H10v2.5M4.5 10H2V7.5" />
      </svg>
      Deep Dive
    </button>
  );
}

export default function ForecastingTab({ core }: Props) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      {/* Main forecast chart */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">14-Week Revenue Forecast</h3>
            <p className="text-xs text-[var(--text-secondary)]">95% confidence interval · event markers</p>
          </div>
          <DeepDiveButton onClick={() => router.push('/price-intel/deep-dive/forecasting')} />
        </div>
        <ForecastChart forecast={core.forecast_14w} />
      </div>

      {/* Scenario planner + event calendar */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Scenarios & Event Calendar</h3>
            <p className="text-xs text-[var(--text-secondary)]">What-if planning · seasonality index</p>
          </div>
          <DeepDiveButton onClick={() => router.push('/price-intel/deep-dive/forecasting')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ForecastScenarioPlanner forecast={core.forecast_14w} />
          <ForecastCalendar forecast={core.forecast_14w} />
        </div>
      </div>
    </div>
  );
}
