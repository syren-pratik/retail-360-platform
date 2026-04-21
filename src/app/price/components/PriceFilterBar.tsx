'use client';

import { useEffect, useState } from 'react';
import { Filter, X, ChevronDown, RotateCcw } from 'lucide-react';
import { usePrice } from '@/app/context/PriceContext';

interface FilterOption {
  label: string;
  value: string;
}

const priorityOptions: FilterOption[] = [
  { label: 'All Priorities', value: 'all' },
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' },
];

const actionOptions: FilterOption[] = [
  { label: 'All Actions', value: 'all' },
  { label: 'Increase', value: 'increase' },
  { label: 'Decrease', value: 'decrease' },
  { label: 'No Change', value: 'no_change' },
];

const elasticityOptions: FilterOption[] = [
  { label: 'All Elasticity', value: 'all' },
  { label: 'Elastic (>1)', value: 'elastic' },
  { label: 'Unit Elastic (=1)', value: 'unit' },
  { label: 'Inelastic (<1)', value: 'inelastic' },
];

const departmentOptions: FilterOption[] = [
  { label: 'All Departments', value: 'all' },
  { label: 'Dairy', value: 'Dairy' },
  { label: 'Grocery', value: 'Grocery' },
  { label: 'Beverages', value: 'Beverages' },
  { label: 'Snacks', value: 'Snacks' },
  { label: 'Personal Care', value: 'Personal Care' },
  { label: 'Household', value: 'Household' },
  { label: 'Baby Care', value: 'Baby Care' },
  { label: 'Frozen Foods', value: 'Frozen Foods' },
];

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  label?: string;
}

function Select({ value, onChange, options, label }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative">
      {label && (
        <label className="block text-xs text-[var(--text-tertiary)] mb-1">{label}</label>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-2 border border-[var(--border-default)] rounded-lg bg-white text-sm min-w-[140px] hover:border-[var(--accent-primary)] transition-colors"
      >
        <span className={value === 'all' ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}>
          {selectedOption?.label}
        </span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-[var(--border-default)] rounded-lg shadow-lg py-1 min-w-full">
            {(options ?? []).map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-secondary)] transition-colors ${
                  value === option.value ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)]' : ''
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PriceFilterBar() {
  const { filters, setFilters, resetFilters } = usePrice();
  const [selectedDept, setSelectedDept] = useState('all');

  // Sync department filter
  useEffect(() => {
    if (selectedDept === 'all') {
      setFilters({ departments: [] });
    } else {
      setFilters({ departments: [selectedDept] });
    }
  }, [selectedDept, setFilters]);

  const hasActiveFilters =
    filters.recommendationPriority !== 'all' ||
    filters.priceAction !== 'all' ||
    filters.elasticityRange !== 'all' ||
    filters.departments.length > 0;

  const handleReset = () => {
    resetFilters();
    setSelectedDept('all');
  };

  return (
    <div className="bg-white border-b border-[var(--border-default)] px-6 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Filter size={16} />
          <span className="text-sm font-medium">Filters</span>
        </div>

        <div className="h-6 w-px bg-[var(--border-default)]" />

        <Select
          value={selectedDept}
          onChange={setSelectedDept}
          options={departmentOptions}
        />

        <Select
          value={filters.recommendationPriority}
          onChange={(value) => setFilters({ recommendationPriority: value })}
          options={priorityOptions}
        />

        <Select
          value={filters.priceAction}
          onChange={(value) => setFilters({ priceAction: value })}
          options={actionOptions}
        />

        <Select
          value={filters.elasticityRange}
          onChange={(value) => setFilters({ elasticityRange: value })}
          options={elasticityOptions}
        />

        {hasActiveFilters && (
          <>
            <div className="h-6 w-px bg-[var(--border-default)]" />
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-3">
          {filters.departments.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent-primary-light)] text-[var(--accent-primary)] rounded text-xs">
              {filters.departments[0]}
              <button onClick={() => setSelectedDept('all')} className="hover:opacity-70">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.recommendationPriority !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent-primary-light)] text-[var(--accent-primary)] rounded text-xs">
              Priority: {filters.recommendationPriority}
              <button onClick={() => setFilters({ recommendationPriority: 'all' })} className="hover:opacity-70">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.priceAction !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent-primary-light)] text-[var(--accent-primary)] rounded text-xs">
              Action: {filters.priceAction}
              <button onClick={() => setFilters({ priceAction: 'all' })} className="hover:opacity-70">
                <X size={12} />
              </button>
            </span>
          )}
          {filters.elasticityRange !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent-primary-light)] text-[var(--accent-primary)] rounded text-xs">
              Elasticity: {filters.elasticityRange}
              <button onClick={() => setFilters({ elasticityRange: 'all' })} className="hover:opacity-70">
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
