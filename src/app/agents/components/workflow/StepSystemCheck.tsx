'use client';

import { Loader2, Check, X } from 'lucide-react';
import type { ERPConnectionResult, ERPSystem } from '@/app/agents/lib/action-types';

const SYSTEM_BG: Record<ERPSystem, string> = {
  'SAP ERP': 'bg-blue-50 text-blue-700',
  'Oracle NetSuite': 'bg-orange-50 text-orange-700',
  'Tally Prime': 'bg-purple-50 text-purple-700',
  'Microsoft Dynamics': 'bg-sky-50 text-sky-700',
  'Zoho Books': 'bg-emerald-50 text-emerald-700',
};

interface Props {
  results: ERPConnectionResult[];
  isChecking: boolean;
  stepNumber?: number;
  fallbackItems?: string[];
}

export default function StepSystemCheck({
  results,
  isChecking,
  stepNumber = 1,
  fallbackItems = ['PO spreadsheet ready', 'Supplier email drafted', 'Databricks flags set'],
}: Props) {
  const allFailed = results.length > 0 && results.every((r) => r.status === 'failed');
  const showFallback = allFailed && !isChecking;

  return (
    <div className="border border-[var(--border-default)] rounded-lg bg-white p-4 mb-3">
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white ${
            isChecking ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'
          }`}
        >
          {isChecking ? stepNumber : <Check size={14} />}
        </div>
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Checking connected systems</h3>
      </div>

      <div className="space-y-2 ml-10">
        {results.map((r, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-medium ${
                SYSTEM_BG[r.system] ?? 'bg-gray-50 text-gray-700'
              }`}
            >
              {r.system.split(' ')[0].slice(0, 3).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-sm text-[var(--text-primary)]">{r.system}</div>
              {r.error && r.status === 'failed' && (
                <div className="text-xs text-rose-600 mt-0.5">{r.error}</div>
              )}
            </div>
            {r.status === 'checking' && <Loader2 size={14} className="text-blue-500 animate-spin" />}
            {r.status === 'failed' && (
              <span className="w-2 h-2 rounded-full bg-rose-500" title="failed" />
            )}
            {r.status === 'connected' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="connected" />
            )}
          </div>
        ))}
      </div>

      {showFallback && (
        <div className="mt-4 ml-10 border border-amber-200 bg-amber-50 rounded-lg p-3">
          <div className="text-sm font-medium text-amber-900 mb-2">
            No ERP connected — preparing manual handoff instead
          </div>
          <ul className="space-y-1">
            {fallbackItems.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-amber-900">
                <Check size={12} className="text-emerald-600" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
