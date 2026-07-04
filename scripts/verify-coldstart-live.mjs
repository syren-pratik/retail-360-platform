import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: 'https://rct-app.azurewebsites.net' },
  { name: 'rct_tenant', value: 'us_apparel', url: 'https://rct-app.azurewebsites.net' },
]);
const p = await ctx.newPage();
await p.goto('https://rct-app.azurewebsites.net/merchandise/cold-start', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(6000);
// scroll to Prediction Decomposition
await p.evaluate(() => {
  const el = Array.from(document.querySelectorAll('*')).find(x => x.textContent && x.textContent.trim().startsWith('Prediction Decomposition'));
  if (el) el.scrollIntoView({ block: 'start' });
});
await p.waitForTimeout(2000);
await p.screenshot({ path: 'live-decomp-blend.png' });
// also festival ramp
await p.evaluate(() => {
  const el = Array.from(document.querySelectorAll('*')).find(x => x.textContent && x.textContent.trim().startsWith('Festival Demand Ramp'));
  if (el) el.scrollIntoView({ block: 'start' });
});
await p.waitForTimeout(2000);
await p.screenshot({ path: 'live-festival-ramp.png' });
console.log('saved');
await b.close();
