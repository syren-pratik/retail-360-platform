'use client';

import { X } from 'lucide-react';
import { useMerchFilters } from '../MerchFilterContext';

export default function MerchActiveFilterChips() {
  const { activeChips } = useMerchFilters();

  if (activeChips.length === 0) return null;

  return (
    <div className="px-8 py-3 flex flex-wrap gap-2 border-b border-[var(--border-default)] bg-white">
      {activeChips.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-[var(--accent-primary-light)] text-[var(--accent-primary)] border border-[var(--accent-primary)] border-opacity-20"
        >
          {chip.label}: {chip.value}
          <button
            onClick={chip.onRemove}
            aria-label={`Remove ${chip.label} filter`}
            className="ml-0.5 hover:opacity-70 transition-opacity"
          >
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}
