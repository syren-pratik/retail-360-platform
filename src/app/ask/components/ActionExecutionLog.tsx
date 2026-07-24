'use client';

import { Check, Loader2 } from 'lucide-react';

export interface ActionToolCall {
  tool: string;
  label: string;
  progress: string[];
  done?: boolean;
}

interface Props {
  toolCalls?: ActionToolCall[];
}

export default function ActionExecutionLog({ toolCalls }: Props) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="mt-3 border border-[var(--border-default)] rounded-lg bg-[var(--bg-secondary)] px-3 py-2 space-y-1.5">
      {toolCalls.map((tc, i) => {
        const running = !tc.done;
        return (
          <div key={`${tc.tool}-${i}`} className="flex items-start gap-2 text-xs">
            <div className="mt-0.5 w-4 h-4 flex items-center justify-center">
              {running ? (
                <Loader2 size={12} className="text-blue-500 animate-spin" />
              ) : (
                <Check size={12} className="text-emerald-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--text-primary)]">{tc.label}</div>
              {tc.progress.length > 0 && (
                <div className="text-[var(--text-tertiary)] space-y-0.5">
                  {tc.progress.map((p, j) => (
                    <div key={j} className="truncate">{p}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
