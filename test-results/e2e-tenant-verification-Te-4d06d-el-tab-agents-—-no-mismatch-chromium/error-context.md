# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-tenant-verification.spec.ts >> Tenant: US Retail >> [US Retail] /price-intel?tab=agents — no mismatch
- Location: tests/e2e-tenant-verification.spec.ts:128:11

# Error details

```
Error: [/price-intel?tab=agents][us_retail] Found INR value "₹9" — expected $
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
            - button "Demand Planning" [ref=e23] [cursor=pointer]:
              - img [ref=e24]
              - generic [ref=e27]: Demand Planning
              - img [ref=e28]
          - listitem [ref=e30]:
            - button "Price Intelligence" [ref=e33] [cursor=pointer]:
              - img [ref=e34]
              - generic [ref=e36]: Price Intelligence
              - img [ref=e37]
            - list [ref=e39]:
              - listitem [ref=e40]:
                - link "Overview" [ref=e41] [cursor=pointer]:
                  - /url: /price-intel?tab=overview
                  - img [ref=e42]
                  - generic [ref=e43]: Overview
              - listitem [ref=e44]:
                - link "Promotions" [ref=e45] [cursor=pointer]:
                  - /url: /price-intel?tab=promo
                  - img [ref=e46]
                  - generic [ref=e49]: Promotions
              - listitem [ref=e50]:
                - link "Markdown & Clearance" [ref=e51] [cursor=pointer]:
                  - /url: /price-intel?tab=markdown
                  - img [ref=e52]
                  - generic [ref=e55]: Markdown & Clearance
              - listitem [ref=e56]:
                - link "Forecasting" [ref=e57] [cursor=pointer]:
                  - /url: /price-intel?tab=forecasting
                  - img [ref=e58]
                  - generic [ref=e61]: Forecasting
              - listitem [ref=e62]:
                - link "AI Agents" [ref=e63] [cursor=pointer]:
                  - /url: /price-intel?tab=agents
                  - img [ref=e64]
                  - generic [ref=e67]: AI Agents
          - listitem [ref=e68]:
            - button "Intelligence" [ref=e70] [cursor=pointer]:
              - img [ref=e71]
              - generic [ref=e73]: Intelligence
              - img [ref=e74]
      - link "Settings" [ref=e77] [cursor=pointer]:
        - /url: /settings
        - img [ref=e78]
        - generic [ref=e81]: Settings
    - main [ref=e82]:
      - generic [ref=e85]:
        - generic [ref=e86]:
          - generic [ref=e87]:
            - generic [ref=e88]: Week of May 17, 2026
            - generic [ref=e89]: ·
            - generic [ref=e90]: Pre-Black Friday build · 187 days to Black Friday · Back to School winding down
          - heading "You are leaving $142K on the table this week — $58K in free-rider promotions in Electronics, $34K in missed cost passthroughs, and $28K in premature markdowns." [level=2] [ref=e91]
          - paragraph [ref=e92]: Optimization model has 14 actionable recommendations that could recover $92K this week.
        - generic [ref=e94]:
          - generic [ref=e95]:
            - generic [ref=e96]:
              - img [ref=e98]
              - generic [ref=e101]: Margin Realization
            - generic [ref=e102]: 81.4%
            - generic [ref=e103]:
              - img [ref=e104]
              - generic [ref=e107]: +0.4% vs last week
          - generic [ref=e108]:
            - generic [ref=e109]:
              - img [ref=e111]
              - generic [ref=e114]: Margin Leakage
            - generic [ref=e115]: $142,000
            - generic [ref=e116]: this week
          - generic [ref=e117]:
            - generic [ref=e118]:
              - img [ref=e120]
              - generic [ref=e124]: Promo ROI Index
            - generic [ref=e125]: 71.20×
            - generic [ref=e126]:
              - img [ref=e127]
              - generic [ref=e130]: +2.3% vs last week
          - generic [ref=e131]:
            - generic [ref=e132]:
              - img [ref=e134]
              - generic [ref=e136]: Sell-Through
            - generic [ref=e137]: 74.2%
            - generic [ref=e138]:
              - img [ref=e139]
              - generic [ref=e142]: +6.2% vs target
        - generic [ref=e144]:
          - generic [ref=e145]:
            - generic [ref=e146]:
              - img [ref=e147]
              - heading "AI Insights" [level=3] [ref=e150]
              - generic [ref=e151]: "4"
              - generic [ref=e152]:
                - img [ref=e153]
                - text: AI-generated
            - generic [ref=e156]:
              - button "Regenerate insights" [ref=e157] [cursor=pointer]:
                - img [ref=e158]
              - button "See all" [ref=e163] [cursor=pointer]:
                - text: See all
                - img [ref=e164]
          - generic [ref=e166]:
            - generic [ref=e167] [cursor=pointer]:
              - generic [ref=e168]:
                - img [ref=e170]
                - generic [ref=e172]: critical
              - paragraph [ref=e173]: ₹9.8L wasted on free-rider promotions weekly
              - paragraph [ref=e174]: ₹9.8L
              - generic [ref=e175]:
                - generic [ref=e176]: View
                - img [ref=e177]
            - generic [ref=e179] [cursor=pointer]:
              - generic [ref=e180]:
                - img [ref=e182]
                - generic [ref=e184]: positive
              - paragraph [ref=e185]: Personal Care cashback delivers 3.7× ROI
              - paragraph [ref=e186]: 3.7×
              - generic [ref=e187]:
                - generic [ref=e188]: View
                - img [ref=e189]
            - generic [ref=e191] [cursor=pointer]:
              - generic [ref=e192]:
                - img [ref=e194]
                - generic [ref=e196]: warning
              - paragraph [ref=e197]: ₹6.2L margin gap from cost passthrough delays
              - paragraph [ref=e198]: ₹6.2L
              - generic [ref=e199]:
                - generic [ref=e200]: View
                - img [ref=e201]
            - generic [ref=e203] [cursor=pointer]:
              - generic [ref=e204]:
                - img [ref=e206]
                - generic [ref=e208]: warning
              - paragraph [ref=e209]: ₹39.9L inventory at markdown risk this week
              - paragraph [ref=e210]: ₹39.9L
              - generic [ref=e211]:
                - generic [ref=e212]: View
                - img [ref=e213]
        - generic [ref=e215]:
          - generic [ref=e216]:
            - button "Overview" [ref=e217] [cursor=pointer]:
              - img [ref=e218]
              - text: Overview
            - button "Promo" [ref=e219] [cursor=pointer]:
              - img [ref=e220]
              - text: Promo
            - button "Markdown" [ref=e223] [cursor=pointer]:
              - img [ref=e224]
              - text: Markdown
            - button "Forecasting" [ref=e227] [cursor=pointer]:
              - img [ref=e228]
              - text: Forecasting
            - button "AI Agents" [ref=e231] [cursor=pointer]:
              - img [ref=e232]
              - text: AI Agents
          - generic [ref=e235]:
            - button "Category Manager" [ref=e236] [cursor=pointer]
            - button "Pricing Analyst" [ref=e237] [cursor=pointer]
            - button "VP Commercial" [ref=e238] [cursor=pointer]
          - generic [ref=e239]:
            - combobox [ref=e240] [cursor=pointer]:
              - option "All Departments" [selected]
              - option "Electronics"
              - option "Apparel & Shoes"
              - option "Home & Garden"
              - option "Sports & Outdoor"
              - option "Beauty & Personal"
              - option "Grocery & Snacks"
              - option "Toys & Games"
            - img
        - generic [ref=e241]:
          - generic [ref=e242]:
            - img [ref=e244]
            - paragraph [ref=e247]: AI agents run on Claude. Each agent takes your data context and generates structured analysis. API key required for live results — fallback mode provides computed estimates.
          - generic [ref=e248]:
            - button "Promo Scenario Planner AI Simulate promo ROI before spend" [ref=e250] [cursor=pointer]:
              - img [ref=e252]
              - generic [ref=e254]:
                - generic [ref=e255]:
                  - generic [ref=e256]: Promo Scenario Planner
                  - generic [ref=e257]: AI
                - paragraph [ref=e258]: Simulate promo ROI before spend
              - img [ref=e260]
            - button "Price Strategy Advisor AI Category-level pricing recommendations" [ref=e263] [cursor=pointer]:
              - img [ref=e265]
              - generic [ref=e268]:
                - generic [ref=e269]:
                  - generic [ref=e270]: Price Strategy Advisor
                  - generic [ref=e271]: AI
                - paragraph [ref=e272]: Category-level pricing recommendations
              - img [ref=e274]
            - button "Markdown Timing Optimizer AI Schedule markdowns to maximize recovery" [ref=e277] [cursor=pointer]:
              - img [ref=e279]
              - generic [ref=e281]:
                - generic [ref=e282]:
                  - generic [ref=e283]: Markdown Timing Optimizer
                  - generic [ref=e284]: AI
                - paragraph [ref=e285]: Schedule markdowns to maximize recovery
              - img [ref=e287]
            - button "Competitive Response Analyst AI Chat-based competitor move analysis" [ref=e290] [cursor=pointer]:
              - img [ref=e292]
              - generic [ref=e294]:
                - generic [ref=e295]:
                  - generic [ref=e296]: Competitive Response Analyst
                  - generic [ref=e297]: AI
                - paragraph [ref=e298]: Chat-based competitor move analysis
              - img [ref=e300]
            - button "Weekly Pricing Brief AI Auto-generated weekly pricing summary" [ref=e303] [cursor=pointer]:
              - img [ref=e305]
              - generic [ref=e308]:
                - generic [ref=e309]:
                  - generic [ref=e310]: Weekly Pricing Brief
                  - generic [ref=e311]: AI
                - paragraph [ref=e312]: Auto-generated weekly pricing summary
              - img [ref=e314]
    - complementary [ref=e316]:
      - generic [ref=e317]:
        - generic [ref=e318]:
          - img [ref=e319]
          - generic [ref=e322]: AI Assistant
          - generic [ref=e323]: CX360
        - button [ref=e324] [cursor=pointer]:
          - img [ref=e325]
      - generic [ref=e329]:
        - img [ref=e331]
        - generic [ref=e336]:
          - text: Hi! I'm your AI
          - strong [ref=e337]: agent
          - text: for customer analytics. I can not only answer questions, but also
          - strong [ref=e338]: take actions
          - text: "on your dashboard: - Query data and create charts - Pin charts to your dashboard - Create customer segments - Set up monitoring alerts - Generate action recommendations Try asking me to \"show churn by segment and pin it\" or \"create a segment of high-value churning customers\"!"
      - generic [ref=e339]:
        - paragraph [ref=e340]: "Try asking:"
        - generic [ref=e341]:
          - button "Show churn by segment" [ref=e342] [cursor=pointer]
          - button "Create a segment of high-value churners" [ref=e343] [cursor=pointer]
          - button "Alert me if Premium churn > 25%" [ref=e344] [cursor=pointer]
      - generic [ref=e346]:
        - textbox "Ask about your customer data..." [ref=e347]
        - button [disabled] [ref=e348]:
          - img [ref=e349]
    - region "Notifications alt+T"
  - alert [ref=e352]
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
> 70  |       throw new Error(`[${pageName}][${tenant}] Found INR value "${wrong[0]}" — expected $`);
      |             ^ Error: [/price-intel?tab=agents][us_retail] Found INR value "₹9" — expected $
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
  83  |         throw new Error(`[${pageName}][${tenant}] Found India dept "${dept}" — wrong tenant`);
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
```