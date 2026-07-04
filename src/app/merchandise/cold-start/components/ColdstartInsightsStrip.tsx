'use client';

import React from 'react';
import InsightStrip from '@/app/components/insights/InsightStrip';
import type { Insight } from '@/app/lib/insight-engine';
import { useTenant } from '@/app/context/TenantContext';

const GROCERY_INSIGHTS: Insight[] = [
  {
    id: 'ci-insight-1',
    type: 'risk',
    severity: 'warning',
    title: 'Energy Drinks × Hypermarket worst forecasts',
    description: '6 SKUs in this category × store-type combo show 64.7% MAPE — 2.3× the champion average. High impulse-buy volatility in large-format stores amplifies analog city noise.',
    source: 'coldstart',
    relatedChart: 'coldstart-heatmap',
  },
  {
    id: 'ci-insight-2',
    type: 'trend',
    severity: 'positive',
    title: 'Champion converges by Day 57',
    description: 'Blended forecast stabilizes within ±5pp of its Day-90 MAPE value at Day 57, 23 days earlier than the acceptable threshold. Local data accumulation drives α to 0.63 by that point.',
    source: 'coldstart',
    relatedChart: 'coldstart-adaptation-curve',
  },
  {
    id: 'ci-insight-3',
    type: 'opportunity',
    severity: 'positive',
    title: 'Festival ramps consistent with mainland',
    description: 'Diwali × Frozen Foods peaks at 3.13× on launch Day 0, closely mirroring Jaipur analog patterns. Festival uplift transfers reliably — no city-specific recalibration needed.',
    source: 'coldstart',
    relatedChart: 'coldstart-festival-ramp',
  },
  {
    id: 'ci-insight-4',
    type: 'anomaly',
    severity: 'info',
    title: 'Jaipur drives 38.8% of forecast',
    description: 'Highest analog weight at 0.6481 similarity score — 25.9pp above Ahmedabad (rank 2). Semi-arid climate and comparable GDP per capita make Jaipur the dominant prior for Lucknow.',
    source: 'coldstart',
    relatedChart: 'coldstart-analog-city-map',
  },
];

const APPAREL_INSIGHTS: Insight[] = [
  {
    id: 'ci-insight-a1',
    type: 'risk',
    severity: 'warning',
    title: 'Womens × Mall worst forecasts',
    description: 'Womens Dresses in Mall stores show 42% MAPE — 2.6× champion average. Trend-driven demand + high returns rate (22%) create wide prediction bands until 4 weeks of local data accrues.',
    source: 'coldstart',
    relatedChart: 'coldstart-heatmap',
  },
  {
    id: 'ci-insight-a2',
    type: 'trend',
    severity: 'positive',
    title: 'Champion converges by Day 18',
    description: 'Attribute-blend + top-3 analog champion stabilizes within ±5pp of its Day-90 MAPE at Day 18, driven by fast BTS signal accrual. Local Austin sales weight α reaches 0.63 by that point.',
    source: 'coldstart',
    relatedChart: 'coldstart-adaptation-curve',
  },
  {
    id: 'ci-insight-a3',
    type: 'opportunity',
    severity: 'positive',
    title: 'BTS ramp mirrors Dallas patterns',
    description: 'BTS 2026 × Kids Bottoms peaks at 2.8× on Aug 15, closely tracking Dallas analog. Event lift transfers reliably — no market-specific recalibration needed for major seasonal windows.',
    source: 'coldstart',
    relatedChart: 'coldstart-festival-ramp',
  },
  {
    id: 'ci-insight-a4',
    type: 'anomaly',
    severity: 'info',
    title: 'Dallas drives 34% of forecast',
    description: 'Highest analog weight at 0.82 similarity — 4pp above Houston (rank 2). Humid Subtropical climate + apparel spend index + Sun-Belt demographics make Dallas the dominant prior for Austin.',
    source: 'coldstart',
    relatedChart: 'coldstart-analog-city-map',
  },
];

export default function ColdstartInsightsStrip() {
  const { isApparel } = useTenant();
  const insights = isApparel ? APPAREL_INSIGHTS : GROCERY_INSIGHTS;
  return (
    <InsightStrip
      insights={insights}
      loading={false}
      source="claude"
      onRefresh={() => {}}
      isFiltered={false}
      onScrollToChart={() => {}}
    />
  );
}
