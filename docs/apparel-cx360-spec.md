# Apparel CX360 — Canonical Design Specification

**Version:** v1.0
**Last updated:** 2026-06-28
**Status:** DRAFT — awaiting sign-off
**Owners:** Product (user), Engineering (generator author), AI/Chat (system-prompt author)

**Purpose:** Lock the design of the US-apparel skin of the CX360 module so the data-generator and chart-swap work becomes mechanical execution against a frozen contract.

**Hard scope statement:** This spec covers the **CX360 module ONLY** (28 surfaces on `/cx360`, 9 surfaces on `/cx360/customer/[id]`, 10 expand modals, plus 3 net-new apparel-native charts). **Inventory, Supply, Merch Demand, Cold-Start, Store-Opening, and Price-Intel modules remain Indian grocery for now** and are out of scope for this spec. A future Phase 2 spec will cover those modules.

---

## Table of contents

1. Domain dictionary — apparel constants source of truth
2. Per-cache-file JSON specs (24 files)
3. Three NEW apparel-native chart specs
4. Color palette mapping (`palette-apparel.ts`)
5. Settings UI toggle spec + `TenantContext`
6. Chat agent skinning (system prompt + few-shot)
7. Customer detail page generator spec
8. Hardcoded label / formatter sweep (file-by-file table)
9. Migration runbook (commands)
10. Validation rules (schema + sanity linters)
11. Performance considerations
12. Future hooks (third-tenant readiness)

---

## 1. Domain dictionary — source of truth constants

All constants below live in `scripts/lib/apparel-constants.ts` (created by the generator author). The generator imports from this single file; charts that need enumerated values import from `src/app/lib/palette-apparel.ts` (palette) or read from `cache/apparel/dimensions.json` (filter UI). **No magic strings elsewhere.**

### 1.1 Departments (8) — SKU-count weights

| Department | SKU weight % | Notes |
|---|---|---|
| Women's Tops | 18 | largest single bucket |
| Women's Bottoms | 12 | |
| Women's Dresses | 8 | |
| Men's Tops | 16 | |
| Men's Bottoms | 12 | |
| Kids' | 9 | unisex Carter's / OshKosh dominate |
| Footwear | 13 | M+W shoes combined |
| Accessories | 12 | bags + small leather + sunglasses + watches |
| **Total** | **100** | |

### 1.2 Categories (32 leaves, mapped to parent department)

| Department | L2 categories |
|---|---|
| Women's Tops | Crew Tee, Tank, Blouse, Cardigan, Pullover, Hoodie |
| Women's Bottoms | Skinny Jean, Mom Jean, Wide-Leg Jean, Legging, Trouser |
| Women's Dresses | Mini Dress, Midi Dress, Maxi Dress, Wrap Dress |
| Men's Tops | Crew Tee, Polo, Henley, Button-Down, Flannel, Hoodie |
| Men's Bottoms | Slim Jean, Straight Jean, Chino, Cargo, Short |
| Kids' | Graphic Tee, Kids Jean, Kids Hoodie, Puffer Jacket |
| Footwear | Running Sneaker, Casual Sneaker, Boot, Sandal |
| Accessories | Tote Bag, Backpack, Belt, Sunglasses, Watch |

(32 leaves total; selection biased to most-recognized US apparel categories.)

### 1.3 Brands (25) with category-market-share splits

| brand_id | name | tier | parent_company | allowed_departments | share_pct in its dept |
|---|---|---|---|---|---|
| LEV | Levi's | Mid | Levi Strauss & Co. | M Bottoms, W Bottoms | 18 / 9 |
| WRG | Wrangler | Value | Kontoor Brands | M Bottoms | 6 |
| LEE | Lee | Value | Kontoor Brands | M Bottoms, W Bottoms | 4 / 3 |
| MAD | Madewell | Premium | J.Crew Group | W Bottoms, W Tops | 7 / 4 |
| NKE | Nike | Premium | Nike Inc. | M Tops, W Tops, Footwear, Kids' | 14 / 9 / 18 / 8 |
| ADI | Adidas | Premium | Adidas AG | M Tops, W Tops, Footwear | 7 / 5 / 11 |
| UAR | Under Armour | Mid | Under Armour Inc. | M Tops, W Tops | 5 / 3 |
| LUL | Lululemon | Premium | Lululemon Athletica | W Tops, W Bottoms, M Tops | 12 / 14 / 4 |
| NB | New Balance | Mid | New Balance Inc. | Footwear | 9 |
| HM | H&M | Value | H&M Group | W Tops, W Dresses, M Tops, Kids' | 11 / 14 / 6 / 9 |
| ZRA | Zara | Mid | Inditex | W Dresses, W Tops, M Tops | 18 / 9 / 5 |
| UNQ | Uniqlo | Value | Fast Retailing | M Tops, W Tops | 8 / 7 |
| FOR | Forever 21 | Value | Authentic Brands | W Tops, W Dresses | 6 / 8 |
| ON | Old Navy | Value | Gap Inc. | W Bottoms, M Bottoms, Kids' | 10 / 9 / 14 |
| GAP | Gap | Mid | Gap Inc. | M Bottoms, M Tops | 7 / 6 |
| BR | Banana Republic | Premium | Gap Inc. | M Bottoms, M Tops | 5 / 4 |
| JCR | J.Crew | Premium | J.Crew Group | M Tops, W Tops | 7 / 4 |
| CRT | Carter's | Value | Carter's Inc. | Kids' | 22 |
| OSH | OshKosh B'gosh | Value | Carter's Inc. | Kids' | 14 |
| VAN | Vans | Mid | VF Corp | Footwear | 10 |
| CNV | Converse | Mid | Nike Inc. | Footwear | 7 |
| DRM | Dr. Martens | Premium | Dr. Martens plc | Footwear | 5 |
| COA | Coach | Premium | Tapestry | Accessories | 18 |
| FOS | Fossil | Mid | Fossil Group | Accessories | 9 |
| RAY | Ray-Ban | Premium | EssilorLuxottica | Accessories | 14 |
| HER | Herschel | Mid | Herschel Supply | Accessories | 7 |

Shares within a department sum approximately to 100 across the brands that ship into it; remaining residual is "Other / private label".

### 1.4 Size vectors (full)

| Size set ID | Values |
|---|---|
| `TOPS_ADULT` | XS, S, M, L, XL, XXL |
| `JEANS_M` | 28×30, 30×30, 30×32, 32×30, 32×32, 32×34, 34×32, 34×34, 36×32, 38×32, 40×32 |
| `JEANS_W` | 24, 25, 26, 27, 28, 29, 30, 31, 32 |
| `DRESSES_W` | XS, S, M, L, XL |
| `KIDS` | 2T, 3T, 4T, 5, 6, 7, 8, 10, 12, 14 |
| `SHOES_M` | 7, 8, 8.5, 9, 9.5, 10, 10.5, 11, 12, 13 |
| `SHOES_W` | 5, 6, 7, 7.5, 8, 8.5, 9, 10, 11 |
| `OS` | OS |

Demand weight within a size vector follows a bell centered on the median (M for tops, 32×32 for men's jeans, size 28 for women's jeans, size 9 men's shoe, size 8 women's shoe).

### 1.5 Colors (12 standard) with style-fit probabilities

| Color | Hex | Tops fit | Bottoms fit | Outerwear fit | Footwear fit | Accessories fit |
|---|---|---|---|---|---|---|
| Black | #111111 | 0.22 | 0.20 | 0.28 | 0.34 | 0.32 |
| White | #FFFFFF | 0.18 | 0.04 | 0.05 | 0.18 | 0.06 |
| Navy | #1E3A8A | 0.12 | 0.18 | 0.20 | 0.06 | 0.08 |
| Heather Gray | #9CA3AF | 0.14 | 0.04 | 0.10 | 0.08 | 0.04 |
| Khaki | #C2B280 | 0.04 | 0.16 | 0.08 | 0.06 | 0.04 |
| Olive | #6B8E23 | 0.05 | 0.07 | 0.08 | 0.03 | 0.04 |
| Burgundy | #7C1F2E | 0.04 | 0.04 | 0.06 | 0.03 | 0.05 |
| Red | #DC2626 | 0.05 | 0.02 | 0.04 | 0.05 | 0.06 |
| Pink | #EC4899 | 0.04 | 0.04 | 0.02 | 0.04 | 0.07 |
| Blue (Indigo) | #1D4ED8 | 0.05 | 0.16 | 0.05 | 0.04 | 0.08 |
| Green | #16A34A | 0.04 | 0.02 | 0.02 | 0.04 | 0.06 |
| Yellow | #EAB308 | 0.03 | 0.03 | 0.02 | 0.05 | 0.10 |

Columns sum to ~1.0 (rounding); use as multinomial weights.

### 1.6 Customer segments (8) with population %s

| Segment | Pop % | Apparel-flavored definition |
|---|---|---|
| `Fashion Forward` | 9 | Buys trend brands (Zara, Madewell) within 30 days of new drops. |
| `Athletic Enthusiast` | 14 | >40% wallet in Nike/Lululemon/UA/Adidas activewear. |
| `Value Shopper` | 22 | >60% units purchased at markdown; H&M/Old Navy/Forever 21 heavy. |
| `Brand Loyalist` | 12 | Concentrates ≥50% spend in a single brand. |
| `Returner` | 7 | Return rate >35% over last 90 days. |
| `Lapsed` | 18 | No purchase in 180+ days. |
| `Casual` | 13 | 1–2 buys/year, no concentration. |
| `New` | 5 | First purchase in last 60 days. |
| **Total** | **100** | |

### 1.7 Loyalty tiers (3 + 2 outside-program states)

| Tier | Pop % | Threshold |
|---|---|---|
| Elite | 4 | $1,200+ trailing-12m spend |
| Reward | 18 | $400–$1,199 t-12m spend |
| Insider | 38 | enrolled, <$400 t-12m |
| Member | 22 | account exists, not enrolled |
| Guest | 18 | no account |

(Note: spec uses **Insider / Reward / Elite** as the program ladder per brief. Member/Guest are the non-program states surfaced in the customer table.)

### 1.8 Channels (5) with revenue mix %s

| Channel | Revenue mix % | Notes |
|---|---|---|
| In-Store | 42 | 275-door network |
| Web | 28 | desktop + mobile web |
| App | 18 | iOS + Android native |
| Curbside | 4 | BOPIS / curbside pickup |
| Marketplace | 8 | Amazon, Nordstrom Anniversary, Macy's drop |

### 1.9 RFM bands (apparel-tuned)

| Dimension | Bands |
|---|---|
| R (Recency) | Recent ≤ 45 days; Mid 46–120 days; Lapsed > 120 days |
| F (Frequency, per year) | Low = 1; Medium = 2–3; Frequent = 4+ |
| M (Monetary, t-12m USD) | Low < $150; Mid $150–$600; High > $600 |

### 1.10 Churn risk tiers with population %s

| Tier | Pop % | Definition (churn_prob_90d) |
|---|---|---|
| Critical | 11 | ≥ 0.70 |
| High | 16 | 0.45–0.69 |
| Medium | 28 | 0.20–0.44 |
| Low | 38 | 0.05–0.19 |
| Loyal | 7 | < 0.05 |

### 1.11 US holiday calendar (24 events)

All dates are 2026 instances. `uplift_multiplier` is over baseline weekly traffic, by impacted departments.

| Event | Window | Impacted depts | Uplift × |
|---|---|---|---|
| New Year's Day | Jan 1 | All | 0.6 |
| MLK Day Sale | Jan 16–19 | All | 1.4 |
| Valentine's Day | Feb 7–14 | Women's, Accessories | 1.7 |
| Presidents Day Sale | Feb 13–16 | All | 1.6 |
| Spring Break Drop | Mar 7–22 | Women's, Footwear | 1.8 |
| Easter | Apr 5 | Kids', Women's Dresses | 1.5 |
| Mother's Day | May 3–10 | Women's, Accessories | 2.0 |
| Memorial Day Sale | May 22–25 | All | 2.4 |
| Father's Day | Jun 14–21 | Men's | 1.7 |
| 4th of July | Jul 1–5 | All | 1.9 |
| Back-to-School (BTS) | Jul 25–Aug 25 | Kids', Footwear, M+W Bottoms | 2.8 |
| Tax-Free Weekends | Aug 7–9 | All | 1.9 |
| Labor Day Sale | Sep 4–7 | All | 2.1 |
| Fall Drop / NYFW | Sep 10–20 | All | 1.6 |
| Columbus Day / Indigenous Peoples' Day | Oct 9–12 | All | 1.4 |
| Halloween | Oct 20–31 | Kids', Accessories | 1.3 |
| Veterans Day Sale | Nov 7–11 | All | 1.5 |
| Pre-Black Friday | Nov 16–24 | All | 2.6 |
| Black Friday | Nov 27 | All | 4.2 |
| Cyber Monday | Nov 30 | Web, App | 3.6 |
| Free Shipping Day | Dec 14 | Web, App | 2.0 |
| Christmas Eve | Dec 24 | All | 1.9 |
| Christmas | Dec 25 | All | 0.3 |
| NYE Clearance | Dec 26–31 | All | 2.3 |

### 1.12 US stores (50) — names + cities

50-store apparel network (smaller than the full 275-door grocery network in `apparel-data-plan.md`; CX360 only references stores as `geography` + `store` strings in transactions, not as a full dim table). Names follow the convention `<Brand-format> <Mall/District> <City>`.

| store_id | name | city | state | metro |
|---|---|---|---|---|
| STR-A001 | Flagship SoHo NYC | New York | NY | NYC |
| STR-A002 | Standard 5th Ave NYC | New York | NY | NYC |
| STR-A003 | Outlet Woodbury Common | Central Valley | NY | NYC |
| STR-A004 | Standard Brooklyn Atlantic | Brooklyn | NY | NYC |
| STR-A005 | Flagship Newbury St Boston | Boston | MA | Boston |
| STR-A006 | Standard Prudential Boston | Boston | MA | Boston |
| STR-A007 | Outlet Wrentham Premium | Wrentham | MA | Boston |
| STR-A008 | Standard King of Prussia | King of Prussia | PA | Philadelphia |
| STR-A009 | Standard Walnut St Philly | Philadelphia | PA | Philadelphia |
| STR-A010 | Flagship Mag Mile Chicago | Chicago | IL | Chicago |
| STR-A011 | Standard Oakbrook Center | Oak Brook | IL | Chicago |
| STR-A012 | Outlet Aurora Premium | Aurora | IL | Chicago |
| STR-A013 | Standard Mall of America | Bloomington | MN | Minneapolis |
| STR-A014 | Standard Somerset Detroit | Troy | MI | Detroit |
| STR-A015 | Standard Easton Town Center | Columbus | OH | Columbus |
| STR-A016 | Flagship Lenox Square Atlanta | Atlanta | GA | Atlanta |
| STR-A017 | Outlet North Georgia Premium | Dawsonville | GA | Atlanta |
| STR-A018 | Standard SouthPark Charlotte | Charlotte | NC | Charlotte |
| STR-A019 | Standard Bal Harbour Shops Miami | Bal Harbour | FL | Miami |
| STR-A020 | Standard Aventura Mall | Aventura | FL | Miami |
| STR-A021 | Outlet Sawgrass Mills | Sunrise | FL | Miami |
| STR-A022 | Standard Mall at Millenia Orlando | Orlando | FL | Orlando |
| STR-A023 | Standard Galleria Houston | Houston | TX | Houston |
| STR-A024 | Standard Highland Village Houston | Houston | TX | Houston |
| STR-A025 | Flagship Galleria Dallas | Dallas | TX | Dallas |
| STR-A026 | Standard NorthPark Dallas | Dallas | TX | Dallas |
| STR-A027 | Outlet Allen Premium | Allen | TX | Dallas |
| STR-A028 | Flagship S Congress Austin | Austin | TX | Austin |
| STR-A029 | Standard Domain Austin | Austin | TX | Austin |
| STR-A030 | Standard La Cantera San Antonio | San Antonio | TX | San Antonio |
| STR-A031 | Flagship Beverly Center LA | Los Angeles | CA | Los Angeles |
| STR-A032 | Standard Grove LA | Los Angeles | CA | Los Angeles |
| STR-A033 | Standard South Coast Plaza | Costa Mesa | CA | Los Angeles |
| STR-A034 | Outlet Citadel LA | Commerce | CA | Los Angeles |
| STR-A035 | Flagship Union Sq SF | San Francisco | CA | San Francisco |
| STR-A036 | Standard Stanford Shopping | Palo Alto | CA | San Francisco |
| STR-A037 | Standard Fashion Valley San Diego | San Diego | CA | San Diego |
| STR-A038 | Standard Scottsdale Fashion Square | Scottsdale | AZ | Phoenix |
| STR-A039 | Outlet Phoenix Premium | Chandler | AZ | Phoenix |
| STR-A040 | Standard Forum Las Vegas | Las Vegas | NV | Las Vegas |
| STR-A041 | Standard Cherry Creek Denver | Denver | CO | Denver |
| STR-A042 | Standard Park Meadows Denver | Lone Tree | CO | Denver |
| STR-A043 | Flagship University Village Seattle | Seattle | WA | Seattle |
| STR-A044 | Standard Bellevue Square | Bellevue | WA | Seattle |
| STR-A045 | Standard Pioneer Place Portland | Portland | OR | Portland |
| STR-A046 | Standard Plaza Frontenac St Louis | St. Louis | MO | St. Louis |
| STR-A047 | Standard Country Club Plaza KC | Kansas City | MO | Kansas City |
| STR-A048 | Standard Crocker Park Cleveland | Westlake | OH | Cleveland |
| STR-A049 | Standard Indianapolis Fashion Mall | Indianapolis | IN | Indianapolis |
| STR-A050 | Standard Stamford Town Center | Stamford | CT | NYC |

`geography` field in `customer_table` uses `metro` (so filters collapse 4 NYC stores to one filter pill).

### 1.13 Return reasons (6) with category-specific probability splits

| Reason | Tops % | Bottoms / Jeans % | Dresses % | Footwear % | Accessories % |
|---|---|---|---|---|---|
| Fit (too small / too large) | 38 | 52 | 44 | 26 | 6 |
| Style (didn't suit / not as pictured) | 22 | 14 | 28 | 16 | 22 |
| Quality (fabric / stitching / finish) | 14 | 12 | 10 | 18 | 24 |
| Wrong Item Shipped | 8 | 6 | 4 | 12 | 14 |
| Damaged | 6 | 4 | 4 | 14 | 18 |
| Changed Mind | 12 | 12 | 10 | 14 | 16 |
| **Total** | **100** | **100** | **100** | **100** | **100** |

### 1.14 AOV ranges by category (USD)

| Category | min | typical | max |
|---|---|---|---|
| Crew Tee / Tank | 12 | 22 | 45 |
| Polo / Henley | 22 | 38 | 75 |
| Button-Down / Blouse | 35 | 58 | 110 |
| Hoodie / Pullover | 35 | 58 | 95 |
| Cardigan / Flannel | 40 | 65 | 120 |
| Mens Jeans / Slim Jean / Chino | 40 | 75 | 180 |
| Womens Jeans / Skinny / Mom | 38 | 72 | 170 |
| Legging / Trouser | 28 | 58 | 128 |
| Mini Dress | 30 | 65 | 140 |
| Midi Dress | 45 | 90 | 180 |
| Maxi / Wrap Dress | 50 | 110 | 200 |
| Outerwear (Puffer / Trench / Bomber) | 80 | 180 | 350 |
| Activewear (Sports Bra / Yoga Pant / Performance Tee) | 25 | 65 | 130 |
| Kids Tee / Jean / Hoodie | 10 | 22 | 45 |
| Running / Casual Sneaker | 50 | 105 | 180 |
| Boot | 90 | 160 | 250 |
| Sandal | 25 | 55 | 110 |
| Tote / Backpack | 35 | 95 | 395 |
| Belt / Wallet | 18 | 40 | 95 |
| Sunglasses | 40 | 110 | 220 |
| Watch | 75 | 175 | 400 |

### 1.15 Customer name pool (fictional, US-flavored, ethnically varied)

**Fictional** — no resemblance to real persons intended.

First names (50):
> Aisha, Alex, Amir, Andrea, Anika, Ariana, Brandon, Brianna, Camila, Carlos, Chloe, Daniel, David, DeShawn, Diego, Elena, Emily, Emma, Ethan, Fatima, Grace, Hannah, Imani, Isabella, Jaden, James, Jasmine, Jessica, Jordan, Kai, Katherine, Kevin, Liam, Maya, Marcus, Mia, Michael, Nadia, Noah, Olivia, Priya, Rachel, Raj, Ricardo, Samantha, Sarah, Sofia, Tyler, Vanessa, Zoe

Last names (50):
> Adams, Alvarez, Bennett, Brown, Carter, Chen, Cohen, Davis, Diaz, Edwards, Fischer, Foster, Garcia, Gonzalez, Green, Hall, Harris, Hernandez, Jackson, Johnson, Kim, Kumar, Lee, Lewis, Lopez, Martinez, Miller, Mitchell, Nakamura, Nguyen, O'Brien, Park, Patel, Perez, Phillips, Reyes, Rivera, Roberts, Rodriguez, Rosen, Singh, Smith, Taylor, Thompson, Torres, Walker, Washington, White, Williams, Wong

Generator combines uniformly with seeded RNG; total reachable space 2,500 names which is enough for 80k customers with collisions (acceptable for a synthetic dataset; collisions get the customer_id suffix in display, e.g. "Sarah Chen #00481").

### 1.16 NBA action labels (apparel-relevant)

Used by `at_risk_alerts.recommended_action`, `NextBestAction` card, and Quick Action buttons.

| action_id | label |
|---|---|
| `send_new_drop` | Send new-drop email featuring saved sizes |
| `offer_15_off_next` | Offer 15% off next purchase |
| `offer_25_off_reactivation` | Reactivation: 25% off + free returns |
| `free_shipping_invite` | Free shipping on next order |
| `concierge_fit_consult` | Book virtual fit consult with stylist |
| `size_up_recommendation` | Trigger size-up recommendation on app |
| `app_install_push` | Push: install app for early access |
| `wardrobe_quiz_invite` | Send wardrobe quiz invitation |
| `gift_with_purchase_invite` | Invite to GWP threshold ($150) |
| `loyalty_tier_upgrade_invite` | Invite to upgrade to Reward tier |
| `promote_lululemon_arrivals` | Promote new Lululemon arrivals |
| `promote_nike_arrivals` | Promote new Nike arrivals |
| `add_to_watch_list` | Add to CX watch list |
| `creator_lookbook_send` | Send creator-curated lookbook |

---

## 2. Per-cache-file JSON specs (24 files)

All apparel cache files live in `cache/apparel/` and mirror the existing `cache/` filenames 1:1. Where a JSON field name needs to change, **the field name is the same as the grocery file** so the loader and transform layer is shape-identical; only values differ. Where a field must be ADDED for apparel narrative, it is called out under "Apparel-additive fields".

Cross-file invariant: `customer_id` values must be drawn from the **same 80,000-row id space** (`CUST-00000`..`CUST-79999`) so every detail/drill flow resolves.

### 2.1 `cache/apparel/cx360_kpis.json`

- **Cardinality:** 1 object.
- **Shape (TypeScript):**

```ts
{
  total_customers: number;
  active_customers: number;
  active_rate_pct: number;
  avg_clv: number;             // USD
  total_revenue: number;       // USD
  avg_basket_value: number;    // USD
  churn_rate_pct: number;
  new_customers_30d: number;
  at_risk_count: number;
  at_risk_rate_pct: number;
  // KPICard.tsx also expects (set by transformer / generator):
  total_customers_prior: number;
  total_customers_trend: number[6];
  avg_clv_prior: number;
  avg_clv_trend: number[6];
  churn_rate_pct_prior: number;
  churn_rate_pct_trend: number[6];
  active_rate_pct_prior: number;
  active_rate_pct_trend: number[6];
}
```

- **Generation rules:**
  - `total_customers`: fixed 80,000 (deterministic).
  - `active_customers`: 38–45% of total — rng-gaussian centered on 0.41 σ=0.02.
  - `avg_clv`: gaussian(μ=$580, σ=$24).
  - `total_revenue`: sum of `customer_table.total_spend`.
  - `avg_basket_value`: mean of `customer_table.avg_basket` (target ~ $78).
  - `churn_rate_pct`: % of `customer_table` rows where `churn_risk_tier ∈ {Critical, High}` (target 21–24).
  - `new_customers_30d`: count where `days_since_signup ≤ 30` (target ~3,800).
  - `at_risk_count`: count where `churn_risk_tier ∈ {Critical, High}`.
  - `*_prior`: previous-period value = current × `1 − rng(0.02, 0.08)` for KPIs that should be trending up; reversed for churn.
  - `*_trend[6]`: 6 monotonically noised points using `mulberry32` interpolation between prior and current.

- **Sample output:**

```json
{
  "total_customers": 80000,
  "active_customers": 33120,
  "active_rate_pct": 41.4,
  "avg_clv": 587,
  "total_revenue": 46960000,
  "avg_basket_value": 78,
  "churn_rate_pct": 22.8,
  "new_customers_30d": 3826,
  "at_risk_count": 18240,
  "at_risk_rate_pct": 22.8,
  "total_customers_prior": 76340,
  "total_customers_trend": [76340, 77110, 78020, 78640, 79320, 80000],
  "avg_clv_prior": 561,
  "avg_clv_trend": [561, 565, 570, 575, 581, 587],
  "churn_rate_pct_prior": 21.2,
  "churn_rate_pct_trend": [21.2, 21.6, 22.0, 22.3, 22.6, 22.8],
  "active_rate_pct_prior": 42.7,
  "active_rate_pct_trend": [42.7, 42.3, 41.9, 41.7, 41.5, 41.4]
}
```

### 2.2 `cache/apparel/cx360_customer_table.json`

- **Cardinality:** 80,000 rows. Target file size ≤ 22 MB (grocery is 28.9 MB).
- **Shape:** same as `src/app/lib/types.ts > CustomerRecord` (preserve every field). Generator-only addition: `customer_name` is **excluded** here (it stays only on customer-detail page generation) to keep file size down — table rows use `customer_id` as display name.

```ts
{
  customer_id: string;            // CUST-00000 .. CUST-79999
  customer_segment: SegmentEnum;  // §1.6
  loyalty_tier: TierEnum;         // §1.7 — one of Elite|Reward|Insider|Member|Guest
  clv_12m: number;                // USD
  clv_tier: "Platinum"|"Gold"|"Silver"|"Bronze"|"At-Risk";
  churn_prob_90d: number;         // 0–1
  churn_risk_tier: "Critical"|"High"|"Medium"|"Low"|"Loyal";
  total_spend: number;            // USD
  total_transactions: number;
  avg_basket: number;             // USD
  days_since_last_purchase: number;
  preferred_channel: "In-Store"|"Web"|"App"|"Curbside"|"Marketplace";
  acquisition_channel: "Organic"|"Paid Social"|"Paid Search"|"Direct"|"Email"|"Referral"|"Affiliate";
  city: string;                   // metro name from §1.12
  geography: string;              // duplicate of city, retained for transform compatibility
  top_category: string;           // L2 leaf from §1.2
  top_brand: string;              // brand_id name from §1.3 (NEW field for apparel — used by Brand Affinity heatmap §3)
  return_rate_pct: number;        // 0–1 (NEW for apparel)
  probability_alive: number;
  purchase_frequency: number;
  recency_days: number;
  days_since_signup: number;      // for new_customers_30d computation
}
```

- **Generation rules (per row):**
  1. Sample `customer_segment` from §1.6 weights.
  2. Sample `loyalty_tier` from §1.7 weights independently, with re-roll bias: VIP/Brand-Loyalist push toward Elite/Reward; Lapsed/New push toward Guest.
  3. Sample `city` uniformly from §1.12 with NYC/LA over-weighted ×1.6.
  4. `clv_12m`: gaussian by segment — Fashion Forward μ=$820 σ=$280; Athletic Enthusiast μ=$940 σ=$310; Brand Loyalist μ=$1,140 σ=$420; Value Shopper μ=$310 σ=$120; Casual μ=$240 σ=$110; Returner μ=$420 σ=$190; New μ=$120 σ=$40; Lapsed μ=$190 σ=$110.
  5. `clv_tier`: bucket `clv_12m` per §1.10 / §plan thresholds (Platinum>$2K, Gold $800–2K, Silver $300–800, Bronze $80–300, At-Risk<$80) → target distribution 2/8/22/45/23%.
  6. `total_spend`: `clv_12m × uniform(1.4, 4.5)` (lifetime ≥ 12m horizon).
  7. `total_transactions`: gaussian by segment — apparel mean 2.4/yr; multiply by spend horizon years (rng 1–4).
  8. `avg_basket`: `total_spend / total_transactions` clamped to $25–$280.
  9. `days_since_last_purchase`: depend on segment — Lapsed uniform(180, 540), Casual uniform(60, 200), all others uniform(1, 90).
  10. `churn_prob_90d`: f(days_since_last_purchase, segment) — sigmoid centered at 90 days, clamp 0.02–0.96.
  11. `churn_risk_tier`: bucket per §1.10.
  12. `preferred_channel`: sample from §1.8 mix; bias New/Athletic → App; Lapsed/Casual → In-Store.
  13. `acquisition_channel`: sample with weights {Organic 0.22, Paid Social 0.24, Paid Search 0.14, Direct 0.10, Email 0.10, Referral 0.12, Affiliate 0.08}.
  14. `top_category`: sample L2 from §1.2, weighted by segment (Athletic → activewear; Fashion Forward → dresses/tops).
  15. `top_brand`: sample brand from §1.3 such that `top_category` ∈ brand's allowed departments; weighted by brand share within that dept.
  16. `return_rate_pct`: gaussian(0.18, 0.10), clamp 0.0–0.7; Returner segment forced to ≥0.35.
  17. `probability_alive`: `1 − churn_prob_90d × 0.85` + noise.
  18. `recency_days = days_since_last_purchase`; `purchase_frequency = total_transactions`.
  19. `days_since_signup`: uniform(1, 1460) — up to 4 years tenure.

- **Sample rows:**

```json
[
  {
    "customer_id": "CUST-00000",
    "customer_segment": "Athletic Enthusiast",
    "loyalty_tier": "Reward",
    "clv_12m": 1042,
    "clv_tier": "Gold",
    "churn_prob_90d": 0.18,
    "churn_risk_tier": "Low",
    "total_spend": 3680,
    "total_transactions": 11,
    "avg_basket": 92,
    "days_since_last_purchase": 14,
    "preferred_channel": "App",
    "acquisition_channel": "Paid Social",
    "city": "Los Angeles",
    "geography": "Los Angeles",
    "top_category": "Legging",
    "top_brand": "Lululemon",
    "return_rate_pct": 0.11,
    "probability_alive": 0.85,
    "purchase_frequency": 11,
    "recency_days": 14,
    "days_since_signup": 612
  },
  {
    "customer_id": "CUST-00001",
    "customer_segment": "Value Shopper",
    "loyalty_tier": "Member",
    "clv_12m": 218,
    "clv_tier": "Bronze",
    "churn_prob_90d": 0.41,
    "churn_risk_tier": "Medium",
    "total_spend": 540,
    "total_transactions": 4,
    "avg_basket": 135,
    "days_since_last_purchase": 78,
    "preferred_channel": "Web",
    "acquisition_channel": "Paid Search",
    "city": "Dallas",
    "geography": "Dallas",
    "top_category": "Crew Tee",
    "top_brand": "Old Navy",
    "return_rate_pct": 0.22,
    "probability_alive": 0.65,
    "purchase_frequency": 4,
    "recency_days": 78,
    "days_since_signup": 410
  }
]
```

- **Cross-refs:** drives §2.1, §2.3, §2.5, §2.6, §2.9, §2.10, §2.13, §2.15.

### 2.3 `cache/apparel/cx360_clv_distribution.json`

- **Cardinality:** 5 rows.
- **Shape:**

```ts
Array<{
  clv_tier: "Platinum"|"Gold"|"Silver"|"Bronze"|"At-Risk";
  customer_count: number;
  pct: number;
  avg_clv: number;
  total_clv: number;
  avg_frequency: number;
  avg_recency: number;
  avg_basket: number;
}>
```

- **Generation rules:** group `cx360_customer_table.json` by `clv_tier`, take counts and means. Target distribution per §plan: Platinum 2%, Gold 8%, Silver 22%, Bronze 45%, At-Risk 23%.

- **Samples:**

```json
[
  { "clv_tier": "Platinum", "customer_count": 1600, "pct": 2.0, "avg_clv": 2680, "total_clv": 4288000, "avg_frequency": 8.4, "avg_recency": 19, "avg_basket": 165 },
  { "clv_tier": "Gold",     "customer_count": 6400, "pct": 8.0, "avg_clv": 1180, "total_clv": 7552000, "avg_frequency": 4.6, "avg_recency": 32, "avg_basket": 118 },
  { "clv_tier": "Silver",   "customer_count": 17600, "pct": 22.0, "avg_clv": 480, "total_clv": 8448000, "avg_frequency": 2.7, "avg_recency": 58, "avg_basket": 92 }
]
```

### 2.4 `cache/apparel/cx360_clv_detail.json`

- **Cardinality:** 1 object with three children (`pareto[10]`, `summary{}`, `tier_stats[5]`).
- **Shape:** preserve grocery shape exactly (consumed by `CLVExpandModal`). USD ranges, apparel tiers.
- **Generation:** Pareto built from `cx360_customer_table` sorted desc on `clv_12m`, accumulating 10/20/.../100%. Summary fields: `top_10_pct_revenue_share`, `top_20_pct_revenue_share`, `gini_coefficient` (target 0.62).
- **Sample summary block:**

```json
{ "top_10_pct_revenue_share": 41.2, "top_20_pct_revenue_share": 58.6, "gini_coefficient": 0.62, "avg_clv": 587, "median_clv": 320 }
```

### 2.5 `cache/apparel/cx360_churn_risk.json`

- **Cardinality:** 4 rows (Critical/High/Medium/Low). Generator excludes `Loyal` here to match grocery 4-row donut.
- **Shape:**

```ts
Array<{
  churn_risk_tier: "Critical"|"High"|"Medium"|"Low";
  customer_count: number;
  avg_prob_30d: number;
  avg_prob_60d: number;
  avg_prob_90d: number;
}>
```

- **Generation:** group customer_table; target distribution Critical 11%, High 16%, Medium 28%, Low 45%. avg_prob_30d ≈ 0.7 × avg_prob_90d, avg_prob_60d ≈ 0.85 ×.

### 2.6 `cache/apparel/cx360_churn_drivers.json`

- **Cardinality:** 10 rows (top SHAP features).
- **Shape:** preserve grocery — `{ driver: string, high_churn_avg: number, low_churn_avg: number, impact_score: number }`. Add `direction` field as either `"positive"` (increases churn) or `"negative"`.
- **Apparel feature list (in `impact_score` order):**

| rank | driver | high_churn_avg | low_churn_avg | impact_score | direction |
|---|---|---|---|---|---|
| 1 | Days Since Last Purchase | 162 | 28 | 0.84 | positive |
| 2 | Return Rate % | 38 | 11 | 0.71 | positive |
| 3 | Mobile App Active (30d) | 0.18 | 0.74 | 0.62 | negative |
| 4 | Category Breadth (distinct L2 last 12m) | 1.4 | 4.2 | 0.58 | negative |
| 5 | Markdown Share % | 78 | 32 | 0.54 | positive |
| 6 | Avg Discount Taken % | 41 | 18 | 0.49 | positive |
| 7 | Loyalty Points Balance | 80 | 640 | 0.45 | negative |
| 8 | AOV Trend 6m | -0.18 | 0.08 | 0.41 | positive |
| 9 | Email Engagement (opens/30d) | 0.4 | 3.6 | 0.38 | negative |
| 10 | Last Promo Response (days) | 240 | 22 | 0.34 | positive |

- **Sample row:**

```json
{ "driver": "Return Rate %", "high_churn_avg": 38, "low_churn_avg": 11, "impact_score": 0.71, "direction": "positive" }
```

### 2.7 `cache/apparel/cx360_churn_detail.json`

- **Cardinality:** 1 object.
- **Shape:** `{ tiers: ChurnRiskRow[4], revenue_at_risk_90d: number, summary: { critical_revenue, high_revenue, total_at_risk_count } }`.
- **Generation:** roll up customer_table; `revenue_at_risk_90d = Σ clv_12m × churn_prob_90d` for Critical+High → target ~$4.2M.

### 2.8 `cache/apparel/cx360_cohort_retention.json`

- **Cardinality:** 18 cohorts × 12 periods = 216 long-form rows (matching grocery flat-array shape).
- **Shape:** `Array<{ cohort_month: string; original_customers: number; period_number: 0..11; retention_rate: number; retained_customers: number }>`.
- **Generation:** 18 trailing months ending 2026-06; `original_customers` uniform(3,800, 5,400). `retention_rate` curve: M0=1.0, M1=0.22, M2=0.16, M3=0.13, M6=0.10, M12=0.06 — interpolate with monotone-decreasing noise σ=0.01.

### 2.9 `cache/apparel/cx360_cohort_detail.json`

- **Cardinality:** 1 object with extended matrix (24 cohorts × 18 periods) for modal drill-down.
- **Shape:** preserve grocery shape (`matrix`, `cohort_stats`, `period_avg`).

### 2.10 `cache/apparel/cx360_segment_migration.json`

- **Cardinality:** 1 object; `flows` = up to 64 rows (8×8 segment matrix, sparse).
- **Shape:**

```ts
{
  period: "Q1 2026 → Q2 2026";
  segments: string[];          // 8 apparel segments §1.6
  flows: Array<{ from: string; to: string; count: number; pct: number }>;
  summary: {
    upgraded: number;
    stable: number;
    downgraded: number;
    churned: number;
    seasonal_churn_pct: number;  // NEW apparel — lapsed after one season
  };
}
```

- **Generation:** transition matrix bias: VIP→VIP 0.78, Loyalist→VIP 0.07; Fashion Forward→Lapsed 0.18 (apparel-typical); Returner→Lapsed 0.32. Stable diagonal sum ≈ 0.62 of base.

### 2.11 `cache/apparel/cx360_basket_distribution.json`

- **Cardinality:** 1 object with `distribution[5]`, `summary{}`, `by_channel[]`, `discount_dependency[5]`.
- **Shape distribution rows:**

```ts
{ range: "$0-30" | "$30-60" | "$60-120" | "$120-250" | "$250+"; min: number; max: number; customer_count: number; pct_customers: number; transactions: number; pct_transactions: number; revenue: number; pct_revenue: number; avg_value: number; median_value: number; }
```

- **Apparel-additive fields under `summary`:** `median_items_per_basket: 2.1`, `mean_items_per_basket: 2.4`, `full_price_pct: 58`, `markdown_pct: 42`.

### 2.12 `cache/apparel/cx360_recency_frequency.json`

- **Cardinality:** `recency_distribution[7]` (buckets 0-7/8-14/15-30/31-60/61-90/91-180/180+) + `frequency_distribution[6]` (1/2-3/4-5/6-8/9-12/13+).
- **Shape:** `Array<{ range: string; count: number; pct: number }>` for each.
- **Generation:** apparel-tuned — 38–45% in 0-30d combined; 55% of customers in frequency bucket "1", 25% in "2-3".

### 2.13 `cache/apparel/cx360_frequency_detail.json`

- **Cardinality:** 1 object: `{ distribution: Bucket[], summary: {avg_freq, median_freq, repeat_rate_90d} }`. Each Bucket: `{ range, customer_count, pct_revenue, pct_full_price }` (last field NEW).
- **Generation:** `pct_full_price` is 22% in bucket "1", 48% in "2-3", 64% in "4-5", 71% in "6-8", 78% in "9-12", 84% in "13+".

### 2.14 `cache/apparel/cx360_rfm_sample.json`

- **Cardinality:** 1,000-row sample of `customer_table` augmented with R/F/M scores 1–3.
- **Shape:** `Array<{ customer_id, customer_name, recency_days, frequency_12m, monetary_12m, r_score, f_score, m_score, rfm_segment: string }>`.

### 2.15 `cache/apparel/cx360_rfm_detail.json`

- **Cardinality:** 1 object with `nine_box[9]`, `density_heatmap[27]`, `action_playbook[8]`, `migration{}`, `definitions[6]`, `insights[5]`.
- **Apparel band definitions:** R 1=>120d, 2=46–120d, 3=≤45d. F 1=1/yr, 2=2–3/yr, 3=4+/yr.
- **Apparel action playbook (8 segments):**

| segment | message | channel | timing | expected_lift | cost_per_customer ($) |
|---|---|---|---|---|---|
| Champions | Early-access to next drop — your sizes saved | App push + Email | Immediate | 0.22 | 0.40 |
| Loyal | Wardrobe-builder bundle — 15% off 3+ items | Email | 7 days | 0.16 | 0.30 |
| Potential Loyalists | Loyalty tier upgrade invite + free shipping | Email | Immediate | 0.18 | 0.20 |
| New Customers | Welcome series + first-purchase share | Email | 0–14 days | 0.24 | 0.50 |
| Promising | Style quiz + curated lookbook | App push | 14 days | 0.12 | 0.30 |
| Needs Attention | "We miss your style" — 20% off | Email + SMS | Immediate | 0.14 | 0.60 |
| At Risk | Reactivation: 25% off + free returns | Email + SMS | Immediate | 0.10 | 0.90 |
| Hibernating / Lost | Win-back: 30% off entire purchase, no min | Email | Immediate | 0.06 | 1.20 |

### 2.16 `cache/apparel/cx360_revenue_concentration.json`

- **Cardinality:** `pareto[10] + by_segment[8]`.
- **Shape:** preserve grocery (`{percentile, customer_count, revenue_share, total_revenue}` and `{segment, total_revenue, customer_count, revenue_share, avg_revenue_per_customer}`).
- **Target ratios:** Top 10% → 41% revenue; Gini 0.62.

### 2.17 `cache/apparel/cx360_revenue_detail.json`

- **Cardinality:** 1 object; `{ segments: [...], trend: [...], summary: {...} }`.
- **`risk_status`** per segment: At-Risk → "critical"; Lapsed → "critical"; Casual → "warning"; Value Shopper → "warning"; others "healthy".

### 2.18 `cache/apparel/cx360_channel_analysis.json`

- **Cardinality:** `acquisition[7] + shopping[5]`. Shopping channels expand from 4 → 5 (add Curbside).
- **Shape (acquisition row):** `{ channel, customer_count, pct_of_total, avg_clv, total_revenue, cac, ltv_cac_ratio, creator_attribution_pct (NEW, only on Paid Social), description }`.
- **CAC ranges by acquisition channel:** Organic $0, Paid Social $42–$92, Paid Search $28–$58, Direct $0, Email $4–$12, Referral $6–$22, Affiliate $18–$48.

### 2.19 `cache/apparel/cx360_channel_deep.json`

- **Cardinality:** 1 object; deep-dive payload (used by `/cx360/deep/channels`).
- **Additional fields:** `web_vs_app_split { web_pct, app_pct }` per acquisition channel, `aov_by_channel`, `conversion_pct_by_channel`.

### 2.20 `cache/apparel/cx360_category_by_segment.json`

- **Cardinality:** `matrix[8]` (one per segment) × 5 apparel L1 columns = 40 cells. Plus `cross_sell_opportunities[8]`, `segment_diagnostics{}`.
- **Categories columns (5):** Tops, Bottoms, Outerwear, Footwear, Accessories.
- **Penetration targets:** Tops ~62% across all segments; Outerwear ~25%; Accessories ~18%; Footwear ~34%; Bottoms ~48%. Athletic Enthusiast spikes Footwear to 78%.

### 2.21 `cache/apparel/cx360_at_risk_alerts.json`

- **Cardinality:** `{ alerts: AtRiskAlert[20], summary: {...} }`.
- **Alert types (7) — apparel-specific:** `high_value_declining`, `return_abuse`, `cart_abandon_streak`, `app_uninstall_signal`, `seasonal_lapser`, `markdown_only_buyer`, `size_complaint_loop`.
- **Shape:**

```ts
{
  customer_id: string;
  customer_name: string;           // from §1.15 name pool
  segment: SegmentEnum;
  clv: number;
  churn_probability: number;       // 0–1
  days_since_last_order: number;
  alert_type: AlertTypeEnum;
  recommended_action: NBALabel;    // §1.16
  potential_revenue_at_risk: number;  // 0.4 × clv typically
}
```

- **Generation rules:**
  - Pick the top-20 highest `clv × churn_prob_90d` rows from customer_table.
  - Assign `alert_type` by rule: if `return_rate_pct > 0.40` → `return_abuse`; if `markdown_share > 0.7` → `markdown_only_buyer`; if `days_since_last_purchase 90–180` and last season-buy match → `seasonal_lapser`; etc.
  - `customer_name`: assign deterministically by hash(customer_id) into §1.15 pool.

- **Sample:**

```json
{
  "customer_id": "CUST-04812",
  "customer_name": "Sarah Chen",
  "segment": "Brand Loyalist",
  "clv": 1860,
  "churn_probability": 0.74,
  "days_since_last_order": 102,
  "alert_type": "high_value_declining",
  "recommended_action": "Send new-drop email featuring saved sizes",
  "potential_revenue_at_risk": 745
}
```

### 2.22 `cache/apparel/dimensions.json`

- **Cardinality:** ~600 entries (flat array of `{dim_type, id, name, ...}`).
- **Generation:** emit one row per:
  - 50 stores (§1.12) — `dim_type: "stores"`.
  - 25 brands (§1.3) — `dim_type: "brands"`.
  - 32 categories (§1.2) — `dim_type: "categories"` with `parent_department`.
  - 8 customer segments (§1.6) — `dim_type: "segments"`.
  - 5 loyalty tiers (§1.7) — `dim_type: "loyalty_tiers"`.
  - 5 channels (§1.8) — `dim_type: "channels"`.
  - 7 acquisition channels — `dim_type: "acquisition_channels"`.
  - 24 holidays (§1.11) — `dim_type: "holidays"`.
  - 6 return reasons (§1.13) — `dim_type: "return_reasons"`.

### 2.23 `cache/apparel/cx360_at_risk_alerts.json` summary block

(Embedded in §2.21 above — `summary: { total_at_risk, high_priority, medium_priority, low_priority, total_revenue_at_risk }`.)

### 2.24 Customer detail summary file: `cache/apparel/cx360_customer_details.json`

- **Cardinality:** index of 200 pre-generated detail records (sampling top-CLV + top-churn + random). Detail generator at runtime can synthesize for any other id.
- **Shape:** see §7.

---

## 3. Three NEW apparel-native chart specs

### 3.1 Returns by Reason — donut + KPI tile

- **Component (new):** `src/app/components/charts/ReturnsByReason.tsx`
- **Cache (new):** `cache/apparel/cx360_returns_by_reason.json`
- **JSON shape:**

```ts
{
  total_returns_90d: number;
  return_rate_pct: number;          // overall
  return_margin_impact_usd: number; // annualized
  reasons: Array<{
    reason: "Fit"|"Style"|"Quality"|"Wrong Item"|"Damaged"|"Changed Mind";
    count: number;
    pct: number;
    avg_refund_usd: number;
    margin_impact_usd: number;
  }>;
  trend_12w: Array<{ week: string; return_rate_pct: number }>;
}
```

- **Chart type:** Donut (recharts `PieChart` + `Pie` + center label) + KPI strip above showing the 3 summary scalars.
- **Interaction:** slice click → drilldown filter `return_reason`; Expand → generic `ChartExpandModal`.
- **5 sample reason rows:**

```json
[
  { "reason": "Fit",          "count": 14820, "pct": 41.2, "avg_refund_usd": 68, "margin_impact_usd": 412000 },
  { "reason": "Style",        "count":  6940, "pct": 19.3, "avg_refund_usd": 72, "margin_impact_usd": 198000 },
  { "reason": "Quality",      "count":  4620, "pct": 12.8, "avg_refund_usd": 85, "margin_impact_usd": 154000 },
  { "reason": "Wrong Item",   "count":  3120, "pct":  8.7, "avg_refund_usd": 64, "margin_impact_usd":  86000 },
  { "reason": "Damaged",      "count":  2980, "pct":  8.3, "avg_refund_usd": 78, "margin_impact_usd":  98000 }
]
```

- **Placement:** Section 10 (Basket & Behavior), replaces nothing — sits alongside `Top Categories by Segment` as a third column on lg breakpoint, or under it on md.
- **Why it's apparel-essential:** Returns are THE apparel KPI grocery never had. A CX360 dashboard without a returns view fails the apparel sniff test in 5 seconds.

### 3.2 Brand Affinity Heatmap — Segment × Brand

- **Component (new):** `src/app/components/charts/BrandAffinityHeatmap.tsx`
- **Cache (new):** `cache/apparel/cx360_brand_affinity.json`
- **JSON shape:**

```ts
{
  segments: string[];               // 8 §1.6
  brands: string[];                 // top 10 by overall share
  cells: Array<{
    segment: string;
    brand: string;
    share_of_wallet_pct: number;    // % of segment $ to this brand
    avg_aov_with_brand: number;     // $
    customer_count: number;
  }>;
  insights: string[];               // 3–5 LLM-style call-outs
}
```

- **Chart type:** heatmap table (mirror `CategoryBySegment.tsx`), 8 rows × 10 cols = 80 cells, color scale 0→25% share-of-wallet.
- **Interaction:** cell click → drilldown filter (`customer_segment = X AND top_brand = Y`) on customer_table; Expand → `ChartExpandModal` with CSV export.
- **5 sample cell rows:**

```json
[
  { "segment": "Athletic Enthusiast", "brand": "Lululemon", "share_of_wallet_pct": 28.4, "avg_aov_with_brand": 118, "customer_count": 3120 },
  { "segment": "Athletic Enthusiast", "brand": "Nike",      "share_of_wallet_pct": 24.1, "avg_aov_with_brand":  96, "customer_count": 4680 },
  { "segment": "Fashion Forward",     "brand": "Zara",      "share_of_wallet_pct": 22.8, "avg_aov_with_brand":  82, "customer_count": 2140 },
  { "segment": "Value Shopper",       "brand": "H&M",       "share_of_wallet_pct": 19.6, "avg_aov_with_brand":  44, "customer_count": 6320 },
  { "segment": "Brand Loyalist",      "brand": "Coach",     "share_of_wallet_pct": 38.2, "avg_aov_with_brand": 248, "customer_count": 1120 }
]
```

- **Placement:** Section 10, **replaces** `Top Categories by Segment` on apparel tenant (grocery keeps Category × Segment; apparel swaps to Brand × Segment as it's the sharper signal).
- **Why it's apparel-essential:** Brand loyalty is the single most discriminating dimension in apparel. Showing VIPs over-indexing Lululemon/Coach vs Value Shoppers over-indexing H&M/Old Navy is the moment the demo sells itself.

### 3.3 Return Reason Waterfall (Customer Detail Page)

- **Component (new):** `src/app/components/customer/ReturnReasonWaterfall.tsx`
- **Cache:** embedded in customer-detail generator output (`customer.return_history`).
- **JSON shape (per customer):**

```ts
{
  customer_id: string;
  total_returns_12m: number;
  return_value_usd: number;
  reasons: Array<{
    reason: "Fit (too small)"|"Fit (too large)"|"Style"|"Quality"|"Wrong Item"|"Damaged"|"Changed Mind";
    count: number;
    pct: number;
  }>;
  size_complaint_cluster: string | null;  // e.g., "Bottoms 32×32 ran small"
}
```

- **Chart type:** recharts `BarChart` rendered as a horizontal waterfall — each bar a reason, sorted by count desc.
- **Interaction:** none (per-customer view); hovering shows count + % + sample SKU IDs returned for that reason.
- **5 sample customer rows:**

```json
[
  {
    "customer_id": "CUST-04812",
    "total_returns_12m": 14,
    "return_value_usd": 962,
    "reasons": [
      { "reason": "Fit (too small)", "count": 6, "pct": 43 },
      { "reason": "Style",            "count": 3, "pct": 21 },
      { "reason": "Changed Mind",     "count": 2, "pct": 14 },
      { "reason": "Quality",          "count": 2, "pct": 14 },
      { "reason": "Wrong Item",       "count": 1, "pct":  7 }
    ],
    "size_complaint_cluster": "Bottoms 32×32 ran small"
  }
]
```

- **Placement:** customer detail page, Row 3 (under Risk & Predictions). Adds a 3rd row of content to the customer page.
- **Why it's apparel-essential:** Per-customer return story is what loyalty teams need to design fit-help interventions (concierge consults, size-up recommendations). Pairs with the new `predicted_return_rate_12m` field on the Risk panel.

---

## 4. Color palette mapping (`palette-apparel.ts`)

### Tokens

| Token | Hex | Used by |
|---|---|---|
| Women's | `#EC4899` | charts grouped by Women's dept |
| Men's | `#1E40AF` | charts grouped by Men's dept |
| Kids' | `#14B8A6` | charts grouped by Kids' dept |
| Athletic | `#3B82F6` | activewear sub-category |
| Footwear | `#F97316` | Footwear dept |
| Accessories | `#A855F7` | Accessories dept |
| Outerwear | `#0EA5E9` | outerwear sub-category |
| Dresses | `#DB2777` | dresses sub-category |

### Segment colors (8)

| Segment | Hex |
|---|---|
| Fashion Forward | `#DB2777` |
| Athletic Enthusiast | `#3B82F6` |
| Value Shopper | `#10B981` |
| Brand Loyalist | `#7C3AED` |
| Returner | `#F97316` |
| Lapsed | `#94A3B8` |
| Casual | `#64748B` |
| New | `#06B6D4` |

### Loyalty tier colors (5)

| Tier | Hex |
|---|---|
| Elite | `#6366F1` |
| Reward | `#F59E0B` |
| Insider | `#64748B` |
| Member | `#A3A3A3` |
| Guest | `#D4D4D8` |

### Return reason colors (6)

| Reason | Hex |
|---|---|
| Fit | `#F59E0B` |
| Style | `#A855F7` |
| Quality | `#EF4444` |
| Wrong Item | `#F97316` |
| Damaged | `#DC2626` |
| Changed Mind | `#94A3B8` |

### File: `src/app/lib/palette-apparel.ts`

```ts
// src/app/lib/palette-apparel.ts
export const APPAREL_DEPT_COLORS = {
  "Women's":    "#EC4899",
  "Men's":      "#1E40AF",
  "Kids'":      "#14B8A6",
  "Athletic":   "#3B82F6",
  "Footwear":   "#F97316",
  "Accessories":"#A855F7",
  "Outerwear":  "#0EA5E9",
  "Dresses":    "#DB2777",
} as const;

export const APPAREL_SEGMENT_COLORS = {
  "Fashion Forward":      "#DB2777",
  "Athletic Enthusiast":  "#3B82F6",
  "Value Shopper":        "#10B981",
  "Brand Loyalist":       "#7C3AED",
  "Returner":             "#F97316",
  "Lapsed":               "#94A3B8",
  "Casual":               "#64748B",
  "New":                  "#06B6D4",
} as const;

export const APPAREL_LOYALTY_COLORS = {
  Elite:   "#6366F1",
  Reward:  "#F59E0B",
  Insider: "#64748B",
  Member:  "#A3A3A3",
  Guest:   "#D4D4D8",
} as const;

export const APPAREL_RETURN_REASON_COLORS = {
  "Fit":           "#F59E0B",
  "Style":         "#A855F7",
  "Quality":       "#EF4444",
  "Wrong Item":    "#F97316",
  "Damaged":       "#DC2626",
  "Changed Mind":  "#94A3B8",
} as const;

export const APPAREL_CHANNEL_COLORS = {
  "In-Store":     "#1E40AF",
  "Web":          "#3B82F6",
  "App":          "#8B5CF6",
  "Curbside":     "#10B981",
  "Marketplace":  "#F59E0B",
} as const;
```

### Tokens it replaces

The existing grocery palette (`CategoryBySegment.tsx` literal hex maps, `RevenueBySegment.tsx` segment colors) keys to grocery L1 strings (`"Electronics"`, `"Grocery"`, `"Dairy"`). Charts in apparel-tenant mode read from `palette-apparel` via the tenant context (§5). CLV-tier colors (Platinum/Gold/Silver/Bronze/At-Risk) and churn-tier colors (Critical/High/Medium/Low) are tier-agnostic and **unchanged**.

---

## 5. Settings UI toggle spec

### UI

- **Page location:** `src/app/settings/page.tsx`
- **Element:** **Dropdown** (recommended over toggle button — leaves room for >2 tenants in future without UI rework).
- **Label:** "Demo dataset"
- **Helper text:** "Switch between the India grocery dataset and the US apparel dataset. Reloads the page."
- **Options:**

| value | label |
|---|---|
| `india_grocery` | India — Grocery |
| `us_apparel` | US — Apparel |

### Persistence

- `localStorage` key: `cx360.tenant`
- Default if unset: `india_grocery` (no behavior change for existing users).
- Also written as a non-HTTPOnly cookie `cx360_tenant=<value>; SameSite=Lax; Max-Age=31536000` so the SSR layer of Next can read it on first paint (no flicker).

### `TenantContext`

File: `src/app/context/TenantContext.tsx`

```ts
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type TenantId = "india_grocery" | "us_apparel";

export interface TenantConfig {
  id: TenantId;
  label: string;
  currencySymbol: "₹" | "$";
  currencyCode: "INR" | "USD";
  cacheDir: "cache" | "cache/apparel";
  palette: "grocery" | "apparel";
}

export const TENANTS: Record<TenantId, TenantConfig> = {
  india_grocery: { id: "india_grocery", label: "India — Grocery",  currencySymbol: "₹", currencyCode: "INR", cacheDir: "cache",         palette: "grocery" },
  us_apparel:    { id: "us_apparel",    label: "US — Apparel",     currencySymbol: "$", currencyCode: "USD", cacheDir: "cache/apparel", palette: "apparel"  },
};

interface TenantContextValue {
  tenant: TenantConfig;
  setTenant: (id: TenantId) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children, initial }: { children: ReactNode; initial: TenantId }) {
  const [tenantId, setTenantId] = useState<TenantId>(initial);
  useEffect(() => {
    const stored = localStorage.getItem("cx360.tenant") as TenantId | null;
    if (stored && TENANTS[stored]) setTenantId(stored);
  }, []);
  const setTenant = (id: TenantId) => {
    localStorage.setItem("cx360.tenant", id);
    document.cookie = `cx360_tenant=${id}; SameSite=Lax; Max-Age=31536000; Path=/`;
    setTenantId(id);
    window.location.reload();           // hard reload — see "Behaviour on toggle" below
  };
  return (
    <TenantContext.Provider value={{ tenant: TENANTS[tenantId], setTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const v = useContext(TenantContext);
  if (!v) throw new Error("useTenant must be used inside TenantProvider");
  return v;
}
```

### How `cache-loader` consumes it

Cache imports today are top-level `import x from '@/../cache/cx360_kpis.json'` — these are bundled at build time and can't be conditionally swapped at runtime. The cache-loader refactor needs:

```ts
// src/app/lib/cache-loader.ts
import groceryKpis from "../../../cache/cx360_kpis.json";
import apparelKpis from "../../../cache/apparel/cx360_kpis.json";
// ... one pair per file

import type { TenantId } from "@/context/TenantContext";

const REGISTRY = {
  cx360_kpis: { india_grocery: groceryKpis, us_apparel: apparelKpis },
  // ...
} as const;

export function loadCache<K extends keyof typeof REGISTRY>(key: K, tenant: TenantId) {
  return REGISTRY[key][tenant];
}
```

Both datasets ship in the bundle (cost: +29 MB gzipped → acceptable for a demo). The page reads tenant from a server-side cookie helper on first render to avoid hydration mismatch.

### Behaviour on toggle

**Full hard reload.** Soft re-fetch is rejected because dozens of components have cache content cached in module-scope closures (transform fns memoize). A reload guarantees a clean slate and matches user mental model ("I switched datasets → I expect the dashboard to look completely different now").

---

## 6. Chat agent skinning

Branch in `src/app/api/chat/route.ts` and `src/app/api/widget-ai/route.ts`:

```ts
const tenant = req.cookies.get("cx360_tenant")?.value ?? "india_grocery";
const systemPrompt = tenant === "us_apparel"
  ? APPAREL_CX360_SYSTEM_PROMPT
  : GROCERY_CX360_SYSTEM_PROMPT;
```

Place `APPAREL_CX360_SYSTEM_PROMPT` constant in `src/app/api/chat/prompts/apparel-cx360.ts`.

### Full system prompt (apparel)

```
You are CX360-Assist, an analytics co-pilot for a US apparel retailer.

Your scope is the CX360 customer-analytics module. You answer questions about
customer lifetime value, churn risk, cohort retention, RFM segmentation, channel
performance, and basket behavior, all denominated in US dollars.

Conventions you must follow:
- Currency: always USD, formatted as $X, $X.XX, $XK, or $X.XM. Never use ₹, Cr,
  or Lakh.
- Geography: US cities and metros only (NYC, LA, Chicago, Dallas, Atlanta, etc.).
  Never reference Mumbai, Delhi, Bangalore, Chennai.
- Segments: Fashion Forward, Athletic Enthusiast, Value Shopper, Brand Loyalist,
  Returner, Lapsed, Casual, New. Do not invent segments.
- Brands: real US apparel brands (Levi's, Nike, Lululemon, Zara, H&M, Old Navy,
  Coach, Vans, etc.). Do not reference Indian brands or grocery SKUs.
- Channels: In-Store, Web, App, Curbside, Marketplace. Acquisition channels:
  Organic, Paid Social, Paid Search, Direct, Email, Referral, Affiliate.
- Loyalty tiers: Elite, Reward, Insider, Member, Guest.
- Seasonal context: US calendar — Back-to-School (Jul/Aug), Black Friday,
  Cyber Monday, Memorial Day, Labor Day, Holiday Q4. Never reference Diwali,
  Onam, Pongal, Eid.
- Apparel-specific concepts you may use: return rate, fit complaints,
  size-color SKU breakdown, markdown lifecycle (Week 4 / 8 / 12), full-price
  vs markdown share of revenue, wardrobe breadth, creator/influencer attribution.

When data is needed, call the available tools (`cx_lookup`, `customer_detail`,
`cache_query`). If a tool returns no data or fails, say so plainly — never
fabricate metrics.

Tone: concise, executive-ready, numerate. Lead with the headline number, then
the so-what, then the recommended action. Maximum 4 sentences unless the user
explicitly asks for depth.
```

### Few-shot examples

1.
> **Q:** What's driving churn in our top customers?
> **A:** Top three drivers for high-CLV churn are return rate (>35% over 90 days predicts churn at 0.71 importance), mobile-app inactivity (0.62), and category breadth — customers buying from only one L2 category churn at 3× the rate of wardrobe-builders. Recommend a fit-consult intervention for Returner-segment Brand Loyalists ($2.4M at risk).

2.
> **Q:** Which segment over-indexes on Lululemon?
> **A:** Athletic Enthusiasts spend 28.4% of wallet on Lululemon (avg AOV $118) — 4.2× the next-closest segment. Brand Loyalists are second at 18% but with a higher AOV of $142.

3.
> **Q:** What's our BFCM exposure for at-risk customers?
> **A:** 18,240 customers in Critical+High risk tiers — $4.2M of CLV exposure if they don't convert in Q4. Black Friday is your single biggest reactivation window (4.2× baseline uplift). Recommend a 25%-off + free-returns push 7 days pre-BFCM to the 5,000 highest-CLV Critical-tier customers.

4.
> **Q:** Show me Sarah Chen.
> **A:** Sarah Chen (CUST-04812) — Brand Loyalist, Reward tier, LA. 12-month CLV $1,860; last purchase 102 days ago; 90-day churn probability 0.74. Top brand Lululemon (62% of wallet). Return rate 38% with a fit cluster on Bottoms 32×32. Recommended action: concierge fit consult + new-drop email.

### Tool input variants

No tenant hint needed on tool inputs — tools read the same tenant cookie. Tool *output* shapes are unchanged.

### Code placement

```ts
// src/app/api/chat/route.ts (around line where system prompt is constructed)
import { APPAREL_CX360_SYSTEM_PROMPT } from "./prompts/apparel-cx360";
import { GROCERY_CX360_SYSTEM_PROMPT } from "./prompts/grocery-cx360";

const tenant = req.cookies.get("cx360_tenant")?.value ?? "india_grocery";
const systemPrompt = tenant === "us_apparel" ? APPAREL_CX360_SYSTEM_PROMPT : GROCERY_CX360_SYSTEM_PROMPT;
```

Same branch in `src/app/api/widget-ai/route.ts`.

---

## 7. Customer detail page generator spec

File: `src/app/lib/generate-customer-detail.ts` (rewritten for apparel; current grocery logic preserved behind `tenant === 'india_grocery'`).

### Per-customer field rules

| Field | Rule |
|---|---|
| `customer_id` | from `cx360_customer_table` row |
| `customer_name` | deterministic hash(customer_id) → §1.15 first × last name |
| `email` | `{first}.{last}{digits}@example.com` |
| `city` / `state` / `metro` | from §1.12 store lookup of preferred store |
| `customer_segment` | from row |
| `loyalty_tier` | from row |
| `member_since` | today − `days_since_signup` |
| `top_brands_t12m` | top 5 by spend, drawn from §1.3 weighted by segment |
| `category_spend` | top 5 L2 categories, USD totals; bias by gender inferred from `top_category` |
| `monthly_spend[12]` | 12 trailing months; baseline = `total_spend/(12 × tenure_years)`, with seasonal multipliers from §1.11 (Aug ×1.6, Nov ×2.0, Dec ×1.4) |
| `channel_split` | 3-channel: Web / App / In-Store; proportions biased to `preferred_channel` |
| `return_history` | §3.3 shape — 0–14 returns over 12m, reason distribution biased by `top_category` per §1.13 |
| `recent_transactions[10]` | last 10 orders: `{ date, store_name, items: "<qty> × <brand> <style> <size> <color>", amount_usd, channel, had_promo }` |
| `risk_predictions` | `{ churn_prob_90d, churn_risk_tier, probability_alive, predicted_purchases_12m, predicted_return_rate_12m, price_sensitivity }` |
| `ai_insights[]` | 4–6 strings; templates: "Buys 62% Lululemon — Brand Loyalist signal", "Return rate 38% concentrated on Bottoms 32×32 — fit consult candidate", etc. |
| `next_best_actions[]` | 3 actions from §1.16 chosen by alert_type → action map |

### Sample outputs for 3 customer IDs

**CUST-04812 — Sarah Chen** (Brand Loyalist, Reward):

```json
{
  "customer_id": "CUST-04812",
  "customer_name": "Sarah Chen",
  "email": "sarah.chen4812@example.com",
  "city": "Los Angeles", "state": "CA", "metro": "Los Angeles",
  "customer_segment": "Brand Loyalist",
  "loyalty_tier": "Reward",
  "member_since": "2023-04-12",
  "top_brands_t12m": ["Lululemon", "Nike", "Madewell", "Coach", "J.Crew"],
  "monthly_spend": [120,140,180,160,210,180,240,420,160,180,640,420],
  "risk_predictions": {
    "churn_prob_90d": 0.74, "churn_risk_tier": "Critical",
    "probability_alive": 0.32, "predicted_purchases_12m": 1.8,
    "predicted_return_rate_12m": 0.36, "price_sensitivity": "Low"
  },
  "ai_insights": [
    "62% of spend with Lululemon — protect with VIP early-access",
    "Return rate 36% with size-cluster on Bottoms 32×32",
    "Web > App migration over last 60 days — push App install"
  ]
}
```

**CUST-15003 — Marcus Rivera** (Athletic Enthusiast, Elite):

```json
{
  "customer_id": "CUST-15003",
  "customer_name": "Marcus Rivera",
  "city": "Dallas",
  "customer_segment": "Athletic Enthusiast",
  "loyalty_tier": "Elite",
  "top_brands_t12m": ["Nike", "Lululemon", "Under Armour", "New Balance", "Adidas"],
  "risk_predictions": { "churn_prob_90d": 0.08, "churn_risk_tier": "Low", "predicted_return_rate_12m": 0.06 }
}
```

**CUST-62488 — Emily Park** (New, Member):

```json
{
  "customer_id": "CUST-62488",
  "customer_name": "Emily Park",
  "city": "Chicago",
  "customer_segment": "New",
  "loyalty_tier": "Member",
  "member_since": "2026-05-04",
  "top_brands_t12m": ["Old Navy", "H&M"],
  "risk_predictions": { "churn_prob_90d": 0.22, "churn_risk_tier": "Medium", "predicted_return_rate_12m": 0.18 },
  "ai_insights": ["First purchase 22 days ago — drop welcome series Day 30"]
}
```

---

## 8. Hardcoded label / formatter sweep

Mechanical replacement table for label strings, hardcoded currency, and date formats. Generator author runs `rg -n` and applies per row.

| File | Approx line range | Current | Apparel replacement |
|---|---|---|---|
| `src/app/lib/merch-format.ts` | full file | `formatINR`, `formatCr`, `formatLakh` returning `"₹X Cr"` / `"₹X L"` | Add `formatUsd`, `formatUsdMillion`, `formatUsdK`; gate via tenant — `formatCurrency(value, tenant)` |
| `src/app/components/charts/CLVDistribution.tsx` | tooltip + axis | `${tier}: ₹${val}` | `${tier}: $${val}` |
| `src/app/components/charts/ChurnRiskDonut.tsx` | center label | `"₹X Cr at risk"` | `"$X.XM at risk"` |
| `src/app/components/charts/ChurnDrivers.tsx` | bar label | `feature_name` literal map keyed to grocery features | replace map keys per §2.6 |
| `src/app/components/charts/CohortRetentionHeatmap.tsx` | tooltip | "of 5,000 customers" hard-coded fallback | parameterize |
| `src/app/components/charts/RevenuePareto.tsx` | y-axis tickFormatter | `${v}Cr` | `$${v}M` |
| `src/app/components/charts/RevenueBySegment.tsx` | x-axis | `₹` | `$` |
| `src/app/components/charts/BasketDistribution.tsx` | x-axis labels | `₹0-500` etc. | `$0-30` etc. |
| `src/app/components/charts/RecencyDistribution.tsx` | bucket labels | none — generic | none |
| `src/app/components/charts/AcquisitionByChannel.tsx` | legend | 6 channels hardcoded | expand to 7 |
| `src/app/components/charts/ChannelPerformance.tsx` | colors map | 4 channels | 5 channels |
| `src/app/components/charts/CategoryBySegment.tsx` | category-key map | `["Electronics","Grocery","Fashion","Beauty","Home & Living"]` | `["Tops","Bottoms","Outerwear","Footwear","Accessories"]` |
| `src/app/components/charts/SegmentMigration.tsx` | segment label palette | grocery segments | apparel 8 |
| `src/app/components/charts/RFMScatter.tsx` | R/F band labels | "Recent (1-3 days)" | "Recent (≤45d)" — re-bind to apparel bands |
| `src/app/components/tables/CustomerTable.tsx` | currency cells | inline `₹` format | `formatCurrency(v, tenant)` |
| `src/app/components/alerts/AtRiskAlerts.tsx` | name display | "Customer 49814" | `customer_name` from §1.15 pool |
| `src/app/components/kpi/KPICard.tsx` | currency prefix | `₹` | `formatCurrency` |
| `src/app/components/layout/TopFilterBar.tsx` | city dropdown | "Mumbai, Delhi NCR, …" | read from `dimensions.json` filter via tenant |
| `src/app/cx360/customer/[id]/CustomerDetailContent.tsx` | y-axis on Purchase Timeline | `₹XK` | `$XK` |
| `src/app/cx360/customer/[id]/CustomerDetailContent.tsx` | Channel Usage donut | 2 channels | 3 channels (Web / App / In-Store) |
| `src/app/components/customer/NextBestAction.tsx` | action label strings | grocery actions | §1.16 |
| `src/app/components/customer/ActionHistory.tsx` | action types | grocery | §1.16 |
| `src/app/api/chat/route.ts` | system prompt | grocery | tenant-branch per §6 |
| `src/app/api/widget-ai/route.ts` | system prompt | grocery | tenant-branch per §6 |
| `src/app/lib/filter-utils.ts` | segment match strings | grocery | apparel 8 |

Date format `"DD/MM/YYYY"` (Indian convention) appears in transaction-row display; replace with `"MM/DD/YYYY"` under apparel tenant in `recent_transactions` rendering.

---

## 9. Migration runbook

```bash
# 1. Add generator + apparel constants
#    (developer creates scripts/gen-apparel-cx360.ts and scripts/lib/apparel-constants.ts)

# 2. Generate apparel data
npm run gen:apparel-cx360
# Expected: writes 24 files to cache/apparel/, ~12 MB total, ~12–20s wall time

# 3. Verify schema parity vs grocery
npm run lint:apparel-schema
# (script at scripts/lint-apparel-schema.ts — see §10)

# 4. Verify sanity ranges
npm run lint:apparel-sanity

# 5. Run the app
npm run dev

# 6. Toggle to apparel
#    → open http://localhost:3000/settings
#    → Demo dataset dropdown → "US — Apparel"
#    → page reloads
#    → navigate to /cx360 — should now show $, US cities, apparel brands

# 7. Reset
#    → /settings → "India — Grocery"
#    → page reloads to grocery
#    OR in DevTools console: localStorage.removeItem('cx360.tenant'); document.cookie='cx360_tenant=; Max-Age=0; Path=/'; location.reload();

# 8. When to regenerate
#    – Constants change in scripts/lib/apparel-constants.ts
#    – New cache file added (§2 grows)
#    – Generator seed changes (default 20260628)
#    Otherwise cache/apparel/ is checked in to the repo.
```

---

## 10. Validation rules

### 10.1 Schema parity linter — `scripts/lint-apparel-schema.ts`

Compares every `cache/apparel/cx360_*.json` shape against `cache/cx360_*.json`. FAILS the build if a field is missing, extra, or wrong type. Sketch:

```ts
import fs from "fs";
import path from "path";

const FILES = [
  "cx360_kpis.json", "cx360_clv_distribution.json", "cx360_churn_risk.json",
  "cx360_churn_drivers.json", "cx360_basket_distribution.json",
  "cx360_recency_frequency.json", "cx360_channel_analysis.json",
  "cx360_at_risk_alerts.json", "cx360_segment_migration.json",
  "cx360_revenue_concentration.json", "cx360_category_by_segment.json",
  "cx360_clv_detail.json", "cx360_churn_detail.json", "cx360_cohort_retention.json",
  "cx360_cohort_detail.json", "cx360_rfm_detail.json", "cx360_rfm_sample.json",
  "cx360_revenue_detail.json", "cx360_frequency_detail.json", "cx360_channel_deep.json",
  "dimensions.json", "cx360_customer_table.json",
];

function shapeOf(v: any): any {
  if (v === null) return "null";
  if (Array.isArray(v)) return v.length ? [shapeOf(v[0])] : ["empty"];
  if (typeof v === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = shapeOf(v[k]);
    return out;
  }
  return typeof v;
}

let failed = 0;
for (const f of FILES) {
  const grocery = JSON.parse(fs.readFileSync(path.join("cache", f), "utf8"));
  const apparel = JSON.parse(fs.readFileSync(path.join("cache/apparel", f), "utf8"));
  const gShape = shapeOf(grocery);
  const aShape = shapeOf(apparel);
  if (JSON.stringify(gShape) !== JSON.stringify(aShape)) {
    console.error(`SHAPE MISMATCH: ${f}\n  grocery: ${JSON.stringify(gShape).slice(0,400)}\n  apparel: ${JSON.stringify(aShape).slice(0,400)}`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
```

Allowed exceptions: new apparel-additive fields (e.g., `top_brand` in customer_table). Linter takes a whitelist of `"file:field"` strings to permit additions.

### 10.2 Sanity-value linter — `scripts/lint-apparel-sanity.ts`

Asserts:

- `cx360_customer_table.json`: `total_spend ∈ [0, 50000]`, `avg_basket ∈ [10, 500]`, `clv_12m ∈ [10, 5000]`, `churn_prob_90d ∈ [0,1]`, `return_rate_pct ∈ [0, 0.7]`.
- Σ `customer_segment` populations ≈ 1.0 (±0.01).
- Σ `loyalty_tier` populations ≈ 1.0.
- Σ acquisition channel pct = 100 (±0.5).
- AOV ranges fall in §1.14 envelope per category.
- No grocery strings present in any apparel JSON: fail if grep matches `Mumbai|Delhi|Bangalore|Chennai|Diwali|Kirana|Hindustan|₹|Spices|Edible Oil|Detergent`.

---

## 11. Performance considerations

- **File sizes:** customer_table ~22 MB (vs grocery 28.9 MB; smaller because we cut to 80k rows from 100k). All other files combined ~600 KB. Total `cache/apparel/` ≈ **23 MB**.
- **Bundle impact:** since cache files are imported via `loadCache` (§5), both tenants ship in the JS bundle. Net repo growth ~52 MB gzipped → acceptable for an internal demo. If this becomes a concern, route cache imports through `dynamic import()` so only the active tenant's bundle loads.
- **Generator runtime:** target ≤ 20 seconds wall time on a 2025 MacBook Pro for full 24-file regen. Customer-table loop is the long pole (80k rows × ~12 µs/row = ~1 s; JSON serialization dominates at ~6–10 s).
- **Memory footprint:** generator peaks ~140 MB heap (customer-table buffer). App-runtime memory: both tenant caches resident ~50 MB heap; negligible vs Next.js baseline.
- **Toggle latency:** hard reload (~1.2 s on local dev, ~600 ms on prod build). No async fetch needed.

---

## 12. Future hooks (3rd-tenant readiness)

Design choices that make a future `uk_apparel` or `au_grocery` cheap to add:

1. **Tenant ID enumeration lives in one place.** `TenantId` union in `src/app/context/TenantContext.tsx` is the single source — add `"uk_apparel"` to the union and the `TENANTS` record; everywhere else type-checks via the union.
2. **Cache directory naming.** Today: `cache/` (default grocery) and `cache/apparel/`. **Recommended refactor before adding tenant #3:** move grocery into `cache/india_grocery/` and update grocery imports — leaves a clean `cache/<tenant_id>/...` scheme. Defer the rename until tenant #3 is greenlit so we don't churn the grocery codebase preemptively.
3. **Per-tenant constants modules:** `scripts/lib/apparel-constants.ts` is the pattern. Tenant #3 gets `scripts/lib/<tenant>-constants.ts`. Generator dispatches by tenant id.
4. **Per-tenant palette files:** `src/app/lib/palette-<tenant>.ts`. Charts read via tenant context.
5. **What breaks if we don't plan now:**
   - Hard-coded `if (tenant === "us_apparel")` branches scattered through chart components will multiply combinatorially. Mitigation: do all tenant-specific lookups through a single `tenantConfig(tenant)` helper that returns palette + formatters + label maps. **Recommend introducing this helper now** even with only 2 tenants — it costs ~1 hour and saves a full day of grep-replace at tenant #3.
   - Bundle bloat: cache files all bundled in. At tenant #3 we should switch to `dynamic import()` per tenant.
   - Chat prompts: today branched in `route.ts`. A `prompts/<tenant>-<module>.ts` convention scales; document it now.

---

**End of spec.** Sign-off required from: Product, Engineering Lead, Chat/AI owner before generator implementation begins.
