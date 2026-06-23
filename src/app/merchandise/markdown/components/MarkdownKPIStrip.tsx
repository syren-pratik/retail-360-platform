'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
} from 'recharts';
import type { MarkdownKPIs } from '../markdown-types';

// ─── Mini sparkline ───────────────────────────────────────────────────────────
function Sparkline({
  data,
  color,
}: {
  data: { week: string; value: number }[];
  color: string;
}) {
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
          <Tooltip
            contentStyle={{ display: 'none' }}
            cursor={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────
interface TileProps {
  label: string;
  value: string;
  subtext: string;
  trend: number; // positive = good/bad depends on invertColors
  invertColors?: boolean;
  sparkData: { week: string; value: number }[];
  sparkColor: string;
  tooltip: string;
}

function KPITile({
  label,
  value,
  subtext,
  trend,
  invertColors = false,
  sparkData,
  sparkColor,
  tooltip,
}: TileProps) {
  const isPositiveTrend = invertColors ? trend < 0 : trend > 0;
  const trendColor = isPositiveTrend
    ? 'text-emerald-600'
    : trend === 0
    ? 'text-[var(--text-tertiary)]'
    : 'text-red-500';
  const trendPrefix = trend > 0 ? '+' : '';

  return (
    <div className="card group relative overflow-hidden cursor-help" title={tooltip}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-[var(--text-secondary)] font-medium leading-tight">{label}</p>
        <span className={`text-xs font-semibold ${trendColor} flex-shrink-0`}>
          {trendPrefix}{trend > 0 || trend < 0 ? `${trend > 0 ? trend : trend}` : '—'}
          {Math.abs(trend) > 0 ? ' WoW' : ''}
        </span>
      </div>
      <p className="text-2xl font-semibold text-[var(--text-primary)] mb-0.5">{value}</p>
      <p className="text-xs text-[var(--text-tertiary)] mb-2">{subtext}</p>
      <Sparkline data={sparkData} color={sparkColor} />
    </div>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }
function fmtUnits(n: number) {
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
function calcWoW(trend: { week: string; value: number }[]) {
  if (trend.length < 2) return 0;
  const diff = trend[trend.length - 1].value - trend[trend.length - 2].value;
  return Math.round(diff * 10) / 10;
}

interface Props {
  kpis: MarkdownKPIs;
}

export default function MarkdownKPIStrip({ kpis }: Props) {
  const stWoW = useMemo(() => calcWoW(kpis.sell_through_trend_4w), [kpis.sell_through_trend_4w]);
  const mdWoW = useMemo(() => calcWoW(kpis.avg_markdown_depth_trend_4w), [kpis.avg_markdown_depth_trend_4w]);
  const gmWoW = useMemo(() => calcWoW(kpis.gross_margin_realized_trend_4w), [kpis.gross_margin_realized_trend_4w]);
  const ucWoW = useMemo(() => calcWoW(kpis.units_cleared_trend_4w), [kpis.units_cleared_trend_4w]);
  const wosWoW = useMemo(() => calcWoW(kpis.weeks_of_supply_trend_4w), [kpis.weeks_of_supply_trend_4w]);

  return (
    <div className="grid grid-cols-5 gap-4">
      {/* 1 — Sell-Through % */}
      <div className="animate-fade-slide-up stagger-1">
        <KPITile
          label="Sell-Through %"
          value={fmtPct(kpis.sell_through_pct)}
          subtext="vs 57.1% plan pace"
          trend={stWoW}
          invertColors={false}
          sparkData={kpis.sell_through_trend_4w}
          sparkColor="#10B981"
          tooltip="(Units sold since markdown start / Opening stock at markdown start) × 100. Databricks: fact_sales_transactions ÷ fact_inventory_daily opening snapshot. Good: ≥ weekly linear target. Bad: > 5 pp behind target at Wk 8."
        />
      </div>

      {/* 2 — Avg Markdown Depth */}
      <div className="animate-fade-slide-up stagger-2">
        <KPITile
          label="Avg Markdown Depth"
          value={fmtPct(kpis.avg_markdown_depth_pct)}
          subtext="weighted avg across active SKUs"
          trend={mdWoW}
          invertColors={true}
          sparkData={kpis.avg_markdown_depth_trend_4w}
          sparkColor="#F59E0B"
          tooltip="Avg (MRP - selling price) / MRP × 100 across all active markdown SKUs, weighted by units sold. Good: ≤ 20% at Wk 8 (controlled). Bad: > 35% signals panic or poor early action. Deepens as season progresses — plan defines the pace."
        />
      </div>

      {/* 3 — Gross Margin Realized */}
      <div className="animate-fade-slide-up stagger-3">
        <KPITile
          label="Gross Margin Realized"
          value={fmtPct(kpis.gross_margin_realized_pct)}
          subtext="eroded by markdown depth"
          trend={gmWoW}
          invertColors={false}
          sparkData={kpis.gross_margin_realized_trend_4w}
          sparkColor="#6366F1"
          tooltip="(Actual selling price - COGS) / Actual selling price × 100. Databricks: fact_sales_transactions.net_selling_price - dim_product.cost_price. Good: ≥ 20% (earns margin even at markdown). Bad: < 10% or negative (selling below cost — better to write off or bundle)."
        />
      </div>

      {/* 4 — Units Cleared */}
      <div className="animate-fade-slide-up stagger-4">
        <KPITile
          label="Units Cleared"
          value={fmtUnits(kpis.units_cleared)}
          subtext="this season under markdown"
          trend={ucWoW}
          invertColors={false}
          sparkData={kpis.units_cleared_trend_4w}
          sparkColor="#3B82F6"
          tooltip="Absolute unit count sold at markdown price this season. Databricks: SUM(fact_sales_transactions.units) WHERE markdown_flag = true AND season = 'Summer 2026'. Increases week-over-week as markdowns deepen — plateau signals velocity exhaustion needing deeper markdown."
        />
      </div>

      {/* 5 — Weeks of Supply */}
      <div className="animate-fade-slide-up stagger-5">
        <KPITile
          label="Weeks of Supply"
          value={`${kpis.weeks_of_supply.toFixed(1)}W`}
          subtext="3.7W remaining in season"
          trend={wosWoW}
          invertColors={true}
          sparkData={kpis.weeks_of_supply_trend_4w}
          sparkColor="#F43F5E"
          tooltip="Current closing stock ÷ avg weekly sales over trailing 4 weeks. Databricks: fact_inventory_daily.closing_stock ÷ AVG(fact_sales_transactions weekly units, last 4W). Good: WOS ≤ remaining season weeks. Bad: WOS > remaining weeks = guaranteed overstock at season end. > 8W at Wk 8 = danger zone."
        />
      </div>
    </div>
  );
}
