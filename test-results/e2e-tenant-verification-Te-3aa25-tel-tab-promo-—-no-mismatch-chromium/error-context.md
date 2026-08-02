# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-tenant-verification.spec.ts >> Tenant: US Retail >> [US Retail] /price-intel?tab=promo — no mismatch
- Location: tests/e2e-tenant-verification.spec.ts:128:11

# Error details

```
Error: [/price-intel?tab=promo][us_retail] Found INR value "₹9" — expected $
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
                - heading "ROI Trends & Mechanic Analysis" [level=3] [ref=e245]
                - paragraph [ref=e246]: 14-week rolling · mechanic effectiveness
              - button "Deep Dive" [ref=e247] [cursor=pointer]:
                - img [ref=e248]
                - text: Deep Dive
            - generic [ref=e250]:
              - generic [ref=e251]:
                - generic [ref=e252]:
                  - generic [ref=e253]:
                    - heading "Promo ROI Trend" [level=3] [ref=e254]
                    - paragraph [ref=e255]: 14-week rolling · goal line shown
                  - generic [ref=e256]:
                    - button "AI insight" [ref=e258] [cursor=pointer]:
                      - img [ref=e259]
                    - button "Export as CSV" [ref=e262] [cursor=pointer]:
                      - img [ref=e263]
                    - button "Expand chart" [ref=e266] [cursor=pointer]:
                      - img [ref=e267]
                - application [ref=e275]:
                  - generic [ref=e284]:
                    - generic [ref=e285]:
                      - generic [ref=e287]: W1
                      - generic [ref=e289]: W4
                      - generic [ref=e291]: W7
                      - generic [ref=e293]: W10
                      - generic [ref=e295]: W13
                    - generic [ref=e296]:
                      - generic [ref=e298]: 0.0×
                      - generic [ref=e300]: 0.8×
                      - generic [ref=e302]: 1.6×
                      - generic [ref=e304]: 2.4×
                      - generic [ref=e306]: 3.2×
              - generic [ref=e307]:
                - generic [ref=e308]:
                  - generic [ref=e309]:
                    - heading "ROI by Mechanic" [level=3] [ref=e310]
                    - paragraph [ref=e311]: Promo mechanic effectiveness
                  - generic [ref=e312]:
                    - button "AI insight" [ref=e314] [cursor=pointer]:
                      - img [ref=e315]
                    - button "Export as CSV" [ref=e318] [cursor=pointer]:
                      - img [ref=e319]
                    - button "Expand chart" [ref=e322] [cursor=pointer]:
                      - img [ref=e323]
                - generic [ref=e330]:
                  - generic [ref=e332]:
                    - generic [ref=e333]: Member Exclusive
                    - generic [ref=e334]:
                      - generic [ref=e335]: 3% share
                      - generic [ref=e336]: 3.40×
                  - generic [ref=e340]:
                    - generic [ref=e341]: GWP
                    - generic [ref=e342]:
                      - generic [ref=e343]: 5% share
                      - generic [ref=e344]: 3.00×
                  - generic [ref=e348]:
                    - generic [ref=e349]: Free Ship
                    - generic [ref=e350]:
                      - generic [ref=e351]: 4% share
                      - generic [ref=e352]: 2.90×
                  - generic [ref=e356]:
                    - generic [ref=e357]: Bundle
                    - generic [ref=e358]:
                      - generic [ref=e359]: 12% share
                      - generic [ref=e360]: 2.60×
                  - generic [ref=e364]:
                    - generic [ref=e365]: B2G1 Half
                    - generic [ref=e366]:
                      - generic [ref=e367]: 12% share
                      - generic [ref=e368]: 2.50×
                  - generic [ref=e372]:
                    - generic [ref=e373]: $ Off
                    - generic [ref=e374]:
                      - generic [ref=e375]: 10% share
                      - generic [ref=e376]: 2.40×
                  - generic [ref=e380]:
                    - generic [ref=e381]: Tiered
                    - generic [ref=e382]:
                      - generic [ref=e383]: 6% share
                      - generic [ref=e384]: 2.30×
                  - generic [ref=e388]:
                    - generic [ref=e389]: BOGO 50%
                    - generic [ref=e390]:
                      - generic [ref=e391]: 18% share
                      - generic [ref=e392]: 2.20×
                  - generic [ref=e396]:
                    - generic [ref=e397]: "% Off"
                    - generic [ref=e398]:
                      - generic [ref=e399]: 30% share
                      - generic [ref=e400]: 2.00×
          - generic [ref=e403]:
            - generic [ref=e404]:
              - img [ref=e405]
              - heading "AI Suggestions" [level=3] [ref=e408]
              - generic [ref=e409]: 5 recommendations
            - generic [ref=e410]:
              - generic [ref=e411]:
                - generic [ref=e412]:
                  - generic [ref=e413]: Pause
                  - generic [ref=e414]: 64%
                - paragraph [ref=e415]: ⏸Pause underperforming Labor Day denim BOGO
                - paragraph [ref=e416]: Free-rider 58%; redirect budget to Beauty Loyalty (ROI 3.4x).
                - generic [ref=e417]:
                  - generic [ref=e418]: Home & Garden
                  - generic [ref=e419]: $32,000
                - button "Pause Campaign" [ref=e420] [cursor=pointer]
              - generic [ref=e421]:
                - generic [ref=e422]:
                  - generic [ref=e423]: Extend
                  - generic [ref=e424]: 78%
                - paragraph [ref=e425]: ⟳Extend Beauty Loyalty Rewards by 1 week
                - paragraph [ref=e426]: ROI 3.4x, tail still strong; +$28K projected.
                - generic [ref=e427]:
                  - generic [ref=e428]: Electronics
                  - generic [ref=e429]: $28,000
                - button "Extend by 1 Week" [ref=e430] [cursor=pointer]
              - generic [ref=e431]:
                - generic [ref=e432]:
                  - generic [ref=e433]: Increase
                  - generic [ref=e434]: 79%
                - paragraph [ref=e435]: Raise Toys Halloween depth to 30%
                - paragraph [ref=e436]: Elasticity headroom unlocked; +$18K incremental.
                - generic [ref=e437]:
                  - generic [ref=e438]: Beauty & Personal
                  - generic [ref=e439]: $18,000
                - button "Raise Depth" [ref=e440] [cursor=pointer]
              - generic [ref=e441]:
                - generic [ref=e442]:
                  - generic [ref=e443]: Redirect
                  - generic [ref=e444]: 70%
                - paragraph [ref=e445]: →Redirect Grocery snack budget to BTS Electronics
                - paragraph [ref=e446]: Shift $40K — 2.6x vs 1.6x projected.
                - generic [ref=e447]:
                  - generic [ref=e448]: Apparel & Shoes
                  - generic [ref=e449]: $24,000
                - button "Reallocate Budget" [ref=e450] [cursor=pointer]
          - generic [ref=e451]:
            - generic [ref=e452]:
              - generic [ref=e453]:
                - heading "Campaigns & Segment Lift" [level=3] [ref=e454]
                - paragraph [ref=e455]: All campaigns · lift by customer segment
              - button "Deep Dive" [ref=e456] [cursor=pointer]:
                - img [ref=e457]
                - text: Deep Dive
            - generic [ref=e459]:
              - generic [ref=e461]:
                - generic [ref=e462]:
                  - heading "Campaigns" [level=3] [ref=e463]
                  - generic [ref=e464]:
                    - button "ROI" [ref=e465] [cursor=pointer]
                    - button "Revenue" [ref=e466] [cursor=pointer]
                    - button "A–Z" [ref=e467] [cursor=pointer]
                - table [ref=e469]:
                  - rowgroup [ref=e470]:
                    - row "Campaign Mechanic ROI Incr. Rev Free Rider Status" [ref=e471]:
                      - columnheader "Campaign" [ref=e472]
                      - columnheader "Mechanic" [ref=e473]
                      - columnheader "ROI" [ref=e474]
                      - columnheader "Incr. Rev" [ref=e475]
                      - columnheader "Free Rider" [ref=e476]
                      - columnheader "Status" [ref=e477]
                  - rowgroup [ref=e478]:
                    - row "Beauty Loyalty Rewards Beauty & Personal member_excl 3.40× $1.2M 22.0% completed" [ref=e479]:
                      - cell "Beauty Loyalty Rewards Beauty & Personal" [ref=e480]:
                        - paragraph [ref=e481]: Beauty Loyalty Rewards
                        - paragraph [ref=e482]: Beauty & Personal
                      - cell "member_excl" [ref=e483]
                      - cell "3.40×" [ref=e484]
                      - cell "$1.2M" [ref=e485]
                      - cell "22.0%" [ref=e486]
                      - cell "completed" [ref=e487]
                    - row "Skincare Refresh GWP Beauty & Personal gwp 3.00× $1.3M 28.0% live" [ref=e488]:
                      - cell "Skincare Refresh GWP Beauty & Personal" [ref=e489]:
                        - paragraph [ref=e490]: Skincare Refresh GWP
                        - paragraph [ref=e491]: Beauty & Personal
                      - cell "gwp" [ref=e492]
                      - cell "3.00×" [ref=e493]
                      - cell "$1.3M" [ref=e494]
                      - cell "28.0%" [ref=e495]
                      - cell "live" [ref=e496]
                    - row "July 4 Snack Bundle Grocery & Snacks Bundle 2.90× $769,686 32.0% completed" [ref=e497]:
                      - cell "July 4 Snack Bundle Grocery & Snacks" [ref=e498]:
                        - paragraph [ref=e499]: July 4 Snack Bundle
                        - paragraph [ref=e500]: Grocery & Snacks
                      - cell "Bundle" [ref=e501]
                      - cell "2.90×" [ref=e502]
                      - cell "$769,686" [ref=e503]
                      - cell "32.0%" [ref=e504]
                      - cell "completed" [ref=e505]
                    - row "Phone Trade-In Boost Electronics dollar_off 2.80× $979,423 34.0% live" [ref=e506]:
                      - cell "Phone Trade-In Boost Electronics" [ref=e507]:
                        - paragraph [ref=e508]: Phone Trade-In Boost
                        - paragraph [ref=e509]: Electronics
                      - cell "dollar_off" [ref=e510]
                      - cell "2.80×" [ref=e511]
                      - cell "$979,423" [ref=e512]
                      - cell "34.0%" [ref=e513]
                      - cell "live" [ref=e514]
                    - row "Back to School Electronics Bundle Electronics Bundle 2.60× $857,290 42.0% completed" [ref=e515]:
                      - cell "Back to School Electronics Bundle Electronics" [ref=e516]:
                        - paragraph [ref=e517]: Back to School Electronics Bundle
                        - paragraph [ref=e518]: Electronics
                      - cell "Bundle" [ref=e519]
                      - cell "2.60×" [ref=e520]
                      - cell "$857,290" [ref=e521]
                      - cell "42.0%" [ref=e522]
                      - cell "completed" [ref=e523]
                    - row "Free Ship Weekend Apparel & Shoes free_ship 2.50× $0 36.0% scheduled" [ref=e524]:
                      - cell "Free Ship Weekend Apparel & Shoes" [ref=e525]:
                        - paragraph [ref=e526]: Free Ship Weekend
                        - paragraph [ref=e527]: Apparel & Shoes
                      - cell "free_ship" [ref=e528]
                      - cell "2.50×" [ref=e529]
                      - cell "$0" [ref=e530]
                      - cell "36.0%" [ref=e531]
                      - cell "scheduled" [ref=e532]
                    - row "Fitness New Year Prep Sports & Outdoor tiered 2.40× $987,218 40.0% live" [ref=e533]:
                      - cell "Fitness New Year Prep Sports & Outdoor" [ref=e534]:
                        - paragraph [ref=e535]: Fitness New Year Prep
                        - paragraph [ref=e536]: Sports & Outdoor
                      - cell "tiered" [ref=e537]
                      - cell "2.40×" [ref=e538]
                      - cell "$987,218" [ref=e539]
                      - cell "40.0%" [ref=e540]
                      - cell "live" [ref=e541]
                    - row "Toys Early Holiday Preview Toys & Games % Off 2.30× $917,675 38.0% live" [ref=e542]:
                      - cell "Toys Early Holiday Preview Toys & Games" [ref=e543]:
                        - paragraph [ref=e544]: Toys Early Holiday Preview
                        - paragraph [ref=e545]: Toys & Games
                      - cell "% Off" [ref=e546]
                      - cell "2.30×" [ref=e547]
                      - cell "$917,675" [ref=e548]
                      - cell "38.0%" [ref=e549]
                      - cell "live" [ref=e550]
                    - row "Memorial Day Grill & Garden Home & Garden % Off 2.20× $215,219 44.0% completed" [ref=e551]:
                      - cell "Memorial Day Grill & Garden Home & Garden" [ref=e552]:
                        - paragraph [ref=e553]: Memorial Day Grill & Garden
                        - paragraph [ref=e554]: Home & Garden
                      - cell "% Off" [ref=e555]
                      - cell "2.20×" [ref=e556]
                      - cell "$215,219" [ref=e557]
                      - cell "44.0%" [ref=e558]
                      - cell "completed" [ref=e559]
                    - row "Summer Sports BOGO Sports & Outdoor bogo_50 2.10× $210,141 46.0% completed" [ref=e560]:
                      - cell "Summer Sports BOGO Sports & Outdoor" [ref=e561]:
                        - paragraph [ref=e562]: Summer Sports BOGO
                        - paragraph [ref=e563]: Sports & Outdoor
                      - cell "bogo_50" [ref=e564]
                      - cell "2.10×" [ref=e565]
                      - cell "$210,141" [ref=e566]
                      - cell "46.0%" [ref=e567]
                      - cell "completed" [ref=e568]
                    - row "Halloween Toys Early Bird Toys & Games % Off 1.90× $0 48.0% scheduled" [ref=e569]:
                      - cell "Halloween Toys Early Bird Toys & Games" [ref=e570]:
                        - paragraph [ref=e571]: Halloween Toys Early Bird
                        - paragraph [ref=e572]: Toys & Games
                      - cell "% Off" [ref=e573]
                      - cell "1.90×" [ref=e574]
                      - cell "$0" [ref=e575]
                      - cell "48.0%" [ref=e576]
                      - cell "scheduled" [ref=e577]
                    - row "Labor Day Apparel Sale Apparel & Shoes bogo_50 1.80× $379,013 58.0% completed" [ref=e578]:
                      - cell "Labor Day Apparel Sale Apparel & Shoes" [ref=e579]:
                        - paragraph [ref=e580]: Labor Day Apparel Sale
                        - paragraph [ref=e581]: Apparel & Shoes
                      - cell "bogo_50" [ref=e582]
                      - cell "1.80×" [ref=e583]
                      - cell "$379,013" [ref=e584]
                      - cell "58.0%" [ref=e585]
                      - cell "completed" [ref=e586]
              - generic [ref=e587]:
                - generic [ref=e588]:
                  - generic [ref=e589]:
                    - heading "Lift by Segment" [level=3] [ref=e590]
                    - paragraph [ref=e591]: Promo lift vs free-rider waste
                  - generic [ref=e592]:
                    - button "AI insight" [ref=e594] [cursor=pointer]:
                      - img [ref=e595]
                    - button "Export as CSV" [ref=e598] [cursor=pointer]:
                      - img [ref=e599]
                    - button "Expand chart" [ref=e602] [cursor=pointer]:
                      - img [ref=e603]
                - application [ref=e611]:
                  - generic [ref=e655]:
                    - generic [ref=e658]: 60%
                    - generic [ref=e659]:
                      - generic [ref=e661]: VIP
                      - generic [ref=e663]: Loyalist
                      - generic [ref=e665]: Enthusiast
                      - generic [ref=e667]: Casual
                      - generic [ref=e669]: At-Risk
                      - generic [ref=e671]: Lapsed
    - complementary [ref=e672]:
      - generic [ref=e673]:
        - generic [ref=e674]:
          - img [ref=e675]
          - generic [ref=e678]: AI Assistant
          - generic [ref=e679]: CX360
        - button [ref=e680] [cursor=pointer]:
          - img [ref=e681]
      - generic [ref=e685]:
        - img [ref=e687]
        - generic [ref=e692]:
          - text: Hi! I'm your AI
          - strong [ref=e693]: agent
          - text: for customer analytics. I can not only answer questions, but also
          - strong [ref=e694]: take actions
          - text: "on your dashboard: - Query data and create charts - Pin charts to your dashboard - Create customer segments - Set up monitoring alerts - Generate action recommendations Try asking me to \"show churn by segment and pin it\" or \"create a segment of high-value churning customers\"!"
      - generic [ref=e695]:
        - paragraph [ref=e696]: "Try asking:"
        - generic [ref=e697]:
          - button "Show churn by segment" [ref=e698] [cursor=pointer]
          - button "Create a segment of high-value churners" [ref=e699] [cursor=pointer]
          - button "Alert me if Premium churn > 25%" [ref=e700] [cursor=pointer]
      - generic [ref=e702]:
        - textbox "Ask about your customer data..." [ref=e703]
        - button [disabled] [ref=e704]:
          - img [ref=e705]
    - region "Notifications alt+T"
  - alert [ref=e708]
  - generic [ref=e709]: VIP
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
      |             ^ Error: [/price-intel?tab=promo][us_retail] Found INR value "₹9" — expected $
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