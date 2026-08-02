'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Loader2,
  BarChart2,
} from 'lucide-react';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import { CATEGORIES } from '@/app/lib/dbx-fixtures';
import { useTenant } from '@/app/context/TenantContext';

const APPAREL_CATEGORIES = [
  { department: 'Mens',        category_l1: 'Tees',           sku_count: 42 },
  { department: 'Mens',        category_l1: 'Denim',          sku_count: 38 },
  { department: 'Mens',        category_l1: 'Outerwear',      sku_count: 22 },
  { department: 'Mens',        category_l1: 'Activewear',     sku_count: 18 },
  { department: 'Womens',      category_l1: 'Tops',           sku_count: 48 },
  { department: 'Womens',      category_l1: 'Dresses',        sku_count: 36 },
  { department: 'Womens',      category_l1: 'Bottoms',        sku_count: 44 },
  { department: 'Womens',      category_l1: 'Outerwear',      sku_count: 26 },
  { department: 'Kids',        category_l1: 'Boys Tops',      sku_count: 20 },
  { department: 'Kids',        category_l1: 'Girls Dresses',  sku_count: 22 },
  { department: 'Kids',        category_l1: 'Baby',           sku_count: 18 },
  { department: 'Footwear',    category_l1: 'Mens Sneaker',   sku_count: 28 },
  { department: 'Footwear',    category_l1: 'Womens Sneaker', sku_count: 30 },
  { department: 'Footwear',    category_l1: 'Sandal',         sku_count: 14 },
  { department: 'Accessories', category_l1: 'Handbag',        sku_count: 16 },
  { department: 'Accessories', category_l1: 'Belt',           sku_count: 8  },
];

interface Props {
  core: PriceIntelCore;
}

type Horizon = '2 weeks' | '4 weeks' | '8 weeks' | 'quarter';
type Objective = 'maximize_margin' | 'maximize_revenue' | 'defend_share' | 'clear_inventory';
type CompetitiveIntensity = 'low' | 'medium' | 'high' | 'very_high';

interface SKURecommendation {
  sku_id: string;
  product_name: string;
  action: 'raise' | 'hold' | 'lower';
  change_pct: number;
  reason: string;
}

interface PriceStrategyResult {
  strategy_label: string;
  rationale: string;
  sku_recommendations: SKURecommendation[];
  expected_margin_impact_pp: number;
  expected_revenue_impact_inr: number;
  risks: string[];
  confidence: 'high' | 'medium' | 'low';
}

const HORIZON_OPTIONS: Horizon[] = ['2 weeks', '4 weeks', '8 weeks', 'quarter'];

const OBJECTIVE_LABELS: Record<Objective, string> = {
  maximize_margin: 'Maximize Margin',
  maximize_revenue: 'Maximize Revenue',
  defend_share: 'Defend Market Share',
  clear_inventory: 'Clear Inventory',
};

const INTENSITY_LABELS: Record<CompetitiveIntensity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  very_high: 'Very High',
};

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const cfg = {
    high:   { cls: 'bg-emerald-100 text-emerald-700', label: 'High Confidence' },
    medium: { cls: 'bg-amber-100 text-amber-700',     label: 'Medium Confidence' },
    low:    { cls: 'bg-rose-100 text-rose-700',        label: 'Low Confidence' },
  }[confidence];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      <CheckCircle size={10} />
      {cfg.label}
    </span>
  );
}

function ActionBadge({ action }: { action: 'raise' | 'hold' | 'lower' }) {
  const cfg = {
    raise: { cls: 'bg-emerald-100 text-emerald-700', icon: <TrendingUp size={10} />,   label: 'Raise' },
    hold:  { cls: 'bg-slate-100 text-slate-600',     icon: <Minus size={10} />,         label: 'Hold'  },
    lower: { cls: 'bg-rose-100 text-rose-700',        icon: <TrendingDown size={10} />, label: 'Lower' },
  }[action];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function PriceStrategyAgent({ core }: Props) {
  const { isApparel } = useTenant();
  const categoryList = isApparel ? APPAREL_CATEGORIES : CATEGORIES;
  // Group real Databricks categories by department for the dropdown.
  const categoriesByDept = categoryList.reduce<Record<string, typeof categoryList>>((acc, c) => {
    if (!acc[c.department]) acc[c.department] = [];
    acc[c.department].push(c);
    return acc;
  }, {});
  const deptOrder = Object.keys(categoriesByDept);

  const [category, setCategory] = useState<string>(categoryList[0]?.category_l1 ?? '');
  const [horizon, setHorizon] = useState<Horizon>('4 weeks');
  const [objective, setObjective] = useState<Objective>('maximize_margin');
  const [competitiveIntensity, setCompetitiveIntensity] = useState<CompetitiveIntensity>('medium');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PriceStrategyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const catRow = categoryList.find(c => c.category_l1 === category);
      const deptData = core.departments.find(d => d.name === catRow?.department) ?? null;
      const skusInCategory = core.skus.filter(s => s.category === category).slice(0, 10);
      const res = await fetch('/api/price-intel/agents/price-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          horizon,
          objective,
          competitive_intensity: competitiveIntensity,
          dept_data: deptData,
          skus_in_category: skusInCategory,
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data: PriceStrategyResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Form card */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={16} className="text-[var(--accent-primary)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Price Strategy Agent</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Category</label>
            <div className="relative">
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full appearance-none rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              >
                {deptOrder.map(dept => (
                  <optgroup key={dept} label={dept}>
                    {categoriesByDept[dept].map(c => (
                      <option key={`${dept}-${c.category_l1}`} value={c.category_l1}>
                        {c.category_l1} ({c.sku_count} SKUs)
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            </div>
          </div>

          {/* Horizon */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Horizon</label>
            <div className="flex flex-wrap gap-2">
              {HORIZON_OPTIONS.map(h => (
                <label key={h} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="horizon"
                    value={h}
                    checked={horizon === h}
                    onChange={() => setHorizon(h)}
                    className="accent-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{h}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Objective */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Objective</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(OBJECTIVE_LABELS) as Objective[]).map(obj => (
                <label key={obj} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="objective"
                    value={obj}
                    checked={objective === obj}
                    onChange={() => setObjective(obj)}
                    className="accent-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">{OBJECTIVE_LABELS[obj]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Competitive intensity */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Competitive Intensity</label>
            <div className="relative">
              <select
                value={competitiveIntensity}
                onChange={e => setCompetitiveIntensity(e.target.value as CompetitiveIntensity)}
                className="w-full appearance-none rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              >
                {(Object.keys(INTENSITY_LABELS) as CompetitiveIntensity[]).map(k => (
                  <option key={k} value={k}>{INTENSITY_LABELS[k]}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !category}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--accent-primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <BarChart2 size={14} />}
            {loading ? 'Generating Strategy…' : 'Generate Strategy'}
          </button>
        </form>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
            <AlertTriangle size={13} />
            {error}
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="card p-4 space-y-5">
          {/* Strategy header */}
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h3 className="text-base font-bold text-[var(--text-primary)]">{result.strategy_label}</h3>
              <ConfidenceBadge confidence={result.confidence} />
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{result.rationale}</p>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Expected Margin Impact</p>
              <p className={`text-xl font-bold ${result.expected_margin_impact_pp >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {result.expected_margin_impact_pp >= 0 ? '+' : ''}{result.expected_margin_impact_pp.toFixed(1)} pp
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Revenue Impact</p>
              <p className={`text-xl font-bold ${result.expected_revenue_impact_inr >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {result.expected_revenue_impact_inr >= 0 ? '+' : ''}{formatLakhsCrores(Math.abs(result.expected_revenue_impact_inr))}
              </p>
            </div>
          </div>

          {/* SKU recommendations table */}
          {result.sku_recommendations.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">SKU Recommendations</h4>
              <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
                      <th className="px-3 py-2 text-left font-medium text-[var(--text-tertiary)]">Product</th>
                      <th className="px-3 py-2 text-left font-medium text-[var(--text-tertiary)]">Action</th>
                      <th className="px-3 py-2 text-right font-medium text-[var(--text-tertiary)]">Change %</th>
                      <th className="px-3 py-2 text-left font-medium text-[var(--text-tertiary)]">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {result.sku_recommendations.map(rec => (
                      <tr key={rec.sku_id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="px-3 py-2 text-[var(--text-primary)] font-medium max-w-[160px] truncate">
                          {rec.product_name}
                        </td>
                        <td className="px-3 py-2">
                          <ActionBadge action={rec.action} />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-[var(--text-primary)]">
                          {rec.change_pct >= 0 ? '+' : ''}{rec.change_pct.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-[var(--text-secondary)] max-w-[220px]">
                          {rec.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Risks */}
          {result.risks.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Risks</h4>
              <ul className="space-y-1.5">
                {result.risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                    <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
                    <span className="text-xs text-amber-800">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
