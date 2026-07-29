import * as XLSX from 'xlsx';
import type { ProposalItem } from './action-types';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';

export { generateActionRef } from './databricks-mock';

// ─── Currency helpers ───────────────────────────────────────────────────

function currencySymbol(isUSD: boolean): string {
  return isUSD ? '$' : '₹';
}

/** Format a raw money value. For INR: lakhs/crores. For USD: K/M. */
function formatMoney(value: number, isUSD: boolean): string {
  if (isUSD) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  return `₹${value.toFixed(0)}`;
}

/**
 * Format a value already scaled to lakhs (INR) or thousands (USD).
 * Used for `value_inr` fields on ProposalItem which store scaled amounts.
 */
function formatScaledMoney(scaled: number, isUSD: boolean): string {
  return isUSD ? `$${scaled.toFixed(0)}K` : `₹${scaled.toFixed(1)}L`;
}

function scaledUnitLabel(isUSD: boolean): string {
  return isUSD ? '$K' : '₹L';
}

// ─── Blob helper ────────────────────────────────────────────────────────

function toBlob(wb: XLSX.WorkBook): Blob {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ─── Purchase order (inventory replenishment) ───────────────────────────

export function generatePOSpreadsheet(
  proposals: ProposalItem[],
  eventName: string,
  anchorDate: string,
  isUSD = false
): Blob {
  const wb = XLSX.utils.book_new();
  const sym = currencySymbol(isUSD);

  const poHeader = [
    [`Purchase Orders — ${eventName}`],
    [`Anchor date: ${anchorDate}`],
    [],
    ['SKU ID', 'Product', 'Department', 'Reorder Qty', `Value (${scaledUnitLabel(isUSD)})`, 'Priority'],
  ];
  const poRows = proposals.map((p) => [
    p.sku_id,
    p.product_name,
    p.department,
    p.metadata.reorder_qty ?? '',
    p.value_inr,
    p.priority.toUpperCase(),
  ]);
  const total = proposals.reduce((s, p) => s + p.value_inr, 0);
  const poFooter = [[], ['TOTAL', '', '', '', parseFloat(total.toFixed(2)), '']];

  const poSheet = XLSX.utils.aoa_to_sheet([...poHeader, ...poRows, ...poFooter]);
  poSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
  ];
  XLSX.utils.book_append_sheet(wb, poSheet, 'Purchase Orders');

  const instructions = [
    ['Instructions'],
    [],
    ['1. Review each SKU quantity for stockout risk before ' + eventName + '.'],
    ['2. Confirm supplier lead time is within 20 days.'],
    ['3. Send this file to procurement@retailer.com for issuance.'],
    ['4. Databricks inventory_intent flags have been set — do not double-order.'],
    [`5. All amounts in ${sym}.`],
  ];
  const insSheet = XLSX.utils.aoa_to_sheet(instructions);
  insSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  XLSX.utils.book_append_sheet(wb, insSheet, 'Instructions');

  return toBlob(wb);
}

// ─── Price change ────────────────────────────────────────────────────────

export function generatePriceChangeCSV(proposals: ProposalItem[], isUSD = false): Blob {
  const wb = XLSX.utils.book_new();
  const header = [
    [`Price Change Batch`],
    [],
    ['SKU ID', 'Product', 'Department', 'Current Price', 'New Price', 'Change %', `Revenue Impact (${scaledUnitLabel(isUSD)})`, 'Priority'],
  ];
  const rows = proposals.map((p) => [
    p.sku_id,
    p.product_name,
    p.department,
    p.metadata.current_price ?? '',
    p.metadata.recommended_price ?? '',
    p.metadata.change_pct ?? '',
    p.value_inr,
    p.priority.toUpperCase(),
  ]);
  const total = proposals.reduce((s, p) => s + p.value_inr, 0);
  const footer = [[], ['TOTAL', '', '', '', '', '', parseFloat(total.toFixed(2)), '']];

  const sheet = XLSX.utils.aoa_to_sheet([...header, ...rows, ...footer]);
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
  XLSX.utils.book_append_sheet(wb, sheet, 'Price Changes');
  return toBlob(wb);
}

// ─── Email helpers ──────────────────────────────────────────────────────

export function generateSupplierEmailHref(
  proposals: ProposalItem[],
  eventName: string,
  isUSD = false
): string {
  const subject = `Urgent PO for ${eventName} — ${proposals.length} SKUs`;
  const totalScaled = proposals.reduce((s, p) => s + p.value_inr, 0);
  const bodyLines = [
    `Hello,`,
    ``,
    `Please issue purchase orders for the following ${proposals.length} SKUs ahead of ${eventName}:`,
    ``,
    ...proposals.slice(0, 10).map((p) => `- ${p.sku_id} ${p.product_name} — ${p.action_label}`),
    ``,
    `Total value: ${formatScaledMoney(totalScaled, isUSD)}`,
    ``,
    `Full spreadsheet attached.`,
    ``,
    `Thanks,`,
    `Category Team`,
  ];
  const body = bodyLines.join('\n');
  return `mailto:procurement@retailer.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function generateStoreOpsEmailHref(proposals: ProposalItem[], _isUSD = false): string {
  void _isUSD;
  const subject = `Price change batch — ${proposals.length} SKUs (POS refresh required)`;
  const bodyLines = [
    `Store Ops,`,
    ``,
    `Please refresh POS pricing for the ${proposals.length} SKUs in the attached file.`,
    ``,
    ...proposals.slice(0, 10).map((p) => `- ${p.sku_id} ${p.product_name}: ${p.action_label}`),
    ``,
    `Effective: current date.`,
    ``,
    `Thanks,`,
    `Pricing Team`,
  ];
  const body = bodyLines.join('\n');
  return `mailto:storeops@retailer.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Campaign pause ─────────────────────────────────────────────────────

export function generateCampaignMemoXlsx(proposals: ProposalItem[], isUSD = false): Blob {
  const wb = XLSX.utils.book_new();
  const unit = scaledUnitLabel(isUSD);
  const header = [
    ['Campaign Pause Request'],
    [`Generated: ${new Date().toISOString().slice(0, 10)}`],
    [],
    ['Campaign', 'Mechanic', 'FR Ratio %', `Waste ${unit}`, `Incremental Revenue ${unit}`, 'ROI', 'Recommended Action'],
  ];
  const scaleDivisor = isUSD ? 1000 : 100000;
  const rows = proposals.map((p) => {
    const mechanic = String(p.metadata.mechanic ?? '');
    const fr = Number(p.metadata.free_rider_pct ?? 0);
    const spend = Number(p.metadata.spend_inr ?? 0);
    const waste = parseFloat(((spend * fr) / 100 / scaleDivisor).toFixed(2));
    const inc = parseFloat((Number(p.metadata.incremental_revenue ?? 0) / scaleDivisor).toFixed(2));
    const roi = String(p.metadata.roi ?? '');
    return [p.product_name, mechanic, fr, waste, inc, roi, 'Pause campaign — review targeting'];
  });
  const totalWaste = rows.reduce((s, r) => s + Number(r[3]), 0);
  const totalInc = rows.reduce((s, r) => s + Number(r[4]), 0);
  const footer = [
    [],
    ['TOTAL', '', '', parseFloat(totalWaste.toFixed(2)), parseFloat(totalInc.toFixed(2)), '', ''],
    [],
    ['Approver: category_manager'],
    ['Effective: immediate on approval'],
  ];
  const sheet = XLSX.utils.aoa_to_sheet([...header, ...rows, ...footer]);
  sheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
  ];
  XLSX.utils.book_append_sheet(wb, sheet, 'Campaign Pause Request');
  return toBlob(wb);
}

export function generatePromoTeamEmailHref(proposals: ProposalItem[], isUSD = false): string {
  const subject = `Campaign Pause Request — Free-Rider Threshold Exceeded`;
  const totalWaste = proposals.reduce((s, p) => {
    const fr = Number(p.metadata.free_rider_pct ?? 0);
    const spend = Number(p.metadata.spend_inr ?? 0);
    return s + (spend * fr) / 100;
  }, 0);
  const body = [
    `Promo team,`,
    ``,
    `The following ${proposals.length} live campaigns have exceeded the 50% free-rider threshold. Requesting immediate pause pending re-targeting review:`,
    ``,
    ...proposals.map((p) => {
      const waste = (Number(p.metadata.spend_inr ?? 0) * Number(p.metadata.free_rider_pct ?? 0)) / 100;
      return `- ${p.product_name} (${p.metadata.mechanic}) — FR ${p.metadata.free_rider_pct}% — waste ≈ ${formatMoney(waste, isUSD)}`;
    }),
    ``,
    `Total waste being avoided: ${formatMoney(totalWaste, isUSD)}`,
    ``,
    `Detailed memo attached.`,
    ``,
    `Thanks,`,
    `Pricing Intelligence`,
  ].join('\n');
  return `mailto:promo-team@retailer.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Markdown execution ─────────────────────────────────────────────────

export function generateMarkdownInstructionXlsx(proposals: ProposalItem[], isUSD = false): Blob {
  const wb = XLSX.utils.book_new();
  const sym = currencySymbol(isUSD);
  const header = [
    ['Markdown Instructions'],
    [`Generated: ${new Date().toISOString().slice(0, 10)}`],
    [],
    [
      'SKU ID',
      'Product',
      'Department',
      `Current Price ${sym}`,
      `New Price ${sym}`,
      'Markdown %',
      'Days Remaining',
      'Current ST%',
      'Target ST%',
      'Units at Risk',
      'Priority',
    ],
  ];
  const rows = proposals.map((p) => [
    p.sku_id,
    p.product_name,
    p.department,
    Number(p.metadata.current_price ?? 0),
    Number(p.metadata.recommended_price ?? 0),
    Number(p.metadata.recommended_depth ?? 0),
    Number(p.metadata.days_remaining ?? 0),
    Number(p.metadata.current_st ?? 0),
    Number(p.metadata.target_st ?? 0),
    Number(p.metadata.units_at_risk ?? 0),
    p.priority.toUpperCase(),
  ]);
  const sheet1 = XLSX.utils.aoa_to_sheet([...header, ...rows]);
  sheet1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
  ];
  XLSX.utils.book_append_sheet(wb, sheet1, 'Markdown Instructions');

  const waHeader = [['WhatsApp Templates — Copy per store manager'], []];
  const waRows: (string | number)[][] = [];
  proposals.forEach((p) => {
    const depth = Math.abs(Number(p.metadata.recommended_depth ?? 0));
    const msg = `Retail 360: Markdown ${p.sku_id} ${p.product_name} by ${depth}% (${sym}${p.metadata.current_price}→${sym}${p.metadata.recommended_price}). Apply POS + shelf tag by 9am tomorrow. Priority ${p.priority.toUpperCase()}.`;
    waRows.push([p.sku_id, p.product_name, msg]);
    waRows.push([]);
  });
  const sheet2 = XLSX.utils.aoa_to_sheet([...waHeader, ['SKU ID', 'Product', 'Message'], ...waRows]);
  sheet2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  XLSX.utils.book_append_sheet(wb, sheet2, 'WhatsApp Templates');
  return toBlob(wb);
}

export function generateStoreManagerEmailHref(proposals: ProposalItem[], isUSD = false): string {
  const sym = currencySymbol(isUSD);
  const subject = `Markdown Action Required — ${proposals.length} SKUs — Please action by tomorrow 9am`;
  const body = [
    `Store managers,`,
    ``,
    `Please apply the following markdowns at POS and shelf tag by tomorrow 9am:`,
    ``,
    ...proposals.map(
      (p) =>
        `- ${p.sku_id} ${p.product_name}: ${p.action_label} (${sym}${p.metadata.current_price} → ${sym}${p.metadata.recommended_price})`
    ),
    ``,
    `Full instruction file + WhatsApp templates attached.`,
    ``,
    `Thanks,`,
    `Clearance team`,
  ].join('\n');
  return `mailto:store-managers@retailer.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── RFQ ────────────────────────────────────────────────────────────────

export function calculateTargetCostReduction(sku: {
  current_margin_pct: number;
  target_margin_pct: number;
} | null | undefined): string {
  if (!sku || !sku.target_margin_pct || !sku.current_margin_pct) return '8';
  const val = (sku.target_margin_pct - sku.current_margin_pct) * 1.2;
  return val > 0 ? val.toFixed(1) : '8';
}

export function generateRFQSpreadsheet(
  proposals: ProposalItem[],
  isUSD = false
): { blob: Blob; reference: string; deadlineISO: string } {
  const wb = XLSX.utils.book_new();
  const sym = currencySymbol(isUSD);
  const currencyName = isUSD ? 'USD' : 'INR';
  const now = new Date();
  const year = now.getFullYear();
  const seq = String(Math.floor(1000 + Math.random() * 9000));
  const reference = `RFQ-${year}-${seq}`;
  const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const deadlineISO = deadline.toISOString().slice(0, 10);
  const issueISO = now.toISOString().slice(0, 10);

  const rows: (string | number)[][] = [
    ['REQUEST FOR QUOTATION'],
    [`RFQ Reference: ${reference}`],
    [`Issue Date: ${issueISO}`],
    [`Response Deadline: ${deadlineISO}`],
    [`Issued by: Category Management — Retail 360`],
    [],
    ['BACKGROUND'],
    [
      'Recent supplier cost increases have compressed our margin on the SKUs listed below. We are requesting revised pricing to restore target margins. Please respond with your best terms by the deadline above.',
    ],
    [],
    [
      'SKU ID',
      'Product Description',
      'Department',
      `Current Cost ${sym}`,
      'Current Margin %',
      'Target Margin %',
      'Required Cost Reduction %',
      `Target Cost ${sym}`,
      'Annual Volume (est)',
      'Priority',
    ],
  ];
  proposals.forEach((p) => {
    const currentCost = Number(p.metadata.cost_inr ?? 0);
    const reduction = Number(p.metadata.target_cost_reduction_pct ?? 8);
    const targetCost = parseFloat((currentCost * (1 - reduction / 100)).toFixed(2));
    rows.push([
      p.sku_id,
      p.product_name,
      p.department,
      currentCost,
      Number(p.metadata.current_margin ?? 0),
      Number(p.metadata.target_margin ?? 0),
      reduction,
      targetCost,
      Number(p.metadata.annual_volume ?? 12000),
      p.priority.toUpperCase(),
    ]);
  });
  rows.push([]);
  rows.push(['TERMS & CONDITIONS']);
  rows.push([`1. Prices to be quoted in ${currencyName}, inclusive of applicable taxes.`]);
  rows.push(['2. Payment terms: Net 30 from date of invoice.']);
  rows.push([`3. Response required by ${deadlineISO} EOB.`]);
  rows.push(['4. Please email quote to procurement@retailer.com.']);

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
  XLSX.utils.book_append_sheet(wb, sheet, 'RFQ');
  return { blob: toBlob(wb), reference, deadlineISO };
}

export function generateSupplierNegotiationEmailHref(
  proposals: ProposalItem[],
  reference: string,
  deadlineISO: string,
  isUSD = false
): string {
  const sym = currencySymbol(isUSD);
  const subject = `RFQ ${reference} — Revised Pricing Request — Response Required by ${deadlineISO}`;
  const body = [
    `Dear Supplier,`,
    ``,
    `Reference: ${reference}`,
    ``,
    `Recent cost increases have compressed our margins on the following ${proposals.length} SKUs. We are formally requesting revised pricing to restore our target margins.`,
    ``,
    ...proposals.map(
      (p) =>
        `- ${p.sku_id} ${p.product_name}: current cost ${sym}${p.metadata.cost_inr}, current margin ${p.metadata.current_margin}% vs target ${p.metadata.target_margin}%`
    ),
    ``,
    `Ask: Please respond with best terms (cost reduction of ~${proposals[0]?.metadata.target_cost_reduction_pct ?? 8}% required) by ${deadlineISO}.`,
    ``,
    `Full RFQ attached.`,
    ``,
    `Regards,`,
    `Category Management`,
  ].join('\n');
  return `mailto:supplier-partners@retailer.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// ─── Weekly brief ───────────────────────────────────────────────────────

export function generateWeeklyBriefXlsx(core: PriceIntelCore, isUSD = false): Blob {
  const wb = XLSX.utils.book_new();
  const k = core.kpis;
  const sym = currencySymbol(isUSD);

  // Sheet 1 — Executive Summary
  const execRows: (string | number)[][] = [
    ['Executive Summary — Weekly Pricing Brief'],
    [`Generated: ${new Date().toISOString().slice(0, 10)}`],
    [],
    ['Metric', 'Value'],
    [`Total margin leakage (${sym})`, k.total_margin_leakage_inr ?? 0],
    ['Margin realization %', k.margin_realization_pct ?? 0],
    ['Margin realization trend (pp)', k.margin_realization_trend ?? 0],
    ['Promo ROI index', k.promo_roi_index ?? 0],
    ['Promo ROI trend', k.promo_roi_trend ?? 0],
    ['Free-rider ratio %', k.free_rider_ratio_pct ?? 0],
    ['Sell-through %', k.sell_through_pct ?? 0],
    ['Sell-through vs target (pp)', k.sell_through_vs_target ?? 0],
    ['Active alerts', k.active_alerts ?? 0],
    [],
    ['Top decisions this week'],
  ];
  const topActions = core.action_queue.slice(0, 3);
  topActions.forEach((a, i) => execRows.push([`${i + 1}.`, `${a.headline} — ${a.recommended_action}`]));
  const s1 = XLSX.utils.aoa_to_sheet(execRows);
  s1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  XLSX.utils.book_append_sheet(wb, s1, 'Executive Summary');

  // Sheet 2 — Campaign Performance
  const campRows: (string | number)[][] = [
    ['Campaign Performance'],
    [],
    ['Campaign', 'Mechanic', 'Status', `Spend ${sym}`, 'ROI', 'FR %', `Incremental Revenue ${sym}`, `Net Incremental ${sym}`],
  ];
  core.campaigns.forEach((c) =>
    campRows.push([
      c.campaign_name,
      c.mechanic,
      c.status,
      c.spend_to_date_inr,
      c.roi,
      c.free_rider_ratio_pct,
      c.incremental_revenue_inr,
      c.net_incremental_inr,
    ])
  );
  const s2 = XLSX.utils.aoa_to_sheet(campRows);
  s2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
  XLSX.utils.book_append_sheet(wb, s2, 'Campaign Performance');

  // Sheet 3 — What's Coming
  const nextRows: (string | number)[][] = [["What's Coming — Next 14 days"], [], ['Week', 'Event / Note', `Forecast Revenue ${sym}`, `Forecast Margin ${sym}`]];
  (core.forecast_14w ?? []).slice(0, 2).forEach((f) =>
    nextRows.push([f.week_label, f.event_label ?? '—', f.forecast_revenue_inr, f.forecast_margin_inr])
  );
  const s3 = XLSX.utils.aoa_to_sheet(nextRows);
  s3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  XLSX.utils.book_append_sheet(wb, s3, "What's Coming");

  return toBlob(wb);
}

export function generateWeeklyBriefEmailHref(core: PriceIntelCore, weekOf: string, isUSD = false): string {
  const k = core.kpis;
  const alerts = k.active_alerts ?? 0;
  const leakageValue = k.total_margin_leakage_inr ?? 0;
  const leakageDisplay = formatMoney(leakageValue, isUSD);
  const subject = `Weekly Pricing Brief — ${weekOf} — ${alerts} alerts · ${leakageDisplay} leakage`;
  const body = [
    `Team,`,
    ``,
    `Weekly pricing brief for week of ${weekOf} attached.`,
    ``,
    `Headline: ${core.headline?.sentence ?? 'See brief'}`,
    `Margin leakage: ${leakageDisplay}`,
    `Active alerts: ${alerts}`,
    `Promo ROI: ${k.promo_roi_index ?? 0}/100`,
    `Sell-through: ${k.sell_through_pct ?? 0}%`,
    ``,
    `Top decisions inside. Please review by EOB Tuesday.`,
    ``,
    `Retail 360`,
  ].join('\n');
  return `mailto:leadership@retailer.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function generateVPSummary(core: PriceIntelCore, isUSD = false): string {
  const k = core.kpis;
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + 1) / 7);
  const leakageDisplay = formatMoney(k.total_margin_leakage_inr ?? 0, isUSD);
  const alerts = k.active_alerts ?? 0;
  const urgent = (core.action_queue ?? []).filter((a) => a.priority === 'urgent').length;
  const roi = k.promo_roi_index ?? 0;
  const st = k.sell_through_pct ?? 0;
  const top = core.action_queue?.[0]?.recommended_action ?? 'No urgent items';
  const raw = `Retail 360 WK${weekNum}: ${leakageDisplay} leakage, ${alerts} alerts (${urgent} urgent), ROI ${roi}/100, ST ${st}%. Top: ${top.slice(0, 40)}...`;
  return raw.slice(0, 160);
}

// ─── Download helper ────────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
