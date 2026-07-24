'use client';

import { useMemo, useState } from 'react';
import { Loader2, Database, AlertCircle } from 'lucide-react';
import type { PriceIntelCore, PriceIntelMarkdownQueueItem } from '@/app/lib/price-intel-types';
import type {
  ERPConnectionResult,
  ProposalItem,
  ExecutionStep,
  ArtifactResult,
  DatabricksOperation,
} from '@/app/agents/lib/action-types';
import AgentWorkflow, { type AgentWorkflowPhase } from '../components/AgentWorkflow';
import StepSystemCheck from '../components/workflow/StepSystemCheck';
import { checkERPConnections } from '../lib/erp-connector';
import {
  generateMarkdownInstructionXlsx,
  generateStoreManagerEmailHref,
} from '../lib/artifact-generator';
import { executeMockQuery, generateActionRef, MOCK_QUERIES } from '../lib/databricks-mock';

interface Props {
  core: PriceIntelCore;
}

function priorityFor(urgency: number): 'high' | 'medium' | 'low' {
  if (urgency > 80) return 'high';
  if (urgency > 60) return 'medium';
  return 'low';
}

export default function MarkdownExecutionAgent({ core }: Props) {
  const urgent = useMemo<PriceIntelMarkdownQueueItem[]>(
    () =>
      (core.markdown_queue ?? [])
        .filter((i) => i.status !== 'approved' && i.urgency_score > 40)
        .sort((a, b) => b.urgency_score - a.urgency_score),
    [core]
  );

  const totalRiskL = useMemo(
    () => urgent.reduce((s, i) => s + i.revenue_at_risk_inr, 0) / 100000,
    [urgent]
  );

  const initialProposals = useMemo<ProposalItem[]>(() => {
    return urgent.map((i, idx) => {
      const currentPrice = Math.round(i.recommended_price_inr / (1 + i.recommended_depth_pct / 100));
      return {
        id: `md-${idx}`,
        sku_id: i.sku_id,
        product_name: i.product_name,
        department: i.department,
        metric_label: 'Sell-through vs target',
        metric_value: `${i.current_sell_through_pct}% / ${i.target_sell_through_pct}%`,
        metric_urgent: i.current_sell_through_pct < i.target_sell_through_pct - 15,
        action_label: `−${Math.abs(i.recommended_depth_pct)}% markdown`,
        value_inr: parseFloat((i.revenue_at_risk_inr / 100000).toFixed(2)),
        priority: priorityFor(i.urgency_score),
        selected: true,
        metadata: {
          current_st: i.current_sell_through_pct,
          target_st: i.target_sell_through_pct,
          days_remaining: i.days_remaining,
          weeks_of_supply: i.weeks_of_supply,
          recommended_depth: i.recommended_depth_pct,
          recommended_price: i.recommended_price_inr,
          current_price: currentPrice,
          units_at_risk: i.units_at_risk,
          age_bucket: i.inventory_age_bucket,
        },
      };
    });
  }, [urgent]);

  const [phase, setPhase] = useState<AgentWorkflowPhase>('idle');
  const [erpResults, setErpResults] = useState<ERPConnectionResult[]>([]);
  const [proposals, setProposals] = useState<ProposalItem[]>(initialProposals);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([
    { id: 'sheet', label: 'Generating markdown instruction sheet', icon: 'sheet', status: 'pending' },
    { id: 'whatsapp', label: 'Drafting store manager WhatsApp broadcast', icon: 'whatsapp', status: 'pending' },
    { id: 'databricks', label: 'Approving markdowns in Databricks gold.markdown_events', icon: 'databricks', status: 'pending' },
    { id: 'notes', label: 'Logging clearance decision notes', icon: 'notes', status: 'pending' },
  ]);
  const [artifacts, setArtifacts] = useState<ArtifactResult[]>([]);
  const [databricksOps, setDatabricksOps] = useState<DatabricksOperation[]>([]);
  const [referenceNumber, setReferenceNumber] = useState<string | undefined>();
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [thinkingText, setThinkingText] = useState<string>('');
  const [toolCalls, setToolCalls] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  function buildProposalsFromServer(data: { items: Array<Record<string, unknown>> }) {
    const items = (data.items ?? []).map((raw, i) => {
      const item = raw as {
        sku_id: string;
        product_name: string;
        department: string;
        current_st_pct: number;
        target_st_pct: number;
        recommended_depth_pct: number;
        recommended_price_inr: number;
        days_remaining: number;
        revenue_at_risk_lakhs: number;
        priority: 'high' | 'medium' | 'low';
      };
      return {
        id: item.sku_id ?? `md-${i}`,
        sku_id: item.sku_id,
        product_name: item.product_name,
        department: item.department,
        metric_label: 'Sell-through vs target',
        metric_value: `${item.current_st_pct.toFixed(0)}% / ${item.target_st_pct}%`,
        metric_urgent: item.current_st_pct < item.target_st_pct - 15,
        action_label: `−${Math.abs(item.recommended_depth_pct)}% markdown`,
        value_inr: item.revenue_at_risk_lakhs,
        priority: item.priority,
        selected: true,
        metadata: {
          recommended_price: item.recommended_price_inr,
          days_remaining: item.days_remaining,
          recommended_depth: item.recommended_depth_pct,
        },
      } as ProposalItem;
    });
    setProposals(items);
  }

  async function fetchProposals() {
    setPhase('thinking');
    setThinkingText('');
    setToolCalls([]);
    setApiError(null);
    try {
      const res = await fetch('/api/agents/action/markdown-execution', {
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
                setPhase('approved');
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

  const initialTrigger = `${urgent.length} SKUs need markdown — ₹${totalRiskL.toFixed(1)}L at write-off risk`;

  function updateStep(id: string, status: ExecutionStep['status']) {
    setExecutionSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  async function startWorkflow() {
    setPhase('checking');
    setErpResults([]);
    await checkERPConnections((r) => {
      setErpResults((prev) => {
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

  async function handleApprove(selected: ProposalItem[]) {
    setPhase('executing');

    updateStep('sheet', 'running');
    await new Promise((r) => setTimeout(r, 600));
    const blob = generateMarkdownInstructionXlsx(selected);
    setArtifacts((prev) => [
      ...prev,
      {
        id: 'md-xlsx',
        type: 'xlsx',
        filename: `markdown_instructions.xlsx`,
        description: `${selected.length} SKUs · POS + WhatsApp templates`,
        blob,
      },
    ]);
    updateStep('sheet', 'done');

    updateStep('whatsapp', 'running');
    await new Promise((r) => setTimeout(r, 400));
    const href = generateStoreManagerEmailHref(selected);
    setArtifacts((prev) => [
      ...prev,
      {
        id: 'store-email',
        type: 'email',
        filename: 'Store manager broadcast (draft)',
        description: 'store-managers@retailer.com',
        mailto_href: href,
      },
    ]);
    updateStep('whatsapp', 'done');

    updateStep('databricks', 'running');
    const op = await executeMockQuery(MOCK_QUERIES.markdown_approve, selected.length);
    setDatabricksOps((prev) => [
      ...prev,
      { query: op.query, query_id: op.query_id, rows_affected: op.rows_affected, duration_ms: op.duration_ms },
    ]);
    updateStep('databricks', 'done');

    updateStep('notes', 'running');
    await new Promise((r) => setTimeout(r, 300));
    updateStep('notes', 'done');

    setReferenceNumber(generateActionRef());
    setNextSteps([
      'Send instructions to store-managers@retailer.com',
      'Confirm POS + shelf tag refresh by 9am tomorrow',
      'Monitor sell-through daily for 7 days',
      'Databricks markdown_events records logged for audit',
    ]);
    setPhase('done');
  }

  function handleDismiss() {
    setPhase('idle');
    setErpResults([]);
    setArtifacts([]);
    setDatabricksOps([]);
    setReferenceNumber(undefined);
    setNextSteps([]);
    setExecutionSteps((prev) => prev.map((s) => ({ ...s, status: 'pending' })));
    setProposals(initialProposals);
  }

  if (phase === 'thinking' || phase === 'error') {
    return (
      <div>
        <div className="mb-3 text-xs text-[var(--text-secondary)]">{initialTrigger}</div>
        <StepSystemCheck results={erpResults} isChecking={false} stepNumber={1} />
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
              onClick={handleDismiss}
              className="ml-6 px-3 py-1.5 text-xs rounded-md border border-rose-300 bg-white text-rose-700 hover:bg-rose-100"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <AgentWorkflow
      agentId="markdown-execution"
      agentName="Markdown execution"
      agentIcon="🏷️"
      initialTrigger={initialTrigger}
      phase={phase}
      erpResults={erpResults}
      proposals={proposals}
      executionSteps={executionSteps}
      artifacts={artifacts}
      databricksOps={databricksOps}
      referenceNumber={referenceNumber}
      nextSteps={nextSteps}
      onStart={startWorkflow}
      onProposalChange={setProposals}
      onApprove={handleApprove}
      onDismiss={handleDismiss}
    />
  );
}
