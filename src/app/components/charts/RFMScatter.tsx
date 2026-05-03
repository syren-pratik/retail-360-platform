'use client';

import { Maximize2 } from 'lucide-react';
import { RFMCustomer, RFMDetailData } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import RFMExpandModal from './RFMExpandModal';

interface RFMScatterProps {
  data: RFMCustomer[];
  rfmDetail: RFMDetailData;
}

const CHART_ID = 'rfm_scatter';

function fmtInr(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(0)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function RFMScatter({ data, rfmDetail }: RFMScatterProps) {
  const { expandedChart, setExpandedChart } = useDashboard();

  if (expandedChart === CHART_ID) {
    return (
      <>
        <RFMNineBoxCard rfmDetail={rfmDetail} onExpand={() => setExpandedChart(CHART_ID)} />
        <RFMExpandModal data={rfmDetail} rfmSample={data} onClose={() => setExpandedChart(null)} />
      </>
    );
  }

  return <RFMNineBoxCard rfmDetail={rfmDetail} onExpand={() => setExpandedChart(CHART_ID)} />;
}

interface RFMNineBoxCardProps {
  rfmDetail: RFMDetailData;
  onExpand: () => void;
}

function RFMNineBoxCard({ rfmDetail, onExpand }: RFMNineBoxCardProps) {
  const nine = rfmDetail.nine_box ?? [];

  // Build 3x3 grid: rows = recency (top=recent), cols = frequency (left=low)
  const rBands = ['Recent (1-3)', 'Mid (2)', 'Lapsed (1)'];
  const fBands = ['Low (1)', 'Medium (2)', 'Frequent (3)'];
  const boxMap: Record<string, typeof nine[0]> = {};
  nine.forEach((cell) => { boxMap[`${cell.r_band}__${cell.f_band}`] = cell; });

  const totalCustomers = nine.reduce((s, c) => s + c.customer_count, 0);

  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">RFM 9-Box Analysis</h3>
          <p className="text-sm text-[var(--text-secondary)]">Recency × Frequency · {(totalCustomers / 1000).toFixed(0)}K customers</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onExpand} className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors" title="Expand">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* 3×3 grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {rBands.map((rb) =>
          fBands.map((fb) => {
            const cell = boxMap[`${rb}__${fb}`];
            if (!cell) return <div key={`${rb}__${fb}`} className="h-[68px] rounded-md bg-gray-50 border border-[var(--border-subtle)]" />;
            const pct = totalCustomers > 0 ? ((cell.customer_count / totalCustomers) * 100).toFixed(0) : '0';
            return (
              <div
                key={`${rb}__${fb}`}
                className="h-[68px] rounded-md p-2 flex flex-col justify-between cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: `${cell.color}1a`, border: `1.5px solid ${cell.color}55` }}
                title={`${cell.label}: ${cell.action}`}
              >
                <p className="text-xs font-semibold leading-tight" style={{ color: cell.color }}>{cell.label}</p>
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{(cell.customer_count / 1000).toFixed(1)}K</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{pct}% · {fmtInr(cell.revenue)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Axis labels */}
      <div className="mt-2 flex justify-between text-xs text-[var(--text-tertiary)]">
        <span>← Low Frequency</span>
        <span>High Frequency →</span>
      </div>
    </div>
  );
}
