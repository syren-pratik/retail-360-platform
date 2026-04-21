'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronUp, ChevronDown, Download } from 'lucide-react';
import { SKUForecast } from '@/app/lib/demand-types';

interface SKUForecastTableProps {
  data: SKUForecast[];
}

type SortField = 'product_id' | 'product_name' | 'department' | 'stockout_risk' | 'forecast_7d' | 'days_of_stock';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 20;

const RISK_COLORS = {
  Low: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-rose-100 text-rose-700',
};

export default function SKUForecastTable({ data }: SKUForecastTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('forecast_7d');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...(data ?? [])];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (item) =>
          (item.product_id ?? '').toLowerCase().includes(searchLower) ||
          (item.product_name ?? '').toLowerCase().includes(searchLower) ||
          (item.department ?? '').toLowerCase().includes(searchLower)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      // Handle numeric strings
      if (sortField === 'forecast_7d' || sortField === 'days_of_stock') {
        const aNum = parseFloat(aVal as string) || 0;
        const bNum = parseFloat(bVal as string) || 0;
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return 0;
    });

    return result;
  }, [data, search, sortField, sortDirection]);

  // Paginate
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRowClick = (productId: string) => {
    router.push(`/demand/product/${productId}`);
  };

  const handleExport = () => {
    const headers = ['Product ID', 'Name', 'Department', 'Current Stock', 'Forecast (7d)', 'Forecast (14d)', 'Days of Stock', 'Stockout Risk'];
    const rows = (filteredData ?? []).map((item) => [
      item.product_id,
      item.product_name,
      item.department,
      item.current_stock,
      item.forecast_7d,
      item.forecast_14d,
      item.days_of_stock,
      item.stockout_risk,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sku_forecast.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp size={14} className="inline ml-0.5" />
    ) : (
      <ChevronDown size={14} className="inline ml-0.5" />
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search SKU, name, or department..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          />
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-[var(--border-default)] rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--bg-secondary)]">
            <tr>
              <th
                onClick={() => handleSort('product_id')}
                className="px-3 py-2.5 text-left font-medium text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-tertiary)]"
              >
                SKU <SortIcon field="product_id" />
              </th>
              <th
                onClick={() => handleSort('product_name')}
                className="px-3 py-2.5 text-left font-medium text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-tertiary)]"
              >
                Product <SortIcon field="product_name" />
              </th>
              <th
                onClick={() => handleSort('department')}
                className="px-3 py-2.5 text-left font-medium text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-tertiary)]"
              >
                Dept <SortIcon field="department" />
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-[var(--text-secondary)]">
                Current Stock
              </th>
              <th
                onClick={() => handleSort('forecast_7d')}
                className="px-3 py-2.5 text-right font-medium text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-tertiary)]"
              >
                Forecast (7d) <SortIcon field="forecast_7d" />
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-[var(--text-secondary)]">
                Forecast (14d)
              </th>
              <th
                onClick={() => handleSort('days_of_stock')}
                className="px-3 py-2.5 text-right font-medium text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-tertiary)]"
              >
                Days of Stock <SortIcon field="days_of_stock" />
              </th>
              <th
                onClick={() => handleSort('stockout_risk')}
                className="px-3 py-2.5 text-center font-medium text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-tertiary)]"
              >
                Risk <SortIcon field="stockout_risk" />
              </th>
            </tr>
          </thead>
          <tbody>
            {(paginatedData ?? []).map((item) => {
              const daysOfStock = parseFloat(item.days_of_stock) || 0;
              return (
                <tr
                  key={item.product_id}
                  onClick={() => handleRowClick(item.product_id)}
                  className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2.5 font-mono text-xs text-[var(--text-secondary)]">
                    {item.product_id}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--text-primary)] font-medium truncate max-w-[200px]">
                    {item.product_name}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                    {item.department}
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium">
                    {item.current_stock}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[var(--text-secondary)]">
                    {item.forecast_7d}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[var(--text-secondary)]">
                    {item.forecast_14d}
                  </td>
                  <td className={`px-3 py-2.5 text-right ${daysOfStock < 5 ? 'text-rose-600 font-medium' : ''}`}>
                    {item.days_of_stock}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${RISK_COLORS[item.stockout_risk as keyof typeof RISK_COLORS] || 'bg-gray-100 text-gray-600'}`}>
                      {item.stockout_risk}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <span className="text-[var(--text-secondary)]">
          Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredData.length)} of {filteredData.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border border-[var(--border-default)] rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)]"
          >
            Previous
          </button>
          <span className="px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border border-[var(--border-default)] rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)]"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
