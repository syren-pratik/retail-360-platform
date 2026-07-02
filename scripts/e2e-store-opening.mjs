import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const AUTH = { name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE };
const APPAREL = { name: 'rct_tenant', value: 'us_apparel', url: BASE };
const GROCERY = { name: 'rct_tenant', value: 'india_grocery', url: BASE };
const results = [];
const tally = (name, pass, d) => { results.push({ name, pass }); console.log(`${pass ? '✓' : '✗'} ${name} — ${d}`); };
async function run(cookies, fn) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(cookies);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  try { await fn(p, errs); } finally { await b.close(); }
}
async function body(p) { await p.waitForTimeout(4500); return p.locator('body').innerText(); }

await run([AUTH, APPAREL], async (p, errs) => {
  await p.goto(`${BASE}/merchandise/cold-start/store-opening`, { waitUntil: 'networkidle', timeout: 60000 });
  const b = await body(p);
  const hits = ['Austin', 'Domain', 'BTS', 'BFCM'].filter((s) => b.includes(s));
  const rupees = (b.match(/₹/g) || []).length;
  const dollars = (b.match(/\$/g) || []).length;
  tally('apparel: austin flagship + BTS/BFCM markers + $ dominant', hits.length >= 3 && rupees === 0 && dollars >= 10 && errs.length === 0, `${hits.length}/4 hits, $${dollars}, ₹${rupees}, ${errs.length} errs`);
});
await run([AUTH, GROCERY], async (p, errs) => {
  await p.goto(`${BASE}/merchandise/cold-start/store-opening`, { waitUntil: 'networkidle', timeout: 60000 });
  const b = await body(p);
  const leaked = b.includes('Austin') || b.includes('BFCM');
  const rupees = (b.match(/₹/g) || []).length;
  tally('grocery: no apparel leak, ₹ present', !leaked && rupees >= 5 && errs.length === 0, `leaked=${leaked} ₹${rupees} errs=${errs.length}`);
});
const p = results.filter((r) => r.pass).length;
console.log(`\n${p}/${results.length} passed`);
process.exit(p === results.length ? 0 : 1);
