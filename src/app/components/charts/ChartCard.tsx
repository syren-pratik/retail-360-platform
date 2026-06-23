'use client';

import { ReactNode, memo, useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Maximize2, Download, Sparkles, Loader2, X } from 'lucide-react';
import { useDashboard } from '@/app/context/DashboardContext';
import { exportCSV } from '@/app/lib/export-utils';
import { ChartErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { ChartEmptyState } from '@/app/components/ui/EmptyState';

interface WidgetAnalysis {
  insight: string;
  metrics: Array<{ label: string; value: string; color: 'positive' | 'negative' | 'warning' | 'neutral' }>;
  follow_ups: Array<{ label: string; prompt: string }>;
}

const METRIC_COLORS: Record<string, string> = {
  positive: 'bg-emerald-50 text-emerald-700',
  negative: 'bg-rose-50 text-rose-700',
  warning: 'bg-amber-50 text-amber-700',
  neutral: 'bg-slate-100 text-slate-600',
};

function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-[var(--text-primary)]">{part.slice(2, -2)}</strong>
    ) : (
      part
    )
  );
}

export function AIInsightButton({
  id,
  title,
  data,
}: {
  id: string;
  title: string;
  data: Record<string, unknown>[];
}) {
  const pathname = usePathname();
  const { triggerChatMessage } = useDashboard();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<WidgetAnalysis | null>(null);
  const [error, setError] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function handleOpen() {
    setOpen(true);
    if (analysis || loading) return;
    setLoading(true);
    setError(false);
    try {
      const moduleName = pathname.startsWith('/price-intel') ? 'price-intel'
        : pathname.startsWith('/inventory') ? 'inventory'
        : pathname.startsWith('/merchandise') ? 'demand'
        : 'cx360';
      const res = await fetch('/api/widget-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartId: id, chartTitle: title, chartType: 'chart', data: data.slice(0, 50), module: moduleName }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setAnalysis(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className={`p-1.5 rounded-md transition-colors ${
          open
            ? 'text-violet-600 bg-violet-50'
            : 'text-[var(--text-tertiary)] hover:text-violet-600 hover:bg-violet-50'
        }`}
        title="AI insight"
      >
        <Sparkles size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 bg-white border border-[var(--border-default)] rounded-xl shadow-xl z-30 p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-violet-600">
              <Sparkles size={13} />
              <span className="text-xs font-semibold">AI Insight</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <X size={14} />
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 py-4 text-xs text-[var(--text-secondary)]">
              <Loader2 size={14} className="animate-spin" />
              Analyzing chart data…
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600 py-2">Could not analyze this chart. Try again.</p>
          )}

          {analysis && (
            <>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                {renderBold(analysis.insight)}
              </p>
              {analysis.metrics?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {analysis.metrics.map((m, i) => (
                    <span key={i} className={`px-2 py-1 rounded-md text-[10px] font-medium ${METRIC_COLORS[m.color] ?? METRIC_COLORS.neutral}`}>
                      {m.label}: <span className="font-semibold">{m.value}</span>
                    </span>
                  ))}
                </div>
              )}
              {analysis.follow_ups?.length > 0 && (
                <div className="space-y-1.5 border-t border-[var(--border-default)] pt-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-medium">Ask the assistant</p>
                  {analysis.follow_ups.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        triggerChatMessage(f.prompt);
                        setOpen(false);
                      }}
                      className="block w-full text-left text-xs px-2.5 py-1.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-violet-50 hover:text-violet-700 transition-colors"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface ChartCardProps {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  height?: number;
  data?: Record<string, unknown>[];
  exportFilename?: string;
  showExpand?: boolean;
  showExport?: boolean;
  isEmpty?: boolean;
  onResetFilters?: () => void;
  className?: string;
}

/**
 * Reusable chart card with header, export, expand, error boundary, and empty state
 */
function ChartCardInner({
  id,
  title,
  subtitle,
  children,
  height = 280,
  data,
  exportFilename,
  showExpand = true,
  showExport = true,
  isEmpty = false,
  onResetFilters,
  className = '',
}: ChartCardProps) {
  const { setExpandedChart } = useDashboard();

  const handleExpand = () => {
    setExpandedChart(id);
  };

  const handleExport = () => {
    if (data && data.length > 0) {
      exportCSV(data, exportFilename || id);
    }
  };

  return (
    <section
      id={`section-${id}`}
      className={`card animate-fade-in ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {data && data.length > 0 && (
            <AIInsightButton id={id} title={title} data={data} />
          )}
          {showExport && data && data.length > 0 && (
            <button
              onClick={handleExport}
              className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              title="Export as CSV"
            >
              <Download size={16} />
            </button>
          )}
          {showExpand && (
            <button
              onClick={handleExpand}
              className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              title="Expand chart"
            >
              <Maximize2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Chart content */}
      <div id={`chart-${id}`} style={{ height: `${height}px` }}>
        <ChartErrorBoundary chartName={title}>
          {isEmpty ? (
            <ChartEmptyState
              title="No data available"
              message="Adjust filters to see chart data"
              onReset={onResetFilters}
            />
          ) : (
            children
          )}
        </ChartErrorBoundary>
      </div>
    </section>
  );
}

// Memoize to prevent unnecessary re-renders
const ChartCard = memo(ChartCardInner);
export default ChartCard;
