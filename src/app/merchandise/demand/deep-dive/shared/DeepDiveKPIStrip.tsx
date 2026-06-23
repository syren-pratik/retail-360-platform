'use client';

interface KPITile {
  label: string;
  value: string;
  subtext?: string;
  trend?: { value: number; label: string; invertColors?: boolean };
  color?: 'default' | 'positive' | 'negative' | 'warning';
}

interface Props {
  tiles: KPITile[];
}

const VALUE_COLOR: Record<NonNullable<KPITile['color']>, string> = {
  default:  'text-[var(--text-primary)]',
  positive: 'text-emerald-600',
  negative: 'text-rose-600',
  warning:  'text-amber-600',
};

export default function DeepDiveKPIStrip({ tiles }: Props) {
  return (
    <div className="flex flex-row gap-4 px-8 py-4 border-b border-[var(--border-default)] bg-[var(--bg-primary)]">
      {tiles.map((tile) => {
        const trendPositive = tile.trend
          ? tile.trend.invertColors
            ? tile.trend.value < 0
            : tile.trend.value > 0
          : null;
        const trendColor = trendPositive === true
          ? 'text-emerald-600'
          : trendPositive === false
            ? 'text-rose-600'
            : 'text-[var(--text-tertiary)]';

        return (
          <div
            key={tile.label}
            className="bg-[var(--bg-secondary)] rounded-lg px-4 py-3 flex-1 min-w-0"
          >
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-0.5">
              {tile.label}
            </p>
            <p className={`text-lg font-semibold tabular-nums truncate ${VALUE_COLOR[tile.color ?? 'default']}`}>
              {tile.value}
            </p>
            {tile.subtext && (
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5 truncate">{tile.subtext}</p>
            )}
            {tile.trend && (
              <p className={`text-[10px] tabular-nums mt-0.5 ${trendColor}`}>
                {tile.trend.value > 0 ? '+' : ''}{tile.trend.value.toFixed(1)}% {tile.trend.label}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
