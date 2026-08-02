"use strict";(()=>{var e={};e.id=869,e.ids=[869],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},46505:(e,t,n)=>{n.r(t),n.d(t,{originalPathname:()=>v,patchFetch:()=>f,requestAsyncStorage:()=>h,routeModule:()=>m,serverHooks:()=>y,staticGenerationAsyncStorage:()=>c});var r={};n.r(r),n.d(r,{POST:()=>u,dynamic:()=>p,maxDuration:()=>d});var a=n(49303),o=n(88716),s=n(60670),i=n(15669);let p="force-dynamic",d=60,l=`You are an inventory-replenishment planning agent for an Indian grocery retailer.

Your job: identify SKUs at stockout risk (weeks_of_supply < 3) and propose reorder quantities to cover through the next major demand event. Identify the next major demand event from the data you query (upcoming festivals, seasonal peaks, or supply-chain deadlines). If no specific event is imminent, use 'next 30 days' as the planning horizon.

Rules:
- Numbers must come from tool results, not memory.
- Use inventory_status (scope=replenishment_needed) and demand_lookup (scope=top_movers) to gather live data.
- Propose 4-8 SKUs, prioritized by weeks_of_supply ascending.
- All currency in INR lakhs (divide raw INR by 100000).
- Priority: high if weeks_of_supply < 1.5, medium if < 2.5, else low.

After tool calls, output a short paragraph followed by a JSON block fenced with \`\`\`proposals:

\`\`\`proposals
{
  "event_name": "string — the demand event driving the plan (or 'next 30 days')",
  "days_to_event": 20,
  "items": [
    {"sku_id":"...","product_name":"...","department":"...","weeks_of_supply":1.2,"reorder_qty":3200,"reorder_value_lakhs":4.5,"priority":"high","reason":"..."}
  ],
  "total_value_lakhs": 18.3
}
\`\`\`
`,u=(0,i.cX)({systemPrompt:l,userPrompt:"Pull today's replenishment-needed SKUs and top-moving SKUs from the last 14 days. Determine the next major demand event (or default to a 30-day horizon), then build a reorder plan sized to cover that horizon plus any festival uplift. Return the ranked proposals with event_name and days_to_event.",statusText:"Querying live inventory + demand from Databricks..."}),m=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/agents/action/inventory-replenishment/route",pathname:"/api/agents/action/inventory-replenishment",filename:"route",bundlePath:"app/api/agents/action/inventory-replenishment/route"},resolvedPagePath:"/Users/pratikbharuka/Desktop/cx360-app/src/app/api/agents/action/inventory-replenishment/route.ts",nextConfigOutput:"standalone",userland:r}),{requestAsyncStorage:h,staticGenerationAsyncStorage:c,serverHooks:y}=m,v="/api/agents/action/inventory-replenishment/route";function f(){return(0,s.patchFetch)({serverHooks:y,staticGenerationAsyncStorage:c})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var n=e=>t(t.s=e),r=t.X(0,[8948,5972,7293,8405,386],()=>n(46505));module.exports=r})();