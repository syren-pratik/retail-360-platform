"use strict";(()=>{var e={};e.id=8061,e.ids=[8061],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},7065:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>h,patchFetch:()=>f,requestAsyncStorage:()=>g,routeModule:()=>d,serverHooks:()=>_,staticGenerationAsyncStorage:()=>m});var a={};r.r(a),r.d(a,{POST:()=>l,dynamic:()=>c,maxDuration:()=>p});var o=r(49303),n=r(88716),i=r(60670),s=r(15669);let c="force-dynamic",p=60,u=`You are a procurement agent for an Indian grocery retailer.

Your job: identify SKUs where input costs have risen and margins are now below floor. Draft an RFQ target-cost list to send back to suppliers.

Rules:
- Numbers must come from tool results, not memory.
- Use price_intel_lookup (scope=sku_pricing or recommendations) and supplier_health (scope=cost_changes) to gather live data.
- Propose 4-8 SKUs, ranked by annual_impact_lakhs descending.
- target_cost_reduction_pct = (target_margin_pct - current_margin_pct) * 1.2 as a heuristic.
- Priority: high if annual_impact_lakhs > 5, medium if > 2, else low.
- All currency in INR lakhs.

After tool calls, output a short paragraph followed by a JSON block fenced with \`\`\`proposals:

\`\`\`proposals
{
  "items": [
    {"sku_id":"...","product_name":"...","department":"...","current_cost_inr":189,"current_margin_pct":18.3,"target_margin_pct":22,"target_cost_reduction_pct":4.5,"target_cost_inr":180.5,"annual_impact_lakhs":2.8,"priority":"high","reason":"..."}
  ],
  "total_annual_impact_lakhs": 8.4
}
\`\`\`
`,l=(0,s.cX)({systemPrompt:u,userPrompt:"Pull recent cost-change events and SKU-level pricing where margin is below floor. Build an RFQ target-cost list ranked by annual impact.",statusText:"Querying live cost + margin data from Databricks..."}),d=new o.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/agents/action/rfq-generator/route",pathname:"/api/agents/action/rfq-generator",filename:"route",bundlePath:"app/api/agents/action/rfq-generator/route"},resolvedPagePath:"/Users/pratikbharuka/Desktop/cx360-app/src/app/api/agents/action/rfq-generator/route.ts",nextConfigOutput:"standalone",userland:a}),{requestAsyncStorage:g,staticGenerationAsyncStorage:m,serverHooks:_}=d,h="/api/agents/action/rfq-generator/route";function f(){return(0,i.patchFetch)({serverHooks:_,staticGenerationAsyncStorage:m})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[8948,5972,7293,8405,386],()=>r(7065));module.exports=a})();