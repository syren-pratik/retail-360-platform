# CX360 - Customer Analytics Platform

## Executive Summary

CX360 is a comprehensive customer analytics and demand forecasting platform built with modern web technologies. It provides real-time insights into customer behavior, lifetime value, churn prediction, and demand planning through an intuitive dashboard interface with AI-powered natural language querying.

---

## Platform Overview

| Attribute | Details |
|-----------|---------|
| **Platform Type** | Web-based Analytics Dashboard |
| **Tech Stack** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Visualization** | Recharts, Custom Components |
| **AI Integration** | Claude API with Generative UI |
| **Data Format** | JSON (Cache Layer), SQL-ready Schema |

---

## Module 1: Customer 360 (CX360)

### Key Performance Indicators (KPIs)

The CX360 module displays four primary KPI cards with real-time metrics:

| KPI | Description | Visualization |
|-----|-------------|---------------|
| **Total Customers** | Active customer count with period comparison | Sparkline trend |
| **Average CLV** | Mean customer lifetime value (12-month) | Sparkline trend |
| **Churn Rate** | 90-day churn probability percentage | Sparkline trend (inverted) |
| **Active Rate** | Percentage of customers active in last 30 days | Sparkline trend |

Each KPI includes:
- Current period value
- Prior period comparison (% change)
- 12-point sparkline trend visualization
- Color-coded change indicators (green/red)

---

### Visualizations & Charts

#### 1. CLV Distribution by Tier
- **Type:** Vertical Bar Chart
- **Metrics:** Customer count per CLV tier (Platinum, Gold, Silver, Bronze, At-Risk)
- **Interactivity:** Click-to-drill-down, hover tooltips
- **Data Points:** Customer count, average CLV, total CLV, average frequency, average recency

#### 2. RFM Scatter Plot
- **Type:** Scatter Plot with quadrants
- **Axes:** Recency (days) vs Purchase Frequency
- **Bubble Size:** CLV value representation
- **Color Coding:** By CLV tier
- **Interactivity:** Hover to see customer details, click to navigate to customer profile

#### 3. Churn Risk Distribution
- **Type:** Donut Chart
- **Segments:** High, Medium, Low, Minimal risk tiers
- **Metrics:** Customer count, average 30/60/90-day churn probability
- **Interactivity:** Click to filter dashboard by risk tier

#### 4. Churn Drivers Analysis
- **Type:** Horizontal Bar Chart
- **Data:** Top features influencing churn prediction
- **Metrics:** Feature importance score, direction (positive/negative impact)
- **Use Case:** Identify actionable factors to reduce churn

#### 5. Cohort Retention Heatmap
- **Type:** Matrix Heatmap
- **Dimensions:** Cohort month (rows) x Retention period (columns)
- **Color Scale:** Green (high retention) to Red (low retention)
- **Metrics:** Retention rate percentage, original/retained customer counts

#### 6. Segment Migration Flow
- **Type:** Sankey-style Flow Diagram
- **Data:** Customer movement between segments over time
- **Metrics:** Flow count, percentage of segment
- **Summary:** Upgraded, stable, downgraded, churned counts

#### 7. Revenue Concentration (Pareto)
- **Type:** Combo Chart (Area + Line)
- **Visualization:** Cumulative revenue curve with 80/20 markers
- **Metrics:** Revenue by percentile, Gini coefficient
- **Insight:** Shows revenue concentration among top customers

#### 8. Revenue by Segment
- **Type:** Stacked Bar Chart
- **Segments:** Customer segments (Premium, Loyal, Regular, Occasional, New)
- **Metrics:** Revenue amount, revenue percentage, customer count

#### 9. Recency Distribution
- **Type:** Histogram Bar Chart
- **Buckets:** Days since last purchase (0-7, 8-14, 15-30, 31-60, 61-90, 90+)
- **Metrics:** Customer count, percentage distribution

#### 10. Frequency Distribution
- **Type:** Histogram Bar Chart
- **Buckets:** Purchase frequency ranges (1, 2-3, 4-6, 7-12, 13+)
- **Metrics:** Customer count, percentage distribution

#### 11. Basket Size Distribution
- **Type:** Vertical Bar Chart
- **Buckets:** Average basket value ranges
- **Metrics:** Customer count, average value per bucket

#### 12. Category Preference by Segment
- **Type:** Grouped Bar Chart
- **Dimensions:** Customer segment x Top categories
- **Metrics:** Customer count, average spend per category

#### 13. Channel Performance
- **Type:** Multi-metric Bar Chart
- **Channels:** Online, In-Store, Mobile App
- **Metrics:** Customers, orders, revenue, AOV, conversion rate, retention rate

#### 14. Acquisition by Channel
- **Type:** Donut Chart
- **Metrics:** New customer acquisition by channel
- **Additional:** CAC (Customer Acquisition Cost), LTV:CAC ratio

---

### Customer Detail Page (`/cx360/customer/[id]`)

Individual customer profiles with:

| Section | Data Points |
|---------|-------------|
| **Profile Header** | Customer ID, segment, loyalty tier, status badge |
| **CLV Metrics** | 12-month CLV, CLV tier, probability alive score |
| **Churn Risk** | 30/60/90-day churn probability, risk tier |
| **Transaction Summary** | Total spend, transaction count, average basket |
| **Behavioral Data** | Days since last purchase, preferred channel, top category |
| **Purchase History** | Timeline of recent transactions |

---

### At-Risk Customer Alerts

Real-time alert system showing:
- High-value customers with elevated churn risk
- Recommended intervention actions
- Revenue at risk calculations
- Priority-based sorting (High/Medium/Low)

---

## Module 2: Demand Forecasting

### Key Performance Indicators (KPIs)

| KPI | Description |
|-----|-------------|
| **Forecast Accuracy** | Overall MAPE (Mean Absolute Percentage Error) |
| **Demand Coverage** | Percentage of demand fulfilled vs. total |
| **Lost Sales** | Revenue lost due to stockouts |
| **Active SKUs** | Number of products with active forecasts |

---

### Visualizations & Charts

#### 1. Forecast vs Actual Trend
- **Type:** Combo Line Chart
- **Lines:** Actual demand, forecasted demand, confidence bands
- **Time Range:** Last 30-90 days
- **Interactivity:** Hover for daily details

#### 2. Accuracy Trend
- **Type:** Line Chart with threshold markers
- **Metrics:** Daily/weekly MAPE percentage
- **Benchmark Lines:** Target accuracy thresholds

#### 3. Accuracy Heatmap by Department
- **Type:** Matrix Heatmap
- **Dimensions:** Department x Time period
- **Color Scale:** Green (high accuracy) to Red (low accuracy)
- **Metrics:** MAPE, bias percentage

#### 4. Demand Decomposition
- **Type:** Stacked Area Chart with Line Overlay
- **Components:** Baseline, Trend, Seasonality, Promotion Lift
- **Toggle:** Daily / Weekly / Monthly aggregation
- **Overlay:** Total demand line

#### 5. Hourly Demand Heatmap
- **Type:** Matrix Heatmap
- **Dimensions:** Day of week (7) x Hour of day (17 hours: 6AM-10PM)
- **Color Scale:** Intensity-based demand visualization
- **Use Case:** Staffing and inventory planning

#### 6. Monthly Demand by Category/Geography
- **Type:** Grouped Bar Chart (toggle view)
- **View 1 - Category:** Monthly demand by product category
- **View 2 - Geography:** Demand by region/city
- **Interactivity:** Click to drill down by dimension

#### 7. Lost Sales Trend
- **Type:** Stacked Area Chart
- **Segments:** Fulfilled demand vs. Lost sales
- **Metrics:** Daily values, lost percentage
- **Time Range:** Last 30 days

#### 8. Lost Sales - Top SKUs
- **Type:** Horizontal Bar Chart
- **Ranking:** Top 10 SKUs by lost revenue
- **Data:** SKU name, lost units, lost revenue, stockout days, reason
- **Navigation:** Click to view product detail

#### 9. Feature Importance (Global)
- **Type:** Horizontal Bar Chart
- **Data:** ML model feature importance scores
- **Categories:** Time Series, Calendar, Product, Marketing, Weather, Store, Competition
- **Interactivity:** Click to ask AI about feature

#### 10. Feature Importance by Department
- **Type:** Grouped Bar Chart
- **Dimensions:** Department x Top 5 features
- **Use Case:** Department-specific driver analysis

#### 11. Model Comparison
- **Type:** Radar Chart + Data Table
- **Models:** LightGBM, XGBoost, Prophet, ARIMA, Neural Network
- **Metrics:** MAPE, Accuracy, RMSE, MAE, Training Time
- **Indicators:** Active model badge, best-in-metric highlighting

#### 12. SKU Forecast Table
- **Type:** Interactive Data Table
- **Features:**
  - Search by SKU/name
  - Sort by any column
  - Pagination (20 per page)
  - CSV export
  - Click to navigate to product detail
- **Columns:** SKU, Name, Department, ABC Class, 7-day Forecast, Actual, Accuracy, Bias, Trend, Stock Days

---

### Product Detail Page (`/demand/product/[sku]`)

Individual SKU forecasting view with:

| Section | Visualizations |
|---------|----------------|
| **Header** | SKU info, department, ABC class, status |
| **KPI Cards** | 7-day forecast, accuracy, bias, stock days |
| **Forecast Chart** | 60-day history + 14-day forecast with confidence bands |
| **Store Breakdown** | Bar chart of demand by store location |
| **Hourly Patterns** | Mini heatmap for the specific SKU |
| **Store Table** | Detailed metrics per store |

---

## AI Chat Assistant

### Capabilities

The integrated AI assistant supports natural language queries with generative UI responses:

| Feature | Description |
|---------|-------------|
| **Natural Language Queries** | Ask questions in plain English |
| **Generative UI** | Dynamic chart/table generation based on query |
| **Context Awareness** | Module-specific responses (CX360 vs Demand) |
| **SQL Generation** | Converts questions to SQL (with valid API key) |

### Supported UI Components

| Component Type | Use Case |
|----------------|----------|
| **Bar Chart** | Categorical comparisons |
| **Line Chart** | Time series trends |
| **Donut Chart** | Proportion/distribution |
| **Data Table** | Detailed records |
| **KPI Card** | Single metric highlight |
| **Comparison View** | Multi-item comparison |

### Example Queries

**CX360 Module:**
- "Which segment has the highest churn?"
- "What's the average CLV by tier?"
- "Show cohort retention analysis"
- "How is each channel performing?"
- "Which customers are at risk?"
- "Show me the RFM analysis"
- "What's the average basket value?"
- "Show monthly revenue trends"

**Demand Module:**
- "What's the forecast accuracy for Dairy?"
- "Which SKUs have the most lost sales?"
- "Show me the demand forecast for next 14 days"
- "Which model is performing best?"
- "What are the peak demand hours?"
- "How are promotions performing?"
- "Which stores are performing best?"
- "What's the inventory health status?"

---

## Interactive Features

### Global Filtering

| Filter | Options |
|--------|---------|
| **Date Range** | Last 7 days, 30 days, 90 days, YTD, Custom |
| **Customer Segment** | All, Premium, Loyal, Regular, Occasional, New |
| **Loyalty Tier** | All, Platinum, Gold, Silver, Bronze |
| **Channel** | All, Online, In-Store |
| **Department** | All, Grocery, Dairy, Beverages, Snacks, Personal Care |

### Drill-Down System

- Click any chart element to add a drill-down filter
- Active filters shown as removable chips
- Toggle behavior (click again to remove)
- "Clear All" option for quick reset
- Filters persist across chart interactions

### Chart Expansion

- All charts support fullscreen modal view
- Expanded view includes:
  - Larger visualization
  - Raw data table
  - Export options

### Customer/Product Search

- Global search in header
- Real-time filtering
- Navigate directly to detail pages

---

## Technical Architecture

### Data Layer

```
cache/
├── cx360_kpis.json              # KPI metrics
├── cx360_clv_distribution.json  # CLV tier data
├── cx360_rfm_sample.json        # RFM scatter data
├── cx360_churn_risk.json        # Churn distribution
├── cx360_churn_drivers.json     # Feature importance
├── cx360_cohort_retention.json  # Retention matrix
├── cx360_customer_table.json    # Customer records
├── demand_kpis.json             # Demand metrics
├── demand_forecast_actual.json  # Forecast data
├── demand_accuracy_trend.json   # Accuracy metrics
└── ... (additional cache files)
```

### API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | AI chat with SQL generation |
| `/api/demand/decomposition` | GET | Demand decomposition data |
| `/api/demand/hourly-heatmap` | GET | Hourly demand patterns |
| `/api/demand/lost-sales` | GET | Lost sales metrics |
| `/api/demand/model-comparison` | GET | Model performance data |
| `/api/demand/sku-table` | GET | SKU forecast table |
| `/api/demand/feature-importance` | GET | ML feature importance |

### State Management

- **DashboardContext:** Global filters, drilldowns, expanded charts
- **DemandContext:** Demand-specific filters and state
- **React State:** Component-level interactivity

---

## Insight Engine

Automated insight generation based on data analysis:

### CX360 Insights
- Segment health alerts
- Churn risk warnings
- CLV tier shifts
- Retention anomalies

### Demand Insights
- Accuracy degradation alerts
- Lost sales warnings
- Model performance comparisons
- Stockout risk indicators

### Severity Levels
- **Critical:** Immediate attention required
- **Warning:** Monitor closely
- **Info:** Informational insights

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.x |
| **Styling** | Tailwind CSS 3.x |
| **Charts** | Recharts 2.x |
| **Icons** | Lucide React |
| **AI** | Anthropic Claude API |
| **Notifications** | Sonner (Toast) |
| **State** | React Context API |

---

## Deployment Requirements

| Requirement | Specification |
|-------------|---------------|
| **Node.js** | v18+ |
| **Package Manager** | npm / yarn / pnpm |
| **Environment Variables** | `ANTHROPIC_API_KEY` (optional) |
| **Build Command** | `npm run build` |
| **Start Command** | `npm run start` |

---

## Future Roadmap

- [ ] Real-time data streaming
- [ ] Advanced ML model management
- [ ] Custom dashboard builder
- [ ] Export to PDF/Excel
- [ ] Scheduled report generation
- [ ] Multi-tenant support
- [ ] Role-based access control

---

## Screenshots

*Note: Screenshots can be added to a `/docs/images` folder and referenced here.*

1. CX360 Dashboard Overview
2. Demand Forecasting Dashboard
3. Customer Detail Page
4. Product Detail Page
5. AI Chat with Generative UI
6. Expanded Chart Modal

---

## Contact & Support

For questions or feature requests, please contact the development team.

---

*Document Version: 1.0*
*Last Updated: April 2026*
