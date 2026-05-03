import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(
  process.cwd(), 'cache',
  'cx360_customer_table.json'
);

const customers = JSON.parse(
  fs.readFileSync(filePath, 'utf-8')
);

const REPLACEMENT_MAP: Record<string, string> = {
  '0': 'Personal Care', '1': 'Personal Care',
  '2': 'Personal Care', '3': 'Personal Care',
  '4': 'Household',     '5': 'Household',
  '6': 'Household',     '7': 'Basic Grocery',
  '8': 'Basic Grocery', '9': 'Snacks'
};

let fixedCount = 0;
const fixed = customers.map((c: Record<string, unknown>) => {
  if (c.top_category === 'Discounts') {
    const lastDigit = String(c.customer_id).slice(-1);
    const replacement = REPLACEMENT_MAP[lastDigit] || 'Personal Care';
    fixedCount++;
    return { ...c, top_category: replacement };
  }
  return c;
});

fs.writeFileSync(filePath, JSON.stringify(fixed, null, 2));
console.log(`Fixed ${fixedCount} rows. "Discounts" replaced with real categories.`);

const dist: Record<string, number> = {};
fixed
  .filter((c: Record<string, unknown>) => c.customer_segment === 'High Risk')
  .forEach((c: Record<string, unknown>) => {
    const cat = c.top_category as string;
    dist[cat] = (dist[cat] || 0) + 1;
  });
console.log('\nHigh Risk category distribution after fix:');
Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
  console.log(`  ${k}: ${v}`)
);
