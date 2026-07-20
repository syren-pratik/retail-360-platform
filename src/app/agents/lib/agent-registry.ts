// Central definition of all agents. No external dependencies — pure data.

export type AgentInputType = 'form' | 'chat' | 'oneclick';
export type AgentModule = 'pricing' | 'clearance' | 'demand';

export interface AgentParam {
  id: string;
  label: string;
  type: 'select' | 'slider' | 'multiselect' | 'textarea';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  default_value?: string | number;
  required: boolean;
  // 'dynamic' means populated at runtime from core data
  options_source?: 'skus' | 'categories' | 'markdown_queue' | 'departments';
}

export interface AgentDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  module: AgentModule;
  input_type: AgentInputType;
  icon: string;           // emoji
  color: string;          // tailwind bg class
  avg_seconds: number;
  api_route: string;      // the POST endpoint
  params?: AgentParam[];
  chat_placeholder?: string;
  example_prompt?: string;
  is_action_agent?: boolean;
}

export const AGENT_REGISTRY: AgentDefinition[] = [

  // ── PRICING ──────────────────────────────────────────────────────
  {
    id: 'promo-scenario',
    name: 'Promo scenario',
    tagline: 'Simulate ROI before you run a promotion',
    description: 'Model expected ROI, free-rider waste, and cannibalization for any promotion before approving it.',
    module: 'pricing',
    input_type: 'form',
    icon: '📊',
    color: 'bg-blue-50',
    avg_seconds: 30,
    api_route: '/api/agents/run',
    params: [
      {
        id: 'sku_id',
        label: 'SKU',
        type: 'select',
        placeholder: 'Search SKUs...',
        required: true,
        options_source: 'skus',
      },
      {
        id: 'discount_pct',
        label: 'Discount depth',
        type: 'slider',
        min: 5,
        max: 40,
        step: 5,
        default_value: 15,
        required: true,
      },
      {
        id: 'duration_days',
        label: 'Duration',
        type: 'select',
        options: [
          { value: '7', label: '7 days' },
          { value: '14', label: '14 days' },
          { value: '21', label: '21 days' },
          { value: '28', label: '28 days' },
        ],
        default_value: '14',
        required: true,
      },
      {
        id: 'mechanic',
        label: 'Mechanic',
        type: 'select',
        options: [
          { value: 'pct_off', label: '% Off MRP' },
          { value: 'bogo', label: 'BOGO' },
          { value: 'bundle', label: 'Bundle' },
          { value: 'multipack', label: 'Multipack' },
          { value: 'cashback', label: 'Cashback' },
        ],
        default_value: 'pct_off',
        required: true,
      },
      {
        id: 'target_segment',
        label: 'Target segment',
        type: 'select',
        options: [
          { value: 'all', label: 'All customers' },
          { value: 'loyal_core', label: 'Loyal core' },
          { value: 'elastic_switchers', label: 'Elastic switchers' },
          { value: 'new_to_brand', label: 'New-to-brand' },
        ],
        default_value: 'all',
        required: false,
      },
    ],
  },

  {
    id: 'price-strategy',
    name: 'Price strategy',
    tagline: "Get a quarter's pricing strategy for any category",
    description: 'Elasticity-based strategy covering base prices, promo calendar, event prep, and margin optimization.',
    module: 'pricing',
    input_type: 'form',
    icon: '🎯',
    color: 'bg-emerald-50',
    avg_seconds: 35,
    api_route: '/api/agents/run',
    params: [
      {
        id: 'category',
        label: 'Category',
        type: 'select',
        placeholder: 'Select category...',
        required: true,
        options_source: 'categories',
      },
      {
        id: 'horizon',
        label: 'Planning horizon',
        type: 'select',
        options: [
          { value: 'next_4w', label: 'Next 4 weeks' },
          { value: 'next_8w', label: 'Next 8 weeks' },
          { value: 'q3_2026', label: 'Q3 2026' },
          { value: 'q4_2026', label: 'Q4 2026' },
        ],
        default_value: 'q3_2026',
        required: true,
      },
      {
        id: 'objective',
        label: 'Primary objective',
        type: 'select',
        options: [
          { value: 'margin', label: 'Maximize margin' },
          { value: 'volume', label: 'Maximize volume' },
          { value: 'balance', label: 'Balance margin + volume' },
          { value: 'market_share', label: 'Protect market share' },
        ],
        default_value: 'balance',
        required: true,
      },
    ],
  },

  {
    id: 'competitive-response',
    name: 'Competitive response',
    tagline: 'Should I match that price cut?',
    description: "Describe a competitor's move. Get Kotler-framework analysis: why they moved, impact if you don't respond, and which of 3 responses is optimal.",
    module: 'pricing',
    input_type: 'chat',
    icon: '🔔',
    color: 'bg-rose-50',
    avg_seconds: 25,
    api_route: '/api/agents/run',
    chat_placeholder: "Describe the competitor's move...",
    example_prompt: 'BigBazaar dropped Saffola Gold 5L from ₹890 to ₹799 this week',
  },

  {
    id: 'margin-leak',
    name: 'Margin leak investigator',
    tagline: 'Why did our margin drop this week?',
    description: 'Traces margin leakage back to specific campaigns, SKUs, and decisions. Ranks root causes by ₹ impact.',
    module: 'pricing',
    input_type: 'oneclick',
    icon: '🔍',
    color: 'bg-amber-50',
    avg_seconds: 30,
    api_route: '/api/agents/run',
  },

  // ── CLEARANCE ─────────────────────────────────────────────────────
  {
    id: 'markdown-timing',
    name: 'Markdown timing',
    tagline: 'When and how deep to mark down slow SKUs',
    description: 'Models sell-through velocity for selected SKUs. Finds optimal markdown depth and timing to avoid write-offs without unnecessary margin loss.',
    module: 'clearance',
    input_type: 'form',
    icon: '📉',
    color: 'bg-orange-50',
    avg_seconds: 30,
    api_route: '/api/agents/run',
    params: [
      {
        id: 'sku_ids',
        label: 'SKUs to analyze',
        type: 'multiselect',
        placeholder: 'Select from markdown queue...',
        required: true,
        options_source: 'markdown_queue',
      },
      {
        id: 'days_remaining',
        label: 'Days remaining in season',
        type: 'slider',
        min: 7,
        max: 60,
        step: 1,
        default_value: 28,
        required: true,
      },
    ],
  },

  {
    id: 'weekly-briefing',
    name: 'Weekly briefing',
    tagline: 'Your Monday morning pricing brief',
    description: "Auto-generates a structured briefing: what changed, what worked, decisions needed this week, what's coming.",
    module: 'clearance',
    input_type: 'oneclick',
    icon: '📋',
    color: 'bg-violet-50',
    avg_seconds: 40,
    api_route: '/api/agents/run',
  },

  // ── DEMAND ────────────────────────────────────────────────────────
  {
    id: 'event-readiness',
    name: 'Event readiness',
    tagline: 'Are we ready for the next major event?',
    description: 'Checks all SKUs against the next high-significance event. Returns readiness score, not-ramped SKUs ranked by revenue at risk, and a reorder plan.',
    module: 'demand',
    input_type: 'oneclick',
    icon: '🎉',
    color: 'bg-teal-50',
    avg_seconds: 30,
    api_route: '/api/agents/run',
  },

  {
    id: 'demand-anomaly',
    name: 'Demand anomaly',
    tagline: 'Real signal or data issue?',
    description: 'Distinguishes genuine demand signals from data quality issues. Returns verdict with confidence % and recommended action.',
    module: 'demand',
    input_type: 'chat',
    icon: '📦',
    color: 'bg-indigo-50',
    avg_seconds: 25,
    api_route: '/api/agents/run',
    chat_placeholder: 'Describe what you observed...',
    example_prompt: 'Beverages sales jumped 34% this week — is this real demand or a data issue?',
  },

  // ── ACTION AGENTS ─────────────────────────────────────────────────
  {
    id: 'inventory-replenishment',
    name: 'Inventory Replenishment',
    tagline: 'Reorder before you stock out',
    description: 'Detects SKUs at stockout risk ahead of the next major event. Checks ERP, proposes reorder quantities for approval, then generates PO spreadsheets, drafts supplier emails, and sets reorder flags in Databricks.',
    module: 'demand',
    input_type: 'oneclick',
    icon: '📦',
    color: 'bg-emerald-50',
    avg_seconds: 15,
    api_route: '/api/agents/action/inventory-replenishment',
    is_action_agent: true,
    params: [],
  },
  {
    id: 'price-change-execution',
    name: 'Price Change Execution',
    tagline: 'Push approved price changes to POS tomorrow',
    description: 'Batches approved high-priority price changes. Generates POS-ready price files, drafts store operations emails, stages changes in the Databricks price master, and creates a compliance checklist.',
    module: 'pricing',
    input_type: 'oneclick',
    icon: '⚡',
    color: 'bg-violet-50',
    avg_seconds: 12,
    api_route: '/api/agents/action/price-change',
    is_action_agent: true,
    params: [],
  },
  {
    id: 'campaign-pause',
    name: 'Campaign pause',
    tagline: 'Pause campaigns wasting spend on free riders',
    description: 'Detects live campaigns where free-rider ratio exceeds 50%. Drafts a formal pause memo, notifies the promo team, and updates campaign status in Databricks.',
    module: 'pricing',
    input_type: 'oneclick',
    icon: '⏸️',
    color: 'bg-rose-50',
    avg_seconds: 15,
    api_route: '/api/agents/action/campaign-pause',
    is_action_agent: true,
    params: [],
  },
  {
    id: 'markdown-execution',
    name: 'Markdown execution',
    tagline: 'Push markdowns to POS before write-off risk hits',
    description: 'Finds urgent slow-moving SKUs, generates POS-ready markdown instructions plus WhatsApp templates for store managers, and approves the events in Databricks.',
    module: 'clearance',
    input_type: 'oneclick',
    icon: '🏷️',
    color: 'bg-orange-50',
    avg_seconds: 12,
    api_route: '/api/agents/action/markdown-execution',
    is_action_agent: true,
    params: [],
  },
  {
    id: 'rfq-generator',
    name: 'RFQ generator',
    tagline: 'Request revised supplier terms when margin compresses',
    description: 'Identifies SKUs where supplier costs are squeezing margin, generates a formal RFQ spreadsheet, drafts a supplier negotiation email, and logs the RFQ in Databricks procurement_rfqs.',
    module: 'pricing',
    input_type: 'oneclick',
    icon: '📄',
    color: 'bg-sky-50',
    avg_seconds: 10,
    api_route: '/api/agents/action/rfq-generator',
    is_action_agent: true,
    params: [],
  },
  {
    id: 'weekly-distribution',
    name: 'Weekly distribution',
    tagline: 'Auto-generate and distribute your Monday brief',
    description: 'Generates a 3-sheet weekly pricing brief, drafts a leadership email, prepares a 160-char VP WhatsApp summary, and logs the distribution in Databricks weekly_briefs.',
    module: 'clearance',
    input_type: 'oneclick',
    icon: '📬',
    color: 'bg-teal-50',
    avg_seconds: 18,
    api_route: '/api/agents/action/weekly-distribution',
    is_action_agent: true,
    params: [],
  },
];

export const AGENTS_BY_MODULE = {
  pricing:   AGENT_REGISTRY.filter(a => a.module === 'pricing'),
  clearance: AGENT_REGISTRY.filter(a => a.module === 'clearance'),
  demand:    AGENT_REGISTRY.filter(a => a.module === 'demand'),
};

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENT_REGISTRY.find(a => a.id === id);
}
