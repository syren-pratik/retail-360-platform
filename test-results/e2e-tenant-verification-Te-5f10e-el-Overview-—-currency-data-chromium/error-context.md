# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-tenant-verification.spec.ts >> Tenant: US Retail >> [US Retail] /price-intel Overview — currency + data
- Location: tests/e2e-tenant-verification.spec.ts:119:9

# Error details

```
Error: [/price-intel][us_retail] Found INR value "₹9" — expected $
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
                - heading "Action Queue & Live Activity" [level=3] [ref=e245]
                - paragraph [ref=e246]: Pending decisions · real-time signals
              - button "Deep Dive" [ref=e247] [cursor=pointer]:
                - img [ref=e248]
                - text: Deep Dive
            - generic [ref=e250]:
              - generic [ref=e251]:
                - generic [ref=e252]:
                  - generic [ref=e253]:
                    - heading "Action Queue" [level=3] [ref=e254]
                    - paragraph [ref=e255]: 4 urgent · 12 total
                  - generic [ref=e256]:
                    - button "All" [ref=e257] [cursor=pointer]
                    - button "Urgent" [ref=e258] [cursor=pointer]
                    - button "Review" [ref=e259] [cursor=pointer]
                - generic [ref=e261]:
                  - generic [ref=e262]:
                    - generic [ref=e263]:
                      - img [ref=e264]
                      - generic [ref=e266]: Urgent
                    - generic [ref=e267]:
                      - generic [ref=e268]:
                        - generic [ref=e269]: Meridian Outdoor Recreation Classic
                        - generic [ref=e270]: Sports & Outdoor
                      - paragraph [ref=e271]: Stuck at Clearance for 10 days (target 28d) — sell-through 89.4%.
                      - generic [ref=e272]:
                        - generic [ref=e273]: markdown_stuck
                        - generic [ref=e274]: Campaign
                        - generic [ref=e275]: $22,886 at stake
                    - generic [ref=e276]:
                      - button "Approve" [ref=e277] [cursor=pointer]:
                        - img [ref=e278]
                      - button "Snooze" [ref=e280] [cursor=pointer]:
                        - img [ref=e281]
                  - generic [ref=e286]:
                    - generic [ref=e287]:
                      - img [ref=e288]
                      - generic [ref=e290]: Urgent
                    - generic [ref=e291]:
                      - generic [ref=e292]:
                        - generic [ref=e293]: Apple TVs & Displays Modern
                        - generic [ref=e294]: Electronics
                      - paragraph [ref=e295]: Competitor priced at $457.74 vs our $508.6 — competitive index 109.1.
                      - generic [ref=e296]:
                        - generic [ref=e297]: competitive_match
                        - generic [ref=e298]: Campaign
                        - generic [ref=e299]: $19,567 at stake
                    - generic [ref=e300]:
                      - button "Approve" [ref=e301] [cursor=pointer]:
                        - img [ref=e302]
                      - button "Snooze" [ref=e304] [cursor=pointer]:
                        - img [ref=e305]
                  - generic [ref=e310]:
                    - generic [ref=e311]:
                      - img [ref=e312]
                      - generic [ref=e314]: Urgent
                    - generic [ref=e315]:
                      - generic [ref=e316]:
                        - generic [ref=e317]: LEGO Outdoor Play Everyday
                        - generic [ref=e318]: Toys & Games
                      - paragraph [ref=e319]: Margin 49.2% vs floor 40% — pricing pressure.
                      - generic [ref=e320]:
                        - generic [ref=e321]: Margin Floor
                        - generic [ref=e322]: Campaign
                        - generic [ref=e323]: $11,617 at stake
                    - generic [ref=e324]:
                      - button "Approve" [ref=e325] [cursor=pointer]:
                        - img [ref=e326]
                      - button "Snooze" [ref=e328] [cursor=pointer]:
                        - img [ref=e329]
                  - generic [ref=e334]:
                    - generic [ref=e335]:
                      - img [ref=e336]
                      - generic [ref=e338]: Urgent
                    - generic [ref=e339]:
                      - generic [ref=e340]:
                        - generic [ref=e341]: Sony TVs & Displays Modern
                        - generic [ref=e342]: Electronics
                      - paragraph [ref=e343]: Margin 33.2% vs floor 12% — pricing pressure.
                      - generic [ref=e344]:
                        - generic [ref=e345]: Margin Floor
                        - generic [ref=e346]: Campaign
                        - generic [ref=e347]: $5,855 at stake
                    - generic [ref=e348]:
                      - button "Approve" [ref=e349] [cursor=pointer]:
                        - img [ref=e350]
                      - button "Snooze" [ref=e352] [cursor=pointer]:
                        - img [ref=e353]
                  - generic [ref=e358]:
                    - generic [ref=e359]:
                      - img [ref=e360]
                      - generic [ref=e362]: Review
                    - generic [ref=e363]:
                      - generic [ref=e364]:
                        - generic [ref=e365]: Nike Women's Clothing Premium
                        - generic [ref=e366]: Apparel & Shoes
                      - paragraph [ref=e367]: Stuck at -25% for 13 days (target 14d) — sell-through 68.5%.
                      - generic [ref=e368]:
                        - generic [ref=e369]: markdown_stuck
                        - generic [ref=e370]: Campaign
                        - generic [ref=e371]: $29,005 at stake
                    - generic [ref=e372]:
                      - button "Approve" [ref=e373] [cursor=pointer]:
                        - img [ref=e374]
                      - button "Snooze" [ref=e376] [cursor=pointer]:
                        - img [ref=e377]
                  - generic [ref=e382]:
                    - generic [ref=e383]:
                      - img [ref=e384]
                      - generic [ref=e386]: Review
                    - generic [ref=e387]:
                      - generic [ref=e388]:
                        - generic [ref=e389]: Instant Pot Bedding Classic
                        - generic [ref=e390]: Home & Garden
                      - paragraph [ref=e391]: Stuck at Full Price for 79 days (target 84d) — sell-through 66.2%.
                      - generic [ref=e392]:
                        - generic [ref=e393]: markdown_stuck
                        - generic [ref=e394]: Campaign
                        - generic [ref=e395]: $25,496 at stake
                    - generic [ref=e396]:
                      - button "Approve" [ref=e397] [cursor=pointer]:
                        - img [ref=e398]
                      - button "Snooze" [ref=e400] [cursor=pointer]:
                        - img [ref=e401]
                  - generic [ref=e406]:
                    - generic [ref=e407]:
                      - img [ref=e408]
                      - generic [ref=e410]: Review
                    - generic [ref=e411]:
                      - generic [ref=e412]:
                        - generic [ref=e413]: Ninja Home Décor Value
                        - generic [ref=e414]: Home & Garden
                      - paragraph [ref=e415]: Stuck at Clearance for 13 days (target 28d) — sell-through 94.7%.
                      - generic [ref=e416]:
                        - generic [ref=e417]: markdown_stuck
                        - generic [ref=e418]: Campaign
                        - generic [ref=e419]: $16,890 at stake
                    - generic [ref=e420]:
                      - button "Approve" [ref=e421] [cursor=pointer]:
                        - img [ref=e422]
                      - button "Snooze" [ref=e424] [cursor=pointer]:
                        - img [ref=e425]
                  - generic [ref=e430]:
                    - generic [ref=e431]:
                      - img [ref=e432]
                      - generic [ref=e434]: Review
                    - generic [ref=e435]:
                      - generic [ref=e436]:
                        - generic [ref=e437]: Coca-Cola Packaged Foods & Beverages Everyday
                        - generic [ref=e438]: Grocery & Snacks
                      - paragraph [ref=e439]: Stuck at -25% for 7 days (target 14d) — sell-through 68.6%.
                      - generic [ref=e440]:
                        - generic [ref=e441]: markdown_stuck
                        - generic [ref=e442]: Campaign
                        - generic [ref=e443]: $13,316 at stake
                    - generic [ref=e444]:
                      - button "Approve" [ref=e445] [cursor=pointer]:
                        - img [ref=e446]
                      - button "Snooze" [ref=e448] [cursor=pointer]:
                        - img [ref=e449]
                  - generic [ref=e454]:
                    - generic [ref=e455]:
                      - img [ref=e456]
                      - generic [ref=e459]: Info
                    - generic [ref=e460]:
                      - generic [ref=e461]:
                        - generic [ref=e462]: Dove Skincare Modern
                        - generic [ref=e463]: Beauty & Personal
                      - paragraph [ref=e464]: Stuck at Full Price for 69 days (target 84d) — sell-through 31.1%.
                      - generic [ref=e465]:
                        - generic [ref=e466]: markdown_stuck
                        - generic [ref=e467]: Campaign
                        - generic [ref=e468]: $40,443 at stake
                    - generic [ref=e469]:
                      - button "Approve" [ref=e470] [cursor=pointer]:
                        - img [ref=e471]
                      - button "Snooze" [ref=e473] [cursor=pointer]:
                        - img [ref=e474]
                  - generic [ref=e479]:
                    - generic [ref=e480]:
                      - img [ref=e481]
                      - generic [ref=e484]: Info
                    - generic [ref=e485]:
                      - generic [ref=e486]:
                        - generic [ref=e487]: Under Armour Men's Clothing Classic
                        - generic [ref=e488]: Apparel & Shoes
                      - paragraph [ref=e489]: Stuck at -60% for 10 days (target 14d) — sell-through 86.7%.
                      - generic [ref=e490]:
                        - generic [ref=e491]: markdown_stuck
                        - generic [ref=e492]: Campaign
                        - generic [ref=e493]: $25,302 at stake
                    - generic [ref=e494]:
                      - button "Approve" [ref=e495] [cursor=pointer]:
                        - img [ref=e496]
                      - button "Snooze" [ref=e498] [cursor=pointer]:
                        - img [ref=e499]
              - generic [ref=e504]:
                - generic [ref=e505]:
                  - heading "Live Activity" [level=3] [ref=e506]
                  - paragraph [ref=e507]: Real-time pricing signals
                - generic [ref=e508]:
                  - generic [ref=e511]:
                    - generic [ref=e512]:
                      - generic [ref=e513]: competitive_drop
                      - generic [ref=e514]: 2h ago
                    - paragraph [ref=e515]: Best Buy dropped Samsung 55" 4K TV to $429 (was $499)
                    - paragraph [ref=e516]: Detected by web scrape · Electronics · gap widened to -14%
                  - generic [ref=e519]:
                    - generic [ref=e520]:
                      - generic [ref=e521]: Markdown
                      - generic [ref=e522]: 41 min ago
                    - paragraph [ref=e523]: Levi's 501 stonewash size 32 hit 88% sell-through
                    - paragraph [ref=e524]: Auto-snap to md25 queued for approval
                  - generic [ref=e527]:
                    - generic [ref=e528]:
                      - generic [ref=e529]: Season
                      - generic [ref=e530]: 3h ago
                    - paragraph [ref=e531]: Back-to-School Electronics volume +18% WoW
                    - paragraph [ref=e532]: Recommend allocation +12% to top laptops
                  - generic [ref=e535]:
                    - generic [ref=e536]:
                      - generic [ref=e537]: returns_spike
                      - generic [ref=e538]: 1h ago
                    - paragraph [ref=e539]: "Returns spike: Sony WH-1000XM5 headphones — 22% returns last 14d"
                    - paragraph [ref=e540]: "Top reason: fit (48%) · review product page"
                  - generic [ref=e543]:
                    - generic [ref=e544]:
                      - generic [ref=e545]: Campaign
                      - generic [ref=e546]: 14h ago
                    - paragraph [ref=e547]: Beauty Loyalty Rewards live · day 2
                    - paragraph [ref=e548]: Lift +112% vs baseline · ROI 3.4x
                  - generic [ref=e551]:
                    - generic [ref=e552]:
                      - generic [ref=e553]: Cost
                      - generic [ref=e554]: 5h ago
                    - paragraph [ref=e555]: Aluminum spot price up 4.8% — grill margin under pressure
                    - paragraph [ref=e556]: Next PO cycle Jul 4 · review pass-through
                  - generic [ref=e559]:
                    - generic [ref=e560]:
                      - generic [ref=e561]: Elasticity
                      - generic [ref=e562]: 8h ago
                    - paragraph [ref=e563]: "Nintendo Switch bundle elasticity refit: -0.78 (was -0.92)"
                    - paragraph [ref=e564]: Headroom +5% on holiday bundles
                  - generic [ref=e567]:
                    - generic [ref=e568]:
                      - generic [ref=e569]: Promo
                      - generic [ref=e570]: 12h ago
                    - paragraph [ref=e571]: Free-Shipping >$50 mechanic approved for Web
                    - paragraph [ref=e572]: Live Wed; budget $180K · projected ROI 3.1x
          - generic [ref=e573]:
            - generic [ref=e574]:
              - generic [ref=e575]:
                - heading "Margin & Channel Analysis" [level=3] [ref=e576]
                - paragraph [ref=e577]: Waterfall breakdown · channel revenue lift
              - button "Deep Dive" [ref=e578] [cursor=pointer]:
                - img [ref=e579]
                - text: Deep Dive
            - generic [ref=e581]:
              - generic [ref=e582]:
                - generic [ref=e583]:
                  - generic [ref=e584]:
                    - heading "Margin Waterfall" [level=3] [ref=e585]
                    - paragraph [ref=e586]: How theoretical margin becomes realized
                  - generic [ref=e587]:
                    - button "AI insight" [ref=e589] [cursor=pointer]:
                      - img [ref=e590]
                    - button "Export as CSV" [ref=e593] [cursor=pointer]:
                      - img [ref=e594]
                    - button "Expand chart" [ref=e597] [cursor=pointer]:
                      - img [ref=e598]
                - application [ref=e606]:
                  - generic [ref=e650]:
                    - generic [ref=e651]:
                      - generic [ref=e653]: Theoretical max
                      - generic [ref=e655]: Free-rider waste
                      - generic [ref=e657]: Cost passthroughgap
                      - generic [ref=e659]: Premature markdown
                      - generic [ref=e661]: Elasticity gap
                      - generic [ref=e663]: Return-margin loss
                      - generic [ref=e665]: Realized
                    - generic [ref=e666]:
                      - generic [ref=e668]: $0
                      - generic [ref=e670]: $450,000
                      - generic [ref=e672]: $900,000
                      - generic [ref=e674]: $1.4M
                      - generic [ref=e676]: $1.7M
              - generic [ref=e677]:
                - generic [ref=e678]:
                  - generic [ref=e679]:
                    - heading "Channel Performance" [level=3] [ref=e680]
                    - paragraph [ref=e681]: Revenue vs lift by channel
                  - generic [ref=e682]:
                    - button "AI insight" [ref=e684] [cursor=pointer]:
                      - img [ref=e685]
                    - button "Export as CSV" [ref=e688] [cursor=pointer]:
                      - img [ref=e689]
                    - button "Expand chart" [ref=e692] [cursor=pointer]:
                      - img [ref=e693]
                - generic [ref=e699]:
                  - generic [ref=e701]:
                    - generic [ref=e702]: In-Store
                    - generic [ref=e703]:
                      - generic [ref=e704]: $1.2M
                      - generic [ref=e705]: +4.2% lift
                  - generic [ref=e710]:
                    - generic [ref=e711]: Online
                    - generic [ref=e712]:
                      - generic [ref=e713]: $890,000
                      - generic [ref=e714]: +18.4% lift
                  - generic [ref=e719]:
                    - generic [ref=e720]: App
                    - generic [ref=e721]:
                      - generic [ref=e722]: $340,000
                      - generic [ref=e723]: +28.1% lift
                  - generic [ref=e728]:
                    - generic [ref=e729]: Curbside
                    - generic [ref=e730]:
                      - generic [ref=e731]: $180,000
                      - generic [ref=e732]: +6.2% lift
                  - generic [ref=e737]:
                    - generic [ref=e738]: Marketplace
                    - generic [ref=e739]:
                      - generic [ref=e740]: $95,000
                      - generic [ref=e741]: "-2.1% lift"
    - complementary [ref=e745]:
      - generic [ref=e746]:
        - generic [ref=e747]:
          - img [ref=e748]
          - generic [ref=e751]: AI Assistant
          - generic [ref=e752]: CX360
        - button [ref=e753] [cursor=pointer]:
          - img [ref=e754]
      - generic [ref=e758]:
        - img [ref=e760]
        - generic [ref=e765]:
          - text: Hi! I'm your AI
          - strong [ref=e766]: agent
          - text: for customer analytics. I can not only answer questions, but also
          - strong [ref=e767]: take actions
          - text: "on your dashboard: - Query data and create charts - Pin charts to your dashboard - Create customer segments - Set up monitoring alerts - Generate action recommendations Try asking me to \"show churn by segment and pin it\" or \"create a segment of high-value churning customers\"!"
      - generic [ref=e768]:
        - paragraph [ref=e769]: "Try asking:"
        - generic [ref=e770]:
          - button "Show churn by segment" [ref=e771] [cursor=pointer]
          - button "Create a segment of high-value churners" [ref=e772] [cursor=pointer]
          - button "Alert me if Premium churn > 25%" [ref=e773] [cursor=pointer]
      - generic [ref=e775]:
        - textbox "Ask about your customer data..." [ref=e776]
        - button [disabled] [ref=e777]:
          - img [ref=e778]
    - region "Notifications alt+T"
  - alert [ref=e781]
  - generic [ref=e782]: $0
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
      |             ^ Error: [/price-intel][us_retail] Found INR value "₹9" — expected $
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