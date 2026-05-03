'use client';

import { useInventory } from '@/app/context/InventoryContext';
import { X } from 'lucide-react';

const VIEW_AS_OPTIONS = [
  { value: 'all',           label: 'All India'             },
  { value: 'north',         label: 'North — Delhi NCR'     },
  { value: 'west',          label: 'West — Mumbai/Pune'    },
  { value: 'south',         label: 'South — Blr/Chennai'   },
  { value: 'grocery',       label: 'Grocery & Dairy'       },
  { value: 'personal_care', label: 'Personal Care'         },
  { value: 'electronics',   label: 'Electronics'           },
  { value: 'supply_chain',  label: 'Supply Chain'          },
  { value: 'custom',        label: 'Custom'                },
];

const DEPARTMENTS = [
  'Dairy', 'Grocery', 'Beverages', 'Snacks',
  'Personal Care', 'Household', 'Baby Care', 'Frozen Foods',
];

const ABC_CLASSES = ['A', 'B', 'C'];

const STOCK_STATUSES = [
  { value: 'stockout',  label: 'Stockout'  },
  { value: 'critical',  label: 'Critical'  },
  { value: 'low',       label: 'Low Stock' },
  { value: 'healthy',   label: 'Healthy'   },
  { value: 'overstock', label: 'Overstock' },
  { value: 'deadstock', label: 'Deadstock' },
];

const URGENCIES = ['Critical', 'High', 'Medium', 'Low'];
const TIME_PERIODS = ['30d', '90d', '6m', '12m'];

export default function InventoryFilterBar() {
  const { filters, setFilters, resetFilters, setRole } = useInventory();
  const selectedRole = filters.selectedRole;
  const timePeriod = filters.timePeriod ?? '90d';

  const hasActiveFilters =
    (filters.departments ?? []).length > 0 ||
    filters.abcClass !== 'all' ||
    filters.stockStatus !== 'all' ||
    filters.urgency !== 'all';

  const handleRoleChange = (role: string) => {
    switch (role) {
      case 'all':
        resetFilters();
        break;
      case 'north':
        setRole('north');
        setFilters({ cities: ['Delhi NCR'], departments: [] });
        break;
      case 'west':
        setRole('west');
        setFilters({ cities: ['Mumbai', 'Pune'], departments: [] });
        break;
      case 'south':
        setRole('south');
        setFilters({ cities: ['Bangalore', 'Chennai'], departments: [] });
        break;
      case 'grocery':
        setRole('grocery');
        setFilters({ departments: ['Grocery & Staples', 'Dairy & Frozen'], cities: [] });
        break;
      case 'personal_care':
        setRole('personal_care');
        setFilters({ departments: ['Personal Care'], cities: [] });
        break;
      case 'electronics':
        setRole('electronics');
        setFilters({ departments: ['Electronics'], cities: [] });
        break;
      case 'supply_chain':
        resetFilters();
        setRole('supply_chain');
        break;
      default:
        setRole(role);
    }
  };

  return (
    <>
      {/* Row 1 — Role selector + Time period */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">Viewing as:</span>
          <select
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="text-sm border border-[var(--border-default)] rounded-md px-2.5 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent min-w-[200px]"
          >
            {VIEW_AS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {selectedRole === 'custom' && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full whitespace-nowrap">
              Custom filters active
            </span>
          )}
        </div>

        {/* Time period buttons */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--text-tertiary)] mr-2">Period:</span>
          {TIME_PERIODS.map(tp => (
            <button
              key={tp}
              onClick={() => setFilters({ timePeriod: tp })}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                timePeriod === tp
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-white border border-transparent hover:border-[var(--border-default)]'
              }`}
            >
              {tp}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2 — Manual filters */}
      <div className="card mx-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Department */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-tertiary)]">Department:</label>
            <select
              value={(filters.departments ?? [])[0] || ''}
              onChange={(e) => {
                setFilters({ departments: e.target.value ? [e.target.value] : [] });
                setRole('custom');
              }}
              className="text-sm border border-[var(--border-default)] rounded-md px-2 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* ABC Class */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-tertiary)]">ABC Class:</label>
            <select
              value={filters.abcClass}
              onChange={(e) => {
                setFilters({ abcClass: e.target.value });
                setRole('custom');
              }}
              className="text-sm border border-[var(--border-default)] rounded-md px-2 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            >
              <option value="all">All Classes</option>
              {ABC_CLASSES.map((cls) => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-tertiary)]">Status:</label>
            <select
              value={filters.stockStatus}
              onChange={(e) => {
                setFilters({ stockStatus: e.target.value });
                setRole('custom');
              }}
              className="text-sm border border-[var(--border-default)] rounded-md px-2 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              {STOCK_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>

          {/* Urgency */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--text-tertiary)]">Urgency:</label>
            <select
              value={filters.urgency}
              onChange={(e) => {
                setFilters({ urgency: e.target.value });
                setRole('custom');
              }}
              className="text-sm border border-[var(--border-default)] rounded-md px-2 py-1.5 bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            >
              <option value="all">All</option>
              {URGENCIES.map((urg) => (
                <option key={urg} value={urg}>{urg}</option>
              ))}
            </select>
          </div>

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

        {/* Active filter chips */}
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
                    departments: (filters.departments ?? []).filter(d => d !== dept),
                  })}
                  className="hover:text-[var(--accent-primary-dark)]"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {filters.abcClass !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[var(--accent-primary-light)] text-[var(--accent-primary)]">
                Class {filters.abcClass}
                <button onClick={() => setFilters({ abcClass: 'all' })} className="hover:text-[var(--accent-primary-dark)]">
                  <X size={12} />
                </button>
              </span>
            )}
            {filters.stockStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[var(--accent-primary-light)] text-[var(--accent-primary)]">
                {STOCK_STATUSES.find(s => s.value === filters.stockStatus)?.label ?? ''}
                <button onClick={() => setFilters({ stockStatus: 'all' })} className="hover:text-[var(--accent-primary-dark)]">
                  <X size={12} />
                </button>
              </span>
            )}
            {filters.urgency !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[var(--accent-primary-light)] text-[var(--accent-primary)]">
                {filters.urgency} urgency
                <button onClick={() => setFilters({ urgency: 'all' })} className="hover:text-[var(--accent-primary-dark)]">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
