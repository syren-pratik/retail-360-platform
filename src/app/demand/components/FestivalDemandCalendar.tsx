'use client';

import { useMemo } from 'react';
import { Calendar, TrendingUp, MapPin } from 'lucide-react';
import { FestivalData, PastFestivalImpact } from '@/app/lib/demand-types';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface FestivalDemandCalendarProps {
  upcoming: FestivalData[];
  pastImpact: PastFestivalImpact[];
}

// Color based on expected lift
const getLiftColor = (lift: number): string => {
  if (lift >= 60) return 'bg-red-100 text-red-700 border-red-200';
  if (lift >= 40) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (lift >= 20) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
};

const getLiftBadgeColor = (lift: number): string => {
  if (lift >= 60) return 'bg-red-500';
  if (lift >= 40) return 'bg-orange-500';
  if (lift >= 20) return 'bg-yellow-500';
  return 'bg-green-500';
};

export default function FestivalDemandCalendar({ upcoming, pastImpact }: FestivalDemandCalendarProps) {
  const safeUpcoming = upcoming ?? [];
  const safePastImpact = pastImpact ?? [];

  // Sort upcoming festivals by date
  const sortedUpcoming = useMemo(() =>
    [...(safeUpcoming ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [safeUpcoming]
  );

  // Get festivals happening in next 30 days
  const next30Days = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return (sortedUpcoming ?? []).filter(f => {
      const festDate = new Date(f.date);
      return festDate >= now && festDate <= in30Days;
    });
  }, [sortedUpcoming]);

  // Calculate calendar days for current month
  const calendarData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();

    const days: { date: Date; festival?: FestivalData; isCurrentMonth: boolean }[] = [];

    // Add padding days from previous month
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Add current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const festival = sortedUpcoming.find(f => {
        const festDate = new Date(f.date);
        return festDate.getDate() === d && festDate.getMonth() === month && festDate.getFullYear() === year;
      });
      days.push({ date, festival, isCurrentMonth: true });
    }

    // Add padding days for next month
    const remainingDays = 42 - (days ?? []).length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return { days, monthName: firstDay.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
  }, [sortedUpcoming]);

  // Guard against null/undefined data - after all hooks
  if (!upcoming || !Array.isArray(upcoming) || upcoming.length === 0) {
    return <NoDataFallback title="No festival data" message="Festival calendar data is not available." />;
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Festival & Event Calendar
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Upcoming festivals and expected demand impact
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            High (&gt;60%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            Medium (40-60%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            Low (20-40%)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Calendar Grid */}
        <div>
          <div className="text-center font-medium text-sm mb-3 text-[var(--text-primary)]">
            {calendarData.monthName}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs text-[var(--text-tertiary)] py-1">
                {day}
              </div>
            ))}
            {calendarData.days.map((day, i) => {
              const isToday = day.date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={i}
                  className={`
                    relative aspect-square flex items-center justify-center text-xs rounded-md
                    ${!day.isCurrentMonth ? 'text-[var(--text-tertiary)] bg-[var(--bg-secondary)]' : ''}
                    ${isToday ? 'ring-2 ring-[var(--accent-primary)]' : ''}
                    ${day.festival ? getLiftColor(day.festival.expected_demand_lift) + ' font-medium cursor-pointer' : ''}
                  `}
                  title={day.festival ? `${day.festival.festival}: +${day.festival.expected_demand_lift}%` : ''}
                >
                  {day.date.getDate()}
                  {day.festival && (
                    <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${getLiftBadgeColor(day.festival.expected_demand_lift)}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Festivals Table */}
        <div>
          <div className="text-sm font-medium text-[var(--text-primary)] mb-3">
            Upcoming Events ({(next30Days ?? []).length} in next 30 days)
          </div>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {(sortedUpcoming ?? []).slice(0, 6).map((festival, i) => (
              <div
                key={i}
                className="p-3 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm text-[var(--text-primary)]">
                      {festival.festival}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(festival.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={10} />
                        {festival.regions_affected.join(', ')}
                      </span>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getLiftColor(festival.expected_demand_lift)}`}>
                    +{festival.expected_demand_lift}%
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {(festival.categories_affected ?? []).slice(0, 3).map((cat, j) => (
                    <span key={j} className="px-1.5 py-0.5 bg-white rounded text-xs text-[var(--text-tertiary)]">
                      {cat}
                    </span>
                  ))}
                  {festival.categories_affected.length > 3 && (
                    <span className="text-xs text-[var(--text-tertiary)]">
                      +{festival.categories_affected.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Past Festival Impact */}
      {safePastImpact.length > 0 && (
        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
          <div className="text-sm font-medium text-[var(--text-primary)] mb-3">
            Recent Festival Forecast Accuracy
          </div>
          <div className="grid grid-cols-5 gap-3">
            {(safePastImpact ?? []).slice(0, 5).map((impact, i) => (
              <div
                key={i}
                className="p-2 bg-[var(--bg-secondary)] rounded-lg text-center"
              >
                <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {(impact.festival ?? '').replace(' 2024', '')}
                </div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <TrendingUp size={12} className={impact.accuracy === 'good' ? 'text-green-500' : 'text-orange-500'} />
                  <span className="text-xs">
                    {impact.actual_lift}% / {impact.forecast_lift}%
                  </span>
                </div>
                <div className={`text-xs mt-1 ${
                  impact.accuracy === 'good' ? 'text-green-600' :
                  impact.accuracy === 'under_forecast' ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {impact.accuracy === 'good' ? 'Accurate' :
                   impact.accuracy === 'under_forecast' ? 'Under-forecast' : 'Over-forecast'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
