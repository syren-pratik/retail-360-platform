'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  CartesianGrid,
} from 'recharts';
import { fetchPriceIntelSKUDetail } from '@/app/lib/price-intel-loader';
import type { PriceIntelSKU, PriceIntelSKUDetail } from '@/app/lib/price-intel-types';
import { useTenant } from '@/app/context/TenantContext';
import { formatMoneyAuto, formatMoneyPlainAuto, getLocaleAuto } from '@/app/lib/format-money';

function moneySymbol(isApparel: boolean): string {
  return isApparel ? '$' : '₹';
}

interface WhatIfResult {
  demand_change_pct: number;
  revenue_change_inr: number;
  margin_change_pp: number;
}

interface Props {
  skuId: string | null;
  sku: PriceIntelSKU | null;
  onClose: () => void;
}

function fmt(n: number): string {
  return formatMoneyAuto(n);
}

const VEL_COLORS: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-amber-100 text-amber-700',
};

const ELAST_COLORS: Record<string, string> = {
  inelastic: 'bg-slate-100 text-slate-600',
  moderate: 'bg-indigo-100 text-indigo-700',
  elastic: 'bg-rose-100 text-rose-700',
};

const PRI_COLORS: Record<string, string> = {
  High: 'bg-rose-100 text-rose-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-slate-100 text-slate-600',
};

export default function PriceIntelSKUDrawer({ skuId, sku, onClose }: Props) {
  const { isApparel } = useTenant();
  const sym = moneySymbol(isApparel);
  const [detail, setDetail] = useState<PriceIntelSKUDetail | null>(null);
  const [notAvailable, setNotAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [whatIfPrice, setWhatIfPrice] = useState(0);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResult | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);

  useEffect(() => {
    if (!skuId) { setDetail(null); setNotAvailable(false); return; }
    setLoading(true);
    setDetail(null);
    setNotAvailable(false);
    setWhatIfResult(null);
    setPromoOpen(false);
    fetchPriceIntelSKUDetail(skuId)
      .then((d) => {
        setDetail(d);
        setWhatIfPrice(d.margin_waterfall.shelf_price_inr);
      })
      .catch(() => {
        setDetail(null);
        setNotAvailable(true);
      })
      .finally(() => setLoading(false));
  }, [skuId]);

  const handlePriceChange = useCallback(
    (newPrice: number) => {
      if (!detail || !sku) return;
      setWhatIfPrice(newPrice);
      const currentPrice = detail.margin_waterfall.shelf_price_inr;
      const cost = detail.margin_waterfall.cost_inr;
      const currentMarginPct = detail.margin_waterfall.gross_margin_pct * 100;
      const price_change_pct = (newPrice - currentPrice) / currentPrice;
      const demand_change_pct = price_change_pct * sku.elasticity * 100;
      // base_weekly_units derived from mid-point of elasticity curve
      const midPt = detail.elasticity_curve[10];
      const base_weekly_units = midPt.revenue_inr / midPt.price_inr;
      const revenue_change_inr =
        (newPrice * (1 + demand_change_pct / 100) - currentPrice) * base_weekly_units;
      const margin_change_pp =
        ((newPrice - cost) / newPrice) * 100 - currentMarginPct;
      setWhatIfResult({
        demand_change_pct: Math.round(demand_change_pct * 10) / 10,
        revenue_change_inr: Math.round(revenue_change_inr),
        margin_change_pp: Math.round(margin_change_pp * 10) / 10,
      });
    },
    [detail, sku],
  );

  if (!skuId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!detail || !sku) {
    if (notAvailable) {
      return (
        <div className="p-6 text-sm text-center">
          <p className="text-[var(--text-primary)] font-medium mb-1">{sku?.product_name ?? skuId}</p>
          <p className="text-[var(--text-tertiary)]">Detailed analytics for this SKU are not yet available.</p>
          <p className="text-[var(--text-tertiary)] text-xs mt-1">Run <code className="bg-[var(--bg-secondary)] px-1 rounded">npm run gen:price-intel</code> to generate full detail.</p>
        </div>
      );
    }
    return (
      <div className="p-6 text-sm text-rose-600">
        Failed to load SKU detail for {skuId}.
      </div>
    );
  }

  const currentPrice = detail.margin_waterfall.shelf_price_inr;
  const cost = detail.margin_waterfall.cost_inr;
  const changeFromCurrent = ((whatIfPrice - currentPrice) / currentPrice) * 100;
  const sliderMin = Math.round(currentPrice * 0.7);
  const sliderMax = Math.round(currentPrice * 1.15);

  // Price history: only show every 7th label to avoid clutter
  const priceHistoryData = detail.price_history.map((pt, i) => ({
    ...pt,
    label: i % 14 === 0 ? pt.date.slice(5) : '',
    promoArea: pt.is_promo ? pt.price_inr : null,
  }));

  // Promo periods for reference areas
  const promoRanges: Array<{ x1: string; x2: string }> = [];
  let inPromo = false;
  let promoStart = '';
  for (const pt of detail.price_history) {
    if (pt.is_promo && !inPromo) { inPromo = true; promoStart = pt.date; }
    if (!pt.is_promo && inPromo) { inPromo = false; promoRanges.push({ x1: promoStart, x2: pt.date }); }
  }
  if (inPromo) promoRanges.push({ x1: promoStart, x2: detail.price_history[detail.price_history.length - 1].date });

  const recommendedPrice = detail.recommendation.recommended_price_inr;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[var(--bg-primary)] border-b border-[var(--border-default)] px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {isApparel && (sku as PriceIntelSKU & { brand?: string }).brand && (
              <p className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wide mb-0.5">
                {(sku as PriceIntelSKU & { brand?: string }).brand}
              </p>
            )}
            <p className="text-base font-semibold text-[var(--text-primary)] truncate">{detail.product_name}</p>
            <p className="text-[11px] font-mono text-[var(--text-tertiary)] mt-0.5">
              {sku.sku_id} · {sku.department} › {sku.category}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${VEL_COLORS[sku.velocity_class] ?? ''}`}>
                Vel-{sku.velocity_class}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ELAST_COLORS[sku.elasticity_class] ?? ''}`}>
                {sku.elasticity_class} ({sku.elasticity.toFixed(2)})
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRI_COLORS[sku.recommendation_priority] ?? ''}`}>
                {sku.recommendation_priority} priority
              </span>
              {isApparel && (() => {
                const ap = sku as PriceIntelSKU & {
                  markdown_step?: string;
                  days_in_step?: number;
                  lifecycle_stage?: string;
                  season_tag?: string;
                  competitive_index?: number;
                  size_breadth?: number;
                  color_breadth?: number;
                };
                return (
                  <>
                    {ap.lifecycle_stage && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                        {ap.lifecycle_stage}
                      </span>
                    )}
                    {ap.markdown_step && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                        {ap.markdown_step}{ap.days_in_step !== undefined ? ` · ${ap.days_in_step}d` : ''}
                      </span>
                    )}
                    {ap.season_tag && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-50 text-cyan-700">
                        {ap.season_tag}
                      </span>
                    )}
                    {ap.competitive_index !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${ap.competitive_index > 105 ? 'bg-rose-100 text-rose-700' : ap.competitive_index < 95 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        CI {ap.competitive_index}
                      </span>
                    )}
                    {(ap.size_breadth !== undefined || ap.color_breadth !== undefined) && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-600">
                        {ap.size_breadth ?? '?'} sizes · {ap.color_breadth ?? '?'} colors
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Section 1: Price History ────────────────────────── */}
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
            91-Day Price History
          </p>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={priceHistoryData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
                {promoRanges.map((r, i) => (
                  <ReferenceLine
                    key={i}
                    x={r.x1}
                    stroke="#FCA5A5"
                    strokeWidth={0}
                    label=""
                    // ReferenceArea preferred but ReferenceLine for promo shading
                  />
                ))}
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: '#111827' }}
                  tickFormatter={(v: string) => v.slice(5)}
                  interval={13}
                  stroke="#D1D5DB"
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#111827' }}
                  tickFormatter={(v: number) => `${sym}${v}`}
                  width={40}
                  stroke="#D1D5DB"
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                  formatter={(value: unknown, name: unknown): [string, string] => {
                    const v = value as number;
                    if (name === 'price_inr') return [`${sym}${v}`, 'Price'];
                    if (name === 'mrp_inr') return [`${sym}${v}`, isApparel ? 'MSRP' : 'MRP'];
                    if (name === 'cost_inr') return [`${sym}${v}`, 'Cost'];
                    return [String(v), String(name)];
                  }}
                />
                {/* cost floor */}
                <ReferenceLine y={cost} stroke="#94A3B8" strokeDasharray="4 2" label={{ value: 'Cost', position: 'insideLeft', fontSize: 9, fill: '#94A3B8' }} />
                {/* promo shading using Area */}
                <Area dataKey="promoArea" fill="#FEE2E2" stroke="none" />
                {/* MRP ceiling */}
                <Line dataKey="mrp_inr" stroke="#94A3B8" strokeDasharray="4 2" dot={false} strokeWidth={1} />
                {/* Current price */}
                <Line dataKey="price_inr" stroke="#4F46E5" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Section 2: Elasticity Curve ─────────────────────── */}
        <div className="px-5 py-3 border-t border-[var(--border-default)]">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
            Elasticity Curve
          </p>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={detail.elasticity_curve} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
                <XAxis
                  dataKey="price_inr"
                  tick={{ fontSize: 9, fill: '#111827' }}
                  tickFormatter={(v: number) => `${sym}${Math.round(v)}`}
                  stroke="#D1D5DB"
                />
                <YAxis
                  dataKey="revenue_inr"
                  tick={{ fontSize: 9, fill: '#111827' }}
                  tickFormatter={(v: number) => `${sym}${Math.round(v / 1000)}K`}
                  width={44}
                  stroke="#D1D5DB"
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}
                  formatter={(v: unknown, name: unknown): [string, string] => {
                    const n = v as number;
                    if (name === 'revenue_inr') return [`${sym}${n.toLocaleString(getLocaleAuto())}`, 'Revenue'];
                    return [String(n), String(name)];
                  }}
                />
                {/* Current price */}
                <ReferenceLine x={currentPrice} stroke="#4F46E5" strokeDasharray="4 2" label={{ value: 'Current', position: 'top', fontSize: 9, fill: '#4F46E5' }} />
                {/* Recommended price */}
                <ReferenceLine x={recommendedPrice} stroke="#10B981" strokeDasharray="4 2" label={{ value: 'Rec.', position: 'top', fontSize: 9, fill: '#10B981' }} />
                {/* What-if price — moves with slider */}
                {whatIfPrice !== currentPrice && (
                  <ReferenceLine x={whatIfPrice} stroke="#F59E0B" strokeDasharray="3 2" label={{ value: 'What-if', position: 'insideTop', fontSize: 9, fill: '#F59E0B' }} />
                )}
                <Line dataKey="revenue_inr" stroke="#4F46E5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Section 3: Compact Margin Waterfall ─────────────── */}
        <div className="px-5 py-3 border-t border-[var(--border-default)]">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
            Margin Waterfall
          </p>
          <div className="grid grid-cols-5 gap-1 text-center">
            {[
              { label: 'Cost', value: detail.margin_waterfall.cost_inr, color: 'bg-slate-100 text-slate-700' },
              { label: 'Shelf price', value: detail.margin_waterfall.shelf_price_inr, color: 'bg-indigo-50 text-indigo-700' },
              { label: 'Realized', value: detail.margin_waterfall.realized_price_inr, color: 'bg-blue-50 text-blue-700' },
              { label: 'Free-rider loss', value: detail.margin_waterfall.free_rider_waste_inr, color: 'bg-rose-50 text-rose-700' },
              { label: 'Net margin', value: detail.margin_waterfall.net_margin_inr, color: `${detail.margin_waterfall.net_margin_pct > 0.15 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}` },
            ].map((item) => (
              <div key={item.label} className={`rounded p-2 ${item.color}`}>
                <p className="text-[10px] leading-tight mb-0.5">{item.label}</p>
                <p className="text-xs font-semibold tabular-nums">{sym}{Math.round(item.value)}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-[var(--text-tertiary)] text-center">
            Net margin: {(detail.margin_waterfall.net_margin_pct * 100).toFixed(1)}% · Realized: {(detail.margin_waterfall.realized_margin_pct * 100).toFixed(1)}%
          </div>
        </div>

        {/* ── Section 4: What-if Price Simulator ─────────────── */}
        <div className="px-5 py-3 border-t border-[var(--border-default)]">
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Price simulator</p>

            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-[var(--text-secondary)] shrink-0">−30%</span>
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                value={whatIfPrice}
                step={1}
                onChange={(e) => handlePriceChange(Number(e.target.value))}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-xs text-[var(--text-secondary)] shrink-0">+15%</span>
            </div>

            <div className="text-center mb-4">
              <span className="text-2xl font-semibold text-[var(--text-primary)]">{sym}{whatIfPrice}</span>
              <span className="text-sm text-[var(--text-secondary)] ml-2">
                {changeFromCurrent > 0 ? '+' : ''}{changeFromCurrent.toFixed(1)}% from current
              </span>
            </div>

            {whatIfResult && (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-[var(--text-secondary)]">Volume change</p>
                  <p className={`text-sm font-semibold ${whatIfResult.demand_change_pct > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {whatIfResult.demand_change_pct > 0 ? '+' : ''}{whatIfResult.demand_change_pct.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-[var(--text-secondary)]">Revenue impact</p>
                  <p className={`text-sm font-semibold ${whatIfResult.revenue_change_inr >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {whatIfResult.revenue_change_inr >= 0 ? '+' : ''}{fmt(Math.abs(whatIfResult.revenue_change_inr))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-[var(--text-secondary)]">Margin change</p>
                  <p className={`text-sm font-semibold ${whatIfResult.margin_change_pp > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {whatIfResult.margin_change_pp > 0 ? '+' : ''}{whatIfResult.margin_change_pp.toFixed(1)}pp
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 5: AI Recommendation ───────────────────── */}
        <div className="px-5 py-3 border-t border-[var(--border-default)]">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-3 uppercase tracking-wide">
            AI Recommendation
          </p>
          <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-sm text-[var(--text-primary)] leading-relaxed flex-1">
                {detail.recommendation.rationale}
              </p>
              <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium ${PRI_COLORS[detail.recommendation.priority] ?? ''}`}>
                {detail.recommendation.priority}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center text-[10px]">
              <div>
                <p className="text-[var(--text-tertiary)]">Recommended price</p>
                <p className="font-semibold text-emerald-600">{sym}{detail.recommendation.recommended_price_inr}</p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)]">Volume change</p>
                <p className={`font-semibold ${detail.recommendation.projected_volume_change_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {detail.recommendation.projected_volume_change_pct > 0 ? '+' : ''}
                  {detail.recommendation.projected_volume_change_pct.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[var(--text-tertiary)]">Margin change</p>
                <p className={`font-semibold ${detail.recommendation.projected_margin_change_pp >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {detail.recommendation.projected_margin_change_pp > 0 ? '+' : ''}
                  {detail.recommendation.projected_margin_change_pp.toFixed(1)}pp
                </p>
              </div>
            </div>
            <button
              onClick={() => console.log('Approve recommendation:', sku.sku_id, detail.recommendation)}
              className="mt-4 w-full py-2 text-sm font-medium rounded-md bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
            >
              Approve recommendation
            </button>
          </div>
        </div>

        {/* ── Section 6: Promo History (collapsible) ──────────── */}
        <div className="px-5 py-3 border-t border-[var(--border-default)]">
          <button
            onClick={() => setPromoOpen((v) => !v)}
            className="flex items-center justify-between w-full text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <span className="uppercase tracking-wide">
              View promo history ({Math.min(6, detail.promo_history.length)})
            </span>
            {promoOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {promoOpen && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    {['Mechanic', 'Dates', 'Depth', 'ROI', 'Free-rider', 'Post-dip'].map((h) => (
                      <th key={h} className="text-left py-1.5 pr-2 text-[var(--text-tertiary)] font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.promo_history.slice(0, 6).map((p) => (
                    <tr key={p.promo_id} className="border-b border-[var(--border-default)] last:border-0">
                      <td className="py-1.5 pr-2 capitalize text-[var(--text-primary)]">{p.mechanic}</td>
                      <td className="py-1.5 pr-2 text-[var(--text-secondary)] whitespace-nowrap">
                        {p.start_date.slice(5)} – {p.end_date.slice(5)}
                      </td>
                      <td className="py-1.5 pr-2 text-[var(--text-secondary)]">{p.depth_pct}%</td>
                      <td className="py-1.5 pr-2 font-medium text-[var(--text-primary)]">{p.roi.toFixed(2)}×</td>
                      <td className="py-1.5 pr-2 text-rose-600">{p.free_rider_ratio_pct.toFixed(0)}%</td>
                      <td className={`py-1.5 pr-2 ${p.post_promo_dip_pct < -5 ? 'text-rose-600' : 'text-[var(--text-secondary)]'}`}>
                        {p.post_promo_dip_pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom padding */}
        <div className="h-6" />
      </div>
    </div>
  );
}
