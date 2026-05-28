'use client';

import type { SKUMeta } from '../lib/forecast-aggregation';

interface Props {
  meta: SKUMeta;
}

export default function MerchSKUMetaChips({ meta }: Props) {
  const chips: { label: string; variant: 'negative' | 'warning' | 'neutral' }[] = [];

  if (meta.has_anomaly && meta.anomaly) {
    chips.push({
      label: `Anomaly: ${meta.anomaly.hypothesis.substring(0, 40)}${meta.anomaly.hypothesis.length > 40 ? '…' : ''}`,
      variant: 'negative',
    });
  }

  if (meta.has_active_promo && meta.promo) {
    const status = meta.promo.performance_status;
    chips.push({
      label: `Promo: ${meta.promo.promo_type} ${meta.promo.discount_depth_pct}% off · ${status.replace('_', ' ')}`,
      variant: status === 'under_performing' ? 'warning' : 'neutral',
    });
  }

  if (meta.relevant_event) {
    const { event, lift } = meta.relevant_event;
    chips.push({
      label: `${event.event_name} · +${lift.expected_lift_pct.toFixed(0)}% lift expected`,
      variant: 'neutral',
    });
  }

  if (meta.launch_info) {
    const l = meta.launch_info;
    const statusLabel =
      l.performance_status === 'beat_plan' ? 'beating plan' :
      l.performance_status === 'on_plan' ? 'on plan' :
      l.performance_status === 'missed_plan' ? 'missed plan' : 'too early';
    chips.push({
      label: `New launch · ${l.days_in_market}d in market · ${statusLabel}`,
      variant: l.performance_status === 'missed_plan' ? 'warning' : 'neutral',
    });
  }

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip, i) => (
        <span
          key={i}
          className={`badge ${
            chip.variant === 'negative' ? 'badge-negative' :
            chip.variant === 'warning' ? 'badge-warning' :
            'badge-neutral'
          } text-[10px]`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
