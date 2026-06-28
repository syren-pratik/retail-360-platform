/**
 * Phase B smoke test: load /cx360, set tenant cookie to us_apparel,
 * capture screenshot, check for console errors. Apparel data wiring is Phase C —
 * this test verifies the page still renders & captures the current visual state.
 */
import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const SHOT = '/tmp/cx360-apparel.png';
const APPAREL_BRANDS = ['Nike', "Levi's", 'Lululemon', 'Zara', 'H&M', 'Old Navy', 'Coach', 'Adidas', 'Madewell', 'Vans'];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
// Auth cookie + tenant cookie (apparel)
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE },
  { name: 'rct_tenant', value: 'us_apparel', url: BASE },
  { name: 'cx360_tenant', value: 'us_apparel', url: BASE },
]);

const page = await ctx.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => pageErrors.push(e.message));

console.log('[smoke] navigating to /cx360 ...');
const resp = await page.goto(`${BASE}/cx360`, { waitUntil: 'networkidle', timeout: 60_000 });
console.log('[smoke] http status:', resp?.status());

// Settle a beat for client-side rendering
await page.waitForTimeout(2000);

await page.screenshot({ path: SHOT, fullPage: true });
console.log('[smoke] screenshot →', SHOT);

const text = await page.locator('body').innerText();
const usdHits = (text.match(/\$\d/g) || []).length;
const inrHits = (text.match(/₹/g) || []).length;
const brandsFound = APPAREL_BRANDS.filter((b) => text.includes(b));

console.log('[smoke] $ amounts found:', usdHits, '· ₹ symbols found:', inrHits);
console.log('[smoke] apparel brand names found in page text:', brandsFound);
console.log('[smoke] console errors:', consoleErrors.length);
for (const e of consoleErrors.slice(0, 5)) console.log('  ! console:', e);
console.log('[smoke] page errors:', pageErrors.length);
for (const e of pageErrors.slice(0, 5)) console.log('  ! pageerror:', e);

await browser.close();

const fileBytes = fs.statSync(SHOT).size;
console.log(`[smoke] screenshot size: ${(fileBytes / 1024).toFixed(0)} KB`);
process.exit(0);
