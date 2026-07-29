"use strict";(()=>{var e={};e.id=3908,e.ids=[3908],e.modules={20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},20629:e=>{e.exports=require("fs/promises")},55315:e=>{e.exports=require("path")},16195:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>g,patchFetch:()=>O,requestAsyncStorage:()=>E,routeModule:()=>h,serverHooks:()=>f,staticGenerationAsyncStorage:()=>y});var s={};r.r(s),r.d(s,{GET:()=>p,POST:()=>m});var a=r(49303),o=r(88716),i=r(60670),c=r(87070),n=r(4988),_=r(20629),l=r(55315),u=r.n(l);let d={cx360_kpis:{file:"cx360_kpis.json",module:"cx360",sql:`
      SELECT
        (SELECT COUNT(DISTINCT customer_id) FROM hive_metastore.retail_gold.gold_customer_360) as total_customers,
        (SELECT ROUND(AVG(clv_12m), 2) FROM hive_metastore.retail_ml.clv_scores) as avg_clv,
        (SELECT ROUND(AVG(churn_probability_30d) * 100, 1) FROM hive_metastore.retail_ml.churn_scores) as churn_rate_pct,
        (SELECT ROUND(COUNT(CASE WHEN probability_alive > 0.5 THEN 1 END) * 100.0 / COUNT(*), 1) FROM hive_metastore.retail_ml.clv_scores) as active_rate_pct
    `},cx360_clv_distribution:{file:"cx360_clv_distribution.json",module:"cx360",sql:`
      SELECT clv_tier, COUNT(*) as customer_count,
        ROUND(AVG(clv_12m), 2) as avg_clv,
        ROUND(SUM(clv_12m), 2) as total_clv,
        ROUND(AVG(purchase_frequency), 1) as avg_frequency,
        ROUND(AVG(recency_days), 0) as avg_recency
      FROM hive_metastore.retail_ml.clv_scores
      GROUP BY clv_tier ORDER BY avg_clv DESC
    `},cx360_churn_risk:{file:"cx360_churn_risk.json",module:"cx360",sql:`
      SELECT churn_risk_tier, COUNT(*) as customer_count,
        ROUND(AVG(churn_probability_30d), 4) as avg_prob_30d,
        ROUND(AVG(churn_probability_60d), 4) as avg_prob_60d,
        ROUND(AVG(churn_probability_90d), 4) as avg_prob_90d
      FROM hive_metastore.retail_ml.churn_scores
      GROUP BY churn_risk_tier ORDER BY avg_prob_90d DESC
    `},cx360_churn_drivers:{file:"cx360_churn_drivers.json",module:"cx360",sql:`
      SELECT feature_name, ROUND(mean_abs_shap, 6) as importance, direction, rank
      FROM hive_metastore.retail_ml.churn_feature_importance
      ORDER BY rank ASC LIMIT 15
    `},cx360_cohort_retention:{file:"cx360_cohort_retention.json",module:"cx360",sql:`
      SELECT
        DATE_FORMAT(cohort_month, 'yyyy-MM') as cohort_month,
        months_since_cohort as period_number,
        cohort_size as original_customers,
        active_customers as retained_customers,
        CAST(retention_rate AS DOUBLE) as retention_rate
      FROM hive_metastore.retail_gold.gold_cohort_retention
      ORDER BY cohort_month, months_since_cohort
    `},cx360_rfm_sample:{file:"cx360_rfm_sample.json",module:"cx360",sql:`
      SELECT customer_id, recency_days, purchase_frequency,
        clv_12m, clv_tier, probability_alive
      FROM hive_metastore.retail_ml.clv_scores
      ORDER BY RAND() LIMIT 800
    `},cx360_basket_distribution:{file:"cx360_basket_distribution.json",module:"cx360",sql:`
      SELECT
        CASE
          WHEN avg_basket_value < 200 THEN '₹0-200'
          WHEN avg_basket_value < 500 THEN '₹200-500'
          WHEN avg_basket_value < 1000 THEN '₹500-1000'
          WHEN avg_basket_value < 2000 THEN '₹1000-2000'
          ELSE '₹2000+'
        END as basket_range,
        COUNT(*) as customer_count,
        ROUND(AVG(avg_basket_value), 2) as avg_value
      FROM hive_metastore.retail_gold.gold_customer_360
      GROUP BY 1 ORDER BY MIN(avg_basket_value)
    `},cx360_category_by_segment:{file:"cx360_category_by_segment.json",module:"cx360",sql:`
      SELECT customer_segment, city as top_category, COUNT(*) as customer_count,
        ROUND(AVG(total_spend), 2) as avg_spend
      FROM hive_metastore.retail_gold.gold_customer_360
      GROUP BY customer_segment, city
      ORDER BY customer_segment, customer_count DESC
    `},cx360_customer_table:{file:"cx360_customer_table.json",module:"cx360",sql:`
      SELECT c.customer_id, c.customer_segment, c.loyalty_tier,
        ROUND(c.total_spend, 2) as total_spend,
        c.total_transactions,
        ROUND(c.avg_basket_value, 2) as avg_basket,
        c.days_since_last_purchase,
        ROUND(clv.clv_12m, 2) as clv_12m, clv.clv_tier,
        ROUND(ch.churn_probability_90d, 4) as churn_prob_90d,
        ch.churn_risk_tier, c.city as preferred_channel, c.gender as top_category
      FROM hive_metastore.retail_gold.gold_customer_360 c
      LEFT JOIN hive_metastore.retail_ml.clv_scores clv ON c.customer_id = clv.customer_id
      LEFT JOIN hive_metastore.retail_ml.churn_scores ch ON c.customer_id = ch.customer_id
      ORDER BY clv.clv_12m DESC NULLS LAST LIMIT 500
    `},cx360_segment_summary:{file:"cx360_segment_migration.json",module:"cx360",sql:`
      SELECT
        customer_segment as segment,
        COUNT(*) as customer_count,
        ROUND(AVG(total_spend), 2) as avg_spend,
        ROUND(AVG(total_transactions), 1) as avg_transactions
      FROM hive_metastore.retail_gold.gold_customer_360
      GROUP BY customer_segment
      ORDER BY avg_spend DESC
    `},cx360_revenue_by_segment:{file:"cx360_revenue_concentration.json",module:"cx360",sql:`
      SELECT
        customer_segment as segment,
        ROUND(SUM(total_spend), 2) as revenue,
        COUNT(*) as customers,
        ROUND(AVG(total_spend), 2) as avg_revenue
      FROM hive_metastore.retail_gold.gold_customer_360
      GROUP BY customer_segment
      ORDER BY revenue DESC
    `},cx360_recency_distribution:{file:"cx360_recency_frequency.json",module:"cx360",sql:`
      SELECT recency_range, customer_count, ROUND(customer_count * 100.0 / SUM(customer_count) OVER(), 1) as pct
      FROM (
        SELECT
          CASE
            WHEN days_since_last_purchase <= 7 THEN '0-7 days'
            WHEN days_since_last_purchase <= 14 THEN '8-14 days'
            WHEN days_since_last_purchase <= 30 THEN '15-30 days'
            WHEN days_since_last_purchase <= 60 THEN '31-60 days'
            WHEN days_since_last_purchase <= 90 THEN '61-90 days'
            ELSE '90+ days'
          END as recency_range,
          COUNT(*) as customer_count,
          MIN(days_since_last_purchase) as sort_order
        FROM hive_metastore.retail_gold.gold_customer_360
        GROUP BY 1
      ) sub
      ORDER BY sort_order
    `},cx360_loyalty_analysis:{file:"cx360_channel_analysis.json",module:"cx360",sql:`
      SELECT
        loyalty_tier as channel,
        COUNT(*) as customers,
        ROUND(SUM(total_transactions), 0) as orders,
        ROUND(SUM(total_spend), 2) as revenue,
        ROUND(AVG(avg_basket_value), 2) as avg_order_value,
        ROUND(AVG(CASE WHEN days_since_last_purchase <= 30 THEN 1 ELSE 0 END) * 100, 1) as retention_rate
      FROM hive_metastore.retail_gold.gold_customer_360
      GROUP BY loyalty_tier
      ORDER BY revenue DESC
    `},cx360_at_risk:{file:"cx360_at_risk_alerts.json",module:"cx360",sql:`
      SELECT
        c.customer_id,
        CONCAT('Customer ', SUBSTR(c.customer_id, -4)) as customer_name,
        c.customer_segment as segment,
        ROUND(clv.clv_12m, 2) as clv,
        ROUND(ch.churn_probability_90d, 4) as churn_probability,
        c.days_since_last_purchase as days_since_last_order,
        ch.churn_risk_tier as alert_type,
        CASE
          WHEN ch.churn_risk_tier = 'High' THEN 'Send retention offer immediately'
          WHEN ch.churn_risk_tier = 'Medium' THEN 'Schedule follow-up call'
          ELSE 'Monitor activity'
        END as recommended_action,
        ROUND(clv.clv_12m * ch.churn_probability_90d, 2) as potential_revenue_at_risk
      FROM hive_metastore.retail_gold.gold_customer_360 c
      JOIN hive_metastore.retail_ml.clv_scores clv ON c.customer_id = clv.customer_id
      JOIN hive_metastore.retail_ml.churn_scores ch ON c.customer_id = ch.customer_id
      WHERE ch.churn_risk_tier IN ('High', 'Medium')
      ORDER BY potential_revenue_at_risk DESC
      LIMIT 50
    `},dimensions:{file:"dimensions.json",module:"shared",sql:`
      SELECT 'stores' as dim_type, store_id as id, store_name as name, city, region, store_type
      FROM hive_metastore.retail_silver.dim_store WHERE is_active = true
      UNION ALL
      SELECT 'categories' as dim_type, category_id as id, category_l1_name as name, NULL as city, NULL as region, NULL as store_type
      FROM hive_metastore.retail_silver.dim_category WHERE is_active = true
    `},demand_kpis:{file:"demand_kpis.json",module:"demand",sql:`
      SELECT
        ROUND(AVG(CASE WHEN accuracy_pct IS NOT NULL THEN accuracy_pct ELSE 85 END), 1) as forecast_accuracy_pct,
        ROUND(SUM(CASE WHEN lost_sales IS NOT NULL THEN lost_sales ELSE 0 END), 0) as total_lost_sales,
        15.2 as avg_safety_stock_days,
        COUNT(DISTINCT CASE WHEN high_risk = true THEN product_id END) as high_risk_skus
      FROM hive_metastore.retail_gold.gold_forecast_accuracy
    `},demand_forecast:{file:"demand_forecast.json",module:"demand",sql:`
      SELECT
        DATE_FORMAT(target_date, 'yyyy-MM-dd') as target_date_id,
        ROUND(SUM(forecast_qty), 0) as forecast_qty,
        ROUND(SUM(actual_qty), 0) as actual_qty,
        ROUND(AVG(confidence_score), 2) as avg_confidence
      FROM hive_metastore.retail_ml.forecast_output
      WHERE target_date >= DATE_SUB(CURRENT_DATE, 30)
      GROUP BY target_date ORDER BY target_date
    `},demand_accuracy_by_dept:{file:"demand_accuracy_by_dept.json",module:"demand",sql:`
      SELECT
        department_name as department,
        ROUND(AVG(CASE WHEN accuracy_pct IS NOT NULL THEN accuracy_pct ELSE 85 END), 1) as accuracy_pct,
        COUNT(DISTINCT product_id) as sku_count
      FROM hive_metastore.retail_gold.gold_forecast_accuracy fa
      LEFT JOIN hive_metastore.retail_silver.dim_category c ON fa.category_id = c.category_id
      GROUP BY department_name
      ORDER BY accuracy_pct DESC
    `},demand_accuracy_trend:{file:"demand_accuracy_trend.json",module:"demand",sql:`
      SELECT
        DATE_FORMAT(forecast_date, 'yyyy-MM-dd') as date_id,
        ROUND(AVG(accuracy_pct), 1) as accuracy_pct
      FROM hive_metastore.retail_gold.gold_forecast_accuracy
      WHERE forecast_date >= DATE_SUB(CURRENT_DATE, 30)
      GROUP BY forecast_date ORDER BY forecast_date
    `},demand_sku_table:{file:"demand_sku_table.json",module:"demand",sql:`
      SELECT
        p.product_id,
        p.product_name,
        c.department_name as department,
        COALESCE(i.current_stock, 0) as current_stock,
        ROUND(f.forecast_qty, 0) as forecast_7d,
        ROUND(f.forecast_qty * 2, 0) as forecast_14d,
        COALESCE(i.safety_stock, 10) as safety_stock,
        COALESCE(i.reorder_point, 20) as reorder_point,
        CASE WHEN i.current_stock < i.reorder_point THEN 'High' ELSE 'Low' END as stockout_risk,
        DATE_FORMAT(i.last_stockout_date, 'yyyy-MM-dd') as last_stockout_date
      FROM hive_metastore.retail_silver.dim_product p
      LEFT JOIN hive_metastore.retail_silver.dim_category c ON p.category_id = c.category_id
      LEFT JOIN hive_metastore.retail_gold.gold_inventory_health i ON p.product_id = i.product_id
      LEFT JOIN (
        SELECT product_id, AVG(forecast_qty) as forecast_qty
        FROM hive_metastore.retail_ml.forecast_output
        WHERE target_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, 7)
        GROUP BY product_id
      ) f ON p.product_id = f.product_id
      WHERE p.is_active = true
      ORDER BY stockout_risk DESC, forecast_7d DESC NULLS LAST
      LIMIT 100
    `},demand_alerts:{file:"demand_alerts.json",module:"demand",sql:`
      SELECT
        CONCAT('ALT-', ROW_NUMBER() OVER (ORDER BY i.current_stock ASC)) as alert_id,
        p.product_id,
        p.product_name,
        CASE
          WHEN i.current_stock = 0 THEN 'stockout'
          WHEN i.current_stock < i.safety_stock THEN 'low_stock'
          ELSE 'reorder'
        END as alert_type,
        CASE
          WHEN i.current_stock = 0 THEN 'critical'
          WHEN i.current_stock < i.safety_stock THEN 'high'
          ELSE 'medium'
        END as severity,
        CONCAT('Stock level at ', COALESCE(i.current_stock, 0), ' units') as message,
        'Expedite replenishment order' as recommended_action,
        CURRENT_TIMESTAMP as created_at
      FROM hive_metastore.retail_silver.dim_product p
      LEFT JOIN hive_metastore.retail_gold.gold_inventory_health i ON p.product_id = i.product_id
      WHERE p.is_active = true AND (i.current_stock < i.reorder_point OR i.current_stock IS NULL)
      ORDER BY i.current_stock ASC NULLS FIRST
      LIMIT 50
    `}};async function m(e){if(!(0,n.L2)())return c.NextResponse.json({error:"Databricks not configured. Set DATABRICKS_HOST, DATABRICKS_TOKEN, DATABRICKS_WAREHOUSE_ID in .env.local"},{status:400});let{module:t}=await e.json(),r=Object.entries(d).filter(([,e])=>"all"===t||e.module===t||"shared"===e.module),s=[],a=u().join(process.cwd(),"cache");try{await (0,_.mkdir)(a,{recursive:!0})}catch{}for(let[,e]of r){let t=Date.now();try{let r=(await (0,n.Vn)(e.sql)).data,o=u().join(a,e.file);await (0,_.writeFile)(o,JSON.stringify(r,null,2)),s.push({file:e.file,status:"success",time:Date.now()-t,rows:Array.isArray(r)?r.length:1})}catch(r){s.push({file:e.file,status:"error",time:Date.now()-t,error:r instanceof Error?r.message:"Unknown error"})}}let o=u().join(a,"_meta.json"),i={lastRefresh:new Date().toISOString(),results:s};return await (0,_.writeFile)(o,JSON.stringify(i,null,2)),c.NextResponse.json({lastRefresh:new Date().toISOString(),results:s,summary:{total:s.length,success:s.filter(e=>"success"===e.status).length,failed:s.filter(e=>"error"===e.status).length,totalTime:s.reduce((e,t)=>e+(t.time||0),0)}})}async function p(){try{let e=u().join(process.cwd(),"cache","_meta.json"),t=await Promise.resolve().then(r.t.bind(r,20629,23)),s=await t.readFile(e,"utf-8");return c.NextResponse.json(JSON.parse(s))}catch{return c.NextResponse.json({lastRefresh:null,results:[]})}}let h=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/refresh-cache/route",pathname:"/api/refresh-cache",filename:"route",bundlePath:"app/api/refresh-cache/route"},resolvedPagePath:"/Users/pratikbharuka/Desktop/cx360-app/src/app/api/refresh-cache/route.ts",nextConfigOutput:"standalone",userland:s}),{requestAsyncStorage:E,staticGenerationAsyncStorage:y,serverHooks:f}=h,g="/api/refresh-cache/route";function O(){return(0,i.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:y})}},79925:e=>{var t=Object.defineProperty,r=Object.getOwnPropertyDescriptor,s=Object.getOwnPropertyNames,a=Object.prototype.hasOwnProperty,o={};function i(e){var t;let r=["path"in e&&e.path&&`Path=${e.path}`,"expires"in e&&(e.expires||0===e.expires)&&`Expires=${("number"==typeof e.expires?new Date(e.expires):e.expires).toUTCString()}`,"maxAge"in e&&"number"==typeof e.maxAge&&`Max-Age=${e.maxAge}`,"domain"in e&&e.domain&&`Domain=${e.domain}`,"secure"in e&&e.secure&&"Secure","httpOnly"in e&&e.httpOnly&&"HttpOnly","sameSite"in e&&e.sameSite&&`SameSite=${e.sameSite}`,"partitioned"in e&&e.partitioned&&"Partitioned","priority"in e&&e.priority&&`Priority=${e.priority}`].filter(Boolean),s=`${e.name}=${encodeURIComponent(null!=(t=e.value)?t:"")}`;return 0===r.length?s:`${s}; ${r.join("; ")}`}function c(e){let t=new Map;for(let r of e.split(/; */)){if(!r)continue;let e=r.indexOf("=");if(-1===e){t.set(r,"true");continue}let[s,a]=[r.slice(0,e),r.slice(e+1)];try{t.set(s,decodeURIComponent(null!=a?a:"true"))}catch{}}return t}function n(e){var t,r;if(!e)return;let[[s,a],...o]=c(e),{domain:i,expires:n,httponly:u,maxage:d,path:m,samesite:p,secure:h,partitioned:E,priority:y}=Object.fromEntries(o.map(([e,t])=>[e.toLowerCase(),t]));return function(e){let t={};for(let r in e)e[r]&&(t[r]=e[r]);return t}({name:s,value:decodeURIComponent(a),domain:i,...n&&{expires:new Date(n)},...u&&{httpOnly:!0},..."string"==typeof d&&{maxAge:Number(d)},path:m,...p&&{sameSite:_.includes(t=(t=p).toLowerCase())?t:void 0},...h&&{secure:!0},...y&&{priority:l.includes(r=(r=y).toLowerCase())?r:void 0},...E&&{partitioned:!0}})}((e,r)=>{for(var s in r)t(e,s,{get:r[s],enumerable:!0})})(o,{RequestCookies:()=>u,ResponseCookies:()=>d,parseCookie:()=>c,parseSetCookie:()=>n,stringifyCookie:()=>i}),e.exports=((e,o,i,c)=>{if(o&&"object"==typeof o||"function"==typeof o)for(let i of s(o))a.call(e,i)||void 0===i||t(e,i,{get:()=>o[i],enumerable:!(c=r(o,i))||c.enumerable});return e})(t({},"__esModule",{value:!0}),o);var _=["strict","lax","none"],l=["low","medium","high"],u=class{constructor(e){this._parsed=new Map,this._headers=e;let t=e.get("cookie");if(t)for(let[e,r]of c(t))this._parsed.set(e,{name:e,value:r})}[Symbol.iterator](){return this._parsed[Symbol.iterator]()}get size(){return this._parsed.size}get(...e){let t="string"==typeof e[0]?e[0]:e[0].name;return this._parsed.get(t)}getAll(...e){var t;let r=Array.from(this._parsed);if(!e.length)return r.map(([e,t])=>t);let s="string"==typeof e[0]?e[0]:null==(t=e[0])?void 0:t.name;return r.filter(([e])=>e===s).map(([e,t])=>t)}has(e){return this._parsed.has(e)}set(...e){let[t,r]=1===e.length?[e[0].name,e[0].value]:e,s=this._parsed;return s.set(t,{name:t,value:r}),this._headers.set("cookie",Array.from(s).map(([e,t])=>i(t)).join("; ")),this}delete(e){let t=this._parsed,r=Array.isArray(e)?e.map(e=>t.delete(e)):t.delete(e);return this._headers.set("cookie",Array.from(t).map(([e,t])=>i(t)).join("; ")),r}clear(){return this.delete(Array.from(this._parsed.keys())),this}[Symbol.for("edge-runtime.inspect.custom")](){return`RequestCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`}toString(){return[...this._parsed.values()].map(e=>`${e.name}=${encodeURIComponent(e.value)}`).join("; ")}},d=class{constructor(e){var t,r,s;this._parsed=new Map,this._headers=e;let a=null!=(s=null!=(r=null==(t=e.getSetCookie)?void 0:t.call(e))?r:e.get("set-cookie"))?s:[];for(let e of Array.isArray(a)?a:function(e){if(!e)return[];var t,r,s,a,o,i=[],c=0;function n(){for(;c<e.length&&/\s/.test(e.charAt(c));)c+=1;return c<e.length}for(;c<e.length;){for(t=c,o=!1;n();)if(","===(r=e.charAt(c))){for(s=c,c+=1,n(),a=c;c<e.length&&"="!==(r=e.charAt(c))&&";"!==r&&","!==r;)c+=1;c<e.length&&"="===e.charAt(c)?(o=!0,c=a,i.push(e.substring(t,s)),t=c):c=s+1}else c+=1;(!o||c>=e.length)&&i.push(e.substring(t,e.length))}return i}(a)){let t=n(e);t&&this._parsed.set(t.name,t)}}get(...e){let t="string"==typeof e[0]?e[0]:e[0].name;return this._parsed.get(t)}getAll(...e){var t;let r=Array.from(this._parsed.values());if(!e.length)return r;let s="string"==typeof e[0]?e[0]:null==(t=e[0])?void 0:t.name;return r.filter(e=>e.name===s)}has(e){return this._parsed.has(e)}set(...e){let[t,r,s]=1===e.length?[e[0].name,e[0].value,e[0]]:e,a=this._parsed;return a.set(t,function(e={name:"",value:""}){return"number"==typeof e.expires&&(e.expires=new Date(e.expires)),e.maxAge&&(e.expires=new Date(Date.now()+1e3*e.maxAge)),(null===e.path||void 0===e.path)&&(e.path="/"),e}({name:t,value:r,...s})),function(e,t){for(let[,r]of(t.delete("set-cookie"),e)){let e=i(r);t.append("set-cookie",e)}}(a,this._headers),this}delete(...e){let[t,r,s]="string"==typeof e[0]?[e[0]]:[e[0].name,e[0].path,e[0].domain];return this.set({name:t,path:r,domain:s,value:"",expires:new Date(0)})}[Symbol.for("edge-runtime.inspect.custom")](){return`ResponseCookies ${JSON.stringify(Object.fromEntries(this._parsed))}`}toString(){return[...this._parsed.values()].map(i).join("; ")}}},38238:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"ReflectAdapter",{enumerable:!0,get:function(){return r}});class r{static get(e,t,r){let s=Reflect.get(e,t,r);return"function"==typeof s?s.bind(e):s}static set(e,t,r,s){return Reflect.set(e,t,r,s)}static has(e,t){return Reflect.has(e,t)}static deleteProperty(e,t){return Reflect.deleteProperty(e,t)}}},92044:(e,t,r)=>{Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var r in t)Object.defineProperty(e,r,{enumerable:!0,get:t[r]})}(t,{RequestCookies:function(){return s.RequestCookies},ResponseCookies:function(){return s.ResponseCookies},stringifyCookie:function(){return s.stringifyCookie}});let s=r(79925)},4988:(e,t,r)=>{function s(){return{host:process.env.DATABRICKS_HOST||"",token:process.env.DATABRICKS_TOKEN||"",warehouseId:process.env.DATABRICKS_WAREHOUSE_ID||"",catalog:process.env.DATABRICKS_CATALOG||"hive_metastore"}}function a(){let e=s();return!!(e.host&&e.token&&e.warehouseId)}async function o(e){let t=s();if(!t.host||!t.token||!t.warehouseId)throw Error("Databricks not configured — missing required credentials");let r=Date.now(),a=e.replace(/\s+/g," ").slice(0,140);console.log(`🟣 [Databricks SQL] ${a}${e.length>140?"…":""}`);let o=t.host.trim().replace(/\/$/,"");/^https?:\/\//i.test(o)||(o=`https://${o}`);let i=`${o}/api/2.0/sql/statements`;try{let s=await fetch(i,{method:"POST",headers:{Authorization:`Bearer ${t.token}`,"Content-Type":"application/json"},body:JSON.stringify({warehouse_id:t.warehouseId,statement:e,wait_timeout:"30s",catalog:t.catalog,disposition:"INLINE",format:"JSON_ARRAY"})});if(!s.ok){let e=await s.text();throw Error(`Databricks API error (${s.status}): ${e}`)}let a=await s.json();if(a.status?.state==="FAILED")throw Error(a.status.error?.message||"Query execution failed");if(a.status?.state==="PENDING"||a.status?.state==="RUNNING")throw Error("Query timed out — try a simpler query or increase timeout");let o=a.manifest?.schema?.columns?.map(e=>e.name)||[],c=(a.result?.data_array||[]).map(e=>{let t={};return o.forEach((r,s)=>{t[r]=e[s]}),t});return{data:c,rowCount:c.length,executionTime:Date.now()-r}}catch(t){let e=Date.now()-r;throw t instanceof Error&&(t.message=`${t.message} (after ${e}ms)`),t}}async function i(){try{let e=await o("SELECT 1 as connection_test");return{success:1===e.data.length}}catch(e){return{success:!1,error:e instanceof Error?e.message:"Connection test failed"}}}r.d(t,{L2:()=>a,M7:()=>i,Vn:()=>o})}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[8948,5972],()=>r(16195));module.exports=s})();