import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const OUT = '/tmp/filter-scan';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const TABS = ['overview', 'promo', 'markdown', 'forecasting'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: 'rct_auth', value: 'rct-portal-ok-2025', url: BASE }]);
const page = await ctx.newPage();

const findings = [];

async function auditState(label) {
  // 1. explicit empty states
  const emptyTexts = await page.locator('text=/No data available|No items|No results|No campaigns|Nothing to show/i').count();

  // 2. recharts containers with no rendered series geometry
  const chartAudit = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.recharts-responsive-container').forEach((c) => {
      const geom = c.querySelectorAll(
        '.recharts-bar-rectangle, .recharts-line-curve, .recharts-area-area, .recharts-pie-sector, .recharts-scatter-symbol'
      );
      // find a title from the nearest card
      const card = c.closest('section, .card');
      const title = card?.querySelector('h3, h4')?.textContent?.trim() ?? 'untitled-chart';
      if (geom.length === 0) out.push(title);
    });
    return out;
  });

  // 3. tables with zero body rows
  const tableAudit = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('table').forEach((t) => {
      const rows = t.querySelectorAll('tbody tr').length;
      if (rows === 0) {
        const card = t.closest('section, .card, div[class*="card"]');
        const title = card?.querySelector('h3, h4')?.textContent?.trim() ?? 'untitled-table';
        out.push(title);
      }
    });
    return out;
  });

  const problems = [];
  if (emptyTexts > 0) problems.push(`${emptyTexts} explicit empty-state message(s)`);
  for (const t of chartAudit) problems.push(`empty chart: ${t}`);
  for (const t of tableAudit) problems.push(`empty table: ${t}`);

  if (problems.length > 0) {
    const file = `${label.replace(/[^a-z0-9]+/gi, '_')}.png`;
    await page.screenshot({ path: `${OUT}/${file}`, fullPage: true });
    findings.push({ label, problems, screenshot: file });
    console.log(`✗ ${label}: ${problems.join(' | ')}`);
  } else {
    console.log(`✓ ${label}`);
  }
}

// load page once, wait for shell data fetch to finish (select appears)
await page.goto(`${BASE}/price-intel?tab=overview`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForSelector('select', { timeout: 90000 });
await page.waitForTimeout(1500);
const deptSelect = page.locator('select').first();
const depts = await deptSelect.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
console.log('departments:', depts.join(', '));

const TAB_LABELS = { overview: 'Overview', promo: 'Promo', markdown: 'Markdown', forecasting: 'Forecasting' };

for (const dept of depts) {
  await page.locator('select').first().selectOption(dept);
  await page.waitForTimeout(800);
  for (const tab of TABS) {
    await page.getByRole('button', { name: TAB_LABELS[tab], exact: true }).first().click();
    await page.waitForTimeout(1200);
    await auditState(`dept=${dept} tab=${tab}`);
  }
}

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(findings, null, 2));
console.log(`\n${findings.length} problem state(s). Report: ${OUT}/report.json`);
await browser.close();
