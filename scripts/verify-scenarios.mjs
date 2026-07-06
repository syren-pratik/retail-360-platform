import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: 'https://rct-app.azurewebsites.net' },
  { name: 'rct_tenant', value: 'us_apparel', url: 'https://rct-app.azurewebsites.net' },
]);
const p = await ctx.newPage();
await p.goto('https://rct-app.azurewebsites.net/inventory/deep/scenarios', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(5000);
const body = await p.locator('body').innerText();
const hasApparelSupplier = body.includes('Nike') || body.includes('Levi') || body.includes('Lululemon');
const hasGrocerySupplier = body.includes('Dabur') || body.includes('Hindustan Unilever');
const hasApparelEvent = body.includes('BTS');
const hasGroceryEvent = body.includes('Diwali');
const hasApparelStore = body.includes('Flagship') || body.includes('New York');
const hasGroceryStore = body.includes('Mumbai Hypermarket') || body.includes('Delhi');
const hasApparelDept = body.includes('Mens') || body.includes('Womens');
const hasGroceryDept = body.includes('Grocery & Staples');
console.log('APPAREL SIGNALS:', { nike_levi_lulu: hasApparelSupplier, bts: hasApparelEvent, flagship: hasApparelStore, mens_womens: hasApparelDept });
console.log('GROCERY LEAKS  :', { dabur_hul: hasGrocerySupplier, diwali: hasGroceryEvent, mumbai_hyper: hasGroceryStore, grocery_staples: hasGroceryDept });
await p.screenshot({ path: 'live-scenarios-verified.png', fullPage: true });
await b.close();
