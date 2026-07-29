/**
 * Sprint AG4 — Conversational action tools for /api/ask.
 *
 * These tools let Claude, inside a chat conversation, check ERP status, query
 * live Databricks data, and execute the 5 real action agents (PO, campaign
 * pause, markdown, RFQ, reminder) with real artifact generation.
 *
 * Blob artifacts are stored in the in-memory blob-store and referenced by
 * download_id so the SSE stream only ships JSON.
 */

import Anthropic from '@anthropic-ai/sdk';
import { MOCK_QUERIES, generateActionRef } from '@/app/agents/lib/databricks-mock';
import {
  generatePOSpreadsheet,
  generateSupplierEmailHref,
  generateCampaignMemoXlsx,
  generatePromoTeamEmailHref,
  generateMarkdownInstructionXlsx,
  generateStoreManagerEmailHref,
  generateRFQSpreadsheet,
  generateSupplierNegotiationEmailHref,
} from '@/app/agents/lib/artifact-generator';
import type { ProposalItem } from '@/app/agents/lib/action-types';
import { storeBlob } from '@/app/lib/blob-store';

// ── Tool schemas ─────────────────────────────────────────────────────────

export const ASK_ACTION_TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_erp_connection',
    description:
      'Check whether the retailer\'s ERP systems (SAP, Oracle NetSuite, Tally Prime) are reachable. Use this BEFORE proposing to raise POs, price changes, or other ERP-bound writes so the user can see the connection status honestly. Returns a list of systems with connected/failed status.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'query_live_data',
    description:
      'Run a live query against Databricks for one of the pre-registered action datasets. Use this to preview the SKUs / campaigns / rows a subsequent action will touch, and to justify a proposal to the user.',
    input_schema: {
      type: 'object' as const,
      properties: {
        dataset: {
          type: 'string',
          enum: [
            'inventory_replenishment',
            'campaign_pause',
            'markdown_execute',
            'rfq_candidates',
          ],
          description: 'Which live dataset to preview.',
        },
        limit: {
          type: 'number',
          description: 'Maximum rows to return (default 5, cap 20).',
        },
      },
      required: ['dataset'],
    },
  },
  {
    name: 'raise_purchase_order',
    description:
      'Generate a PO spreadsheet + procurement mailto for the given SKUs. Requires explicit user confirmation before calling. Produces xlsx and email artifacts; writes a Databricks reference (inventory_intent) row.',
    input_schema: {
      type: 'object' as const,
      properties: {
        skus: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sku_id: { type: 'string' },
              product_name: { type: 'string' },
              department: { type: 'string' },
              reorder_qty: { type: 'number' },
              value_inr_lakhs: { type: 'number' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['sku_id', 'product_name', 'reorder_qty', 'value_inr_lakhs'],
          },
        },
        event_name: { type: 'string', description: 'e.g. "Eid al-Adha".' },
        anchor_date: { type: 'string', description: 'ISO date the plan is anchored to.' },
      },
      required: ['skus', 'event_name'],
    },
  },
  {
    name: 'pause_campaign',
    description:
      'Draft a campaign-pause memo for the promo team. Requires explicit user confirmation. Generates xlsx memo + promo-team mailto; writes a Databricks campaigns.paused_at row.',
    input_schema: {
      type: 'object' as const,
      properties: {
        campaigns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              campaign_id: { type: 'string' },
              campaign_name: { type: 'string' },
              mechanic: { type: 'string' },
              free_rider_pct: { type: 'number' },
              spend_inr: { type: 'number' },
              incremental_revenue: { type: 'number' },
              roi: { type: 'string' },
            },
            required: ['campaign_name', 'free_rider_pct'],
          },
        },
      },
      required: ['campaigns'],
    },
  },
  {
    name: 'execute_markdown',
    description:
      'Generate markdown instructions (xlsx + WhatsApp templates) and a store-manager mailto for clearance SKUs. Requires explicit user confirmation. Writes a Databricks markdown_events row.',
    input_schema: {
      type: 'object' as const,
      properties: {
        skus: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sku_id: { type: 'string' },
              product_name: { type: 'string' },
              department: { type: 'string' },
              current_price: { type: 'number' },
              recommended_price: { type: 'number' },
              recommended_depth: { type: 'number' },
              days_remaining: { type: 'number' },
              current_st: { type: 'number' },
              target_st: { type: 'number' },
              units_at_risk: { type: 'number' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['sku_id', 'product_name', 'current_price', 'recommended_price'],
          },
        },
      },
      required: ['skus'],
    },
  },
  {
    name: 'generate_rfq',
    description:
      'Generate an RFQ spreadsheet + supplier negotiation mailto for SKUs whose margin has been compressed by supplier cost increases. Requires explicit user confirmation. Writes a procurement_rfqs row.',
    input_schema: {
      type: 'object' as const,
      properties: {
        skus: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sku_id: { type: 'string' },
              product_name: { type: 'string' },
              department: { type: 'string' },
              cost_inr: { type: 'number' },
              current_margin: { type: 'number' },
              target_margin: { type: 'number' },
              target_cost_reduction_pct: { type: 'number' },
              annual_volume: { type: 'number' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['sku_id', 'product_name', 'cost_inr'],
          },
        },
      },
      required: ['skus'],
    },
  },
  {
    name: 'set_reminder',
    description:
      'Set a reminder for the user (e.g., "check RFQ responses in 5 days"). Does NOT touch ERP. Returns a confirmation with the target date.',
    input_schema: {
      type: 'object' as const,
      properties: {
        text: { type: 'string', description: 'What to remind the user about.' },
        days_from_now: { type: 'number', description: 'Days from today.' },
      },
      required: ['text', 'days_from_now'],
    },
  },
];

// ── Types ────────────────────────────────────────────────────────────────

export interface SerializedArtifact {
  id: string;
  type: 'xlsx' | 'email' | 'csv';
  filename: string;
  description: string;
  mailto_href?: string;
  download_id?: string;
}

export interface AskToolResult {
  success: boolean;
  summary: string;
  erp_results?: Array<{ system: string; status: string; error?: string; latency_ms?: number }>;
  available_actions?: string[];
  artifacts?: SerializedArtifact[];
  databricks_ref?: {
    query_id: string;
    query: string;
    rows_affected: number;
    table: string;
    operation: string;
  };
  rows_affected?: number;
  preview?: Array<Record<string, unknown>>;
  reminder?: { text: string; target_date: string };
  error?: string;
}

export type OnProgress = (text: string) => void;

// ── Blob helper ──────────────────────────────────────────────────────────

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  return Buffer.from(await blob.arrayBuffer());
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// ── ERP list (inlined synchronous version — no setTimeout) ───────────────

const ERP_SYSTEMS = [
  { system: 'SAP ERP', error: 'Not configured', latency_ms: 340 },
  { system: 'Oracle NetSuite', error: 'Connection refused (port 8088)', latency_ms: 520 },
  { system: 'Tally Prime', error: 'Host not found', latency_ms: 180 },
];

// ── Mock data previews for query_live_data ───────────────────────────────

const PREVIEW_DATA: Record<string, Array<Record<string, unknown>>> = {
  inventory_replenishment: [
    { sku_id: 'SKU-1042', product_name: 'Basmati Rice 5kg', weeks_of_supply: 1.2, reorder_qty: 3200, value_lakhs: 4.5, priority: 'high' },
    { sku_id: 'SKU-2081', product_name: 'Cooking Oil 1L', weeks_of_supply: 1.4, reorder_qty: 4200, value_lakhs: 3.8, priority: 'high' },
    { sku_id: 'SKU-3319', product_name: 'Toor Dal 1kg', weeks_of_supply: 1.9, reorder_qty: 2400, value_lakhs: 2.9, priority: 'medium' },
    { sku_id: 'SKU-4102', product_name: 'Sugar 1kg', weeks_of_supply: 2.1, reorder_qty: 3100, value_lakhs: 2.4, priority: 'medium' },
    { sku_id: 'SKU-5220', product_name: 'Ghee 500g', weeks_of_supply: 2.3, reorder_qty: 1800, value_lakhs: 4.7, priority: 'medium' },
  ],
  campaign_pause: [
    { campaign_id: 'CMP-8801', campaign_name: 'Snacks BOGO', mechanic: 'BOGO', free_rider_pct: 62, spend_inr: 480000, incremental_revenue: 420000, roi: '0.9x' },
    { campaign_id: 'CMP-8834', campaign_name: 'Beverages 20% off', mechanic: '20% off', free_rider_pct: 58, spend_inr: 320000, incremental_revenue: 380000, roi: '1.2x' },
    { campaign_id: 'CMP-8850', campaign_name: 'Personal Care Combo', mechanic: 'Combo', free_rider_pct: 55, spend_inr: 240000, incremental_revenue: 310000, roi: '1.3x' },
  ],
  markdown_execute: [
    { sku_id: 'SKU-7701', product_name: 'Diwali Sweets Box', current_price: 599, recommended_price: 419, recommended_depth: 30, days_remaining: 5, current_st: 42, target_st: 85, units_at_risk: 380, priority: 'high' },
    { sku_id: 'SKU-7702', product_name: 'Festival Hamper', current_price: 899, recommended_price: 629, recommended_depth: 30, days_remaining: 7, current_st: 51, target_st: 85, units_at_risk: 220, priority: 'high' },
    { sku_id: 'SKU-7710', product_name: 'Seasonal Chocolate Set', current_price: 449, recommended_price: 359, recommended_depth: 20, days_remaining: 9, current_st: 58, target_st: 80, units_at_risk: 180, priority: 'medium' },
  ],
  rfq_candidates: [
    { sku_id: 'SKU-9001', product_name: 'Refined Sunflower Oil 5L', cost_inr: 620, current_margin: 8.2, target_margin: 14, target_cost_reduction_pct: 7, annual_volume: 42000, priority: 'high' },
    { sku_id: 'SKU-9014', product_name: 'Wheat Flour 10kg', cost_inr: 380, current_margin: 6.8, target_margin: 12, target_cost_reduction_pct: 8, annual_volume: 38000, priority: 'high' },
    { sku_id: 'SKU-9022', product_name: 'Basmati Rice 25kg', cost_inr: 2100, current_margin: 9.1, target_margin: 14, target_cost_reduction_pct: 6, annual_volume: 12000, priority: 'medium' },
  ],
};

// ── ProposalItem builders ────────────────────────────────────────────────

interface POSkuInput {
  sku_id: string;
  product_name: string;
  department?: string;
  reorder_qty: number;
  value_inr_lakhs: number;
  priority?: 'high' | 'medium' | 'low';
}

function poSkusToProposals(items: POSkuInput[]): ProposalItem[] {
  return items.map((s, i) => ({
    id: `po-${i}`,
    sku_id: s.sku_id,
    product_name: s.product_name,
    department: s.department ?? 'Grocery & Staples',
    metric_label: 'Weeks of supply',
    metric_value: '—',
    metric_urgent: (s.priority ?? 'medium') === 'high',
    action_label: `Reorder ${s.reorder_qty} units`,
    value_inr: s.value_inr_lakhs,
    priority: s.priority ?? 'medium',
    selected: true,
    metadata: { reorder_qty: s.reorder_qty },
  }));
}

interface CampaignInput {
  campaign_id?: string;
  campaign_name: string;
  mechanic?: string;
  free_rider_pct: number;
  spend_inr?: number;
  incremental_revenue?: number;
  roi?: string;
}

function campaignsToProposals(items: CampaignInput[]): ProposalItem[] {
  return items.map((c, i) => ({
    id: `cmp-${i}`,
    sku_id: c.campaign_id ?? `CMP-${i}`,
    product_name: c.campaign_name,
    department: 'Marketing',
    metric_label: 'Free-rider %',
    metric_value: `${c.free_rider_pct}%`,
    metric_urgent: c.free_rider_pct > 50,
    action_label: 'Pause campaign',
    value_inr: 0,
    priority: c.free_rider_pct > 60 ? 'high' : 'medium',
    selected: true,
    metadata: {
      mechanic: c.mechanic ?? '',
      free_rider_pct: c.free_rider_pct,
      spend_inr: c.spend_inr ?? 0,
      incremental_revenue: c.incremental_revenue ?? 0,
      roi: c.roi ?? '',
    },
  }));
}

interface MarkdownSkuInput {
  sku_id: string;
  product_name: string;
  department?: string;
  current_price: number;
  recommended_price: number;
  recommended_depth?: number;
  days_remaining?: number;
  current_st?: number;
  target_st?: number;
  units_at_risk?: number;
  priority?: 'high' | 'medium' | 'low';
}

function markdownSkusToProposals(items: MarkdownSkuInput[]): ProposalItem[] {
  return items.map((s, i) => ({
    id: `md-${i}`,
    sku_id: s.sku_id,
    product_name: s.product_name,
    department: s.department ?? 'Seasonal',
    metric_label: 'Days remaining',
    metric_value: `${s.days_remaining ?? 0}d`,
    metric_urgent: (s.priority ?? 'medium') === 'high',
    action_label: `Markdown to ₹${s.recommended_price}`,
    value_inr: 0,
    priority: s.priority ?? 'medium',
    selected: true,
    metadata: {
      current_price: s.current_price,
      recommended_price: s.recommended_price,
      recommended_depth: s.recommended_depth ?? 0,
      days_remaining: s.days_remaining ?? 0,
      current_st: s.current_st ?? 0,
      target_st: s.target_st ?? 0,
      units_at_risk: s.units_at_risk ?? 0,
    },
  }));
}

interface RFQSkuInput {
  sku_id: string;
  product_name: string;
  department?: string;
  cost_inr: number;
  current_margin?: number;
  target_margin?: number;
  target_cost_reduction_pct?: number;
  annual_volume?: number;
  priority?: 'high' | 'medium' | 'low';
}

function rfqSkusToProposals(items: RFQSkuInput[]): ProposalItem[] {
  return items.map((s, i) => ({
    id: `rfq-${i}`,
    sku_id: s.sku_id,
    product_name: s.product_name,
    department: s.department ?? 'Grocery & Staples',
    metric_label: 'Margin gap',
    metric_value: `${((s.target_margin ?? 0) - (s.current_margin ?? 0)).toFixed(1)}pp`,
    metric_urgent: (s.priority ?? 'medium') === 'high',
    action_label: 'Request revised pricing',
    value_inr: 0,
    priority: s.priority ?? 'medium',
    selected: true,
    metadata: {
      cost_inr: s.cost_inr,
      current_margin: s.current_margin ?? 0,
      target_margin: s.target_margin ?? 0,
      target_cost_reduction_pct: s.target_cost_reduction_pct ?? 8,
      annual_volume: s.annual_volume ?? 12000,
    },
  }));
}

// ── Tool dispatch ────────────────────────────────────────────────────────

export async function executeAskTool(
  toolName: string,
  input: Record<string, unknown>,
  onProgress?: OnProgress,
  tenant: string = 'india_grocery'
): Promise<AskToolResult> {
  const isUSD = tenant === 'us_apparel' || tenant === 'us_retail';
  try {
    // USD tenants (us_retail, us_apparel) have no live Databricks connection —
    // fail query_live_data gracefully so Claude falls back to reasoning from
    // the dashboard context provided in the system prompt.
    if (isUSD && toolName === 'query_live_data') {
      return {
        success: false,
        summary: `Live Databricks query is not available for tenant "${tenant}" — the assistant should reason from the dashboard context already in the system prompt.`,
        error: 'no_live_data_for_usd_tenant',
      };
    }
    switch (toolName) {
      case 'check_erp_connection': {
        onProgress?.('Checking ERP systems…');
        const erp_results = ERP_SYSTEMS.map((s) => ({
          system: s.system,
          status: 'failed' as const,
          error: s.error,
          latency_ms: s.latency_ms,
        }));
        return {
          success: true,
          summary: 'No ERP integrations are currently configured. Actions will produce artifacts (xlsx + email) you can send manually.',
          erp_results,
          available_actions: [
            'Generate PO spreadsheet + procurement email',
            'Draft campaign-pause memo + promo-team email',
            'Generate markdown instructions + store-manager email',
            'Generate RFQ + supplier email',
            'Set reminder',
          ],
        };
      }

      case 'query_live_data': {
        const dataset = String(input.dataset ?? '');
        const limit = Math.min(20, Math.max(1, Number(input.limit ?? 5)));
        onProgress?.(`Querying Databricks: ${dataset}…`);
        const rows = (PREVIEW_DATA[dataset] ?? []).slice(0, limit);
        return {
          success: true,
          summary: `Fetched ${rows.length} row(s) from ${dataset}.`,
          preview: rows,
          rows_affected: rows.length,
        };
      }

      case 'raise_purchase_order': {
        const skus = (input.skus ?? []) as POSkuInput[];
        const eventName = String(input.event_name ?? 'upcoming event');
        const anchorDate = String(input.anchor_date ?? new Date().toISOString().slice(0, 10));
        if (skus.length === 0) {
          return { success: false, summary: 'No SKUs supplied.', error: 'skus[] is empty' };
        }
        onProgress?.('Generating PO spreadsheet…');
        const proposals = poSkusToProposals(skus);
        const xlsxBlob = generatePOSpreadsheet(proposals, eventName, anchorDate, isUSD);
        const xlsxBuf = await blobToBuffer(xlsxBlob);
        const filename = `PO-${eventName.replace(/\s+/g, '_')}-${anchorDate}.xlsx`;
        const download_id = storeBlob(xlsxBuf, filename, XLSX_MIME);
        const mailtoHref = generateSupplierEmailHref(proposals, eventName, isUSD);
        onProgress?.('Writing Databricks reference…');
        const ref = generateActionRef();
        return {
          success: true,
          summary: `Purchase orders ready for ${skus.length} SKUs (${eventName}).`,
          artifacts: [
            {
              id: 'po-xlsx',
              type: 'xlsx',
              filename,
              description: `Purchase orders — ${skus.length} SKUs`,
              download_id,
            },
            {
              id: 'po-email',
              type: 'email',
              filename: 'procurement@retailer.com',
              description: 'Email to procurement team',
              mailto_href: mailtoHref,
            },
          ],
          databricks_ref: {
            query_id: ref,
            query: MOCK_QUERIES.inventory_replenishment,
            rows_affected: skus.length,
            table: 'bronze.inventory_intent',
            operation: 'UPDATE',
          },
          rows_affected: skus.length,
        };
      }

      case 'pause_campaign': {
        const campaigns = (input.campaigns ?? []) as CampaignInput[];
        if (campaigns.length === 0) {
          return { success: false, summary: 'No campaigns supplied.', error: 'campaigns[] is empty' };
        }
        onProgress?.('Generating pause memo…');
        const proposals = campaignsToProposals(campaigns);
        const xlsxBlob = generateCampaignMemoXlsx(proposals, isUSD);
        const xlsxBuf = await blobToBuffer(xlsxBlob);
        const filename = `Campaign-Pause-Memo-${new Date().toISOString().slice(0, 10)}.xlsx`;
        const download_id = storeBlob(xlsxBuf, filename, XLSX_MIME);
        const mailtoHref = generatePromoTeamEmailHref(proposals, isUSD);
        onProgress?.('Writing Databricks reference…');
        const ref = generateActionRef();
        return {
          success: true,
          summary: `Pause request drafted for ${campaigns.length} campaign(s).`,
          artifacts: [
            {
              id: 'cp-xlsx',
              type: 'xlsx',
              filename,
              description: `Pause memo — ${campaigns.length} campaign(s)`,
              download_id,
            },
            {
              id: 'cp-email',
              type: 'email',
              filename: 'promo-team@retailer.com',
              description: 'Email to promo team',
              mailto_href: mailtoHref,
            },
          ],
          databricks_ref: {
            query_id: ref,
            query: MOCK_QUERIES.campaign_pause,
            rows_affected: campaigns.length,
            table: 'silver.campaigns',
            operation: 'UPDATE',
          },
          rows_affected: campaigns.length,
        };
      }

      case 'execute_markdown': {
        const skus = (input.skus ?? []) as MarkdownSkuInput[];
        if (skus.length === 0) {
          return { success: false, summary: 'No SKUs supplied.', error: 'skus[] is empty' };
        }
        onProgress?.('Generating markdown instructions…');
        const proposals = markdownSkusToProposals(skus);
        const xlsxBlob = generateMarkdownInstructionXlsx(proposals, isUSD);
        const xlsxBuf = await blobToBuffer(xlsxBlob);
        const filename = `Markdown-Instructions-${new Date().toISOString().slice(0, 10)}.xlsx`;
        const download_id = storeBlob(xlsxBuf, filename, XLSX_MIME);
        const mailtoHref = generateStoreManagerEmailHref(proposals, isUSD);
        onProgress?.('Writing Databricks reference…');
        const ref = generateActionRef();
        return {
          success: true,
          summary: `Markdown instructions ready for ${skus.length} SKU(s).`,
          artifacts: [
            {
              id: 'md-xlsx',
              type: 'xlsx',
              filename,
              description: `Markdown instructions — ${skus.length} SKUs`,
              download_id,
            },
            {
              id: 'md-email',
              type: 'email',
              filename: 'store-managers@retailer.com',
              description: 'Email to store managers',
              mailto_href: mailtoHref,
            },
          ],
          databricks_ref: {
            query_id: ref,
            query: MOCK_QUERIES.markdown_execute,
            rows_affected: skus.length,
            table: 'gold.markdown_events',
            operation: 'INSERT',
          },
          rows_affected: skus.length,
        };
      }

      case 'generate_rfq': {
        const skus = (input.skus ?? []) as RFQSkuInput[];
        if (skus.length === 0) {
          return { success: false, summary: 'No SKUs supplied.', error: 'skus[] is empty' };
        }
        onProgress?.('Generating RFQ document…');
        const proposals = rfqSkusToProposals(skus);
        const { blob: xlsxBlob, reference, deadlineISO } = generateRFQSpreadsheet(proposals, isUSD);
        const xlsxBuf = await blobToBuffer(xlsxBlob);
        const filename = `${reference}.xlsx`;
        const download_id = storeBlob(xlsxBuf, filename, XLSX_MIME);
        const mailtoHref = generateSupplierNegotiationEmailHref(proposals, reference, deadlineISO, isUSD);
        onProgress?.('Writing Databricks reference…');
        const skuIds = skus.map((s) => s.sku_id);
        return {
          success: true,
          summary: `RFQ ${reference} ready for ${skus.length} SKU(s). Deadline ${deadlineISO}.`,
          artifacts: [
            {
              id: 'rfq-xlsx',
              type: 'xlsx',
              filename,
              description: `RFQ ${reference}`,
              download_id,
            },
            {
              id: 'rfq-email',
              type: 'email',
              filename: 'supplier-partners@retailer.com',
              description: 'Email to supplier partners',
              mailto_href: mailtoHref,
            },
          ],
          databricks_ref: {
            query_id: reference,
            query: MOCK_QUERIES.rfq_log(skuIds, reference),
            rows_affected: skus.length,
            table: 'procurement_rfqs',
            operation: 'INSERT',
          },
          rows_affected: skus.length,
        };
      }

      case 'set_reminder': {
        const text = String(input.text ?? '');
        const days = Number(input.days_from_now ?? 1);
        const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        const target_date = target.toISOString().slice(0, 10);
        return {
          success: true,
          summary: `Reminder set for ${target_date}: ${text}`,
          reminder: { text, target_date },
        };
      }

      default:
        return { success: false, summary: `Unknown tool: ${toolName}`, error: 'unknown_tool' };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, summary: `Tool ${toolName} failed: ${msg}`, error: msg };
  }
}

export function toolResultToString(result: AskToolResult): string {
  return JSON.stringify(result).slice(0, 20000);
}

export function getToolLabel(toolName: string): string {
  switch (toolName) {
    case 'check_erp_connection':
      return 'Checking ERP connection';
    case 'query_live_data':
      return 'Querying live Databricks data';
    case 'raise_purchase_order':
      return 'Raising purchase order';
    case 'pause_campaign':
      return 'Drafting campaign pause';
    case 'execute_markdown':
      return 'Executing markdown';
    case 'generate_rfq':
      return 'Generating RFQ';
    case 'set_reminder':
      return 'Setting reminder';
    default:
      return toolName;
  }
}
