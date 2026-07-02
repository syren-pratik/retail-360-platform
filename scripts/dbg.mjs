import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const b = await chromium.launch();
const ctx = await b.newContext();
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE },
  { name: 'rct_tenant', value: 'us_apparel', url: BASE },
]);
const p = await ctx.newPage();
await p.goto(`${BASE}/merchandise/cold-start`, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(5000);
const body = await p.locator('body').innerText();
for (const t of ['Apparel Cold-Start Signals', 'Analog City Similarity', 'Brand vs PL Penetration Ramp', 'Austin']) {
  console.log(body.includes(t) ? '✓' : '✗', t);
}
await b.close();
