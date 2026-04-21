'use client';

import { X } from 'lucide-react';
import { useDashboard } from '@/app/context/DashboardContext';

export default function ActiveFilterChips() {
  const { globalFilters, setGlobalFilters, activeDrilldowns, removeDrilldown, clearAllDrilldowns, resetFilters } = useDashboard();

  // Build chips from globalFilters
  const filterChips: { label: string; onRemove: () => void }[] = [];

  // Date range (only show if not default 90d)
  const [start] = globalFilters.dateRange;
  const daysDiff = Math.round((Date.now() - new Date(start).getTime()) / 86400000);
  if (daysDiff <= 7) filterChips.push({ label: 'Last 7 days', onRemove: () => setGlobalFilters({ dateRange: [new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0], new Date().toISOString().split('T')[0]] }) });
  else if (daysDiff <= 30) filterChips.push({ label: 'Last 30 days', onRemove: () => setGlobalFilters({ dateRange: [new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0], new Date().toISOString().split('T')[0]] }) });

  // Segments
  globalFilters.segments.forEach((seg) =>
    filterChips.push({ label: `Segment: ${seg}`, onRemove: () => setGlobalFilters({ segments: globalFilters.segments.filter((s) => s !== seg) }) })
  );

  // Loyalty tiers
  globalFilters.loyaltyTiers.forEach((tier) =>
    filterChips.push({ label: `Tier: ${tier}`, onRemove: () => setGlobalFilters({ loyaltyTiers: globalFilters.loyaltyTiers.filter((t) => t !== tier) }) })
  );

  // Channel
  if (globalFilters.channel && globalFilters.channel !== 'all') {
    filterChips.push({ label: `Channel: ${globalFilters.channel}`, onRemove: () => setGlobalFilters({ channel: 'all' }) });
  }

  // Cities
  (globalFilters.cities ?? []).forEach((city) =>
    filterChips.push({ label: `City: ${city}`, onRemove: () => setGlobalFilters({ cities: (globalFilters.cities ?? []).filter((c) => c !== city) }) })
  );

  // Drilldowns
  activeDrilldowns.forEach((d) =>
    filterChips.push({ label: d.label, onRemove: () => removeDrilldown(d.field) })
  );

  if (filterChips.length === 0) return null;

  return (
    <div className="sticky top-[57px] z-20 px-6 py-2 bg-[var(--accent-primary-light)] border-b border-[var(--border-default)]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-[var(--accent-primary)]">Active filters:</span>
        {filterChips.map((chip, i) => (
          <button
            key={i}
            onClick={chip.onRemove}
            className="inline-flex items-center gap-1.5 bg-white border border-[var(--accent-primary)] text-[var(--accent-primary)] rounded-full px-3 py-1 text-xs font-medium hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
          >
            <span>{chip.label}</span>
            <X size={11} />
          </button>
        ))}
        <button
          onClick={() => { resetFilters(); clearAllDrilldowns(); }}
          className="text-xs font-medium text-[var(--accent-primary)] hover:underline ml-1"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
