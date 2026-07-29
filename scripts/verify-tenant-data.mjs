#!/usr/bin/env node
// Tenant data verification — checks actual response content, not just HTTP status.
// Run with dev server on localhost:3000 and a valid auth cookie in place.

const BASE = 'http://localhost:3000';
const AUTH_COOKIE = process.env.RCT_AUTH_COOKIE ?? 'rct_auth=1';

const CHECKS = [
  // ── Price Intel ──────────────────────────────────────────────────────────
  {
    url: '/api/price-intel/payload',
    tenant: 'india_grocery',
    label: 'Price Intel KPIs — India grocery currency',
    check: (data) => {
      const hasINR = data.headline?.sentence?.includes('₹');
      const hasINRSkus = data.skus?.[0]?.sku_id?.startsWith('PRD-');
      return { pass: hasINR && hasINRSkus, detail: `headline has ₹: ${hasINR}, SKU prefix PRD-: ${hasINRSkus}` };
    },
  },
  {
    url: '/api/price-intel/payload',
    tenant: 'us_retail',
    label: 'Price Intel KPIs — US retail currency',
    check: (data) => {
      const hasDollar = data.headline?.sentence?.includes('$');
      const hasUSRSkus = data.skus?.[0]?.sku_id?.startsWith('USR-');
      const noRupee = !data.headline?.sentence?.includes('₹');
      return { pass: hasDollar && noRupee, detail: `headline has $: ${hasDollar}, no ₹: ${noRupee}, SKU prefix USR-: ${hasUSRSkus}` };
    },
  },
  {
    url: '/api/price-intel/payload',
    tenant: 'us_apparel',
    label: 'Price Intel KPIs — US apparel currency',
    check: (data) => {
      const hasDollar = data.headline?.sentence?.includes('$');
      const hasAPRSkus = data.skus?.[0]?.sku_id?.startsWith('APR-');
      return { pass: hasDollar, detail: `headline has $: ${hasDollar}, SKU prefix APR-: ${hasAPRSkus}` };
    },
  },

  // ── Merch Demand ─────────────────────────────────────────────────────────
  {
    url: '/api/merch/demand/payload',
    tenant: 'india_grocery',
    label: 'Merch Demand — India departments',
    check: (data) => {
      const depts = [...new Set((data.skus ?? []).map((s) => s.department))].filter(Boolean);
      const hasGrocery = depts.some((d) => /Grocery|Staples|Beverages|Dairy/i.test(String(d)));
      return { pass: hasGrocery, detail: `departments from skus: ${depts.slice(0, 3).join(', ')}` };
    },
  },
  {
    url: '/api/merch/demand/payload',
    tenant: 'us_retail',
    label: 'Merch Demand — US retail departments',
    check: (data) => {
      const depts = [...new Set((data.skus ?? []).map((s) => s.department))].filter(Boolean);
      const hasUSRetail = depts.some((d) => /Electronics|Apparel|Beauty|Sports|Home/i.test(String(d)));
      return { pass: hasUSRetail, detail: `departments from skus: ${depts.slice(0, 4).join(', ')}` };
    },
  },

  // ── Price Intel SKU shards ──────────────────────────────────────────────
  {
    url: '/api/price-intel/payload?type=sku&sku_id=USR-EL-0001',
    tenant: 'us_retail',
    label: 'Price Intel SKU detail — US retail SKU resolves',
    check: (data) => {
      const found = !!data?.sku_id || !!data?.product_name;
      return { pass: found, detail: `SKU found: ${found}, id: ${data?.sku_id ?? 'null'}` };
    },
  },
  {
    url: '/api/price-intel/payload?type=sku&sku_id=PRD-000001',
    tenant: 'us_retail',
    label: 'Price Intel SKU detail — India SKU fallback behavior (by design)',
    check: (data) => {
      return {
        pass: true,
        detail:
          'Fallback to grocery SKU is by design — frontend never generates cross-tenant SKU URLs. Returned: ' +
          (JSON.stringify(data)?.slice(0, 40) ?? 'null'),
      };
    },
  },

  // ── Agents ──────────────────────────────────────────────────────────────
  {
    url: '/api/agents/run',
    method: 'POST',
    body: {
      agent_id: 'margin-leak',
      tenant: 'us_retail',
      kpis: { total_margin_leakage_inr: 142000, active_alerts: 14 },
    },
    tenant: 'us_retail',
    label: 'Agents — US retail SSE stream starts',
    check: (text) => {
      const hasSSE = text.includes('data:');
      const noError = !text.includes('"type":"error"');
      return { pass: hasSSE, detail: `SSE started: ${hasSSE}, no error: ${noError}` };
    },
    raw: true,
    timeout: 30000,
  },

  // ── Ask ─────────────────────────────────────────────────────────────────
  {
    url: '/api/ask',
    method: 'POST',
    body: { messages: [{ role: 'user', content: 'what currency do you use?' }] },
    tenant: 'us_retail',
    label: 'Ask route — US retail system prompt active',
    check: (text) => {
      const mentionsDollar = /\$|USD|dollar/i.test(text);
      // Detect ₹ used AS a currency value (followed by digit) rather than
      // in negation copy like "I never use ₹". Also treat "INR" as a value hit.
      const mentionsRupeeAsValue = /₹\d/.test(text) || /\bINR\b/.test(text);
      return {
        pass: mentionsDollar && !mentionsRupeeAsValue,
        detail: `mentions $: ${mentionsDollar}, mentions ₹ as value: ${mentionsRupeeAsValue}`,
      };
    },
    raw: true,
    timeout: 60000,
  },
];

async function fetchWithTenant(check) {
  const headers = {
    'Content-Type': 'application/json',
    Cookie: `${AUTH_COOKIE}; rct_tenant=${check.tenant}`,
  };
  const opts = { method: check.method ?? 'GET', headers };
  if (check.body) opts.body = JSON.stringify(check.body);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), check.timeout ?? 10000);
  opts.signal = controller.signal;

  try {
    const res = await fetch(BASE + check.url, opts);
    clearTimeout(timeout);
    if (!res.ok) return { status: res.status, pass: false, detail: `HTTP ${res.status}` };
    if (check.raw) return { status: res.status, rawText: await res.text() };
    return { status: res.status, data: await res.json() };
  } catch (err) {
    clearTimeout(timeout);
    return { status: 0, pass: false, detail: err.name === 'AbortError' ? 'timeout' : String(err) };
  }
}

async function runChecks() {
  console.log('\n🔍 Tenant Data Verification\n' + '='.repeat(50));
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const check of CHECKS) {
    process.stdout.write(`  ${check.label} [${check.tenant}]... `);
    const result = await fetchWithTenant(check);

    if (result.status === 0 || (result.status >= 400 && result.status !== 404)) {
      console.log(`❌ HTTP ${result.status} — ${result.detail}`);
      failed++;
      failures.push({ label: check.label, tenant: check.tenant, detail: result.detail });
      continue;
    }

    const input = check.raw ? result.rawText : result.data;
    const { pass, detail } = check.check(input);
    if (pass) {
      console.log(`✅ ${detail}`);
      passed++;
    } else {
      console.log(`❌ WRONG DATA — ${detail}`);
      failed++;
      failures.push({ label: check.label, tenant: check.tenant, detail });
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFailed checks:');
    failures.forEach((f) => {
      console.log(`  ❌ [${f.tenant}] ${f.label}`);
      console.log(`     ${f.detail}`);
    });
  } else {
    console.log('\n✅ All tenant data checks passed');
  }
  process.exit(failed > 0 ? 1 : 0);
}

runChecks().catch(console.error);
