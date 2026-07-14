import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
await ctx.addCookies([{ name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE }]);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));

await p.goto(`${BASE}/ask`, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(2500);

// 1-click agent: margin leak (fastest)
await p.click('button:has-text("Margin leak investigator")');
await p.waitForTimeout(800);
await p.click('button:has-text("Run in chat")');

// wait until badge appears (max 120s)
try {
  await p.waitForSelector('text=Margin leak investigator agent', { timeout: 120000 });
  console.log('badge appeared: true');
} catch {
  console.log('badge appeared: FALSE after 120s');
}
const body = await p.locator('body').innerText();
const svgs = await p.locator('svg.recharts-surface').count();
console.log(`canvas svgs: ${svgs}`);
console.log(`leak text present: ${body.includes('Free-rider') || body.includes('free-rider') || body.includes('leakage')}`);
console.log(`errors: ${errs.length}`);
await p.screenshot({ path: 'e2e-ask-badge.png', fullPage: true });
await b.close();
