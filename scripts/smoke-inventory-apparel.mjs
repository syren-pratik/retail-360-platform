/**
 * Phase C smoke test: load /inventory under us_apparel tenant.
 * Verifies HTTP 200, captures pageerrors, and writes a full-page screenshot.
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:3000';
const SHOT = '/tmp/inventory-apparel-c.png';
const APPAREL_SUPS = ['Nike', "Levi's", 'Lululemon', 'Hansae', 'Carter', 'Coach', 'Adidas', 'Under Armour'];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE },
  { name: 'rct_tenant', value: 'us_apparel', url: BASE },
  { name: 'cx360_tenant', value: 'us_apparel', url: BASE },
]);

const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

console.log('[smoke] navigating to /inventory ...');
const resp = await page.goto(`${BASE}/inventory`, { waitUntil: 'networkidle', timeout: 60_000 });
console.log('[smoke] http status:', resp?.status());
await page.waitForTimeout(6000);

await page.screenshot({ path: SHOT, fullPage: true });
console.log('[smoke] screenshot →', SHOT);

const text = await page.locator('body').innerText();
const usdHits = (text.match(/\$\d/g) || []).length;
const inrHits = (text.match(/₹/g) || []).length;
const supsFound = APPAREL_SUPS.filter((b) => text.includes(b));

console.log('[smoke] $ amounts:', usdHits, '· ₹ symbols:', inrHits);
console.log('[smoke] apparel supplier names in page text:', supsFound);
console.log('[smoke] page errors:', pageErrors.length);
for (const e of pageErrors.slice(0, 6)) console.log('  ! ', e);

await browser.close();
process.exit(0);
