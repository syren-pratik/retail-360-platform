/**
 * Insight QUALITY test — drives each AI agent with REAL params pulled
 * from /tmp/dbx-fixtures.json and prints the full natural-language answer
 * so we can judge specificity (no generic boilerplate).
 *
 * Writes a readable markdown report to /tmp/agent-quality-report.md
 */

import { readFile, writeFile } from 'fs/promises';

const BASE = 'http://localhost:3000';
const COOKIE = 'rct_auth=rct-portal-ok-2025';
const fix = JSON.parse(await readFile('/tmp/dbx-fixtures.json', 'utf-8'));

// Pick real values for every test
const topSupplier = fix.suppliers[0][1];                                 // e.g. "Dabur India"
const topDept = fix.departments[0][0];                                   // e.g. "Grocery & Staples"
const topStore = fix.stores[0][1];                                       // e.g. "Mumbai Hypermarket 2"
const topSKU = fix.top_skus[0][0];                                       // real product_id
const overSKUs = fix.overstock_skus.slice(0, 5).map((r) => ({
  sku_id: r[0], product_name: r[0], days_remaining: Math.max(7, Math.round(r[5])),
  recommended_depth_pct: 25, revenue_at_risk_inr: Math.round(r[4] * 200),
  current_stock_units: r[4],
}));
const topCategory = fix.categories[0][1];                                // e.g. "Spices"

console.log('Real values pulled from Databricks scan:');
console.log(`  supplier: ${topSupplier}`);
console.log(`  department: ${topDept}`);
console.log(`  category_l1: ${topCategory}`);
console.log(`  store: ${topStore}`);
console.log(`  SKU: ${topSKU}`);
console.log(`  overstock count: ${overSKUs.length}`);
console.log('');

const md = [];
md.push('# Agent Insight Quality Report\n');
md.push(`Generated: ${new Date().toISOString()}\n`);
md.push('Real values used:\n');
md.push(`- Supplier: **${topSupplier}**\n- Department: **${topDept}**\n- Category: **${topCategory}**\n- Store: **${topStore}**\n- SKU: **${topSKU}**\n\n`);
md.push('---\n');

async function record(title, getter) {
  console.log(`\n=== ${title} ===`);
  const start = Date.now();
  try {
    const result = await getter();
    const ms = Date.now() - start;
    console.log(`  ✓ ${ms}ms`);
    md.push(`## ${title}\n\n*${ms}ms*\n\n`);
    md.push(result);
    md.push('\n\n---\n');
  } catch (err) {
    console.log(`  ✗ ${err.message}`);
    md.push(`## ${title}\n\n**ERROR**: ${err.message}\n\n---\n`);
  }
}

// ── Chat (3 representative questions with real names) ─────────────────────
const CHATS = [
  { module: 'inventory',    q: `What's the stockout risk for SKU ${topSKU} across all stores?` },
  { module: 'price-intel',  q: `What's the recent OTIF of ${topSupplier} and what's at risk if they slip?` },
  { module: 'demand',       q: `How is ${topDept} trending this week vs last week — what categories are driving it?` },
];
for (const c of CHATS) {
  await record(`Chat [${c.module}]: ${c.q}`, async () => {
    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
      body: JSON.stringify({ message: c.q, history: [], module: c.module }),
    });
    const data = await res.json();
    const tools = (data.toolResults || []).map((t) => `${t.tool}(${t.output?.source ?? '?'}, ${t.output?.rowCount ?? '–'} rows)`).join(', ');
    return `**Tools used**: ${tools}\n\n**Answer**:\n\n${data.answer || '(empty)'}`;
  });
}

// ── Scenario Simulator (4 presets with real values) ───────────────────────
const SCEN = [
  { scenario: 'supplier_delay', params: { supplier: topSupplier, delay_days: 14 } },
  { scenario: 'demand_spike',   params: { category: topDept, spike_pct: 60, duration_days: 5 } },
  { scenario: 'store_closure',  params: { store: topStore, closure_days: 3 } },
  { scenario: 'dc_disruption',  params: { dc: 'North Region DC', disruption_hours: 24 } },
];
for (const s of SCEN) {
  await record(`Scenario [${s.scenario}]: ${JSON.stringify(s.params)}`, async () => {
    const ctxRes = await fetch(`${BASE}/api/scenario-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
      body: JSON.stringify(s),
    });
    const ctxData = await ctxRes.json();
    const ctxSize = JSON.stringify(ctxData.baseline).length;

    // Now drive the actual cascade via /api/chat with the real baseline
    const prompt = `Scenario: ${s.scenario} ${JSON.stringify(s.params)}.\n\nReal Databricks baseline:\n${JSON.stringify(ctxData.baseline, null, 2)}\n\nReturn a JSON cascade analysis with: revenue_at_risk_cr, stockout_skus_affected, stores_affected, days_to_resolve, top_3_mitigation_actions.`;
    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
      body: JSON.stringify({ message: prompt, history: [], module: 'inventory' }),
    });
    const data = await res.json();
    return `**Context source**: ${ctxData.source} (${ctxSize} bytes baseline)\n\n**Analysis**:\n\n${data.answer || '(empty)'}`;
  });
}

// ── 5 Price-intel agents with REAL params ─────────────────────────────────
const AGENTS = [
  {
    name: 'promo-scenario',
    body: { sku_id: topSKU, mechanic: 'percent_off', depth: 20, duration_days: 7, segment: 'all' },
  },
  {
    name: 'markdown-timing',
    body: { sku_ids: overSKUs.map((o) => o.sku_id), goal: 'Clear overstock before quarter-end', season_end_weeks: 8, markdown_items: overSKUs },
  },
  {
    name: 'price-strategy',
    body: { category: topCategory, horizon: 'quarter', objective: 'margin', competitive_intensity: 'high' },
  },
  {
    name: 'competitive-response',
    body: { messages: [{ role: 'user', content: `Zepto just cut ${topSKU} by 18% — should we match?` }] },
  },
  {
    name: 'weekly-briefing',
    body: {},
  },
];
for (const a of AGENTS) {
  await record(`Agent [${a.name}]`, async () => {
    const res = await fetch(`${BASE}/api/price-intel/agents/${a.name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
      body: JSON.stringify(a.body),
    });
    const data = await res.json();
    return `**Request**: ${JSON.stringify(a.body, null, 2).slice(0, 400)}\n\n**Response (${res.status})**:\n\n\`\`\`json\n${JSON.stringify(data, null, 2).slice(0, 3500)}\n\`\`\``;
  });
}

await writeFile('/tmp/agent-quality-report.md', md.join(''));
console.log('\n\nFull report: /tmp/agent-quality-report.md');
