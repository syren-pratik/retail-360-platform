"use strict";(()=>{var e={};e.id=7890,e.ids=[7890],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},54467:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>w,patchFetch:()=>A,requestAsyncStorage:()=>_,routeModule:()=>f,serverHooks:()=>v,staticGenerationAsyncStorage:()=>k});var a={};r.r(a),r.d(a,{POST:()=>y,dynamic:()=>p});var n=r(49303),i=r(88716),o=r(60670),s=r(87070),l=r(27293),c=r(56847);let p="force-dynamic",d=null,u="claude-sonnet-4-5-20250514";try{process.env.ANTHROPIC_API_KEY&&(process.env.AZURE_ENDPOINT?(d=new l.ZP({apiKey:process.env.ANTHROPIC_API_KEY,baseURL:process.env.AZURE_ENDPOINT}),u=process.env.AZURE_MODEL_NAME||"claude-sonnet-4-5"):d=new l.ZP({apiKey:process.env.ANTHROPIC_API_KEY}))}catch{console.warn("Failed to initialize Anthropic client for /api/agents/run")}let m=["promo-scenario","price-strategy","competitive-response","margin-leak","markdown-timing","weekly-briefing","event-readiness","demand-anomaly"];function g(e,t){return"number"==typeof e?`${(e/1e5).toFixed(1)}L`:t}let h=["bar_chart","line_chart","donut_chart","data_table","kpi_card","comparison","text_only"];async function y(e){let t=await e.json(),{agent_id:r}=t;if(!m.includes(r))return s.NextResponse.json({error:`Unknown agent: ${r}`},{status:400});let a=function(e){let t=(e.headers.get("cookie")??"").split(/;\s*/).find(e=>e.startsWith(`${c.iv}=`)),r=t?.split("=")[1];return"us_apparel"===r?"us_apparel":"us_retail"===r?"us_retail":"india_grocery"}(e),n=function(e){let t="us_retail"===e?`## Tenant context — Meridian Retail
All currency USD. 7 departments, 5 channels. Anchor date 2026-05-17. Pre-Black-Friday build window. There is NO Databricks connection for this tenant — reason from the context provided in the user prompt.

`:"us_apparel"===e?`## Tenant context — US apparel
All currency USD. No Databricks connection for this tenant.

`:"";return`${t}You are a specialized retail pricing AI agent for ${"us_retail"===e?"Meridian Retail — a US general merchandise retailer (85 stores + Online/App/Curbside/Marketplace; 7 depts including Electronics, Apparel & Shoes, Home & Garden, Sports & Outdoor, Beauty & Personal, Grocery & Snacks, Toys & Games; events Memorial Day, July 4, Back to School, Labor Day, Halloween, Black Friday, Cyber Monday)":"us_apparel"===e?"a US apparel retailer (departments Mens/Womens/Kids/Footwear/Accessories; events BTS, BFCM, Holiday)":"an Indian supermarket chain"}. You analyze specific requests and return structured insights.

Return your analysis as text followed by a JSON block of UI components.
At the end of your response, include:

\`\`\`components
[array of component objects]
\`\`\`

AVAILABLE COMPONENTS (return 2-5 per agent run):
- {"type":"kpi_card","label":"...","value":"...","change":"...","direction":"up|down"}
- {"type":"bar_chart","title":"...","data":[{"name":"...","value":N}...],"x_key":"name","y_key":"value"}
- {"type":"line_chart","title":"...","data":[{"label":"...","value":N}...],"x_key":"label","y_key":"value"}
- {"type":"data_table","title":"...","columns":["action","impact","priority","timing"],"data":[{...}...]}
- {"type":"donut_chart","title":"...","data":[{"name":"...","value":N}...],"name_key":"name","value_key":"value"}
- {"type":"comparison","items":[{"label":"...","metrics":{"...":"..."}}...]}

RULES:
- Always start with a narrative answer in plain text
${"us_apparel"===e||"us_retail"===e?"- Use $ values: $9.8K (thousands), $1.2M (millions). NEVER use ₹, lakhs, or crores.":"- Use ₹ values: ₹9.8L (lakhs), ₹1.2Cr (crores)"}
- Be specific — reference actual numbers from the context provided
- 2-5 components max per run
- kpi_cards: always show 3-4 in sequence to form a row
- action items: express as data_table with columns: action, impact, priority, timing
- comparison: use for scenario comparisons (conservative/base/aggressive)`}(a),i=function(e){let{agent_id:t,form_values:r={},chat_message:a,kpis:n,action_queue:i,markdown_queue:o,departments:s,skus:l}=e,c=n??{},p=c.margin_leakage_breakdown??{},d={margin_leakage:p,total_leakage:c.total_margin_leakage_inr,promo_roi:c.promo_roi_index,free_rider_pct:c.free_rider_ratio_pct,sell_through:c.sell_through_pct,active_alerts:c.active_alerts};switch(t){case"promo-scenario":{let e=(l??[]).find(e=>e.sku_id===r.sku_id)||l?.[0];return`Run a promotion scenario analysis.

PROMOTION PARAMETERS:
- SKU: ${e?.product_name??r.sku_id} (${e?.department??"Unknown"} \xb7 ${e?.category??""})
- Current price: ${e?.current_price_inr??"unknown"}
- Cost: ${e?.cost_inr??"unknown"}
- Current margin: ${e?.current_margin_pct??"unknown"}%
- Price elasticity: ${e?.elasticity??-.52} (${e?.elasticity_class??"moderate"})
- Discount depth: ${r.discount_pct}% off MRP
- Duration: ${r.duration_days} days
- Mechanic: ${r.mechanic}
- Target segment: ${r.target_segment??"all customers"}

CURRENT CONTEXT:
- Base free-rider ratio: ${d.free_rider_pct}%
- Promo ROI index: ${d.promo_roi}
- Total margin leakage: ${d.total_leakage}

Analyze: expected ROI, volume lift, free-rider waste, cannibalization risk.
Show 3 scenarios: conservative (loyalty-gated), base (as specified), aggressive (extended).
End with a clear recommendation.
Include: 3-4 kpi_cards (ROI, volume lift, free-rider %, cannibalization),
         comparison (3 scenarios), data_table (recommended actions).`}case"price-strategy":{let e=(s??[]).find(e=>String(e.name??"").toLowerCase().includes(String(r.category??"").toLowerCase()));return`Generate a pricing strategy for a retail category.

CATEGORY: ${r.category}
HORIZON: ${r.horizon}
OBJECTIVE: ${r.objective}

CATEGORY DATA:
- Current margin: ${e?.current_margin_pct??"N/A"}%
- Margin floor: ${e?.margin_floor_pct??"N/A"}%
- Sell-through: ${e?.sell_through_pct??"N/A"}%
- SKU count: ${e?.sku_count??"N/A"}

CONTEXT: ${JSON.stringify(d)}

Generate: base price recommendations per velocity tier (A/B/C),
promo calendar (which weeks to run promos, which mechanics),
event preparation (next major event ~20 days out),
3 risk flags.
Include: kpi_cards (current margin, target margin, SKUs to raise, SKUs to cut),
         data_table (SKU tier recommendations), bar_chart (margin by subcategory).`}case"competitive-response":return`A competitor made this pricing move: "${a}"

RETAILER CONTEXT:
- KVI exposure: 3 SKUs currently above competitor on tracked items
- Competitive index: ${c.competitive_index??97.3}
- Our promo ROI: ${d.promo_roi??68}

Apply Kotler's four pricing traps:
1. Low-quality trap — matching signals lower quality
2. Fragile market-share trap — gained share may not hold
3. Shallow-pockets trap — can we sustain a price war?
4. Price-war trap — does matching trigger escalation?

Analyze: why did competitor move? What's the risk of not responding?
Give 3 response options: Match / Hold / Differentiate.
Recommend one clearly with reasoning.
Include: kpi_cards (current competitive index, KVIs exposed, risk level),
         comparison (3 response options with trade-offs),
         data_table (trap analysis: trap name, risk level, applies?).`;case"margin-leak":return`Investigate this week's margin leakage.

LEAKAGE DATA:
- Total leakage: ${g(d.total_leakage,"22.3L")}/week
- Free-rider promo waste: ${g(p.promo_free_rider_inr,"9.8L")}
- Cost passthrough gap: ${g(p.cost_passthrough_gap_inr,"6.2L")}
- Premature markdown: ${g(p.premature_markdown_inr,"3.4L")}
- Elasticity underpricing: ${g(p.elasticity_underpricing_inr,"2.9L")}

TOP URGENT ACTIONS: ${JSON.stringify((i??[]).slice(0,3))}

Rank the 4 leak types by impact. For each: what caused it, which SKUs/campaigns,
recommended fix, timeline.
Include: kpi_cards (4 leak amounts), bar_chart (leakage by type),
         data_table (leak | amount | top SKU | fix | week to resolve).`;case"markdown-timing":{let e=r.sku_ids??[],t=(o??[]).filter(t=>e.includes(String(t.sku_id))).slice(0,5);return`Optimize markdown timing for these SKUs.

SELECTED SKUs: ${JSON.stringify(t)}
DAYS REMAINING: ${r.days_remaining} days

For each SKU: current sell-through vs target, recommended markdown depth,
timing (now / in N days / hold), expected clearance %, revenue recovery.
Flag any where write-off risk is HIGH (< 50% projected clearance at max depth).
Include: kpi_cards (total units at risk, avg recommended depth, revenue at stake),
         data_table (SKU | ST% | rec depth | timing | expected clear% | priority),
         line_chart (projected sell-through trajectory if markdown applied now vs delayed).`}case"weekly-briefing":return`Generate a Monday morning pricing brief for a category manager.

CURRENT STATE:
- Margin leakage: ${g(d.total_leakage,"22.3L")}/week
- Active alerts: ${d.active_alerts??11} (4 urgent)
- Promo ROI: ${d.promo_roi??68.4}/100
- Sell-through: ${d.sell_through??69.8}% vs 70% target
- Free-rider ratio: ${d.free_rider_pct??41.2}%

TOP ACTIONS: ${JSON.stringify((i??[]).filter(e=>"urgent"===e.priority).slice(0,3))}

Structure the brief in 4 sections:
1. WHAT CHANGED this week (3-5 bullets with impacts)
2. WHAT WORKED (best campaigns, categories beating plan)
3. DECISIONS NEEDED (top 3, ranked by urgency + impact)
4. WHAT'S COMING (next 14 days: events, campaigns ending, markdown windows)

Include: kpi_cards (margin leakage, active alerts, promo ROI, sell-through),
         data_table (top 3 decisions: decision | impact | deadline | action).`;case"event-readiness":return`Check readiness for the next major event.

NEXT EVENT: ~20 days away (highest-significance upcoming event)
Historical uplift: +31% overall; strongest departments up to +45%

CURRENT INVENTORY CONTEXT:
- Active alerts: ${d.active_alerts??11}
- Overall sell-through: ${d.sell_through??69.8}%
- Departments: ${JSON.stringify((s??[]).map(e=>({name:e.name,st:e.sell_through_pct,margin:e.current_margin_pct})))}

Assess readiness across the departments. For each: current stock vs projected demand,
gap to target inventory, recommended reorder quantity, ordering deadline.
Overall readiness score 0-100.
Include: kpi_cards (readiness score, days to event, SKUs not ramped, revenue at risk),
         bar_chart (readiness by department),
         data_table (dept | projected uplift | stock status | reorder qty | deadline).`;case"demand-anomaly":return`Analyze this demand anomaly: "${a}"

RECENT CONTEXT:
- Overall sell-through: ${d.sell_through??69.8}%
- Active alerts: ${d.active_alerts??11}
- Free-rider ratio: ${d.free_rider_pct??41.2}%

Determine: is this a REAL DEMAND SIGNAL or a DATA QUALITY ISSUE?

Consider signal causes: festival/event effect, competitor stockout,
weather-driven demand, promotional spillover, new store opening.

Consider data causes: double-counting, wrong store mapping,
GRN timing issue, POS sync delay, price change misclassification.

Give a verdict with confidence %. List top 3 explanations by likelihood.
Recommend: investigate further / capitalize on demand / flag for data team.
Include: kpi_cards (verdict confidence, magnitude, affected SKUs estimate),
         comparison (top 3 explanations: cause | likelihood | evidence | action),
         data_table (recommended next steps with owner and timeline).`;default:return`Run agent ${t} with context: ${JSON.stringify(e)}`}}(t),o=new TextEncoder;return new Response(new ReadableStream({async start(e){let t=t=>{e.enqueue(o.encode(`data: ${JSON.stringify(t)}

`))};try{if(!d){let n=`Agent ${r} could not reach the analysis model (no API key configured). Showing a snapshot from the latest cached data instead.`;t({type:"text",content:n}),t({type:"done",answer:n,components:["us_retail"===a?{type:"kpi_card",label:"Margin Leakage",value:"$142K/wk",change:"-0.4pp",direction:"down"}:"us_apparel"===a?{type:"kpi_card",label:"Margin Leakage",value:"$1.82M/wk",change:"-0.4pp",direction:"down"}:{type:"kpi_card",label:"Margin Leakage",value:"₹22.3L/wk",change:"-0.4pp",direction:"down"}]}),e.enqueue(o.encode("data: [DONE]\n\n")),e.close();return}let s=d.messages.stream({model:u,max_tokens:2500,temperature:0,system:n,messages:[{role:"user",content:i}]}),l="",c=!1,p="";for await(let e of s)if("content_block_delta"===e.type&&"text_delta"===e.delta.type){let r=e.delta.text;if(l+=r,!c){let e=(p+=r).indexOf("```components");if(-1!==e){let r=p.slice(0,e);r&&t({type:"text",content:r}),c=!0,p=""}else if(p.length>24){let e=p.length-16;t({type:"text",content:p.slice(0,e)}),p=p.slice(e)}}}!c&&p&&t({type:"text",content:p});let m=function(e){let t=e.match(/```components\n([\s\S]*?)```/);if(!t)return[];try{let e=JSON.parse(t[1]);if(!Array.isArray(e))return[];return e.filter(e=>e&&"object"==typeof e&&"string"==typeof e.type&&h.includes(e.type))}catch{return[]}}(l);t({type:"done",components:m,answer:l.replace(/```components\n[\s\S]*?```/g,"").trimEnd()}),e.enqueue(o.encode("data: [DONE]\n\n")),e.close()}catch(r){console.error("agents/run error:",r),t({type:"text",content:"Agent run failed. Please try again."}),t({type:"done",components:[],answer:"Agent run failed. Please try again."}),e.enqueue(o.encode("data: [DONE]\n\n")),e.close()}}}),{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform",Connection:"keep-alive"}})}let f=new n.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/agents/run/route",pathname:"/api/agents/run",filename:"route",bundlePath:"app/api/agents/run/route"},resolvedPagePath:"/Users/pratikbharuka/Desktop/cx360-app/src/app/api/agents/run/route.ts",nextConfigOutput:"standalone",userland:a}),{requestAsyncStorage:_,staticGenerationAsyncStorage:k,serverHooks:v}=f,w="/api/agents/run/route";function A(){return(0,o.patchFetch)({serverHooks:v,staticGenerationAsyncStorage:k})}},79925:e=>{var t=Object.defineProperty,r=Object.getOwnPropertyDescriptor,a=Object.getOwnPropertyNames,n=Object.prototype.hasOwnProperty,i={};function o(e){var t;let r=["path"in e&&e.path&&`Path=${e.path}`,"expires"in e&&(e.expires||0===e.expires)&&`Expires=${("number"==typeof e.expires?new Date(e.expires):e.expires).toUTCString()}`,"maxAge"in e&&"number"==typeof e.maxAge&&`Max-Age=${e.maxAge}`,"domain"in e&&e.domain&&`Domain=${e.domain}`,"secure"in e&&e.secure&&"Secure","httpOnly"in e&&e.httpOnly&&"HttpOnly","sameSite"in e&&e.sameSite&&`SameSite=${e.sameSite}`,"partitioned"in e&&e.partitioned&&"Partitioned","priority"in e&&e.priority&&`Priority=${e.priority}`].filter(Boolean),a=`${e.name}=${encodeURIComponent(null!=(t=e.value)?t:"")}`;return 0===r.length?a:`${a}; ${r.join("; ")}`}function s(e){let t=new Map;for(let r of e.split(/; */)){if(!r)continue;let e=r.indexOf("=");if(-1===e){t.set(r,"true");continue}let[a,n]=[r.slice(0,e),r.slice(e+1)];try{t.set(a,decodeURIComponent(null!=n?n:"true"))}catch{}}return t}function l(e){var t,r;if(!e)return;let[[a,n],...i]=s(e),{domain:o,expires:l,httponly:d,maxage:u,path:m,samesite:g,secure:h,partitioned:y,priority:f}=Object.fromEntries(i.map(([e,t])=>[e.toLowerCase(),t]));return function(e){let t={};for(let r in e)e[r]&&(t[r]=e[r]);return t}({name:a,value:decodeURIComponent(n),domain:o,...l&&{expires:new Date(l)},...d&&{httpOnly:!0},..."string"==typeof u&&{maxAge:Number(u)},path:m,...g&&{sameSite:c.includes(t=(t=g).toLowerCase())?t:void 0},...h&&{secure:!0},...f&&{priority:p.includes(r=(r=f).toLowerCase())?r:void 0},...y&&{partitioned:!0}})}((e,r)=>{for(var a in r)t(e,a,{get:r[a],enumerable:!0})})(i,{RequestCookies:()=>d,ResponseCookies:()=>u,parseCookie:()=>s,parseSetCookie:()=>l,stringifyCookie:()=>o}),e.exports=((e,i,o,s)=>{if(i&&"object"==typeof i||"function"==typeof i)for(let o of a(i))n.call(e,o)||void 0===o||t(e,o,{get:()=>i[o],enumerable:!(s=r(i,o))||s.enumerable});return e})(t({},"__esModule",{value:!0}),i);var c=["strict","lax","none"],p=["low","medium","high"],d=class{constructor(e){this._parsed=new Map,this._headers=e;let t=e.get("cookie");if(t)for(let[e,r]of s(t))this._parsed.set(e,{name:e,value:r})}[Symbol.iterator](){return this._parsed[Symbol.iterator]()}get size(){return this._parsed.size}get(...e){let t="string"==typeof e[0]?e[0]:e[0].name;return this._parsed.get(t)}getAll(...e){var t;let r=Array.from(this._parsed);if(!e.length)return r.map(([e,t])=>t);let a="string"==typeof e[0]?e[0]:null==(t=e[0])?void 0:t.name;return r.filter(([e])=>e===a).map(([e,t])=>t)}has(e){return this._parsed.has(e)}set(...e){let[t,r]=1===e.length?[e[0].name,e[0].value]:e,a=this._parsed;return a.set(t,{name:t,value:r}),this._headers.set("cookie",Array.from(a).map(([e,t])=>o(t)).join("; ")),this}delete(e){let t=this._parsed,r=Array.isArray(e)?e.map(e=>t.delete(e)):t.delete(e);return this._headers.set("cookie",Array.from(t).map(([e,t])=>o(t)).join("; ")),r}clear(){return this.delete(Array.from(this._parsed.keys())),this}[Symbol.for("edge-runtime.inspect.custom")](){return`RequestCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`}toString(){return[...this._parsed.values()].map(e=>`${e.name}=${encodeURIComponent(e.value)}`).join("; ")}},u=class{constructor(e){var t,r,a;this._parsed=new Map,this._headers=e;let n=null!=(a=null!=(r=null==(t=e.getSetCookie)?void 0:t.call(e))?r:e.get("set-cookie"))?a:[];for(let e of Array.isArray(n)?n:function(e){if(!e)return[];var t,r,a,n,i,o=[],s=0;function l(){for(;s<e.length&&/\s/.test(e.charAt(s));)s+=1;return s<e.length}for(;s<e.length;){for(t=s,i=!1;l();)if(","===(r=e.charAt(s))){for(a=s,s+=1,l(),n=s;s<e.length&&"="!==(r=e.charAt(s))&&";"!==r&&","!==r;)s+=1;s<e.length&&"="===e.charAt(s)?(i=!0,s=n,o.push(e.substring(t,a)),t=s):s=a+1}else s+=1;(!i||s>=e.length)&&o.push(e.substring(t,e.length))}return o}(n)){let t=l(e);t&&this._parsed.set(t.name,t)}}get(...e){let t="string"==typeof e[0]?e[0]:e[0].name;return this._parsed.get(t)}getAll(...e){var t;let r=Array.from(this._parsed.values());if(!e.length)return r;let a="string"==typeof e[0]?e[0]:null==(t=e[0])?void 0:t.name;return r.filter(e=>e.name===a)}has(e){return this._parsed.has(e)}set(...e){let[t,r,a]=1===e.length?[e[0].name,e[0].value,e[0]]:e,n=this._parsed;return n.set(t,function(e={name:"",value:""}){return"number"==typeof e.expires&&(e.expires=new Date(e.expires)),e.maxAge&&(e.expires=new Date(Date.now()+1e3*e.maxAge)),(null===e.path||void 0===e.path)&&(e.path="/"),e}({name:t,value:r,...a})),function(e,t){for(let[,r]of(t.delete("set-cookie"),e)){let e=o(r);t.append("set-cookie",e)}}(n,this._headers),this}delete(...e){let[t,r,a]="string"==typeof e[0]?[e[0]]:[e[0].name,e[0].path,e[0].domain];return this.set({name:t,path:r,domain:a,value:"",expires:new Date(0)})}[Symbol.for("edge-runtime.inspect.custom")](){return`ResponseCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`}toString(){return[...this._parsed.values()].map(o).join("; ")}}},38238:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"ReflectAdapter",{enumerable:!0,get:function(){return r}});class r{static get(e,t,r){let a=Reflect.get(e,t,r);return"function"==typeof a?a.bind(e):a}static set(e,t,r,a){return Reflect.set(e,t,r,a)}static has(e,t){return Reflect.has(e,t)}static deleteProperty(e,t){return Reflect.deleteProperty(e,t)}}},92044:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{RequestCookies:function(){return a.RequestCookies},ResponseCookies:function(){return a.ResponseCookies},stringifyCookie:function(){return a.stringifyCookie}});let a=r(79925)},56847:(e,t,r)=>{r.d(t,{iv:()=>a,zm:()=>n});let a="rct_tenant",n="india_grocery"}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),a=t.X(0,[8948,5972,7293],()=>r(54467));module.exports=a})();