import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addCookies([{ name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE }]);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));

// V4.1 — /ask empty state
await p.goto(`${BASE}/ask`, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(2000);
let body = await p.locator('body').innerText();
const starters = (body.match(/Why did margin drop|free-rider ratio|sell-through targets|pricing decisions|promo ROI trend/g) || []).length;
console.log(`V4.1 empty state: starters visible=${starters}/5, errs=${errs.length}`);

// V4.9 — sidebar
console.log(`V4.9 sidebar: Ask anything=${body.includes('Ask anything')}, Agent hub=${body.includes('Agent hub')}, Soon=${body.includes('Soon')}`);

// V4.2-4.8 — click starter, watch streaming
await p.click('text=Show me the 14-week promo ROI trend');
await p.waitForTimeout(1500);
body = await p.locator('body').innerText();
const streamingStarted = body.includes('Retail 360');
console.log(`V4.2 message sent + assistant label: ${streamingStarted}`);

// wait for full response
await p.waitForTimeout(25000);
body = await p.locator('body').innerText();
const hasKPI = (body.match(/ROI/g) || []).length > 2;
const chartSvg = await p.locator('svg.recharts-surface').count();
console.log(`V4.6-4.8 canvas: recharts svgs=${chartSvg}, kpi text=${hasKPI}`);

// V4.4 pills
const pills = await p.locator('button:has-text("Run promo scenario"), button:has-text("Show campaign ROI"), button:has-text("What needs attention")').count();
console.log(`V4.4 suggestion pills: ${pills}`);

// V4.5 click an ask-pill if present
const askPill = p.locator('button:has-text("Show campaign ROI")').first();
if (await askPill.count() > 0) {
  await askPill.click();
  await p.waitForTimeout(2000);
  body = await p.locator('body').innerText();
  console.log(`V4.5 pill click sent new message: ${body.includes('campaign ROI for last 14 weeks')}`);
} else {
  console.log('V4.5 skipped — no ask pill matched');
}

await p.screenshot({ path: 'e2e-audit-ask.png', fullPage: true });
console.log(`pageerrors total: ${errs.length}`);
if (errs.length) console.log('first:', errs[0].substring(0, 200));

// V4.10-11 regression: ChatPanel on cx360 + price-intel
for (const path of ['/cx360', '/price-intel']) {
  const p2 = await ctx.newPage();
  const errs2 = []; p2.on('pageerror', (e) => errs2.push(e.message));
  await p2.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 60000 });
  await p2.waitForTimeout(4000);
  const b2 = await p2.locator('body').innerText();
  console.log(`V4.10/11 ${path}: ChatPanel visible=${b2.includes('AI Assistant')}, errs=${errs2.length}`);
  await p2.close();
}
await b.close();
