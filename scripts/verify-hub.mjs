import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
await ctx.addCookies([{ name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE }]);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));

await p.goto(`${BASE}/agents`, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(2500);
let body = await p.locator('body').innerText();

// V4.1-3
console.log(`V4.1 sections: ${['PRICING INTELLIGENCE','CLEARANCE & MARKDOWN','DEMAND INTELLIGENCE'].filter(s => body.toUpperCase().includes(s)).length}/3`);
const cardCount = await p.locator('.grid.grid-cols-3 > button').count();
console.log(`V4.2 cards in grid-cols-3: ${cardCount}`);
console.log(`V4.3 names visible: ${['Promo scenario','Price strategy','Margin leak investigator','Weekly briefing','Event readiness','Demand anomaly'].filter(n => body.includes(n)).length}/6 sampled`);

// V4.4 search
await p.fill('input[placeholder="Search agents..."]', 'margin');
await p.waitForTimeout(400);
body = await p.locator('body').innerText();
console.log(`V4.4 search margin: investigator=${body.includes('Margin leak investigator')}, promo hidden=${!body.includes('Promo scenario')}`);
await p.fill('input[placeholder="Search agents..."]', '');
await p.waitForTimeout(300);

// V4.5 filter clearance
await p.click('button:has-text("Clearance")');
await p.waitForTimeout(400);
body = await p.locator('body').innerText();
console.log(`V4.5 clearance filter: markdown=${body.includes('Markdown timing')}, briefing=${body.includes('Weekly briefing')}, promo hidden=${!body.includes('Promo scenario')}`);
await p.click('button:has-text("All agents")');
await p.waitForTimeout(300);

// V4.6-7 open drawer
await p.click('button:has-text("Margin leak investigator")');
await p.waitForTimeout(800);
const drawerVisible = await p.locator('text=Traces margin leakage back').count() > 0;
console.log(`V4.6-7 drawer open with description: ${drawerVisible}`);

// V4.9-10 run oneclick
await p.click('button:has-text("Run Margin leak investigator")');
await p.waitForTimeout(1500);
const skeleton = await p.locator('.animate-pulse').count();
console.log(`V4.9 loading skeleton: ${skeleton > 0}`);
try {
  await p.waitForSelector('text=Run again', { timeout: 120000 });
  console.log('V4.10 result rendered: true');
} catch { console.log('V4.10 result rendered: FALSE'); }
const svgs = await p.locator('svg.recharts-surface').count();
console.log(`V4.10b canvas svgs: ${svgs}`);

// V4.11 close
await p.click('button:has(svg.lucide-x)');
await p.waitForTimeout(600);
body = await p.locator('body').innerText();

// V4.12-13 last-run + history
console.log(`V4.12 card last-run tick: ${body.includes('✓')}`);
console.log(`V4.13 Recent runs section: ${body.toUpperCase().includes('RECENT RUNS')}`);

// V4.14 replay
const histBtn = p.locator('button:has-text("Margin leak investigator")').first();
await histBtn.click();
await p.waitForTimeout(800);
const drawerAgain = await p.locator('.w-\\[480px\\]').count();
console.log(`V4.14 history click opens drawer: ${drawerAgain > 0}`);

// V4.15 sidebar
body = await p.locator('body').innerText();
console.log(`V4.15 sidebar Agent hub active (no Soon): agentHub=${body.includes('Agent hub')}, soonGone=${!/Agent hub\s*Soon/.test(body)}`);

// V4.16 /ask regression
const p2 = await ctx.newPage();
const errs2 = []; p2.on('pageerror', (e) => errs2.push(e.message));
await p2.goto(`${BASE}/ask`, { waitUntil: 'networkidle', timeout: 60000 });
await p2.waitForTimeout(2500);
const b2 = await p2.locator('body').innerText();
console.log(`V4.16 /ask regression: panel=${b2.includes('8 available')}, errs=${errs2.length}`);

await p.screenshot({ path: 'e2e-agent-hub.png', fullPage: true });
console.log(`pageerrors: ${errs.length}`);
await b.close();
