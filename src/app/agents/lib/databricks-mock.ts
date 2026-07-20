export interface MockQueryResult {
  query: string;
  query_id: string;
  rows_affected: number;
  duration_ms: number;
  table: string;
  operation: string;
}

function randomToken(len = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function extractTableAndOp(query: string): { table: string; operation: string } {
  const upd = query.match(/UPDATE\s+([A-Za-z0-9_.]+)/i);
  if (upd) return { table: upd[1], operation: 'UPDATE' };
  const ins = query.match(/INSERT\s+INTO\s+([A-Za-z0-9_.]+)/i);
  if (ins) return { table: ins[1], operation: 'INSERT' };
  const sel = query.match(/FROM\s+([A-Za-z0-9_.]+)/i);
  if (sel) return { table: sel[1], operation: 'SELECT' };
  return { table: 'unknown', operation: 'QUERY' };
}

export async function executeMockQuery(
  query: string,
  rows_affected: number,
  onStart?: () => void,
  onComplete?: (result: MockQueryResult) => void
): Promise<MockQueryResult> {
  onStart?.();
  const duration_ms = 200 + Math.floor(Math.random() * 600);
  await new Promise<void>((resolve) => setTimeout(resolve, duration_ms));
  const { table, operation } = extractTableAndOp(query);
  const result: MockQueryResult = {
    query,
    query_id: `QRY-2026-${randomToken(4)}`,
    rows_affected,
    duration_ms,
    table,
    operation,
  };
  onComplete?.(result);
  return result;
}

export const MOCK_QUERIES = {
  inventory_replenishment:
    "UPDATE bronze.inventory_intent SET status = 'reorder_flagged', updated_at = current_timestamp() WHERE sku_id IN (?)",
  price_change:
    "UPDATE silver.price_master SET current_price_inr = ?, effective_date = current_date(), updated_by = 'agent_pricing' WHERE sku_id IN (?)",
  campaign_pause:
    "UPDATE silver.campaigns SET status = 'paused', paused_at = current_timestamp() WHERE campaign_id IN (?)",
  markdown_execute:
    "INSERT INTO gold.markdown_events (sku_id, depth_pct, effective_date, approved_by) VALUES (?, ?, current_date(), 'category_manager')",
  markdown_approve:
    "INSERT INTO gold.markdown_events (sku_id, depth_pct, effective_date, approved_by) VALUES (?, ?, current_date(), 'category_manager')",
  rfq_log: (skuIds: string[], rfqRef: string): string => {
    const now = new Date();
    const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return `INSERT INTO procurement_rfqs (rfq_reference, sku_ids, issue_date, deadline, status, created_by) VALUES ('${rfqRef}', '${skuIds.join(',')}', '${now.toISOString()}', '${deadline.toISOString()}', 'PENDING_RESPONSE', 'category_manager')`;
  },
  weekly_brief_log: (weekOf: string, leakage: number, alerts: number): string => {
    const now = new Date().toISOString();
    return `INSERT INTO weekly_briefs (week_of, generated_at, leakage_inr, alert_count, generated_by, distributed) VALUES ('${weekOf}', '${now}', ${leakage}, ${alerts}, 'retail360_agent', true)`;
  },
};

export function generateActionRef(): string {
  return `AGT-2026-${randomToken(4)}`;
}
