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
    setPhase('approved');
  }

  async function handleApprove(selected: ProposalItem[]) {
    setPhase('executing');

    updateStep('xlsx', 'running');
    await new Promise((r) => setTimeout(r, 600));
    const blob = generatePriceChangeCSV(selected);
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
    const href = generateStoreOpsEmailHref(selected);
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

  return (
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
      onDismiss={handleDismiss}
    />
  );
}
