import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { executeQuery } from '@/app/lib/data-source';

// Initialize Anthropic client - supports both direct Anthropic and Azure AI Foundry
let anthropic: Anthropic | null = null;
let modelName = 'claude-sonnet-4-5-20250514';

try {
  if (process.env.ANTHROPIC_API_KEY) {
    if (process.env.AZURE_ENDPOINT) {
      anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseURL: process.env.AZURE_ENDPOINT,
      });
      modelName = process.env.AZURE_MODEL_NAME || 'claude-sonnet-4-5';
      console.log('Using Azure AI Foundry endpoint');
    } else {
      anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('Using direct Anthropic API');
    }
  }
} catch {
  console.warn('Failed to initialize Anthropic client');
}

// ============================================================================
// AGENTIC TOOLS DEFINITION
// ============================================================================

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'query_data',
    description: 'Run a SQL query against the retail database to fetch customer, sales, or forecast data. Use this when the user asks a question that requires data lookup.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sql: { type: 'string', description: 'The SQL query to execute. Use fully qualified table names (hive_metastore.schema.table).' },
        explanation: { type: 'string', description: 'Brief explanation of what this query does' },
      },
      required: ['sql', 'explanation'],
    },
  },
  {
    name: 'propose_chart_options',
    description: `Propose 2-3 chart visualization options for the user to choose from.
      ALWAYS use this instead of directly creating a chart.
      Each option should be a different chart type or axis configuration that makes sense for the data.
      Include a small data preview with each option so the user can see what it will look like.
      The user will select one, then you render the full chart.`,
    input_schema: {
      type: 'object' as const,
      properties: {
        question: { type: 'string', description: 'What the user asked — restated clearly' },
        data_summary: { type: 'string', description: 'Brief description of the data returned (e.g., "5 segments with churn rates ranging 8-34%")' },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              option_id: { type: 'string', description: 'A, B, or C' },
              chart_type: {
                type: 'string',
                enum: ['bar_chart', 'horizontal_bar', 'line_chart', 'area_chart', 'donut_chart', 'scatter_chart', 'stacked_bar', 'grouped_bar', 'heatmap', 'data_table', 'kpi_card', 'treemap'],
                description: 'Type of chart'
              },
              title: { type: 'string', description: 'Chart title' },
              description: { type: 'string', description: 'Why this visualization works for this data (1 sentence)' },
              axes: {
                type: 'object',
                properties: {
                  x: { type: 'string', description: 'What goes on X axis (or rows/slices)' },
                  y: { type: 'string', description: 'What goes on Y axis (or values)' },
                  color: { type: 'string', description: 'What determines color/grouping (optional)' },
                },
                description: 'Axis descriptions'
              },
              preview_data: {
                type: 'array',
                items: { type: 'object' },
                description: 'First 3-5 rows of data shaped for this chart type — enough for a meaningful mini preview'
              },
              full_data: {
                type: 'array',
                items: { type: 'object' },
                description: 'Complete data for this chart'
              },
              config: {
                type: 'object',
                properties: {
                  x_key: { type: 'string' },
                  y_key: { type: 'string' },
                  name_key: { type: 'string' },
                  value_key: { type: 'string' },
                  stack_key: { type: 'string' },
                  color_key: { type: 'string' },
                  columns: { type: 'array', items: { type: 'string' } },
                },
                description: 'Chart configuration'
              },
            },
            required: ['option_id', 'chart_type', 'title', 'description', 'axes', 'preview_data', 'full_data', 'config'],
          },
          description: '2-3 chart options to propose'
        },
      },
      required: ['question', 'data_summary', 'options'],
    },
  },
  {
    name: 'render_selected_chart',
    description: 'Render the full chart that the user selected from the proposed options. Only call this after the user has picked an option (e.g., "I\'ll go with Option A").',
    input_schema: {
      type: 'object' as const,
      properties: {
        option_id: { type: 'string', description: 'Which option the user selected (A, B, or C)' },
        chart_type: {
          type: 'string',
          enum: ['bar_chart', 'horizontal_bar', 'line_chart', 'area_chart', 'donut_chart', 'scatter_chart', 'stacked_bar', 'grouped_bar', 'heatmap', 'data_table', 'kpi_card', 'treemap'],
        },
        title: { type: 'string', description: 'Chart title' },
        data: { type: 'array', items: { type: 'object' }, description: 'Full data for the chart' },
        config: { type: 'object', description: 'Chart configuration' },
        insight: { type: 'string', description: 'A 1-2 sentence insight about what the data shows' },
      },
      required: ['option_id', 'chart_type', 'title', 'data', 'config'],
    },
  },
  {
    name: 'pin_to_dashboard',
    description: 'Pin a chart to the main dashboard so it persists. Use when the user says "pin this", "add to dashboard", "save this chart", or "keep this".',
    input_schema: {
      type: 'object' as const,
      properties: {
        chart_id: { type: 'string', description: 'ID of the chart to pin (from a previous create_chart call)' },
        section: { type: 'string', enum: ['top', 'after_kpis', 'after_churn', 'after_cohort', 'bottom'], description: 'Where on the dashboard to place it' },
        size: { type: 'string', enum: ['half', 'full'], description: 'Half width (50%) or full width' },
      },
      required: ['chart_id', 'section'],
    },
  },
  {
    name: 'create_segment',
    description: 'Create and save a customer segment based on filter rules. Use when the user describes a group of customers they want to target.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Segment name' },
        rules: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              operator: { type: 'string', enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in'] },
              value: {},
            },
          },
          description: 'Filter rules defining the segment'
        },
        description: { type: 'string', description: 'What this segment represents' },
      },
      required: ['name', 'rules'],
    },
  },
  {
    name: 'set_alert',
    description: 'Create a monitoring alert/rule that triggers when a metric crosses a threshold. Use when the user says "alert me", "notify me", "watch for", "monitor".',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Alert name' },
        metric: { type: 'string', description: 'What metric to monitor (e.g., "churn_rate", "clv_avg", "segment_size")' },
        condition: { type: 'string', enum: ['above', 'below', 'change_by'], description: 'Trigger condition' },
        threshold: { type: 'number', description: 'Threshold value' },
        segment_filter: { type: 'string', description: 'Optional: which segment to monitor (e.g., "Premium customers")' },
        frequency: { type: 'string', enum: ['daily', 'weekly', 'on_refresh'], description: 'How often to check' },
      },
      required: ['name', 'metric', 'condition', 'threshold'],
    },
  },
  {
    name: 'run_nba',
    description: 'Run Next-Best-Action analysis for a specific customer or a segment of customers. Use when the user asks "what should we do about X" or "recommend actions for Y".',
    input_schema: {
      type: 'object' as const,
      properties: {
        target_type: { type: 'string', enum: ['customer', 'segment'], description: 'Whether targeting a single customer or a segment' },
        target_id: { type: 'string', description: 'Customer ID or segment name' },
        max_customers: { type: 'number', description: 'For segments: max customers to analyze (default 10)' },
      },
      required: ['target_type', 'target_id'],
    },
  },
  {
    name: 'export_data',
    description: 'Generate a CSV export of data. Use when the user asks to "export", "download", "save as CSV", or "give me the data".',
    input_schema: {
      type: 'object' as const,
      properties: {
        data: { type: 'array', items: { type: 'object' }, description: 'Data to export' },
        filename: { type: 'string', description: 'Suggested filename (without extension)' },
        description: { type: 'string', description: 'What this export contains' },
      },
      required: ['data', 'filename'],
    },
  },
  {
    name: 'apply_dashboard_filter',
    description: 'Apply a filter to the main dashboard. Use when the user says "show me only Premium customers" or "filter to Mumbai stores" while looking at the dashboard.',
    input_schema: {
      type: 'object' as const,
      properties: {
        filter_type: { type: 'string', enum: ['segment', 'loyalty_tier', 'channel', 'store', 'department', 'clv_tier', 'churn_risk_tier'] },
        value: { type: 'string', description: 'Filter value to apply' },
        action: { type: 'string', enum: ['add', 'remove', 'reset_all'], description: 'Add filter, remove it, or reset all filters' },
      },
      required: ['filter_type', 'value', 'action'],
    },
  },
];

// ============================================================================
// AGENT SYSTEM PROMPT
// ============================================================================

function getSchemaForModule(module: string): string {
  if (module === 'demand') {
    return `
## Demand Forecasting Tables
- hive_metastore.retail_gold.gold_forecast_accuracy (department, sku_id, accuracy, mape, rmse, date)
- hive_metastore.retail_gold.gold_lost_sales (sku_id, product_name, lost_revenue, lost_units, cause, date)
- hive_metastore.retail_ml.forecast_output (sku_id, date, forecast, lower_bound, upper_bound, model)
- hive_metastore.retail_ml.feature_importance (model, feature_name, importance, department)
- hive_metastore.retail_gold.hourly_demand (store_id, hour_bucket, demand, day_of_week)
- hive_metastore.retail_gold.inventory_status (sku_id, stock_level, days_of_supply, status)
`;
  }

  return `
## CX360 Customer Tables
- hive_metastore.retail_gold.gold_customer_360 (customer_id, customer_segment, loyalty_tier, total_spend_lifetime, total_transactions, avg_basket_value, days_since_last_purchase, preferred_channel, top_category, city, store_id)
- hive_metastore.retail_ml.clv_scores (customer_id, clv_12m, clv_tier, purchase_frequency, recency_days, probability_alive)
- hive_metastore.retail_ml.churn_scores (customer_id, churn_probability_30d, churn_probability_60d, churn_probability_90d, churn_risk_tier)
- hive_metastore.retail_gold.cohort_retention (cohort_month, retention_month_1, retention_month_2, retention_month_3, retention_month_6)
- hive_metastore.retail_gold.segment_migration (from_segment, to_segment, customer_count, period)
`;
}

function getAgentSystemPrompt(module: string): string {
  return `You are an AI analytics AGENT for a retail CX360/Demand dashboard (Indian retail company).
You don't just answer questions — you TAKE ACTIONS on the dashboard using your available tools.

## Your Capabilities (Tools)

1. **query_data** — Run SQL against the retail database
2. **propose_chart_options** — Propose 2-3 chart options for the user to choose from
3. **render_selected_chart** — Render the chart the user selected
4. **pin_to_dashboard** — Add a chart to the main dashboard permanently
5. **create_segment** — Build and save a customer segment
6. **set_alert** — Create a monitoring rule (e.g., "alert if churn > 30%")
7. **run_nba** — Generate next-best-actions for a customer or segment
8. **export_data** — Generate a downloadable CSV
9. **apply_dashboard_filter** — Change the dashboard's active filters

## Chart Creation Protocol — MANDATORY

NEVER directly render a chart. ALWAYS propose options first.

Step 1: Query the data with query_data
Step 2: Call propose_chart_options with 2-3 visualization options
Step 3: STOP and wait for user selection
Step 4: After user selects (says "Option A", "I'll take the bar chart", etc.), render the full chart with render_selected_chart
Step 5: Offer pin/export/customize actions

CHOOSING GOOD OPTIONS — be thoughtful:
- Option A: The BEST chart type for this data (your top recommendation)
- Option B: An ALTERNATIVE perspective (different chart type showing different insight)
- Option C: Data table OR a more specialized view (optional, include if valuable)

PREVIEW DATA must be real — pull 3-5 rows from the query results.
Format numbers nicely: round percentages to 1 decimal, add ₹ for money, format large numbers with commas.

AXES MUST BE DESCRIPTIVE:
Bad: "X: segment, Y: value"
Good: "X: Customer Segment (Premium, Loyal, Regular, Occasional, New)"
        "Y: Average 90-day Churn Probability (%), range 8.1% to 34.2%"

WHEN DATA HAS A TIME DIMENSION:
- Always include a line/area chart option (shows trends)
- Always include a bar chart option (shows comparison at a point in time)

WHEN DATA IS CATEGORICAL:
- Bar chart for comparison
- Donut/pie for proportion (only if ≤6 categories)
- Table for detailed view

WHEN DATA IS TWO NUMERIC VARIABLES:
- Scatter plot for correlation
- Grouped bar for discrete comparison

EXCEPTION: If the user EXPLICITLY requests a specific chart type ("show me a bar chart of X"), still propose options but make their requested type Option A.
EXCEPTION: If the user says "just show me a table" or "give me the raw data", skip options and render the table directly.

## How to Behave

- When the user asks a data question → use query_data, then propose_chart_options
- When the user selects a chart option → use render_selected_chart
- When the user says "pin this" or "add to dashboard" → use pin_to_dashboard
- When the user describes a customer group → use create_segment
- When the user says "alert me" or "monitor" → use set_alert
- When the user asks "what should we do about X" → use run_nba
- When the user wants data exported → use export_data
- When the user says "show me only X" or "filter to Y" → use apply_dashboard_filter
- For casual/meta questions → respond conversationally without tools

## Multi-Step Workflows

You can chain tools. Examples:
- "Show me churn by segment" → query_data → propose_chart_options → WAIT
- When user says "Option A" → render_selected_chart
- If user then says "pin it" → pin_to_dashboard

## Database Schema

${getSchemaForModule(module)}

## Rules
- Always use fully qualified table names: hive_metastore.schema.table
- LIMIT SQL results to 500 rows max
- Use ₹ for all currency values (Indian Rupees)
- Be specific with numbers — never vague
- When proposing charts, make options genuinely different (not 3 variations of the same chart)
- The user should feel like they're choosing between different INSIGHTS, not just different chart skins
- When creating segments, use descriptive names
- If you need multiple tools, call them in sequence
- ALWAYS provide a text summary along with any tool actions
- Format large numbers in Indian notation (e.g., ₹1,23,456)
- When the user asks about what you can do, explain your agentic capabilities
`;
}

// ============================================================================
// TOOL EXECUTION FUNCTIONS
// ============================================================================

interface ToolResult {
  tool: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

interface ChartConfig {
  id: string;
  chart_type: string;
  title: string;
  data: unknown[];
  config: Record<string, unknown>;
  pinnable: boolean;
}

interface DashboardAction {
  type: 'pin_chart' | 'create_segment' | 'set_alert' | 'apply_filter' | 'download_csv' | 'show_nba';
  payload: Record<string, unknown>;
}

async function executeTool(toolName: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  switch (toolName) {
    case 'query_data':
      return await executeQueryTool(input as { sql: string; explanation: string });
    case 'propose_chart_options':
      return executeProposeChartOptionsTool(input);
    case 'render_selected_chart':
      return executeRenderSelectedChartTool(input);
    case 'pin_to_dashboard':
      return executePinTool(input as { chart_id: string; section: string; size?: string });
    case 'create_segment':
      return executeCreateSegmentTool(input);
    case 'set_alert':
      return executeSetAlertTool(input);
    case 'run_nba':
      return executeNBATool(input as { target_type: string; target_id: string; max_customers?: number });
    case 'export_data':
      return executeExportTool(input);
    case 'apply_dashboard_filter':
      return executeFilterTool(input as { filter_type: string; value: string; action: string });
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

async function executeQueryTool(input: { sql: string; explanation: string }): Promise<Record<string, unknown>> {
  try {
    const result = await executeQuery(input.sql);
    return {
      success: true,
      data: result.data,
      rowCount: result.data.length,
      source: result.source,
      executionTime: result.executionTime,
      explanation: input.explanation,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Query execution failed',
      sql: input.sql,
    };
  }
}

interface ChartOption {
  option_id: string;
  chart_type: string;
  title: string;
  description: string;
  axes: { x?: string; y?: string; color?: string };
  preview_data: unknown[];
  full_data: unknown[];
  config: Record<string, unknown>;
}

function executeProposeChartOptionsTool(input: Record<string, unknown>): Record<string, unknown> {
  const options = input.options as ChartOption[];
  return {
    success: true,
    type: 'chart_proposal',
    question: input.question,
    data_summary: input.data_summary,
    options: options.map(opt => ({
      ...opt,
      id: `opt_${opt.option_id}_${Date.now()}`,
    })),
  };
}

function executeRenderSelectedChartTool(input: Record<string, unknown>): Record<string, unknown> {
  const chartId = `chart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    success: true,
    type: 'rendered_chart',
    chart_id: chartId,
    chart: {
      id: chartId,
      chart_type: input.chart_type,
      title: input.title,
      data: input.data,
      config: input.config,
      pinnable: true,
    },
    insight: input.insight,
  };
}

function executePinTool(input: { chart_id: string; section: string; size?: string }): Record<string, unknown> {
  return {
    success: true,
    action: 'pin_chart',
    chartId: input.chart_id,
    section: input.section,
    size: input.size || 'half',
    message: 'Chart will be pinned to your dashboard',
  };
}

function executeCreateSegmentTool(input: Record<string, unknown>): Record<string, unknown> {
  const segmentId = `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    success: true,
    action: 'create_segment',
    segmentId,
    segment: {
      id: segmentId,
      name: input.name,
      rules: input.rules,
      description: input.description,
      createdAt: new Date().toISOString(),
    },
    message: `Segment "${input.name}" created`,
  };
}

function executeSetAlertTool(input: Record<string, unknown>): Record<string, unknown> {
  const alertId = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    success: true,
    action: 'set_alert',
    alertId,
    alert: {
      id: alertId,
      ...input,
      active: true,
      createdAt: new Date().toISOString(),
    },
    message: `Alert "${input.name}" will trigger when ${input.metric} goes ${input.condition} ${input.threshold}`,
  };
}

function executeNBATool(input: { target_type: string; target_id: string; max_customers?: number }): Record<string, unknown> {
  return {
    success: true,
    action: 'show_nba',
    targetType: input.target_type,
    targetId: input.target_id,
    maxCustomers: input.max_customers || 10,
    message: input.target_type === 'customer'
      ? `Generating actions for customer ${input.target_id}`
      : `Generating actions for segment: ${input.target_id}`,
  };
}

function executeExportTool(input: Record<string, unknown>): Record<string, unknown> {
  return {
    success: true,
    action: 'download_csv',
    data: input.data,
    filename: `${input.filename}.csv`,
    description: input.description,
    message: `Export ready: ${input.filename}.csv`,
  };
}

function executeFilterTool(input: { filter_type: string; value: string; action: string }): Record<string, unknown> {
  return {
    success: true,
    action: 'apply_filter',
    filterType: input.filter_type,
    value: input.value,
    filterAction: input.action,
    message: input.action === 'reset_all'
      ? 'All filters cleared'
      : `Filter applied: ${input.filter_type} = ${input.value}`,
  };
}

function extractActions(toolResults: ToolResult[]): DashboardAction[] {
  const actions: DashboardAction[] = [];

  for (const result of toolResults) {
    if (result.output.action) {
      actions.push({
        type: result.output.action as DashboardAction['type'],
        payload: result.output,
      });
    }
  }

  return actions;
}

// ============================================================================
// DASHBOARD CONTEXT
// ============================================================================

interface DashboardContext {
  filters: {
    segments: string[];
    loyaltyTiers: string[];
    channel: string;
    dateRange: [string, string];
  };
  drilldowns: Array<{ chartId: string; value: string }>;
  currentPage: 'dashboard' | 'customer-detail';
  customerId?: string;
}

function buildContextualMessage(message: string, module: string, context?: DashboardContext): string {
  const parts: string[] = [];

  if (context) {
    parts.push('[Current Dashboard Context]');
    parts.push(`Module: ${module}`);
    parts.push(`Page: ${context.currentPage}`);

    if (context.filters?.segments?.length > 0) {
      parts.push(`Active segment filter: ${context.filters.segments.join(', ')}`);
    }
    if (context.filters?.loyaltyTiers?.length > 0) {
      parts.push(`Active loyalty tier filter: ${context.filters.loyaltyTiers.join(', ')}`);
    }
    if (context.filters?.channel && context.filters.channel !== 'all') {
      parts.push(`Active channel filter: ${context.filters.channel}`);
    }
    if (context.drilldowns?.length > 0) {
      parts.push(`Active drilldowns: ${context.drilldowns.map(d => `${d.chartId}=${d.value}`).join(', ')}`);
    }
    if (context.customerId) {
      parts.push(`Currently viewing customer: ${context.customerId}`);
    }
    parts.push('[End Context]');
    parts.push('');
  }

  parts.push(`User request: ${message}`);

  return parts.join('\n');
}

// ============================================================================
// MOCK RESPONSES (fallback when API unavailable)
// ============================================================================

interface ChartProposal {
  question: string;
  data_summary: string;
  options: Array<{
    option_id: string;
    chart_type: string;
    title: string;
    description: string;
    axes: { x?: string; y?: string; color?: string };
    preview_data: unknown[];
    full_data: unknown[];
    config: Record<string, unknown>;
  }>;
}

function getMockAgentResponse(message: string, module: string): {
  answer: string;
  toolResults: ToolResult[];
  chartsCreated: ChartConfig[];
  chartProposal?: ChartProposal;
  actions: DashboardAction[];
} {
  const lowerMessage = message.toLowerCase();

  // Handle capability questions
  if (lowerMessage.includes('what can you do') || lowerMessage.includes('help') || lowerMessage.includes('capabilities')) {
    return {
      answer: `I'm an AI analytics **agent** that can take actions on your dashboard, not just answer questions. Here's what I can do:

**Data & Visualization**
- Query your customer/sales data using natural language
- Create charts (bar, line, donut, tables, KPIs)
- Pin charts to your dashboard for permanent access

**Customer Actions**
- Create and save customer segments based on rules
- Run Next-Best-Action analysis for customers or segments
- Export data as CSV files

**Monitoring**
- Set up alerts when metrics cross thresholds
- Filter the dashboard to specific segments

**Try asking:**
- "Show me churn by segment and pin it to the dashboard"
- "Create a segment of high-value churning customers"
- "Alert me if Premium churn goes above 25%"
- "What should we do about customer CUS-00001234?"`,
      toolResults: [],
      chartsCreated: [],
      actions: [],
    };
  }

  // Handle churn query with chart proposal
  if (lowerMessage.includes('churn') && (lowerMessage.includes('segment') || lowerMessage.includes('by'))) {
    const chartData = [
      { segment: 'Occasional', churn_rate: 0.342, customer_count: 12400 },
      { segment: 'New', churn_rate: 0.287, customer_count: 8200 },
      { segment: 'Regular', churn_rate: 0.183, customer_count: 15100 },
      { segment: 'Loyal', churn_rate: 0.113, customer_count: 9800 },
      { segment: 'Premium', churn_rate: 0.081, customer_count: 4500 },
    ];

    const chartProposal = {
      question: 'Show churn analysis by customer segment',
      data_summary: '5 customer segments with churn rates ranging from 8.1% to 34.2%',
      options: [
        {
          option_id: 'A',
          chart_type: 'bar_chart',
          title: 'Churn Rate by Customer Segment',
          description: 'Best for comparing churn rates side by side across all segments',
          axes: {
            x: 'Customer Segment (Premium, Loyal, Regular, Occasional, New)',
            y: 'Average 90-day Churn Probability (%), range 8.1% to 34.2%',
          },
          preview_data: chartData.slice(0, 3),
          full_data: chartData,
          config: { x_key: 'segment', y_key: 'churn_rate' },
        },
        {
          option_id: 'B',
          chart_type: 'donut_chart',
          title: 'Customer Distribution by Churn Risk',
          description: 'Shows proportion of customers in each segment — useful for understanding risk exposure',
          axes: {
            x: 'Segment (slices)',
            y: 'Customer Count',
          },
          preview_data: chartData.slice(0, 3),
          full_data: chartData,
          config: { name_key: 'segment', value_key: 'customer_count' },
        },
        {
          option_id: 'C',
          chart_type: 'data_table',
          title: 'Segment Churn Details',
          description: 'Full breakdown with exact numbers — see all metrics at a glance',
          axes: {
            x: 'Rows: Each segment',
            y: 'Columns: Churn rate, Customer count',
          },
          preview_data: chartData.slice(0, 3),
          full_data: chartData,
          config: { columns: ['segment', 'churn_rate', 'customer_count'] },
        },
      ],
    };

    return {
      answer: `I found the data! Here are **3 ways** to visualize churn by segment. Each shows a different perspective:\n\n**Data summary:** ${chartProposal.data_summary}\n\nSelect the visualization that works best for you:`,
      toolResults: [
        {
          tool: 'query_data',
          input: { sql: 'SELECT segment, AVG(churn_prob_90d) as churn_rate, COUNT(*) as customer_count FROM customers GROUP BY segment' },
          output: { success: true, data: chartData, rowCount: 5, source: 'mock' },
        },
        {
          tool: 'propose_chart_options',
          input: chartProposal,
          output: { success: true, type: 'chart_proposal', ...chartProposal },
        },
      ],
      chartsCreated: [],
      chartProposal,
      actions: [],
    };
  }

  // Handle chart option selection
  if (lowerMessage.includes('option a') || lowerMessage.includes('bar chart') || lowerMessage.includes('option b') || lowerMessage.includes('donut') || lowerMessage.includes('option c') || lowerMessage.includes('table')) {
    const chartId = `chart_${Date.now()}_mock`;
    let chartType = 'bar_chart';
    let title = 'Churn Rate by Customer Segment';
    let config: Record<string, unknown> = { x_key: 'segment', y_key: 'churn_rate' };

    if (lowerMessage.includes('option b') || lowerMessage.includes('donut')) {
      chartType = 'donut_chart';
      title = 'Customer Distribution by Segment';
      config = { name_key: 'segment', value_key: 'customer_count' };
    } else if (lowerMessage.includes('option c') || lowerMessage.includes('table')) {
      chartType = 'data_table';
      title = 'Segment Churn Details';
      config = { columns: ['segment', 'churn_rate', 'customer_count'] };
    }

    const chartData = [
      { segment: 'Occasional', churn_rate: 0.342, customer_count: 12400 },
      { segment: 'New', churn_rate: 0.287, customer_count: 8200 },
      { segment: 'Regular', churn_rate: 0.183, customer_count: 15100 },
      { segment: 'Loyal', churn_rate: 0.113, customer_count: 9800 },
      { segment: 'Premium', churn_rate: 0.081, customer_count: 4500 },
    ];

    const chart: ChartConfig = {
      id: chartId,
      chart_type: chartType,
      title,
      data: chartData,
      config,
      pinnable: true,
    };

    return {
      answer: `Here's your **${title}**!\n\n**Key insight:** Occasional shoppers have the highest churn at 34.2%, followed by New customers at 28.7%. Premium customers are most loyal with only 8.1% churn.\n\nYou can now: Pin to dashboard • Export CSV • Customize`,
      toolResults: [
        {
          tool: 'render_selected_chart',
          input: { chart_type: chartType, title, data: chartData, config },
          output: { success: true, type: 'rendered_chart', chart_id: chartId, chart },
        },
      ],
      chartsCreated: [chart],
      actions: [],
    };
  }

  // Handle pin request
  if (lowerMessage.includes('pin') && (lowerMessage.includes('dashboard') || lowerMessage.includes('this'))) {
    return {
      answer: `**Chart pinned to dashboard!**

The chart has been added to your CX360 dashboard in the "After KPIs" section. You can:
- View it anytime on the main dashboard
- Refresh it to get latest data
- Unpin it when no longer needed`,
      toolResults: [
        {
          tool: 'pin_to_dashboard',
          input: { chart_id: 'last_chart', section: 'after_kpis', size: 'half' },
          output: { success: true, action: 'pin_chart', section: 'after_kpis', message: 'Chart pinned' },
        },
      ],
      chartsCreated: [],
      actions: [{ type: 'pin_chart', payload: { section: 'after_kpis', size: 'half' } }],
    };
  }

  // Handle segment creation
  if (lowerMessage.includes('segment') && (lowerMessage.includes('create') || lowerMessage.includes('high-value') || lowerMessage.includes('at risk'))) {
    const segmentId = `seg_${Date.now()}_mock`;
    return {
      answer: `**Segment Created: "High-Value At-Risk Customers"**

**Definition:**
- CLV ≥ ₹50,000
- Churn Risk = High or Critical
- Days Since Last Purchase > 30

**Preview:** ~247 customers match these criteria
**Total CLV at Risk:** ₹12.4L

Would you like me to:
- Show the customer list
- Run Next-Best-Actions for this segment
- Export the segment`,
      toolResults: [
        {
          tool: 'create_segment',
          input: {
            name: 'High-Value At-Risk Customers',
            rules: [
              { field: 'clv_12m', operator: 'gte', value: 50000 },
              { field: 'churn_risk_tier', operator: 'in', value: ['High', 'Critical'] },
            ],
          },
          output: { success: true, action: 'create_segment', segmentId, customerCount: 247 },
        },
      ],
      chartsCreated: [],
      actions: [{ type: 'create_segment', payload: { segmentId, name: 'High-Value At-Risk Customers', customerCount: 247 } }],
    };
  }

  // Handle alert creation
  if (lowerMessage.includes('alert') || lowerMessage.includes('notify') || lowerMessage.includes('monitor')) {
    const alertId = `alert_${Date.now()}_mock`;
    return {
      answer: `**Alert Created: "Premium Churn Warning"**

**Trigger:** When churn rate for Premium segment goes **above 25%**
**Check Frequency:** On every data refresh
**Status:** Active

You'll be notified when this threshold is crossed. Manage alerts in Settings.`,
      toolResults: [
        {
          tool: 'set_alert',
          input: {
            name: 'Premium Churn Warning',
            metric: 'churn_rate',
            condition: 'above',
            threshold: 0.25,
            segment_filter: 'Premium',
            frequency: 'on_refresh',
          },
          output: { success: true, action: 'set_alert', alertId },
        },
      ],
      chartsCreated: [],
      actions: [{ type: 'set_alert', payload: { alertId, name: 'Premium Churn Warning' } }],
    };
  }

  // Handle filter request
  if (lowerMessage.includes('filter') || lowerMessage.includes('show only') || lowerMessage.includes('show me only')) {
    let filterValue = 'Premium';
    if (lowerMessage.includes('loyal')) filterValue = 'Loyal';
    if (lowerMessage.includes('online')) filterValue = 'Online';
    if (lowerMessage.includes('mumbai')) filterValue = 'Mumbai';

    return {
      answer: `**Dashboard filtered to ${filterValue}**

All charts and metrics now reflect only ${filterValue} data. Clear filters using the chips at the top of the dashboard or ask me to "reset filters".`,
      toolResults: [
        {
          tool: 'apply_dashboard_filter',
          input: { filter_type: 'segment', value: filterValue, action: 'add' },
          output: { success: true, action: 'apply_filter', filterType: 'segment', value: filterValue },
        },
      ],
      chartsCreated: [],
      actions: [{ type: 'apply_filter', payload: { filterType: 'segment', value: filterValue } }],
    };
  }

  // Handle NBA request
  if (lowerMessage.includes('recommend') || lowerMessage.includes('what should') || lowerMessage.includes('action') || lowerMessage.includes('nba')) {
    return {
      answer: `**Next Best Actions Generated**

I'll analyze the target customers and generate personalized recommendations. The actions will appear in the panel below with:
- Priority ranking (1-3)
- Specific offers and channels
- Expected impact
- Execute/Skip buttons

Processing your request...`,
      toolResults: [
        {
          tool: 'run_nba',
          input: { target_type: 'segment', target_id: 'High-Value At-Risk', max_customers: 10 },
          output: { success: true, action: 'show_nba', targetType: 'segment', targetId: 'High-Value At-Risk' },
        },
      ],
      chartsCreated: [],
      actions: [{ type: 'show_nba', payload: { targetType: 'segment', targetId: 'High-Value At-Risk' } }],
    };
  }

  // Handle export request
  if (lowerMessage.includes('export') || lowerMessage.includes('download') || lowerMessage.includes('csv')) {
    return {
      answer: `**Export Ready**

Downloading: **customer_analysis.csv**
Contains: 500 customer records with CLV, churn risk, and segment data.

The file will download automatically.`,
      toolResults: [
        {
          tool: 'export_data',
          input: { filename: 'customer_analysis', data: [], description: 'Customer analysis export' },
          output: { success: true, action: 'download_csv', filename: 'customer_analysis.csv' },
        },
      ],
      chartsCreated: [],
      actions: [{ type: 'download_csv', payload: { filename: 'customer_analysis.csv' } }],
    };
  }

  // Default response
  return {
    answer: `I can help you analyze your ${module === 'demand' ? 'demand forecasting' : 'customer'} data and take actions on your dashboard.

**Try asking me to:**
- "Show churn by segment" (data query + chart)
- "Pin that to the dashboard" (persist a chart)
- "Create a segment of high-value churning customers" (save a segment)
- "Alert me if Premium churn goes above 25%" (set monitoring)
- "What should we do about the at-risk customers?" (get recommendations)
- "Filter to Online customers only" (change dashboard view)
- "Export the top 50 customers by CLV" (download data)

*Note: AI agent is running in demo mode.*`,
    toolResults: [],
    chartsCreated: [],
    actions: [],
  };
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  let userMessage = '';
  let currentModule = 'cx360';

  try {
    const body = await request.json();
    const { message, history = [], module = 'cx360', context } = body as {
      message: string;
      history: Array<{ role: string; content: string }>;
      module?: string;
      context?: DashboardContext;
    };
    userMessage = message || '';
    currentModule = module;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // If no valid API key or client, return mock agent response
    if (!process.env.ANTHROPIC_API_KEY || !anthropic) {
      console.log('No API key configured, returning mock agent response');
      const mockResponse = getMockAgentResponse(message, currentModule);
      return NextResponse.json({
        ...mockResponse,
        source: 'mock' as const,
      });
    }

    // Build messages array with context
    const messages: Anthropic.MessageParam[] = [
      // Include last 10 messages from history
      ...history.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: buildContextualMessage(message, currentModule, context) },
    ];

    // First Claude call with tools
    let response;
    try {
      response = await anthropic.messages.create({
        model: modelName,
        max_tokens: 4096,
        system: getAgentSystemPrompt(currentModule),
        tools: TOOLS,
        messages,
      });
    } catch (apiError) {
      console.error('Anthropic API error:', apiError);
      const mockResponse = getMockAgentResponse(message, currentModule);
      return NextResponse.json({ ...mockResponse, source: 'mock' as const });
    }

    // Tool use loop — process tool calls iteratively
    const toolResults: ToolResult[] = [];
    const chartsCreated: ChartConfig[] = [];
    let chartProposal: ChartProposal | undefined;
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (response.stop_reason === 'tool_use' && iterations < MAX_ITERATIONS) {
      iterations++;

      // Find tool use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      );

      // Execute each tool
      const toolResultMessages: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);

        // Track chart proposals
        if (toolUse.name === 'propose_chart_options' && result.success) {
          chartProposal = {
            question: result.question as string,
            data_summary: result.data_summary as string,
            options: result.options as ChartProposal['options'],
          };
        }

        // Track rendered charts
        if (toolUse.name === 'render_selected_chart' && result.chart) {
          chartsCreated.push(result.chart as ChartConfig);
        }

        toolResultMessages.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });

        toolResults.push({
          tool: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
          output: result,
        });
      }

      // Send tool results back to Claude for next step
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResultMessages });

      try {
        response = await anthropic.messages.create({
          model: modelName,
          max_tokens: 4096,
          system: getAgentSystemPrompt(currentModule),
          tools: TOOLS,
          messages,
        });
      } catch (apiError) {
        console.error('Anthropic API error in tool loop:', apiError);
        break;
      }
    }

    // Extract final text response
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    const finalText = textBlocks.map((block) => block.text).join('\n');

    // Build response for frontend
    return NextResponse.json({
      answer: finalText,
      toolResults,
      chartsCreated,
      chartProposal,
      actions: extractActions(toolResults),
      source: 'claude' as const,
    });
  } catch (error) {
    console.error('Chat API error:', error);

    // Fallback to mock response
    const mockResponse = getMockAgentResponse(userMessage, currentModule);
    return NextResponse.json({ ...mockResponse, source: 'mock' as const });
  }
}
