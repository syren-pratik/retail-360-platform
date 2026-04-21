# Demand Forecasting Module - Feature Documentation

## Overview

The Demand Forecasting module provides AI-powered demand prediction, inventory optimization, and supply chain analytics for retail operations. It enables data-driven decisions for stock management, promotional planning, and operational efficiency.

**Primary Users:** Supply Chain Managers, Demand Planners, Category Managers, Store Operations, Data Scientists

---

## Table of Contents

1. [Dashboard Overview](#1-dashboard-overview)
2. [KPI Cards](#2-kpi-cards)
3. [Forecast Alerts](#3-forecast-alerts)
4. [Forecast vs Actual Analysis](#4-forecast-vs-actual-analysis)
5. [Accuracy Analysis](#5-accuracy-analysis)
6. [Demand Anomaly Detection](#6-demand-anomaly-detection)
7. [Demand Decomposition](#7-demand-decomposition)
8. [Festival & Event Calendar](#8-festival--event-calendar)
9. [Hourly Demand Patterns](#9-hourly-demand-patterns)
10. [Category & Geography Analysis](#10-category--geography-analysis)
11. [Store-Level Analytics](#11-store-level-analytics)
12. [Lost Sales Analysis](#12-lost-sales-analysis)
13. [Feature Importance](#13-feature-importance)
14. [Model Comparison](#14-model-comparison)
15. [SKU Forecast Table](#15-sku-forecast-table)
16. [Product Detail Page](#16-product-detail-page)
17. [Filtering System](#17-filtering-system)
18. [Technical Architecture](#18-technical-architecture)

---

## 1. Dashboard Overview

**Location:** `src/app/demand/page.tsx`, `src/app/demand/components/DemandDashboardContent.tsx`

### What It Does
- Comprehensive demand forecasting dashboard
- Real-time forecast vs actual comparison
- Multi-dimensional accuracy analysis
- Store and SKU-level drill-downs

### Business Problems Solved
- Reduces stockouts by up to 30%
- Minimizes excess inventory costs
- Improves forecast accuracy over time
- Enables proactive inventory decisions

### Data Sources
| Cache File | Purpose |
|------------|---------|
| `demand_kpis.json` | Summary metrics |
| `demand_forecast_vs_actual.json` | Time series data |
| `demand_accuracy_by_dept.json` | Department accuracy |
| `demand_accuracy_trend.json` | Weekly accuracy trend |
| `demand_alerts.json` | Actionable alerts |
| `demand_decomposition.json` | Demand components |
| `demand_hourly_heatmap.json` | Hourly patterns |
| `demand_monthly_cat_geo.json` | Category/geography |
| `demand_lost_sales.json` | Stockout impact |
| `demand_feature_importance.json` | Model features |
| `demand_model_comparison.json` | Model performance |
| `demand_sku_table.json` | SKU-level forecasts |
| `demand_festivals.json` | Festival calendar |
| `demand_by_store.json` | Store demand |
| `demand_store_accuracy.json` | Store accuracy |
| `demand_anomalies.json` | Anomaly detection |

---

## 2. KPI Cards

**Location:** `src/app/demand/components/DemandDashboardContent.tsx`

### Metrics Displayed

| KPI | Icon | Description | Color |
|-----|------|-------------|-------|
| **Forecast Accuracy** | Target | Overall accuracy % | Emerald |
| **MAPE** | Activity | Mean Absolute % Error | Amber |
| **Stockout Rate** | AlertTriangle | % of stockout events | Rose |
| **Excess Inventory %** | Package | Overstock percentage | Indigo |

### Additional Information
- Model version badge (e.g., "v3.2.1")
- Last updated timestamp
- Coverage percentage (% of SKUs tracked)
- Total SKUs tracked count

### Trend Indicators
- Percentage change vs prior period
- Up/Down arrows with color coding
- Green = improvement, Red = deterioration

### Business Value
- Instant health check on forecast performance
- Early warning for accuracy degradation
- Tracks inventory efficiency metrics

---

## 3. Forecast Alerts

**Location:** `src/app/demand/components/DemandDashboardContent.tsx`

### Alert Types

| Type | Severity | Description | Example |
|------|----------|-------------|---------|
| `stockout_risk` | Critical/Warning | Imminent stockout | "Amul Butter 500g - 2 days stock remaining" |
| `forecast_deviation` | Warning/Critical | Accuracy deterioration | "MAPE increased to 18.5% from 12.3%" |
| `excess_inventory` | Warning | Overstock situation | "21 days stock vs 14-day target" |
| `demand_spike` | Warning/Info | Unexpected demand surge | "Sales 23% above forecast" |
| `model_update` | Info/Warning | Model changes | "New model version deployed" |
| `seasonality` | Info | Seasonal pattern detected | "Holiday season demand pattern" |

### Alert Information
- Severity badge (CRITICAL/WARNING/INFO)
- SKU and department
- Metric value
- Recommended action
- Timestamp (IST format)

### User Interactions
- View all alerts button
- Dismiss individual alerts
- Click for detailed information

### Business Value
- Proactive inventory management
- Prevents revenue loss from stockouts
- Reduces carrying costs from overstock

---

## 4. Forecast vs Actual Analysis

**Location:** `src/app/demand/components/ForecastVsActual.tsx`

### Visualization
- **Chart Type:** ComposedChart with multiple layers
- **Time Range:** 60 days history + 14 days forecast
- **Reference Line:** Today marker (dashed)

### Data Elements

| Element | Color | Description |
|---------|-------|-------------|
| Forecast Line | Indigo | Predicted demand |
| Actual Line | Emerald | Real sales (historical) |
| Confidence Interval | Shaded | 95% confidence bounds |

### Features
- Hover tooltip with formatted values
- Interactive dots (4px, expand to 5px on hover)
- Legend with human-readable names
- Expandable to full-screen modal

### Formatting
- Dates: "D MMM" (e.g., "15 Jan")
- Values: K/M notation (1K = 1000)
- Responsive container

### Business Problems Solved
- Visualizes forecast accuracy over time
- Shows confidence bounds for risk assessment
- Identifies systematic over/under-forecasting
- Tracks forecast performance trends

---

## 5. Accuracy Analysis

### 5.1 Accuracy by Department

**Location:** `src/app/demand/components/AccuracyHeatmap.tsx`

#### Table Columns

| Column | Description | Color Coding |
|--------|-------------|--------------|
| Department | Department name | Clickable |
| Accuracy | Forecast accuracy % | Green (≥95%) to Red (<88%) |
| MAPE | Mean Absolute % Error | Green (≤6%) to Red (>12%) |
| Bias | Systematic error | Green (≤2%) to Red (>4%) |
| SKUs | Count in department | Number |
| Trend | Week-over-week change | Arrow + % |

#### Color Thresholds - Accuracy
| Range | Color | Status |
|-------|-------|--------|
| ≥95% | Green | Excellent |
| ≥92% | Light Green | Good |
| ≥90% | Amber | Fair |
| ≥88% | Amber Dark | Warning |
| <88% | Red | Poor |

#### Color Thresholds - MAPE
| Range | Color | Status |
|-------|-------|--------|
| ≤6% | Green | Excellent |
| ≤8% | Emerald | Good |
| ≤10% | Amber | Fair |
| ≤12% | Amber Dark | Warning |
| >12% | Red | Poor |

#### User Interactions
- Click row to filter dashboard by department
- Hover for row highlight
- Sorted by accuracy (descending)

### 5.2 Accuracy Trend Chart

**Location:** `src/app/demand/components/AccuracyTrend.tsx`

#### Visualization
- **Type:** ComposedChart with dual Y-axes
- **Left Y-Axis:** Accuracy % (85-100% domain)
- **Right Y-Axis:** MAPE/Bias % (0-15% domain)

#### Data Series
| Series | Color | Type | Y-Axis |
|--------|-------|------|--------|
| Accuracy | Green | Line | Left |
| MAPE | Amber | Bars | Right |
| Bias | Rose | Dashed Line | Right |

### Business Problems Solved
- Department-level performance tracking
- Identifies departments needing attention
- Tracks improvement over time
- Detects systematic bias issues

---

## 6. Demand Anomaly Detection

**Location:** `src/app/demand/components/DemandAnomalies.tsx`

### Anomaly Types

| Type | Icon | Color | Description |
|------|------|-------|-------------|
| `spike` | ArrowUp | Red | Unexpected demand increase |
| `drop` | ArrowDown | Amber | Unexpected demand decrease |
| `trend_change` | Activity | Blue | Pattern change detected |

### Anomaly Card Information
- Type badge with icon
- Magnitude percentage (+/-)
- Forecasted flag (if model predicted)
- Category and store location
- Date detected
- Likely cause (AI-generated)

### Summary Statistics
- Total anomalies count
- Average magnitude %
- Forecasted vs unforecasted split
- Type breakdown

### User Interactions
- Dismiss individual anomalies
- Expand to view all
- Click for details

### Business Problems Solved
- Early detection of unusual patterns
- Validates model prediction capability
- Explains demand variance
- Enables rapid response

---

## 7. Demand Decomposition

**Location:** `src/app/demand/components/DemandDecomposition.tsx`

### Visualization
- **Type:** Stacked AreaChart with line overlay
- **Components:** Baseline, Trend, Seasonal, Promotion

### Decomposition Components

| Component | Color | Description |
|-----------|-------|-------------|
| Baseline | Gray | Base demand level |
| Trend | Blue | Long-term direction |
| Seasonal | Teal | Repeating patterns |
| Promotion | Purple | Promo-driven uplift |
| Total | Black Line | Actual total demand |

### Aggregation Options
| Level | Format | Use Case |
|-------|--------|----------|
| Daily | "15 Jan" | Detailed analysis |
| Weekly | "W3 Jan" | Week patterns |
| Monthly | "Jan 2024" | Long-term trends |

### Business Problems Solved
- Understands demand drivers
- Isolates seasonal patterns
- Measures promotion impact
- Identifies baseline demand

---

## 8. Festival & Event Calendar

**Location:** `src/app/demand/components/FestivalDemandCalendar.tsx`

### Layout
- **Left Column:** Calendar view (current month)
- **Right Column:** Upcoming events list

### Calendar View Features
- Festival dates highlighted with colors
- Color by expected demand lift:
  - Red: ≥60% lift (high impact)
  - Orange: 40-60% (medium)
  - Yellow: 20-40% (low-medium)
  - Green: <20% (low)
- Today highlighted with accent ring
- Hover shows festival details

### Upcoming Events Information
| Field | Description |
|-------|-------------|
| Festival Name | Event name |
| Date | Formatted date |
| Regions | Affected regions (map icon) |
| Expected Lift | Colored badge (%) |
| Categories | Top 3 affected categories |

### Past Festival Impact
- Last 5 festivals
- Actual vs forecast lift comparison
- Accuracy status (Accurate/Under/Over forecast)

### Business Problems Solved
- Plans inventory around festivals
- Tracks festival forecast accuracy
- Identifies regional/category impacts
- Improves future planning

---

## 9. Hourly Demand Patterns

**Location:** `src/app/demand/components/HourlyDemandHeatmap.tsx`

### Visualization
- **Type:** Heatmap table
- **Rows:** Days (Monday-Sunday)
- **Columns:** Hours (6 AM - 10 PM)
- **Values:** Demand units

### Color Intensity Scale
| Level | Color | Description |
|-------|-------|-------------|
| Very Low | Blue-50 | Lowest demand |
| Low | Blue-100 | Below average |
| Medium-Low | Blue-200 | Slightly below |
| Medium-High | Blue-400 | Above average |
| Very High | Blue-600 | Peak demand |

### Features
- Values shown when >30% of max
- Hover shows full value
- Click for day/hour drill-down

### Business Problems Solved
- Identifies peak shopping hours
- Day-of-week patterns
- Staffing optimization
- Time-based inventory allocation

---

## 10. Category & Geography Analysis

**Location:** `src/app/demand/components/MonthlyCatGeo.tsx`

### Two Views (Toggle)

#### View 1: By Category
- X-Axis: Months
- Grouped bars per category
- Up to 5 categories shown
- Click to filter by month

#### View 2: By Geography
- X-Axis: Regions
- Stacked bars (cities within region)
- Up to 4 cities shown
- Click to filter by region

### Color Palette
| Index | Color | Use |
|-------|-------|-----|
| 1 | Indigo | Primary category/city |
| 2 | Blue | Secondary |
| 3 | Green | Tertiary |
| 4 | Amber | Fourth |
| 5 | Red | Fifth |

### Business Problems Solved
- Category performance tracking
- Geographic demand distribution
- Seasonal category patterns
- Regional planning insights

---

## 11. Store-Level Analytics

### 11.1 Store Demand Heatmap

**Location:** `src/app/demand/components/StoreDemandHeatmap.tsx`

#### Visualization
- **Rows:** Top 12 stores (by total demand)
- **Columns:** Departments
- **Values:** Average daily demand

#### Color Scale
| Demand Level | Color |
|--------------|-------|
| Low | Blue-50 |
| Medium-Low | Blue-200 |
| Medium-High | Blue-400 |
| High | Blue-500 |
| Very High | Blue-700 |

#### Features
- Click cell to filter by store + department
- Sticky left column (store names)
- City shown below store name
- Expandable view

### 11.2 Store Accuracy Comparison

**Location:** `src/app/demand/components/StoreAccuracyComparison.tsx`

#### Summary Pills
| Category | Color | Threshold |
|----------|-------|-----------|
| Good | Green | <10% MAPE |
| Warning | Amber | 10-15% MAPE |
| Poor | Red | >15% MAPE |

#### Bar Chart
- Type: Horizontal bars
- Shows: Top 10 worst-performing stores
- Reference lines at 10% and 15% MAPE
- Color-coded by performance

#### Stores Needing Attention
- Alert banner for stores with MAPE >12%
- Lists top 3 store names
- "+N more" indicator

### Business Problems Solved
- Identifies high-demand stores
- Store-department performance comparison
- Efficient stock allocation
- Identifies training/improvement needs

---

## 12. Lost Sales Analysis

### 12.1 Lost Sales Trend

**Location:** `src/app/demand/components/LostSalesTrend.tsx`

#### Visualization
- **Type:** Stacked AreaChart
- **Green Area:** Fulfilled sales
- **Red Area:** Lost sales (stockouts)

#### Tooltip Information
- Fulfilled amount (green)
- Lost sales amount (red)
- Percentage lost (red text)

#### Formatting
- Y-Axis: Indian currency (₹XXL for lakhs)
- Dates: "15 Jan" format

### 12.2 Top SKUs by Lost Revenue

**Location:** `src/app/demand/components/LostSalesTopSKUs.tsx`

#### Visualization
- **Type:** Horizontal bar chart
- **Shows:** Top 10 SKUs by lost revenue
- **Color:** Rose gradient (light to dark)

#### Tooltip Details
| Field | Description |
|-------|-------------|
| Product Name | Full name |
| SKU | Product code |
| Department | Category |
| Lost Revenue | ₹ amount |
| Lost Units | Quantity missed |
| Stockout Days | Duration |
| Reason | Root cause |

#### User Interactions
- Click bar → Navigate to product detail

### Business Problems Solved
- Tracks opportunity cost of stockouts
- Identifies high-impact lost sales
- Prioritizes inventory focus
- Root cause analysis

---

## 13. Feature Importance

### 13.1 Global Feature Importance

**Location:** `src/app/demand/components/FeatureImportanceGlobal.tsx`

#### Visualization
- **Type:** Horizontal bar chart
- **Shows:** Top 12 features by importance

#### Feature Categories & Colors
| Category | Color | Examples |
|----------|-------|----------|
| Time Series | Indigo | Lag 7/14 sales |
| Calendar | Blue | Day of week, Month |
| Product | Green | Price |
| Marketing | Amber | Promotion flag |
| Weather | Cyan | Temperature |
| Store | Purple | Store size |
| Competition | Red | Competitor price |

#### User Interactions
- Click bar → Trigger AI chat question
- Auto-generates: "Tell me more about how '[feature]' affects demand forecasting"

### 13.2 Feature Importance by Department

**Location:** `src/app/demand/components/FeatureImportanceByDept.tsx`

#### Visualization
- **Type:** Grouped bar chart
- **X-Axis:** Top 5 features
- **Groups:** Department bars

#### Departments Shown
- Grocery (Indigo)
- Dairy (Blue)
- Beverages (Green)
- Snacks (Amber)
- Personal Care (Pink)

### Business Problems Solved
- Understands demand drivers
- Guides data collection priorities
- Validates business assumptions
- Department-specific insights

---

## 14. Model Comparison

**Location:** `src/app/demand/components/ModelComparison.tsx`

### Visualization
- **Type:** Radar chart + Metrics table
- **Models:** Toggle buttons for selection
- **Active Indicator:** Green dot

### Radar Chart Metrics
| Metric | Interpretation |
|--------|----------------|
| MAPE | Inverted (lower better) |
| Accuracy | Direct (higher better) |
| RMSE | Inverted (lower better) |
| MAE | Inverted (lower better) |

### Metrics Table
- Model name with active indicator
- MAPE % (best highlighted)
- Accuracy % (best highlighted)
- RMSE value (best highlighted)

### Business Problems Solved
- Compares model versions
- Validates algorithm improvements
- Data-driven model selection
- Tracks model evolution

---

## 15. SKU Forecast Table

**Location:** `src/app/demand/components/SKUForecastTable.tsx`

### Features

#### Search & Filter
- Real-time search (SKU, name, department)
- Auto-resets pagination

#### Table Columns

| Column | Sortable | Format | Description |
|--------|----------|--------|-------------|
| SKU | Yes | Mono | Product ID |
| Product | Yes | Text | Name |
| Dept | Yes | Abbrev | Department |
| ABC | Yes | Badge | Class (A/B/C) |
| Forecast (7d) | Yes | Number | 7-day forecast |
| Actual (7d) | Yes | Number | Actual sales |
| Accuracy | Yes | Badge | Color-coded % |
| Bias | Yes | +/- % | Over/under |
| Trend | Yes | Icon | Direction |
| Stock Days | Yes | Number | Inventory days |

#### ABC Class Colors
| Class | Color | Description |
|-------|-------|-------------|
| A | Emerald | High volume |
| B | Amber | Medium volume |
| C | Gray | Low volume |

#### Accuracy Colors
| Range | Color |
|-------|-------|
| ≥97% | Emerald |
| ≥94% | Amber |
| <94% | Rose |

#### Stock Days Warning
- <5 days: Red text, bold (critical)

#### Pagination
- 20 rows per page
- Previous/Next navigation
- "Showing X-Y of Z" count

#### Export
- CSV download button
- All filtered data included

#### Row Interactions
- Click row → Navigate to product detail

### Business Problems Solved
- Full SKU-level visibility
- Identifies attention needed
- Tracks per-product accuracy
- Spots inventory shortage risks

---

## 16. Product Detail Page

**Location:** `src/app/demand/product/[id]/ProductDetailContent.tsx`

### Page Sections

#### 16.1 Header
- Back button to dashboard
- Export button (JSON format)

#### 16.2 Product Header Card
- Package icon
- SKU and product name
- Department badge
- Subcategory badge
- ABC Class badge
- Trend indicator

#### 16.3 KPI Cards
| KPI | Description |
|-----|-------------|
| Avg Daily Demand | Mean units/day |
| Forecast Accuracy | Product accuracy % |
| Trend | Up/Down/Stable |
| Confidence | Model confidence % |

#### 16.4 Forecast vs Actual Chart
- 60 days history + 14 days forecast
- Forecast line (indigo)
- Actual line (emerald, stops at today)
- Confidence interval (shaded)

#### 16.5 Store Breakdown
- Top 8 stores by demand
- Horizontal bars
- Color by confidence (green/amber/red)
- Tooltip shows store location

#### 16.6 Top Feature Drivers
- Top 5 features for this SKU
- Importance percentage

#### 16.7 Seasonality Pattern (Heatmap)
- 7 days × 17 hours (6 AM - 10 PM)
- Peak times highlighted:
  - 9-11 AM: 1.3x
  - 12-1 PM: 1.5x (lunch)
  - 6-8 PM: 1.8x (evening)

#### 16.8 Store-Level Forecast Table
| Column | Description |
|--------|-------------|
| Store | Store name |
| City | Location |
| Region | Geographic region |
| Forecast | Predicted demand |
| Confidence | Model confidence % |
| Top Features | Key drivers (tags) |

### Business Problems Solved
- Deep-dive SKU analysis
- Store-level demand variations
- Optimal ordering timing
- Feature-based insights
- Export for inventory systems

---

## 17. Filtering System

**Location:** `src/app/demand/components/DemandFilterBar.tsx`, `src/app/context/DemandContext.tsx`

### Available Filters

| Filter | Type | Options |
|--------|------|---------|
| Date Range | Date Picker | Start/End dates |
| Region | Cascading | All regions |
| State | Cascading | States in region |
| City | Cascading | Cities in state |
| Department | Dropdown | 10 departments |
| ABC Class | Dropdown | All/A/B/C |
| Forecast Horizon | Dropdown | 7/14/30 days |

### Filter Behavior
- Cascading geography (Region → State → City)
- Charts respond to filter changes
- Active drilldowns displayed as pills
- Individual drilldown removal
- "Clear all" option

### Default Values
- Date range: Last 90 days + 30 days future
- Forecast horizon: 14 days
- All other filters: All/Empty

### Business Problems Solved
- Multi-dimensional analysis
- Geographic drill-downs
- ABC-based prioritization
- Flexible time horizons

---

## 18. Technical Architecture

### State Management
**Context:** `src/app/context/DemandContext.tsx`

```typescript
interface DemandFilters {
  dateRange: [string, string]
  regions: string[]
  states: string[]
  cities: string[]
  departments: string[]
  stores: string[]
  abcClass: 'all' | 'A' | 'B' | 'C'
  modelVersion: 'all' | string
  storeType: 'all' | string
  forecastHorizon: 7 | 14 | 30
}

interface DemandDrilldown {
  source: string
  field: string
  value: string
  label: string
}
```

### Data Types
**Location:** `src/app/lib/demand-types.ts`

**Key Interfaces:**
- `DemandKPIs` - Summary metrics
- `ForecastDataPoint` - Daily forecast
- `DepartmentAccuracy` - Dept-level stats
- `DecompositionData` - Demand components
- `HourlyHeatmapPoint` - Hourly patterns
- `LostSalesItem` - Stockout details
- `FeatureImportance` - Model features
- `ModelComparison` - Model metrics
- `SKUForecast` - SKU-level data
- `DemandAlert` - Alert structure
- `FestivalData` - Event calendar
- `DemandAnomaly` - Anomaly detection

### API Routes
**Location:** `src/app/api/demand/`

| Route | Data Source |
|-------|-------------|
| `/api/demand/kpis` | demand_kpis.json |
| `/api/demand/forecast` | demand_forecast_vs_actual.json |
| `/api/demand/accuracy-by-dept` | demand_accuracy_by_dept.json |
| `/api/demand/accuracy-trend` | demand_accuracy_trend.json |
| `/api/demand/alerts` | demand_alerts.json |
| `/api/demand/decomposition` | demand_decomposition.json |
| `/api/demand/hourly-heatmap` | demand_hourly_heatmap.json |
| `/api/demand/monthly-cat-geo` | demand_monthly_cat_geo.json |
| `/api/demand/lost-sales` | demand_lost_sales.json |
| `/api/demand/feature-importance` | demand_feature_importance.json |
| `/api/demand/model-comparison` | demand_model_comparison.json |
| `/api/demand/sku-table` | demand_sku_table.json |
| `/api/demand/festivals` | demand_festivals.json |
| `/api/demand/store-demand` | demand_by_store.json |
| `/api/demand/store-accuracy` | demand_store_accuracy.json |
| `/api/demand/anomalies` | demand_anomalies.json |

### Chat Integration
- Feature importance bars trigger AI questions
- Auto-fills contextual prompts
- Integrates with dashboard chat system

---

## Feature Summary Matrix

| Feature | Location | Primary Users | Key Benefit |
|---------|----------|---------------|-------------|
| KPI Cards | Dashboard | Managers | Health overview |
| Forecast Alerts | Dashboard | Operations | Proactive response |
| Forecast vs Actual | Chart | Planners | Accuracy tracking |
| Dept Accuracy | Heatmap | Category Mgrs | Dept performance |
| Accuracy Trend | Chart | Data Science | Improvement tracking |
| Anomaly Detection | Card | Operations | Pattern alerts |
| Decomposition | Chart | Analysts | Driver analysis |
| Festival Calendar | Card | Planners | Event planning |
| Hourly Patterns | Heatmap | Store Ops | Time optimization |
| Category/Geo | Chart | Regional Mgrs | Distribution view |
| Store Demand | Heatmap | Logistics | Allocation |
| Store Accuracy | Chart | Regional Leads | Performance |
| Lost Sales | Charts | Revenue Team | Opportunity cost |
| Feature Importance | Charts | Data Scientists | Model insights |
| Model Comparison | Radar | ML Engineers | Model selection |
| SKU Table | Table | Planners | SKU details |
| Product Detail | Page | Analysts | Deep dive |

---

## Business Problems Solved Summary

1. **Inventory Optimization**
   - Stockout prevention
   - Excess inventory reduction
   - Safety stock optimization

2. **Forecast Accuracy**
   - Department-level tracking
   - Model performance monitoring
   - Continuous improvement

3. **Operational Planning**
   - Festival-aware planning
   - Hourly staffing optimization
   - Store-level allocation

4. **Revenue Protection**
   - Lost sales quantification
   - High-impact SKU focus
   - Root cause analysis

5. **Model Management**
   - Version comparison
   - Feature importance
   - Algorithm validation

6. **Geographic Strategy**
   - Regional demand patterns
   - Store performance
   - Expansion planning
