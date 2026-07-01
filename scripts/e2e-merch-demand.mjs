/**
 * E2E test for the apparel Merchandise Demand tenant.
 * 4 checks: apparel 4 new charts, apparel $-dominance, grocery no-leak, grocery ₹-present.
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
  p.on('pageerror', (e) => errs.push(e.message));
  try { await fn(p, errs); } finally { await browser.close(); }
}
async function readBody(p, url) {
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(5000);
  return p.locator('body').innerText();
}

await withPage([AUTH, APPAREL], async (p, errs) => {
  const body = await readBody(p, `${BASE}/merchandise/demand`);
  const hits = ['Apparel Demand Signals', 'Size-Curve Forecast', 'Weather-Driven Demand', 'Brand vs Private Label', 'Returns-Adjusted Sell-Through'].filter((s) => body.includes(s));
  tally('apparel: 4 new charts + apparel header', hits.length === 5 && errs.length === 0, `${hits.length}/5 hits, ${errs.length} errs`);
});

await withPage([AUTH, APPAREL], async (p) => {
  const body = await readBody(p, `${BASE}/merchandise/demand`);
  const dollars = (body.match(/\$/g) || []).length;
  const rupees = (body.match(/₹/g) || []).length;
  tally('apparel: $ dominant, ₹ absent', dollars >= 10 && rupees === 0, `$${dollars}, ₹${rupees}`);
});

await withPage([AUTH, GROCERY], async (p, errs) => {
  const body = await readBody(p, `${BASE}/merchandise/demand`);
  const leaked = ['Apparel Demand Signals', 'Size-Curve Forecast', 'Brand vs Private Label'].some((s) => body.includes(s));
  const rupees = (body.match(/₹/g) || []).length;
  tally('grocery: no apparel leak, ₹ present', !leaked && rupees >= 10 && errs.length === 0, `leaked=${leaked} ₹${rupees} errs=${errs.length}`);
});

await withPage([AUTH, APPAREL], async (p, errs) => {
  await readBody(p, `${BASE}/demand`);
  tally('apparel: /demand standalone renders', errs.length === 0, `${errs.length} errs`);
});

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} tests passed`);
process.exit(passed === results.length ? 0 : 1);
