# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-tenant-verification.spec.ts >> Tenant: US Retail >> [US Retail] /merchandise/demand — departments
- Location: tests/e2e-tenant-verification.spec.ts:155:9

# Error details

```
Error: [/merchandise/demand][us_retail] Found India dept "Grocery & Staples" — wrong tenant
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - complementary [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Retail 360
      - button [ref=e6] [cursor=pointer]:
        - img [ref=e7]
    - navigation [ref=e9]:
      - list [ref=e10]:
        - listitem [ref=e11]:
          - link "Customer 360" [ref=e12] [cursor=pointer]:
            - /url: /cx360
            - img [ref=e13]
            - generic [ref=e15]: Customer 360
        - listitem [ref=e16]:
          - link "Inventory Intelligence" [ref=e17] [cursor=pointer]:
            - /url: /inventory
            - img [ref=e18]
            - generic [ref=e20]: Inventory Intelligence
        - listitem [ref=e21]:
          - button "Demand Planning" [ref=e24] [cursor=pointer]:
            - img [ref=e25]
            - generic [ref=e28]: Demand Planning
            - img [ref=e29]
          - list [ref=e31]:
            - listitem [ref=e32]:
              - link "Demand" [ref=e34] [cursor=pointer]:
                - /url: /merchandise/demand
                - img [ref=e35]
                - generic [ref=e38]: Demand
            - listitem [ref=e39]:
              - link "Cold-Start" [ref=e40] [cursor=pointer]:
                - /url: /merchandise/cold-start
                - img [ref=e41]
                - generic [ref=e54]: Cold-Start
            - listitem [ref=e55]:
              - link "Store Opening" [ref=e56] [cursor=pointer]:
                - /url: /merchandise/cold-start/store-opening
                - img [ref=e57]
                - generic [ref=e61]: Store Opening
        - listitem [ref=e62]:
          - button "Price Intelligence" [ref=e64] [cursor=pointer]:
            - img [ref=e65]
            - generic [ref=e67]: Price Intelligence
            - img [ref=e68]
        - listitem [ref=e70]:
          - button "Intelligence" [ref=e72] [cursor=pointer]:
            - img [ref=e73]
            - generic [ref=e75]: Intelligence
            - img [ref=e76]
    - link "Settings" [ref=e79] [cursor=pointer]:
      - /url: /settings
      - img [ref=e80]
      - generic [ref=e83]: Settings
  - main [ref=e84]:
    - generic [ref=e86]:
      - paragraph [ref=e88]: Loading merchandise data…
      - paragraph [ref=e89]: Assembling forecast shards — this may take a few seconds
  - complementary [ref=e90]:
    - generic [ref=e91]:
      - generic [ref=e92]:
        - img [ref=e93]
        - generic [ref=e96]: AI Assistant
        - generic [ref=e97]: Merchandising
      - button [ref=e98] [cursor=pointer]:
        - img [ref=e99]
    - generic [ref=e103]:
      - img [ref=e105]
      - generic [ref=e110]: Hi! I'm your Merchandise Demand analyst. I help category managers act on forecast signals, event ramp-ups, and promo performance — not just answer questions, but surface the next action. - Identify understock and overstock risks by category - Surface SKUs not ramped for upcoming events - Analyse promo lift vs. target and flag under-performers - Forecast accuracy by velocity class and department Try asking "which SKUs are not ramped for the next event?" or "which categories will miss their Q2 plan?"
    - generic [ref=e111]:
      - paragraph [ref=e112]: "Try asking:"
      - generic [ref=e113]:
        - button "Which SKUs are not ramped for the next event?" [ref=e114] [cursor=pointer]
        - button "Show me under-performing promos" [ref=e115] [cursor=pointer]
        - button "What's the forecast accuracy for Grocery & Staples?" [ref=e116] [cursor=pointer]
        - button "Which categories will miss their Q2 plan?" [ref=e117] [cursor=pointer]
    - generic [ref=e119]:
      - textbox "Ask about your customer data..." [ref=e120]
      - button [disabled] [ref=e121]:
        - img [ref=e122]
  - region "Notifications alt+T"
```

# Test source

```ts
  1   | import { test, expect, type Page, type BrowserContext } from '@playwright/test';
  2   | 
  3   | // ── CONFIG ────────────────────────────────────────────────────────
  4   | const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
  5   | const AUTH_PASSWORD = process.env.E2E_PASSWORD ?? 'rct-demo-2025';
  6   | 
  7   | const TENANTS = {
  8   |   india_grocery: {
  9   |     cookie: 'india_grocery',
  10  |     currency: '₹',
  11  |     skuPrefix: 'PRD-',
  12  |     label: 'India Grocery',
  13  |   },
  14  |   us_apparel: {
  15  |     cookie: 'us_apparel',
  16  |     currency: '$',
  17  |     skuPrefix: 'APR-',
  18  |     label: 'US Apparel',
  19  |   },
  20  |   us_retail: {
  21  |     cookie: 'us_retail',
  22  |     currency: '$',
  23  |     skuPrefix: 'USR-',
  24  |     label: 'US Retail',
  25  |   },
  26  | } as const;
  27  | 
  28  | type TenantKey = keyof typeof TENANTS;
  29  | 
  30  | // ── HELPERS ───────────────────────────────────────────────────────
  31  | 
  32  | async function primeContext(context: BrowserContext, tenant: TenantKey) {
  33  |   // Get auth cookie by hitting /api/auth server-side.
  34  |   const res = await context.request.post(`${BASE_URL}/api/auth`, {
  35  |     data: { password: AUTH_PASSWORD },
  36  |     headers: { 'Content-Type': 'application/json' },
  37  |   });
  38  |   if (!res.ok()) {
  39  |     throw new Error(`Auth failed: HTTP ${res.status()} — check E2E_PASSWORD`);
  40  |   }
  41  |   // Add tenant cookie (auth cookie already stored by request context).
  42  |   const host = new URL(BASE_URL).hostname;
  43  |   await context.addCookies([
  44  |     { name: 'rct_tenant', value: TENANTS[tenant].cookie, domain: host, path: '/' },
  45  |   ]);
  46  | }
  47  | 
  48  | async function goTo(page: Page, path: string) {
  49  |   await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  50  | }
  51  | 
  52  | // Return only visible text — excludes <script> RSC payload where Next.js
  53  | // embeds serialization tokens like "$5", "$L2", etc. that look like currency.
  54  | async function visibleText(page: Page): Promise<string> {
  55  |   return await page.evaluate(() => document.body.innerText ?? '');
  56  | }
  57  | 
  58  | async function checkNoCurrencyMismatch(page: Page, tenant: TenantKey, pageName: string) {
  59  |   const content = (await visibleText(page)) ?? '';
  60  |   if (tenant === 'india_grocery') {
  61  |     // Look for USD currency values in headline/metric contexts.
  62  |     const wrong = content.match(/\$\d[\d,.]*[KMB]?/);
  63  |     if (wrong) {
  64  |       throw new Error(`[${pageName}][${tenant}] Found USD value "${wrong[0]}" — expected ₹`);
  65  |     }
  66  |   } else {
  67  |     // us_apparel / us_retail should not carry ₹N values.
  68  |     const wrong = content.match(/₹\d/);
  69  |     if (wrong) {
  70  |       throw new Error(`[${pageName}][${tenant}] Found INR value "${wrong[0]}" — expected $`);
  71  |     }
  72  |   }
  73  | }
  74  | 
  75  | async function checkNoCrossTenantDepts(page: Page, tenant: TenantKey, pageName: string) {
  76  |   const content = (await visibleText(page)) ?? '';
  77  |   const INDIA_DEPTS = ['Grocery & Staples', 'Snacks & Biscuits', 'Dairy & Frozen', 'Personal Care'];
  78  |   const RETAIL_DEPTS = ['Electronics', 'Beauty & Personal Care', 'Home & Garden', 'Sports & Outdoor', 'Toys & Games'];
  79  | 
  80  |   if (tenant === 'us_retail' || tenant === 'us_apparel') {
  81  |     for (const dept of INDIA_DEPTS) {
  82  |       if (content.includes(dept)) {
> 83  |         throw new Error(`[${pageName}][${tenant}] Found India dept "${dept}" — wrong tenant`);
      |               ^ Error: [/merchandise/demand][us_retail] Found India dept "Grocery & Staples" — wrong tenant
  84  |       }
  85  |     }
  86  |   }
  87  |   if (tenant === 'india_grocery') {
  88  |     for (const dept of RETAIL_DEPTS) {
  89  |       if (content.includes(dept)) {
  90  |         throw new Error(`[${pageName}][india_grocery] Found US retail dept "${dept}" — wrong tenant`);
  91  |       }
  92  |     }
  93  |   }
  94  | }
  95  | 
  96  | async function expectNoError(page: Page) {
  97  |   const body = (await visibleText(page)) ?? '';
  98  |   expect(body).not.toContain('Unhandled Runtime Error');
  99  |   expect(body).not.toContain('Cannot read properties of undefined');
  100 |   // Next.js error overlay
  101 |   const overlay = await page.$('nextjs-portal');
  102 |   if (overlay) {
  103 |     const text = await overlay.textContent();
  104 |     expect(text?.includes('Unhandled Runtime Error')).toBeFalsy();
  105 |   }
  106 | }
  107 | 
  108 | // ── PER-TENANT TESTS ──────────────────────────────────────────────
  109 | 
  110 | for (const tenantKey of Object.keys(TENANTS) as TenantKey[]) {
  111 |   const t = TENANTS[tenantKey];
  112 | 
  113 |   test.describe(`Tenant: ${t.label}`, () => {
  114 |     test.beforeEach(async ({ context }) => {
  115 |       await primeContext(context, tenantKey);
  116 |     });
  117 | 
  118 |     // ── PRICE INTEL ──────────────────────────────────────────────
  119 |     test(`[${t.label}] /price-intel Overview — currency + data`, async ({ page }) => {
  120 |       await goTo(page, '/price-intel');
  121 |       await page.waitForTimeout(3000);
  122 |       await expectNoError(page);
  123 |       await checkNoCurrencyMismatch(page, tenantKey, '/price-intel');
  124 |       await checkNoCrossTenantDepts(page, tenantKey, '/price-intel');
  125 |     });
  126 | 
  127 |     for (const tab of ['promo', 'markdown', 'forecasting', 'agents']) {
  128 |       test(`[${t.label}] /price-intel?tab=${tab} — no mismatch`, async ({ page }) => {
  129 |         await goTo(page, `/price-intel?tab=${tab}`);
  130 |         await page.waitForTimeout(2500);
  131 |         await expectNoError(page);
  132 |         await checkNoCurrencyMismatch(page, tenantKey, `/price-intel?tab=${tab}`);
  133 |       });
  134 |     }
  135 | 
  136 |     for (const section of ['overview', 'promo', 'markdown', 'forecasting']) {
  137 |       test(`[${t.label}] /price-intel/deep-dive/${section} — loads`, async ({ page }) => {
  138 |         await goTo(page, `/price-intel/deep-dive/${section}`);
  139 |         await page.waitForTimeout(2500);
  140 |         await expectNoError(page);
  141 |         await checkNoCurrencyMismatch(page, tenantKey, `/price-intel/deep-dive/${section}`);
  142 |       });
  143 |     }
  144 | 
  145 |     for (const chartId of ['promo-roi', 'sell-through', 'margin-leakage', 'forecast']) {
  146 |       test(`[${t.label}] /price-intel/chart/${chartId} — loads`, async ({ page }) => {
  147 |         await goTo(page, `/price-intel/chart/${chartId}`);
  148 |         await page.waitForTimeout(2500);
  149 |         await expectNoError(page);
  150 |         await checkNoCurrencyMismatch(page, tenantKey, `/price-intel/chart/${chartId}`);
  151 |       });
  152 |     }
  153 | 
  154 |     // ── MERCHANDISE DEMAND ───────────────────────────────────────
  155 |     test(`[${t.label}] /merchandise/demand — departments`, async ({ page }) => {
  156 |       await goTo(page, '/merchandise/demand');
  157 |       // Wait for actual data-loaded signal (chart / svg), not a fixed delay.
  158 |       await page
  159 |         .waitForSelector('[data-testid="demand-loaded"], .demand-chart, svg', { timeout: 20000 })
  160 |         .catch(() => page.waitForTimeout(6000));
  161 |       await expectNoError(page);
  162 |       await checkNoCurrencyMismatch(page, tenantKey, '/merchandise/demand');
  163 |       await checkNoCrossTenantDepts(page, tenantKey, '/merchandise/demand');
  164 |     });
  165 | 
  166 |     // ── COLD START ───────────────────────────────────────────────
  167 |     if (tenantKey === 'india_grocery') {
  168 |       test(`[india_grocery] /merchandise/cold-start — visible + loads`, async ({ page }) => {
  169 |         await goTo(page, '/merchandise/cold-start');
  170 |         await page.waitForTimeout(3000);
  171 |         await expectNoError(page);
  172 |       });
  173 |     } else {
  174 |       test(`[${t.label}] /merchandise/cold-start — hidden from nav`, async ({ page }) => {
  175 |         await goTo(page, '/price-intel');
  176 |         await page.waitForTimeout(2000);
  177 |         const link = await page.$('a[href="/merchandise/cold-start"]');
  178 |         expect(link).toBeNull();
  179 |       });
  180 |     }
  181 | 
  182 |     // ── CX360 ────────────────────────────────────────────────────
  183 |     test(`[${t.label}] /cx360 — loads, correct segments`, async ({ page }) => {
```