import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const b = await chromium.launch();
const ctx = await b.newContext();
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE },
  { name: 'rct_tenant', value: 'us_apparel', url: BASE },
]);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`${BASE}/price-intel?tab=overview`, { waitUntil: 'networkidle', timeout: 30000 });
await p.waitForTimeout(3500);
const body = await p.locator('body').innerText();
console.log('overview:', { errs: errs.length, cadence: body.includes('Markdown Cadence Ladder'), bvpl: body.includes('Brand vs Private Label'), ragm: body.includes('Returns-Adjusted'), apparel_lifecycle: body.includes('Apparel Lifecycle') });
errs.length && console.log('errs:', errs.slice(0, 3));
await p.goto(`${BASE}/price-intel?tab=markdown`, { waitUntil: 'networkidle', timeout: 30000 });
await p.waitForTimeout(3500);
const body2 = await p.locator('body').innerText();
console.log('markdown:', { cadence: body2.includes('Markdown Cadence Ladder'), grid: body2.includes('Size × Color') });
await b.close();
