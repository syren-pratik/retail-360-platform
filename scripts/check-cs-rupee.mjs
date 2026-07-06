import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
await ctx.addCookies([
  { name: 'rct_auth', value: 'rct-portal-ok-2025', url: 'https://rct-app.azurewebsites.net' },
  { name: 'rct_tenant', value: 'us_apparel', url: 'https://rct-app.azurewebsites.net' },
]);
const p = await ctx.newPage();
await p.goto('https://rct-app.azurewebsites.net/merchandise/cold-start', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(5000);
const walker = await p.evaluate(() => {
  const results = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    if (n.textContent && n.textContent.includes('₹')) {
      const parent = n.parentElement;
      results.push({
        text: n.textContent.substring(0, 80),
        parentTag: parent?.tagName,
        parentClass: parent?.className?.substring(0, 60),
        parentPath: parent?.outerHTML?.substring(0, 250)
      });
    }
  }
  return results.slice(0, 5);
});
console.log(JSON.stringify(walker, null, 2));
await b.close();
