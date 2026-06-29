/**
 * E2E test for the apparel Price-Intelligence tenant.
 *
 * Checks: apparel overview/markdown render the 4 new charts with no errors,
 * grocery regression remains $0 of grocery charts unaffected.
 */

import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const AUTH = { name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE };
const APPAREL = { name: 'rct_tenant', value: 'us_apparel', url: BASE };
const GROCERY = { name: 'rct_tenant', value: 'india_grocery', url: BASE };

const results = [];
function tally(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function withPage(cookies, fn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(cookies);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  try { await fn(p, errs); } finally { await browser.close(); }
}

async function readBody(p, url) {
  await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await p.waitForTimeout(3000);
  return p.locator('body').innerText();
}

// Test 1: Apparel overview renders cadence ladder + brand-vs-PL + returns overlay
await withPage([AUTH, APPAREL], async (p, errs) => {
  const body = await readBody(p, `${BASE}/price-intel?tab=overview`);
  const hits = ['Apparel Lifecycle', 'Markdown Cadence Ladder', 'Brand vs Private Label', 'Returns-Adjusted'].filter(s => body.includes(s));
  tally('apparel/overview: 4 new charts rendered', hits.length === 4 && errs.length === 0, `${hits.length}/4 hits, ${errs.length} errs`);
});

// Test 2: Apparel markdown renders cadence + size×color grid
await withPage([AUTH, APPAREL], async (p, errs) => {
  const body = await readBody(p, `${BASE}/price-intel?tab=markdown`);
  const hits = ['Markdown Cadence Ladder', 'Size × Color'].filter(s => body.includes(s));
  tally('apparel/markdown: cadence + size-color grid', hits.length === 2 && errs.length === 0, `${hits.length}/2 hits, ${errs.length} errs`);
});

// Test 3: Apparel uses $ not ₹ on price-intel
await withPage([AUTH, APPAREL], async (p) => {
  const body = await readBody(p, `${BASE}/price-intel`);
  const dollars = (body.match(/\$/g) || []).length;
  const rupees = (body.match(/₹/g) || []).length;
  tally('apparel/price-intel: $ dominant, ₹ absent', dollars >= 5 && rupees === 0, `$${dollars}, ₹${rupees}`);
});

// Test 4: Grocery regression — no apparel block leaks into grocery
await withPage([AUTH, GROCERY], async (p, errs) => {
  const body = await readBody(p, `${BASE}/price-intel`);
  const leaked = ['Apparel Lifecycle', 'Brand vs Private Label', 'Returns-Adjusted'].some(s => body.includes(s));
  const rupees = (body.match(/₹/g) || []).length;
  tally('grocery/price-intel: no apparel leak, ₹ present', !leaked && rupees >= 5 && errs.length === 0, `leaked=${leaked} ₹${rupees} errs=${errs.length}`);
});

const passed = results.filter(r => r.pass).length;
console.log(`\n${passed}/${results.length} tests passed`);
process.exit(passed === results.length ? 0 : 1);
