import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const b = await chromium.launch();

for (const tenant of ['us_apparel', 'india_grocery']) {
  const ctx = await b.newContext();
  await ctx.addCookies([
    { name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE },
    { name: 'rct_tenant', value: tenant, url: BASE },
  ]);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${BASE}/merchandise/demand`, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(6000);
  const body = await p.locator('body').innerText();
  const dollars = (body.match(/\$/g) || []).length;
  const rupees = (body.match(/₹/g) || []).length;
  console.log(`${tenant}: len=${body.length}, errs=${errs.length}, $=${dollars}, ₹=${rupees}`);
  if (errs.length) console.log('  first:', errs[0].substring(0, 200));
  await ctx.close();
}
await b.close();
