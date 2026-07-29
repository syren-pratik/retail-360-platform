"use strict";(()=>{var e={};e.id=9233,e.ids=[9233],e.modules={72934:e=>{e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},20777:(e,t,n)=>{n.r(t),n.d(t,{originalPathname:()=>O,patchFetch:()=>R,requestAsyncStorage:()=>N,routeModule:()=>y,serverHooks:()=>A,staticGenerationAsyncStorage:()=>f});var s={};n.r(s),n.d(s,{GET:()=>g,POST:()=>m});var a=n(49303),r=n(88716),i=n(60670),o=n(87070),c=n(27293),l=n(71615);function u(){try{let e=l.cookies().get("rct_tenant")?.value;return"us_apparel"===e?"us_apparel":"india_grocery"}catch{return"india_grocery"}}let p=null,d="claude-sonnet-4-5-20250514";try{process.env.ANTHROPIC_API_KEY&&(process.env.AZURE_ENDPOINT?(p=new c.ZP({apiKey:process.env.ANTHROPIC_API_KEY,baseURL:process.env.AZURE_ENDPOINT}),d=process.env.AZURE_MODEL_NAME||"claude-sonnet-4-5"):p=new c.ZP({apiKey:process.env.ANTHROPIC_API_KEY}))}catch{console.warn("Failed to initialize Anthropic client for insights")}let h=null;async function m(e){let{module:t,dashboardData:n,forceRefresh:s}=await e.json(),a=u();if(!s&&h&&h.module===t&&h.tenant===a&&Date.now()-h.timestamp<18e5)return o.NextResponse.json({insights:h.data,source:"cache"});if(!process.env.ANTHROPIC_API_KEY||!p)return o.NextResponse.json({insights:[],source:"unavailable",error:"No API key configured"});try{let e=u(),s=function(e,t="india_grocery"){let n="us_apparel"===t,s=n?"a US apparel retail company":"an Indian retail company",a=n?"- Use $ for currency values. Format large numbers in thousands (K) or millions (M).":"- Use ₹ for currency values. Format large numbers in lakhs (L) or crores (Cr).";return"cx360"===e?`You are a retail analytics expert analyzing a Customer 360 dashboard for ${s}.

Your job is to identify the most important, actionable insights from the data provided.

RULES:
- Return ONLY a valid JSON array. No markdown, no backticks, no explanation outside the JSON.
- Return exactly 4-6 insights, ranked by business impact.
- Each insight must have a specific number or metric — never vague.
- Focus on ACTIONABLE insights — what should the business DO about this?
${a}
- Be specific: name the segments, tiers, categories involved.

JSON format:
[
  {
    "type": "trend" | "anomaly" | "opportunity" | "risk",
    "severity": "critical" | "warning" | "info" | "positive",
    "title": "Short headline (max 8 words)",
    "description": "1-2 sentence explanation with specific numbers",
    "metric": "The key number (e.g., ${n?"'34.2%' or '$420K'":"'34.2%' or '₹4.2L'"})",
    "action": "What the business should do about this",
    "relatedChart": "clv-distribution" | "churn-risk" | "cohort-retention" | "segment-migration" | "revenue-pareto" | "channel-analysis" | "basket-distribution" | "at-risk-alerts" | "recency-distribution" | "frequency-distribution"
  }
]

Prioritize:
1. Revenue at risk (high-value customers churning)
2. Significant segment shifts (large groups moving down)
3. Unusual patterns (sudden changes, outliers)
4. Growth opportunities (underserved segments, channel shifts)`:"demand"===e?`You are a demand planning expert analyzing a Demand Forecasting dashboard for ${s}.

Your job is to identify forecast accuracy issues, demand anomalies, and optimization opportunities.

RULES:
- Return ONLY a valid JSON array. No markdown, no backticks, no explanation outside the JSON.
- Return exactly 4-6 insights, ranked by business impact.
- Each insight must reference specific departments, SKUs, or metrics.
- Focus on ACTIONABLE insights — what should the planning team do?
${a}

JSON format:
[
  {
    "type": "trend" | "anomaly" | "opportunity" | "risk",
    "severity": "critical" | "warning" | "info" | "positive",
    "title": "Short headline (max 8 words)",
    "description": "1-2 sentence explanation with specific numbers",
    "metric": "The key number",
    "action": "What the planning team should do",
    "relatedChart": "forecast-vs-actual" | "accuracy-heatmap" | "demand-decomposition" | "hourly-heatmap" | "lost-sales" | "feature-importance" | "model-comparison"
  }
]

Prioritize:
1. Forecast accuracy problems (high MAPE, systematic bias)
2. Lost sales / stockout impact
3. Demand spikes or drops
4. Model performance issues`:""}(t,e),r=function(e,t,n="india_grocery"){let s="us_apparel"===n?"$":"₹";if("cx360"===e){let e=t.kpis;return`Analyze this Customer 360 dashboard data and generate insights:

KPI SUMMARY:
- Total customers: ${e?.total_customers||"N/A"}
- Average CLV: ${s}${e?.avg_clv||"N/A"}
- Churn rate (30-day): ${e?.churn_rate_pct||"N/A"}%
- Active customer rate: ${e?.active_rate_pct||"N/A"}%

CLV DISTRIBUTION BY TIER:
${JSON.stringify(t.clvDistribution||[],null,2)}

CHURN RISK DISTRIBUTION:
${JSON.stringify(t.churnRisk||[],null,2)}

CHURN DRIVERS (top features by importance):
${JSON.stringify(t.churnDrivers?.slice(0,8)||[],null,2)}

COHORT RETENTION (recent data):
${JSON.stringify(t.cohortRetention?.slice(-6)||[],null,2)}

SEGMENT SUMMARY:
${JSON.stringify(t.segmentMigration||{},null,2)}

REVENUE CONCENTRATION:
${JSON.stringify(t.revenueConcentration||{},null,2)}

CHANNEL ANALYSIS:
${JSON.stringify(t.channelAnalysis||{},null,2)}

RECENCY/FREQUENCY:
${JSON.stringify(t.recencyFrequency||{},null,2)}

AT-RISK CUSTOMERS:
${JSON.stringify(t.atRiskAlerts||{},null,2)}

Generate 4-6 insights. Return ONLY the JSON array.`}if("demand"===e){let e=t.kpis;return`Analyze this Demand Forecasting dashboard data and generate insights:

KPI SUMMARY:
- Forecast accuracy: ${e?.forecast_accuracy?.value||"N/A"}%
- Forecast bias: ${e?.forecast_bias?.value||"N/A"}%
- Total forecasted demand: ${e?.total_forecast_demand?.value||"N/A"} units
- Lost sales: ${s}${e?.lost_sales?.value||"N/A"}

ACCURACY BY DEPARTMENT:
${JSON.stringify(t.accuracyByDept||[],null,2)}

LOST SALES TOP SKUs:
${JSON.stringify(t.lostSales?.top_skus?.slice(0,5)||[],null,2)}

FEATURE IMPORTANCE:
${JSON.stringify(t.featureImportance?.global?.slice(0,8)||[],null,2)}

MODEL COMPARISON:
${JSON.stringify(t.modelComparison||[],null,2)}

DEMAND ALERTS:
${JSON.stringify(t.alerts||[],null,2)}

Generate 4-6 insights. Return ONLY the JSON array.`}return""}(t,n,e),i=(await p.messages.create({model:d,max_tokens:1500,system:s,messages:[{role:"user",content:r}]})).content.filter(e=>"text"===e.type).map(e=>"text"===e.type?e.text:"").join("").trim();i.startsWith("```json")&&(i=i.slice(7)),i.startsWith("```")&&(i=i.slice(3)),i.endsWith("```")&&(i=i.slice(0,-3)),i=i.trim();let c=JSON.parse(i).map((e,t)=>({...e,id:`ai-insight-${Date.now()}-${t}`,source:"ai"}));return h={data:c,timestamp:Date.now(),module:t,tenant:a},o.NextResponse.json({insights:c,source:"claude"})}catch(e){return console.error("Insight generation failed:",e),o.NextResponse.json({insights:[],source:"error",error:e instanceof Error?e.message:"Unknown error"})}}async function g(){return o.NextResponse.json({cacheValid:!!h&&Date.now()-h.timestamp<18e5,cacheAge:h?Math.round((Date.now()-h.timestamp)/1e3/60):null,cacheModule:h?.module||null,insightCount:h?.data.length||0})}let y=new a.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/insights/route",pathname:"/api/insights",filename:"route",bundlePath:"app/api/insights/route"},resolvedPagePath:"/Users/pratikbharuka/Desktop/cx360-app/src/app/api/insights/route.ts",nextConfigOutput:"standalone",userland:s}),{requestAsyncStorage:N,staticGenerationAsyncStorage:f,serverHooks:A}=y,O="/api/insights/route";function R(){return(0,i.patchFetch)({serverHooks:A,staticGenerationAsyncStorage:f})}}};var t=require("../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),s=t.X(0,[8948,1615,5972,7293],()=>n(20777));module.exports=s})();