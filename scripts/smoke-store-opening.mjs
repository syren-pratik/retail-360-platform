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
  await p.goto(`${BASE}/merchandise/cold-start/store-opening`, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(5000);
  const body = await p.locator('body').innerText();
  console.log(`${tenant}: len=${body.length}, errs=${errs.length}, $=${(body.match(/\$/g)||[]).length}, ₹=${(body.match(/₹/g)||[]).length}, austin=${body.includes('Austin')||body.includes('Domain')}, hazrat=${body.includes('Hazratganj')}`);
  if (errs.length) console.log('  err:', errs[0].substring(0, 200));
  await ctx.close();
}
await b.close();
