'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, RotateCcw } from 'lucide-react';
import {
  topSuppliers,
  STORES,
  departmentNames,
  dcChoices,
} from '@/app/lib/dbx-fixtures';
import { useTenant } from '@/app/context/TenantContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MitigationAction {
  action: string;
  timing: string;
  expected_impact: string;
}

interface ScenarioImpact {
  revenue_at_risk_cr: number;
  stockout_skus_affected: number;
  stores_affected: number;
  days_to_resolve: number;
  mitigation_actions: (string | MitigationAction)[];
  cascade_events: string[];
  summary?: string;
}

interface ScenarioResult {
  scenario_type: string;
  input_params: Record<string, unknown>;
  impact: ScenarioImpact;
  confidence: string;
  generated_at: string;
}

interface ScenarioParam {
  key: string;
  label: string;
  type: 'select' | 'number';
  options?: string[];
  min?: number;
  max?: number;
  default?: number | string;
}

interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  icon: string;
  params: ScenarioParam[];
}

// ─── Presets ──────────────────────────────────────────────────────────────────

// Options resolved from real Databricks data so the cascade analysis uses values
// that actually exist (supplier_name → gold_supplier_scorecard, etc.).
const REAL_SUPPLIERS = topSuppliers(10);
const REAL_DEPARTMENTS = departmentNames();
const REAL_STORES = STORES.slice(0, 12).map((s) => s.store_name);
const REAL_DCS = dcChoices();

// Apparel-tenant equivalents (US market)
const APPAREL_SUPPLIERS = [
  'Nike', 'Levi Strauss', 'Lululemon', 'VF Corp', 'PVH Corp',
  'Tapestry', 'Under Armour', 'Adidas', 'Hanesbrands', 'Carter\'s',
];
const APPAREL_DEPARTMENTS = ['Mens', 'Womens', 'Kids', 'Footwear', 'Accessories'];
const APPAREL_STORES = [
  'New York Flagship 1', 'Los Angeles Mall 1', 'Chicago Outlet 1', 'Dallas Urban 1',
  'Houston Popup 1', 'Atlanta Flagship 2', 'Boston Mall 2', 'Seattle Outlet 2',
  'Denver Urban 2', 'Miami Popup 2', 'Minneapolis Flagship 3', 'Phoenix Mall 3',
];
const APPAREL_DCS = [
  { value: 'reno',      label: 'West Region DC — Reno' },
  { value: 'memphis',   label: 'Central Region DC — Memphis' },
  { value: 'allentown', label: 'Northeast Region DC — Allentown' },
  { value: 'atlanta',   label: 'Southeast Region DC — Atlanta' },
];

function buildScenarioPresets(isApparel: boolean): ScenarioPreset[] {
  const suppliers  = isApparel ? APPAREL_SUPPLIERS  : REAL_SUPPLIERS;
  const departments = isApparel ? APPAREL_DEPARTMENTS : REAL_DEPARTMENTS;
  const stores     = isApparel ? APPAREL_STORES     : REAL_STORES;
  const dcs        = isApparel ? APPAREL_DCS        : REAL_DCS;
  return [
    {
      id: 'supplier_delay',
      label: 'Supplier Delay',
      description: 'What if a key supplier is delayed by X days?',
      icon: '🚚',
      params: [
        { key: 'supplier', label: 'Supplier', type: 'select', options: suppliers },
        { key: 'delay_days', label: 'Delay (days)', type: 'number', min: 1, max: 30, default: 7 },
      ],
    },
    {
      id: 'demand_spike',
      label: 'Demand Spike',
      description: 'What if demand jumps X% for a category?',
      icon: '📈',
      params: [
        { key: 'category', label: 'Category', type: 'select', options: departments },
        { key: 'spike_pct', label: 'Spike (%)', type: 'number', min: 10, max: 200, default: 40 },
        { key: 'duration_days', label: 'Duration (days)', type: 'number', min: 1, max: 14, default: 3 },
      ],
    },
    {
      id: 'store_closure',
      label: 'Store Closure',
      description: 'What if a store closes for X days?',
      icon: '🏪',
      params: [
        { key: 'store', label: 'Store', type: 'select', options: stores },
        { key: 'closure_days', label: 'Closure (days)', type: 'number', min: 1, max: 30, default: 3 },
      ],
    },
    {
      id: 'dc_disruption',
      label: 'DC Disruption',
      description: 'What if a distribution centre goes offline?',
      icon: '🏭',
      params: [
        { key: 'dc', label: 'Distribution Centre', type: 'select', options: dcs.map((d) => d.label) },
        { key: 'disruption_hours', label: 'Downtime (hours)', type: 'number', min: 4, max: 72, default: 24 },
      ],
    },
  ];
}

// ─── Quick Presets ───────────────────────────────────────────────────────────

function buildQuickPresets(isApparel: boolean) {
  const suppliers  = isApparel ? APPAREL_SUPPLIERS  : REAL_SUPPLIERS;
  const departments = isApparel ? APPAREL_DEPARTMENTS : REAL_DEPARTMENTS;
  const stores     = isApparel ? APPAREL_STORES     : REAL_STORES;
  const dcs        = isApparel ? APPAREL_DCS        : REAL_DCS;
  const eventName  = isApparel ? 'BTS' : 'Diwali';
  return [
    {
      label: `${suppliers[0]} delays 14 days`,
      scenario: 'supplier_delay',
      params: { supplier: suppliers[0], delay_days: 14 },
    },
    {
      label: `${eventName} demand spike +60% (${departments[0]})`,
      scenario: 'demand_spike',
      params: { category: departments[0], spike_pct: 60, duration_days: 5 },
    },
    {
      label: `${dcs[0]?.label ?? 'DC'} offline 24h`,
      scenario: 'dc_disruption',
      params: { dc: dcs[0]?.label ?? 'DC', disruption_hours: 24 },
    },
    {
      label: `${stores[0]} closes 3 days`,
      scenario: 'store_closure',
      params: { store: stores[0], closure_days: 3 },
    },
  ];
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildScenarioPrompt(scenario: ScenarioPreset, params: Record<string, unknown>, isApparel: boolean): string {
  const analystPreamble = isApparel
    ? 'You are a supply chain analyst for a large US omnichannel apparel retailer (150+ stores across Flagship, Mall, Outlet, Urban, and Popup formats spanning Northeast, Southeast, Central, and West regions, with 4 DCs in Reno, Memphis, Allentown, and Atlanta).'
    : 'You are a supply chain analyst for a large Indian omnichannel retailer (275 active stores across Hypermarket, Supermarket, Express, Dark Store, and Kirana Partner formats spanning South, West, North, and East regions).';
  const currencyAsk = isApparel
    ? 'What is the $ revenue at risk per day (in USD)?'
    : 'What is the ₹ revenue at risk per day?';
  const revenueKey  = isApparel ? 'revenue_at_risk_usd_m' : 'revenue_at_risk_cr';
  const jsonSchema = `{"${revenueKey}":number,"stockout_skus_affected":number,"stores_affected":number,"days_to_resolve":number,"cascade_events":["Day 0: event","Day 1-2: event","Day 3-5: event","Day 7+: event"],"mitigation_actions":[{"action":"string","timing":"Immediate|24h|1 week","expected_impact":"string"}],"confidence":"high|medium|low","summary":"2-sentence executive summary"}`;

  const prompts: Record<string, string> = {
    supplier_delay: `${analystPreamble}

Use the REAL CURRENT STATE block below for baselines — do not invent figures.

SCENARIO: ${params.supplier} announces a ${params.delay_days}-day delay on all current and upcoming orders due to a manufacturing disruption.

Analyse the CASCADE IMPACT:
1. Which SKUs and categories will be first affected (Days 1-3)?
2. Which stores will hit stockout first and when?
3. ${currencyAsk}
4. How does the impact compound over ${params.delay_days} days?
5. What are the top 3 mitigation actions with specific timelines?

Respond in this exact JSON format (no markdown, just raw JSON):
${jsonSchema}`,

    demand_spike: `${analystPreamble}

Use the REAL CURRENT STATE block below for baselines — do not invent figures.

SCENARIO: ${params.category} experiences a sudden ${params.spike_pct}% demand spike lasting ${params.duration_days} days (${isApparel ? 'BTS ramp, BFCM, weather event, or viral trend' : 'festival, weather event, or viral trend'}).

Analyse:
1. When do stores start hitting stockout?
2. ${currencyAsk} during spike
3. Which stores run out first?
4. What emergency procurement is possible?
5. Top 3 immediate actions

Respond in this exact JSON format (no markdown, just raw JSON):
${jsonSchema}`,

    store_closure: `${analystPreamble}

SCENARIO: ${params.store} must close for ${params.closure_days} days (maintenance, safety, or emergency).

This store serves ~4,000-8,000 daily customers. Analyse:
1. Revenue impact per day
2. Customer deflection to nearby stores — demand increase there
3. Inventory management — what to do with existing stock
4. Reopening replenishment needs
5. Top 3 actions

Respond in this exact JSON format (no markdown, just raw JSON):
${jsonSchema}`,

    dc_disruption: `${analystPreamble}

SCENARIO: ${params.dc} goes offline for ${params.disruption_hours} hours due to a system/operational failure.

The REAL CURRENT STATE block below lists network-wide inventory health by region — use it to identify which stores depend on this DC and quantify the cascade.

Analyse the cascade:
1. Which stores are immediately affected?
2. Hours until first stockouts occur
3. Revenue at risk per hour of downtime
4. Emergency rerouting options
5. Top 3 immediate actions

Respond in this exact JSON format (no markdown, just raw JSON):
${jsonSchema}`,
  };

  return prompts[scenario.id] || `Analyse the supply chain impact of: ${JSON.stringify(params)}`;
}

// ─── Response Parser ──────────────────────────────────────────────────────────

function parseScenarioResponse(
  content: string,
  scenario: ScenarioPreset,
  params: Record<string, unknown>
): ScenarioResult {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        scenario_type: scenario.id,
        input_params: params,
        impact: parsed,
        confidence: parsed.confidence || 'medium',
        generated_at: new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error('Parse error:', e);
  }
  return {
    scenario_type: scenario.id,
    input_params: params,
    impact: {
      revenue_at_risk_cr: 0,
      stockout_skus_affected: 0,
      stores_affected: 0,
      days_to_resolve: 0,
      mitigation_actions: [content],
      cascade_events: [],
    },
    confidence: 'low',
    generated_at: new Date().toISOString(),
  };
}

// ─── Timing badge ─────────────────────────────────────────────────────────────

function TimingBadge({ timing }: { timing: string }) {
  const styles: Record<string, string> = {
    'Immediate': 'bg-red-50 text-red-700',
    '24h': 'bg-amber-50 text-amber-700',
    '1 week': 'bg-blue-50 text-blue-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[timing] ?? 'bg-gray-50 text-gray-600'}`}>
      {timing}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScenarioSimulatorContent() {
  const { isApparel } = useTenant();
  const SCENARIO_PRESETS = buildScenarioPresets(isApparel);
  const QUICK_PRESETS = buildQuickPresets(isApparel);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('supplier_delay');
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedScenario = SCENARIO_PRESETS.find(s => s.id === selectedScenarioId) ?? SCENARIO_PRESETS[0];

  const getParamValue = (param: ScenarioParam) => {
    if (paramValues[param.key] !== undefined) return paramValues[param.key];
    if (param.type === 'select') return param.options?.[0] ?? '';
    return param.default ?? param.min ?? 1;
  };

  const applyQuickPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setSelectedScenarioId(preset.scenario);
    setParamValues(preset.params);
    setResult(null);
    setError(null);
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setParamValues({});
  };

  const runScenario = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    const currentParams: Record<string, unknown> = {};
    selectedScenario.params.forEach(p => {
      currentParams[p.key] = getParamValue(p);
    });

    try {
      // Step 1: fetch real baseline from Databricks so Claude reasons over actual state, not boilerplate
      const ctxRes = await fetch('/api/scenario-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: selectedScenario.id, params: currentParams }),
      });
      const ctxData = await ctxRes.json();

      // Step 2: build a prompt that uses the real baseline numbers
      const baselineBlock = `## REAL CURRENT STATE (from Databricks, queried ${ctxData.queriedAt}):
${JSON.stringify(ctxData.baseline, null, 2)}

Use these EXACT numbers as the baseline for your cascade analysis. Do not invent figures.`;

      const scenarioDescription = `${buildScenarioPrompt(selectedScenario, currentParams, isApparel)}\n\n${baselineBlock}`;

      // Step 3: ask Claude to model the cascade on top of the real state
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: scenarioDescription,
          history: [],
          module: 'inventory',
          context: { baseline: ctxData.baseline, baselineSource: ctxData.source },
        }),
      });

      const data = await response.json();
      const content = data.answer || '';
      setResult(parseScenarioResponse(content, selectedScenario, currentParams));
    } catch (err) {
      setError('Failed to connect to AI. Please try again.');
      console.error('Scenario API error:', err);
    } finally {
      setLoading(false);
    }
  };

  const confidenceColor = (c: string) =>
    c === 'high' ? 'text-green-600' : c === 'medium' ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* Sticky nav */}
      <div className="sticky top-0 z-20 bg-white border-b border-[var(--border-default)] px-6 py-3 flex items-center gap-3">
        <Link
          href="/inventory"
          className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Supply Intelligence
        </Link>
        <span className="text-[var(--border-default)]">|</span>
        <span className="text-sm font-semibold text-[var(--text-primary)]">Scenario Simulator</span>
        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">AI-Powered</span>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">What-If Scenario Simulator</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Model the impact of supply disruptions before they happen. Claude analyses cascade effects across your network.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-6">

          {/* ── LEFT PANEL (2/5) ── */}
          <div className="col-span-2 space-y-5">

            {/* Step 1: Scenario type */}
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Step 1 — Select Scenario</p>
              <div className="grid grid-cols-2 gap-2">
                {SCENARIO_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => { setSelectedScenarioId(preset.id); setResult(null); setParamValues({}); }}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      selectedScenarioId === preset.id
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-light)]'
                        : 'border-[var(--border-default)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    <div className="text-xl mb-1">{preset.icon}</div>
                    <p className={`text-xs font-semibold ${selectedScenarioId === preset.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                      {preset.label}
                    </p>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 leading-tight">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Parameters */}
            <div className="card p-4 space-y-4">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Step 2 — Set Parameters</p>
              {selectedScenario.params.map(param => (
                <div key={param.key}>
                  <label className="text-xs font-medium text-[var(--text-primary)] mb-1.5 block">
                    {param.label}
                    {param.type === 'number' && (
                      <span className="ml-2 font-semibold text-[var(--accent-primary)]">
                        {getParamValue(param) as number}
                        {param.key.includes('pct') ? '%' : param.key.includes('hours') ? 'h' : param.key.includes('days') ? 'd' : ''}
                      </span>
                    )}
                  </label>
                  {param.type === 'select' ? (
                    <select
                      value={String(getParamValue(param))}
                      onChange={e => setParamValues(prev => ({ ...prev, [param.key]: e.target.value }))}
                      className="w-full text-sm border border-[var(--border-default)] rounded-md px-3 py-2 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                    >
                      {param.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="range"
                      min={param.min}
                      max={param.max}
                      value={Number(getParamValue(param))}
                      onChange={e => setParamValues(prev => ({ ...prev, [param.key]: Number(e.target.value) }))}
                      className="w-full accent-[var(--accent-primary)]"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 3: Run button */}
            <div className="flex gap-2">
              <button
                onClick={runScenario}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--accent-primary)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Computing...
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    Run Scenario
                  </>
                )}
              </button>
              {result && (
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 px-3 py-2.5 border border-[var(--border-default)] text-sm text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <RotateCcw size={13} />
                  Reset
                </button>
              )}
            </div>

            {/* Quick presets */}
            <div className="card p-4 space-y-2">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Quick Scenarios</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => applyQuickPreset(preset)}
                    className="text-xs px-3 py-1.5 border border-[var(--border-default)] rounded-full text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL (3/5) ── */}
          <div className="col-span-3">

            {/* Default state */}
            {!loading && !result && !error && (
              <div className="card p-8 h-full flex flex-col items-center justify-center text-center space-y-3">
                <div className="text-4xl">🔮</div>
                <p className="text-base font-medium text-[var(--text-primary)]">Configure a scenario and click Run</p>
                <p className="text-sm text-[var(--text-secondary)] max-w-sm">
                  Claude will analyse the cascade impact across your supply network — stockouts, revenue at risk, and mitigation steps.
                </p>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="card p-8 h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-10 h-10 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-[var(--text-primary)]">Claude is computing the scenario impact...</p>
                <p className="text-xs text-[var(--text-secondary)]">Analysing cascade effects across 20 stores and 5 cities</p>
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="card p-6 border-red-200 bg-red-50">
                <p className="text-sm font-medium text-red-700">Error</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            )}

            {/* Result state */}
            {result && !loading && (
              <div className="space-y-4">

                {/* Impact KPI strip */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="card py-3 px-4 border-red-200">
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Revenue at Risk</p>
                    <p className="text-lg font-semibold text-red-600">₹{result.impact.revenue_at_risk_cr}Cr</p>
                  </div>
                  <div className="card py-3 px-4">
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">SKUs Affected</p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">{result.impact.stockout_skus_affected}</p>
                  </div>
                  <div className="card py-3 px-4">
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Stores Affected</p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">{result.impact.stores_affected}</p>
                  </div>
                  <div className="card py-3 px-4">
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Days to Resolve</p>
                    <p className="text-lg font-semibold text-[var(--text-primary)]">{result.impact.days_to_resolve}d</p>
                  </div>
                </div>

                {/* Executive summary */}
                {result.impact.summary && (
                  <div className="card px-4 py-3 bg-amber-50 border-amber-200">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold text-amber-800">Executive Summary</p>
                      <span className={`text-[10px] font-medium ${confidenceColor(result.confidence)}`}>
                        {result.confidence} confidence
                      </span>
                    </div>
                    <p className="text-sm text-amber-900 leading-relaxed">{result.impact.summary}</p>
                  </div>
                )}

                {/* Cascade timeline */}
                {result.impact.cascade_events && result.impact.cascade_events.length > 0 && (
                  <div className="card p-4">
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-4">Cascade Timeline</p>
                    <div className="space-y-3">
                      {result.impact.cascade_events.map((event, i) => {
                        const [dayLabel, ...rest] = event.split(':');
                        const description = rest.join(':').trim();
                        const isRecovery = description.toLowerCase().includes('recover') || description.toLowerCase().includes('resolv') || description.toLowerCase().includes('normal');
                        return (
                          <div key={i} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white ${isRecovery ? 'bg-green-500' : 'bg-red-500'}`}>
                                {i + 1}
                              </div>
                              {i < result.impact.cascade_events.length - 1 && (
                                <div className="w-px flex-1 bg-[var(--border-subtle)] mt-1 mb-1" />
                              )}
                            </div>
                            <div className="pb-2">
                              <p className="text-xs font-semibold text-[var(--text-secondary)]">{dayLabel}</p>
                              <p className="text-sm text-[var(--text-primary)] leading-snug">{description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mitigation actions */}
                {result.impact.mitigation_actions && result.impact.mitigation_actions.length > 0 && (
                  <div className="card p-4">
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-4">Recommended Mitigation Actions</p>
                    <div className="space-y-3">
                      {result.impact.mitigation_actions.map((action, i) => {
                        const isObj = typeof action === 'object' && action !== null;
                        const actionText = isObj ? (action as MitigationAction).action : String(action);
                        const timing = isObj ? (action as MitigationAction).timing : undefined;
                        const impact = isObj ? (action as MitigationAction).expected_impact : undefined;
                        return (
                          <div key={i} className="flex gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
                            <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-[var(--text-primary)] leading-snug">{actionText}</p>
                                {timing && <TimingBadge timing={timing} />}
                              </div>
                              {impact && (
                                <p className="text-xs text-[var(--text-secondary)] mt-1">Expected: {impact}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Metadata footer */}
                <p className="text-[10px] text-[var(--text-tertiary)] text-right">
                  Generated {new Date(result.generated_at).toLocaleTimeString('en-IN')} · {result.confidence} confidence
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
