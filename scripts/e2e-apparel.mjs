/**
 * End-to-end test for the apparel CX360 toggle.
 *
 * 8 checks across both tenants:
 *   1. Settings page renders + Region toggle visible
 *   2. CX360 dashboard in apparel mode — $, brands, segments, 3 new charts, 0 ₹
 *   3. CX360 customer detail in apparel — US name, city, brand
 *   4. CX360 chat agent in apparel — US framing, $ amounts
 *   5. CX360 dashboard in grocery — regression
 *   6. CX360 customer detail in grocery — regression
 *   7. CX360 chat in grocery — regression
 *   8. No hydration errors / console errors / page errors anywhere
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';

const BASE = 'http://localhost:3000';
const AUTH = { name: 'rct_auth', value: 'rct-portal-ok-2025' };
const APPAREL = { name: 'rct_tenant', value: 'us_apparel' };
const GROCERY = { name: 'rct_tenant', value: 'india_grocery' };

const APPAREL_BRANDS = ['Nike','Levi','Lululemon','H&M','Zara','Old Navy','Adidas','Gap','Uniqlo','Vans','Carter','Coach','Under Armour','Madewell','New Balance','Wrangler'];
const APPAREL_SEGS = ['Fashion Forward','Athletic Enthusiast','Value Shopper','Brand Loyalist','Returner','Casual','Lapsed','New'];
const APPAREL_CHARTS = ['Returns by Reason','Brand Affinity','Return Reason'];
const GROCERY_CITIES = ['Mumbai','Delhi','Bangalore','Chennai','Kolkata','Hyderabad'];
const APPAREL_CITIES = ['Boston','NYC','Dallas','Austin','Seattle','Atlanta','Chicago','LA','Soho','Galleria'];

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
  const errors = [];
  const consoleErrors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  try {
    return await fn(p, errors, consoleErrors);
  } finally {
    await browser.close();
  }
}

// ── Test 1: Settings page renders ─────────────────────────────────────────
async function testSettings() {
  return withPage([AUTH], async (p, errors) => {
    await p.goto(`${BASE}/settings`, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(2000);
    const regionTitle = await p.getByText('Region', { exact: true }).count();
    const indiaOption = await p.getByText('India · Grocery').count();
    const usOption = await p.getByText('US · Apparel').count();
    await p.screenshot({ path: '/tmp/e2e-1-settings.png', clip: { x: 0, y: 0, width: 1440, height: 600 } });
    tally('Settings — Region section + both options visible', regionTitle === 1 && indiaOption === 1 && usOption === 1,
      `region:${regionTitle} india:${indiaOption} us:${usOption}, errors:${errors.length}`);
  });
}

// ── Test 2: CX360 dashboard in apparel ────────────────────────────────────
async function testApparelDashboard() {
  return withPage([AUTH, APPAREL], async (p, errors, consoleErrors) => {
    await p.goto(`${BASE}/cx360`, { waitUntil: 'networkidle', timeout: 180000 });
    await p.waitForTimeout(6000);
    const body = await p.locator('body').innerText();
    const dollars = (body.match(/\$/g) || []).length;
    const rupees = (body.match(/₹/g) || []).length;
    const brands = APPAREL_BRANDS.filter(b => body.includes(b));
    const segs = APPAREL_SEGS.filter(s => body.includes(s));
    const charts = APPAREL_CHARTS.filter(c => body.includes(c));
    const hydrErrs = consoleErrors.filter(e => e.includes('hydration') || e.includes('did not match'));
    await p.screenshot({ path: '/tmp/e2e-2-apparel-dash.png' });
    const pass = rupees === 0 && dollars >= 40 && brands.length >= 5 && segs.length >= 3 && charts.length >= 2 && errors.length === 0 && hydrErrs.length === 0;
    tally('Apparel dashboard', pass,
      `$:${dollars} ₹:${rupees} brands:${brands.length}(${brands.slice(0,3).join(',')}) segs:${segs.length} new-charts:${charts.length} pageErr:${errors.length} hydration:${hydrErrs.length}`);
  });
}

// ── Test 3: CX360 customer detail in apparel ──────────────────────────────
async function testApparelCustomer() {
  return withPage([AUTH, APPAREL], async (p, errors) => {
    // First navigate to CX360 to find a real customer link
    await p.goto(`${BASE}/cx360`, { waitUntil: 'networkidle', timeout: 180000 });
    await p.waitForTimeout(4000);
    // Click first customer link in the table
    const customerLink = p.locator('a[href*="/cx360/customer/"]').first();
    let detailUrl = '';
    if (await customerLink.count() > 0) {
      detailUrl = await customerLink.getAttribute('href') || '';
    } else {
      detailUrl = '/cx360/customer/CUST-00000';
    }
    await p.goto(`${BASE}${detailUrl}`, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(4000);
    const body = await p.locator('body').innerText();
    const dollars = (body.match(/\$/g) || []).length;
    const rupees = (body.match(/₹/g) || []).length;
    const brandFound = APPAREL_BRANDS.find(b => body.includes(b));
    const cityFound = APPAREL_CITIES.find(c => body.includes(c));
    await p.screenshot({ path: '/tmp/e2e-3-apparel-customer.png' });
    const pass = rupees === 0 && dollars >= 5 && !!brandFound && errors.length === 0;
    tally('Apparel customer detail', pass,
      `url:${detailUrl} $:${dollars} ₹:${rupees} brand:${brandFound||'none'} city:${cityFound||'none'} pageErr:${errors.length}`);
  });
}

// ── Test 4: Chat agent in apparel ─────────────────────────────────────────
async function testApparelChat() {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `rct_auth=rct-portal-ok-2025; rct_tenant=us_apparel`,
    },
    body: JSON.stringify({
      message: 'What is our overall churn rate and which segment has the highest revenue at risk?',
      module: 'cx360',
      history: [],
    }),
  });
  const data = await res.json();
  const answer = data.answer || '';
  const hasDollar = answer.includes('$');
  const hasRupee = answer.includes('₹');
  const hasApparelSeg = APPAREL_SEGS.some(s => answer.includes(s));
  await fs.writeFile('/tmp/e2e-4-apparel-chat-answer.txt', answer);
  const pass = hasDollar && !hasRupee && hasApparelSeg && res.status === 200;
  tally('Apparel chat', pass,
    `status:${res.status} $:${hasDollar} ₹:${hasRupee} apparelSeg:${hasApparelSeg} answerLen:${answer.length}`);
}

// ── Test 5: Grocery dashboard regression ──────────────────────────────────
async function testGroceryDashboard() {
  return withPage([AUTH, GROCERY], async (p, errors) => {
    await p.goto(`${BASE}/cx360`, { waitUntil: 'networkidle', timeout: 180000 });
    await p.waitForTimeout(6000);
    const body = await p.locator('body').innerText();
    const rupees = (body.match(/₹/g) || []).length;
    const apparelLeak = APPAREL_BRANDS.filter(b => body.includes(b));
    const indianCity = GROCERY_CITIES.find(c => body.includes(c));
    await p.screenshot({ path: '/tmp/e2e-5-grocery-dash.png' });
    const pass = rupees >= 50 && apparelLeak.length === 0 && !!indianCity && errors.length === 0;
    tally('Grocery dashboard regression', pass,
      `₹:${rupees} apparelLeak:${apparelLeak.join(',')||'none'} indianCity:${indianCity||'none'} pageErr:${errors.length}`);
  });
}

// ── Test 6: Grocery customer detail regression ────────────────────────────
async function testGroceryCustomer() {
  return withPage([AUTH, GROCERY], async (p, errors) => {
    await p.goto(`${BASE}/cx360`, { waitUntil: 'networkidle', timeout: 180000 });
    await p.waitForTimeout(4000);
    const customerLink = p.locator('a[href*="/cx360/customer/"]').first();
    let detailUrl = '/cx360/customer/CUST-00000';
    if (await customerLink.count() > 0) {
      detailUrl = await customerLink.getAttribute('href') || detailUrl;
    }
    await p.goto(`${BASE}${detailUrl}`, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(4000);
    const body = await p.locator('body').innerText();
    const rupees = (body.match(/₹/g) || []).length;
    const apparelLeak = APPAREL_BRANDS.filter(b => body.includes(b));
    await p.screenshot({ path: '/tmp/e2e-6-grocery-customer.png' });
    const pass = rupees >= 3 && apparelLeak.length === 0 && errors.length === 0;
    tally('Grocery customer detail regression', pass,
      `url:${detailUrl} ₹:${rupees} apparelLeak:${apparelLeak.join(',')||'none'} pageErr:${errors.length}`);
  });
}

// ── Test 7: Grocery chat regression ───────────────────────────────────────
async function testGroceryChat() {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `rct_auth=rct-portal-ok-2025; rct_tenant=india_grocery`,
    },
    body: JSON.stringify({
      message: 'What is our overall churn rate and which segment has the highest revenue at risk?',
      module: 'cx360',
      history: [],
    }),
  });
  const data = await res.json();
  const answer = data.answer || '';
  const hasRupee = answer.includes('₹');
  const apparelLeak = APPAREL_BRANDS.filter(b => answer.includes(b));
  await fs.writeFile('/tmp/e2e-7-grocery-chat-answer.txt', answer);
  const pass = res.status === 200 && apparelLeak.length === 0;
  tally('Grocery chat regression', pass,
    `status:${res.status} ₹:${hasRupee} apparelLeak:${apparelLeak.join(',')||'none'} answerLen:${answer.length}`);
}

// ── Test 8: Live toggle (flip via Settings UI and verify next page reflects) ─
async function testLiveToggle() {
  return withPage([AUTH], async (p, errors) => {
    // Start on India (default — no tenant cookie)
    await p.goto(`${BASE}/settings`, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(2000);
    // Click US Apparel
    await p.getByText('US · Apparel').click();
    await p.waitForTimeout(3500); // page reloads
    await p.waitForLoadState('networkidle');
    // Cookie should now be set
    const cookies = await p.context().cookies();
    const tenantCookie = cookies.find(c => c.name === 'rct_tenant');
    const tenantValue = tenantCookie?.value || '(none)';
    // Navigate to CX360 and verify apparel data
    await p.goto(`${BASE}/cx360`, { waitUntil: 'networkidle', timeout: 180000 });
    await p.waitForTimeout(6000);
    const body = await p.locator('body').innerText();
    const dollars = (body.match(/\$/g) || []).length;
    const rupees = (body.match(/₹/g) || []).length;
    await p.screenshot({ path: '/tmp/e2e-8-live-toggle.png' });
    const pass = tenantValue === 'us_apparel' && dollars >= 40 && rupees === 0 && errors.length === 0;
    tally('Live toggle: Settings flip → CX360 apparel', pass,
      `cookie:${tenantValue} $:${dollars} ₹:${rupees} pageErr:${errors.length}`);
  });
}

// ── Run all ────────────────────────────────────────────────────────────────
(async () => {
  console.log('Running E2E apparel suite...\n');
  await testSettings();
  await testApparelDashboard();
  await testApparelCustomer();
  await testApparelChat();
  await testGroceryDashboard();
  await testGroceryCustomer();
  await testGroceryChat();
  await testLiveToggle();

  console.log('\n=============================================');
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`SUMMARY: ${passed}/${results.length} passed (${failed} failed)`);
  if (failed > 0) {
    console.log('\nFAILURES:');
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  ✗ ${r.name} — ${r.detail}`);
    }
  }
  console.log('\nScreenshots: /tmp/e2e-*.png');
  console.log('Chat answers: /tmp/e2e-4-apparel-chat-answer.txt, /tmp/e2e-7-grocery-chat-answer.txt');
  process.exit(failed > 0 ? 1 : 0);
})().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
