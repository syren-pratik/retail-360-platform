"use strict";(()=>{var e={};e.id=1063,e.ids=[1063],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},87559:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>y,patchFetch:()=>k,requestAsyncStorage:()=>m,routeModule:()=>d,serverHooks:()=>h,staticGenerationAsyncStorage:()=>g});var a={};r.r(a),r.d(a,{POST:()=>c,dynamic:()=>l,maxDuration:()=>u});var o=r(49303),i=r(88716),s=r(60670),n=r(15669);let l="force-dynamic",u=60,p=`You are a retail intelligence agent compiling the Monday weekly pricing brief for an Indian grocery retailer.

Your job: pull live KPIs, urgent alerts, and forward-looking events, then produce a compact brief that a category head can read in 90 seconds.

Rules:
- Numbers must come from tool results, not memory.
- Use price_intel_lookup (scope=recommendations) for alerts + margin impact, demand_lookup (scope=sales_summary + festival_uplift) for sell-through and upcoming events, and inventory_status (scope=health_summary) for stockout risk.
- Top decisions: ranked by absolute INR impact.
- What's coming: 2-4 forward-looking items (festivals, campaigns ending, stockouts).
- All currency in INR lakhs.

After tool calls, output a short paragraph followed by a JSON block fenced with \`\`\`proposals:

\`\`\`proposals
{
  "summary": {
    "margin_leakage_lakhs": 22.3,
    "active_alerts": 11,
    "urgent_alerts": 4,
    "promo_roi": 68.4,
    "sell_through_pct": 69.8,
    "sell_through_vs_target": -0.2
  },
  "top_decisions": [
    {"priority":1,"headline":"...","action":"...","impact_lakhs":4.2,"deadline":"Thursday"}
  ],
  "whats_coming": [
    "Next major demand event and days remaining (derived from your query, e.g. 'Independence Day sale in 12 days — inventory check needed')"
  ]
}
\`\`\`
`,c=(0,n.cX)({systemPrompt:p,userPrompt:"Assemble this week's pricing brief. Pull live KPIs, top-impact recommendations, sell-through summary, and upcoming events. Return the structured brief.",statusText:"Compiling weekly pricing brief from live Databricks data..."}),d=new o.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/agents/action/weekly-distribution/route",pathname:"/api/agents/action/weekly-distribution",filename:"route",bundlePath:"app/api/agents/action/weekly-distribution/route"},resolvedPagePath:"/Users/pratikbharuka/Desktop/cx360-app/src/app/api/agents/action/weekly-distribution/route.ts",nextConfigOutput:"standalone",userland:a}),{requestAsyncStorage:m,staticGenerationAsyncStorage:g,serverHooks:h}=d,y="/api/agents/action/weekly-distribution/route";function k(){return(0,s.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:g})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[8948,5972,7293,8405,386],()=>r(87559));module.exports=a})();