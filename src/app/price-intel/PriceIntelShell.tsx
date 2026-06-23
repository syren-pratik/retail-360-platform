'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart2, Tag, TrendingDown, LineChart, ChevronDown, Bot } from 'lucide-react';
import { fetchPriceIntelCore, fetchPriceIntelPrecomputed } from '@/app/lib/price-intel-loader';
import type { PriceIntelCore, PriceIntelPrecomputed, PriceIntelSKU } from '@/app/lib/price-intel-types';
import { PriceIntelFilterProvider, usePriceIntelFilters } from './PriceIntelFilterContext';
import PriceIntelKPIStrip from './components/PriceIntelKPIStrip';
import PriceIntelHeadlineSentence from './components/PriceIntelHeadlineSentence';
import PriceIntelInsightsStrip from './components/PriceIntelInsightsStrip';
import PriceIntelSKUDrawer from './components/PriceIntelSKUDrawer';
import OverviewTab from './tabs/OverviewTab';
import PromoTab from './tabs/PromoTab';
import MarkdownTab from './tabs/MarkdownTab';
import ForecastingTab from './tabs/ForecastingTab';
import AgentsTab from './tabs/AgentsTab';

type Persona = 'category_manager' | 'pricing_analyst' | 'vp_commercial';

const TABS = [
  { id: 'overview',    label: 'Overview',    icon: <BarChart2 size={14} /> },
  { id: 'promo',       label: 'Promo',        icon: <Tag size={14} /> },
  { id: 'markdown',    label: 'Markdown',     icon: <TrendingDown size={14} /> },
  { id: 'forecasting', label: 'Forecasting',  icon: <LineChart size={14} /> },
  { id: 'agents',      label: 'AI Agents',    icon: <Bot size={14} /> },
];
const VALID_TABS = new Set(TABS.map((t) => t.id));

const PERSONAS: { id: Persona; label: string }[] = [
  { id: 'category_manager', label: 'Category Manager' },
  { id: 'pricing_analyst',  label: 'Pricing Analyst' },
  { id: 'vp_commercial',    label: 'VP Commercial' },
];

function PriceIntelContent({
  core,
}: {
  core: PriceIntelCore;
  precomputed: PriceIntelPrecomputed;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') ?? 'overview';
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : 'overview';

  const [selectedSKUId, setSelectedSKUId] = useState<string | null>(null);
  const [selectedSKU, setSelectedSKU] = useState<PriceIntelSKU | null>(null);
  const [persona, setPersona] = useState<Persona>('category_manager');

  const { filters, setDepartment } = usePriceIntelFilters();

  // Department filter applies to all department-tagged collections.
  // Aggregate series (KPIs, trends, forecast) remain portfolio-wide.
  const filteredCore = useMemo<PriceIntelCore>(() => {
    if (filters.department === 'all') return core;
    const d = filters.department;
    return {
      ...core,
      action_queue: core.action_queue.filter((i) => i.department === d),
      skus: core.skus.filter((s) => s.department === d),
      campaigns: core.campaigns.filter((c) => c.department === d),
      sell_through_heatmap: core.sell_through_heatmap.filter((r) => r.department === d),
      markdown_queue: core.markdown_queue.filter((i) => i.department === d),
    };
  }, [core, filters.department]);

  const handleTabChange = useCallback(
    (id: string) => router.push(`?tab=${id}`, { scroll: false }),
    [router],
  );

  function handleSKUSelect(skuId: string) {
    const sku = core.skus.find((s) => s.sku_id === skuId);
    if (!sku) return; // Campaign IDs (CAMP-*) don't map to SKUs
    setSelectedSKUId(skuId);
    setSelectedSKU(sku);
  }

  const deptNames = ['all', ...core.departments.map((d) => d.name)];

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="p-6">
          {/* Header */}
          <PriceIntelHeadlineSentence headline={core.headline} />

          {/* KPI strip */}
          <div className="mb-4">
            <PriceIntelKPIStrip kpis={core.kpis} />
          </div>

          {/* Insights strip */}
          <div className="mb-4">
            <PriceIntelInsightsStrip />
          </div>

          {/* Tab nav + persona selector + dept filter */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {/* Tab nav */}
            <div className="flex gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white shadow-sm text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Persona selector */}
            <div className="flex rounded-md border border-[var(--border-default)] overflow-hidden text-xs">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  className={`px-3 py-1.5 transition-colors whitespace-nowrap ${
                    persona === p.id
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Department filter */}
            <div className="relative ml-auto">
              <select
                value={filters.department}
                onChange={(e) => setDepartment(e.target.value)}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              >
                {deptNames.map((d) => (
                  <option key={d} value={d}>
                    {d === 'all' ? 'All Departments' : d}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none" />
            </div>
          </div>

          {/* Tab content */}
          {activeTab === 'overview' && (
            <OverviewTab core={filteredCore} onSKUSelect={handleSKUSelect} persona={persona} />
          )}
          {activeTab === 'promo' && (
            <PromoTab core={filteredCore} persona={persona} />
          )}
          {activeTab === 'markdown' && (
            <MarkdownTab core={filteredCore} onSKUSelect={handleSKUSelect} persona={persona} />
          )}
          {activeTab === 'forecasting' && (
            <ForecastingTab core={filteredCore} persona={persona} />
          )}
          {activeTab === 'agents' && (
            <AgentsTab core={core} />
          )}
        </div>
      </div>

      {/* SKU drawer */}
      {selectedSKUId && (
        <div
          style={{
            width: 480,
            flexShrink: 0,
            height: '100vh',
            position: 'sticky',
            top: 0,
            overflowY: 'auto',
            background: 'var(--bg-primary)',
            borderLeft: '0.5px solid var(--border-default)',
          }}
        >
          <PriceIntelSKUDrawer
            skuId={selectedSKUId}
            sku={selectedSKU}
            onClose={() => { setSelectedSKUId(null); setSelectedSKU(null); }}
          />
        </div>
      )}
    </div>
  );
}

export default function PriceIntelShell() {
  const [core, setCore] = useState<PriceIntelCore | null>(null);
  const [precomputed, setPrecomputed] = useState<PriceIntelPrecomputed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchPriceIntelCore(), fetchPriceIntelPrecomputed()])
      .then(([c, p]) => {
        setCore(c);
        setPrecomputed(p);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-3">
        <div className="animate-spin w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
        <span className="text-sm text-[var(--text-secondary)]">Loading Price Intel…</span>
      </div>
    );
  }

  if (error || !core || !precomputed) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-sm text-rose-600">
        {error ?? 'Failed to load price intel data. Run: npm run gen:price-intel'}
      </div>
    );
  }

  return (
    <PriceIntelFilterProvider>
      <PriceIntelContent core={core} precomputed={precomputed} />
    </PriceIntelFilterProvider>
  );
}
