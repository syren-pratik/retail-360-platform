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
await p.goto(`${BASE}/price-intel?tab=agents`, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(5000);
const body = await p.locator('body').innerText();
const hits = ['Apparel AI Agents enabled', 'Promo', 'Markdown', 'Competitive', 'Weekly'].filter((s) => body.includes(s));
console.log('apparel/agents:', { hits: hits.length + '/5', errs: errs.length, dollars: (body.match(/\$/g) || []).length, rupees: (body.match(/₹/g) || []).length });
if (errs.length) console.log('  err:', errs[0].substring(0, 200));
await b.close();
