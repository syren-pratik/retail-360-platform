'use client';

import { useMemo, useState } from 'react';
import type { MerchDemandFullPayload, MerchDemandEvent } from '@/app/lib/merch-demand-types';
import DeepDiveInsights from '../../shared/DeepDiveInsights';

const ANCHOR = '2026-05-17';

const MONTHS = [
  { year: 2026, month: 4 }, // May (0-indexed)
  { year: 2026, month: 5 }, // June
  { year: 2026, month: 6 }, // July
];

const EVENT_SIGNIFICANCE_DOT: Record<string, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-400',
  low: 'bg-blue-400',
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  festival: 'Festival',
  season: 'Season',
  shopping_event: 'Shopping Event',
  sports: 'Sports',
  school: 'School',
};

const EVENT_LIFTS: Record<string, { category: string; mult: number }[]> = {
  'Eid al-Adha': [
    { category: 'Dal & Pulses', mult: 2.85 },
    { category: 'Edible Oil', mult: 2.31 },
    { category: 'Rice', mult: 1.45 },
  ],
  'School Summer Holiday': [
    { category: 'Ice Cream', mult: 1.65 },
    { category: 'Soft Drinks', mult: 1.45 },
  ],
  'Monsoon Onset': [
    { category: 'Tea', mult: 1.22 },
    { category: 'Snacks', mult: 1.18 },
    { category: 'Beverages', mult: 0.78 },
  ],
  'School Reopening': [{ category: 'Biscuits', mult: 1.38 }],
};

const INSIGHTS = [
  {
    headline: 'Eid al-Adha in 20 days — 34 SKUs not ramped',
    detail:
      'Preparation window is closing. Dal, Pulses, and Edible Oil are the highest-risk categories.',
    severity: 'warning' as const,
  },
  {
    headline: 'School Reopening: Biscuits peak 12 days before',
    detail:
      'Historical data shows Biscuits & Cookies demand peaks 12 days before school year starts.',
    severity: 'neutral' as const,
  },
  {
    headline: 'Monsoon onset will suppress Beverages',
    detail:
      'Beverages demand drops ~22% during monsoon onset. Adjust forecasts from mid-June.',
    severity: 'warning' as const,
  },
  {
    headline: '4 events overlap in June — coordinate procurement',
    detail:
      'June has the highest event density. Procurement and logistics need careful coordination.',
    severity: 'negative' as const,
  },
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7; // 0=Mon
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysUntilFromAnchor(target: string): number {
  return Math.round(
    (new Date(target + 'T00:00:00').getTime() - new Date(ANCHOR + 'T00:00:00').getTime()) /
      86400000,
  );
}

interface MonthCardProps {
  year: number;
  month: number;
  events: MerchDemandEvent[];
  selectedDate: string | null;
  onDayClick: (dateStr: string, events: MerchDemandEvent[]) => void;
}

function MonthCard({ year, month, events, selectedDate, onDayClick }: MonthCardProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = new Date(year, month, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const eventsByDate = new Map<string, MerchDemandEvent[]>();
  events.forEach((ev) => {
    const key = ev.date;
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key)!.push(ev);
  });

  return (
    <div className="card">
      <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">{monthName}</p>
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div
            key={i}
            className="text-center text-[9px] text-[var(--text-tertiary)] font-medium py-1"
          >
            {d}
          </div>
        ))}
      </div>
      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells for first day offset */}
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = toDateStr(year, month, day);
          const dayEvents = eventsByDate.get(dateStr) ?? [];
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === ANCHOR;
          return (
            <button
              key={day}
              type="button"
              onClick={() => dayEvents.length > 0 && onDayClick(dateStr, dayEvents)}
              className={`relative aspect-square flex flex-col items-center justify-start pt-1 rounded text-[10px] transition-colors ${
                isSelected
                  ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)] font-semibold'
                  : isToday
                    ? 'bg-blue-50 font-semibold text-blue-700'
                    : dayEvents.length > 0
                      ? 'hover:bg-[var(--bg-secondary)] cursor-pointer'
                      : 'text-[var(--text-tertiary)] cursor-default'
              }`}
            >
              <span>{day}</span>
              {dayEvents.length > 0 && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${EVENT_SIGNIFICANCE_DOT[dayEvents[0].cultural_significance]}`}
                />
              )}
              {dayEvents.length > 1 && (
                <span className="text-[8px] text-[var(--text-tertiary)]">
                  +{dayEvents.length - 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  core: MerchDemandFullPayload;
}

export default function EventCalendarTab({ core }: Props) {
  const defaultEvent = useMemo(() => {
    const eid = core.events.find((e) => e.event_name === 'Eid al-Adha');
    if (eid) return eid;
    const upcoming = core.events
      .filter((e) => daysUntilFromAnchor(e.date) >= 0)
      .sort((a, b) => daysUntilFromAnchor(a.date) - daysUntilFromAnchor(b.date));
    return upcoming[0] ?? null;
  }, [core.events]);

  const [selectedDate, setSelectedDate] = useState<string | null>(
    defaultEvent?.date ?? null,
  );
  const [selectedEvents, setSelectedEvents] = useState<MerchDemandEvent[]>(
    defaultEvent ? [defaultEvent] : [],
  );

  function handleDayClick(dateStr: string, evs: MerchDemandEvent[]) {
    setSelectedDate(dateStr);
    setSelectedEvents(evs);
  }

  const selectedEvent = selectedEvents[0] ?? null;
  const daysAway = selectedEvent ? daysUntilFromAnchor(selectedEvent.date) : null;

  const lifts = selectedEvent ? (EVENT_LIFTS[selectedEvent.event_name] ?? []) : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        {/* 3 calendar cards */}
        {MONTHS.map(({ year, month }) => (
          <MonthCard
            key={`${year}-${month}`}
            year={year}
            month={month}
            events={core.events}
            selectedDate={selectedDate}
            onDayClick={handleDayClick}
          />
        ))}

        {/* Detail panel */}
        <div className="card">
          {selectedEvent ? (
            <div className="space-y-4">
              <div>
                <p className="text-xl font-semibold text-[var(--text-primary)]">
                  {selectedEvent.event_name}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {new Date(selectedEvent.date + 'T00:00:00').toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {daysAway !== null && (
                    <span className="ml-2 font-medium">
                      {daysAway === 0
                        ? '(today)'
                        : daysAway > 0
                          ? `(${daysAway} days away)`
                          : `(${Math.abs(daysAway)} days ago)`}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <span
                  className={`badge ${
                    selectedEvent.cultural_significance === 'high'
                      ? 'badge-negative'
                      : selectedEvent.cultural_significance === 'medium'
                        ? 'badge-warning'
                        : 'badge-neutral'
                  }`}
                >
                  {selectedEvent.cultural_significance} significance
                </span>
                <span className="badge badge-neutral">
                  {EVENT_TYPE_LABEL[selectedEvent.event_type] ?? selectedEvent.event_type}
                </span>
              </div>

              {/* Ramp readiness */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">Ramp readiness</span>
                  <span className="font-semibold text-amber-600">72%</span>
                </div>
                <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2">
                  <div
                    className="bg-amber-400 h-2 rounded-full"
                    style={{ width: '72%' }}
                  />
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                  Prep window: {selectedEvent.typical_prep_days} days recommended
                </p>
              </div>

              {/* SKUs ramped */}
              <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                <p className="text-xs text-[var(--text-secondary)]">SKUs ramped</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">66 of 100</p>
                <p className="text-[10px] text-rose-600 mt-0.5">34 SKUs need action</p>
              </div>

              {/* Affected regions */}
              {selectedEvent.regions_affected.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">Regions affected</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedEvent.regions_affected.map((r) => (
                      <span key={r} className="badge badge-neutral text-[10px]">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Category lifts */}
              {lifts.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-2">
                    Expected category lifts
                  </p>
                  <div className="space-y-1.5">
                    {lifts.map((lift) => (
                      <div key={lift.category} className="flex justify-between items-center">
                        <span className="text-xs text-[var(--text-primary)]">{lift.category}</span>
                        <span
                          className={`text-xs font-semibold ${lift.mult >= 1.5 ? 'text-rose-600' : lift.mult >= 1.1 ? 'text-amber-600' : 'text-slate-500'}`}
                        >
                          {lift.mult.toFixed(2)}×
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended action */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-800">Recommended action</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Order inventory now — prep window closing
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <p className="text-sm text-[var(--text-tertiary)] text-center">
                Click a date with events to see details
              </p>
            </div>
          )}
        </div>
      </div>

      <DeepDiveInsights insights={INSIGHTS} />
    </div>
  );
}
