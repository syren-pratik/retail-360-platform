"use strict";(()=>{var e={};e.id=744,e.ids=[744],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},92048:e=>{e.exports=require("fs")},55315:e=>{e.exports=require("path")},88664:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>E,patchFetch:()=>D,requestAsyncStorage:()=>R,routeModule:()=>T,serverHooks:()=>O,staticGenerationAsyncStorage:()=>L});var a={};r.r(a),r.d(a,{POST:()=>I});var s=r(49303),o=r(88716),n=r(60670),i=r(87070),c=r(27293),l=r(35130),u=r(92048),p=r(55315),d=r.n(p),h=r(18405),m=r(66256),_=r(56847);let y=null,g="claude-sonnet-4-5-20250514";try{process.env.ANTHROPIC_API_KEY&&(process.env.AZURE_ENDPOINT?(y=new c.ZP({apiKey:process.env.ANTHROPIC_API_KEY,baseURL:process.env.AZURE_ENDPOINT}),g=process.env.AZURE_MODEL_NAME||"claude-sonnet-4-5",console.log("Using Azure AI Foundry endpoint")):(y=new c.ZP({apiKey:process.env.ANTHROPIC_API_KEY}),console.log("Using direct Anthropic API")))}catch{console.warn("Failed to initialize Anthropic client")}let f=[{name:"get_dashboard_data",description:`Fetch the EXACT data behind the dashboards — the same JSON the UI renders. ALWAYS prefer this over query_data for questions about anything visible in the app: Price Intelligence (margins, promos, markdowns, forecasts, departments, SKUs), Demand Planning, inventory, supply chain, or Customer 360 KPIs. The numbers returned match what the user sees on screen. Use dataset="list" to discover all available datasets.`,input_schema:{type:"object",properties:{dataset:{type:"string",description:'Dataset name, e.g. "price_intel_core", "merch_demand_core", "cx360_kpis", "inventory_alerts", "supply_kpis" — or "list" to enumerate all available datasets.'},section:{type:"string",description:"For price_intel_core / merch_demand_core only: which slice to fetch (price_intel_core sections: kpis, action_queue, promo, markdown, forecast, departments, skus). Required for those datasets to keep responses small."}},required:["dataset"]}},{name:"cx_lookup",description:"Look up customer 360 data: RFM segments, churn risk, top-CLV customers, cohort retention, or a single customer's 360 record. Live Databricks query against genome_customer_360. Use this for ANY customer question.",input_schema:{type:"object",properties:{scope:{type:"string",enum:["segment_summary","churn_risk","top_value","cohort","customer"],description:"segment_summary=aggregate by RFM; churn_risk=top at-risk; top_value=highest CLV; cohort=retention curves; customer=full single-customer record (needs customer_id)"},filter:{type:"object",properties:{rfm_segment:{type:"string"},churn_risk_tier:{type:"string",enum:["Very High","High","Medium","Low"]},clv_tier:{type:"string",enum:["Platinum","Gold","Silver","Bronze"]},city:{type:"string"},customer_id:{type:"string"}}},limit:{type:"number",description:"Max rows (default 50, capped at 500)"}},required:["scope"]}},{name:"inventory_status",description:"Live inventory state from Databricks: today's stockouts, replenishment recommendations, overstock, health by department, or per-SKU detail. Always pulls latest date_id automatically.",input_schema:{type:"object",properties:{scope:{type:"string",enum:["health_summary","stockouts_now","replenishment_needed","overstock","sku_lookup"]},filter:{type:"object",properties:{city:{type:"string"},store_type:{type:"string"},department:{type:"string"},abc_class:{type:"string",enum:["A","B","C"]},product_id:{type:"string"}}},limit:{type:"number",description:"Max rows (default 50, capped at 500)"}},required:["scope"]}},{name:"demand_lookup",description:"Live demand and forecast from Databricks: rolled-up sales, top-moving SKUs, ML forecasts with CIs, festival uplift, or a SKU's daily trend.",input_schema:{type:"object",properties:{scope:{type:"string",enum:["sales_summary","top_movers","forecast","festival_uplift","sku_trend"]},filter:{type:"object",properties:{department:{type:"string"},category_l1:{type:"string"},city:{type:"string"},state:{type:"string"},abc_class:{type:"string",enum:["A","B","C"]},product_id:{type:"string"},festival_name:{type:"string"},window_days:{type:"number",description:"Lookback window (default 7)"}}},limit:{type:"number",description:"Max rows (default 50, capped at 500)"}},required:["scope"]}},{name:"supplier_health",description:"Live supplier scorecard from Databricks: full OTIF table, underperformers (OTIF < X%), recent cost-change events, or one supplier's detail.",input_schema:{type:"object",properties:{scope:{type:"string",enum:["scorecard","underperformers","cost_changes","supplier_lookup"]},filter:{type:"object",properties:{supplier_id:{type:"string"},supplier_name:{type:"string"},max_on_time_pct:{type:"number",description:"For underperformers — threshold (default 75)"}}},limit:{type:"number"}},required:["scope"]}},{name:"price_intel_lookup",description:"Live pricing from Databricks: ML pricing recommendations ranked by revenue impact, elasticity ranking, competitive gaps (vs Blinkit/Zepto/etc.), promo effectiveness, or one SKU's full pricing picture.",input_schema:{type:"object",properties:{scope:{type:"string",enum:["recommendations","elasticity","competitive_gaps","promo_effectiveness","sku_pricing"]},filter:{type:"object",properties:{category_l1:{type:"string"},abc_class:{type:"string",enum:["A","B","C"]},product_id:{type:"string"},promo_id:{type:"string"},min_revenue_impact:{type:"number",description:"Absolute INR impact threshold"}}},limit:{type:"number"}},required:["scope"]}},{name:"query_data",description:"ESCAPE HATCH — raw SQL against Databricks. Use ONLY when none of the typed tools (cx_lookup, inventory_status, demand_lookup, supplier_health, price_intel_lookup) fit. Always use fully qualified table names (hive_metastore.schema.table). Always LIMIT 500.",input_schema:{type:"object",properties:{sql:{type:"string",description:"The SQL query. ALWAYS qualify tables with hive_metastore.schema.table. ALWAYS LIMIT 500."},explanation:{type:"string",description:"Brief explanation of what this query does"}},required:["sql","explanation"]}},{name:"propose_chart_options",description:`Propose 2-3 chart visualization options for the user to choose from.
      ALWAYS use this instead of directly creating a chart.
      Each option should be a different chart type or axis configuration that makes sense for the data.
      Include a small data preview with each option so the user can see what it will look like.
      The user will select one, then you render the full chart.`,input_schema:{type:"object",properties:{question:{type:"string",description:"What the user asked — restated clearly"},data_summary:{type:"string",description:'Brief description of the data returned (e.g., "5 segments with churn rates ranging 8-34%")'},options:{type:"array",items:{type:"object",properties:{option_id:{type:"string",description:"A, B, or C"},chart_type:{type:"string",enum:["bar_chart","horizontal_bar","line_chart","area_chart","donut_chart","scatter_chart","stacked_bar","grouped_bar","heatmap","data_table","kpi_card","treemap"],description:"Type of chart"},title:{type:"string",description:"Chart title"},description:{type:"string",description:"Why this visualization works for this data (1 sentence)"},axes:{type:"object",properties:{x:{type:"string",description:"What goes on X axis (or rows/slices)"},y:{type:"string",description:"What goes on Y axis (or values)"},color:{type:"string",description:"What determines color/grouping (optional)"}},description:"Axis descriptions"},preview_data:{type:"array",items:{type:"object"},description:"First 3-5 rows of data shaped for this chart type — enough for a meaningful mini preview"},full_data:{type:"array",items:{type:"object"},description:"Complete data for this chart"},config:{type:"object",properties:{x_key:{type:"string"},y_key:{type:"string"},name_key:{type:"string"},value_key:{type:"string"},stack_key:{type:"string"},color_key:{type:"string"},columns:{type:"array",items:{type:"string"}}},description:"Chart configuration"}},required:["option_id","chart_type","title","description","axes","preview_data","full_data","config"]},description:"2-3 chart options to propose"}},required:["question","data_summary","options"]}},{name:"render_selected_chart",description:'Render the full chart that the user selected from the proposed options. Only call this after the user has picked an option (e.g., "I\'ll go with Option A").',input_schema:{type:"object",properties:{option_id:{type:"string",description:"Which option the user selected (A, B, or C)"},chart_type:{type:"string",enum:["bar_chart","horizontal_bar","line_chart","area_chart","donut_chart","scatter_chart","stacked_bar","grouped_bar","heatmap","data_table","kpi_card","treemap"]},title:{type:"string",description:"Chart title"},data:{type:"array",items:{type:"object"},description:"Full data for the chart"},config:{type:"object",description:"Chart configuration"},insight:{type:"string",description:"A 1-2 sentence insight about what the data shows"}},required:["option_id","chart_type","title","data","config"]}},{name:"pin_to_dashboard",description:'Pin a chart to the main dashboard so it persists. Use when the user says "pin this", "add to dashboard", "save this chart", or "keep this".',input_schema:{type:"object",properties:{chart_id:{type:"string",description:"ID of the chart to pin (from a previous create_chart call)"},section:{type:"string",enum:["top","after_kpis","after_churn","after_cohort","bottom"],description:"Where on the dashboard to place it"},size:{type:"string",enum:["half","full"],description:"Half width (50%) or full width"}},required:["chart_id","section"]}},{name:"create_segment",description:"Create and save a customer segment based on filter rules. Use when the user describes a group of customers they want to target.",input_schema:{type:"object",properties:{name:{type:"string",description:"Segment name"},rules:{type:"array",items:{type:"object",properties:{field:{type:"string"},operator:{type:"string",enum:["eq","neq","gt","gte","lt","lte","between","in"]},value:{}}},description:"Filter rules defining the segment"},description:{type:"string",description:"What this segment represents"}},required:["name","rules"]}},{name:"set_alert",description:'Create a monitoring alert/rule that triggers when a metric crosses a threshold. Use when the user says "alert me", "notify me", "watch for", "monitor".',input_schema:{type:"object",properties:{name:{type:"string",description:"Alert name"},metric:{type:"string",description:'What metric to monitor (e.g., "churn_rate", "clv_avg", "segment_size")'},condition:{type:"string",enum:["above","below","change_by"],description:"Trigger condition"},threshold:{type:"number",description:"Threshold value"},segment_filter:{type:"string",description:'Optional: which segment to monitor (e.g., "Premium customers")'},frequency:{type:"string",enum:["daily","weekly","on_refresh"],description:"How often to check"}},required:["name","metric","condition","threshold"]}},{name:"run_nba",description:'Run Next-Best-Action analysis for a specific customer or a segment of customers. Use when the user asks "what should we do about X" or "recommend actions for Y".',input_schema:{type:"object",properties:{target_type:{type:"string",enum:["customer","segment"],description:"Whether targeting a single customer or a segment"},target_id:{type:"string",description:"Customer ID or segment name"},max_customers:{type:"number",description:"For segments: max customers to analyze (default 10)"}},required:["target_type","target_id"]}},{name:"export_data",description:'Generate a CSV export of data. Use when the user asks to "export", "download", "save as CSV", or "give me the data".',input_schema:{type:"object",properties:{data:{type:"array",items:{type:"object"},description:"Data to export"},filename:{type:"string",description:"Suggested filename (without extension)"},description:{type:"string",description:"What this export contains"}},required:["data","filename"]}},{name:"apply_dashboard_filter",description:'Apply a filter to the main dashboard. Use when the user says "show me only Premium customers" or "filter to Mumbai stores" while looking at the dashboard.',input_schema:{type:"object",properties:{filter_type:{type:"string",enum:["segment","loyalty_tier","channel","store","department","clv_tier","churn_risk_tier"]},value:{type:"string",description:"Filter value to apply"},action:{type:"string",enum:["add","remove","reset_all"],description:"Add filter, remove it, or reset all filters"}},required:["filter_type","value","action"]}}];function b(e,t="india_grocery"){return"us_retail"===t?`You are an AI analytics LEAD for Meridian Retail — a US general-merchandise retailer running 85 stores plus a full DTC site, mobile app, curbside program and marketplace listings.

## Domain framing — US general retail, USD

- ALL currency in $ (USD). NEVER use ₹, INR, lakhs, or crores.
- 7 departments with these margin floors: Electronics 12%, Apparel & Shoes 45%, Home & Garden 38%, Sports & Outdoor 35%, Beauty & Personal 48%, Grocery & Snacks 22%, Toys & Games 40%.
- Channels: In-Store, Online, App, Curbside, Marketplace.
- Key events: Memorial Day (May), Father's Day (Jun), July 4, Back-to-School (Aug), Labor Day (Sep), Halloween (Oct), Black Friday & Cyber Monday (Nov). Anchor date is 2026-05-17 so the season context is pre-Black-Friday build.
- Brands the catalogue carries include: Samsung, Apple, Sony, LG, Bose, Dell, Levi's, Nike, Adidas, Under Armour, Dyson, KitchenAid, Weber, L'Or\xe9al, Neutrogena, Coca-Cola, Frito-Lay, LEGO, Nintendo, Mattel — plus the Meridian private label.

NEVER use Indian-grocery vocabulary in this mode: no Diwali, no Eid, no Monsoon, no Tier-2 cities, no ₹, no lakhs/crores, no Mumbai/Bangalore.

## Your Capabilities (Tools) — IMPORTANT for us_retail mode

PRIMARY tool for this mode:
0. **get_dashboard_data** — Reads the US retail cache (cache/us_retail/*.json and cache/us_retail/price_intel/*). Numbers exactly match what is on the user's screen. **USE THIS FOR EVERY QUESTION.** Available datasets: price_intel_core, merch_demand_core, cx360_kpis, cx360_customer_table, cx360_churn_risk, cx360_at_risk_alerts, inventory_kpis, inventory_alerts, inventory_sku_table.

⚠️ DO NOT use these tools in us_retail mode — they query Indian-grocery Databricks and would return wrong data / wrong currency:
- cx_lookup, inventory_status, demand_lookup, supplier_health, price_intel_lookup, query_data

ACTION TOOLS: propose_chart_options, render_selected_chart, pin_to_dashboard, create_segment, set_alert, run_nba, export_data, apply_dashboard_filter.

## Chart Creation Protocol — MANDATORY
NEVER directly render a chart. ALWAYS propose 2-3 options first.
Format numbers nicely: $ for money, 1 decimal for %.

## Rules
- Numbers come from tool calls — never from memory.
- Use $ for all currency (USD), formatted en-US (e.g. $1,234,567 or $142K).
- Be specific with numbers — never vague.
- Frame everything in US retail context — brands, channels, holidays, departments.
- ALWAYS provide a short text summary along with any tool actions.
`:"cx360"===e&&"us_apparel"===t?`You are an AI customer analytics LEAD for a US omnichannel apparel retailer (think Nike / Levi's / Lululemon scale — 50 stores, full DTC site, mobile app, loyalty program).
You don't just answer questions — you TAKE ACTIONS on the dashboard using your available tools.

## Domain framing — apparel, US, USD

- ALL currency in $ (USD). NEVER use ₹, INR, lakhs, or crores.
- Holidays that matter: BFCM (Black Friday / Cyber Monday), Memorial Day, Back-to-School, Labor Day, July 4th, Valentine's Day, Mother's / Father's Day.
- Apparel-specific KPIs to reach for: size-curve sell-through, color performance, returns by reason (size wrong / fit wrong / color mismatch / quality / changed mind / damaged), brand affinity score, style velocity, full-price vs markdown share, AUR (average unit retail).
- Customer segments are apparel-flavored: Fashion Forward, Athletic Enthusiast, Value Shopper, Brand Loyalist, Returner, Lapsed, Casual, New. (These are the exact strings in cache/apparel/cx360_customer_table.json — cite them verbatim.)
- Brands the catalogue carries: Nike, Levi's, Lululemon, Adidas, Madewell, Gap, Old Navy, H&M, Zara, Banana Republic, New Balance, Under Armour.
- Channels: Mobile App, Web, In-Store, Click-and-Collect, Wholesale.
- Geographies are US metros: NYC, Boston, Chicago, LA, SF, Dallas, Atlanta, Miami, Seattle, Denver, etc.

NEVER use Indian-grocery vocabulary in this mode: no Diwali, no Monsoon, no Tier-2 cities, no ₹, no "lakhs/crores", no Mumbai/Bangalore.

## Your Capabilities (Tools) — IMPORTANT for apparel mode

PRIMARY tool for this mode:
0. **get_dashboard_data** — Reads the US apparel cache (cache/apparel/cx360_*.json). Numbers exactly match what is on the user's screen. **USE THIS FOR EVERY CUSTOMER QUESTION.** Available datasets: cx360_kpis, cx360_customer_table, cx360_clv_distribution, cx360_churn_risk, cx360_churn_drivers, cx360_segment_migration, cx360_cohort_retention, cx360_at_risk_alerts, cx360_basket_distribution, cx360_recency_frequency, cx360_revenue_concentration, cx360_channel_analysis, cx360_rfm_sample, cx360_returns_by_reason, cx360_brand_affinity, cx360_return_reason_waterfall.

⚠️ DO NOT use these tools in apparel mode — they query Indian-grocery Databricks tables and would return wrong segment names (At Risk / Champions / Hibernating) and wrong currency:
- cx_lookup, inventory_status, demand_lookup, supplier_health, price_intel_lookup, query_data

These Databricks tools return data from a different tenant (Indian grocery). The apparel demo's source of truth is the cache files served by get_dashboard_data. If you cite Databricks segment names in this mode, the user will see a tenant mismatch.

ACTION TOOLS:
7. **propose_chart_options** — Propose 2-3 chart options for the user to choose from
8. **render_selected_chart** — Render the chart the user selected
9. **pin_to_dashboard** — Add a chart to the main dashboard
10. **create_segment** — Build and save a customer segment
11. **set_alert** — Create a monitoring rule
12. **run_nba** — Generate next-best-actions
13. **export_data** — Generate a downloadable CSV
14. **apply_dashboard_filter** — Change the dashboard's active filters

## Chart Creation Protocol — MANDATORY

NEVER directly render a chart. ALWAYS propose options first (2-3, genuinely different perspectives).
Format numbers nicely: $ for money, 1 decimal for %.

## Few-shot examples (apparel framing)

Q: Which customer segment has the highest churn risk?
A: Pulled the segment summary. Returner has the highest 90-day churn at 34.2% (4,180 customers, ~$1.2M CLV at risk). They buy, return half, and lapse. Value Shopper is next at 28.7%. Brand Loyalist and Athletic Enthusiast are the stickiest at ~8% — Lululemon and Nike affinity drives repeat behavior.

Q: What's our return rate and what's driving it?
A: Blended return rate is 24.3% — at the high end of US apparel benchmarks (typical 20–25%). Top reason is "size wrong" at 41% of returns, concentrated in Denim (32% return rate) and Activewear Bottom (28%). Recommend: push the fit-quiz on PDP for those two categories before BFCM.

Q: Which brand has the strongest affinity in our Fashion Forward segment?
A: Lululemon — 62% of Fashion Forward customers bought Lululemon at least 3x in the last 12 months, with avg basket of $187. Madewell is second at 41%. Gap and Old Navy index very low in this segment, as expected.

Q: Set up an alert for BFCM full-price erosion.
A: Created alert "BFCM Full-Price Share". Triggers when full-price revenue share drops below 35% of daily revenue during Nov 24 – Dec 1. Frequency: daily check.

## Live Catalog (relevant tables for this module)

${(0,m.AM)("cx360")}

## Rules
- Numbers come from tool calls — never from memory.
- Always use fully qualified table names: hive_metastore.schema.table.
- LIMIT SQL results to 500 rows max.
- Use $ for all currency (USD), formatted en-US (e.g. $1,234,567).
- Be specific with numbers — never vague.
- Frame everything in US apparel context — brands, segments, holidays, return reasons.
- When proposing charts, make options genuinely different (not 3 variations of the same chart).
- ALWAYS provide a short text summary along with any tool actions.
`:`You are an AI analytics AGENT for a retail CX360/Demand dashboard (Indian retail company).
You don't just answer questions — you TAKE ACTIONS on the dashboard using your available tools.

## Your Capabilities (Tools)

LIVE DATABRICKS TOOLS (PREFER THESE):
0. **cx_lookup** — Customer 360 (segments, churn risk, CLV, cohorts, single customer). Live SQL.
1. **inventory_status** — Inventory health, stockouts, replenishment, overstock, per-SKU. Live SQL.
2. **demand_lookup** — Sales rollup, top movers, ML forecasts, festival uplift, SKU trends. Live SQL.
3. **supplier_health** — OTIF scorecard, underperformers, cost-change events. Live SQL.
4. **price_intel_lookup** — Pricing recs, elasticity, competitive gaps, promo effectiveness. Live SQL.

FALLBACKS (only when typed tools don't fit):
5. **query_data** — Raw SQL escape hatch.
6. **get_dashboard_data** — Precomputed JSON snapshots (use only for forecast snapshots not in Databricks).

ACTION TOOLS:
7. **propose_chart_options** — Propose 2-3 chart options for the user to choose from
8. **render_selected_chart** — Render the chart the user selected
9. **pin_to_dashboard** — Add a chart to the main dashboard
10. **create_segment** — Build and save a customer segment
11. **set_alert** — Create a monitoring rule
12. **run_nba** — Generate next-best-actions
13. **export_data** — Generate a downloadable CSV
14. **apply_dashboard_filter** — Change the dashboard's active filters

## Chart Creation Protocol — MANDATORY

NEVER directly render a chart. ALWAYS propose options first.

Step 1: Query the data with query_data
Step 2: Call propose_chart_options with 2-3 visualization options
Step 3: STOP and wait for user selection
Step 4: After user selects (says "Option A", "I'll take the bar chart", etc.), render the full chart with render_selected_chart
Step 5: Offer pin/export/customize actions

CHOOSING GOOD OPTIONS — be thoughtful:
- Option A: The BEST chart type for this data (your top recommendation)
- Option B: An ALTERNATIVE perspective (different chart type showing different insight)
- Option C: Data table OR a more specialized view (optional, include if valuable)

PREVIEW DATA must be real — pull 3-5 rows from the query results.
Format numbers nicely: round percentages to 1 decimal, add ₹ for money, format large numbers with commas.

AXES MUST BE DESCRIPTIVE:
Bad: "X: segment, Y: value"
Good: "X: Customer Segment (Premium, Loyal, Regular, Occasional, New)"
        "Y: Average 90-day Churn Probability (%), range 8.1% to 34.2%"

WHEN DATA HAS A TIME DIMENSION:
- Always include a line/area chart option (shows trends)
- Always include a bar chart option (shows comparison at a point in time)

WHEN DATA IS CATEGORICAL:
- Bar chart for comparison
- Donut/pie for proportion (only if ≤6 categories)
- Table for detailed view

WHEN DATA IS TWO NUMERIC VARIABLES:
- Scatter plot for correlation
- Grouped bar for discrete comparison

EXCEPTION: If the user EXPLICITLY requests a specific chart type ("show me a bar chart of X"), still propose options but make their requested type Option A.
EXCEPTION: If the user says "just show me a table" or "give me the raw data", skip options and render the table directly.

## Data Source Selection — CRITICAL

**Source of truth is LIVE Databricks.** Numbers MUST come from a tool call, never from memory.

Decision tree for every question:
1. Does it map to a typed tool? Use it.
   - Customer / churn / CLV / segment → **cx_lookup**
   - Stockout / replenishment / overstock / inventory health → **inventory_status**
   - Sales / forecast / festival / top movers → **demand_lookup**
   - Supplier / OTIF / cost change → **supplier_health**
   - Pricing rec / elasticity / competitor / promo ROI → **price_intel_lookup**
2. Novel question that doesn't fit? Use **query_data** with raw SQL — fully-qualified table names, LIMIT 500.
3. Only if both fail or the user asks about a precomputed FORECAST SNAPSHOT (e.g. price_intel_core's headline) → use get_dashboard_data.

NEVER answer "I don't have access" before trying a tool. Live data is reachable.
NEVER make up numbers — every number in your reply must be traceable to a tool result in this turn or the previous one.

## How to Behave

- When the user asks about data → pick the right typed tool, get the numbers, answer with them
- When a chart would help → after getting data, call propose_chart_options
- When the user selects a chart option → use render_selected_chart
- When the user says "pin this" or "add to dashboard" → use pin_to_dashboard
- When the user describes a customer group → use create_segment
- When the user says "alert me" or "monitor" → use set_alert
- When the user asks "what should we do about X" → use run_nba
- When the user wants data exported → use export_data
- When the user says "show me only X" or "filter to Y" → use apply_dashboard_filter
- For casual/meta questions → respond conversationally without tools

## Multi-Step Workflows

You can chain tools. Examples:
- "Show me churn by segment" → query_data → propose_chart_options → WAIT
- When user says "Option A" → render_selected_chart
- If user then says "pin it" → pin_to_dashboard

## Live Databricks Catalog (relevant tables for this module)

${(0,m.AM)(e)}

## Rules
- Numbers come from tool calls — never from memory
- Always use fully qualified table names: hive_metastore.schema.table
- LIMIT SQL results to 500 rows max
- date_id is YYYYMMDD bigint, NOT a date string
- Use ₹ for all currency values (Indian Rupees)
- Be specific with numbers — never vague
- When proposing charts, make options genuinely different (not 3 variations of the same chart)
- The user should feel like they're choosing between different INSIGHTS, not just different chart skins
- When creating segments, use descriptive names
- If you need multiple tools, call them in sequence
- ALWAYS provide a text summary along with any tool actions
- Format large numbers in Indian notation (e.g., ₹1,23,456)
- When the user asks about what you can do, explain your agentic capabilities
`}let w=d().join(process.cwd(),"cache"),v={kpis:["headline","kpis","model_card"],action_queue:["action_queue","live_activity"],promo:["campaigns","promo_roi_trend","mechanic_roi","lift_by_segment","ai_suggestions"],markdown:["markdown_queue","sell_through_heatmap","inventory_aging"],forecast:["forecast_14w","channel_performance","margin_waterfall"],departments:["departments"],skus:["skus"]};function k(e,t=40){if(Array.isArray(e)){let r=e.slice(0,t).map(e=>k(e,t));return e.length>t?[...r,{_truncated:`${e.length-t} more rows omitted (total ${e.length})`}]:r}if(e&&"object"==typeof e){let r={};for(let[a,s]of Object.entries(e))r[a]=k(s,t);return r}return e}async function A(e,t="india_grocery"){try{let r;let a=String(e.dataset||"").toLowerCase().replace(/\.json$/,"");if("list"===a){let e=(await u.promises.readdir(w)).filter(e=>e.endsWith(".json")&&"_meta.json"!==e).map(e=>e.replace(/\.json$/,""));return{success:!0,datasets:[...e,"price_intel_core","merch_demand_core"].sort()}}if(!/^[a-z0-9_]+$/.test(a))return{success:!1,error:"Invalid dataset name"};let s="price_intel_core"===a||"merch_demand_core"===a,o="us_apparel"===t?"apparel":"us_retail"===t?"us_retail":null;if(s){let e=a.replace("_core","");if(o){let t=d().join(w,o,e,"core.json");try{await u.promises.access(t),r=t}catch{r=d().join(w,e,"core.json")}}else r=d().join(w,e,"core.json")}else if(o){let e=d().join(w,o,`${a}.json`);try{await u.promises.access(e),r=e}catch{r=d().join(w,`${a}.json`)}}else r=d().join(w,`${a}.json`);let n=JSON.parse(await u.promises.readFile(r,"utf-8"));if(s){if(!e.section)return{success:!0,note:"Large dataset — pass a section to fetch data.",available_sections:"price_intel_core"===a?Object.keys(v):Object.keys(n)};let t=v[e.section]??[e.section],r={};for(let e of t)e in n&&(r[e]=n[e]);if(0===Object.keys(r).length)return{success:!1,error:`Unknown section "${e.section}"`,available_keys:Object.keys(n)};return{success:!0,dataset:a,section:e.section,data:k(r)}}return{success:!0,dataset:a,data:k(n)}}catch(e){return{success:!1,error:e instanceof Error?e.message:"Failed to read dataset",hint:'Call get_dashboard_data with dataset="list" to see valid names.'}}}async function C(e,t,r="india_grocery"){switch(e){case"cx_lookup":case"inventory_status":case"demand_lookup":case"supplier_health":case"price_intel_lookup":return await (0,h.zr)(e,t);case"get_dashboard_data":return await A(t,r);case"query_data":return await S(t);case"propose_chart_options":return function(e){let t=e.options;return{success:!0,type:"chart_proposal",question:e.question,data_summary:e.data_summary,options:t.map(e=>({...e,id:`opt_${e.option_id}_${Date.now()}`}))}}(t);case"render_selected_chart":return function(e){let t=`chart_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;return{success:!0,type:"rendered_chart",chart_id:t,chart:{id:t,chart_type:e.chart_type,title:e.title,data:e.data,config:e.config,pinnable:!0},insight:e.insight}}(t);case"pin_to_dashboard":return{success:!0,action:"pin_chart",chartId:t.chart_id,section:t.section,size:t.size||"half",message:"Chart will be pinned to your dashboard"};case"create_segment":return function(e){let t=`seg_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;return{success:!0,action:"create_segment",segmentId:t,segment:{id:t,name:e.name,rules:e.rules,description:e.description,createdAt:new Date().toISOString()},message:`Segment "${e.name}" created`}}(t);case"set_alert":return function(e){let t=`alert_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;return{success:!0,action:"set_alert",alertId:t,alert:{id:t,...e,active:!0,createdAt:new Date().toISOString()},message:`Alert "${e.name}" will trigger when ${e.metric} goes ${e.condition} ${e.threshold}`}}(t);case"run_nba":return{success:!0,action:"show_nba",targetType:t.target_type,targetId:t.target_id,maxCustomers:t.max_customers||10,message:"customer"===t.target_type?`Generating actions for customer ${t.target_id}`:`Generating actions for segment: ${t.target_id}`};case"export_data":return{success:!0,action:"download_csv",data:t.data,filename:`${t.filename}.csv`,description:t.description,message:`Export ready: ${t.filename}.csv`};case"apply_dashboard_filter":return{success:!0,action:"apply_filter",filterType:t.filter_type,value:t.value,filterAction:t.action,message:"reset_all"===t.action?"All filters cleared":`Filter applied: ${t.filter_type} = ${t.value}`};default:return{success:!1,error:`Unknown tool: ${e}`}}}async function S(e){try{let t=await (0,l.JT)(e.sql);return{success:!0,data:t.data,rowCount:t.data.length,source:t.source,executionTime:t.executionTime,explanation:e.explanation}}catch(t){return{success:!1,error:t instanceof Error?t.message:"Query execution failed",sql:e.sql}}}function x(e,t){let r=e.toLowerCase();if(r.includes("what can you do")||r.includes("help")||r.includes("capabilities"))return{answer:`I'm an AI analytics **agent** that can take actions on your dashboard, not just answer questions. Here's what I can do:

**Data & Visualization**
- Query your customer/sales data using natural language
- Create charts (bar, line, donut, tables, KPIs)
- Pin charts to your dashboard for permanent access

**Customer Actions**
- Create and save customer segments based on rules
- Run Next-Best-Action analysis for customers or segments
- Export data as CSV files

**Monitoring**
- Set up alerts when metrics cross thresholds
- Filter the dashboard to specific segments

**Try asking:**
- "Show me churn by segment and pin it to the dashboard"
- "Create a segment of high-value churning customers"
- "Alert me if Premium churn goes above 25%"
- "What should we do about customer CUS-00001234?"`,toolResults:[],chartsCreated:[],actions:[]};if(r.includes("churn")&&(r.includes("segment")||r.includes("by"))){let e=[{segment:"Occasional",churn_rate:.342,customer_count:12400},{segment:"New",churn_rate:.287,customer_count:8200},{segment:"Regular",churn_rate:.183,customer_count:15100},{segment:"Loyal",churn_rate:.113,customer_count:9800},{segment:"Premium",churn_rate:.081,customer_count:4500}],t={question:"Show churn analysis by customer segment",data_summary:"5 customer segments with churn rates ranging from 8.1% to 34.2%",options:[{option_id:"A",chart_type:"bar_chart",title:"Churn Rate by Customer Segment",description:"Best for comparing churn rates side by side across all segments",axes:{x:"Customer Segment (Premium, Loyal, Regular, Occasional, New)",y:"Average 90-day Churn Probability (%), range 8.1% to 34.2%"},preview_data:e.slice(0,3),full_data:e,config:{x_key:"segment",y_key:"churn_rate"}},{option_id:"B",chart_type:"donut_chart",title:"Customer Distribution by Churn Risk",description:"Shows proportion of customers in each segment — useful for understanding risk exposure",axes:{x:"Segment (slices)",y:"Customer Count"},preview_data:e.slice(0,3),full_data:e,config:{name_key:"segment",value_key:"customer_count"}},{option_id:"C",chart_type:"data_table",title:"Segment Churn Details",description:"Full breakdown with exact numbers — see all metrics at a glance",axes:{x:"Rows: Each segment",y:"Columns: Churn rate, Customer count"},preview_data:e.slice(0,3),full_data:e,config:{columns:["segment","churn_rate","customer_count"]}}]};return{answer:`I found the data! Here are **3 ways** to visualize churn by segment. Each shows a different perspective:

**Data summary:** ${t.data_summary}

Select the visualization that works best for you:`,toolResults:[{tool:"query_data",input:{sql:"SELECT segment, AVG(churn_prob_90d) as churn_rate, COUNT(*) as customer_count FROM customers GROUP BY segment"},output:{success:!0,data:e,rowCount:5,source:"mock"}},{tool:"propose_chart_options",input:t,output:{success:!0,type:"chart_proposal",...t}}],chartsCreated:[],chartProposal:t,actions:[]}}if(r.includes("option a")||r.includes("bar chart")||r.includes("option b")||r.includes("donut")||r.includes("option c")||r.includes("table")){let e=`chart_${Date.now()}_mock`,t="bar_chart",a="Churn Rate by Customer Segment",s={x_key:"segment",y_key:"churn_rate"};r.includes("option b")||r.includes("donut")?(t="donut_chart",a="Customer Distribution by Segment",s={name_key:"segment",value_key:"customer_count"}):(r.includes("option c")||r.includes("table"))&&(t="data_table",a="Segment Churn Details",s={columns:["segment","churn_rate","customer_count"]});let o=[{segment:"Occasional",churn_rate:.342,customer_count:12400},{segment:"New",churn_rate:.287,customer_count:8200},{segment:"Regular",churn_rate:.183,customer_count:15100},{segment:"Loyal",churn_rate:.113,customer_count:9800},{segment:"Premium",churn_rate:.081,customer_count:4500}],n={id:e,chart_type:t,title:a,data:o,config:s,pinnable:!0};return{answer:`Here's your **${a}**!

**Key insight:** Occasional shoppers have the highest churn at 34.2%, followed by New customers at 28.7%. Premium customers are most loyal with only 8.1% churn.

You can now: Pin to dashboard • Export CSV • Customize`,toolResults:[{tool:"render_selected_chart",input:{chart_type:t,title:a,data:o,config:s},output:{success:!0,type:"rendered_chart",chart_id:e,chart:n}}],chartsCreated:[n],actions:[]}}if(r.includes("pin")&&(r.includes("dashboard")||r.includes("this")))return{answer:`**Chart pinned to dashboard!**

The chart has been added to your CX360 dashboard in the "After KPIs" section. You can:
- View it anytime on the main dashboard
- Refresh it to get latest data
- Unpin it when no longer needed`,toolResults:[{tool:"pin_to_dashboard",input:{chart_id:"last_chart",section:"after_kpis",size:"half"},output:{success:!0,action:"pin_chart",section:"after_kpis",message:"Chart pinned"}}],chartsCreated:[],actions:[{type:"pin_chart",payload:{section:"after_kpis",size:"half"}}]};if(r.includes("segment")&&(r.includes("create")||r.includes("high-value")||r.includes("at risk"))){let e=`seg_${Date.now()}_mock`;return{answer:`**Segment Created: "High-Value At-Risk Customers"**

**Definition:**
- CLV ≥ ₹50,000
- Churn Risk = High or Critical
- Days Since Last Purchase > 30

**Preview:** ~247 customers match these criteria
**Total CLV at Risk:** ₹12.4L

Would you like me to:
- Show the customer list
- Run Next-Best-Actions for this segment
- Export the segment`,toolResults:[{tool:"create_segment",input:{name:"High-Value At-Risk Customers",rules:[{field:"clv_12m",operator:"gte",value:5e4},{field:"churn_risk_tier",operator:"in",value:["High","Critical"]}]},output:{success:!0,action:"create_segment",segmentId:e,customerCount:247}}],chartsCreated:[],actions:[{type:"create_segment",payload:{segmentId:e,name:"High-Value At-Risk Customers",customerCount:247}}]}}if(r.includes("alert")||r.includes("notify")||r.includes("monitor")){let e=`alert_${Date.now()}_mock`;return{answer:`**Alert Created: "Premium Churn Warning"**

**Trigger:** When churn rate for Premium segment goes **above 25%**
**Check Frequency:** On every data refresh
**Status:** Active

You'll be notified when this threshold is crossed. Manage alerts in Settings.`,toolResults:[{tool:"set_alert",input:{name:"Premium Churn Warning",metric:"churn_rate",condition:"above",threshold:.25,segment_filter:"Premium",frequency:"on_refresh"},output:{success:!0,action:"set_alert",alertId:e}}],chartsCreated:[],actions:[{type:"set_alert",payload:{alertId:e,name:"Premium Churn Warning"}}]}}if(r.includes("filter")||r.includes("show only")||r.includes("show me only")){let e="Premium";return r.includes("loyal")&&(e="Loyal"),r.includes("online")&&(e="Online"),r.includes("mumbai")&&(e="Mumbai"),{answer:`**Dashboard filtered to ${e}**

All charts and metrics now reflect only ${e} data. Clear filters using the chips at the top of the dashboard or ask me to "reset filters".`,toolResults:[{tool:"apply_dashboard_filter",input:{filter_type:"segment",value:e,action:"add"},output:{success:!0,action:"apply_filter",filterType:"segment",value:e}}],chartsCreated:[],actions:[{type:"apply_filter",payload:{filterType:"segment",value:e}}]}}return r.includes("recommend")||r.includes("what should")||r.includes("action")||r.includes("nba")?{answer:`**Next Best Actions Generated**

I'll analyze the target customers and generate personalized recommendations. The actions will appear in the panel below with:
- Priority ranking (1-3)
- Specific offers and channels
- Expected impact
- Execute/Skip buttons

Processing your request...`,toolResults:[{tool:"run_nba",input:{target_type:"segment",target_id:"High-Value At-Risk",max_customers:10},output:{success:!0,action:"show_nba",targetType:"segment",targetId:"High-Value At-Risk"}}],chartsCreated:[],actions:[{type:"show_nba",payload:{targetType:"segment",targetId:"High-Value At-Risk"}}]}:r.includes("export")||r.includes("download")||r.includes("csv")?{answer:`**Export Ready**

Downloading: **customer_analysis.csv**
Contains: 500 customer records with CLV, churn risk, and segment data.

The file will download automatically.`,toolResults:[{tool:"export_data",input:{filename:"customer_analysis",data:[],description:"Customer analysis export"},output:{success:!0,action:"download_csv",filename:"customer_analysis.csv"}}],chartsCreated:[],actions:[{type:"download_csv",payload:{filename:"customer_analysis.csv"}}]}:{answer:`I can help you analyze your ${"demand"===t?"demand forecasting":"customer"} data and take actions on your dashboard.

**Try asking me to:**
- "Show churn by segment" (data query + chart)
- "Pin that to the dashboard" (persist a chart)
- "Create a segment of high-value churning customers" (save a segment)
- "Alert me if Premium churn goes above 25%" (set monitoring)
- "What should we do about the at-risk customers?" (get recommendations)
- "Filter to Online customers only" (change dashboard view)
- "Export the top 50 customers by CLV" (download data)

*Note: AI agent is running in demo mode.*`,toolResults:[],chartsCreated:[],actions:[]}}async function I(e){let{message:t,history:r=[],module:a="cx360",context:s}=await e.json().catch(()=>null)??{};if(!t)return i.NextResponse.json({error:"Message is required"},{status:400});let o=function(e){let t=(e.headers.get("cookie")??"").split(/;\s*/).find(e=>e.startsWith(`${_.iv}=`)),r=t?.split("=")[1];return"us_apparel"===r?"us_apparel":"us_retail"===r?"us_retail":"india_grocery"}(e),n=(e.headers.get("accept")??"").includes("text/event-stream"),c=new TextEncoder,l=null,u=new ReadableStream({async start(e){let i=t=>{t&&"object"==typeof t&&"final"===t.type&&(l=t.data),n&&e.enqueue(c.encode(`data: ${JSON.stringify(t)}

`))};try{let e;if(!process.env.ANTHROPIC_API_KEY||!y){let e=x(t,a);i({type:"final",data:{...e,source:"mock"}});return}i({type:"status",label:"Thinking…"});let n=[...r.slice(-10).map(e=>({role:e.role,content:e.content})),{role:"user",content:function(e,t,r){let a=[];return r&&(a.push("[Current Dashboard Context]"),a.push(`Module: ${t}`),a.push(`Page: ${r.currentPage}`),r.filters?.segments?.length>0&&a.push(`Active segment filter: ${r.filters.segments.join(", ")}`),r.filters?.loyaltyTiers?.length>0&&a.push(`Active loyalty tier filter: ${r.filters.loyaltyTiers.join(", ")}`),r.filters?.channel&&"all"!==r.filters.channel&&a.push(`Active channel filter: ${r.filters.channel}`),r.drilldowns?.length>0&&a.push(`Active drilldowns: ${r.drilldowns.map(e=>`${e.chartId}=${e.value}`).join(", ")}`),r.customerId&&a.push(`Currently viewing customer: ${r.customerId}`),a.push("[End Context]"),a.push("")),a.push(`User request: ${e}`),a.join("\n")}(t,a,s)}],c=await y.messages.create({model:g,max_tokens:4096,system:b(a,o),tools:f,messages:n}),l=[],u=[],p=0;for(;"tool_use"===c.stop_reason&&p<8;){p++;let t=c.content.filter(e=>"text"===e.type).map(e=>e.text).join(" ").trim();t&&i({type:"thinking",text:t.slice(0,280)});let r=c.content.filter(e=>"tool_use"===e.type),s=[];for(let t of r){let r=t.input;i({type:"tool_start",tool:t.name,label:function(e,t){let r=t.scope;switch(e){case"cx_lookup":return`Reading customer 360 \xb7 ${r??"…"}`;case"inventory_status":return`Querying live inventory \xb7 ${r??"…"}`;case"demand_lookup":return`Pulling demand data \xb7 ${r??"…"}`;case"supplier_health":return`Checking suppliers \xb7 ${r??"…"}`;case"price_intel_lookup":return`Reading pricing data \xb7 ${r??"…"}`;case"get_dashboard_data":return"list"===t.dataset?"Discovering available datasets":`Reading ${t.dataset}${t.section?` \xb7 ${t.section}`:""}`;case"query_data":return t.explanation||"Running SQL query";case"propose_chart_options":return"Designing chart options";case"render_selected_chart":return"Rendering chart";case"pin_to_dashboard":return"Pinning to dashboard";case"create_segment":return"Creating segment";case"set_alert":return"Setting up alert";case"run_nba":return"Generating recommendations";case"export_data":return"Preparing export";case"apply_dashboard_filter":return"Applying filter";default:return e.replace(/_/g," ")}}(t.name,r)});let a=await C(t.name,r,o);i({type:"tool_end",tool:t.name,ok:!1!==a.success,summary:!1===a.success?"no luck — trying another way":"number"==typeof a.rowCount?`${a.rowCount} rows`:Array.isArray(a.datasets)?`${a.datasets.length} datasets`:Array.isArray(a.options)?`${a.options.length} options ready`:void 0!==a.data?"data loaded":"done"}),"propose_chart_options"===t.name&&a.success&&(e={question:a.question,data_summary:a.data_summary,options:a.options}),"render_selected_chart"===t.name&&a.chart&&u.push(a.chart),s.push({type:"tool_result",tool_use_id:t.id,content:JSON.stringify(a)}),l.push({tool:t.name,input:r,output:a})}n.push({role:"assistant",content:c.content}),n.push({role:"user",content:s}),i({type:"status",label:"Analyzing results…"});try{c=await y.messages.create({model:g,max_tokens:4096,system:b(a,o),tools:f,messages:n})}catch(e){console.error("Anthropic API error in tool loop:",e);break}}let d=c.content.filter(e=>"text"===e.type).map(e=>e.text).join("\n");i({type:"final",data:{answer:d||"I gathered the data but ran out of steps to summarize — ask me to continue.",toolResults:l,chartsCreated:u,chartProposal:e,actions:function(e){let t=[];for(let r of e)r.output.action&&t.push({type:r.output.action,payload:r.output});return t}(l),source:"claude"}})}catch(e){console.error("Chat API error:",e),i({type:"final",data:{...x(t,a),source:"mock"}})}finally{e.close()}}});if(n)return new Response(u,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform",Connection:"keep-alive"}});let p=u.getReader();for(;;){let{done:e}=await p.read();if(e)break}return i.NextResponse.json(l??{error:"No response generated"})}let T=new s.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/chat/route",pathname:"/api/chat",filename:"route",bundlePath:"app/api/chat/route"},resolvedPagePath:"/Users/pratikbharuka/Desktop/cx360-app/src/app/api/chat/route.ts",nextConfigOutput:"standalone",userland:a}),{requestAsyncStorage:R,staticGenerationAsyncStorage:L,serverHooks:O}=T,E="/api/chat/route";function D(){return(0,n.patchFetch)({serverHooks:O,staticGenerationAsyncStorage:L})}},56847:(e,t,r)=>{r.d(t,{iv:()=>a,zm:()=>s});let a="rct_tenant",s="india_grocery"}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[8948,5972,7293,8405,8922],()=>r(88664));module.exports=a})();