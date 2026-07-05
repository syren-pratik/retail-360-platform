import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext();
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: 'https://rct-app.azurewebsites.net' },
  { name: 'rct_tenant', value: 'us_apparel', url: 'https://rct-app.azurewebsites.net' },
]);
for (const url of ['/price-intel', '/merchandise/cold-start', '/inventory/deep/stock-health']) {
  const p = await ctx.newPage();
  await p.goto('https://rct-app.azurewebsites.net' + url, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(5000);
  const body = await p.locator('body').innerText();
  const rupeeContexts = body.split('\n').filter(l => l.includes('₹')).slice(0, 20);
  const groceryContexts = body.split('\n').filter(l => l.includes('Grocery & Staples')).slice(0, 5);
  console.log(`\n=== ${url}`);
  console.log('₹ contexts (' + rupeeContexts.length + '):');
  rupeeContexts.forEach(c => console.log('  →', c.substring(0, 120)));
  if (groceryContexts.length) {
    console.log('Grocery & Staples contexts:');
    groceryContexts.forEach(c => console.log('  →', c.substring(0, 120)));
  }
  await p.close();
}
await b.close();
