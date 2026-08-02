# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-tenant-verification.spec.ts >> Tenant: US Retail >> [US Retail] /price-intel?tab=forecasting — no mismatch
- Location: tests/e2e-tenant-verification.spec.ts:128:11

# Error details

```
Error: [/price-intel?tab=forecasting][us_retail] Found INR value "₹9" — expected $
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
            - generic [ref=e243]:
              - generic [ref=e244]:
                - heading "14-Week Revenue Forecast" [level=3] [ref=e245]
                - paragraph [ref=e246]: 95% confidence interval · event markers
              - button "Deep Dive" [ref=e247] [cursor=pointer]:
                - img [ref=e248]
                - text: Deep Dive
            - generic [ref=e250]:
              - generic [ref=e251]:
                - generic [ref=e252]:
                  - heading "14-Week Revenue Forecast" [level=3] [ref=e253]
                  - paragraph [ref=e254]: 95% CI band shown · event labels marked
                - generic [ref=e255]:
                  - button "AI insight" [ref=e257] [cursor=pointer]:
                    - img [ref=e258]
                  - button "Export as CSV" [ref=e261] [cursor=pointer]:
                    - img [ref=e262]
                  - button "Expand chart" [ref=e265] [cursor=pointer]:
                    - img [ref=e266]
              - application [ref=e274]:
                - generic [ref=e293]:
                  - generic [ref=e294]:
                    - generic [ref=e296]: W1 05/24
                    - generic [ref=e298]: W3 06/07
                    - generic [ref=e300]: W5 06/21
                    - generic [ref=e302]: W7 07/05
                    - generic [ref=e304]: W9 07/19
                    - generic [ref=e306]: W11 08/02
                    - generic [ref=e308]: W13 08/16
                  - generic [ref=e309]:
                    - generic [ref=e311]: $0
                    - generic [ref=e313]: $500,000
                    - generic [ref=e315]: $1.0M
                    - generic [ref=e317]: $1.5M
                    - generic [ref=e319]: $2.0M
          - generic [ref=e320]:
            - generic [ref=e321]:
              - generic [ref=e322]:
                - heading "Scenarios & Event Calendar" [level=3] [ref=e323]
                - paragraph [ref=e324]: What-if planning · seasonality index
              - button "Deep Dive" [ref=e325] [cursor=pointer]:
                - img [ref=e326]
                - text: Deep Dive
            - generic [ref=e328]:
              - generic [ref=e329]:
                - generic [ref=e330]:
                  - generic [ref=e331]:
                    - heading "Scenario Planner" [level=3] [ref=e332]
                    - paragraph [ref=e333]: Simulated 14-week impact
                  - generic [ref=e334]:
                    - button "AI insight" [ref=e336] [cursor=pointer]:
                      - img [ref=e337]
                    - button "Export as CSV" [ref=e340] [cursor=pointer]:
                      - img [ref=e341]
                    - button "Expand chart" [ref=e344] [cursor=pointer]:
                      - img [ref=e345]
                - generic [ref=e351]:
                  - generic [ref=e352]:
                    - button "Base Case Current trajectory maintained" [ref=e353] [cursor=pointer]:
                      - paragraph [ref=e354]: Base Case
                      - paragraph [ref=e355]: Current trajectory maintained
                    - button "Aggressive Promo Deep discounts drive volume +18%, margin −4pp" [ref=e356] [cursor=pointer]:
                      - paragraph [ref=e357]: Aggressive Promo
                      - paragraph [ref=e358]: Deep discounts drive volume +18%, margin −4pp
                    - button "Price Optimize Selective price increases, reduced promo waste" [ref=e359] [cursor=pointer]:
                      - paragraph [ref=e360]: Price Optimize
                      - paragraph [ref=e361]: Selective price increases, reduced promo waste
                    - button "Festival Boost Festival calendar uplift — high volume window" [ref=e362] [cursor=pointer]:
                      - paragraph [ref=e363]: Festival Boost
                      - paragraph [ref=e364]: Festival calendar uplift — high volume window
                  - generic [ref=e365]:
                    - generic [ref=e366]:
                      - paragraph [ref=e367]: 14W Revenue
                      - paragraph [ref=e368]: $20.1M
                      - paragraph [ref=e369]: 0.0% vs base
                    - generic [ref=e370]:
                      - paragraph [ref=e371]: 14W Margin
                      - paragraph [ref=e372]: $7.7M
                      - paragraph [ref=e373]: 0.0% vs base
              - generic [ref=e374]:
                - generic [ref=e375]:
                  - generic [ref=e376]:
                    - heading "Event Calendar" [level=3] [ref=e377]
                    - paragraph [ref=e378]: Seasonality index · events highlighted
                  - generic [ref=e379]:
                    - button "AI insight" [ref=e381] [cursor=pointer]:
                      - img [ref=e382]
                    - button "Export as CSV" [ref=e385] [cursor=pointer]:
                      - img [ref=e386]
                    - button "Expand chart" [ref=e389] [cursor=pointer]:
                      - img [ref=e390]
                - table [ref=e397]:
                  - rowgroup [ref=e398]:
                    - row "Week Event Season idx Rev forecast Margin" [ref=e399]:
                      - columnheader "Week" [ref=e400]
                      - columnheader "Event" [ref=e401]
                      - columnheader "Season idx" [ref=e402]
                      - columnheader "Rev forecast" [ref=e403]
                      - columnheader "Margin" [ref=e404]
                  - rowgroup [ref=e405]:
                    - row "W1 05/24 — 1.00× $1.2M $471,200" [ref=e406]:
                      - cell "W1 05/24" [ref=e407]
                      - cell "—" [ref=e408]
                      - cell "1.00×" [ref=e409]:
                        - generic [ref=e410]: 1.00×
                      - cell "$1.2M" [ref=e411]
                      - cell "$471,200" [ref=e412]
                    - row "W2 05/31 — 1.00× $1.2M $471,200" [ref=e413]:
                      - cell "W2 05/31" [ref=e414]
                      - cell "—" [ref=e415]
                      - cell "1.00×" [ref=e416]:
                        - generic [ref=e417]: 1.00×
                      - cell "$1.2M" [ref=e418]
                      - cell "$471,200" [ref=e419]
                    - row "W3 06/07 Labor Day 1.28× $1.6M $603,136" [ref=e420]:
                      - cell "W3 06/07" [ref=e421]
                      - cell "Labor Day" [ref=e422]
                      - cell "1.28×" [ref=e423]:
                        - generic [ref=e424]: 1.28×
                      - cell "$1.6M" [ref=e425]
                      - cell "$603,136" [ref=e426]
                    - row "W4 06/14 — 1.15× $1.4M $541,880" [ref=e427]:
                      - cell "W4 06/14" [ref=e428]
                      - cell "—" [ref=e429]
                      - cell "1.15×" [ref=e430]:
                        - generic [ref=e431]: 1.15×
                      - cell "$1.4M" [ref=e432]
                      - cell "$541,880" [ref=e433]
                    - row "W5 06/21 — 1.15× $1.4M $541,880" [ref=e434]:
                      - cell "W5 06/21" [ref=e435]
                      - cell "—" [ref=e436]
                      - cell "1.15×" [ref=e437]:
                        - generic [ref=e438]: 1.15×
                      - cell "$1.4M" [ref=e439]
                      - cell "$541,880" [ref=e440]
                    - row "W6 06/28 — 1.15× $1.4M $541,880" [ref=e441]:
                      - cell "W6 06/28" [ref=e442]
                      - cell "—" [ref=e443]
                      - cell "1.15×" [ref=e444]:
                        - generic [ref=e445]: 1.15×
                      - cell "$1.4M" [ref=e446]
                      - cell "$541,880" [ref=e447]
                    - row "W7 07/05 — 1.15× $1.4M $541,880" [ref=e448]:
                      - cell "W7 07/05" [ref=e449]
                      - cell "—" [ref=e450]
                      - cell "1.15×" [ref=e451]:
                        - generic [ref=e452]: 1.15×
                      - cell "$1.4M" [ref=e453]
                      - cell "$541,880" [ref=e454]
                    - row "W8 07/12 Back to School peak 1.42× $1.8M $669,104" [ref=e455]:
                      - cell "W8 07/12" [ref=e456]
                      - cell "Back to School peak" [ref=e457]
                      - cell "1.42×" [ref=e458]:
                        - generic [ref=e459]: 1.42×
                      - cell "$1.8M" [ref=e460]
                      - cell "$669,104" [ref=e461]
                    - row "W9 07/19 — 1.20× $1.5M $565,440" [ref=e462]:
                      - cell "W9 07/19" [ref=e463]
                      - cell "—" [ref=e464]
                      - cell "1.20×" [ref=e465]:
                        - generic [ref=e466]: 1.20×
                      - cell "$1.5M" [ref=e467]
                      - cell "$565,440" [ref=e468]
                    - row "W10 07/26 — 1.20× $1.5M $565,440" [ref=e469]:
                      - cell "W10 07/26" [ref=e470]
                      - cell "—" [ref=e471]
                      - cell "1.20×" [ref=e472]:
                        - generic [ref=e473]: 1.20×
                      - cell "$1.5M" [ref=e474]
                      - cell "$565,440" [ref=e475]
                    - row "W11 08/02 — 1.20× $1.5M $565,440" [ref=e476]:
                      - cell "W11 08/02" [ref=e477]
                      - cell "—" [ref=e478]
                      - cell "1.20×" [ref=e479]:
                        - generic [ref=e480]: 1.20×
                      - cell "$1.5M" [ref=e481]
                      - cell "$565,440" [ref=e482]
                    - row "W12 08/09 Halloween 1.24× $1.5M $584,288" [ref=e483]:
                      - cell "W12 08/09" [ref=e484]
                      - cell "Halloween" [ref=e485]
                      - cell "1.24×" [ref=e486]:
                        - generic [ref=e487]: 1.24×
                      - cell "$1.5M" [ref=e488]
                      - cell "$584,288" [ref=e489]
                    - row "W13 08/16 — 1.05× $1.3M $494,760" [ref=e490]:
                      - cell "W13 08/16" [ref=e491]
                      - cell "—" [ref=e492]
                      - cell "1.05×" [ref=e493]:
                        - generic [ref=e494]: 1.05×
                      - cell "$1.3M" [ref=e495]
                      - cell "$494,760" [ref=e496]
                    - row "W14 08/23 — 1.05× $1.3M $494,760" [ref=e497]:
                      - cell "W14 08/23" [ref=e498]
                      - cell "—" [ref=e499]
                      - cell "1.05×" [ref=e500]:
                        - generic [ref=e501]: 1.05×
                      - cell "$1.3M" [ref=e502]
                      - cell "$494,760" [ref=e503]
    - complementary [ref=e504]:
      - generic [ref=e505]:
        - generic [ref=e506]:
          - img [ref=e507]
          - generic [ref=e510]: AI Assistant
          - generic [ref=e511]: CX360
        - button [ref=e512] [cursor=pointer]:
          - img [ref=e513]
      - generic [ref=e517]:
        - img [ref=e519]
        - generic [ref=e524]:
          - text: Hi! I'm your AI
          - strong [ref=e525]: agent
          - text: for customer analytics. I can not only answer questions, but also
          - strong [ref=e526]: take actions
          - text: "on your dashboard: - Query data and create charts - Pin charts to your dashboard - Create customer segments - Set up monitoring alerts - Generate action recommendations Try asking me to \"show churn by segment and pin it\" or \"create a segment of high-value churning customers\"!"
      - generic [ref=e527]:
        - paragraph [ref=e528]: "Try asking:"
        - generic [ref=e529]:
          - button "Show churn by segment" [ref=e530] [cursor=pointer]
          - button "Create a segment of high-value churners" [ref=e531] [cursor=pointer]
          - button "Alert me if Premium churn > 25%" [ref=e532] [cursor=pointer]
      - generic [ref=e534]:
        - textbox "Ask about your customer data..." [ref=e535]
        - button [disabled] [ref=e536]:
          - img [ref=e537]
    - region "Notifications alt+T"
  - alert [ref=e540]
  - generic [ref=e541]: $0
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
      |             ^ Error: [/price-intel?tab=forecasting][us_retail] Found INR value "₹9" — expected $
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