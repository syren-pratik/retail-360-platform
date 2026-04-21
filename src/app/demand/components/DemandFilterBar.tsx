'use client';

import { Calendar, Filter, X, RotateCcw } from 'lucide-react';
import { useDemand } from '@/app/context/DemandContext';

const departments = [
  'Grocery',
  'Dairy',
  'Beverages',
  'Snacks',
  'Personal Care',
  'Household',
  'Frozen Foods',
  'Fresh Produce',
  'Bakery',
  'Ready to Eat',
];

const abcOptions = [
  { value: 'all', label: 'All Classes' },
  { value: 'A', label: 'Class A' },
  { value: 'B', label: 'Class B' },
  { value: 'C', label: 'Class C' },
];

const horizonOptions = [
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 30, label: '30 Days' },
];

export default function DemandFilterBar() {
  const {
    filters,
    setFilters,
    resetFilters,
    activeDrilldowns,
    removeDrilldown,
    clearAllDrilldowns,
  } = useDemand();

  const hasActiveFilters =
    filters.departments.length > 0 ||
    filters.abcClass !== 'all' ||
    activeDrilldowns.length > 0;

  return (
    <div className="bg-white border-b border-[var(--border-default)] px-6 py-3">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-[var(--text-tertiary)]" />
          <input
            type="date"
            value={filters.dateRange[0]}
            onChange={(e) =>
              setFilters({ dateRange: [e.target.value, filters.dateRange[1]] })
            }
            className="input-base text-sm py-1.5"
          />
          <span className="text-[var(--text-tertiary)]">to</span>
          <input
            type="date"
            value={filters.dateRange[1]}
            onChange={(e) =>
              setFilters({ dateRange: [filters.dateRange[0], e.target.value] })
            }
            className="input-base text-sm py-1.5"
          />
        </div>

        <div className="h-6 w-px bg-[var(--border-default)]" />

        {/* Department Select */}
        <select
          value={filters.departments[0] || ''}
          onChange={(e) =>
            setFilters({ departments: e.target.value ? [e.target.value] : [] })
          }
          className="input-base text-sm py-1.5 min-w-[140px]"
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        {/* ABC Class */}
        <select
          value={filters.abcClass}
          onChange={(e) => setFilters({ abcClass: e.target.value })}
          className="input-base text-sm py-1.5"
        >
          {abcOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Forecast Horizon */}
        <select
          value={filters.forecastHorizon}
          onChange={(e) => setFilters({ forecastHorizon: Number(e.target.value) })}
          className="input-base text-sm py-1.5"
        >
          {horizonOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} Forecast
            </option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              resetFilters();
              clearAllDrilldowns();
            }}
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        )}
      </div>

      {/* Active Drilldowns */}
      {activeDrilldowns.length > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
          <Filter size={14} className="text-[var(--text-tertiary)]" />
          <span className="text-xs text-[var(--text-tertiary)]">Filters:</span>
          {activeDrilldowns.map((drill) => (
            <span
              key={drill.field}
              className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent-primary-light)] text-[var(--accent-primary)] text-xs rounded-full animate-chip-in"
            >
              <span className="font-medium">{drill.label}</span>
              <button
                onClick={() => removeDrilldown(drill.field)}
                className="hover:bg-[var(--accent-primary)] hover:text-white rounded-full p-0.5 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {activeDrilldowns.length > 1 && (
            <button
              onClick={clearAllDrilldowns}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
