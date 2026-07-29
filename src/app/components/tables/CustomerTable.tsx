'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight, Download, CheckSquare, Square } from 'lucide-react';
import { CustomerRecord } from '@/app/lib/types';
import { exportCSV } from '@/app/lib/export-utils';
import { TableEmptyState } from '@/app/components/ui/EmptyState';
import { toast } from 'sonner';
import { useFormatMoneyPlain } from '@/app/lib/format-money';
import { useTenant } from '@/app/context/TenantContext';

interface CustomerTableProps {
  data: CustomerRecord[];
  onResetFilters?: () => void;
}

type SortField = keyof CustomerRecord;
type SortDirection = 'asc' | 'desc';

const ROWS_PER_PAGE = 20;

const getRiskBadgeClass = (tier: string) => {
  switch (tier) {
    case 'Critical':
      return 'bg-red-100 text-red-800';
    case 'High':
      return 'bg-orange-100 text-orange-800';
    case 'Medium':
      return 'bg-amber-100 text-amber-800';
    case 'Low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

export default function CustomerTable({ data, onResetFilters }: CustomerTableProps) {
  const router = useRouter();
  const formatCurrency = useFormatMoneyPlain();
  const { isApparel, isRetail } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('clv_12m');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleRowClick = (customerId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking checkbox
    if ((e.target as HTMLElement).closest('.checkbox-cell')) return;
    router.push(`/cx360/customer/${customerId}`);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (customer) =>
          customer.customer_id.toLowerCase().includes(query) ||
          customer.customer_segment.toLowerCase().includes(query) ||
          customer.top_category.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return result;
  }, [data, searchQuery, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedData.length / ROWS_PER_PAGE);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  // Selection handlers
  const toggleSelect = useCallback((customerId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map((c) => c.customer_id)));
    }
  }, [paginatedData, selectedIds.size]);

  const handleExport = useCallback(() => {
    const dataToExport = selectedIds.size > 0
      ? filteredAndSortedData.filter((c) => selectedIds.has(c.customer_id))
      : filteredAndSortedData;

    exportCSV(dataToExport as unknown as Record<string, unknown>[], 'customers');
    toast.success(`Exported ${dataToExport.length} customers`);
  }, [filteredAndSortedData, selectedIds]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="w-3 h-3 text-gray-300" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-[var(--accent-primary)]" />
    ) : (
      <ChevronDown className="w-3 h-3 text-[var(--accent-primary)]" />
    );
  };

  const columns: { key: SortField; label: string; align?: 'left' | 'right'; sticky?: boolean }[] = [
    { key: 'customer_id', label: 'Customer ID', align: 'left', sticky: true },
    { key: 'customer_segment', label: 'Segment', align: 'left' },
    ...(isApparel
      ? [{ key: 'top_brand' as SortField, label: 'Top Brand', align: 'left' as const }]
      : []),
    { key: 'loyalty_tier', label: 'Loyalty', align: 'left' },
    { key: 'total_spend', label: 'Total Spend', align: 'right' },
    { key: 'total_transactions', label: 'Txns', align: 'right' },
    { key: 'avg_basket', label: 'Avg Basket', align: 'right' },
    { key: 'days_since_last_purchase', label: 'Recency', align: 'right' },
    { key: 'clv_12m', label: 'CLV (12m)', align: 'right' },
    { key: 'churn_prob_90d', label: 'Churn Prob', align: 'right' },
    { key: 'churn_risk_tier', label: 'Risk', align: 'left' },
    { key: 'geography', label: 'Geography', align: 'left' },
    { key: 'preferred_channel', label: 'Channel', align: 'left' },
    { key: 'top_category', label: 'Top Category', align: 'left' },
  ];

  const isAllSelected = paginatedData.length > 0 && selectedIds.size === paginatedData.length;

  return (
    <section id="section-customer-table" className="card animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Customer Details
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}-{Math.min(currentPage * ROWS_PER_PAGE, filteredAndSortedData.length)} of {filteredAndSortedData.length.toLocaleString()} customers
            {selectedIds.size > 0 && (
              <span className="ml-2 text-[var(--accent-primary)]">
                ({selectedIds.size} selected)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
            />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="input-base pl-9 w-64"
            />
          </div>
          <button
            onClick={handleExport}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Download size={14} />
            Export {selectedIds.size > 0 ? `(${selectedIds.size})` : 'All'}
          </button>
        </div>
      </div>

      {filteredAndSortedData.length === 0 ? (
        <TableEmptyState
          title="No customers found"
          message={searchQuery ? `No results for "${searchQuery}"` : 'No data matches your current filters'}
          onReset={searchQuery ? () => setSearchQuery('') : onResetFilters}
        />
      ) : (
        <>
          <div className="overflow-x-auto border border-[var(--border-default)] rounded-lg">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--bg-tertiary)]">
                  <tr>
                    {/* Checkbox column */}
                    <th className="sticky left-0 z-20 bg-[var(--bg-tertiary)] px-3 py-2.5 w-10">
                      <button
                        onClick={toggleSelectAll}
                        className="p-0.5 rounded hover:bg-[var(--bg-secondary)] transition-colors checkbox-cell"
                      >
                        {isAllSelected ? (
                          <CheckSquare size={16} className="text-[var(--accent-primary)]" />
                        ) : (
                          <Square size={16} className="text-[var(--text-tertiary)]" />
                        )}
                      </button>
                    </th>
                    {columns.map((col, index) => (
                      <th
                        key={col.key}
                        className={`px-3 py-2.5 font-medium text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        } ${col.sticky ? 'sticky left-10 z-20 bg-[var(--bg-tertiary)]' : ''} ${
                          index === columns.length - 1 ? 'rounded-tr-md' : ''
                        }`}
                        onClick={() => handleSort(col.key)}
                      >
                        <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                          <span>{col.label}</span>
                          <SortIcon field={col.key} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((customer) => (
                    <tr
                      key={customer.customer_id}
                      onClick={(e) => handleRowClick(customer.customer_id, e)}
                      className={`border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors ${
                        selectedIds.has(customer.customer_id) ? 'bg-[var(--accent-primary-light)]' : ''
                      }`}
                    >
                      {/* Checkbox cell */}
                      <td className="sticky left-0 z-10 bg-white px-3 py-2.5 checkbox-cell">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(customer.customer_id);
                          }}
                          className="p-0.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                          {selectedIds.has(customer.customer_id) ? (
                            <CheckSquare size={16} className="text-[var(--accent-primary)]" />
                          ) : (
                            <Square size={16} className="text-[var(--text-tertiary)]" />
                          )}
                        </button>
                      </td>
                      <td className="sticky left-10 z-10 bg-white px-3 py-2.5 font-medium text-[var(--accent-primary)]">
                        {customer.customer_id}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{customer.customer_segment}</td>
                      {isApparel && (
                        <td className="px-3 py-2.5 whitespace-nowrap font-medium text-[var(--text-primary)]">
                          {customer.top_brand ?? '—'}
                        </td>
                      )}
                      <td className="px-3 py-2.5 whitespace-nowrap">{customer.loyalty_tier}</td>
                      <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                        {formatCurrency(customer.total_spend)}
                      </td>
                      <td className="px-3 py-2.5 text-right">{customer.total_transactions}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {formatCurrency(customer.avg_basket)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {customer.days_since_last_purchase}d
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-[var(--positive)] whitespace-nowrap">
                        {formatCurrency(customer.clv_12m)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {formatPercent(customer.churn_prob_90d)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getRiskBadgeClass(
                            customer.churn_risk_tier
                          )}`}
                        >
                          {customer.churn_risk_tier}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{customer.geography}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{customer.preferred_channel}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{customer.top_category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <p className="text-sm text-[var(--text-secondary)]">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded border border-[var(--border-default)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)]"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded text-sm ${
                          currentPage === pageNum
                            ? 'bg-[var(--accent-primary)] text-white'
                            : 'hover:bg-[var(--bg-secondary)]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded border border-[var(--border-default)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)]"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
