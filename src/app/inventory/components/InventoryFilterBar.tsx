'use client';

import { useInventory } from '@/app/context/InventoryContext';
import { X } from 'lucide-react';

const DEPARTMENTS = [
  'Dairy',
  'Grocery',
  'Beverages',
  'Snacks',
  'Personal Care',
  'Household',
  'Baby Care',
  'Frozen Foods',
];

const ABC_CLASSES = ['A', 'B', 'C'];

const STOCK_STATUSES = [
  { value: 'stockout', label: 'Stockout' },
  { value: 'critical', label: 'Critical' },
  { value: 'low', label: 'Low Stock' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'overstock', label: 'Overstock' },
  { value: 'deadstock', label: 'Deadstock' },
];

const URGENCIES = ['Critical', 'High', 'Medium', 'Low'];

export default function InventoryFilterBar() {
  const { filters, setFilters, resetFilters } = useInventory();

  const hasActiveFilters =
    (filters.departments ?? []).length > 0 ||
    filters.abcClass !== 'all' ||
    filters.stockStatus !== 'all' ||
    filters.urgency !== 'all';

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-3">
        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-tertiary)]">Department:</label>
          <select
            value={(filters.departments ?? [])[0] || ''}
            onChange={(e) => setFilters({
              departments: e.target.value ? [e.target.value] : []
            })}
            className="text-sm border border-[var(--border-default)] rounded-md px-2 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
          >
            <option value="">All Departments</option>
            {(DEPARTMENTS ?? []).map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* ABC Class Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-tertiary)]">ABC Class:</label>
          <select
            value={filters.abcClass}
            onChange={(e) => setFilters({ abcClass: e.target.value })}
            className="text-sm border border-[var(--border-default)] rounded-md px-2 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
          >
            <option value="all">All Classes</option>
            {(ABC_CLASSES ?? []).map((cls) => (
              <option key={cls} value={cls}>Class {cls}</option>
            ))}
          </select>
        </div>

        {/* Stock Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-tertiary)]">Status:</label>
          <select
            value={filters.stockStatus}
            onChange={(e) => setFilters({ stockStatus: e.target.value })}
            className="text-sm border border-[var(--border-default)] rounded-md px-2 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            {(STOCK_STATUSES ?? []).map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        {/* Urgency Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-tertiary)]">Urgency:</label>
          <select
            value={filters.urgency}
            onChange={(e) => setFilters({ urgency: e.target.value })}
            className="text-sm border border-[var(--border-default)] rounded-md px-2 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
          >
            <option value="all">All</option>
            {(URGENCIES ?? []).map((urg) => (
              <option key={urg} value={urg}>{urg}</option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors ml-2"
          >
            <X size={14} />
            Clear filters
          </button>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
          {(filters.departments ?? []).map((dept) => (
            <span
              key={dept}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[var(--accent-primary-light)] text-[var(--accent-primary)]"
            >
              {dept}
              <button
                onClick={() => setFilters({
                  departments: (filters.departments ?? []).filter(d => d !== dept)
                })}
                className="hover:text-[var(--accent-primary-dark)]"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {filters.abcClass !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[var(--accent-primary-light)] text-[var(--accent-primary)]">
              Class {filters.abcClass ?? ''}
              <button
                onClick={() => setFilters({ abcClass: 'all' })}
                className="hover:text-[var(--accent-primary-dark)]"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.stockStatus !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[var(--accent-primary-light)] text-[var(--accent-primary)]">
              {(STOCK_STATUSES ?? []).find(s => s.value === filters.stockStatus)?.label ?? ''}
              <button
                onClick={() => setFilters({ stockStatus: 'all' })}
                className="hover:text-[var(--accent-primary-dark)]"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {filters.urgency !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[var(--accent-primary-light)] text-[var(--accent-primary)]">
              {filters.urgency ?? ''} urgency
              <button
                onClick={() => setFilters({ urgency: 'all' })}
                className="hover:text-[var(--accent-primary-dark)]"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
