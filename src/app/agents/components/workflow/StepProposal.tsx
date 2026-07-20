'use client';

import type { ProposalItem } from '@/app/agents/lib/action-types';

interface Props {
  proposals: ProposalItem[];
  onProposalChange?: (proposals: ProposalItem[]) => void;
  onApprove?: (selected: ProposalItem[]) => void;
  onDismiss?: () => void;
  readonly?: boolean;
  stepNumber?: number;
}

const PRIORITY_BADGE: Record<ProposalItem['priority'], string> = {
  high: 'bg-rose-50 text-rose-700 border-rose-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function StepProposal({
  proposals,
  onProposalChange,
  onApprove,
  onDismiss,
  readonly = false,
  stepNumber = 2,
}: Props) {
  const visible = readonly ? proposals.filter((p) => p.selected) : proposals;
  const selectedCount = proposals.filter((p) => p.selected).length;
  const selectedTotal = proposals.filter((p) => p.selected).reduce((s, p) => s + p.value_inr, 0);

  function toggle(id: string) {
    if (!onProposalChange) return;
    onProposalChange(proposals.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
  }

  return (
    <div className="border border-[var(--border-default)] rounded-lg bg-white p-4 mb-3">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-medium text-white">
          {stepNumber}
        </div>
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          {readonly ? 'Approved items' : 'Review proposals'}
        </h3>
      </div>

      <div className="ml-10 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border-default)]">
              <th className="pb-2 pr-2 w-6"></th>
              <th className="pb-2 pr-2">SKU</th>
              <th className="pb-2 pr-2">Signal</th>
              <th className="pb-2 pr-2">Action</th>
              <th className="pb-2 pr-2 text-right">Value (₹L)</th>
              <th className="pb-2 pr-2">Priority</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border-default)] last:border-0">
                <td className="py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={p.selected}
                    disabled={readonly}
                    onChange={() => toggle(p.id)}
                  />
                </td>
                <td className="py-2 pr-2">
                  <div className="font-medium text-[var(--text-primary)]">{p.sku_id}</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">{p.product_name}</div>
                </td>
                <td className="py-2 pr-2">
                  <div className="text-[var(--text-secondary)]">{p.metric_label}</div>
                  <div className={p.metric_urgent ? 'text-rose-600 font-medium' : 'text-[var(--text-primary)]'}>
                    {p.metric_value}
                  </div>
                </td>
                <td className="py-2 pr-2 text-[var(--text-primary)]">{p.action_label}</td>
                <td className="py-2 pr-2 text-right text-[var(--text-primary)]">
                  ₹{p.value_inr.toFixed(1)}L
                </td>
                <td className="py-2 pr-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border ${PRIORITY_BADGE[p.priority]}`}
                  >
                    {p.priority.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-2 text-right text-[var(--text-secondary)]">
                Total ({readonly ? visible.length : selectedCount} selected)
              </td>
              <td className="pt-2 text-right font-medium text-[var(--text-primary)]">
                ₹{(readonly ? visible.reduce((s, p) => s + p.value_inr, 0) : selectedTotal).toFixed(1)}L
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!readonly && (
        <div className="ml-10 mt-4 flex items-center gap-2">
          <button
            onClick={() => onApprove?.(proposals.filter((p) => p.selected))}
            disabled={selectedCount === 0}
            className="px-3 py-1.5 text-xs rounded-md bg-[var(--accent-primary)] text-white disabled:opacity-40"
          >
            Approve {selectedCount} items · ₹{selectedTotal.toFixed(1)}L total
          </button>
          <button
            className="px-3 py-1.5 text-xs rounded-md border border-[var(--border-default)] text-[var(--text-secondary)]"
            type="button"
          >
            Edit quantities
          </button>
          <button
            onClick={() => onDismiss?.()}
            className="px-3 py-1.5 text-xs rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            type="button"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
