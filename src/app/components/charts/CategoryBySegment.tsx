'use client';

import Link from 'next/link';
import { Maximize2 } from 'lucide-react';
import { CategoryBySegmentData } from '@/app/lib/types';

const TOP_CATEGORIES = ['Electronics', 'Grocery', 'Fashion', 'Beauty', 'Home & Living'];

function getHeatmapColor(value: number): string {
  if (value >= 60) return '#1a3a5c';
  if (value >= 45) return '#2a5a8c';
  if (value >= 35) return '#3a7abc';
  if (value >= 25) return '#5a9ad4';
  if (value >= 15) return '#9ac8ec';
  if (value >= 5)  return '#cce4f6';
  return '#f0f7fc';
}

interface CategoryBySegmentProps {
  data: CategoryBySegmentData;
}

export default function CategoryBySegment({ data }: CategoryBySegmentProps) {
  if (!data?.matrix) return null;

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Top Categories by Segment
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Penetration % · click expand for full analysis
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/cx360/deep/categories"
            className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            title="Expand chart"
          >
            <Maximize2 size={16} />
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 text-[var(--text-secondary)] font-medium min-w-[90px]">
                Segment
              </th>
              {TOP_CATEGORIES.map(cat => (
                <th key={cat} className="text-center py-2 px-1 text-[var(--text-secondary)] font-medium min-w-[68px]">
                  {cat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.matrix.map(row => (
              <tr key={row.segment} className="border-t border-[var(--border-subtle)]">
                <td className="py-1.5 px-2 text-[var(--text-primary)] font-medium whitespace-nowrap">
                  {row.segment}
                </td>
                {TOP_CATEGORIES.map(cat => {
                  const cell = row.categories?.[cat];
                  const penetration = cell?.penetration ?? 0;
                  return (
                    <td key={cat} className="py-1 px-1 text-center">
                      <span
                        className="inline-block w-full py-1 rounded text-[11px] font-medium"
                        style={{
                          backgroundColor: getHeatmapColor(penetration),
                          color: penetration > 40 ? '#fff' : '#1a3a5c',
                        }}
                      >
                        {penetration > 0 ? `${penetration.toFixed(0)}%` : '—'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
