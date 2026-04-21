'use client';

interface GenerativeDataTableProps {
  data: Record<string, unknown>[];
  columns: string[];
  title: string;
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    // Check if it's a percentage (between 0 and 1 or labeled as rate/prob)
    if (value > 0 && value < 1) {
      return `${(value * 100).toFixed(1)}%`;
    }
    // Format large numbers with Indian locale
    return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }
  return String(value);
};

const formatColumnHeader = (col: string): string => {
  return col
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function GenerativeDataTable({
  data,
  columns,
  title,
}: GenerativeDataTableProps) {
  const displayData = data.slice(0, 10);

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-[var(--text-primary)] mb-2">{title}</p>
      <div className="max-h-[220px] overflow-auto border border-[var(--border-default)] rounded-lg">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[var(--bg-tertiary)]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-2 py-1.5 text-left font-medium text-[var(--text-secondary)] whitespace-nowrap"
                >
                  {formatColumnHeader(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, i) => (
              <tr
                key={i}
                className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]"
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-2 py-1.5 text-[var(--text-primary)] whitespace-nowrap"
                  >
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 10 && (
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Showing 10 of {data.length} rows
        </p>
      )}
    </div>
  );
}
