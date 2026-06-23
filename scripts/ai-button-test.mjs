import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const OUT = '/tmp/ai-button';
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { name: 'price-intel', url: '/price-intel?tab=promo', wait: 'select' },
  { name: 'cx360', url: '/cx360', wait: null },
  { name: 'inventory', url: '/inventory', wait: null },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE }]);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));

for (const p of PAGES) {
  await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 90000 });
  if (p.wait) await page.waitForSelector(p.wait, { timeout: 90000 });
  await page.waitForTimeout(2500);
  const aiButtons = page.locator('button[title="AI insight"]');
  const count = await aiButtons.count();
  console.log(`${p.name}: ${count} AI buttons`);
  if (count > 0) {
    await aiButtons.first().scrollIntoViewIfNeeded();
    await aiButtons.first().click();
    // wait for insight to load (Claude call)
    await page.waitForTimeout(12000);
    const card = page.locator('button[title="AI insight"]').first().locator('xpath=ancestor::section[1]');
    const target = (await card.count()) > 0 ? card : page;
    await target.screenshot({ path: `${OUT}/${p.name}-popover.png` });
    console.log(`  popover captured`);
    await page.keyboard.press('Escape');
    await page.mouse.click(10, 500);
    await page.waitForTimeout(300);
  }
}
await browser.close();
console.log('done');
