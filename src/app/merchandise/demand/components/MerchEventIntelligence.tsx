'use client';

import { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { MerchDemandFullPayload, MerchDemandEvent, MerchDemandEventLift } from '@/app/lib/merch-demand-types';
import MerchExpandModal from './MerchExpandModal';

const EVENT_TYPE_COLOR: Record<string, string> = {
  festival:       'var(--chart-amber)',
  season:         'var(--chart-emerald)',
  shopping_event: 'var(--chart-blue)',
  sports:         'var(--chart-indigo)',
  school:         'var(--chart-slate)',
};

const SIGNIFICANCE_BADGE: Record<string, string> = {
  high:   'badge-negative',
  medium: 'badge-warning',
  low:    'badge-neutral',
};

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function formatEventDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface RampChartProps {
  event: MerchDemandEvent;
  lifts: MerchDemandEventLift[];
}

function DemandRampChart({ event, lifts }: RampChartProps) {
  const eventLifts = lifts.filter((l) => l.event_id === event.event_id);

  const rampData = useMemo(() => {
    if (!eventLifts.length) return [];
    const avgLift = eventLifts.reduce((s, l) => s + l.expected_lift_pct, 0) / eventLifts.length;
    return Array.from({ length: 15 }, (_, i) => {
      const day = i - 14;
      const progress = (i + 1) / 14;
      const ramp = day < 0
        ? Math.max(0, Math.round(avgLift * Math.pow(progress, 1.5)))
        : Math.round(avgLift * Math.max(0, 1 - (day / 3)));
      return { day: day === 0 ? 'D' : day < 0 ? `D${day}` : `D+${day}`, lift_pct: ramp };
    });
  }, [eventLifts]);

  if (!rampData.length) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-[var(--text-tertiary)]">
        No lift data for this event
      </div>
    );
  }

  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rampData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
          <YAxis
            tick={{ fontSize: 9, fill: '#94A3B8' }}
            tickFormatter={(v: number) => `${v}%`}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <ReferenceLine x="D" stroke="#94A3B8" strokeDasharray="4 3" label={{ value: 'Event', position: 'top', fontSize: 8, fill: '#94A3B8' }} />
          <Tooltip
            formatter={(v: unknown) => [`${Number(v)}%`, 'Demand lift']}
            contentStyle={{ fontSize: 11 }}
            cursor={{ stroke: '#E2E8F0' }}
          />
          <Line
            dataKey="lift_pct"
            stroke="var(--chart-amber)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface EventCardProps {
  event: MerchDemandEvent;
  anchorDate: string;
  isSelected: boolean;
  onClick: () => void;
}

function EventCard({ event, anchorDate, isSelected, onClick }: EventCardProps) {
  const daysUntil = daysBetween(anchorDate, event.date);
  const color = EVENT_TYPE_COLOR[event.event_type] ?? '#94A3B8';
  const isUpcoming = daysUntil >= 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-light)]'
          : 'border-[var(--border-default)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)]'
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: color }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{event.event_name}</p>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{formatEventDate(event.date)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`badge ${SIGNIFICANCE_BADGE[event.cultural_significance] ?? 'badge-neutral'} text-[9px]`}>
            {event.cultural_significance}
          </span>
          <span className={`text-[10px] font-medium tabular-nums ${isUpcoming ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`}>
            {isUpcoming ? `${daysUntil}d away` : `${Math.abs(daysUntil)}d ago`}
          </span>
        </div>
      </div>
      {isUpcoming && event.typical_prep_days > 0 && (
        <div className="mt-1.5 ml-4">
          <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1">
            <div
              className="h-1 rounded-full transition-all"
              style={{
                backgroundColor: color,
                width: `${Math.min(100, Math.max(5, ((event.typical_prep_days - daysUntil) / event.typical_prep_days) * 100))}%`,
                opacity: 0.7,
              }}
            />
          </div>
          <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5">
            Prep window: {event.typical_prep_days}d
          </p>
        </div>
      )}
    </button>
  );
}

interface Props {
  core: MerchDemandFullPayload;
}

export default function MerchEventIntelligence({ core }: Props) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const anchorDate = core.data_window.forecast_start;

  const sortedEvents = useMemo(() => {
    return [...core.events].sort((a, b) => {
      const da = Math.abs(daysBetween(anchorDate, a.date));
      const db = Math.abs(daysBetween(anchorDate, b.date));
      return da - db;
    });
  }, [core.events, anchorDate]);

  const selectedEvent = selectedEventId
    ? core.events.find((e) => e.event_id === selectedEventId) ?? null
    : sortedEvents[0] ?? null;

  const eventLiftsForSelected = useMemo(
    () => selectedEvent ? core.event_lifts.filter((l) => l.event_id === selectedEvent.event_id) : [],
    [selectedEvent, core.event_lifts],
  );

  const content = (
    <div className="grid grid-cols-5 divide-x divide-[var(--border-default)]">
      {/* Left: event list */}
      <div className="col-span-2 p-5 space-y-2 overflow-y-auto" style={{ maxHeight: 420 }}>
        <p className="text-xs font-medium text-[var(--text-primary)] mb-3">
          Events · {sortedEvents.length} total
        </p>
        {sortedEvents.map((ev) => (
          <EventCard
            key={ev.event_id}
            event={ev}
            anchorDate={anchorDate}
            isSelected={selectedEvent?.event_id === ev.event_id}
            onClick={() => setSelectedEventId(ev.event_id)}
          />
        ))}
      </div>

      {/* Right: deep-dive */}
      <div className="col-span-3 p-5">
        {selectedEvent ? (
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: EVENT_TYPE_COLOR[selectedEvent.event_type] ?? '#94A3B8' }}
                />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{selectedEvent.event_name}</h3>
                <span className={`badge ${SIGNIFICANCE_BADGE[selectedEvent.cultural_significance] ?? 'badge-neutral'} text-[10px]`}>
                  {selectedEvent.cultural_significance} significance
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {formatEventDate(selectedEvent.window_start)} – {formatEventDate(selectedEvent.window_end)}
                &nbsp;·&nbsp;Prep: {selectedEvent.typical_prep_days}d
              </p>
            </div>

            {/* Demand ramp chart */}
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)] mb-2">Demand Ramp (% lift vs baseline)</p>
              <DemandRampChart event={selectedEvent} lifts={core.event_lifts} />
            </div>

            {/* Category lifts */}
            {eventLiftsForSelected.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--text-primary)] mb-2">Expected Lift by Category</p>
                <div className="space-y-1.5">
                  {eventLiftsForSelected.slice(0, 6).map((l) => (
                    <div key={l.category} className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)] w-36 truncate flex-shrink-0">{l.category}</span>
                      <div className="flex-1 bg-[var(--bg-secondary)] rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, (l.expected_lift_pct / 200) * 100)}%`,
                            backgroundColor: EVENT_TYPE_COLOR[selectedEvent.event_type] ?? '#94A3B8',
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)] w-12 text-right flex-shrink-0">
                        +{l.expected_lift_pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-[var(--text-tertiary)]">
            Select an event to view details
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <section className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Event Intelligence</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Upcoming events · demand ramp forecasts · category lifts
            </p>
          </div>
          <button
            onClick={() => setExpanded(true)}
            className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
            title="Expand"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8V3h5M13 8v5H8M10 3h3v3M6 13H3v-3" />
            </svg>
          </button>
        </div>
        {content}
      </section>

      <MerchExpandModal
        isOpen={expanded}
        onClose={() => setExpanded(false)}
        title="Event Intelligence"
        subtitle={`${core.events.length} events · demand ramp forecasts`}
      >
        {content}
      </MerchExpandModal>
    </>
  );
}
