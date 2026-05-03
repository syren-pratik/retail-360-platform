'use client';

import { useEffect, useCallback, ReactNode, useState } from 'react';
import { X, Download, Image as ImageIcon, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useDashboard } from '@/app/context/DashboardContext';
import { exportPNG } from '@/app/lib/export-utils';

interface Column {
  key: string;
  label: string;
  format?: (value: unknown) => string;
}

interface ChartExpandModalProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawData?: any[];
  columns?: Column[];
}

export default function ChartExpandModal({
  title,
  children,
  rawData,
  columns,
}: ChartExpandModalProps) {
  const { expandedChart, setExpandedChart } = useDashboard();
  const [isExportingPNG, setIsExportingPNG] = useState(false);
  const chartId = `expanded-chart-${expandedChart}`;

  const handleClose = useCallback(() => {
    setExpandedChart(null);
  }, [setExpandedChart]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (expandedChart) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [expandedChart, handleClose]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!rawData || !columns) return;

    const headers = columns.map((c) => c.label).join(',');
    const rows = rawData.map((row) =>
      columns
        .map((col) => {
          const value = row[col.key];
          const formatted = col.format ? col.format(value) : String(value ?? '');
          // Escape quotes and wrap in quotes if contains comma
          if (formatted.includes(',') || formatted.includes('"')) {
            return `"${formatted.replace(/"/g, '""')}"`;
          }
          return formatted;
        })
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PNG
  const handleExportPNG = async () => {
    setIsExportingPNG(true);
    try {
      await exportPNG(chartId, title.toLowerCase().replace(/\s+/g, '_'));
    } finally {
      setIsExportingPNG(false);
    }
  };

  if (!expandedChart) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-default)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/cx360" onClick={handleClose} className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              <ArrowLeft size={15} />
              Back to CX360
            </Link>
            <span className="text-[var(--border-default)]">|</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">{title}</span>
            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">Deep Dive</span>
          </div>
          <div className="flex items-center gap-2">
            {rawData && columns && (
              <>
                <button
                  onClick={handleExportCSV}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Download size={14} />
                  Export CSV
                </button>
                <button
                  onClick={handleExportPNG}
                  disabled={isExportingPNG}
                  className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {isExportingPNG ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ImageIcon size={14} />
                  )}
                  Export PNG
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chart Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Large Chart */}
          <div id={chartId} className="h-[400px] mb-6 bg-white p-4 rounded-lg">{children}</div>

          {/* Data Table */}
          {rawData && columns && rawData.length > 0 && (
            <div className="border border-[var(--border-default)] rounded-lg overflow-hidden">
              <div className="bg-[var(--bg-secondary)] px-4 py-2 border-b border-[var(--border-default)]">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  Data Table ({rawData.length} rows)
                </h3>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-[var(--border-default)]">
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-4 py-2 text-left font-medium text-[var(--text-secondary)]"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]"
                      >
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className="px-4 py-2 text-[var(--text-primary)]"
                          >
                            {col.format
                              ? col.format(row[col.key])
                              : String(row[col.key] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
