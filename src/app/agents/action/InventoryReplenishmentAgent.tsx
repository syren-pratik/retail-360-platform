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
  generatePOSpreadsheet,
  generateSupplierEmailHref,
} from '../lib/artifact-generator';
import { executeMockQuery, generateActionRef, MOCK_QUERIES } from '../lib/databricks-mock';

interface Props {
  core: PriceIntelCore;
}

const EVENT_NAME = 'Eid al-Adha';
const DAYS_TO_EVENT = 20;

function priorityFor(wos: number): 'high' | 'medium' | 'low' {
  if (wos < 1.5) return 'high';
  if (wos < 2.5) return 'medium';
  return 'low';
}

export default function InventoryReplenishmentAgent({ core }: Props) {
  const atRiskSkus = useMemo<PriceIntelSKU[]>(
    () =>
      core.skus
        .filter((s) => s.weeks_of_supply < 3)
        .sort((a, b) => a.weeks_of_supply - b.weeks_of_supply)
        .slice(0, 6),
    [core]
  );

  const initialProposals = useMemo<ProposalItem[]>(() => {
    return atRiskSkus.map((sku, i) => {
      const weeklyDemand = Math.round(800 + Math.random() * 400);
      const qty = Math.max(
        0,
        Math.round((DAYS_TO_EVENT / 7) * weeklyDemand * 1.45) -
          Math.round(sku.weeks_of_supply * weeklyDemand)
      );
      const valueL = parseFloat(((qty * (sku.cost_inr ?? 50)) / 100000).toFixed(1));
      const priority = priorityFor(sku.weeks_of_supply);
      return {
        id: `prop-${i}`,
        sku_id: sku.sku_id,
        product_name: sku.product_name,
        department: sku.department,
        metric_label: 'Weeks of supply',
        metric_value: `${sku.weeks_of_supply.toFixed(1)}w`,
        metric_urgent: sku.weeks_of_supply < 1.5,
        action_label: `Reorder ${qty.toLocaleString()} units`,
        value_inr: valueL,
        priority,
        selected: true,
        metadata: {
          reorder_qty: qty,
          weekly_demand: weeklyDemand,
          weeks_of_supply: sku.weeks_of_supply,
        },
      };
    });
  }, [atRiskSkus]);

  const [phase, setPhase] = useState<AgentWorkflowPhase>('idle');
  const [erpResults, setErpResults] = useState<ERPConnectionResult[]>([]);
  const [proposals, setProposals] = useState<ProposalItem[]>(initialProposals);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([
    { id: 'xlsx', label: 'Generating PO spreadsheet', icon: 'xlsx', status: 'pending' },
    { id: 'email', label: 'Drafting supplier email', icon: 'email', status: 'pending' },
    { id: 'databricks', label: 'Flagging SKUs in Databricks inventory_intent', icon: 'databricks', status: 'pending' },
    { id: 'notes', label: 'Writing category notes', icon: 'notes', status: 'pending' },
  ]);
  const [artifacts, setArtifacts] = useState<ArtifactResult[]>([]);
  const [databricksOps, setDatabricksOps] = useState<DatabricksOperation[]>([]);
  const [referenceNumber, setReferenceNumber] = useState<string | undefined>();
  const [nextSteps, setNextSteps] = useState<string[]>([]);

  const initialTrigger = `${atRiskSkus.length} SKUs at stockout risk · ${EVENT_NAME} in ${DAYS_TO_EVENT} days`;

  function updateStep(id: string, status: ExecutionStep['status']) {
    setExecutionSteps((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }

  async function startWorkflow() {
    setPhase('checking');
    setErpResults([]);
    await checkERPConnections((r) => {
      setErpResults((prev) => {
        // Replace 'checking' with final result if same system
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
    const anchorDate = core.anchor_date;

    // xlsx
    updateStep('xlsx', 'running');
    await new Promise((r) => setTimeout(r, 600));
    const blob = generatePOSpreadsheet(selected, EVENT_NAME, anchorDate);
    setArtifacts((prev) => [
      ...prev,
      {
        id: 'po-xlsx',
        type: 'xlsx',
        filename: `PO_${EVENT_NAME.replace(/\s+/g, '_')}_${anchorDate}.xlsx`,
        description: `${selected.length} SKUs · Purchase Orders + Instructions`,
        blob,
      },
    ]);
    updateStep('xlsx', 'done');

    // email
    updateStep('email', 'running');
    await new Promise((r) => setTimeout(r, 400));
    const href = generateSupplierEmailHref(selected, EVENT_NAME);
    setArtifacts((prev) => [
      ...prev,
      {
        id: 'supplier-email',
        type: 'email',
        filename: 'Supplier email (draft)',
        description: 'procurement@retailer.com',
        mailto_href: href,
      },
    ]);
    updateStep('email', 'done');

    // databricks
    updateStep('databricks', 'running');
    const op = await executeMockQuery(MOCK_QUERIES.inventory_replenishment, selected.length);
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

    // notes
    updateStep('notes', 'running');
    await new Promise((r) => setTimeout(r, 300));
    updateStep('notes', 'done');

    setReferenceNumber(generateActionRef());
    setNextSteps([
      'Send PO spreadsheet to procurement@retailer.com',
      'Confirm supplier acknowledgement within 24h',
      `Re-check stock status 7 days before ${EVENT_NAME}`,
      'Databricks flags will clear when POs are received',
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
      agentId="inventory-replenishment"
      agentName="Inventory replenishment"
      agentIcon="📦"
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
