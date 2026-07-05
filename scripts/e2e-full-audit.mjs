/**
 * Full end-to-end audit of every apparel-mode page.
 * For each page: navigate → wait for network idle → scroll top-to-bottom taking
 * viewport screenshots → run DOM assertions for empty charts, grocery leaks,
 * missing SKU data → collect page errors and console errors.
 *
 * Runs against the LIVE deployed site.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'https://rct-app.azurewebsites.net';
const OUT = '/Users/pratikbharuka/Desktop/cx360-app/e2e-audit';

const AUTH = { name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE };
const APPAREL = { name: 'rct_tenant', value: 'us_apparel', url: BASE };
const GROCERY = { name: 'rct_tenant', value: 'india_grocery', url: BASE };

// Every apparel page + expandable interaction
const PAGES = [
  { path: '/cx360',                                          name: 'cx360',                    expand: [] },
  { path: '/inventory',                                       name: 'inventory',                expand: [] },
  { path: '/inventory/deep/stock-health',                     name: 'inventory-deep-stock',     expand: [] },
  { path: '/inventory/deep/supply-chain',                     name: 'inventory-deep-supply',    expand: [] },
  { path: '/inventory/deep/demand-forecast',                  name: 'inventory-deep-demand',    expand: [] },
  { path: '/price-intel',                                     name: 'price-intel-overview',     expand: [] },
  { path: '/price-intel?tab=promo',                           name: 'price-intel-promo',        expand: [] },
  { path: '/price-intel?tab=markdown',                        name: 'price-intel-markdown',     expand: [] },
  { path: '/price-intel?tab=forecasting',                     name: 'price-intel-forecasting',  expand: [] },
  { path: '/price-intel?tab=agents',                          name: 'price-intel-agents',       expand: ['Promo Scenario Planner', 'Price Strategy Advisor', 'Markdown Timing Optimizer', 'Competitive Response Analyst', 'Weekly Pricing Brief'] },
  { path: '/merchandise/demand',                              name: 'merch-demand',             expand: [] },
  { path: '/merchandise/cold-start',                          name: 'cold-start',               expand: [] },
  { path: '/merchandise/cold-start/store-opening',            name: 'store-opening',            expand: [] },
  { path: '/demand',                                          name: 'demand-standalone',        expand: [] },
];

// Grocery-text patterns that MUST NOT appear on apparel pages
const GROCERY_LEAK_PATTERNS = [
  'Lucknow', 'Jaipur', 'Ahmedabad', 'Kolkata', 'Mumbai', 'Hazratganj',
  'Diwali', 'Onam', '\\bHoli\\b', 'Eid',
  'PRD-0', 'LKO-SKU', 'STR-LKO',
  'Edible Oil', 'Frozen Foods', 'Wheat Atta', 'Basmati',
  'Grocery & Staples',
];

// Empty-state markers that indicate data mismatch
const EMPTY_STATE_MARKERS = [
  'No decomposition data', 'No data available', 'No forecasts available',
  'Select a department to load', 'No SKUs match', 'Empty',
];

// Broken JSX template markers (my earlier bulk sed left these)
const BROKEN_TEMPLATE_MARKERS = [
  '{payload.', '{filters.', '{sku.', '${',
];

async function auditPage(browser, page, cookies, label) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1200 } });
  await ctx.addCookies(cookies);
  const p = await ctx.newPage();

  const pageErrors = [];
  const consoleErrors = [];
  p.on('pageerror', (e) => pageErrors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().substring(0, 300)); });

  const report = {
    page: page.name,
    tenant: label,
    url: page.path,
    pageErrors: [],
    consoleErrors: [],
    groceryLeaks: [],
    emptyStates: [],
    brokenTemplates: [],
    contentLen: 0,
    dollars: 0,
    rupees: 0,
    apparelWords: 0,
    accordionsExpanded: 0,
    screenshots: [],
  };

  try {
    await p.goto(`${BASE}${page.path}`, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(6000);

    // Screenshot before interactions
    const shotPath = `${OUT}/${label}-${page.name}-before.png`;
    await p.screenshot({ path: shotPath, fullPage: true });
    report.screenshots.push(shotPath);

    // Expand accordions if configured
    for (const label of page.expand) {
      const clicked = await p.evaluate((needle) => {
        const el = Array.from(document.querySelectorAll('*'))
          .find(x => x.textContent && x.textContent.trim().startsWith(needle) && x.getBoundingClientRect().height < 200);
        if (el) { el.click(); return true; }
        return false;
      }, label);
      if (clicked) {
        await p.waitForTimeout(2000);
        report.accordionsExpanded++;
      }
    }

    // Screenshot after interactions
    if (page.expand.length > 0) {
      const shotAfter = `${OUT}/${label}-${page.name}-after.png`;
      await p.screenshot({ path: shotAfter, fullPage: true });
      report.screenshots.push(shotAfter);
    }

    // Body text analysis
    const body = await p.locator('body').innerText();
    report.contentLen = body.length;
    report.dollars = (body.match(/\$/g) || []).length;
    report.rupees = (body.match(/₹/g) || []).length;

    // Grocery-leak scan (only relevant for apparel tenant)
    if (label === 'apparel') {
      for (const pat of GROCERY_LEAK_PATTERNS) {
        const count = (body.match(new RegExp(pat.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g')) || []).length;
        if (count > 0) report.groceryLeaks.push({ pattern: pat, count });
      }
      // Apparel-word verification
      const apparelPatterns = ['Austin', 'Dallas', 'BTS', 'BFCM', 'Mens', 'Womens', 'Kids', 'Footwear', 'Nike', 'Adidas', 'AUS-SKU', 'APR-'];
      for (const pat of apparelPatterns) {
        if (body.includes(pat)) report.apparelWords++;
      }
    }

    // Empty-state detection
    for (const marker of EMPTY_STATE_MARKERS) {
      if (body.includes(marker)) report.emptyStates.push(marker);
    }

    // Broken JSX template detection
    for (const marker of BROKEN_TEMPLATE_MARKERS) {
      const count = (body.match(new RegExp(marker.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g')) || []).length;
      if (count > 0) report.brokenTemplates.push({ marker, count });
    }

    report.pageErrors = pageErrors;
    report.consoleErrors = consoleErrors;
  } catch (e) {
    report.pageErrors.push(`NAVIGATION: ${e.message}`);
  } finally {
    await ctx.close();
  }

  return report;
}

const browser = await chromium.launch();

const results = [];
console.log('=== APPAREL PAGES ===');
for (const page of PAGES) {
  process.stdout.write(`  ${page.name}... `);
  const r = await auditPage(browser, page, [AUTH, APPAREL], 'apparel');
  const status = r.pageErrors.length === 0 && r.emptyStates.length === 0 && r.groceryLeaks.length === 0 && r.brokenTemplates.length === 0 ? '✓' : '✗';
  console.log(`${status} errs=${r.pageErrors.length} empty=${r.emptyStates.length} leaks=${r.groceryLeaks.length} broken=${r.brokenTemplates.length} $${r.dollars} ₹${r.rupees}`);
  results.push(r);
}

console.log('\n=== GROCERY REGRESSION (spot check) ===');
for (const page of [PAGES[0], PAGES[1], PAGES[5], PAGES[10], PAGES[11]]) {
  process.stdout.write(`  ${page.name}... `);
  const r = await auditPage(browser, page, [AUTH, GROCERY], 'grocery');
  const status = r.pageErrors.length === 0 ? '✓' : '✗';
  console.log(`${status} errs=${r.pageErrors.length} $${r.dollars} ₹${r.rupees}`);
  results.push(r);
}

await browser.close();

writeFileSync(`${OUT}/audit-report.json`, JSON.stringify(results, null, 2));

// Summary
console.log('\n\n=== ISSUES FOUND (apparel pages) ===');
const apparelResults = results.filter(r => r.tenant === 'apparel');
apparelResults.forEach(r => {
  const issues = [];
  if (r.pageErrors.length) issues.push(`  ⚠️  ${r.pageErrors.length} page errors: ${r.pageErrors.slice(0,2).join(' | ').substring(0, 200)}`);
  if (r.emptyStates.length) issues.push(`  🔴 empty states: ${r.emptyStates.join(', ')}`);
  if (r.groceryLeaks.length) issues.push(`  🟡 grocery leaks: ${r.groceryLeaks.map(l => `${l.pattern}×${l.count}`).join(', ')}`);
  if (r.brokenTemplates.length) issues.push(`  🔴 broken JSX: ${r.brokenTemplates.map(l => `${l.marker}×${l.count}`).join(', ')}`);
  if (r.rupees > 0) issues.push(`  🟡 ${r.rupees} ₹ leaks`);
  if (issues.length) {
    console.log(`\n${r.page}:`);
    issues.forEach(i => console.log(i));
  }
});

console.log('\n\n=== SUMMARY ===');
console.log(`Apparel pages: ${apparelResults.length}`);
console.log(`Clean pages: ${apparelResults.filter(r => r.pageErrors.length === 0 && r.emptyStates.length === 0 && r.groceryLeaks.length === 0 && r.brokenTemplates.length === 0).length}`);
console.log(`Screenshots: ${OUT}/`);
console.log(`Full report: ${OUT}/audit-report.json`);
