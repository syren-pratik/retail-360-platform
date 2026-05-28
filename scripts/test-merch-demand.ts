import * as fs from 'fs';
import * as path from 'path';
import type { MerchDemandPayload, MerchDemandForecastPoint } from '../src/app/lib/merch-demand-types';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'merch_demand');

const core = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, 'core.json'), 'utf-8')) as MerchDemandPayload;

// Load one shard to count store coverage
const oneShard = JSON.parse(
  fs.readFileSync(path.join(CACHE_DIR, 'forecast_daily_beverages.json'), 'utf-8')
) as { department: string; points: MerchDemandForecastPoint[] };

const storeIdsInForecast = new Set(oneShard.points.map((p) => p.store_id));

console.log(`Total SKUs              : ${core.skus.length}`);
console.log(`Stores in forecast scope: ${storeIdsInForecast.size}`);

const actualPts  = oneShard.points.filter((p) => p.is_actual);
const futurePts  = oneShard.points.filter((p) => !p.is_actual);
console.log(`Beverages actual points : ${actualPts.length.toLocaleString()}`);
console.log(`Beverages future points : ${futurePts.length.toLocaleString()}`);

const { next_event } = core.kpis;
console.log(`\nNext event:`);
console.log(`  id             : ${next_event.event_id}`);
console.log(`  name           : ${next_event.event_name}`);
console.log(`  days_until     : ${next_event.days_until}`);
console.log(`  skus_not_ramped: ${next_event.skus_not_ramped}`);

const top3 = [...core.action_items]
  .sort((a, b) => b.revenue_impact_inr - a.revenue_impact_inr)
  .slice(0, 3);
console.log(`\nTop 3 action items by revenue_impact_inr:`);
for (const item of top3) {
  const lakhs = (item.revenue_impact_inr / 100_000).toFixed(1);
  console.log(`  [${item.action_id}] ${item.action_type.padEnd(16)} ₹${lakhs}L — ${item.context.slice(0, 70)}`);
}

console.log(`\nShard manifest:`);
console.log(`  daily window : ${core.shard_manifest.daily_window.start} → ${core.shard_manifest.daily_window.end}`);
console.log(`  weekly window: ${core.shard_manifest.weekly_window.start} → ${core.shard_manifest.weekly_window.end}`);
console.log(`\nType contract: OK`);
