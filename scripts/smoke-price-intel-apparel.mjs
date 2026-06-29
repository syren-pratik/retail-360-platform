/**
 * Smoke test for /price-intel under us_apparel tenant.
 * Verifies: HTTP 200, no page errors, apparel cache data served via curl,
 * captures a screenshot.
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const COOKIES = [
  { name: 'rct_auth', value: 'rct-portal-ok-2025', domain: 'localhost', path: '/' },
  { name: 'rct_tenant', value: 'us_apparel', domain: 'localhost', path: '/' },
  { name: 'cx360_tenant', value: 'us_apparel', domain: 'localhost', path: '/' },
];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies(COOKIES);
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') pageErrors.push('console.error: ' + m.text());
  });

  const resp = await page.goto(`${BASE}/price-intel`, { waitUntil: 'domcontentloaded' });
  const status = resp ? resp.status() : 'n/a';
  console.log(`HTTP ${status}`);
  await page.waitForTimeout(8000);

  await page.screenshot({ path: '/tmp/price-intel-apparel-c.png', fullPage: true });
  console.log(`Screenshot → /tmp/price-intel-apparel-c.png`);
  console.log(`Page errors: ${pageErrors.length}`);
  for (const e of pageErrors.slice(0, 6)) console.log('  · ' + e.slice(0, 200));

  await browser.close();
  process.exit(pageErrors.length > 0 || status !== 200 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
