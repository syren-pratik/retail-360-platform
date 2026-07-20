export type ERPSystem = 'SAP ERP' | 'Oracle NetSuite' | 'Tally Prime' | 'Microsoft Dynamics' | 'Zoho Books';
export type ConnectionStatus = 'checking' | 'connected' | 'failed' | 'skipped';

export interface ERPConnectionResult {
  system: ERPSystem;
  status: ConnectionStatus;
  error?: string;
  latency_ms?: number;
}

export type WorkflowStep = 'system-check' | 'proposal' | 'execution' | 'complete';

export interface ProposalItem {
  id: string;
  sku_id: string;
  product_name: string;
  department: string;
  metric_label: string;
  metric_value: string;
  metric_urgent: boolean;
  action_label: string;
  value_inr: number;
  priority: 'high' | 'medium' | 'low';
  selected: boolean;
  metadata: Record<string, string | number>;
}

export interface ArtifactResult {
  id: string;
  type: 'xlsx' | 'email' | 'pdf' | 'csv';
  filename: string;
  description: string;
  blob?: Blob;
  mailto_href?: string;
  size_label?: string;
}

export interface ExecutionStep {
  id: string;
  label: string;
  icon: string;
  status: 'pending' | 'running' | 'done' | 'failed';
}

export interface DatabricksOperation {
  query: string;
  query_id: string;
  rows_affected: number;
  duration_ms: number;
}

export interface ActionAgentResult {
  agent_id: string;
  step: WorkflowStep;
  erp_checks?: ERPConnectionResult[];
  fallback_ready?: boolean;
  fallback_items?: string[];
  proposals?: ProposalItem[];
  proposal_total_inr?: number;
  proposal_summary?: string;
  execution_steps?: ExecutionStep[];
  artifacts?: ArtifactResult[];
  databricks_ops?: DatabricksOperation[];
  reference_number?: string;
  next_steps?: string[];
}
