'use client';

import { useMemo, useState } from 'react';
import { useTenant } from '@/app/context/TenantContext';
import { Loader2, Database, AlertCircle } from 'lucide-react';
import type { PriceIntelCore, PriceIntelSKU } from '@/app/lib/price-intel-types';
import type { UIComponentType } from '@/app/lib/types';
import type {
  ERPConnectionResult,
  ProposalItem,
  ExecutionStep,
  ArtifactResult,
  DatabricksOperation,
} from '@/app/agents/lib/action-types';
import AgentWorkflow, { type AgentWorkflowPhase } from '../components/AgentWorkflow';
import StepSystemCheck from '../components/workflow/StepSystemCheck';
import HubCanvas from '../components/HubCanvas';
import { checkERPConnections } from '../lib/erp-connector';
import {
  generatePriceChangeCSV,
  generateStoreOpsEmailHref,
} from '../lib/artifact-generator';
import { executeMockQuery, generateActionRef, MOCK_QUERIES } from '../lib/databricks-mock';

interface Props {
  core: PriceIntelCore;
}

function priorityFor(revImpactL: number): 'high' | 'medium' | 'low' {
  const abs = Math.abs(revImpactL);
  if (abs > 5) return 'high';
  if (abs > 2) return 'medium';
  return 'low';
}

export default function PriceChangeExecutionAgent({ core }: Props) {
  const { tenant, isRetail, isApparel } = useTenant();
  const isUSD = isRetail || isApparel;
  const candidates = useMemo<PriceIntelSKU[]>(
    () =>
      core.skus
        .filter((s) => s.recommendation_priority === 'High' && Math.abs(s.price_change_pct) > 3)
        .sort((a, b) => Math.abs(b.revenue_impact_inr) - Math.abs(a.revenue_impact_inr))
        .slice(0, 8),
    [core]
  );

  const totalImpactL = useMemo(
    () => candidates.reduce((s, c) => s + Math.abs(c.revenue_impact_inr), 0) / 100000,
    [candidates]
  );

  const initialProposals = useMemo<ProposalItem[]>(() => {
    return candidates.map((sku, i) => {
      const revL = sku.revenue_impact_inr / 100000;
      return {
        id: `pce-${i}`,
        sku_id: sku.sku_id,
        product_name: sku.product_name,
        department: sku.department,
        metric_label: 'Revenue impact',
        metric_value: `₹${revL.toFixed(1)}L`,
        metric_urgent: revL > 5,
        action_label: `₹${sku.current_price_inr} → ₹${sku.recommended_price_inr}`,
        value_inr: parseFloat(revL.toFixed(1)),
        priority: priorityFor(revL),
        selected: true,
        metadata: {
          current_price: sku.current_price_inr,
          recommended_price: sku.recommended_price_inr,
          change_pct: sku.price_change_pct,
          elasticity: sku.elasticity,
        },
      };
    });
  }, [candidates]);

  const [phase, setPhase] = useState<AgentWorkflowPhase>('idle');
  const [erpResults, setErpResults] = useState<ERPConnectionResult[]>([]);
  const [proposals, setProposals] = useState<ProposalItem[]>(initialProposals);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([
    { id: 'xlsx', label: 'Generating price change file (POS-ready)', icon: 'xlsx', status: 'pending' },
    { id: 'email', label: 'Drafting store operations email', icon: 'email', status: 'pending' },
    { id: 'databricks', label: 'Updating price master in Databricks', icon: 'databricks', status: 'pending' },
    { id: 'notes', label: 'Creating compliance checklist', icon: 'notes', status: 'pending' },
  ]);
  const [artifacts, setArtifacts] = useState<ArtifactResult[]>([]);
  const [databricksOps, setDatabricksOps] = useState<DatabricksOperation[]>([]);
  const [referenceNumber, setReferenceNumber] = useState<string | undefined>();
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [thinkingText, setThinkingText] = useState<string>('');
  const [toolCalls, setToolCalls] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [agentComponents, setAgentComponents] = useState<UIComponentType[]>([]);
  const [userInstructions, setUserInstructions] = useState('');

  function buildProposalsFromServer(data: { items: Array<Record<string, unknown>> }) {
    const items = (data.items ?? []).map((raw, i) => {
      const item = raw as {
        sku_id: string;
        product_name: string;
        department: string;
        current_price_inr: number;
        recommended_price_inr: number;
        change_pct: number;
        elasticity: number;
        revenue_impact_lakhs: number;
        priority: 'high' | 'medium' | 'low';
      };
      return {
        id: item.sku_id ?? `pce-${i}`,
        sku_id: item.sku_id,
        product_name: item.product_name,
        department: item.department,
        metric_label: 'Revenue impact',
        metric_value: `₹${item.revenue_impact_lakhs.toFixed(1)}L`,
        metric_urgent: item.revenue_impact_lakhs > 5,
        action_label: `₹${item.current_price_inr} → ₹${item.recommended_price_inr}`,
        value_inr: item.revenue_impact_lakhs,
        priority: item.priority,
        selected: true,
        metadata: {
          current_price: item.current_price_inr,
          recommended_price: item.recommended_price_inr,
          change_pct: item.change_pct,
          elasticity: item.elasticity,
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
      const res = await fetch('/api/agents/action/price-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, user_instructions: userInstructions }),
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
              case 'components':
                setAgentComponents(data.data as UIComponentType[]);
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

  const initialTrigger = `${candidates.length} SKUs with price changes ready · ₹${totalImpactL.toFixed(
    1
  )}L projected impact`;

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

    updateStep('xlsx', 'running');
    await new Promise((r) => setTimeout(r, 600));
    const blob = generatePriceChangeCSV(selected, isUSD);
    setArtifacts((prev) => [
      ...prev,
      {
        id: 'price-xlsx',
        type: 'xlsx',
        filename: `PriceChange_${core.anchor_date}.xlsx`,
        description: `${selected.length} SKUs · POS-ready format`,
        blob,
      },
    ]);
    updateStep('xlsx', 'done');

    updateStep('email', 'running');
    await new Promise((r) => setTimeout(r, 400));
    const href = generateStoreOpsEmailHref(selected, isUSD);
    setArtifacts((prev) => [
      ...prev,
      {
        id: 'storeops-email',
        type: 'email',
        filename: 'Store ops email (draft)',
        description: 'storeops@retailer.com',
        mailto_href: href,
      },
    ]);
    updateStep('email', 'done');

    updateStep('databricks', 'running');
    const op = await executeMockQuery(MOCK_QUERIES.price_change, selected.length);
    setDatabricksOps((prev) => [
      ...prev,
      {
        query: op.query,
        query_id: op.query_id,
        rows_affected: op.rows_affected,
        duration_ms: op.duration_ms,
      },
    ]);
    updateStep('databricks', 'done');

    updateStep('notes', 'running');
    await new Promise((r) => setTimeout(r, 300));
    updateStep('notes', 'done');

    setReferenceNumber(generateActionRef());
    setNextSteps([
      'Send price change file to store operations',
      'Confirm POS refresh across all stores within 4h',
      'Monitor sell-through vs. elasticity forecast for 7 days',
      'Compliance checklist logged for audit',
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
    <>
      {agentComponents.length > 0 && (
        <div className="mb-4">
          <HubCanvas components={agentComponents} />
        </div>
      )}
      <AgentWorkflow
      agentId="price-change-execution"
      agentName="Price change execution"
      agentIcon="⚡"
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
      userInstructions={userInstructions}
      onUserInstructionsChange={setUserInstructions}
      onDismiss={handleDismiss}
    />
    </>
  );
}
