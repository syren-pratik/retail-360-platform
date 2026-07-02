import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1200 } });
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE },
  { name: 'rct_tenant', value: 'us_apparel', url: BASE },
]);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push({ msg: e.message, stack: e.stack?.substring(0, 500) }));
await p.goto(`${BASE}/cx360`, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(6000);
const body = await p.locator('body').innerText();
console.log('has "RFM":', body.includes('RFM'));
console.log('has "9-Box":', body.includes('9-Box'));
console.log('has "Recency":', body.includes('Recency'));
console.log('has "Frequency":', body.includes('Frequency'));
console.log('has "80K customers":', body.includes('80K customers'));
console.log('errs:', errs.length);
errs.slice(0, 3).forEach((e,i) => console.log(`err ${i}:`, e.msg, '\n', e.stack));

// Scroll to RFM section and screenshot
try {
  const el = await p.locator('#chart-rfm_scatter').first();
  await el.scrollIntoViewIfNeeded({ timeout: 3000 });
  await p.waitForTimeout(1000);
  await el.screenshot({ path: '/tmp/rfm-apparel.png' });
  console.log('screenshot: /tmp/rfm-apparel.png');
} catch (e) { console.log('screenshot err:', e.message.substring(0, 200)); }

await b.close();
