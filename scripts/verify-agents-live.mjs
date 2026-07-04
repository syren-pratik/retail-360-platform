import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: 'https://rct-app.azurewebsites.net' },
  { name: 'rct_tenant', value: 'us_apparel', url: 'https://rct-app.azurewebsites.net' },
]);
const p = await ctx.newPage();
await p.goto('https://rct-app.azurewebsites.net/price-intel?tab=agents', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(5000);
// Click Promo Scenario Planner card to expand
const clicked = await p.evaluate(() => {
  const el = Array.from(document.querySelectorAll('button, [role="button"], div.cursor-pointer, [class*="cursor-pointer"]'))
    .find(el => el.textContent && el.textContent.includes('Promo Scenario Planner'));
  if (el) { el.click(); return true; }
  return false;
});
console.log('click ok:', clicked);
await p.waitForTimeout(3000);
const selectData = await p.evaluate(() => {
  const selects = document.querySelectorAll('select');
  const result = [];
  selects.forEach((s) => {
    if (s.options.length > 0) {
      result.push({ first: s.options[0].textContent?.substring(0, 100), count: s.options.length });
    }
  });
  return result;
});
console.log('selects:', JSON.stringify(selectData, null, 2));
await p.screenshot({ path: 'live-agents-expanded.png', fullPage: true });
await b.close();
