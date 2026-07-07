import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: 'https://rct-app.azurewebsites.net' },
  { name: 'rct_tenant', value: 'us_apparel', url: 'https://rct-app.azurewebsites.net' },
]);
const p = await ctx.newPage();
await p.goto('https://rct-app.azurewebsites.net/price-intel?tab=agents', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(4000);
// Click Competitive Response Analyst to expand
const clicked = await p.evaluate(() => {
  const el = Array.from(document.querySelectorAll('button, [role="button"], div.cursor-pointer, [class*="cursor-pointer"]'))
    .find(el => el.textContent && el.textContent.includes('Competitive Response'));
  if (el) { el.click(); return true; }
  return false;
});
console.log('clicked:', clicked);
await p.waitForTimeout(3000);
const body = await p.locator('body').innerText();
console.log('has Zepto:', body.includes('Zepto'));
console.log('has Blinkit:', body.includes('Blinkit'));
console.log('has BigBasket:', body.includes('BigBasket'));
console.log('has Nordstrom:', body.includes('Nordstrom'));
console.log('has Macy:', body.includes("Macy"));
console.log('has Amazon Fashion:', body.includes('Amazon Fashion'));
await p.screenshot({ path: 'live-competitive-verified.png', fullPage: true });
await b.close();
