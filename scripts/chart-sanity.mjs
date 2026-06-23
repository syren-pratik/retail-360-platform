import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const OUT = '/tmp/chart-sanity';
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { name: 'overview', url: '/price-intel?tab=overview' },
  { name: 'promo', url: '/price-intel?tab=promo' },
  { name: 'markdown', url: '/price-intel?tab=markdown' },
  { name: 'forecasting', url: '/price-intel?tab=forecasting' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE }]);
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push('PAGEERROR: ' + err.message));

for (const p of PAGES) {
  await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${p.name}-full.png`, fullPage: true });
  console.log(`captured ${p.name}`);
}

if (consoleErrors.length) {
  console.log('\n--- CONSOLE ERRORS ---');
  consoleErrors.forEach((e) => console.log(e));
} else {
  console.log('\nNo console errors.');
}

await browser.close();
