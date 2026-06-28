/**
 * End-to-end check: every agent surface must hit Databricks (not mock / hardcoded).
 *
 * Drives 15 representative chat questions + scenario simulator + 5 price-intel
 * agent endpoints. For each tool result it inspects, checks source === 'databricks'.
 */

const BASE = 'http://localhost:3000';
const COOKIE = 'rct_auth=rct-portal-ok-2025';

const CHAT_QUESTIONS = [
  { module: 'cx360',        q: 'Which RFM segment has the most at-risk customers and how much revenue is at risk?' },
  { module: 'cx360',        q: 'Top 5 highest CLV customers in Mumbai' },
  { module: 'cx360',        q: 'What is the 90-day churn rate trend by tier?' },
  { module: 'inventory',    q: 'Which department has the most stockouts right now?' },
  { module: 'inventory',    q: 'Show me SKUs needing replenishment in Mumbai' },
  { module: 'inventory',    q: 'Top 10 overstocked SKUs in Grocery & Staples' },
  { module: 'demand',       q: 'What were the top 10 SKUs by revenue over last 7 days?' },
  { module: 'demand',       q: 'Which categories have the highest Diwali uplift?' },
  { module: 'demand',       q: 'What does the forecast say about next week in Mumbai?' },
  { module: 'price-intel',  q: 'Which suppliers are below 75% OTIF?' },
  { module: 'price-intel',  q: 'Top 10 pricing recommendations by revenue impact' },
  { module: 'price-intel',  q: 'Show me the most price-elastic SKUs in Snacks' },
  { module: 'price-intel',  q: 'Where are we priced more than 10% above competitors?' },
  { module: 'price-intel',  q: 'Which recent cost-change events have the biggest unrecovered impact?' },
  { module: 'price-intel',  q: 'How did our most recent promo perform?' },
];

const SCENARIO_TESTS = [
  { scenario: 'supplier_delay', params: { supplier: 'Hindustan Unilever Ltd', delay_days: 7 } },
  { scenario: 'demand_spike',   params: { category: 'Grocery & Staples', spike_pct: 40, duration_days: 3 } },
  { scenario: 'store_closure',  params: { store: 'Mumbai Hypermarket 1', closure_days: 3 } },
  { scenario: 'dc_disruption',  params: { dc: 'Delhi DC', disruption_hours: 24 } },
];

const PRICE_AGENT_TESTS = [
  { name: 'promo-scenario',       body: { sku_id: 'PRD-000001', mechanic: 'percent_off', depth: 20, duration_days: 7, segment: 'all' } },
  { name: 'markdown-timing',      body: { sku_ids: ['PRD-000001','PRD-000002','PRD-000003'] } },
  { name: 'price-strategy',       body: { category: 'Snacks', horizon: 'quarter', objective: 'margin', competitive_intensity: 'high' } },
  { name: 'competitive-response', body: { messages: [{ role: 'user', content: 'Zepto just cut Maggi 70g by 15% — should we respond?' }] } },
  { name: 'weekly-briefing',      body: {} },
];

const out = { chat: [], scenarios: [], priceAgents: [] };

function inspectTools(toolResults) {
  if (!Array.isArray(toolResults)) return { tools: [], live: 0, mock: 0, dbx: 0 };
  const summary = toolResults.map((t) => ({
    tool: t.tool,
    source: t.output?.source ?? 'unknown',
    rows: t.output?.rowCount ?? null,
    ok: t.output?.success !== false,
  }));
  return {
    tools: summary,
    dbx: summary.filter((s) => s.source === 'databricks').length,
    mock: summary.filter((s) => s.source === 'mock').length,
    live: summary.filter((s) => s.ok).length,
  };
}

async function runChat() {
  console.log('=== CHAT QUESTIONS ===');
  for (const c of CHAT_QUESTIONS) {
    process.stdout.write(`[${c.module}] ${c.q.slice(0, 70)}… `);
    try {
      const res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
        body: JSON.stringify({ message: c.q, history: [], module: c.module }),
      });
      const data = await res.json();
      const inspect = inspectTools(data.toolResults);
      const verdict = inspect.dbx > 0 && inspect.mock === 0 ? '✓ DBX' : inspect.mock > 0 ? '✗ MOCK' : '— no tools';
      console.log(`${verdict}  tools=${inspect.tools.map((t) => t.tool).join(',')}`);
      out.chat.push({ ...c, verdict, ...inspect, answer: (data.answer || '').slice(0, 200) });
    } catch (err) {
      console.log(`✗ ERR ${err.message}`);
      out.chat.push({ ...c, verdict: 'error', err: err.message });
    }
  }
}

async function runScenarios() {
  console.log('\n=== SCENARIO SIMULATOR ===');
  for (const s of SCENARIO_TESTS) {
    process.stdout.write(`[${s.scenario}] ${JSON.stringify(s.params).slice(0, 60)}… `);
    try {
      // 1. context fetch
      const ctxRes = await fetch(`${BASE}/api/scenario-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
        body: JSON.stringify(s),
      });
      const ctxData = await ctxRes.json();
      const ctxOK = ctxData.source === 'databricks' && ctxData.baseline && Object.keys(ctxData.baseline).length > 0;
      console.log(`${ctxOK ? '✓ ctx-DBX' : '✗ ctx-' + ctxData.source} (${JSON.stringify(ctxData.baseline).length} bytes)`);
      out.scenarios.push({ ...s, ctxSource: ctxData.source, ctxBytes: JSON.stringify(ctxData.baseline).length, ctxOK });
    } catch (err) {
      console.log(`✗ ERR ${err.message}`);
      out.scenarios.push({ ...s, verdict: 'error', err: err.message });
    }
  }
}

async function runPriceAgents() {
  console.log('\n=== PRICE-INTEL AGENTS ===');
  for (const a of PRICE_AGENT_TESTS) {
    process.stdout.write(`[${a.name}]… `);
    try {
      const res = await fetch(`${BASE}/api/price-intel/agents/${a.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: COOKIE },
        body: JSON.stringify(a.body),
      });
      const data = await res.json();
      // Each agent has its own response shape — just verify HTTP 200 + at least one expected key
      const expectedKeys = {
        'promo-scenario': ['net_roi', 'recommendation', 'result'],
        'markdown-timing': ['schedule', 'total_recovery_inr', 'result'],
        'price-strategy': ['strategy_label', 'sku_recommendations', 'result'],
        'competitive-response': ['reply', 'analysis'],
        'weekly-briefing': ['headline', 'top_actions', 'performance_summary'],
      }[a.name] ?? [];
      const ok = res.status === 200 && expectedKeys.some((k) => k in (data ?? {}));
      console.log(`${res.status} ${ok ? '✓' : '✗'} keys=${Object.keys(data).slice(0, 5).join(',')}`);
      out.priceAgents.push({ ...a, status: res.status, ok, keys: Object.keys(data) });
    } catch (err) {
      console.log(`✗ ERR ${err.message}`);
      out.priceAgents.push({ ...a, verdict: 'error', err: err.message });
    }
  }
}

(async () => {
  await runChat();
  await runScenarios();
  await runPriceAgents();

  // Summary
  console.log('\n\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  const chatDbx = out.chat.filter((c) => c.verdict === '✓ DBX').length;
  const chatMock = out.chat.filter((c) => c.verdict === '✗ MOCK').length;
  const chatNoTool = out.chat.filter((c) => c.verdict === '— no tools').length;
  const chatErr = out.chat.filter((c) => c.verdict === 'error').length;
  console.log(`Chat (${out.chat.length}): ${chatDbx} dbx, ${chatMock} mock, ${chatNoTool} no-tool, ${chatErr} error`);
  const scOK = out.scenarios.filter((s) => s.ctxOK).length;
  console.log(`Scenario context (${out.scenarios.length}): ${scOK} pulling dbx baseline`);
  const paOK = out.priceAgents.filter((a) => a.ok).length;
  console.log(`Price agents (${out.priceAgents.length}): ${paOK} returned a usable payload`);

  // Detail any failures
  const failures = [
    ...out.chat.filter((c) => c.verdict !== '✓ DBX').map((c) => `chat[${c.module}]: ${c.verdict} — ${c.q.slice(0, 50)}`),
    ...out.scenarios.filter((s) => !s.ctxOK).map((s) => `scenario[${s.scenario}]: ${s.ctxSource ?? 'err'}`),
    ...out.priceAgents.filter((a) => !a.ok).map((a) => `priceAgent[${a.name}]: ${a.status ?? 'err'}`),
  ];
  if (failures.length) {
    console.log('\nFAILURES:');
    failures.forEach((f) => console.log('  ' + f));
  }

  // Write detail file
  const fs = await import('fs/promises');
  await fs.writeFile('/tmp/dbx-agent-test.json', JSON.stringify(out, null, 2));
  console.log('\nFull report: /tmp/dbx-agent-test.json');
})();
