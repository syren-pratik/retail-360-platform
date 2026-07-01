'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, TrendingDown, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import type { MerchDemandFullPayload, MerchDemandActionItem, MerchDemandSKU } from '@/app/lib/merch-demand-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';
import { AIInsightButton } from '@/app/components/charts/ChartCard';

type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

function derivePriority(item: MerchDemandActionItem): Priority {
  const absImpact = Math.abs(item.revenue_impact_inr);
  if (absImpact >= 400_000 || (item.action_type === 'understock_risk' && item.days_to_impact <= 2)) return 'Critical';
  if (absImpact >= 150_000 || item.days_to_impact <= 5) return 'High';
  if (absImpact >= 50_000) return 'Medium';
  return 'Low';
}

const PRIORITY_COLORS: Record<Priority, string> = {
  Critical: 'bg-rose-500',
  High:     'bg-amber-500',
  Medium:   'bg-blue-400',
  Low:      'bg-slate-300',
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  understock_risk:   'Understock Risk',
  overstock_risk:    'Overstock Risk',
  event_ramp:        'Event Ramp',
  demand_spike:      'Demand Spike',
  demand_drop:       'Demand Drop',
  anomaly:           'Anomaly',
  promo_extend:      'Promo Extend',
  promo_pull:        'Promo Pull',
  launch_scale:      'Launch Scale',
};

const ACTION_TYPE_BADGE: Record<string, string> = {
  understock_risk:   'badge-negative',
  overstock_risk:    'badge-warning',
  event_ramp:        'badge-warning',
  demand_spike:      'badge-positive',
  demand_drop:       'badge-negative',
  anomaly:           'badge-negative',
  promo_extend:      'badge-neutral',
  promo_pull:        'badge-warning',
  launch_scale:      'badge-neutral',
};

function ActionIcon({ type }: { type: string }) {
  if (type === 'demand_spike') return <Zap size={11} />;
  if (type === 'demand_drop' || type === 'overstock_risk') return <TrendingDown size={11} />;
  if (type === 'understock_risk') return <TrendingUp size={11} />;
  return <AlertCircle size={11} />;
}

interface RowProps {
  item: MerchDemandActionItem;
  sku: MerchDemandSKU | undefined;
}

function ExceptionRow({ item, sku }: RowProps) {
  const priority = derivePriority(item);
  const badgeCls = ACTION_TYPE_BADGE[item.action_type] ?? 'badge-neutral';
  const label = ACTION_TYPE_LABELS[item.action_type] ?? item.action_type;
  const impact = item.revenue_impact_inr;
  const isPositive = impact > 0;

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-secondary)] transition-colors">
      {/* Priority indicator */}
      <div className={`w-1 h-12 rounded-full flex-shrink-0 ${PRIORITY_COLORS[priority]}`} />

      {/* SKU info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">
            {sku?.product_name ?? item.sku_id}
          </span>
          <span className={`badge ${badgeCls} inline-flex items-center gap-1 text-[10px]`}>
            <ActionIcon type={item.action_type} />
            {label}
          </span>
        </div>
        <p className="text-xs text-[var(--text-secondary)] truncate">{item.context}</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5 font-mono">
          {item.sku_id} · {sku?.category}
        </p>
      </div>

      {/* Revenue impact */}
      <div className="text-right flex-shrink-0">
        <div className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isPositive ? '+' : ''}{formatLakhsCrores(Math.abs(impact))}
        </div>
        <div className="text-[10px] text-[var(--text-tertiary)]">
          {isPositive ? 'at risk' : 'excess'}
        </div>
      </div>

      {/* Recommendation */}
      <div className="flex-shrink-0 max-w-[200px]">
        <div className="text-xs text-[var(--text-secondary)] mb-0.5">Recommended</div>
        <div className="text-xs font-medium text-[var(--text-primary)] leading-tight">
          {item.recommendation}
        </div>
      </div>

      {/* Confidence */}
      <div className="flex-shrink-0 text-center">
        <div className="text-[10px] text-[var(--text-tertiary)] mb-1">Confidence</div>
        <div className={`badge text-[10px] ${item.confidence === 'High' ? 'badge-positive' : item.confidence === 'Medium' ? 'badge-warning' : 'badge-neutral'}`}>
          {item.confidence}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--accent-primary)] rounded-md hover:opacity-90 transition-opacity">
          Approve
        </button>
        <button className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-md hover:bg-[var(--bg-secondary)] transition-colors">
          Override
        </button>
        <button
          className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] rounded transition-colors"
          title="Snooze"
        >
          <Clock size={14} />
        </button>
      </div>
    </div>
  );
}

interface Props {
  core: MerchDemandFullPayload;
}

export default function MerchExceptionCenter({ core }: Props) {
  const router = useRouter();
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const skuById = useMemo(
    () => new Map<string, MerchDemandSKU>(core.skus.map((s) => [s.sku_id, s])),
    [core.skus],
  );

  const sortedItems = useMemo(
    () => [...core.action_items].sort((a, b) => Math.abs(b.revenue_impact_inr) - Math.abs(a.revenue_impact_inr)),
    [core.action_items],
  );

  const filteredItems = useMemo(() => {
    let items = sortedItems;
    if (priorityFilter !== 'All') {
      items = items.filter((i) => derivePriority(i) === priorityFilter);
    }
    if (typeFilter !== 'all') {
      items = items.filter((i) => i.action_type === typeFilter);
    }
    return items;
  }, [sortedItems, priorityFilter, typeFilter]);

  const list = (
    <div className="divide-y divide-[var(--border-subtle)]">
      {filteredItems.slice(0, showAll ? undefined : 8).map((item) => (
        <ExceptionRow key={item.action_id} item={item} sku={skuById.get(item.sku_id)} />
      ))}
      {filteredItems.length === 0 && (
        <div className="px-6 py-8 text-center text-sm text-[var(--text-tertiary)]">
          No exceptions match the current filters
        </div>
      )}
    </div>
  );

  return (
    <section id="merch-exception-center" className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Exception Center</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {filteredItems.length} items need attention · ranked by revenue impact
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
            {(['All', 'Critical', 'High', 'Medium'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  priorityFilter === p
                    ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)] border-[var(--accent-primary)]'
                    : 'bg-white text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--border-hover)]'
                }`}
              >
                {p}
              </button>
            ))}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs border border-[var(--border-default)] rounded-md px-2 py-1 bg-white text-[var(--text-secondary)]"
            >
              <option value="all">All types</option>
              <option value="understock_risk">Understock Risk</option>
              <option value="overstock_risk">Overstock Risk</option>
              <option value="event_ramp">Event Ramp</option>
              <option value="demand_spike">Demand Spike</option>
              <option value="anomaly">Anomaly</option>
            </select>
            <button
              onClick={() => router.push('/merchandise/demand/deep-dive/exceptions')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-md hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6V2h4M10 6v4H6M7.5 2H10v2.5M4.5 10H2V7.5" />
              </svg>
              Deep Dive
            </button>
            <AIInsightButton id="merch-exception-center" title="Exception Center" data={filteredItems as unknown as Record<string, unknown>[]} />
          </div>
        </div>

      {list}

      {filteredItems.length > 8 && (
        <div className="p-4 text-center border-t border-[var(--border-subtle)]">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-[var(--accent-primary)] hover:underline"
          >
            {showAll ? 'Show fewer' : `Show all ${filteredItems.length} exceptions`}
          </button>
        </div>
      )}
    </section>
  );
}
