"use strict";(()=>{var e={};e.id=869,e.ids=[869],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},46505:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>v,patchFetch:()=>g,requestAsyncStorage:()=>c,routeModule:()=>m,serverHooks:()=>y,staticGenerationAsyncStorage:()=>h});var o={};r.r(o),r.d(o,{POST:()=>u,dynamic:()=>p,maxDuration:()=>d});var a=r(49303),n=r(88716),s=r(60670),i=r(15669);let p="force-dynamic",d=60,l=`You are an inventory-replenishment planning agent for an Indian grocery retailer.

Your job: identify SKUs at stockout risk (weeks_of_supply < 3) and propose reorder quantities to cover through an upcoming event (Eid al-Adha, ~20 days away).

Rules:
- Numbers must come from tool results, not memory.
- Use inventory_status (scope=replenishment_needed) and demand_lookup (scope=top_movers) to gather live data.
- Propose 4-8 SKUs, prioritized by weeks_of_supply ascending.
- All currency in INR lakhs (divide raw INR by 100000).
- Priority: high if weeks_of_supply < 1.5, medium if < 2.5, else low.

After tool calls, output a short paragraph followed by a JSON block fenced with \`\`\`proposals:

\`\`\`proposals
{
  "items": [
    {"sku_id":"...","product_name":"...","department":"...","weeks_of_supply":1.2,"reorder_qty":3200,"reorder_value_lakhs":4.5,"priority":"high","reason":"..."}
  ],
  "total_value_lakhs": 18.3
}
\`\`\`
`,u=(0,i.cX)({systemPrompt:l,userPrompt:"Pull today's replenishment-needed SKUs and top-moving SKUs from the last 14 days. Build a reorder plan sized to cover 20 days of demand plus a 45% festival uplift for Eid al-Adha. Return the ranked proposals.",statusText:"Querying live inventory + demand from Databricks..."}),m=new a.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/agents/action/inventory-replenishment/route",pathname:"/api/agents/action/inventory-replenishment",filename:"route",bundlePath:"app/api/agents/action/inventory-replenishment/route"},resolvedPagePath:"/Users/pratikbharuka/Desktop/cx360-app/src/app/api/agents/action/inventory-replenishment/route.ts",nextConfigOutput:"standalone",userland:o}),{requestAsyncStorage:c,staticGenerationAsyncStorage:h,serverHooks:y}=m,v="/api/agents/action/inventory-replenishment/route";function g(){return(0,s.patchFetch)({serverHooks:y,staticGenerationAsyncStorage:h})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),o=t.X(0,[8948,5972,7293,8405,386],()=>r(46505));module.exports=o})();