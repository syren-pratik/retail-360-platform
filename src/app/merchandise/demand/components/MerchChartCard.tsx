'use client';

import { memo, ReactNode } from 'react';
import { Maximize2 } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  height?: number;
  onExpand?: () => void;
  className?: string;
  headerExtra?: ReactNode;
}

function MerchChartCardInner({
  id,
  title,
  subtitle,
  children,
  height = 280,
  onExpand,
  className = '',
  headerExtra,
}: Props) {
  return (
    <section id={`section-${id}`} className={`card ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {headerExtra}
          {onExpand && (
            <button
              onClick={onExpand}
              className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
              title="Expand chart"
            >
              <Maximize2 size={16} />
            </button>
          )}
        </div>
      </div>
      <div id={`chart-${id}`} style={{ height: `${height}px` }}>
        {children}
      </div>
    </section>
  );
}

export default memo(MerchChartCardInner);
