'use client';

import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';

interface Props {
  title: string;
  subtitle: string;
  backLabel?: string;
  backHref?: string;
  onExportCSV?: () => void;
}

export default function DeepDiveHeader({
  title,
  subtitle,
  backLabel = '← Back to Demand',
  backHref = '/merchandise/demand',
  onExportCSV,
}: Props) {
  return (
    <div className="sticky top-0 z-30 bg-[var(--bg-primary)] border-b border-[var(--border-default)]">
      <div className="flex items-center justify-between px-8 py-3">
        {/* Left: back + title */}
        <div className="flex items-center gap-4">
          <Link
            href={backHref}
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </Link>
          <div className="h-5 w-px bg-[var(--border-default)]" />
          <div>
            <span className="text-base font-semibold text-[var(--text-primary)]">{title}</span>
            <span className="text-sm text-[var(--text-secondary)] ml-2">{subtitle}</span>
          </div>
        </div>

        {/* Right: export + mock badge */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Mock Data
          </span>
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[var(--border-default)] rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
