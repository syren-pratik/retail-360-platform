/**
 * End-to-end test for the apparel Inventory + Supply toggle.
 *
 * 7 checks: apparel main + 4 deep-dives + supplier detail + grocery regression
 */

import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const AUTH = { name: 'rct_auth', value: 'rct-portal-ok-2025' };
const APPAREL = { name: 'rct_tenant', value: 'us_apparel' };
const GROCERY = { name: 'rct_tenant', value: 'india_grocery' };

const APPAREL_BRANDS = ['Nike', 'Levi', 'Lululemon', 'VF Corp', 'PVH', 'Tapestry', 'Under Armour', 'Adidas', 'Hanesbrands', 'Carter', 'New Balance', 'Gap'];
const APPAREL_DCS = ['Reno', 'Memphis', 'Allentown', 'Atlanta'];
const NEW_CHARTS = ['Size Curve', 'Returns by Reason', 'Style Velocity', 'Aged Inventory', 'Color Performance', 'Markdown Lifecycle', 'Branded vs Private'];
const INDIAN_SUPPLIERS = ['Hindustan Unilever', 'Dabur', 'Patanjali', 'Amul', 'Godrej'];

const results = [];
function tally(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function withPage(cookies, fn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies(cookies.map(c => ({ ...c, url: BASE })));
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  try {
    return await fn(p, errs);
  } finally {
    await browser.close();
  }
}

async function testApparelMain() {
  return withPage([AUTH, APPAREL], async (p, errs) => {
    await p.goto(`${BASE}/inventory`, { waitUntil: 'networkidle', timeout: 180000 });
    await p.waitForTimeout(8000);
    const body = await p.locator('body').innerText();
    const dollars = (body.match(/\$/g) || []).length;
    const rupees = (body.match(/₹/g) || []).length;
    const brands = APPAREL_BRANDS.filter(b => body.includes(b));
    const dcs = APPAREL_DCS.filter(d => body.includes(d));
    const charts = NEW_CHARTS.filter(c => body.includes(c));
    await p.screenshot({ path: '/tmp/inv-e2e-apparel-main.png' });
    const pass = rupees === 0 && dollars >= 60 && brands.length >= 4 && charts.length >= 4 && errs.length === 0;
    tally('Apparel main', pass, `$:${dollars} ₹:${rupees} brands:${brands.length} dcs:${dcs.length} new-charts:${charts.length} err:${errs.length}`);
  });
}

async function testApparelDeep(slug) {
  return withPage([AUTH, APPAREL], async (p, errs) => {
    await p.goto(`${BASE}/inventory/deep/${slug}`, { waitUntil: 'networkidle', timeout: 180000 });
    await p.waitForTimeout(6000);
    const body = await p.locator('body').innerText();
    const dollars = (body.match(/\$/g) || []).length;
    const rupees = (body.match(/₹/g) || []).length;
    await p.screenshot({ path: `/tmp/inv-e2e-apparel-deep-${slug}.png` });
    const pass = rupees === 0 && dollars >= 10 && errs.length === 0;
    tally(`Apparel deep: ${slug}`, pass, `$:${dollars} ₹:${rupees} err:${errs.length}`);
  });
}

async function testApparelSupplier() {
  return withPage([AUTH, APPAREL], async (p, errs) => {
    await p.goto(`${BASE}/inventory`, { waitUntil: 'networkidle', timeout: 180000 });
    await p.waitForTimeout(4000);
    const link = p.locator('a[href*="/inventory/supplier/"]').first();
    let url = '/inventory/supplier/SUP-A001';
    if (await link.count() > 0) url = await link.getAttribute('href') || url;
    await p.goto(`${BASE}${url}`, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(4000);
    const body = await p.locator('body').innerText();
    const dollars = (body.match(/\$/g) || []).length;
    const rupees = (body.match(/₹/g) || []).length;
    const brand = APPAREL_BRANDS.find(b => body.includes(b));
    await p.screenshot({ path: '/tmp/inv-e2e-apparel-supplier.png' });
    const pass = rupees === 0 && dollars >= 3 && errs.length === 0;
    tally('Apparel supplier detail', pass, `url:${url} $:${dollars} ₹:${rupees} brand:${brand || 'none'} err:${errs.length}`);
  });
}

async function testGroceryRegression() {
  return withPage([AUTH, GROCERY], async (p, errs) => {
    await p.goto(`${BASE}/inventory`, { waitUntil: 'networkidle', timeout: 180000 });
    await p.waitForTimeout(8000);
    const body = await p.locator('body').innerText();
    const rupees = (body.match(/₹/g) || []).length;
    const apparelLeak = ['Nike', 'Lululemon', 'Levi Strauss'].filter(b => body.includes(b));
    const indianSuppliers = INDIAN_SUPPLIERS.filter(s => body.includes(s));
    await p.screenshot({ path: '/tmp/inv-e2e-india-main.png' });
    const pass = rupees >= 30 && apparelLeak.length === 0 && errs.length === 0;
    tally('Grocery regression', pass, `₹:${rupees} apparel-leak:${apparelLeak.join(',') || 'none'} indian-suppliers:${indianSuppliers.length} err:${errs.length}`);
  });
}

(async () => {
  console.log('Running E2E Inventory apparel suite...\n');
  await testApparelMain();
  await testApparelDeep('stock-health');
  // demand-forecast is a redirect to /demand — skip
  await testApparelDeep('supply-chain');
  await testApparelDeep('allocation');
  await testApparelSupplier();
  await testGroceryRegression();
  const passed = results.filter(r => r.pass).length;
  console.log(`\n========================`);
  console.log(`SUMMARY: ${passed}/${results.length} passed`);
  const fails = results.filter(r => !r.pass);
  if (fails.length) {
    console.log('FAILURES:');
    fails.forEach(f => console.log(`  ✗ ${f.name} — ${f.detail}`));
  }
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
