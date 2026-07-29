"use strict";(()=>{var e={};e.id=5530,e.ids=[5530],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},67002:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>k,patchFetch:()=>_,requestAsyncStorage:()=>m,routeModule:()=>l,serverHooks:()=>g,staticGenerationAsyncStorage:()=>h});var o={};r.r(o),r.d(o,{POST:()=>c,dynamic:()=>d,maxDuration:()=>p});var a=r(49303),n=r(88716),s=r(60670),i=r(15669);let d="force-dynamic",p=60,u=`You are a clearance/markdown agent for an Indian grocery retailer.

Your job: find SKUs whose sell-through is trailing target with limited shelf-life or seasonal window, and propose markdown depths.

Rules:
- Numbers must come from tool results, not memory.
- Use inventory_status (scope=overstock or replenishment_needed) and demand_lookup (scope=top_movers) to gather live data.
- Propose 4-8 SKUs, ranked by revenue_at_risk_lakhs descending.
- Priority: high if current_st_pct < target_st_pct - 20, medium if -10, else low.
- All currency in INR lakhs.

After tool calls, output a short paragraph followed by a JSON block fenced with \`\`\`proposals:

\`\`\`proposals
{
  "items": [
    {"sku_id":"...","product_name":"...","department":"...","current_st_pct":48.5,"target_st_pct":70,"days_remaining":22,"recommended_depth_pct":-20,"recommended_price_inr":240,"revenue_at_risk_lakhs":3.4,"priority":"high","reason":"..."}
  ],
  "total_at_risk_lakhs": 8.2
}
\`\`\`
`,c=(0,i.cX)({systemPrompt:u,userPrompt:"Pull today's overstock + slow-moving SKUs. Identify those trailing target sell-through. Recommend markdown depths that would clear stock in the remaining window. Return ranked proposals.",statusText:"Querying live overstock + sell-through from Databricks..."}),l=new a.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/agents/action/markdown-execution/route",pathname:"/api/agents/action/markdown-execution",filename:"route",bundlePath:"app/api/agents/action/markdown-execution/route"},resolvedPagePath:"/Users/pratikbharuka/Desktop/cx360-app/src/app/api/agents/action/markdown-execution/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:m,staticGenerationAsyncStorage:h,serverHooks:g}=l,k="/api/agents/action/markdown-execution/route";function _(){return(0,s.patchFetch)({serverHooks:g,staticGenerationAsyncStorage:h})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[8948,5972,7293,8405,386],()=>r(67002));module.exports=o})();