'use client';

import type { PriceIntelLiveActivity as LiveActivityItem } from '@/app/lib/price-intel-types';

interface Props {
  items: LiveActivityItem[];
}

const SEVERITY_COLORS = {
  red:   { border: 'border-l-rose-500',   dot: 'bg-rose-500',   badge: 'bg-rose-100 text-rose-700' },
  amber: { border: 'border-l-amber-500',  dot: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700' },
  green: { border: 'border-l-emerald-500',dot: 'bg-emerald-500',badge: 'bg-emerald-100 text-emerald-700' },
  blue:  { border: 'border-l-blue-500',   dot: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700' },
};

const EVENT_LABELS: Record<string, string> = {
  promo_accepted:     'Promo',
  cost_alert:         'Cost',
  markdown_triggered: 'Markdown',
  elasticity_update:  'Elasticity',
  campaign_live:      'Campaign',
  compliance_gap:     'Compliance',
  free_rider_detected:'Free Rider',
  season_alert:       'Season',
};

export default function PriceIntelLiveActivity({ items }: Props) {
  const recent = items.slice(0, 8);

  return (
    <div className="card p-4 h-full flex flex-col">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Live Activity</h3>
        <p className="text-xs text-[var(--text-tertiary)]">Real-time pricing signals</p>
      </div>

      <div className="flex-1 overflow-auto space-y-2">
        {recent.map((item) => {
          const cfg = SEVERITY_COLORS[item.severity];
          return (
            <div
              key={item.id}
              className={`border-l-2 pl-3 py-1.5 ${cfg.border}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cfg.badge}`}>
                      {EVENT_LABELS[item.event_type] ?? item.event_type}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">{item.timestamp_ago}</span>
                  </div>
                  <p className="text-xs font-medium text-[var(--text-primary)] leading-tight">{item.headline}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-tight line-clamp-2">{item.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
