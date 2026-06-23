'use client';

type Severity = 'positive' | 'warning' | 'negative' | 'neutral';

interface Insight {
  headline: string;
  detail: string;
  severity: Severity;
}

interface Props {
  insights: Insight[];
}

const BORDER_COLOR: Record<Severity, string> = {
  positive: 'border-l-emerald-500',
  warning:  'border-l-amber-500',
  negative: 'border-l-rose-500',
  neutral:  'border-l-slate-300',
};

const HEADLINE_COLOR: Record<Severity, string> = {
  positive: 'text-emerald-700',
  warning:  'text-amber-700',
  negative: 'text-rose-700',
  neutral:  'text-[var(--text-primary)]',
};

export default function DeepDiveInsights({ insights }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3 mt-2">
      {insights.map((ins, i) => (
        <div
          key={i}
          className={`bg-[var(--bg-secondary)] rounded-lg p-4 border-l-[3px] ${BORDER_COLOR[ins.severity]}`}
        >
          <p className={`text-sm font-medium leading-snug ${HEADLINE_COLOR[ins.severity]}`}>
            {ins.headline}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            {ins.detail}
          </p>
        </div>
      ))}
    </div>
  );
}
