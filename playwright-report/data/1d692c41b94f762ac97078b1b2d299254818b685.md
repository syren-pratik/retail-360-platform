# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-tenant-verification.spec.ts >> Tenant: US Retail >> [US Retail] /price-intel?tab=markdown — no mismatch
- Location: tests/e2e-tenant-verification.spec.ts:128:11

# Error details

```
Error: [/price-intel?tab=markdown][us_retail] Found INR value "₹9" — expected $
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
                - heading "Sell-Through Heatmap" [level=3] [ref=e245]
                - paragraph [ref=e246]: 8-week view by category
              - button "Deep Dive" [ref=e247] [cursor=pointer]:
                - img [ref=e248]
                - text: Deep Dive
            - generic [ref=e250]:
              - generic [ref=e251]:
                - generic [ref=e252]:
                  - heading "Sell-Through Heatmap" [level=3] [ref=e253]
                  - paragraph [ref=e254]: Color = vs target · darker = worse
                - generic [ref=e255]:
                  - button "AI insight" [ref=e257] [cursor=pointer]:
                    - img [ref=e258]
                  - button "Export as CSV" [ref=e261] [cursor=pointer]:
                    - img [ref=e262]
                  - button "Expand chart" [ref=e265] [cursor=pointer]:
                    - img [ref=e266]
              - table [ref=e273]:
                - rowgroup [ref=e274]:
                  - row "Category Dept W1 W2 W3 W4 W5 W6 W7 W8 Target" [ref=e275]:
                    - columnheader "Category" [ref=e276]
                    - columnheader "Dept" [ref=e277]
                    - columnheader "W1" [ref=e278]
                    - columnheader "W2" [ref=e279]
                    - columnheader "W3" [ref=e280]
                    - columnheader "W4" [ref=e281]
                    - columnheader "W5" [ref=e282]
                    - columnheader "W6" [ref=e283]
                    - columnheader "W7" [ref=e284]
                    - columnheader "W8" [ref=e285]
                    - columnheader "Target" [ref=e286]
                - rowgroup [ref=e287]:
                  - row "TVs & Displays Electronics 9% 14% 26% 33% 39% 50% 52% 62% 68%" [ref=e288]:
                    - cell "TVs & Displays" [ref=e289]
                    - cell "Electronics" [ref=e290]
                    - cell "9%" [ref=e291]:
                      - 'generic "9.1% (target: 68%)" [ref=e292]': 9%
                    - cell "14%" [ref=e293]:
                      - 'generic "14.1% (target: 68%)" [ref=e294]': 14%
                    - cell "26%" [ref=e295]:
                      - 'generic "25.6% (target: 68%)" [ref=e296]': 26%
                    - cell "33%" [ref=e297]:
                      - 'generic "32.6% (target: 68%)" [ref=e298]': 33%
                    - cell "39%" [ref=e299]:
                      - 'generic "38.6% (target: 68%)" [ref=e300]': 39%
                    - cell "50%" [ref=e301]:
                      - 'generic "49.7% (target: 68%)" [ref=e302]': 50%
                    - cell "52%" [ref=e303]:
                      - 'generic "52.0% (target: 68%)" [ref=e304]': 52%
                    - cell "62%" [ref=e305]:
                      - 'generic "61.9% (target: 68%)" [ref=e306]': 62%
                    - cell "68%" [ref=e307]
                  - row "Phones & Tablets Electronics 6% 19% 24% 28% 39% 48% 54% 62% 68%" [ref=e308]:
                    - cell "Phones & Tablets" [ref=e309]
                    - cell "Electronics" [ref=e310]
                    - cell "6%" [ref=e311]:
                      - 'generic "6.4% (target: 68%)" [ref=e312]': 6%
                    - cell "19%" [ref=e313]:
                      - 'generic "18.5% (target: 68%)" [ref=e314]': 19%
                    - cell "24%" [ref=e315]:
                      - 'generic "24.2% (target: 68%)" [ref=e316]': 24%
                    - cell "28%" [ref=e317]:
                      - 'generic "28.4% (target: 68%)" [ref=e318]': 28%
                    - cell "39%" [ref=e319]:
                      - 'generic "39.0% (target: 68%)" [ref=e320]': 39%
                    - cell "48%" [ref=e321]:
                      - 'generic "48.4% (target: 68%)" [ref=e322]': 48%
                    - cell "54%" [ref=e323]:
                      - 'generic "53.9% (target: 68%)" [ref=e324]': 54%
                    - cell "62%" [ref=e325]:
                      - 'generic "62.2% (target: 68%)" [ref=e326]': 62%
                    - cell "68%" [ref=e327]
                  - row "Audio Electronics 7% 15% 21% 32% 40% 50% 52% 62% 68%" [ref=e328]:
                    - cell "Audio" [ref=e329]
                    - cell "Electronics" [ref=e330]
                    - cell "7%" [ref=e331]:
                      - 'generic "6.7% (target: 68%)" [ref=e332]': 7%
                    - cell "15%" [ref=e333]:
                      - 'generic "15.3% (target: 68%)" [ref=e334]': 15%
                    - cell "21%" [ref=e335]:
                      - 'generic "21.0% (target: 68%)" [ref=e336]': 21%
                    - cell "32%" [ref=e337]:
                      - 'generic "32.1% (target: 68%)" [ref=e338]': 32%
                    - cell "40%" [ref=e339]:
                      - 'generic "39.6% (target: 68%)" [ref=e340]': 40%
                    - cell "50%" [ref=e341]:
                      - 'generic "49.6% (target: 68%)" [ref=e342]': 50%
                    - cell "52%" [ref=e343]:
                      - 'generic "52.0% (target: 68%)" [ref=e344]': 52%
                    - cell "62%" [ref=e345]:
                      - 'generic "62.4% (target: 68%)" [ref=e346]': 62%
                    - cell "68%" [ref=e347]
                  - row "Men's Clothing Apparel & Shoes 10% 19% 23% 36% 39% 48% 59% 64% 68%" [ref=e348]:
                    - cell "Men's Clothing" [ref=e349]
                    - cell "Apparel & Shoes" [ref=e350]
                    - cell "10%" [ref=e351]:
                      - 'generic "10.1% (target: 68%)" [ref=e352]': 10%
                    - cell "19%" [ref=e353]:
                      - 'generic "18.6% (target: 68%)" [ref=e354]': 19%
                    - cell "23%" [ref=e355]:
                      - 'generic "22.8% (target: 68%)" [ref=e356]': 23%
                    - cell "36%" [ref=e357]:
                      - 'generic "36.0% (target: 68%)" [ref=e358]': 36%
                    - cell "39%" [ref=e359]:
                      - 'generic "38.8% (target: 68%)" [ref=e360]': 39%
                    - cell "48%" [ref=e361]:
                      - 'generic "47.6% (target: 68%)" [ref=e362]': 48%
                    - cell "59%" [ref=e363]:
                      - 'generic "59.4% (target: 68%)" [ref=e364]': 59%
                    - cell "64%" [ref=e365]:
                      - 'generic "64.4% (target: 68%)" [ref=e366]': 64%
                    - cell "68%" [ref=e367]
                  - row "Women's Clothing Apparel & Shoes 9% 16% 26% 31% 40% 52% 56% 64% 68%" [ref=e368]:
                    - cell "Women's Clothing" [ref=e369]
                    - cell "Apparel & Shoes" [ref=e370]
                    - cell "9%" [ref=e371]:
                      - 'generic "9.0% (target: 68%)" [ref=e372]': 9%
                    - cell "16%" [ref=e373]:
                      - 'generic "16.1% (target: 68%)" [ref=e374]': 16%
                    - cell "26%" [ref=e375]:
                      - 'generic "25.5% (target: 68%)" [ref=e376]': 26%
                    - cell "31%" [ref=e377]:
                      - 'generic "31.4% (target: 68%)" [ref=e378]': 31%
                    - cell "40%" [ref=e379]:
                      - 'generic "40.3% (target: 68%)" [ref=e380]': 40%
                    - cell "52%" [ref=e381]:
                      - 'generic "52.1% (target: 68%)" [ref=e382]': 52%
                    - cell "56%" [ref=e383]:
                      - 'generic "56.4% (target: 68%)" [ref=e384]': 56%
                    - cell "64%" [ref=e385]:
                      - 'generic "63.9% (target: 68%)" [ref=e386]': 64%
                    - cell "68%" [ref=e387]
                  - row "Footwear Apparel & Shoes 8% 17% 26% 36% 40% 47% 55% 64% 68%" [ref=e388]:
                    - cell "Footwear" [ref=e389]
                    - cell "Apparel & Shoes" [ref=e390]
                    - cell "8%" [ref=e391]:
                      - 'generic "7.7% (target: 68%)" [ref=e392]': 8%
                    - cell "17%" [ref=e393]:
                      - 'generic "16.6% (target: 68%)" [ref=e394]': 17%
                    - cell "26%" [ref=e395]:
                      - 'generic "26.0% (target: 68%)" [ref=e396]': 26%
                    - cell "36%" [ref=e397]:
                      - 'generic "35.6% (target: 68%)" [ref=e398]': 36%
                    - cell "40%" [ref=e399]:
                      - 'generic "40.3% (target: 68%)" [ref=e400]': 40%
                    - cell "47%" [ref=e401]:
                      - 'generic "46.9% (target: 68%)" [ref=e402]': 47%
                    - cell "55%" [ref=e403]:
                      - 'generic "55.2% (target: 68%)" [ref=e404]': 55%
                    - cell "64%" [ref=e405]:
                      - 'generic "63.8% (target: 68%)" [ref=e406]': 64%
                    - cell "68%" [ref=e407]
                  - row "Kitchen & Dining Home & Garden 10% 18% 24% 29% 42% 46% 56% 66% 68%" [ref=e408]:
                    - cell "Kitchen & Dining" [ref=e409]
                    - cell "Home & Garden" [ref=e410]
                    - cell "10%" [ref=e411]:
                      - 'generic "10.1% (target: 68%)" [ref=e412]': 10%
                    - cell "18%" [ref=e413]:
                      - 'generic "18.3% (target: 68%)" [ref=e414]': 18%
                    - cell "24%" [ref=e415]:
                      - 'generic "24.1% (target: 68%)" [ref=e416]': 24%
                    - cell "29%" [ref=e417]:
                      - 'generic "29.2% (target: 68%)" [ref=e418]': 29%
                    - cell "42%" [ref=e419]:
                      - 'generic "41.5% (target: 68%)" [ref=e420]': 42%
                    - cell "46%" [ref=e421]:
                      - 'generic "45.8% (target: 68%)" [ref=e422]': 46%
                    - cell "56%" [ref=e423]:
                      - 'generic "55.9% (target: 68%)" [ref=e424]': 56%
                    - cell "66%" [ref=e425]:
                      - 'generic "65.6% (target: 68%)" [ref=e426]': 66%
                    - cell "68%" [ref=e427]
                  - row "Outdoor & Garden Home & Garden 6% 14% 24% 34% 41% 45% 56% 63% 68%" [ref=e428]:
                    - cell "Outdoor & Garden" [ref=e429]
                    - cell "Home & Garden" [ref=e430]
                    - cell "6%" [ref=e431]:
                      - 'generic "5.5% (target: 68%)" [ref=e432]': 6%
                    - cell "14%" [ref=e433]:
                      - 'generic "14.3% (target: 68%)" [ref=e434]': 14%
                    - cell "24%" [ref=e435]:
                      - 'generic "24.4% (target: 68%)" [ref=e436]': 24%
                    - cell "34%" [ref=e437]:
                      - 'generic "34.3% (target: 68%)" [ref=e438]': 34%
                    - cell "41%" [ref=e439]:
                      - 'generic "40.6% (target: 68%)" [ref=e440]': 41%
                    - cell "45%" [ref=e441]:
                      - 'generic "45.1% (target: 68%)" [ref=e442]': 45%
                    - cell "56%" [ref=e443]:
                      - 'generic "55.6% (target: 68%)" [ref=e444]': 56%
                    - cell "63%" [ref=e445]:
                      - 'generic "63.4% (target: 68%)" [ref=e446]': 63%
                    - cell "68%" [ref=e447]
                  - row "Fitness Equipment Sports & Outdoor 5% 17% 26% 32% 43% 46% 54% 62% 68%" [ref=e448]:
                    - cell "Fitness Equipment" [ref=e449]
                    - cell "Sports & Outdoor" [ref=e450]
                    - cell "5%" [ref=e451]:
                      - 'generic "5.4% (target: 68%)" [ref=e452]': 5%
                    - cell "17%" [ref=e453]:
                      - 'generic "17.0% (target: 68%)" [ref=e454]': 17%
                    - cell "26%" [ref=e455]:
                      - 'generic "26.4% (target: 68%)" [ref=e456]': 26%
                    - cell "32%" [ref=e457]:
                      - 'generic "31.9% (target: 68%)" [ref=e458]': 32%
                    - cell "43%" [ref=e459]:
                      - 'generic "42.6% (target: 68%)" [ref=e460]': 43%
                    - cell "46%" [ref=e461]:
                      - 'generic "46.4% (target: 68%)" [ref=e462]': 46%
                    - cell "54%" [ref=e463]:
                      - 'generic "54.0% (target: 68%)" [ref=e464]': 54%
                    - cell "62%" [ref=e465]:
                      - 'generic "62.2% (target: 68%)" [ref=e466]': 62%
                    - cell "68%" [ref=e467]
                  - row "Outdoor Recreation Sports & Outdoor 9% 18% 22% 33% 41% 47% 54% 67% 68%" [ref=e468]:
                    - cell "Outdoor Recreation" [ref=e469]
                    - cell "Sports & Outdoor" [ref=e470]
                    - cell "9%" [ref=e471]:
                      - 'generic "9.3% (target: 68%)" [ref=e472]': 9%
                    - cell "18%" [ref=e473]:
                      - 'generic "17.7% (target: 68%)" [ref=e474]': 18%
                    - cell "22%" [ref=e475]:
                      - 'generic "22.1% (target: 68%)" [ref=e476]': 22%
                    - cell "33%" [ref=e477]:
                      - 'generic "32.5% (target: 68%)" [ref=e478]': 33%
                    - cell "41%" [ref=e479]:
                      - 'generic "40.9% (target: 68%)" [ref=e480]': 41%
                    - cell "47%" [ref=e481]:
                      - 'generic "46.7% (target: 68%)" [ref=e482]': 47%
                    - cell "54%" [ref=e483]:
                      - 'generic "54.3% (target: 68%)" [ref=e484]': 54%
                    - cell "67%" [ref=e485]:
                      - 'generic "66.6% (target: 68%)" [ref=e486]': 67%
                    - cell "68%" [ref=e487]
                  - row "Skincare Beauty & Personal 11% 17% 25% 31% 38% 48% 52% 62% 68%" [ref=e488]:
                    - cell "Skincare" [ref=e489]
                    - cell "Beauty & Personal" [ref=e490]
                    - cell "11%" [ref=e491]:
                      - 'generic "10.5% (target: 68%)" [ref=e492]': 11%
                    - cell "17%" [ref=e493]:
                      - 'generic "17.2% (target: 68%)" [ref=e494]': 17%
                    - cell "25%" [ref=e495]:
                      - 'generic "25.0% (target: 68%)" [ref=e496]': 25%
                    - cell "31%" [ref=e497]:
                      - 'generic "31.0% (target: 68%)" [ref=e498]': 31%
                    - cell "38%" [ref=e499]:
                      - 'generic "38.2% (target: 68%)" [ref=e500]': 38%
                    - cell "48%" [ref=e501]:
                      - 'generic "47.5% (target: 68%)" [ref=e502]': 48%
                    - cell "52%" [ref=e503]:
                      - 'generic "51.9% (target: 68%)" [ref=e504]': 52%
                    - cell "62%" [ref=e505]:
                      - 'generic "61.9% (target: 68%)" [ref=e506]': 62%
                    - cell "68%" [ref=e507]
                  - row "Haircare Beauty & Personal 9% 15% 25% 28% 41% 47% 56% 65% 68%" [ref=e508]:
                    - cell "Haircare" [ref=e509]
                    - cell "Beauty & Personal" [ref=e510]
                    - cell "9%" [ref=e511]:
                      - 'generic "8.6% (target: 68%)" [ref=e512]': 9%
                    - cell "15%" [ref=e513]:
                      - 'generic "15.1% (target: 68%)" [ref=e514]': 15%
                    - cell "25%" [ref=e515]:
                      - 'generic "24.9% (target: 68%)" [ref=e516]': 25%
                    - cell "28%" [ref=e517]:
                      - 'generic "28.2% (target: 68%)" [ref=e518]': 28%
                    - cell "41%" [ref=e519]:
                      - 'generic "40.5% (target: 68%)" [ref=e520]': 41%
                    - cell "47%" [ref=e521]:
                      - 'generic "46.7% (target: 68%)" [ref=e522]': 47%
                    - cell "56%" [ref=e523]:
                      - 'generic "55.6% (target: 68%)" [ref=e524]': 56%
                    - cell "65%" [ref=e525]:
                      - 'generic "64.5% (target: 68%)" [ref=e526]': 65%
                    - cell "68%" [ref=e527]
                  - row "Fragrance Beauty & Personal 8% 18% 21% 34% 38% 45% 56% 60% 68%" [ref=e528]:
                    - cell "Fragrance" [ref=e529]
                    - cell "Beauty & Personal" [ref=e530]
                    - cell "8%" [ref=e531]:
                      - 'generic "7.7% (target: 68%)" [ref=e532]': 8%
                    - cell "18%" [ref=e533]:
                      - 'generic "17.9% (target: 68%)" [ref=e534]': 18%
                    - cell "21%" [ref=e535]:
                      - 'generic "20.9% (target: 68%)" [ref=e536]': 21%
                    - cell "34%" [ref=e537]:
                      - 'generic "33.7% (target: 68%)" [ref=e538]': 34%
                    - cell "38%" [ref=e539]:
                      - 'generic "37.8% (target: 68%)" [ref=e540]': 38%
                    - cell "45%" [ref=e541]:
                      - 'generic "45.2% (target: 68%)" [ref=e542]': 45%
                    - cell "56%" [ref=e543]:
                      - 'generic "56.0% (target: 68%)" [ref=e544]': 56%
                    - cell "60%" [ref=e545]:
                      - 'generic "60.3% (target: 68%)" [ref=e546]': 60%
                    - cell "68%" [ref=e547]
                  - row "Packaged Foods & Beverages Grocery & Snacks 7% 17% 24% 33% 41% 48% 55% 61% 68%" [ref=e548]:
                    - cell "Packaged Foods & Beverages" [ref=e549]
                    - cell "Grocery & Snacks" [ref=e550]
                    - cell "7%" [ref=e551]:
                      - 'generic "6.9% (target: 68%)" [ref=e552]': 7%
                    - cell "17%" [ref=e553]:
                      - 'generic "16.7% (target: 68%)" [ref=e554]': 17%
                    - cell "24%" [ref=e555]:
                      - 'generic "24.3% (target: 68%)" [ref=e556]': 24%
                    - cell "33%" [ref=e557]:
                      - 'generic "32.6% (target: 68%)" [ref=e558]': 33%
                    - cell "41%" [ref=e559]:
                      - 'generic "41.4% (target: 68%)" [ref=e560]': 41%
                    - cell "48%" [ref=e561]:
                      - 'generic "48.2% (target: 68%)" [ref=e562]': 48%
                    - cell "55%" [ref=e563]:
                      - 'generic "54.8% (target: 68%)" [ref=e564]': 55%
                    - cell "61%" [ref=e565]:
                      - 'generic "60.9% (target: 68%)" [ref=e566]': 61%
                    - cell "68%" [ref=e567]
          - generic [ref=e568]:
            - generic [ref=e569]:
              - generic [ref=e570]:
                - heading "Markdown Queue" [level=3] [ref=e571]
                - paragraph [ref=e572]: Pending decisions sorted by urgency
              - button "Deep Dive" [ref=e573] [cursor=pointer]:
                - img [ref=e574]
                - text: Deep Dive
            - generic [ref=e576]:
              - generic [ref=e577]:
                - generic [ref=e578]:
                  - heading "Markdown Queue" [level=3] [ref=e579]
                  - paragraph [ref=e580]: 8 pending decisions
                - generic [ref=e581]:
                  - button "Pending" [ref=e582] [cursor=pointer]
                  - button "Approved" [ref=e583] [cursor=pointer]
                  - button "All" [ref=e584] [cursor=pointer]
              - table [ref=e586]:
                - rowgroup [ref=e587]:
                  - row "Product ST% Days left Rec. depth Revenue at risk Urgency" [ref=e588]:
                    - columnheader "Product" [ref=e589]
                    - columnheader "ST%" [ref=e590]
                    - columnheader "Days left" [ref=e591]
                    - columnheader "Rec. depth" [ref=e592]
                    - columnheader "Revenue at risk" [ref=e593]
                    - columnheader "Urgency" [ref=e594]
                - rowgroup [ref=e595]:
                  - row "Bowflex Team Sports Everyday — Seasonal Sports & Outdoor · 13W+ 75.5% / 68.0% 0d −-40% $37,558 Critical" [ref=e596] [cursor=pointer]:
                    - cell "Bowflex Team Sports Everyday — Seasonal Sports & Outdoor · 13W+" [ref=e597]:
                      - paragraph [ref=e598]: Bowflex Team Sports Everyday — Seasonal
                      - paragraph [ref=e599]: Sports & Outdoor · 13W+
                    - cell "75.5% / 68.0%" [ref=e600]:
                      - generic [ref=e601]:
                        - generic [ref=e602]: 75.5%
                        - generic [ref=e603]: / 68.0%
                    - cell "0d" [ref=e604]
                    - cell "−-40%" [ref=e605]
                    - cell "$37,558" [ref=e606]
                    - cell "Critical" [ref=e607]
                  - row "Meridian Women's Clothing Classic — Summer clearance Apparel & Shoes · 13W+ 66.6% / 68.0% 0d −-60% $8,042 Critical" [ref=e608] [cursor=pointer]:
                    - cell "Meridian Women's Clothing Classic — Summer clearance Apparel & Shoes · 13W+" [ref=e609]:
                      - paragraph [ref=e610]: Meridian Women's Clothing Classic — Summer clearance
                      - paragraph [ref=e611]: Apparel & Shoes · 13W+
                    - cell "66.6% / 68.0%" [ref=e612]:
                      - generic [ref=e613]:
                        - generic [ref=e614]: 66.6%
                        - generic [ref=e615]: / 68.0%
                    - cell "0d" [ref=e616]
                    - cell "−-60%" [ref=e617]
                    - cell "$8,042" [ref=e618]
                    - cell "Critical" [ref=e619]
                  - row "Hasbro Action Figures Classic — Halloween Toys & Games · 13W+ 76.6% / 68.0% 0d −-60% $18,399 Critical" [ref=e620] [cursor=pointer]:
                    - cell "Hasbro Action Figures Classic — Halloween Toys & Games · 13W+" [ref=e621]:
                      - paragraph [ref=e622]: Hasbro Action Figures Classic — Halloween
                      - paragraph [ref=e623]: Toys & Games · 13W+
                    - cell "76.6% / 68.0%" [ref=e624]:
                      - generic [ref=e625]:
                        - generic [ref=e626]: 76.6%
                        - generic [ref=e627]: / 68.0%
                    - cell "0d" [ref=e628]
                    - cell "−-60%" [ref=e629]
                    - cell "$18,399" [ref=e630]
                    - cell "Critical" [ref=e631]
                  - row "Bose Laptops & Computers Classic — Last-year TV Electronics · 13W+ 72.5% / 60.0% 0d −-60% $29,655 Critical" [ref=e632] [cursor=pointer]:
                    - cell "Bose Laptops & Computers Classic — Last-year TV Electronics · 13W+" [ref=e633]:
                      - paragraph [ref=e634]: Bose Laptops & Computers Classic — Last-year TV
                      - paragraph [ref=e635]: Electronics · 13W+
                    - cell "72.5% / 60.0%" [ref=e636]:
                      - generic [ref=e637]:
                        - generic [ref=e638]: 72.5%
                        - generic [ref=e639]: / 60.0%
                    - cell "0d" [ref=e640]
                    - cell "−-60%" [ref=e641]
                    - cell "$29,655" [ref=e642]
                    - cell "Critical" [ref=e643]
                  - row "Old Navy Accessories Modern — Summer clearance Apparel & Shoes · 13W+ 97.5% / 68.0% 0d −-80% $18,401 Critical" [ref=e644] [cursor=pointer]:
                    - cell "Old Navy Accessories Modern — Summer clearance Apparel & Shoes · 13W+" [ref=e645]:
                      - paragraph [ref=e646]: Old Navy Accessories Modern — Summer clearance
                      - paragraph [ref=e647]: Apparel & Shoes · 13W+
                    - cell "97.5% / 68.0%" [ref=e648]:
                      - generic [ref=e649]:
                        - generic [ref=e650]: 97.5%
                        - generic [ref=e651]: / 68.0%
                    - cell "0d" [ref=e652]
                    - cell "−-80%" [ref=e653]
                    - cell "$18,401" [ref=e654]
                    - cell "Critical" [ref=e655]
                  - row "Meridian Bedding Classic — Outdoor clearance Home & Garden · 13W+ 90.9% / 68.0% 16d −-80% $18,196 Critical" [ref=e656] [cursor=pointer]:
                    - cell "Meridian Bedding Classic — Outdoor clearance Home & Garden · 13W+" [ref=e657]:
                      - paragraph [ref=e658]: Meridian Bedding Classic — Outdoor clearance
                      - paragraph [ref=e659]: Home & Garden · 13W+
                    - cell "90.9% / 68.0%" [ref=e660]:
                      - generic [ref=e661]:
                        - generic [ref=e662]: 90.9%
                        - generic [ref=e663]: / 68.0%
                    - cell "16d" [ref=e664]
                    - cell "−-80%" [ref=e665]
                    - cell "$18,196" [ref=e666]
                    - cell "Critical" [ref=e667]
                  - row "Meridian Audio Value — Last-year TV Electronics · 13W+ 73.0% / 60.0% 0d −-40% $14,775 Critical" [ref=e668] [cursor=pointer]:
                    - cell "Meridian Audio Value — Last-year TV Electronics · 13W+" [ref=e669]:
                      - paragraph [ref=e670]: Meridian Audio Value — Last-year TV
                      - paragraph [ref=e671]: Electronics · 13W+
                    - cell "73.0% / 60.0%" [ref=e672]:
                      - generic [ref=e673]:
                        - generic [ref=e674]: 73.0%
                        - generic [ref=e675]: / 60.0%
                    - cell "0d" [ref=e676]
                    - cell "−-40%" [ref=e677]
                    - cell "$14,775" [ref=e678]
                    - cell "Critical" [ref=e679]
                  - row "Hasbro Outdoor Play Premium — Halloween Toys & Games · 13W+ 83.3% / 68.0% 11d −-60% $13,509 Critical" [ref=e680] [cursor=pointer]:
                    - cell "Hasbro Outdoor Play Premium — Halloween Toys & Games · 13W+" [ref=e681]:
                      - paragraph [ref=e682]: Hasbro Outdoor Play Premium — Halloween
                      - paragraph [ref=e683]: Toys & Games · 13W+
                    - cell "83.3% / 68.0%" [ref=e684]:
                      - generic [ref=e685]:
                        - generic [ref=e686]: 83.3%
                        - generic [ref=e687]: / 68.0%
                    - cell "11d" [ref=e688]
                    - cell "−-60%" [ref=e689]
                    - cell "$13,509" [ref=e690]
                    - cell "Critical" [ref=e691]
          - generic [ref=e692]:
            - generic [ref=e693]:
              - generic [ref=e694]:
                - generic [ref=e695]:
                  - heading "Markdown Cadence" [level=3] [ref=e696]
                  - paragraph [ref=e697]: SKUs by decision window remaining
                - generic [ref=e698]:
                  - button "AI insight" [ref=e700] [cursor=pointer]:
                    - img [ref=e701]
                  - button "Export as CSV" [ref=e704] [cursor=pointer]:
                    - img [ref=e705]
                  - button "Expand chart" [ref=e708] [cursor=pointer]:
                    - img [ref=e709]
              - application [ref=e717]:
                - generic [ref=e731]:
                  - generic [ref=e732]:
                    - generic [ref=e734]: 0–7d
                    - generic [ref=e736]: 8–14d
                    - generic [ref=e738]: 15–21d
                    - generic [ref=e740]: 22–30d
                    - generic [ref=e742]: 30d+
                  - generic [ref=e743]:
                    - generic [ref=e745]: "0"
                    - generic [ref=e747]: "2"
                    - generic [ref=e749]: "4"
                    - generic [ref=e751]: "6"
                    - generic [ref=e753]: "8"
            - generic [ref=e754]:
              - generic [ref=e755]:
                - generic [ref=e756]:
                  - heading "Sell-Through Trend" [level=3] [ref=e757]
                  - paragraph [ref=e758]: "Current: 74.2% · vs target: +6.2pp"
                - generic [ref=e759]:
                  - button "AI insight" [ref=e761] [cursor=pointer]:
                    - img [ref=e762]
                  - button "Export as CSV" [ref=e765] [cursor=pointer]:
                    - img [ref=e766]
                  - button "Expand chart" [ref=e769] [cursor=pointer]:
                    - img [ref=e770]
              - application [ref=e778]:
                - generic [ref=e786]:
                  - generic [ref=e787]:
                    - generic [ref=e789]: W4
                    - generic [ref=e791]: W8
                    - generic [ref=e793]: W12
                  - generic [ref=e794]:
                    - generic [ref=e796]: 0%
                    - generic [ref=e798]: 25%
                    - generic [ref=e800]: 50%
                    - generic [ref=e802]: 75%
                    - generic [ref=e804]: 100%
                  - generic [ref=e805]: Target
            - generic [ref=e806]:
              - generic [ref=e807]:
                - generic [ref=e808]:
                  - heading "Inventory Aging" [level=3] [ref=e809]
                  - paragraph [ref=e810]: 13W+ stock trending down · pre-Black Friday clearance running to plan
                - generic [ref=e811]:
                  - button "AI insight" [ref=e813] [cursor=pointer]:
                    - img [ref=e814]
                  - button "Export as CSV" [ref=e817] [cursor=pointer]:
                    - img [ref=e818]
                  - button "Expand chart" [ref=e821] [cursor=pointer]:
                    - img [ref=e822]
              - generic [ref=e828]:
                - generic [ref=e830]:
                  - generic [ref=e832]: 0–4 Weeks
                  - generic [ref=e833]:
                    - generic [ref=e834]: 7,212 units
                    - generic [ref=e835]: $710,748
                - generic [ref=e839]:
                  - generic [ref=e841]: 5–8 Weeks
                  - generic [ref=e842]:
                    - generic [ref=e843]: 9,752 units
                    - generic [ref=e844]: $1.1M
                - generic [ref=e848]:
                  - generic [ref=e850]: 9–12 Weeks
                  - generic [ref=e851]:
                    - generic [ref=e852]: 9,628 units
                    - generic [ref=e853]: $1.2M
                - generic [ref=e857]:
                  - generic [ref=e858]:
                    - generic [ref=e859]: 13W+
                    - generic [ref=e860]: flag
                  - generic [ref=e861]:
                    - generic [ref=e862]: 23,696 units
                    - generic [ref=e863]: $1.9M
                - generic [ref=e866]:
                  - generic [ref=e867]: Total inventory value
                  - generic [ref=e868]: $5.0M
    - complementary [ref=e869]:
      - generic [ref=e870]:
        - generic [ref=e871]:
          - img [ref=e872]
          - generic [ref=e875]: AI Assistant
          - generic [ref=e876]: CX360
        - button [ref=e877] [cursor=pointer]:
          - img [ref=e878]
      - generic [ref=e882]:
        - img [ref=e884]
        - generic [ref=e889]:
          - text: Hi! I'm your AI
          - strong [ref=e890]: agent
          - text: for customer analytics. I can not only answer questions, but also
          - strong [ref=e891]: take actions
          - text: "on your dashboard: - Query data and create charts - Pin charts to your dashboard - Create customer segments - Set up monitoring alerts - Generate action recommendations Try asking me to \"show churn by segment and pin it\" or \"create a segment of high-value churning customers\"!"
      - generic [ref=e892]:
        - paragraph [ref=e893]: "Try asking:"
        - generic [ref=e894]:
          - button "Show churn by segment" [ref=e895] [cursor=pointer]
          - button "Create a segment of high-value churners" [ref=e896] [cursor=pointer]
          - button "Alert me if Premium churn > 25%" [ref=e897] [cursor=pointer]
      - generic [ref=e899]:
        - textbox "Ask about your customer data..." [ref=e900]
        - button [disabled] [ref=e901]:
          - img [ref=e902]
    - region "Notifications alt+T"
  - alert [ref=e905]
  - generic [ref=e906]: 0%
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
      |             ^ Error: [/price-intel?tab=markdown][us_retail] Found INR value "₹9" — expected $
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