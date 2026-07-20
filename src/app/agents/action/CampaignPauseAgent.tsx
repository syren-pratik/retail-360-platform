'use client';

import { useMemo, useState } from 'react';
import type { PriceIntelCore, PriceIntelCampaign } from '@/app/lib/price-intel-types';
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
    setPhase('approved');
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
