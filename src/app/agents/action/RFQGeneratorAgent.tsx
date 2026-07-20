'use client';

import { useMemo, useState } from 'react';
import type { PriceIntelCore, PriceIntelSKU } from '@/app/lib/price-intel-types';
import type {
  ERPConnectionResult,
  ProposalItem,
  ExecutionStep,
  ArtifactResult,
  DatabricksOperation,
} from '@/app/agents/lib/action-types';
import AgentWorkflow, { type AgentWorkflowPhase } from '../components/AgentWorkflow';
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
    setPhase('approved');
  }

  async function handleApprove(selected: ProposalItem[]) {
    setPhase('executing');

    updateStep('rfq', 'running');
    await new Promise((r) => setTimeout(r, 700));
    const { blob, reference, deadlineISO } = generateRFQSpreadsheet(selected);
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
    const href = generateSupplierNegotiationEmailHref(selected, reference, deadlineISO);
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

  return (
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
      onDismiss={handleDismiss}
    />
  );
}
