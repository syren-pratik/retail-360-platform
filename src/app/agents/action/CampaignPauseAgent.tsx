'use client';

import { useMemo, useState } from 'react';
import { Loader2, Database, AlertCircle } from 'lucide-react';
import type { PriceIntelCore, PriceIntelCampaign } from '@/app/lib/price-intel-types';
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
  generateCampaignMemoXlsx,
  generatePromoTeamEmailHref,
} from '../lib/artifact-generator';
import { executeMockQuery, generateActionRef, MOCK_QUERIES } from '../lib/databricks-mock';

interface Props {
  core: PriceIntelCore;
}

function priorityFor(fr: number): 'high' | 'medium' | 'low' {
  if (fr > 65) return 'high';
  return 'medium';
}

export default function CampaignPauseAgent({ core }: Props) {
  const highFR = useMemo<PriceIntelCampaign[]>(
    () =>
      core.campaigns
        .filter((c) => c.free_rider_ratio_pct > 50 && c.status === 'live')
        .sort((a, b) => b.free_rider_ratio_pct - a.free_rider_ratio_pct),
    [core]
  );

  const totalWaste = useMemo(
    () => highFR.reduce((s, c) => s + (c.spend_to_date_inr * c.free_rider_ratio_pct) / 100, 0),
    [highFR]
  );

  const initialProposals = useMemo<ProposalItem[]>(() => {
    return highFR.map((c, i) => {
      const wasteL = parseFloat(((c.spend_to_date_inr * c.free_rider_ratio_pct) / 100 / 100000).toFixed(2));
      return {
        id: `cp-${i}`,
        sku_id: c.campaign_id,
        product_name: c.campaign_name,
        department: c.department,
        metric_label: 'Free-rider ratio',
        metric_value: `${c.free_rider_ratio_pct}%`,
        metric_urgent: c.free_rider_ratio_pct > 60,
        action_label: 'Pause campaign',
        value_inr: wasteL,
        priority: priorityFor(c.free_rider_ratio_pct),
        selected: true,
        metadata: {
          campaign_id: c.campaign_id,
          mechanic: c.mechanic,
          roi: c.roi.toFixed(2),
          spend_inr: c.spend_to_date_inr,
          free_rider_pct: c.free_rider_ratio_pct,
          incremental_revenue: c.incremental_revenue_inr,
        },
      };
    });
  }, [highFR]);

  const [phase, setPhase] = useState<AgentWorkflowPhase>('idle');
  const [erpResults, setErpResults] = useState<ERPConnectionResult[]>([]);
  const [proposals, setProposals] = useState<ProposalItem[]>(initialProposals);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([
    { id: 'memo', label: 'Generating campaign pause memo', icon: 'memo', status: 'pending' },
    { id: 'email', label: 'Drafting promo team email', icon: 'email', status: 'pending' },
    { id: 'databricks', label: 'Pausing campaigns in Databricks silver.campaigns', icon: 'databricks', status: 'pending' },
    { id: 'notes', label: 'Logging category decision notes', icon: 'notes', status: 'pending' },
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
        campaign_id: string;
        campaign_name: string;
        department: string;
        free_rider_pct: number;
        waste_lakhs: number;
        priority: 'high' | 'medium' | 'low';
        roi?: number;
        reason?: string;
      };
      return {
        id: item.campaign_id ?? `cp-${i}`,
        sku_id: item.campaign_id,
        product_name: item.campaign_name,
        department: item.department,
        metric_label: 'Free-rider ratio',
        metric_value: `${item.free_rider_pct.toFixed(0)}%`,
        metric_urgent: item.free_rider_pct > 60,
        action_label: 'Pause campaign',
        value_inr: item.waste_lakhs,
        priority: item.priority,
        selected: true,
        metadata: {
          free_rider_pct: item.free_rider_pct,
          roi: item.roi ?? 0,
          reason: item.reason ?? '',
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
      const res = await fetch('/api/agents/action/campaign-pause', {
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

  const initialTrigger = `${highFR.length} live campaigns with free-rider ratio above 50% · ₹${(totalWaste / 100000).toFixed(1)}L being wasted`;

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

    updateStep('memo', 'running');
    await new Promise((r) => setTimeout(r, 600));
    const blob = generateCampaignMemoXlsx(selected);
    setArtifacts((prev) => [
      ...prev,
      {
        id: 'campaign-memo',
        type: 'xlsx',
        filename: `campaign_pause_request.xlsx`,
        description: `${selected.length} campaigns · pause memo`,
        blob,
      },
    ]);
    updateStep('memo', 'done');

    updateStep('email', 'running');
    await new Promise((r) => setTimeout(r, 400));
    const href = generatePromoTeamEmailHref(selected);
    setArtifacts((prev) => [
      ...prev,
      {
        id: 'promo-email',
        type: 'email',
        filename: 'Promo team email (draft)',
        description: 'promo-team@retailer.com',
        mailto_href: href,
      },
    ]);
    updateStep('email', 'done');

    updateStep('databricks', 'running');
    const op = await executeMockQuery(MOCK_QUERIES.campaign_pause, selected.length);
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
      'Send pause memo to promo-team@retailer.com',
      'Confirm creative teardown within 24h',
      'Redirect freed budget to top-3 ROI mechanics',
      'Databricks status will flip to paused on approval',
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
      agentId="campaign-pause"
      agentName="Campaign pause"
      agentIcon="⏸️"
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
