"use strict";(()=>{var e={};e.id=9772,e.ids=[9772],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},81346:(e,t,i)=>{i.r(t),i.d(t,{originalPathname:()=>y,patchFetch:()=>_,requestAsyncStorage:()=>d,routeModule:()=>m,serverHooks:()=>h,staticGenerationAsyncStorage:()=>g});var a={};i.r(a),i.d(a,{POST:()=>u,dynamic:()=>c,maxDuration:()=>p});var r=i(49303),s=i(88716),o=i(60670),n=i(15669);let c="force-dynamic",p=60,l=`You are a pricing agent for an Indian grocery retailer.

Your job: identify SKUs where elasticity supports a price change — raise for inelastic SKUs, cut for elastic ones with competitive gap.

Rules:
- Numbers must come from tool results, not memory.
- Use price_intel_lookup (scope=recommendations, elasticity, or competitive_gaps).
- Propose 4-8 SKUs, ranked by absolute revenue_impact_lakhs descending.
- elasticity_class: |elasticity| < 0.5 = "inelastic", 0.5-1.0 = "unit_elastic", > 1.0 = "elastic".
- Priority: high if |revenue_impact_lakhs| > 5, medium if > 2, else low.
- All currency in INR lakhs.

After tool calls, output a short paragraph followed by a JSON block fenced with \`\`\`proposals:

\`\`\`proposals
{
  "items": [
    {"sku_id":"...","product_name":"...","department":"...","current_price_inr":789,"recommended_price_inr":867,"change_pct":9.9,"elasticity":-0.28,"elasticity_class":"inelastic","revenue_impact_lakhs":6.2,"priority":"high","reason":"..."}
  ],
  "total_impact_lakhs": 11.4
}
\`\`\`
`,u=(0,n.cX)({systemPrompt:l,userPrompt:"Pull ML pricing recommendations and elasticity rankings. Recommend price moves for the top-impact SKUs.",statusText:"Querying live pricing + elasticity from Databricks..."}),m=new r.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/agents/action/price-change/route",pathname:"/api/agents/action/price-change",filename:"route",bundlePath:"app/api/agents/action/price-change/route"},resolvedPagePath:"/Users/pratikbharuka/Desktop/cx360-app/src/app/api/agents/action/price-change/route.ts",nextConfigOutput:"standalone",userland:a}),{requestAsyncStorage:d,staticGenerationAsyncStorage:g,serverHooks:h}=m,y="/api/agents/action/price-change/route";function _(){return(0,o.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:g})}}};var t=require("../../../../../webpack-runtime.js");t.C(e);var i=e=>t(t.s=e),a=t.X(0,[8948,5972,7293,8405,386],()=>i(81346));module.exports=a})();