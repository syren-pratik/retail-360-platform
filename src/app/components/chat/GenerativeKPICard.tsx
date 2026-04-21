'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface GenerativeKPICardProps {
  label: string;
  value: string;
  change?: string;
  direction?: 'up' | 'down';
}

export default function GenerativeKPICard({
  label,
  value,
  change,
  direction,
}: GenerativeKPICardProps) {
  return (
    <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-lg max-w-[200px]">
      <p className="text-xs text-[var(--text-secondary)] mb-1">{label}</p>
      <p className="text-xl font-semibold text-[var(--text-primary)]">{value}</p>
      {change && (
        <div className="flex items-center gap-1 mt-1">
          {direction === 'up' ? (
            <TrendingUp size={12} className="text-[var(--positive)]" />
          ) : direction === 'down' ? (
            <TrendingDown size={12} className="text-[var(--negative)]" />
          ) : null}
          <span
            className={`text-xs font-medium ${
              direction === 'up'
                ? 'text-[var(--positive)]'
                : direction === 'down'
                ? 'text-[var(--negative)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            {change}
          </span>
        </div>
      )}
    </div>
  );
}
