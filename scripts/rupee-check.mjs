import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext();
const BASE = 'http://localhost:3000';
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE },
  { name: 'rct_tenant', value: 'us_apparel', url: BASE },
]);
const p = await ctx.newPage();
await p.goto(`${BASE}/merchandise/demand`, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(6000);
const body = await p.locator('body').innerText();
const lines = body.split('\n').filter((l) => l.includes('₹'));
console.log(lines.length, 'rupee lines:');
lines.slice(0, 10).forEach((l) => console.log('  ', l.substring(0, 100)));
await b.close();
