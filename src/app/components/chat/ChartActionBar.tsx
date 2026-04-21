'use client';

import { useState, useRef, useEffect } from 'react';
import { Pin, Download, Pencil, Check, ChevronDown, X } from 'lucide-react';
import { pinChart, type PinnedChart } from '@/app/lib/pinned-charts';

// ============================================================================
// TYPES
// ============================================================================

type ChartType = PinnedChart['chart_type'];

interface ChartActionBarProps {
  chartId: string;
  chartType: ChartType;
  title: string;
  data: unknown[];
  config: Record<string, unknown>;
  onCustomize?: () => void;
  onExport?: () => void;
  isPinned?: boolean;
}

type PinSection = 'after_kpis' | 'after_churn' | 'after_cohort' | 'bottom';
type PinSize = 'half' | 'full';

const PIN_SECTIONS: { value: PinSection; label: string }[] = [
  { value: 'after_kpis', label: 'After KPI cards' },
  { value: 'after_churn', label: 'After Churn Intelligence section' },
  { value: 'after_cohort', label: 'After Cohort Retention' },
  { value: 'bottom', label: 'Bottom of the page' },
];

// ============================================================================
// PIN DROPDOWN COMPONENT
// ============================================================================

function PinDropdown({
  isOpen,
  onClose,
  onPin,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPin: (section: PinSection, size: PinSize) => void;
}) {
  const [section, setSection] = useState<PinSection>('after_kpis');
  const [size, setSize] = useState<PinSize>('half');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-[var(--border-default)] rounded-lg shadow-lg p-3 z-50"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
          Pin to Dashboard
        </h4>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)]"
        >
          <X size={14} />
        </button>
      </div>

      {/* Section Selection */}
      <div className="mb-3">
        <p className="text-xs text-[var(--text-secondary)] mb-1.5">Where should this appear?</p>
        <div className="space-y-1">
          {PIN_SECTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                section === opt.value
                  ? 'bg-[var(--accent-primary-light)] border border-[var(--accent-primary)]'
                  : 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              <input
                type="radio"
                name="section"
                value={opt.value}
                checked={section === opt.value}
                onChange={() => setSection(opt.value)}
                className="sr-only"
              />
              <span
                className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                  section === opt.value
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]'
                    : 'border-[var(--border-default)]'
                }`}
              >
                {section === opt.value && <Check size={8} className="text-white" />}
              </span>
              <span className="text-xs text-[var(--text-primary)]">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Size Selection */}
      <div className="mb-3">
        <p className="text-xs text-[var(--text-secondary)] mb-1.5">Size:</p>
        <div className="flex gap-2">
          <button
            onClick={() => setSize('half')}
            className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
              size === 'half'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-light)] text-[var(--accent-primary)]'
                : 'border-[var(--border-default)] hover:border-[var(--accent-primary)]'
            }`}
          >
            Half width
          </button>
          <button
            onClick={() => setSize('full')}
            className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
              size === 'full'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-light)] text-[var(--accent-primary)]'
                : 'border-[var(--border-default)] hover:border-[var(--accent-primary)]'
            }`}
          >
            Full width
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 py-1.5 text-xs rounded border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
        >
          Cancel
        </button>
        <button
          onClick={() => onPin(section, size)}
          className="flex-1 py-1.5 text-xs rounded bg-[var(--accent-primary)] text-white hover:bg-[#4338CA] flex items-center justify-center gap-1"
        >
          <Pin size={12} /> Pin Chart
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ChartActionBar({
  chartId,
  chartType,
  title,
  data,
  config,
  onCustomize,
  isPinned: initialIsPinned = false,
}: ChartActionBarProps) {
  const [showPinDropdown, setShowPinDropdown] = useState(false);
  const [isPinned, setIsPinned] = useState(initialIsPinned);
  const [isExporting, setIsExporting] = useState(false);

  const handlePin = (section: PinSection, size: PinSize) => {
    pinChart({
      id: chartId,
      chart_type: chartType,
      title,
      data,
      config,
      section,
      size,
      module: 'cx360',
      pinnedBy: 'user',
    });

    setIsPinned(true);
    setShowPinDropdown(false);
  };

  const handleExport = () => {
    setIsExporting(true);

    try {
      // Convert data to CSV
      const dataArray = data as Record<string, unknown>[];
      if (dataArray.length === 0) {
        setIsExporting(false);
        return;
      }

      const headers = Object.keys(dataArray[0]);
      const csvRows = [
        headers.join(','),
        ...dataArray.map(row =>
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return String(value);
          }).join(',')
        ),
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
      <div className="flex items-center gap-2 relative">
        {/* Pin Button */}
        <div className="relative">
          <button
            onClick={() => !isPinned && setShowPinDropdown(true)}
            disabled={isPinned}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isPinned
                ? 'bg-green-100 text-green-700 cursor-default'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)] hover:text-white'
            }`}
          >
            {isPinned ? (
              <>
                <Check size={14} /> Pinned
              </>
            ) : (
              <>
                <Pin size={14} /> Pin to Dashboard
                <ChevronDown size={12} />
              </>
            )}
          </button>

          <PinDropdown
            isOpen={showPinDropdown}
            onClose={() => setShowPinDropdown(false)}
            onPin={handlePin}
          />
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
        >
          <Download size={14} />
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>

        {/* Customize Button */}
        {onCustomize && (
          <button
            onClick={onCustomize}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
          >
            <Pencil size={14} /> Customize
          </button>
        )}
      </div>
    </div>
  );
}
