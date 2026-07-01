'use client';

interface ReturnsAdjustedRow {
  department: string;
  gross_st_pct: number[];
  net_st_pct: number[];
  delta_pp: number[];
}

interface Props {
  rows: ReturnsAdjustedRow[];
}

export default function MerchReturnsAdjustedSellThrough({ rows }: Props) {
  const summary = rows.map((r) => {
    const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const gross = avg(r.gross_st_pct);
    const net = avg(r.net_st_pct);
    return { department: r.department, gross, net, delta: gross - net };
  });

  const maxVal = Math.max(...summary.map((s) => s.gross));

  return (
    <div className="card p-4 flex flex-col">
      <div className="mb-3">
        <p className="text-xs font-medium text-[var(--text-primary)]">Returns-Adjusted Sell-Through</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
          14-week avg gross vs net sell-through · returns drag per department
        </p>
      </div>
      <div className="space-y-3">
        {summary.map((row) => {
          const grossW = (row.gross / maxVal) * 100;
          const netW = (row.net / maxVal) * 100;
          const isHeavy = row.delta > 12;
          return (
            <div key={row.department}>
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="font-medium text-[var(--text-primary)]">{row.department}</span>
                <span className={`font-mono ${isHeavy ? 'text-rose-600 font-semibold' : 'text-[var(--text-secondary)]'}`}>
                  Δ {row.delta.toFixed(1)}pp
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-tertiary)] w-10">Gross</span>
                  <div className="flex-1 h-4 bg-[var(--bg-secondary)] rounded overflow-hidden">
                    <div
                      className="h-full bg-slate-300 flex items-center justify-end pr-1 text-[10px] text-slate-700 font-mono"
                      style={{ width: `${grossW}%` }}
                    >
                      {row.gross.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-tertiary)] w-10">Net</span>
                  <div className="flex-1 h-4 bg-[var(--bg-secondary)] rounded overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 flex items-center justify-end pr-1 text-[10px] text-white font-mono"
                      style={{ width: `${netW}%` }}
                    >
                      {row.net.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
