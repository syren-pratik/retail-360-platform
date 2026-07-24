'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2, Database, AlertCircle } from 'lucide-react';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import type {
  ExecutionStep,
  ArtifactResult,
  DatabricksOperation,
  ERPConnectionResult,
} from '@/app/agents/lib/action-types';
import StepSystemCheck from '../components/workflow/StepSystemCheck';
import StepExecution from '../components/workflow/StepExecution';
import {
  checkCommsConnections,
  type CommsConnectionResult,
} from '../lib/erp-connector';
import {
  generateWeeklyBriefXlsx,
  generateWeeklyBriefEmailHref,
  generateVPSummary,
} from '../lib/artifact-generator';
import { executeMockQuery, generateActionRef, MOCK_QUERIES } from '../lib/databricks-mock';

interface Props {
  core: PriceIntelCore;
}

type Phase = 'idle' | 'checking-comms' | 'thinking' | 'preview' | 'executing' | 'done' | 'error';

interface BriefSummary {
  headline?: string;
  leakage_lakhs?: number;
  alerts?: number;
  urgent_alerts?: number;
  promo_roi?: number;
  sell_through_pct?: number;
}
interface TopDecision {
  title: string;
  detail?: string;
}
interface WhatsComing {
  event: string;
  date?: string;
  detail?: string;
}

export default function WeeklyDistributionAgent({ core }: Props) {
  const k = core.kpis;

  const weekOf = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const leakageL = ((k.total_margin_leakage_inr ?? 0) / 100000).toFixed(1);
  const alerts = k.active_alerts ?? 0;
  const urgentCount = (core.action_queue ?? []).filter((a) => a.priority === 'urgent').length;
  const roi = k.promo_roi_index ?? 0;
  const stPct = k.sell_through_pct ?? 0;
  const stColor = stPct >= 70 ? 'text-emerald-700' : stPct >= 55 ? 'text-amber-700' : 'text-rose-700';

  const initialTrigger = `Weekly pricing brief — week of ${weekOf} · ${alerts} alerts · ₹${leakageL}L leakage`;

  const [phase, setPhase] = useState<Phase>('idle');
  const [commsResults, setCommsResults] = useState<CommsConnectionResult[]>([]);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([
    { id: 'xlsx', label: 'Generating weekly brief spreadsheet (3 sheets)', icon: 'xlsx', status: 'pending' },
    { id: 'email', label: 'Drafting leadership brief email', icon: 'email', status: 'pending' },
    { id: 'whatsapp', label: 'Preparing VP WhatsApp summary (160 chars)', icon: 'whatsapp', status: 'pending' },
    { id: 'databricks', label: 'Logging brief distribution in Databricks weekly_briefs', icon: 'databricks', status: 'pending' },
  ]);
  const [artifacts, setArtifacts] = useState<ArtifactResult[]>([]);
  const [databricksOps, setDatabricksOps] = useState<DatabricksOperation[]>([]);
  const [referenceNumber, setReferenceNumber] = useState<string | undefined>();
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [thinkingText, setThinkingText] = useState<string>('');
  const [toolCalls, setToolCalls] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [briefSummary, setBriefSummary] = useState<BriefSummary | null>(null);
  const [topDecisions, setTopDecisions] = useState<TopDecision[]>([]);
  const [whatsComing, setWhatsComing] = useState<WhatsComing[]>([]);

  function buildProposalsFromServer(data: Record<string, unknown>) {
    const summary = (data.summary ?? null) as BriefSummary | null;
    const decisions = (data.top_decisions ?? []) as TopDecision[];
    const coming = (data.whats_coming ?? []) as WhatsComing[];
    setBriefSummary(summary);
    setTopDecisions(decisions);
    setWhatsComing(coming);
  }

  async function fetchProposals() {
    setPhase('thinking');
    setThinkingText('');
    setToolCalls([]);
    setApiError(null);
    try {
      const res = await fetch('/api/agents/action/weekly-distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant: 'india_grocery' }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          try {
            const data = JSON.parse(line.slice(5).trim());
            switch (data.type) {
              case 'status':
              case 'thinking':
                setThinkingText((prev) => prev + (data.text ?? ''));
                break;
              case 'tool_call':
                setToolCalls((prev) => (prev.includes(data.tool) ? prev : [...prev, data.tool]));
                setThinkingText((prev) => prev + `\n→ Querying ${data.tool}...`);
                break;
              case 'tool_result':
                setThinkingText((prev) => prev + `\n✓ ${data.summary ?? data.tool + ' returned data'}`);
                break;
              case 'proposals':
                buildProposalsFromServer(data.data);
                setPhase('preview');
                break;
              case 'error':
                setApiError(data.text);
                setPhase('error');
                break;
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }

  function updateStep(id: string, status: ExecutionStep['status']) {
    setExecutionSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  async function startWorkflow() {
    setPhase('checking-comms');
    setCommsResults([]);
    await checkCommsConnections((r) => {
      setCommsResults((prev) => {
        const existing = prev.findIndex((p) => p.system === r.system);
        if (existing >= 0) {
          const copy = [...prev];
          copy[existing] = r;
          return copy;
        }
        return [...prev, r];
      });
    });
    await fetchProposals();
  }

  async function handleGenerate() {
    setPhase('executing');

    updateStep('xlsx', 'running');
    await new Promise((r) => setTimeout(r, 700));
    const blob = generateWeeklyBriefXlsx(core);
    const dateISO = new Date().toISOString().slice(0, 10);
    setArtifacts((prev) => [
      ...prev,
      {
        id: 'brief-xlsx',
        type: 'xlsx',
        filename: `weekly_brief_${dateISO}.xlsx`,
        description: `3 sheets · Executive Summary · Campaigns · What's Coming`,
        blob,
      },
    ]);
    updateStep('xlsx', 'done');

    updateStep('email', 'running');
    await new Promise((r) => setTimeout(r, 400));
    const href = generateWeeklyBriefEmailHref(core, weekOf);
    setArtifacts((prev) => [
      ...prev,
      {
        id: 'brief-email',
        type: 'email',
        filename: 'Leadership brief email (draft)',
        description: 'leadership@retailer.com',
        mailto_href: href,
      },
    ]);
    updateStep('email', 'done');

    updateStep('whatsapp', 'running');
    await new Promise((r) => setTimeout(r, 400));
    const vpSummary = generateVPSummary(core);
    setArtifacts((prev) => [
      ...prev,
      {
        id: 'vp-whatsapp',
        type: 'email',
        filename: 'VP WhatsApp summary (copy-ready)',
        description: vpSummary,
        mailto_href: `sms:?body=${encodeURIComponent(vpSummary)}`,
      },
    ]);
    updateStep('whatsapp', 'done');

    updateStep('databricks', 'running');
    const query = MOCK_QUERIES.weekly_brief_log(
      weekOf,
      k.total_margin_leakage_inr ?? 0,
      alerts
    );
    const op = await executeMockQuery(query, 1);
    setDatabricksOps((prev) => [
      ...prev,
      { query: op.query, query_id: op.query_id, rows_affected: op.rows_affected, duration_ms: op.duration_ms },
    ]);
    updateStep('databricks', 'done');

    setReferenceNumber(generateActionRef());
    setNextSteps([
      'Send brief to leadership@retailer.com',
      'Copy VP WhatsApp summary and paste into chat',
      'Review next Monday against actuals',
      'Databricks weekly_briefs row logged for audit',
    ]);
    setPhase('done');
  }

  function handleReset() {
    setPhase('idle');
    setCommsResults([]);
    setArtifacts([]);
    setDatabricksOps([]);
    setReferenceNumber(undefined);
    setNextSteps([]);
    setExecutionSteps((prev) => prev.map((s) => ({ ...s, status: 'pending' })));
    setThinkingText('');
    setToolCalls([]);
    setApiError(null);
    setBriefSummary(null);
    setTopDecisions([]);
    setWhatsComing([]);
  }

  if (phase === 'idle') {
    return (
      <div className="border border-[var(--border-default)] rounded-xl bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-xl">📬</div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">Weekly distribution</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{initialTrigger}</p>
          </div>
        </div>
        <button
          onClick={startWorkflow}
          className="px-4 py-2 text-sm rounded-md bg-[var(--accent-primary)] text-white"
        >
          Generate brief →
        </button>
      </div>
    );
  }

  // Cast comms results to ERPConnectionResult shape (StepSystemCheck reads system as string label).
  const commsAsErp = commsResults as unknown as ERPConnectionResult[];

  // Prefer server-generated brief summary with fallback to core.kpis
  const dispLeakageL = briefSummary?.leakage_lakhs !== undefined
    ? briefSummary.leakage_lakhs.toFixed(1)
    : leakageL;
  const dispAlerts = briefSummary?.alerts ?? alerts;
  const dispUrgent = briefSummary?.urgent_alerts ?? urgentCount;
  const dispRoi = briefSummary?.promo_roi ?? roi;
  const dispStPct = briefSummary?.sell_through_pct ?? stPct;
  const dispStColor = dispStPct >= 70 ? 'text-emerald-700' : dispStPct >= 55 ? 'text-amber-700' : 'text-rose-700';

  return (
    <div>
      <div className="mb-3 text-xs text-[var(--text-secondary)]">{initialTrigger}</div>

      <StepSystemCheck
        results={commsAsErp}
        isChecking={phase === 'checking-comms'}
        stepNumber={1}
        fallbackItems={[
          'Brief spreadsheet ready',
          'Leadership email drafted',
          'VP WhatsApp summary ready to copy',
        ]}
      />

      {phase === 'thinking' && (
        <div className="border border-[var(--border-default)] rounded-lg bg-white p-4 mb-3">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 size={16} className="animate-spin text-blue-600" />
            <h3 className="text-sm font-medium text-[var(--text-primary)]">Analyzing with Claude...</h3>
          </div>
          {toolCalls.length > 0 && (
            <div className="ml-6 mb-3 flex flex-wrap gap-2">
              {toolCalls.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                  <Database size={10} /> {t}
                </span>
              ))}
            </div>
          )}
          {thinkingText && (
            <pre className="ml-6 text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono">{thinkingText}</pre>
          )}
        </div>
      )}

      {phase === 'error' && (
        <div className="border border-rose-200 bg-rose-50 rounded-lg p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-rose-600" />
            <h3 className="text-sm font-medium text-rose-800">Agent error</h3>
          </div>
          <p className="ml-6 text-xs text-rose-700 mb-3">{apiError}</p>
          <button
            onClick={handleReset}
            className="ml-6 px-3 py-1.5 text-xs rounded-md border border-rose-300 bg-white text-rose-700 hover:bg-rose-100"
          >
            Try again
          </button>
        </div>
      )}

      {phase === 'preview' && (
        <div className="border border-[var(--border-default)] rounded-lg bg-white p-4 mb-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white bg-blue-500 animate-pulse">
              2
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">Preview weekly brief</h3>
          </div>

          {briefSummary?.headline && (
            <div className="ml-10 mb-3 text-sm text-[var(--text-primary)] italic">{briefSummary.headline}</div>
          )}
          <div className="ml-10 grid grid-cols-4 gap-3 mb-4">
            <div className="border border-[var(--border-default)] rounded-md p-3">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Margin leakage</div>
              <div className="text-lg font-medium text-rose-700 mt-1">₹{dispLeakageL}L</div>
            </div>
            <div className="border border-[var(--border-default)] rounded-md p-3">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Active alerts</div>
              <div className="text-lg font-medium text-[var(--text-primary)] mt-1">
                {dispAlerts} <span className="text-xs text-rose-600">· {dispUrgent} urgent</span>
              </div>
            </div>
            <div className="border border-[var(--border-default)] rounded-md p-3">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Promo ROI</div>
              <div className="text-lg font-medium text-[var(--text-primary)] mt-1">{dispRoi}/100</div>
            </div>
            <div className="border border-[var(--border-default)] rounded-md p-3">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Sell-through</div>
              <div className={`text-lg font-medium mt-1 ${dispStColor}`}>{dispStPct}%</div>
            </div>
          </div>

          {topDecisions.length > 0 && (
            <div className="ml-10 mb-4">
              <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Top decisions
              </div>
              <ul className="space-y-1.5">
                {topDecisions.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-primary)]">
                    <Check size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span><b>{d.title}</b>{d.detail ? ` — ${d.detail}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {whatsComing.length > 0 && (
            <div className="ml-10 mb-4">
              <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                What&apos;s coming
              </div>
              <ul className="space-y-1.5">
                {whatsComing.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-primary)]">
                    <Check size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                    <span><b>{w.event}</b>{w.date ? ` (${w.date})` : ''}{w.detail ? ` — ${w.detail}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="ml-10 mb-4">
            <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Brief will include
            </div>
            <ul className="space-y-1.5">
              {[
                'Executive summary — headline, KPIs, top 3 decisions',
                'Campaign performance — all live and recent campaigns',
                "What's coming — next 14 days of forecast + events",
                'Free-rider ratio, sell-through, and margin realization trends',
                'Databricks distribution log entry (audit trail)',
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-primary)]">
                  <Check size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ml-10 flex items-center gap-3">
            <button
              onClick={handleGenerate}
              className="px-4 py-2 text-sm rounded-md bg-[var(--accent-primary)] text-white"
            >
              Generate and distribute brief →
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2 text-xs rounded-md border border-[var(--border-default)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {(phase === 'executing' || phase === 'done') && (
        <StepExecution
          steps={executionSteps}
          artifacts={artifacts}
          databricksOps={databricksOps}
          isExecuting={phase === 'executing'}
          referenceNumber={referenceNumber}
          nextSteps={nextSteps}
          stepNumber={2}
        />
      )}
    </div>
  );
}
