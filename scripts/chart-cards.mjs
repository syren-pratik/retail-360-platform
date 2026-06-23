import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const OUT = '/tmp/chart-sanity/cards';
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { name: 'overview', url: '/price-intel?tab=overview' },
  { name: 'promo', url: '/price-intel?tab=promo' },
  { name: 'markdown', url: '/price-intel?tab=markdown' },
  { name: 'forecasting', url: '/price-intel?tab=forecasting' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await ctx.addCookies([{ name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE }]);
const page = await ctx.newPage();

for (const p of PAGES) {
  await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  // every recharts chart sits inside a ResponsiveContainer; capture its nearest card ancestor
  const cards = page.locator('.recharts-responsive-container');
  const n = await cards.count();
  console.log(`${p.name}: ${n} charts`);
  for (let i = 0; i < n; i++) {
    const el = cards.nth(i);
    const card = el.locator('xpath=ancestor::div[contains(@class,"card")][1]');
    const target = (await card.count()) > 0 ? card : el;
    try {
      await target.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await target.screenshot({ path: `${OUT}/${p.name}-chart${i}.png` });
    } catch (e) {
      console.log(`  skip ${p.name}-chart${i}: ${e.message.split('\n')[0]}`);
    }
  }
}

await browser.close();
console.log('done');
