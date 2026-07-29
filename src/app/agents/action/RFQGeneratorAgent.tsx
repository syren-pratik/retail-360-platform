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
  generateRFQSpreadsheet,
  generateSupplierNegotiationEmailHref,
  calculateTargetCostReduction,
} from '../lib/artifact-generator';
import { executeMockQuery, generateActionRef, MOCK_QUERIES } from '../lib/databricks-mock';

interface Props {
  core: PriceIntelCore;
}

function priorityFor(impact: number): 'high' | 'medium' | 'low' {
  if (impact > 500000) return 'high';
  return 'medium';
}

export default function RFQGeneratorAgent({ core }: Props) {
  const { tenant, isRetail, isApparel } = useTenant();
  const isUSD = isRetail || isApparel;
  const skuMap = useMemo(() => {
    const m = new Map<string, PriceIntelSKU>();
    core.skus.forEach((s) => m.set(s.sku_id, s));
    return m;
  }, [core]);

  const rfqSkus = useMemo(() => {
    const dedup = new Map<string, { sku: PriceIntelSKU; impact: number }>();
    (core.action_queue ?? [])
      .filter((a) => a.alert_type === 'cost_passthrough')
      .forEach((a) => {
        const sku = skuMap.get(a.sku_id);
        if (sku && !dedup.has(sku.sku_id)) {
          dedup.set(sku.sku_id, { sku, impact: Math.abs(a.financial_impact_inr) });
        }
      });
    core.skus
      .filter((s) => s.current_margin_pct < s.target_margin_pct)
      .forEach((s) => {
        if (!dedup.has(s.sku_id)) {
          dedup.set(s.sku_id, { sku: s, impact: Math.abs(s.revenue_impact_inr) });
        }
      });
    return Array.from(dedup.values())
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 6);
  }, [core, skuMap]);

  const totalImpactL = useMemo(
    () => rfqSkus.reduce((s, r) => s + r.impact, 0) / 100000,
    [rfqSkus]
  );

  const initialProposals = useMemo<ProposalItem[]>(() => {
    return rfqSkus.map(({ sku, impact }, i) => {
      const reduction = calculateTargetCostReduction(sku);
      return {
        id: `rfq-${i}`,
        sku_id: sku.sku_id,
        product_name: sku.product_name,
        department: sku.department,
        metric_label: 'Margin vs floor',
        metric_value: sku
          ? `${sku.current_margin_pct.toFixed(1)}% / ${sku.target_margin_pct}% target`
          : 'Below floor',
        metric_urgent: true,
        action_label: 'Request better terms',
        value_inr: parseFloat((impact / 100000).toFixed(2)),
        priority: priorityFor(impact),
        selected: true,
        metadata: {
          current_margin: parseFloat(sku.current_margin_pct.toFixed(2)),
          target_margin: sku.target_margin_pct,
          current_price: sku.current_price_inr,
          cost_inr: sku.cost_inr,
          elasticity: sku.elasticity,
          target_cost_reduction_pct: reduction,
          annual_volume: Math.round(12000 + Math.random() * 8000),
        },
      };
    });
  }, [rfqSkus]);

  const [phase, setPhase] = useState<AgentWorkflowPhase>('idle');
  const [erpResults, setErpResults] = useState<ERPConnectionResult[]>([]);
  const [proposals, setProposals] = useState<ProposalItem[]>(initialProposals);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([
    { id: 'rfq', label: 'Generating formal RFQ spreadsheet', icon: 'rfq', status: 'pending' },
    { id: 'email', label: 'Drafting supplier negotiation email', icon: 'email', status: 'pending' },
    { id: 'databricks', label: 'Logging RFQ in Databricks procurement_rfqs', icon: 'databricks', status: 'pending' },
    { id: 'notes', label: 'Scheduling follow-up calendar reminder', icon: 'notes', status: 'pending' },
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
        current_margin_pct: number;
        target_margin_pct: number;
        current_cost_inr: number;
        target_cost_reduction_pct: number;
        annual_impact_lakhs: number;
        priority: 'high' | 'medium' | 'low';
      };
      return {
        id: item.sku_id ?? `rfq-${i}`,
        sku_id: item.sku_id,
        product_name: item.product_name,
        department: item.department,
        metric_label: 'Margin vs floor',
        metric_value: `${item.current_margin_pct.toFixed(1)}% / ${item.target_margin_pct}% target`,
        metric_urgent: true,
        action_label: 'Request better terms',
        value_inr: item.annual_impact_lakhs,
        priority: item.priority,
        selected: true,
        metadata: {
          current_margin: item.current_margin_pct,
          target_margin: item.target_margin_pct,
          cost_inr: item.current_cost_inr,
          target_cost_reduction_pct: item.target_cost_reduction_pct,
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
      const res = await fetch('/api/agents/action/rfq-generator', {
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

  const initialTrigger = `${rfqSkus.length} SKUs where supplier costs are compressing margin · ₹${totalImpactL.toFixed(1)}L annual impact`;

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

    updateStep('rfq', 'running');
    await new Promise((r) => setTimeout(r, 700));
    const { blob, reference, deadlineISO } = generateRFQSpreadsheet(selected, isUSD);
    const dateISO = new Date().toISOString().slice(0, 10);
    setArtifacts((prev) => [
      ...prev,
      {
        id: 'rfq-xlsx',
        type: 'xlsx',
        filename: `rfq_${reference}_${dateISO}.xlsx`,
        description: `${selected.length} SKUs · Response due ${deadlineISO}`,
        blob,
      },
    ]);
    updateStep('rfq', 'done');

    updateStep('email', 'running');
    await new Promise((r) => setTimeout(r, 400));
    const href = generateSupplierNegotiationEmailHref(selected, reference, deadlineISO, isUSD);
    setArtifacts((prev) => [
      ...prev,
      {
        id: 'supplier-email',
        type: 'email',
        filename: 'Supplier negotiation email (draft)',
        description: 'supplier-partners@retailer.com',
        mailto_href: href,
      },
    ]);
    updateStep('email', 'done');

    updateStep('databricks', 'running');
    const query = MOCK_QUERIES.rfq_log(
      selected.map((s) => s.sku_id),
      reference
    );
    const op = await executeMockQuery(query, selected.length);
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
      `Send RFQ ${reference} to supplier-partners@retailer.com`,
      `Follow up if no response by ${deadlineISO}`,
      'Escalate to procurement leadership if suppliers decline',
      'RFQ status logged in Databricks procurement_rfqs',
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
      agentId="rfq-generator"
      agentName="RFQ generator"
      agentIcon="📄"
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
