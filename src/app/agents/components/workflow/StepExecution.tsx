'use client';

import { useState } from 'react';
import { Check, Loader2, FileSpreadsheet, Mail, Database, FileText, Copy } from 'lucide-react';
import type {
  ExecutionStep,
  ArtifactResult,
  DatabricksOperation,
} from '@/app/agents/lib/action-types';
import { downloadBlob } from '@/app/agents/lib/artifact-generator';

interface Props {
  steps: ExecutionStep[];
  artifacts: ArtifactResult[];
  databricksOps: DatabricksOperation[];
  isExecuting: boolean;
  referenceNumber?: string;
  nextSteps?: string[];
  stepNumber?: number;
}

function iconFor(id: string, size = 14) {
  if (id === 'xlsx') return <FileSpreadsheet size={size} />;
  if (id === 'email') return <Mail size={size} />;
  if (id === 'databricks') return <Database size={size} />;
  return <FileText size={size} />;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard unavailable */ }
      }}
      className="flex items-center gap-1 px-3 py-1 text-xs rounded-md border border-[var(--border-default)] text-[var(--accent-primary)]"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function StepExecution({
  steps,
  artifacts,
  databricksOps,
  isExecuting,
  referenceNumber,
  nextSteps,
  stepNumber = 3,
}: Props) {
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="border border-[var(--border-default)] rounded-lg bg-white p-4 mb-3">
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white ${
            isExecuting ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'
          }`}
        >
          {isExecuting ? stepNumber : <Check size={14} />}
        </div>
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Executing actions</h3>
      </div>

      <div className="ml-10 space-y-2 mb-4">
        {steps.map((s) => (
          <div key={s.id} className="flex items-center gap-3 py-1">
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center ${
                s.status === 'done'
                  ? 'bg-emerald-50 text-emerald-600'
                  : s.status === 'running'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              {s.status === 'running' ? <Loader2 size={14} className="animate-spin" /> : iconFor(s.id)}
            </div>
            <span className="flex-1 text-sm text-[var(--text-primary)]">{s.label}</span>
            {s.status === 'done' && <Check size={14} className="text-emerald-600" />}
          </div>
        ))}
      </div>

      {artifacts.length > 0 && (
        <div className="ml-10 mb-4">
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Artifacts
          </div>
          <div className="space-y-2">
            {artifacts.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 border border-[var(--border-default)] rounded-md p-2"
              >
                <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  {a.type === 'email' ? <Mail size={14} /> : <FileSpreadsheet size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text-primary)] truncate">{a.filename}</div>
                  <div className="text-[10px] text-[var(--text-secondary)] truncate">{a.description}</div>
                </div>
                {a.type === 'email' && a.mailto_href?.startsWith('sms:') ? (
                  <CopyButton text={a.description} />
                ) : a.type === 'email' && a.mailto_href ? (
                  <a
                    href={a.mailto_href}
                    className="px-3 py-1 text-xs rounded-md border border-[var(--border-default)] text-[var(--accent-primary)]"
                  >
                    Open email
                  </a>
                ) : a.blob ? (
                  <button
                    onClick={() => downloadBlob(a.blob!, a.filename)}
                    className="px-3 py-1 text-xs rounded-md border border-[var(--border-default)] text-[var(--accent-primary)]"
                  >
                    Download
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {databricksOps.length > 0 && (
        <div className="ml-10 mb-4">
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Databricks
          </div>
          <div className="space-y-2">
            {databricksOps.map((op, i) => (
              <div key={i} className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400">
                <div className="text-gray-500">-- Databricks mock execution</div>
                <div className="whitespace-pre-wrap break-all">{op.query}</div>
                <div className="text-gray-500 mt-1">
                  Query {op.query_id} · {op.rows_affected} row(s) · {op.duration_ms}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isExecuting && referenceNumber && (
        <div className="ml-10 mb-3 border border-emerald-200 bg-emerald-50 rounded-md p-3 text-xs text-emerald-800">
          Reference: {referenceNumber} · Approved by category_manager · {now}
        </div>
      )}

      {!isExecuting && nextSteps && nextSteps.length > 0 && (
        <div className="ml-10">
          <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Next steps
          </div>
          <ul className="text-xs text-[var(--text-primary)] list-disc pl-4 space-y-1">
            {nextSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
