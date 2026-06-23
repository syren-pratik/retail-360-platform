'use client';

import { useState } from 'react';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { formatLakhsCrores } from '@/app/lib/merch-format';

interface Props { core: PriceIntelCore }

interface CampaignBlock {
  weekIndex: number;
  name: string;
  mechanic: string;
  status: string;
  roi: number;
  budget: number;
}

interface CalendarCell {
  weekIndex: number;
  weekLabel: string;
  monthLabel?: string;
  campaign: CampaignBlock | null;
  event: string | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildCalendar(core: PriceIntelCore): CalendarCell[] {
  const anchorMonth = 4; // May = 4 (0-indexed)
  const anchorWeek = 19; // Week of May 17

  const EVENTS: Record<number, string> = { 22: 'Eid al-Adha', 26: 'Raksha Bandhan', 30: 'Independence Day', 38: 'Navratri', 42: 'Diwali', 48: 'Christmas', 52: 'New Year' };

  return Array.from({ length: 52 }, (_, i) => {
    const weekNum = anchorWeek + i;
    const monthIdx = ((anchorMonth + Math.floor(i / 4.3)) % 12);
    const showMonth = i % Math.round(4.3) === 0;
    const camp = core.campaigns[i % core.campaigns.length];

    return {
      weekIndex: i,
      weekLabel: `W${i + 1}`,
      monthLabel: showMonth ? MONTHS[monthIdx] : undefined,
      campaign: i < 12 && i % 4 !== 0 ? null : i < core.campaigns.length ? {
        weekIndex: i,
        name: camp?.campaign_name ?? '',
        mechanic: camp?.mechanic ?? '',
        status: camp?.status ?? 'ended',
        roi: camp?.roi ?? 0,
        budget: camp?.budget_inr ?? 0,
      } : null,
      event: EVENTS[weekNum] ?? null,
    };
  });
}

const STATUS_COLORS: Record<string, string> = {
  live: '#D1FAE5',
  ended: '#F3F4F6',
  paused: '#FEF3C7',
  review: '#DBEAFE',
};

export default function CalendarTab({ core }: Props) {
  const [selectedCell, setSelectedCell] = useState<CalendarCell | null>(null);
  const calendar = buildCalendar(core);

  return (
    <div className="px-8 py-6">
      <div className="flex gap-6">
        {/* Calendar */}
        <div className="flex-1 card p-5 overflow-x-auto">
          <div className="flex items-center gap-4 mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">52-Week Campaign Calendar</h3>
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
              <span className="inline-block w-3 h-3 rounded-sm bg-[#D1FAE5]" /> Live
              <span className="inline-block w-3 h-3 rounded-sm bg-[#FEF3C7] ml-1" /> Paused
              <span className="inline-block w-3 h-3 rounded-sm bg-[#F3F4F6] ml-1" /> Ended
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-200 ml-1" /> Festival
            </div>
          </div>

          <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(13, 1fr)', minWidth: 900 }}>
            {calendar.map((cell) => {
              const bg = cell.campaign ? STATUS_COLORS[cell.campaign.status] ?? '#F3F4F6' : cell.event ? '#FEF9C3' : 'var(--bg-secondary)';
              return (
                <div
                  key={cell.weekIndex}
                  className="rounded cursor-pointer hover:opacity-80 transition-opacity relative"
                  style={{ background: bg, minHeight: 48, padding: '4px 6px' }}
                  onClick={() => setSelectedCell(selectedCell?.weekIndex === cell.weekIndex ? null : cell)}
                >
                  {cell.monthLabel && (
                    <p className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase absolute top-1 left-1">{cell.monthLabel}</p>
                  )}
                  <p className="text-[9px] text-[var(--text-tertiary)] mt-3">{cell.weekLabel}</p>
                  {cell.event && <p className="text-[8px] font-medium text-amber-700 leading-tight">{cell.event}</p>}
                  {cell.campaign && (
                    <p className="text-[8px] font-medium leading-tight truncate" style={{ color: '#374151' }}>
                      {cell.campaign.name.split(' ')[0]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel: campaign detail or creation */}
        {selectedCell && (
          <div className="w-72 shrink-0 card p-5">
            {selectedCell.campaign ? (
              <>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{selectedCell.campaign.name}</h4>
                <p className="text-[10px] text-[var(--text-tertiary)] mb-4">{selectedCell.weekLabel}</p>
                <div className="space-y-2 text-xs">
                  {[
                    { label: 'Mechanic', value: selectedCell.campaign.mechanic.replace(/_/g, ' '), color: '' },
                    { label: 'Status', value: selectedCell.campaign.status, color: '' },
                    { label: 'ROI', value: `${selectedCell.campaign.roi.toFixed(2)}×`, color: selectedCell.campaign.roi >= 3 ? 'text-emerald-600' : 'text-amber-600' },
                    { label: 'Budget', value: formatLakhsCrores(selectedCell.campaign.budget), color: '' },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between border-b border-[var(--border-default)] pb-2">
                      <span className="text-[var(--text-tertiary)]">{row.label}</span>
                      <span className={`font-medium capitalize ${row.color || 'text-[var(--text-primary)]'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Create Campaign</h4>
                <p className="text-[10px] text-[var(--text-tertiary)] mb-4">{selectedCell.weekLabel}{selectedCell.event ? ` · ${selectedCell.event}` : ''}</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Suggested mechanic</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{selectedCell.event ? 'Bundle' : 'Cashback'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Recommended budget</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{formatLakhsCrores(selectedCell.event ? 1800000 : 1200000)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Projected ROI</p>
                    <p className="text-sm font-semibold text-emerald-600">{selectedCell.event ? '3.4×' : '2.9×'}</p>
                  </div>
                  <button
                    onClick={() => console.log('Create campaign for', selectedCell.weekLabel)}
                    className="w-full mt-2 py-2 text-sm font-medium rounded-md bg-[var(--accent-primary)] text-white hover:opacity-90"
                  >
                    Create campaign
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
