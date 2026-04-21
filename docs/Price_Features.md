# Price Intelligence Module - Feature Documentation

## Overview

The Price Intelligence module provides comprehensive AI-powered pricing recommendations, competitive analysis, elasticity modeling, A/B testing, markdown management, and promotional planning for retail environments.

**Primary Users:** Pricing Analysts, Category Managers, Revenue Managers, Merchandising Teams, Commercial Directors

---

## Table of Contents

1. [Dashboard Overview](#1-dashboard-overview)
2. [Price Filter Bar](#2-price-filter-bar)
3. [Price KPI Cards](#3-price-kpi-cards)
4. [Price Alerts Panel](#4-price-alerts-panel)
5. [Recommendation Summary](#5-recommendation-summary)
6. [Price Waterfall Chart](#6-price-waterfall-chart)
7. [Revenue Impact Scatter](#7-revenue-impact-scatter)
8. [Margin Distribution](#8-margin-distribution)
9. [Cost Passthrough Analysis](#9-cost-passthrough-analysis)
10. [Price A/B Tests](#10-price-ab-tests)
11. [Markdown Performance](#11-markdown-performance)
12. [Markdown Recovery Trend](#12-markdown-recovery-trend)
13. [Promo Calendar](#13-promo-calendar)
14. [Price Recommendation Table](#14-price-recommendation-table)
15. [Product Price Table](#15-product-price-table)
16. [Product Detail Page](#16-product-detail-page)
17. [Price Simulator](#17-price-simulator)
18. [Competitor Comparison](#18-competitor-comparison)
19. [Demand Curve Analysis](#19-demand-curve-analysis)
20. [Price History Chart](#20-price-history-chart)
21. [Promo History Table](#21-promo-history-table)
22. [AI Chat Integration](#22-ai-chat-integration)
23. [Technical Architecture](#23-technical-architecture)

---

## 1. Dashboard Overview

**Location:** `src/app/price/page.tsx`, `src/app/price/components/PriceDashboardContent.tsx`

### What It Does
- Central hub for all pricing intelligence and optimization
- Real-time AI-powered price recommendations
- Multi-dimensional filtering by department, category, and priority
- Interactive decision support workflow (Accept/Reject/Override)
- Comprehensive promotional planning and markdown management

### Business Problems Solved
- Eliminates manual pricing decisions prone to bias
- Optimizes margin while maintaining competitiveness
- Reduces markdown losses through intelligent clearance
- Provides elasticity-aware pricing recommendations
- Enables data-driven promotional planning

### Data Sources
| Cache File | Purpose |
|------------|---------|
| `price_kpis.json` | Overall pricing performance metrics |
| `price_recommendations.json` | AI-generated price recommendations |
| `price_alerts.json` | Critical pricing alerts |
| `price_products.json` | Full product price catalog |
| `price_margin_distribution.json` | Margin tier analysis |
| `price_cost_passthrough.json` | Cost absorption analysis |
| `price_ab_tests.json` | A/B test results |
| `price_markdown.json` | Markdown clearance data |
| `price_promo_calendar.json` | Promotional planning data |

---

## 2. Price Filter Bar

**Location:** `src/app/price/components/PriceFilterBar.tsx`

### Filter Dimensions

| Filter | Options | Description |
|--------|---------|-------------|
| **Department** | All, Grocery, Electronics, Apparel, etc. | Business unit filter |
| **Category** | All + department-specific | Product category within department |
| **Price Action** | All, Increase, Decrease, No Change | Filter by recommendation direction |
| **Priority** | All, High, Medium, Low | Recommendation urgency |
| **Elasticity** | All, Elastic (>1), Unit (=1), Inelastic (<1) | Price sensitivity filter |

### Features
- Cascading filters (category updates based on department)
- Real-time result count display
- Clear all filters option
- Active filter chips showing current selections

### Business Value
- Focus on high-priority pricing opportunities
- Segment analysis by business unit
- Target elastic vs inelastic products differently

---

## 3. Price KPI Cards

**Location:** `src/app/price/components/PriceKPICards.tsx`

### Metrics Displayed

| KPI | Description | Format | Trend Indicator |
|-----|-------------|--------|-----------------|
| **Revenue Impact** | Projected revenue gain from recommendations | Currency (₹ Cr/L/K) | Sparkline + % change |
| **Current Margin** | Average margin across filtered products | Percentage | Sparkline + trend |
| **Projected Margin** | Expected margin after implementing recommendations | Percentage | Green = improvement |
| **Promo ROI** | Return on investment from promotions | Ratio (x) | Sparkline + trend |
| **Competitive Index** | Price position vs competitors (100 = parity) | Index | Lower is better |

### Features
- 12-point sparkline trend visualization
- Period-over-period comparison
- Color-coded indicators (green = good for most, inverted for competitive index)
- Formatted display (₹ Cr for crores, ₹ L for lakhs)

### Business Value
- Instant executive summary of pricing health
- Track improvement trajectory over time
- Identify margin erosion early

---

## 4. Price Alerts Panel

**Location:** `src/app/price/components/PriceAlerts.tsx`

### Alert Types

| Type | Severity | Example Trigger |
|------|----------|-----------------|
| **Critical** | Red | Competitor undercut by >15%, margin below cost |
| **Warning** | Amber | Elasticity threshold breach, promotion overlap |
| **Info** | Blue | Price test completed, recommendation available |

### Features
- Dismissible alerts (persisted locally)
- Expandable list (show 3 by default)
- Revenue impact displayed per alert
- Category/product tagging
- Related chart linking

### Business Value
- Immediate visibility into pricing emergencies
- Prioritized action list for pricing analysts
- Prevents revenue loss from delayed reactions

---

## 5. Recommendation Summary

**Location:** `src/app/price/components/RecommendationSummary.tsx`

### Summary Cards

| Card | Metrics Shown |
|------|---------------|
| **Price Increases** | Count, Average % increase, Total revenue impact |
| **Price Decreases** | Count, Average % decrease, Total revenue impact |
| **No Change** | Count, Explanation (optimal pricing) |

### Features
- Visual border indicators (green/red/gray)
- Aggregated revenue impact
- Clear action breakdown

### Business Value
- Executive snapshot of pricing opportunities
- Balance between increases and decreases
- Revenue impact quantification

---

## 6. Price Waterfall Chart

**Location:** `src/app/price/components/PriceWaterfall.tsx`

### What It Does
- Visualizes top 10 products by revenue impact
- Horizontal bar chart showing current vs recommended price
- Color-coded bars (green = increase, red = decrease)
- Dashed reference lines for current prices

### Interaction
- Hover for detailed tooltip (current, recommended, change %, impact)
- Click to navigate to product detail page

### Business Value
- Identifies highest-value pricing opportunities
- Clear visualization of price change magnitude
- Prioritizes analyst attention

---

## 7. Revenue Impact Scatter

**Location:** `src/app/price/components/RevenueImpactScatter.tsx`

### What It Does
- Scatter plot: X-axis = Price Change %, Y-axis = Revenue Impact
- Bubble size = Transaction volume
- Color by priority (Red = High, Amber = Medium, Green = Low)
- Quadrant analysis (increase/decrease × gain/loss)

### Features
- Reference lines at 0 for both axes
- Quadrant labels for decision guidance
- Click to product detail
- Priority-based coloring

### Business Value
- Portfolio view of all recommendations
- Identify high-volume, high-impact opportunities
- Visual risk assessment

---

## 8. Margin Distribution

**Location:** `src/app/price/components/MarginDistribution.tsx`

### What It Does
- Shows distribution of products across margin buckets
- Compares current vs projected (after implementing recommendations)
- Buckets: <5%, 5-10%, 10-15%, 15-20%, 20-25%, 25%+

### Features
- Bar chart (current) + line overlay (projected)
- Shift insight text showing improvement
- Color gradient by margin tier

### Business Value
- Visualize margin improvement opportunity
- Track portfolio margin health
- Identify low-margin products at scale

---

## 9. Cost Passthrough Analysis

**Location:** `src/app/price/components/CostPassthrough.tsx`

### What It Does
- Analyzes how much of cost increases are passed to consumers
- Shows cost change % vs price change % by category
- Calculates passthrough rate (price change / cost change × 100)
- Identifies margin erosion

### Features
- Dual bar chart (cost vs price increases)
- Line overlay for passthrough rate
- Color-coded dots (green ≥80%, amber ≥50%, red <50%)
- Reference line at 100% passthrough

### Business Value
- Identify categories absorbing costs (margin erosion)
- Benchmark passthrough across categories
- Prioritize price corrections

---

## 10. Price A/B Tests

**Location:** `src/app/price/components/PriceABTests.tsx`

### What It Does
- Tracks active and completed price experiments
- Compares control vs test performance
- Shows statistical significance
- Declares winners with confidence

### Test Metrics

| Metric | Description |
|--------|-------------|
| **Control Price** | Original price point |
| **Test Price** | Experimental price point |
| **Control Qty** | Units sold at control price |
| **Test Qty** | Units sold at test price |
| **Volume Lift** | % change in quantity sold |
| **Revenue Lift** | % change in revenue |
| **Significance** | Statistical confidence (95%, 90%, etc.) |
| **Winner** | Test, Control, or Inconclusive |

### Features
- Summary stats (test wins, control wins, avg lift)
- Detailed results table
- Visual comparison charts
- Running vs completed status badges

### Business Value
- Validate pricing hypotheses before rollout
- Quantify price sensitivity empirically
- Reduce risk of pricing mistakes

---

## 11. Markdown Performance

**Location:** `src/app/price/components/MarkdownPerformance.tsx`

### What It Does
- Tracks clearance speed of marked-down products
- Distribution across time buckets (0-7d, 8-14d, 15-30d, >30d)
- Recovery rate by bucket

### Summary Metrics

| Metric | Description |
|--------|-------------|
| **Total SKUs** | Products on markdown |
| **Avg Recovery** | % of original value recovered |
| **Stuck >30d** | Products failing to clear |

### Features
- Color-coded bars by clearance speed
- Recovery rate labels
- Summary stat panel

### Business Value
- Optimize markdown depth
- Identify stuck inventory
- Improve working capital efficiency

---

## 12. Markdown Recovery Trend

**Location:** `src/app/price/components/MarkdownRecovery.tsx`

### What It Does
- Tracks cumulative recovery vs target over time
- Area chart showing recovery progression
- Gap analysis vs target value

### Features
- Progress bar visualization
- Weekly trend data
- Reference line for target
- Gap display (unrecovered value)

### Business Value
- Track clearance program effectiveness
- Forecast final recovery rate
- Adjust markdown strategy mid-course

---

## 13. Promo Calendar

**Location:** `src/app/price/components/PromoCalendar.tsx`

### What It Does
- 12-week promotional planning grid
- Category × Week matrix
- Interactive promo creation/editing

### Promo Types

| Type | Color | Description |
|------|-------|-------------|
| **Flat Discount** | Blue | 5%, 10%, 15%, 20%, 25% off |
| **BOGO** | Purple | Buy one get one |
| **Bundle** | Green | Multi-product bundles |
| **Cashback** | Amber | Cashback offers |
| **Combo** | Teal | Combination deals |

### Features
- Click-to-edit popover
- Auto-calculated expected lift
- Local storage persistence
- Current week highlighting
- Promo count per category

### Business Value
- Visual promotional planning
- Prevent promo overlap conflicts
- Forecast promotional lift

---

## 14. Price Recommendation Table

**Location:** `src/app/price/components/PriceRecommendationTable.tsx`

### Columns Displayed

| Column | Description |
|--------|-------------|
| **Product** | Name and ID |
| **Department** | Business unit |
| **Current Price** | Active selling price |
| **Recommended** | AI-suggested price |
| **Change %** | Price change percentage |
| **Revenue Impact** | Projected revenue change |
| **Priority** | High/Medium/Low |
| **Actions** | Accept/Override/Reject |

### Features
- Multi-column sorting
- Full-text search
- Bulk selection and accept
- CSV export
- Pagination (15 per page)
- Override with custom price
- Rejection with reason selection

### Business Value
- Workflow tool for pricing decisions
- Audit trail of actions
- Bulk processing efficiency

---

## 15. Product Price Table

**Location:** `src/app/price/components/ProductPriceTable.tsx`

### Extended Columns

| Column | Description |
|--------|-------------|
| **Product ID** | Unique identifier |
| **Product Name** | Full product name |
| **Department** | Business unit |
| **Current Price** | Active price |
| **Cost Price** | Unit cost |
| **Margin %** | Current margin percentage |
| **Elasticity** | Price elasticity coefficient |
| **Competitor Avg** | Average competitor price |
| **Competitive Index** | Price position (100 = parity) |
| **Recommended** | AI recommendation |
| **Change %** | Direction and magnitude |
| **Priority** | Action urgency |
| **Status** | Pending/Accepted/Rejected/Overridden |

### Features
- Click row to navigate to product detail
- Department and priority filters
- Status tracking with PriceContext
- Color-coded margin/elasticity/index indicators

### Business Value
- Comprehensive product pricing view
- Filter to specific opportunities
- Track decision history

---

## 16. Product Detail Page

**Location:** `src/app/price/product/[id]/page.tsx`, `ProductPricingDetailContent.tsx`

### Page Sections

| Section | Description |
|---------|-------------|
| **Header** | Product ID, name, department, category, priority badge |
| **KPI Cards** | Current price, recommended, margin, elasticity, competitive index |
| **AI Recommendation** | Natural language pricing rationale |
| **Price History** | 12-month price trend chart |
| **Demand Curve** | Price-volume-revenue relationship |
| **Price Simulator** | Interactive what-if tool |
| **Competitor Comparison** | Competitive positioning chart |
| **Promo History** | Past promotion performance |
| **Price Details Table** | Comprehensive pricing breakdown |

### Features
- Export to JSON
- Back to dashboard navigation
- All charts with tooltips

### Business Value
- Deep dive into single product pricing
- Comprehensive context for decisions
- Historical performance analysis

---

## 17. Price Simulator

**Location:** `src/app/price/components/PriceSimulator.tsx`

### What It Does
- Interactive price sensitivity tool
- Slider from cost to MRP
- Real-time metric recalculation using elasticity formula

### Elasticity Formula
```
new_demand = current_demand × (1 + elasticity × (price_change_pct / 100))
```

### Projected Metrics

| Metric | Description |
|--------|-------------|
| **Volume/Day** | Projected daily units |
| **Revenue/Day** | Projected daily revenue |
| **Margin %** | New margin at simulated price |
| **Profit/Day** | Projected daily profit |
| **Annual Revenue** | 365-day projection |
| **Annual Profit** | 365-day profit projection |

### Features
- Price slider with cost/MRP bounds
- Reset to current price
- Set to AI recommendation
- Manual price input
- Elasticity explanation

### Business Value
- Test pricing scenarios safely
- Understand elasticity impact
- Optimize price for different objectives (volume vs margin)

---

## 18. Competitor Comparison

**Location:** `src/app/price/components/CompetitorComparison.tsx`

### What It Does
- Horizontal bar chart comparing your price vs competitors
- Sorted by price (low to high)
- Visual reference line for your price

### Competitive Position Labels

| Position | Criteria | Badge Color |
|----------|----------|-------------|
| **Price Leader** | >5% below avg | Green |
| **Competitive** | Within 2% of avg | Blue |
| **Premium** | 2-8% above avg | Amber |
| **High Premium** | >8% above avg | Red |

### Summary Stats

| Stat | Description |
|------|-------------|
| **Your Price** | Current selling price |
| **Competitor Avg** | Average competitor price |
| **Price Index** | Your price / avg × 100 |

### Business Value
- Understand competitive positioning
- Identify pricing power opportunities
- Monitor competitor reactions

---

## 19. Demand Curve Analysis

**Location:** `src/app/price/components/DemandCurveChart.tsx`

### What It Does
- Visualizes price-volume-revenue relationship
- Shows demand (units) and revenue across price points
- Highlights optimal price point for revenue maximization
- Marks current price for comparison

### Features
- Dual Y-axis (demand units, revenue ₹)
- Area chart for revenue
- Line for demand
- Reference dots for optimal and current
- Elasticity badge (Elastic/Inelastic/Unit)

### Business Value
- Visualize revenue-maximizing price
- Understand demand sensitivity
- Quantify gap to optimal

---

## 20. Price History Chart

**Location:** `src/app/price/components/PriceHistoryChart.tsx`

### What It Does
- 12-month price history visualization
- Multiple lines: Your price, Competitor avg, Cost
- Reference line for recommended price

### Features
- Monthly granularity
- Tooltip with all values
- Trend identification
- Cost floor visualization

### Business Value
- Historical context for pricing decisions
- Track pricing consistency
- Identify past pricing actions

---

## 21. Promo History Table

**Location:** `src/app/price/components/PromoHistoryTable.tsx`

### Columns Displayed

| Column | Description |
|--------|-------------|
| **Promo Type** | BOGO, Flat %, Bundle, etc. |
| **Period** | Start and end dates |
| **Discount** | Discount percentage |
| **Volume Lift** | % increase in units sold |
| **Revenue** | Total promo revenue |
| **ROI** | Return on investment |
| **Cannibalization** | Sales stolen from regular |

### Features
- Performance badges (Good/Fair/Poor ROI)
- Sortable columns
- Historical trend analysis

### Business Value
- Learn from past promotions
- Identify effective promo types
- Avoid repeating mistakes

---

## 22. AI Chat Integration

**Location:** `schema/ai_chat_system_prompt.md`, `src/app/api/chat/route.ts`

### Pricing-Related Tables

| Table | Description |
|-------|-------------|
| **product_prices** | Current and recommended prices |
| **price_recommendations** | AI recommendations with rationale |
| **price_elasticity** | Elasticity coefficients by category |
| **promo_performance** | Historical promotion results |
| **price_tests** | A/B test configurations and results |
| **markdown_items** | Clearance inventory tracking |

### Example Queries

| Natural Language | SQL Equivalent |
|------------------|----------------|
| "Show me products with >15% margin erosion" | SELECT * FROM product_prices WHERE margin_pct < cost_pct + 15 |
| "Which categories have elastic demand?" | SELECT * FROM price_elasticity WHERE elasticity < -1 |
| "What was the ROI of BOGO promotions?" | SELECT AVG(roi) FROM promo_performance WHERE type = 'BOGO' |
| "Design a price test for Tata Salt" | Generate A/B test configuration |

### Business Value
- Natural language pricing analysis
- Ad-hoc query capability
- AI-assisted strategy development

---

## 23. Technical Architecture

### State Management

**PriceContext** (`src/app/context/PriceContext.tsx`)

```typescript
interface PriceContextType {
  filters: PriceFilters;
  setFilters: (filters: PriceFilters) => void;
  recommendationActions: Record<string, RecommendationAction>;
  acceptRecommendation: (productId: string) => void;
  rejectRecommendation: (productId: string, reason: string) => void;
  overrideRecommendation: (productId: string, price: number) => void;
  getRecommendationAction: (productId: string) => RecommendationAction | undefined;
}
```

### Persistence
- Local Storage key: `price_recommendation_actions`
- Local Storage key: `price_promo_calendar_edits`

### Data Generation

**Location:** `src/app/lib/generate-product-pricing-detail.ts`

- Seeded random number generation for deterministic data
- Product-specific data derived from product_id hash
- Realistic pricing scenarios based on retail patterns

### Type System

**Location:** `src/app/lib/price-types.ts`

Key interfaces:
- `PriceKPIsData` - Dashboard KPI structure
- `PriceRecommendation` - AI recommendation structure
- `PriceProductRow` - Product table row
- `ABTest` - A/B test configuration and results
- `MarkdownData` - Clearance tracking
- `PromoCalendarItem` - Promotional planning

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/price/kpis` | GET | Fetch price KPIs |
| `/api/price/recommendations` | GET | Fetch recommendations |
| `/api/price/products` | GET | Fetch product table |
| `/api/price/ab-tests` | GET | Fetch A/B test data |
| `/api/price/markdown` | GET | Fetch markdown data |
| `/api/price/promo-calendar` | GET | Fetch promo calendar |

---

## Feature Matrix

| Feature | Status | Component | Data Source |
|---------|--------|-----------|-------------|
| AI Price Recommendations | Active | PriceRecommendationTable | price_recommendations.json |
| Price Simulator | Active | PriceSimulator | Dynamic calculation |
| A/B Testing | Active | PriceABTests | price_ab_tests.json |
| Promo Calendar | Active | PromoCalendar | price_promo_calendar.json |
| Markdown Management | Active | MarkdownPerformance | price_markdown.json |
| Competitor Analysis | Active | CompetitorComparison | Generated per product |
| Elasticity Analysis | Active | DemandCurveChart | Generated per product |
| Cost Passthrough | Active | CostPassthrough | price_cost_passthrough.json |
| Decision Workflow | Active | ProductPriceTable | LocalStorage |

---

## Business KPI Improvements

| Problem | Solution | Expected Improvement |
|---------|----------|---------------------|
| Manual pricing decisions | AI recommendations | 40% faster decisions |
| Margin erosion | Cost passthrough alerts | 2-3% margin recovery |
| Suboptimal promotions | Promo calendar + ROI tracking | 15% better promo ROI |
| Markdown losses | Recovery tracking | 20% better recovery |
| Competitive blindness | Competitor comparison | Price parity awareness |
| Untested price changes | A/B testing framework | Risk reduction |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open search |
| `Cmd/Ctrl + /` | Toggle chat panel |
| `Escape` | Close modals/popovers |

---

## Integration Points

### CX360 Module
- Customer price sensitivity by segment
- CLV-weighted pricing recommendations

### Demand Module
- Forecast impact of price changes
- Lost sales recovery through optimal pricing

### External Systems
- ERP price master sync
- Competitor price scraping
- POS transaction data

---

## Future Roadmap

1. **Dynamic Pricing Engine** - Real-time price adjustments
2. **Multi-channel Pricing** - Online vs offline differentiation
3. **Price Pack Architecture** - Pack size optimization
4. **Promotion Cannibalization** - Cross-product impact modeling
5. **Geographic Pricing** - Region-specific recommendations
