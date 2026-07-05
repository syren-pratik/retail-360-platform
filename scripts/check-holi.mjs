import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext();
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: 'https://rct-app.azurewebsites.net' },
  { name: 'rct_tenant', value: 'us_apparel', url: 'https://rct-app.azurewebsites.net' },
]);
const p = await ctx.newPage();
await p.goto('https://rct-app.azurewebsites.net/merchandise/demand', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(5000);
const body = await p.locator('body').innerText();
const holiWordBoundary = (body.match(/\bHoli\b/g) || []).length;
const holiSubstring = (body.match(/Holi/g) || []).length;
const holidaySubstring = (body.match(/Holiday/g) || []).length;
console.log(`\\bHoli\\b: ${holiWordBoundary}, /Holi/: ${holiSubstring}, /Holiday/: ${holidaySubstring}`);
// Show context lines
const lines = body.split('\n').filter(l => l.includes('Holi'));
console.log('lines with Holi:', lines.slice(0, 5));
await b.close();
