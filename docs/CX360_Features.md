# CX360 (Customer 360) Module - Feature Documentation

## Overview

The CX360 module provides comprehensive customer analytics, CLV (Customer Lifetime Value) analysis, churn prediction, and behavioral insights for business decision-making in retail environments.

**Primary Users:** Marketing Managers, Customer Success Teams, Retention Specialists, Business Analysts

---

## Table of Contents

1. [Dashboard Overview](#1-dashboard-overview)
2. [KPI Cards](#2-kpi-cards)
3. [At-Risk Customer Alerts](#3-at-risk-customer-alerts)
4. [AI Insights Engine](#4-ai-insights-engine)
5. [CLV Distribution Analysis](#5-clv-distribution-analysis)
6. [RFM Scatter Analysis](#6-rfm-scatter-analysis)
7. [Churn Risk Analysis](#7-churn-risk-analysis)
8. [Cohort Retention Heatmap](#8-cohort-retention-heatmap)
9. [Segment Migration Flow](#9-segment-migration-flow)
10. [Revenue Concentration (Pareto)](#10-revenue-concentration-pareto)
11. [Channel Performance](#11-channel-performance)
12. [Geographic Analysis](#12-geographic-analysis)
13. [Customer Table](#13-customer-table)
14. [Customer Detail Page](#14-customer-detail-page)
15. [Filtering System](#15-filtering-system)
16. [Technical Architecture](#16-technical-architecture)

---

## 1. Dashboard Overview

**Location:** `src/app/cx360/page.tsx`, `src/app/cx360/DashboardContent.tsx`

### What It Does
- Central hub for all customer analytics and insights
- Real-time data visualization across 16+ chart types
- Dynamic filtering with instant metric recalculation
- AI-powered insights with rule-based fallback

### Business Problems Solved
- Eliminates siloed customer data across departments
- Provides single source of truth for customer health
- Enables data-driven retention strategies
- Reduces time to insight from days to seconds

### Data Sources
| Cache File | Purpose |
|------------|---------|
| `cx360_kpis.json` | Overall performance metrics |
| `cx360_customer_table.json` | Individual customer records |
| `cx360_clv_distribution.json` | CLV tier distribution |
| `cx360_churn_risk.json` | Churn risk segments |
| `cx360_cohort_retention.json` | Cohort-based retention |
| `cx360_segment_migration.json` | Segment transitions |
| `cx360_revenue_concentration.json` | Pareto analysis |
| `cx360_channel_analysis.json` | Channel performance |
| `cx360_at_risk_alerts.json` | At-risk customers |
| `cx360_geography.json` | Geographic distribution |

---

## 2. KPI Cards

**Location:** `src/app/components/kpi/KPICard.tsx`

### Metrics Displayed

| KPI | Description | Format | Trend Indicator |
|-----|-------------|--------|-----------------|
| **Total Customers** | Filtered customer count | Number | Sparkline + % change |
| **Average CLV** | Mean customer lifetime value | Currency (₹) | Sparkline + % change |
| **Churn Rate** | Percentage at risk of churning | Percentage | Inverted (red = bad) |
| **Active Rate** | Customers active in last 30 days | Percentage | Green = good |

### Features
- 12-point sparkline trend visualization
- Period-over-period comparison
- Color-coded trend indicators (green/red)
- Shows filtered count vs total count

### Business Value
- Instant pulse check on customer health
- Early warning for deteriorating metrics
- Benchmarking against prior periods

---

## 3. At-Risk Customer Alerts

**Location:** `src/app/components/alerts/AtRiskAlerts.tsx`

### Alert Types

| Type | Trigger | Priority |
|------|---------|----------|
| `high_value_declining` | High CLV customer with declining engagement | Critical |
| `engagement_drop` | Significant drop in purchase frequency | High |
| `frequency_decline` | Reduced transaction frequency | Medium |
| `competitor_risk` | Behavior suggesting competitor switch | High |
| `satisfaction_drop` | Declining satisfaction indicators | Medium |
| `early_churn_signal` | Early indicators of churn | High |

### Alert Card Information
- Customer name and ID
- Current segment and CLV tier
- Churn probability percentage
- Days since last order
- Recommended action

### User Interactions
- Click alert → Detail modal with full customer info
- "View Customer" → Navigate to customer detail page
- "Ask AI" → Trigger context-aware chat message
- Dismiss alerts (session-based)

### Summary Statistics
- Total at-risk customers
- High/Medium/Low priority breakdown
- Total revenue at risk (in Crores)
- Average churn probability

### Business Value
- Proactive intervention before churn
- Prioritization by revenue impact
- Immediate action triggers for retention teams

---

## 4. AI Insights Engine

**Location:** `src/app/lib/insight-engine.ts`, `src/app/components/insights/InsightStrip.tsx`

### Insight Categories

| Type | Icon | Description |
|------|------|-------------|
| `trend` | TrendingUp | Emerging patterns in data |
| `anomaly` | AlertTriangle | Unusual deviations |
| `opportunity` | Lightbulb | Growth or improvement areas |
| `risk` | Shield | Potential threats |

### Severity Levels
- **Critical** (Red) - Immediate attention required
- **Warning** (Amber) - Needs monitoring
- **Info** (Blue) - Informational
- **Positive** (Green) - Good news

### Analysis Modules

1. **CLV Distribution Analysis**
   - Flags tier concentration >30%
   - Alerts if At-Risk is dominant segment
   - Recommends tier upgrade programs

2. **Churn Risk Analysis**
   - Flags if average 30d probability >25%
   - Warns if Critical+High >30%
   - Recommends retention measures

3. **Cohort Retention Analysis**
   - Identifies declining cohorts
   - Spots cohort recovery patterns
   - Suggests onboarding improvements

4. **Revenue Concentration Analysis**
   - Analyzes Pareto distribution
   - Warns if Gini coefficient >0.7
   - Recommends revenue diversification

5. **Segment Migration Analysis**
   - Detects net negative migrations
   - Flags high churn from specific tiers
   - Recommends upgrade programs

6. **Recency/Frequency Analysis**
   - Identifies dormant customers (>90 days)
   - Flags low frequency opportunity (≤3 orders)
   - Recommends engagement campaigns

7. **Channel Analysis**
   - Compares channel retention rates
   - Identifies multi-channel value lift
   - Recommends best ROI channels

8. **At-Risk Analysis**
   - Flags if revenue at risk >1 Cr
   - Recommends high-touch retention
   - Prioritizes urgent actions

### Business Value
- Automated pattern detection
- Prioritized action recommendations
- Reduces analyst workload
- Ensures no insights are missed

---

## 5. CLV Distribution Analysis

**Location:** `src/app/components/charts/CLVDistribution.tsx`

### Visualization
- **Chart Type:** Grouped bar chart
- **X-Axis:** CLV Tiers (Platinum, Gold, Silver, Bronze, At-Risk)
- **Y-Axis:** Customer count

### Metrics Per Tier
| Metric | Description |
|--------|-------------|
| Customer Count | Number of customers in tier |
| Average CLV | Mean lifetime value |
| Total CLV | Aggregate tier value |
| Avg Frequency | Purchase frequency |
| Avg Recency | Days since last purchase |

### User Interactions
- Click bars to filter dashboard by tier
- Toggle tier visibility via legend
- Expand to full-screen modal
- View raw data table

### Business Problems Solved
- Identifies customer value concentration
- Reveals tier distribution health
- Detects if At-Risk segment is growing
- Guides tier upgrade strategies

---

## 6. RFM Scatter Analysis

**Location:** `src/app/components/charts/RFMScatter.tsx`

### Visualization
- **Chart Type:** 3D scatter plot with bubble sizing
- **X-Axis:** Recency (days since last purchase)
- **Y-Axis:** Frequency (number of transactions)
- **Bubble Size:** Customer Lifetime Value
- **Color:** CLV Tier

### Color Coding
| Tier | Color |
|------|-------|
| Platinum | Blue |
| Gold | Yellow |
| Silver | Gray |
| Bronze | Brown |
| At-Risk | Red |

### User Interactions
- Click dots → Navigate to customer detail page
- Hover → See customer ID and metrics
- Filter by tier from CLV Distribution

### Business Problems Solved
- Visual identification of customer engagement patterns
- Spots high-value disengaged customers
- Shows customer lifecycle stages
- Enables targeted engagement strategies

---

## 7. Churn Risk Analysis

**Location:** `src/app/components/charts/ChurnRiskDonut.tsx`, `src/app/components/charts/ChurnDrivers.tsx`

### 7.1 Churn Risk Distribution (Donut)

**Tiers:**
| Tier | Color | Probability Range |
|------|-------|-------------------|
| Critical | Red (#EF4444) | >75% |
| High | Orange (#F97316) | 50-75% |
| Medium | Amber (#F59E0B) | 25-50% |
| Low | Green (#10B981) | <25% |

**Features:**
- Center shows total customer count
- Segment percentages on hover
- Click to filter by risk tier

### 7.2 Churn Drivers (Feature Importance)

**Visualization:** Horizontal bar chart

**Metrics:**
- Top 10 features influencing churn
- SHAP importance scores
- Direction indicator (increases/decreases churn)

**Colors:**
- Red bars → Increases churn probability
- Green bars → Decreases churn probability

**User Interactions:**
- Click bars to ask AI about the driver
- Integrates with chat panel

### Business Problems Solved
- Quick assessment of customer health
- Identifies urgency of retention efforts
- Explains what drives customer attrition
- Guides intervention strategy

---

## 8. Cohort Retention Heatmap

**Location:** `src/app/components/charts/CohortRetentionHeatmap.tsx`

### Visualization
- **Rows:** Acquisition cohorts (monthly)
- **Columns:** Months post-acquisition (M0, M1, M2, etc.)
- **Cell Values:** Retention percentages
- **Color Gradient:** Red (low) → Green (high)

### Color Scale
| Retention | Color |
|-----------|-------|
| <20% | Red (#EF4444) |
| 20-40% | Orange |
| 40-50% | Amber (#FCD34D) |
| 50-70% | Light Green |
| >70% | Green (#10B981) |

### Metrics Per Cohort
- Cohort month (acquisition period)
- Original customer count
- Retention rate per period

### User Interactions
- Click rows to filter by cohort
- Hover for detailed retention values
- Expand to full-screen view

### Business Problems Solved
- Tracks onboarding quality over time
- Identifies improving/declining cohorts
- Measures long-term retention patterns
- Guides product/marketing improvements

---

## 9. Segment Migration Flow

**Location:** `src/app/components/charts/SegmentMigration.tsx`

### Visualization
- **Type:** Flow transition matrix
- **Rows:** From segment
- **Columns:** To segment
- **Values:** Customer count and percentage

### Segments Tracked
- Champions (highest tier)
- Loyal
- Potential
- At Risk
- Lost (churned)

### Direction Indicators
| Movement | Color |
|----------|-------|
| Upgrade | Green |
| Stable | Gray |
| Downgrade | Red |

### Summary Statistics
- Total customers moved
- Upgraded count
- Stable count
- Downgraded count
- Churned count

### Business Problems Solved
- Shows customer lifecycle transitions
- Identifies problematic churn flows
- Measures program effectiveness
- Guides retention priorities

---

## 10. Revenue Concentration (Pareto)

**Location:** `src/app/components/charts/RevenuePareto.tsx`

### Visualization
- **Type:** Composed chart (bars + line)
- **Bars:** Incremental revenue per percentile
- **Line:** Cumulative revenue percentage

### Key Metrics
| Metric | Description |
|--------|-------------|
| Top 10% Revenue % | Revenue from top 10% customers |
| Top 20% Revenue % | Revenue from top 20% customers |
| Gini Coefficient | Inequality measure (0-1) |

### Interpretation
- Gini 0 = Perfectly equal distribution
- Gini 1 = Maximum concentration
- >0.7 = High concentration risk

### Business Problems Solved
- Quantifies revenue concentration
- Identifies concentration risk
- Shows customer value inequality
- Guides customer investment strategy

---

## 11. Channel Performance

**Location:** `src/app/components/charts/ChannelPerformance.tsx`, `src/app/components/charts/AcquisitionByChannel.tsx`

### 11.1 Channel Performance Metrics

| Metric | Description |
|--------|-------------|
| Customer Count | Customers per channel |
| Order Count | Transactions per channel |
| Revenue | Total revenue per channel |
| AOV | Average order value |
| Conversion Rate | Browse to purchase rate |
| Retention Rate | Customer retention by channel |

### 11.2 Acquisition by Channel

| Metric | Description |
|--------|-------------|
| Customers Acquired | New customers per channel |
| Acquisition % | Share of total acquisitions |
| CAC | Customer acquisition cost |
| LTV/CAC Ratio | Return on acquisition |

### Multi-Channel Analysis
- Single channel vs multi-channel CLV comparison
- 3+ channel customers have significantly higher CLV
- Cross-channel engagement recommendations

### Business Problems Solved
- Channel effectiveness comparison
- Identifies best-performing channel
- ROI analysis for acquisition
- Guides budget allocation

---

## 12. Geographic Analysis

**Location:** `src/app/components/charts/CustomersByGeography.tsx`, `src/app/components/charts/ChurnByCity.tsx`

### 12.1 Customers by Geography

**Metrics Per State:**
- Customer count
- Average CLV
- Average churn rate
- Total revenue

**Features:**
- Horizontal bar chart
- Click to filter by state
- Color intensity by CLV

### 12.2 Churn by City

**Metrics Per City:**
- Customer count
- Churn rate
- Store count
- Regional context

**Features:**
- Combo chart (bars + line)
- Red highlight on above-average churn
- Insight text below chart

### Business Problems Solved
- Geographic market analysis
- Regional performance comparison
- Identifies high-churn regions
- Guides local interventions

---

## 13. Customer Table

**Location:** `src/app/components/tables/CustomerTable.tsx`

### Columns

| Column | Sortable | Format |
|--------|----------|--------|
| Customer ID | Yes | Text (sticky) |
| Segment | Yes | Badge |
| Loyalty Tier | Yes | Badge |
| CLV 12m | Yes | Currency |
| Total Spend | Yes | Currency |
| Orders | Yes | Number |
| Avg Basket | Yes | Currency |
| Days Since Purchase | Yes | Number |
| Churn Risk | Yes | Colored badge |
| Preferred Channel | Yes | Text |
| Top Category | Yes | Text |

### Features
- 20 rows per page pagination
- Multi-column sorting
- Search by ID, segment, or category
- Row selection with checkboxes
- Export selected/all rows to CSV
- Click row → Customer detail page

### Risk Tier Colors
| Risk | Color |
|------|-------|
| Critical | Red |
| High | Orange |
| Medium | Amber |
| Low | Green |

### Business Problems Solved
- Full customer-level visibility
- Quick filtering and sorting
- Bulk export for campaigns
- Direct navigation to details

---

## 14. Customer Detail Page

**Location:** `src/app/cx360/customer/[id]/CustomerDetailContent.tsx`

### Page Sections

#### 14.1 Customer Header
- Customer ID and name
- Segment badge
- Loyalty tier badge
- CLV tier badge

#### 14.2 KPI Cards
| KPI | Description |
|-----|-------------|
| CLV 12m | Predicted lifetime value |
| Total Spend | Historical spend |
| Order Count | Total transactions |
| Avg Basket | Average order value |
| Churn Risk | Risk tier and probability |

#### 14.3 Purchase Timeline
- 12-month trend line chart
- Monthly spend visualization
- Trend direction indicator

#### 14.4 Category Spend Breakdown
- Horizontal bar chart
- Top categories by spend
- Percentage of total

#### 14.5 Channel Usage
- Donut chart
- Online vs In-Store split
- Preferred channel highlight

#### 14.6 Risk & Predictions
- Churn probability (30/60/90 day)
- Risk factors
- Probability trend

#### 14.7 AI Insights
- Customer-specific insights
- Personalized recommendations
- Behavioral patterns

#### 14.8 Next Best Actions
| Action Type | Description |
|-------------|-------------|
| `retain` | Retention actions for at-risk |
| `upsell` | Upgrade opportunities |
| `cross_sell` | Category expansion |
| `win_back` | Re-engagement for lapsed |
| `reward` | Loyalty recognition |

**Action Details:**
- Priority score
- Recommended channel
- Offer details
- Expected impact
- Urgency level

#### 14.9 Quick Actions
- Send Campaign
- Trigger Offer
- Assign Call
- Push Recommendation
- Add to Watch List

#### 14.10 Action History
- Past actions taken
- Timestamps
- Outcomes

#### 14.11 Recent Transactions
- Transaction table
- Date, amount, channel, category
- Last 10-20 transactions

### Business Problems Solved
- 360-degree customer view
- Personalized engagement strategies
- Action tracking and audit trail
- Unified customer intelligence

---

## 15. Filtering System

**Location:** `src/app/components/layout/TopFilterBar.tsx`, `src/app/context/DashboardContext.tsx`

### Available Filters

| Filter | Type | Options |
|--------|------|---------|
| Date Range | Preset | 7d, 30d, 90d, YTD |
| Segment | Multi-select | All segments |
| Loyalty Tier | Multi-select | Platinum, Gold, Silver, Bronze, None |
| Channel | Single | All, Online, In-Store |
| Region | Cascading | All regions |
| State | Cascading | States in selected regions |
| City | Cascading | Cities in selected states |
| Store | Multi-select | Specific stores |

### Filter Behavior
- Cascading geography (Region → State → City)
- Real-time metric recalculation
- Active filter chips display
- Individual filter removal
- Reset all button

### Chart Drilldowns
- Click chart elements to add filters
- Toggle behavior (click again to remove)
- Drilldowns shown as filter chips
- All charts respond to drilldowns

### Export Options
- Export as CSV
- Export KPIs as PDF
- Export filtered data
- Volume indicators

### Business Problems Solved
- Multi-dimensional analysis
- Geographic deep-dives
- Segment isolation
- Real-time metric updates

---

## 16. Technical Architecture

### State Management
**Context:** `src/app/context/DashboardContext.tsx`

```typescript
interface DashboardState {
  globalFilters: {
    dateRange: [Date, Date]
    segments: string[]
    loyaltyTiers: string[]
    channel: 'all' | 'online' | 'in-store'
    regions: string[]
    states: string[]
    cities: string[]
    stores: string[]
  }
  activeDrilldowns: ChartDrilldown[]
  selectedCustomerId: string | null
  expandedChart: string | null
  pendingChatMessage: string | null
}
```

### Data Flow
1. Server-side data loading from cache files
2. Data transformation via `cache-transform.ts`
3. Client-side filtering and recalculation
4. Real-time chart updates

### Performance Optimizations
- Server-side rendering for initial load
- Memoized components (useMemo, useCallback)
- Lazy loading for charts
- Pagination (20 rows/page)
- Static generation for customer detail pages

### Integration Points
| System | Integration |
|--------|-------------|
| Demand Module | Shared filter context |
| Price Module | Shared styling/theme |
| Chat/AI System | Insight triggers, questions |
| Customer Search | Navigation, quick links |
| Settings | Cache refresh, health status |

---

## Feature Summary Matrix

| Feature | Location | Primary Users | Key Benefit |
|---------|----------|---------------|-------------|
| KPI Cards | Dashboard | Executives | Quick pulse check |
| At-Risk Alerts | Dashboard | Retention Teams | Proactive intervention |
| AI Insights | Dashboard | Analysts | Automated pattern detection |
| CLV Distribution | Chart | Marketing | Value segmentation |
| RFM Scatter | Chart | CRM Teams | Engagement mapping |
| Churn Risk | Charts | Retention | Risk prioritization |
| Cohort Retention | Heatmap | Product Teams | Onboarding quality |
| Segment Migration | Flow | Strategy | Lifecycle tracking |
| Revenue Pareto | Chart | Finance | Concentration risk |
| Channel Performance | Charts | Marketing | Channel optimization |
| Geographic Analysis | Charts | Regional Managers | Territory insights |
| Customer Table | Table | Operations | Customer access |
| Customer Detail | Page | Account Managers | 360 view |
| Filtering | Global | All Users | Data exploration |

---

## Business Problems Solved Summary

1. **Customer Retention**
   - Early churn detection
   - At-risk prioritization
   - Intervention tracking

2. **Revenue Optimization**
   - CLV-based segmentation
   - Concentration risk management
   - Upgrade opportunity identification

3. **Channel Strategy**
   - Performance comparison
   - ROI analysis
   - Multi-channel value capture

4. **Operational Efficiency**
   - Unified customer view
   - Bulk operations
   - Automated insights

5. **Strategic Planning**
   - Cohort analysis
   - Geographic expansion
   - Segment migration tracking
