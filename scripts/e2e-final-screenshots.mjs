/**
 * Final apparel E2E — screenshots + data verification for every chart page.
 * Screenshots go to /tmp/rct-screenshots/
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = 'http://localhost:3000';
const OUT = '/tmp/rct-screenshots';
mkdirSync(OUT, { recursive: true });

const AUTH = { name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE };
const APPAREL = { name: 'rct_tenant', value: 'us_apparel', url: BASE };
const GROCERY = { name: 'rct_tenant', value: 'india_grocery', url: BASE };

const PAGES = [
  { path: '/cx360',                             name: 'cx360',              expect: ['Fashion Forward', 'Athletic Enthusiast'] },
  { path: '/inventory',                         name: 'inventory',          expect: ['Size Curve', 'Style Velocity'] },
  { path: '/price-intel',                       name: 'price-intel',        expect: ['Markdown Cadence Ladder', 'Brand vs Private Label'] },
  { path: '/price-intel?tab=markdown',          name: 'price-intel-markdown', expect: ['Size × Color', 'Markdown Queue'] },
  { path: '/price-intel?tab=agents',            name: 'price-intel-agents', expect: ['Apparel AI Agents enabled', 'Promo Scenario'] },
  { path: '/merchandise/demand',                name: 'merch-demand',       expect: ['APPAREL DEMAND SIGNALS', 'Size-Curve Forecast'] },
  { path: '/merchandise/cold-start',            name: 'cold-start',         expect: ['Austin', 'Analog City Similarity'] },
  { path: '/merchandise/cold-start/store-opening', name: 'store-opening',   expect: ['Austin', 'BTS', 'Domain'] },
];

const results = [];
async function run() {
  const b = await chromium.launch();
  for (const page of PAGES) {
    for (const tenant of [APPAREL, GROCERY]) {
      const ctx = await b.newContext({ viewport: { width: 1920, height: 1400 }, deviceScaleFactor: 1 });
      await ctx.addCookies([AUTH, tenant]);
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      try {
        await p.goto(`${BASE}${page.path}`, { waitUntil: 'networkidle', timeout: 60000 });
        await p.waitForTimeout(6000);
        const body = await p.locator('body').innerText();
        const hits = tenant.value === 'us_apparel' ? page.expect.filter((s) => body.includes(s)) : [];
        const dollars = (body.match(/\$/g) || []).length;
        const rupees = (body.match(/₹/g) || []).length;
        const shotPath = `${OUT}/${tenant.value}-${page.name}.png`;
        await p.screenshot({ path: shotPath, fullPage: true });
        results.push({
          page: page.name,
          tenant: tenant.value,
          errs: errs.length,
          content_len: body.length,
          dollars,
          rupees,
          apparel_hits: tenant.value === 'us_apparel' ? `${hits.length}/${page.expect.length}` : '—',
          shot: shotPath,
        });
        console.log(`${tenant.value === 'us_apparel' ? '🟢' : '🔵'} ${page.name} (${tenant.value}): errs=${errs.length}, len=${body.length}, $=${dollars}, ₹=${rupees}${tenant.value === 'us_apparel' ? `, hits=${hits.length}/${page.expect.length}` : ''}`);
      } catch (e) {
        console.log(`✗ ${page.name} (${tenant.value}): ${e.message}`);
        results.push({ page: page.name, tenant: tenant.value, error: e.message });
      } finally {
        await ctx.close();
      }
    }
  }
  await b.close();
}
await run();

console.log('\n=== APPAREL SUMMARY ===');
const apparel = results.filter((r) => r.tenant === 'us_apparel');
console.log(`  clean pages: ${apparel.filter((r) => r.errs === 0).length}/${apparel.length}`);
console.log(`  $-dominant pages: ${apparel.filter((r) => r.dollars > 0 && r.rupees === 0).length}/${apparel.length}`);
console.log(`  ₹-leaking pages: ${apparel.filter((r) => r.rupees > 0).map((r) => `${r.page}(₹${r.rupees})`).join(', ') || 'none'}`);

console.log('\n=== GROCERY REGRESSION ===');
const grocery = results.filter((r) => r.tenant === 'india_grocery');
console.log(`  clean pages: ${grocery.filter((r) => r.errs === 0).length}/${grocery.length}`);
console.log(`  ₹-present pages: ${grocery.filter((r) => r.rupees > 0).length}/${grocery.length}`);

console.log(`\n${results.length} screenshots saved to ${OUT}/`);
