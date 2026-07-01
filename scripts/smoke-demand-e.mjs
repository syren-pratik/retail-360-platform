import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const b = await chromium.launch();
const ctx = await b.newContext();
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE },
  { name: 'rct_tenant', value: 'us_apparel', url: BASE },
]);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`${BASE}/merchandise/demand`, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(6000);
const body = await p.locator('body').innerText();
const hits = ['Apparel Demand Signals', 'Size-Curve Forecast', 'Weather-Driven Demand', 'Brand vs Private Label', 'Returns-Adjusted Sell-Through'].filter((s) => body.includes(s));
console.log('apparel/E:', { errs: errs.length, hits, count: hits.length });
if (errs.length) console.log('  err:', errs[0].substring(0, 250));
await b.close();
