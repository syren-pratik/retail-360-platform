'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'agent_hub_run_history';
const MAX_ITEMS = 5;

export interface RunHistoryItem {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_icon: string;
  timestamp: string;
  answer_preview: string;    // first 80 chars of answer
  components_count: number;
  success: boolean;
}

/** sessionStorage-backed run history — resets on tab close. */
export function useRunHistory() {
  const [history, setHistory] = useState<RunHistoryItem[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* corrupted or unavailable — start fresh */ }
  }, []);

  function addRun(run: RunHistoryItem) {
    setHistory((prev) => {
      const next = [run, ...prev].slice(0, MAX_ITEMS);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* quota/unavailable — keep in-memory only */ }
      return next;
    });
  }

  return { history, addRun };
}

interface RunHistoryProps {
  history: RunHistoryItem[];
  onReplay: (run: RunHistoryItem) => void;
}

export default function RunHistory({ history, onReplay }: RunHistoryProps) {
  if (!history || history.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        Recent runs
      </h2>
      <div className="space-y-2">
        {history.map((run) => (
          <button
            key={run.id}
            onClick={() => onReplay(run)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border-default)] bg-white hover:border-[var(--border-hover)] text-left transition-colors"
          >
            <span className="text-lg flex-shrink-0">{run.agent_icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {run.agent_name}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {run.timestamp}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                {run.answer_preview}
              </p>
            </div>
            <span className="text-[10px] text-[var(--text-secondary)] flex-shrink-0">
              {run.components_count} charts
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
