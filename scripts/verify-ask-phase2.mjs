import { chromium } from 'playwright';
const BASE = 'http://localhost:3000';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1700, height: 1000 } });
await ctx.addCookies([{ name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE }]);
const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));

await p.goto(`${BASE}/ask`, { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(3000);

// V4.1-2: panel visible with sections
let body = await p.locator('body').innerText();
console.log(`V4.1 panel visible: Agents=${body.includes('Agents')}, "8 available"=${body.includes('8 available')}`);
console.log(`V4.2 sections: Pricing=${body.includes('PRICING')||body.includes('Pricing')}, Clearance=${body.includes('CLEARANCE')||body.includes('Clearance')}, Demand=${body.includes('DEMAND')||body.includes('Demand')}`);

// V4.3: search
await p.fill('input[placeholder="Search agents..."]', 'promo');
await p.waitForTimeout(500);
body = await p.locator('body').innerText();
const promoVisible = body.includes('Promo scenario');
const strategyGone = !body.includes('Price strategy');
console.log(`V4.3 search filter: promo visible=${promoVisible}, others hidden=${strategyGone}`);
await p.fill('input[placeholder="Search agents..."]', '');
await p.waitForTimeout(400);

// V4.4-5: click Promo scenario, check mini form + SKU options
await p.click('button:has-text("Promo scenario")');
await p.waitForTimeout(1200);
const skuOptions = await p.evaluate(() => {
  const selects = Array.from(document.querySelectorAll('select'));
  for (const s of selects) {
    const opts = Array.from(s.options).map((o) => o.textContent ?? '');
    if (opts.some((t) => t.includes('('))) return opts.slice(0, 4);
  }
  return [];
});
console.log(`V4.4 mini form expanded: ${skuOptions.length > 0}`);
console.log(`V4.5 SKU options sample: ${JSON.stringify(skuOptions.slice(1, 3))}`);

// V4.6-10: fill and run promo scenario
if (skuOptions.length > 1) {
  await p.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    for (const s of selects) {
      const opts = Array.from(s.options);
      if (opts.some((o) => (o.textContent ?? '').includes('('))) {
        s.value = opts[1].value;
        s.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
    }
  });
  await p.waitForTimeout(400);
  await p.click('button:has-text("Run in chat")');
  console.log('V4.6 run clicked; V4.7 loading state:', await p.locator('text=Running...').count() > 0);
  // wait for result message
  await p.waitForTimeout(30000);
  body = await p.locator('body').innerText();
  console.log(`V4.8 result in conversation: ${body.includes('Promo scenario agent') || body.includes('ROI')}`);
  console.log(`V4.9 attribution badge: ${body.includes('Promo scenario agent')}`);
  const svgs = await p.locator('svg.recharts-surface').count();
  const kpiCount = (body.match(/ROI|Free-Rider|Margin/g) || []).length;
  console.log(`V4.10 canvas: recharts=${svgs}, kpi-ish text=${kpiCount > 2}`);
}

// V4.11-12: weekly briefing 1-click
await p.click('button:has-text("Weekly briefing")');
await p.waitForTimeout(800);
await p.click('button:has-text("Run in chat")');
await p.waitForTimeout(35000);
body = await p.locator('body').innerText();
console.log(`V4.11-12 briefing ran: badge=${body.includes('Weekly briefing agent')}, sections=${body.includes('CHANGED') || body.includes('DECISIONS') || body.includes('Decisions')}`);

// V4.13-14: competitive response chat agent
await p.click('button:has-text("Competitive response")');
await p.waitForTimeout(800);
const ta = p.locator('textarea[placeholder*="competitor"]');
if (await ta.count() > 0) {
  console.log('V4.13 textarea appeared: true');
  await ta.fill('BigBazaar dropped Saffola 5L to ₹799');
  await p.click('button:has-text("Run in chat")');
  await p.waitForTimeout(30000);
  body = await p.locator('body').innerText();
  console.log(`V4.14 kotler response: badge=${body.includes('Competitive response agent')}, threat=${body.toLowerCase().includes('threat') || body.toLowerCase().includes('match')}`);
} else {
  console.log('V4.13 textarea appeared: FALSE');
}

// V4.15-16: agent pill in conversation
const pillWeekly = p.locator('.max-w-3xl button:has-text("Weekly briefing")').first();
if (await pillWeekly.count() > 0) {
  await pillWeekly.click();
  await p.waitForTimeout(2000);
  body = await p.locator('body').innerText();
  console.log(`V4.16 oneclick pill triggered: "Run Weekly briefing" msg=${body.includes('Run Weekly briefing')}`);
} else {
  console.log('V4.15/16: no weekly-briefing pill visible in conversation (depends on response keywords)');
}

await p.screenshot({ path: 'e2e-ask-phase2.png', fullPage: true });
console.log(`total pageerrors: ${errs.length}`);
if (errs.length) console.log('first:', errs[0].substring(0, 150));
await b.close();
