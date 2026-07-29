"use strict";(()=>{var e={};e.id=1903,e.ids=[1903],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55326:(e,a,t)=>{t.r(a),t.d(a,{originalPathname:()=>f,patchFetch:()=>_,requestAsyncStorage:()=>l,routeModule:()=>m,serverHooks:()=>h,staticGenerationAsyncStorage:()=>g});var r={};t.r(r),t.d(r,{POST:()=>d,dynamic:()=>p,maxDuration:()=>u});var o=t(49303),s=t(88716),i=t(60670),n=t(15669);let p="force-dynamic",u=60,c=`You are a promo-effectiveness agent for an Indian grocery retailer.

Your job: find LIVE campaigns with high free-rider ratios (customers who would have bought anyway) and propose pausing the worst offenders.

Rules:
- Numbers must come from tool results, not memory.
- Use price_intel_lookup with scope=promo_effectiveness to pull live campaign data.
- Focus on campaigns where free_rider_pct > 50% and status is live.
- Waste (INR) = spend_to_date * free_rider_pct / 100. Report waste in lakhs.
- Priority: high if free_rider_pct > 65%, else medium.
- Propose 3-6 campaigns, ranked by waste_lakhs descending.

After tool calls, output a short paragraph followed by a JSON block fenced with \`\`\`proposals:

\`\`\`proposals
{
  "items": [
    {"campaign_id":"...","campaign_name":"...","department":"...","free_rider_pct":68,"waste_lakhs":4.2,"roi":0.7,"priority":"high","reason":"..."}
  ],
  "total_waste_lakhs": 12.9
}
\`\`\`
`,d=(0,n.cX)({systemPrompt:c,userPrompt:"Pull the promo effectiveness table. Identify live campaigns with free-rider ratio above 50%. Return the ranked pause proposals.",statusText:"Querying live promo effectiveness from Databricks..."}),m=new o.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/agents/action/campaign-pause/route",pathname:"/api/agents/action/campaign-pause",filename:"route",bundlePath:"app/api/agents/action/campaign-pause/route"},resolvedPagePath:"/Users/pratikbharuka/Desktop/cx360-app/src/app/api/agents/action/campaign-pause/route.ts",nextConfigOutput:"standalone",userland:r}),{requestAsyncStorage:l,staticGenerationAsyncStorage:g,serverHooks:h}=m,f="/api/agents/action/campaign-pause/route";function _(){return(0,i.patchFetch)({serverHooks:h,staticGenerationAsyncStorage:g})}}};var a=require("../../../../../webpack-runtime.js");a.C(e);var t=e=>a(a.s=e),r=a.X(0,[8948,5972,7293,8405,386],()=>t(55326));module.exports=r})();