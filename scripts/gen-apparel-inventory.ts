/**
 * Apparel Inventory + Supply data generator — emits 26 cache files into cache/apparel/
 * Spec: docs/apparel-inventory-spec.md
 *
 * 20 grocery-mirror files (inventory_*.json + supply_*.json) preserving grocery
 * field shape (so the schema linter passes) populated with apparel-realistic
 * values (USD, US suppliers, US stores), plus apparel-additive whitelisted fields.
 *
 * 6 net-new apparel-native cache files for Phase E charts:
 *   apparel_size_curve / apparel_color_performance / apparel_style_velocity /
 *   apparel_aged_inventory / apparel_markdown_lifecycle / apparel_branded_vs_pl
 *
 * Run: npm run gen:apparel-inventory
 */

import * as fs from 'fs';
import * as path from 'path';

// ====================================================================
// SEEDED RNG (mulberry32) — deterministic across runs
// ====================================================================
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 0xa991ed20; // distinct from cx360 0xa9981ed1
const rng = mulberry32(SEED);
const r = () => rng();
const rb = (lo: number, hi: number) => lo + r() * (hi - lo);
const ri = (lo: number, hi: number) => Math.floor(rb(lo, hi + 1));
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
function weightedPick<T extends string>(items: ReadonlyArray<[T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) { x -= w; if (x <= 0) return v; }
  return items[items.length - 1][0];
}
function gaussian(mu: number, sigma: number): number {
  const u1 = Math.max(1e-9, r());
  const u2 = r();
  return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

// ====================================================================
// APPAREL INVENTORY DOMAIN CONSTANTS — §1 of spec
// ====================================================================

// §1.12 Frozen current_date for deterministic season aging
const CURRENT_DATE = new Date('2026-06-29T00:00:00.000Z');
const TODAY_ISO = '2026-06-29';

// §1.1 Departments (8)
type Dept = "Women's Tops" | "Women's Bottoms" | "Women's Dresses" | "Men's Tops" | "Men's Bottoms" | "Kids'" | 'Footwear' | 'Accessories';
const DEPARTMENTS: Dept[] = [
  "Women's Tops", "Women's Bottoms", "Women's Dresses",
  "Men's Tops", "Men's Bottoms", "Kids'", 'Footwear', 'Accessories',
];

// L2 categories per dept
const CATEGORY_L2: Record<Dept, string[]> = {
  "Women's Tops": ['Crew Tee', 'Tank', 'Blouse', 'Sweater', 'Cardigan', 'Polo'],
  "Women's Bottoms": ['Jeans', 'Leggings', 'Trousers', 'Shorts', 'Skirt'],
  "Women's Dresses": ['Midi Dress', 'Maxi Dress', 'Mini Dress', 'Wrap Dress'],
  "Men's Tops": ['Crew Tee', 'Polo', 'Button-Down', 'Sweater', 'Hoodie'],
  "Men's Bottoms": ['Jeans', 'Chinos', 'Joggers', 'Shorts'],
  "Kids'": ['Tops', 'Bottoms', 'Outfits', 'Sleepwear'],
  Footwear: ['Sneakers', 'Boots', 'Sandals', 'Heels', 'Flats'],
  Accessories: ['Handbag', 'Wallet', 'Belt', 'Sunglasses', 'Watch', 'Backpack'],
};

// Size sets (§1.2)
const SIZE_SETS: Record<string, string[]> = {
  TOPS_ADULT: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  JEANS_M: ['28×30', '30×30', '30×32', '32×30', '32×32', '32×34', '34×32', '34×34', '36×32', '38×32', '40×32'],
  JEANS_W: ['24', '25', '26', '27', '28', '29', '30', '31', '32'],
  DRESSES_W: ['XS', 'S', 'M', 'L', 'XL'],
  KIDS: ['2T', '3T', '4T', '5', '6', '7', '8', '10', '12', '14'],
  SHOES_M: ['7', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12', '13'],
  SHOES_W: ['5', '6', '7', '7.5', '8', '8.5', '9', '10', '11'],
  OS: ['OS'],
};
function pickSizeSetFor(dept: Dept, cat: string): string {
  if (dept === 'Footwear') return r() < 0.5 ? 'SHOES_M' : 'SHOES_W';
  if (dept === 'Accessories') return 'OS';
  if (dept === "Kids'") return 'KIDS';
  if (cat === 'Jeans') return dept.startsWith('Men') ? 'JEANS_M' : 'JEANS_W';
  if (dept === "Women's Dresses") return 'DRESSES_W';
  return 'TOPS_ADULT';
}

// 12 standard apparel colours (CX360 §1.5)
const COLORS = ['Black', 'White', 'Navy', 'Gray', 'Indigo', 'Khaki', 'Olive', 'Burgundy', 'Pink', 'Yellow', 'Red', 'Blue'] as const;

// §1.3 Lifecycle stages
const LIFECYCLE_STAGES = ['Intro', 'Core', 'Markdown-1', 'Markdown-2', 'Markdown-3', 'Clearance', 'Discontinued'] as const;
type Lifecycle = typeof LIFECYCLE_STAGES[number];
const LIFECYCLE_WEIGHTS: Array<[Lifecycle, number]> = [
  ['Intro', 8], ['Core', 48], ['Markdown-1', 14], ['Markdown-2', 11],
  ['Markdown-3', 8], ['Clearance', 9], ['Discontinued', 2],
];

// §1.4 Season tags
const SEASONS_ACTIVE = ['SS25', 'FW25', 'SS26', 'FW26'] as const;
const SEASON_WEIGHTS: Array<[typeof SEASONS_ACTIVE[number], number]> = [
  ['SS25', 6], ['FW25', 18], ['SS26', 58], ['FW26', 18],
];

// §1.6 ABCD velocity
const VELOCITY_CLASSES = ['A', 'B', 'C', 'D'] as const;
type Velocity = typeof VELOCITY_CLASSES[number];
const VELOCITY_WEIGHTS: Array<[Velocity, number]> = [['A', 8], ['B', 18], ['C', 34], ['D', 40]];
const VELOCITY_SERVICE_LEVEL: Record<Velocity, number> = { A: 98, B: 95, C: 90, D: 80 };
const VELOCITY_Z: Record<Velocity, number> = { A: 2.05, B: 1.65, C: 1.28, D: 0.84 };

// §1.8 Supplier types
type SupplierType = 'Branded Direct' | 'Private Label Vendor' | 'Import Wholesaler' | 'Off-Price Reseller';

// §1.9 30 US apparel suppliers
interface SupplierSpec {
  id: string; name: string; short_name: string; type: SupplierType;
  hq_city: string; hq_state: string; origins: string[]; depts: Dept[];
}
const SUPPLIERS: SupplierSpec[] = [
  { id: 'SUP-A001', name: 'Nike Inc', short_name: 'Nike', type: 'Branded Direct', hq_city: 'Beaverton', hq_state: 'OR', origins: ['Vietnam', 'Indonesia', 'China'], depts: ["Men's Tops", "Women's Tops", 'Footwear', "Kids'"] },
  { id: 'SUP-A002', name: 'Levi Strauss & Co', short_name: "Levi's", type: 'Branded Direct', hq_city: 'San Francisco', hq_state: 'CA', origins: ['Mexico', 'Vietnam', 'Pakistan'], depts: ["Men's Bottoms", "Women's Bottoms"] },
  { id: 'SUP-A003', name: 'Lululemon Athletica', short_name: 'LULU', type: 'Branded Direct', hq_city: 'Vancouver', hq_state: 'BC', origins: ['Vietnam', 'Sri Lanka', 'Bangladesh'], depts: ["Women's Tops", "Women's Bottoms", "Men's Tops"] },
  { id: 'SUP-A004', name: 'VF Corporation', short_name: 'VF Corp', type: 'Branded Direct', hq_city: 'Denver', hq_state: 'CO', origins: ['Vietnam', 'China'], depts: ['Footwear', "Men's Tops"] },
  { id: 'SUP-A005', name: 'PVH Corp', short_name: 'PVH', type: 'Branded Direct', hq_city: 'New York', hq_state: 'NY', origins: ['Bangladesh', 'Vietnam', 'India'], depts: ["Men's Tops", "Women's Tops"] },
  { id: 'SUP-A006', name: 'Tapestry Inc', short_name: 'Coach', type: 'Branded Direct', hq_city: 'New York', hq_state: 'NY', origins: ['Italy', 'Vietnam', 'China'], depts: ['Accessories'] },
  { id: 'SUP-A007', name: 'Under Armour Inc', short_name: 'UA', type: 'Branded Direct', hq_city: 'Baltimore', hq_state: 'MD', origins: ['Jordan', 'Vietnam', 'Indonesia'], depts: ["Men's Tops", "Women's Tops", 'Footwear'] },
  { id: 'SUP-A008', name: 'Adidas America Inc', short_name: 'Adidas', type: 'Branded Direct', hq_city: 'Portland', hq_state: 'OR', origins: ['Vietnam', 'Indonesia'], depts: ["Men's Tops", "Women's Tops", 'Footwear'] },
  { id: 'SUP-A009', name: 'Hanesbrands Inc', short_name: 'Hanes', type: 'Branded Direct', hq_city: 'Winston-Salem', hq_state: 'NC', origins: ['Honduras', 'Dominican Republic'], depts: ["Men's Tops", "Kids'"] },
  { id: 'SUP-A010', name: "Carter's Inc", short_name: "Carter's", type: 'Branded Direct', hq_city: 'Atlanta', hq_state: 'GA', origins: ['Cambodia', 'Vietnam'], depts: ["Kids'"] },
  { id: 'SUP-A011', name: 'New Balance Inc', short_name: 'NB', type: 'Branded Direct', hq_city: 'Boston', hq_state: 'MA', origins: ['Vietnam', 'Indonesia', 'USA'], depts: ['Footwear'] },
  { id: 'SUP-A012', name: 'Kontoor Brands', short_name: 'Wrangler', type: 'Branded Direct', hq_city: 'Greensboro', hq_state: 'NC', origins: ['Mexico', 'Bangladesh'], depts: ["Men's Bottoms"] },
  { id: 'SUP-A013', name: 'Gap Inc Sourcing', short_name: 'Gap', type: 'Branded Direct', hq_city: 'San Francisco', hq_state: 'CA', origins: ['Vietnam', 'Bangladesh', 'India'], depts: ["Kids'", "Men's Bottoms", "Women's Bottoms", "Men's Tops"] },
  { id: 'SUP-A014', name: 'J.Crew Group', short_name: 'J.Crew', type: 'Branded Direct', hq_city: 'New York', hq_state: 'NY', origins: ['China', 'Vietnam'], depts: ["Men's Tops", "Women's Tops", "Women's Bottoms"] },
  { id: 'SUP-A015', name: 'Hansae America Inc', short_name: 'Hansae', type: 'Private Label Vendor', hq_city: 'New York', hq_state: 'NY', origins: ['Vietnam', 'Indonesia'], depts: ["Women's Dresses", "Women's Tops"] },
  { id: 'SUP-A016', name: 'Premier Apparel Group', short_name: 'Premier', type: 'Private Label Vendor', hq_city: 'Los Angeles', hq_state: 'CA', origins: ['China', 'Vietnam'], depts: ["Women's Tops", "Women's Bottoms"] },
  { id: 'SUP-A017', name: 'Li & Fung Americas', short_name: 'Li & Fung', type: 'Private Label Vendor', hq_city: 'New York', hq_state: 'NY', origins: ['China', 'Vietnam', 'Bangladesh'], depts: DEPARTMENTS },
  { id: 'SUP-A018', name: 'MAS Holdings USA', short_name: 'MAS', type: 'Private Label Vendor', hq_city: 'New York', hq_state: 'NY', origins: ['Sri Lanka'], depts: ["Women's Bottoms", "Women's Tops"] },
  { id: 'SUP-A019', name: 'Esquel Group USA', short_name: 'Esquel', type: 'Private Label Vendor', hq_city: 'New York', hq_state: 'NY', origins: ['China', 'Vietnam'], depts: ["Men's Tops"] },
  { id: 'SUP-A020', name: 'Centric Brands', short_name: 'Centric', type: 'Private Label Vendor', hq_city: 'New York', hq_state: 'NY', origins: ['China', 'Vietnam'], depts: ["Kids'", 'Accessories'] },
  { id: 'SUP-A021', name: 'Tristate Apparel', short_name: 'Tristate', type: 'Import Wholesaler', hq_city: 'Edison', hq_state: 'NJ', origins: ['India', 'China'], depts: ["Women's Tops", "Women's Dresses"] },
  { id: 'SUP-A022', name: 'Eastex Products', short_name: 'Eastex', type: 'Import Wholesaler', hq_city: 'Atlanta', hq_state: 'GA', origins: ['Bangladesh', 'China'], depts: ["Men's Tops", "Kids'"] },
  { id: 'SUP-A023', name: 'One Step Up Ltd', short_name: 'OneStep', type: 'Import Wholesaler', hq_city: 'New York', hq_state: 'NY', origins: ['China', 'Vietnam'], depts: ["Women's Tops", 'Accessories'] },
  { id: 'SUP-A024', name: 'Sky Industries USA', short_name: 'Sky', type: 'Import Wholesaler', hq_city: 'Los Angeles', hq_state: 'CA', origins: ['China', 'Pakistan'], depts: ["Men's Bottoms", "Men's Tops"] },
  { id: 'SUP-A025', name: 'Cherokee Global Brands', short_name: 'Cherokee', type: 'Import Wholesaler', hq_city: 'Sherman Oaks', hq_state: 'CA', origins: ['China', 'India'], depts: ["Kids'", "Women's Tops"] },
  { id: 'SUP-A026', name: 'Closeout Brokers Intl', short_name: 'CBI', type: 'Off-Price Reseller', hq_city: 'Secaucus', hq_state: 'NJ', origins: ['USA'], depts: DEPARTMENTS },
  { id: 'SUP-A027', name: 'Wholesale Liquidators', short_name: 'WSL', type: 'Off-Price Reseller', hq_city: 'Long Island City', hq_state: 'NY', origins: ['USA'], depts: ['Accessories', 'Footwear'] },
  { id: 'SUP-A028', name: 'Apparel Recovery Group', short_name: 'ARG', type: 'Off-Price Reseller', hq_city: 'Charlotte', hq_state: 'NC', origins: ['USA'], depts: DEPARTMENTS },
  { id: 'SUP-A029', name: 'Fashion Returns Network', short_name: 'FRN', type: 'Off-Price Reseller', hq_city: 'Memphis', hq_state: 'TN', origins: ['USA'], depts: DEPARTMENTS },
  { id: 'SUP-A030', name: 'Bargain Bay Sourcing', short_name: 'BBS', type: 'Off-Price Reseller', hq_city: 'Houston', hq_state: 'TX', origins: ["Kids'" as any, 'Footwear' as any].length ? ['USA'] : ['USA'], depts: ["Kids'", 'Footwear'] },
];

// Supplier-type behavior bands (§1.10, §1.11)
const SUPPLIER_TYPE_PROFILES: Record<SupplierType, {
  otif_band: [number, number]; lead_weeks_band: [number, number]; fill_band: [number, number]; margin_band: [number, number]; delay_weeks_band: [number, number];
  delay_mix: { fabric_shortage_pct: number; port_congestion_pct: number; production_capacity_pct: number; qc_fail_pct: number; customs_hold_pct: number; sample_approval_pct: number };
}> = {
  'Branded Direct': { otif_band: [84, 96], lead_weeks_band: [4, 12], fill_band: [88, 96], margin_band: [38, 48], delay_weeks_band: [0.6, 2.4],
    delay_mix: { fabric_shortage_pct: 8, port_congestion_pct: 26, production_capacity_pct: 28, qc_fail_pct: 12, customs_hold_pct: 12, sample_approval_pct: 14 } },
  'Private Label Vendor': { otif_band: [72, 86], lead_weeks_band: [12, 18], fill_band: [76, 88], margin_band: [52, 62], delay_weeks_band: [1.8, 4.2],
    delay_mix: { fabric_shortage_pct: 28, port_congestion_pct: 14, production_capacity_pct: 24, qc_fail_pct: 10, customs_hold_pct: 6, sample_approval_pct: 18 } },
  'Import Wholesaler': { otif_band: [64, 78], lead_weeks_band: [10, 16], fill_band: [70, 82], margin_band: [28, 38], delay_weeks_band: [2.4, 5.6],
    delay_mix: { fabric_shortage_pct: 12, port_congestion_pct: 34, production_capacity_pct: 18, qc_fail_pct: 10, customs_hold_pct: 22, sample_approval_pct: 4 } },
  'Off-Price Reseller': { otif_band: [86, 96], lead_weeks_band: [2, 4], fill_band: [92, 98], margin_band: [18, 28], delay_weeks_band: [0.2, 1.2],
    delay_mix: { fabric_shortage_pct: 0, port_congestion_pct: 0, production_capacity_pct: 0, qc_fail_pct: 24, customs_hold_pct: 16, sample_approval_pct: 0 } /* logistics implicit; padded below */ },
};

// §1.12 4 US apparel DCs
interface DCSpec { id: string; name: string; city: string; state: string; region: 'West' | 'Central' | 'East' | 'Southeast'; states: string[]; capacity_pallets_day: number; }
const DCS: DCSpec[] = [
  { id: 'DC-A01', name: 'Reno DC', city: 'Reno', state: 'NV', region: 'West', states: ['CA', 'NV', 'AZ', 'OR', 'WA'], capacity_pallets_day: 4200 },
  { id: 'DC-A02', name: 'Memphis DC', city: 'Memphis', state: 'TN', region: 'Central', states: ['TX', 'MO', 'IL', 'OH', 'MI', 'MN', 'IN'], capacity_pallets_day: 5800 },
  { id: 'DC-A03', name: 'Allentown DC', city: 'Allentown', state: 'PA', region: 'East', states: ['NY', 'NJ', 'PA', 'MA', 'CT', 'MD'], capacity_pallets_day: 4800 },
  { id: 'DC-A04', name: 'Atlanta DC', city: 'Atlanta', state: 'GA', region: 'Southeast', states: ['GA', 'FL', 'NC', 'SC'], capacity_pallets_day: 3600 },
];

// §1.6/CX360 — 50 US stores
interface StoreSpec { id: string; name: string; city: string; state: string; metro: string; format: 'Flagship' | 'Standard' | 'Outlet' | 'Express'; }
const STORE_DATA: Array<[string, string, string, string, string]> = [
  ['STR-A001', 'Flagship SoHo NYC', 'New York', 'NY', 'NYC'],
  ['STR-A002', 'Standard 5th Ave NYC', 'New York', 'NY', 'NYC'],
  ['STR-A003', 'Outlet Woodbury Common', 'Central Valley', 'NY', 'NYC'],
  ['STR-A004', 'Standard Brooklyn Atlantic', 'Brooklyn', 'NY', 'NYC'],
  ['STR-A005', 'Flagship Newbury St Boston', 'Boston', 'MA', 'Boston'],
  ['STR-A006', 'Standard Prudential Boston', 'Boston', 'MA', 'Boston'],
  ['STR-A007', 'Outlet Wrentham Premium', 'Wrentham', 'MA', 'Boston'],
  ['STR-A008', 'Standard King of Prussia', 'King of Prussia', 'PA', 'Philadelphia'],
  ['STR-A009', 'Standard Walnut St Philly', 'Philadelphia', 'PA', 'Philadelphia'],
  ['STR-A010', 'Flagship Mag Mile Chicago', 'Chicago', 'IL', 'Chicago'],
  ['STR-A011', 'Standard Oakbrook Center', 'Oak Brook', 'IL', 'Chicago'],
  ['STR-A012', 'Outlet Aurora Premium', 'Aurora', 'IL', 'Chicago'],
  ['STR-A013', 'Standard Mall of America', 'Bloomington', 'MN', 'Minneapolis'],
  ['STR-A014', 'Standard Somerset Detroit', 'Troy', 'MI', 'Detroit'],
  ['STR-A015', 'Standard Easton Town Center', 'Columbus', 'OH', 'Columbus'],
  ['STR-A016', 'Flagship Lenox Square Atlanta', 'Atlanta', 'GA', 'Atlanta'],
  ['STR-A017', 'Outlet North Georgia Premium', 'Dawsonville', 'GA', 'Atlanta'],
  ['STR-A018', 'Standard SouthPark Charlotte', 'Charlotte', 'NC', 'Charlotte'],
  ['STR-A019', 'Standard Bal Harbour Shops Miami', 'Bal Harbour', 'FL', 'Miami'],
  ['STR-A020', 'Standard Aventura Mall', 'Aventura', 'FL', 'Miami'],
  ['STR-A021', 'Outlet Sawgrass Mills', 'Sunrise', 'FL', 'Miami'],
  ['STR-A022', 'Standard Mall at Millenia Orlando', 'Orlando', 'FL', 'Orlando'],
  ['STR-A023', 'Standard Galleria Houston', 'Houston', 'TX', 'Houston'],
  ['STR-A024', 'Standard Highland Village Houston', 'Houston', 'TX', 'Houston'],
  ['STR-A025', 'Flagship Galleria Dallas', 'Dallas', 'TX', 'Dallas'],
  ['STR-A026', 'Standard NorthPark Dallas', 'Dallas', 'TX', 'Dallas'],
  ['STR-A027', 'Outlet Allen Premium', 'Allen', 'TX', 'Dallas'],
  ['STR-A028', 'Flagship S Congress Austin', 'Austin', 'TX', 'Austin'],
  ['STR-A029', 'Standard Domain Austin', 'Austin', 'TX', 'Austin'],
  ['STR-A030', 'Standard La Cantera San Antonio', 'San Antonio', 'TX', 'San Antonio'],
  ['STR-A031', 'Flagship Beverly Center LA', 'Los Angeles', 'CA', 'Los Angeles'],
  ['STR-A032', 'Standard Grove LA', 'Los Angeles', 'CA', 'Los Angeles'],
  ['STR-A033', 'Standard South Coast Plaza', 'Costa Mesa', 'CA', 'Los Angeles'],
  ['STR-A034', 'Outlet Citadel LA', 'Commerce', 'CA', 'Los Angeles'],
  ['STR-A035', 'Flagship Union Sq SF', 'San Francisco', 'CA', 'San Francisco'],
  ['STR-A036', 'Standard Stanford Shopping', 'Palo Alto', 'CA', 'San Francisco'],
  ['STR-A037', 'Standard Fashion Valley San Diego', 'San Diego', 'CA', 'San Diego'],
  ['STR-A038', 'Standard Scottsdale Fashion Square', 'Scottsdale', 'AZ', 'Phoenix'],
  ['STR-A039', 'Outlet Phoenix Premium', 'Chandler', 'AZ', 'Phoenix'],
  ['STR-A040', 'Standard Forum Las Vegas', 'Las Vegas', 'NV', 'Las Vegas'],
  ['STR-A041', 'Standard Cherry Creek Denver', 'Denver', 'CO', 'Denver'],
  ['STR-A042', 'Standard Park Meadows Denver', 'Lone Tree', 'CO', 'Denver'],
  ['STR-A043', 'Flagship University Village Seattle', 'Seattle', 'WA', 'Seattle'],
  ['STR-A044', 'Standard Bellevue Square', 'Bellevue', 'WA', 'Seattle'],
  ['STR-A045', 'Standard Pioneer Place Portland', 'Portland', 'OR', 'Portland'],
  ['STR-A046', 'Standard Plaza Frontenac St Louis', 'St. Louis', 'MO', 'St. Louis'],
  ['STR-A047', 'Standard Country Club Plaza KC', 'Kansas City', 'MO', 'Kansas City'],
  ['STR-A048', 'Standard Crocker Park Cleveland', 'Westlake', 'OH', 'Cleveland'],
  ['STR-A049', 'Standard Indianapolis Fashion Mall', 'Indianapolis', 'IN', 'Indianapolis'],
  ['STR-A050', 'Standard Stamford Town Center', 'Stamford', 'CT', 'NYC'],
];
const STORES: StoreSpec[] = STORE_DATA.map(([id, name, city, state, metro]) => ({
  id, name, city, state, metro,
  format: name.startsWith('Flagship') ? 'Flagship' : name.startsWith('Outlet') ? 'Outlet' : 'Standard',
}));

// §1.15 Delay reasons (apparel 6)
const DELAY_REASONS = ['Fabric Shortage', 'Port Congestion', 'Production Capacity', 'QC Fail', 'Customs Hold', 'Sample Approval Delay'] as const;

// Ports of origin
const PORTS = ['Ho Chi Minh', 'Yantian', 'Chittagong', 'Jebel Ali', 'Long Beach', 'Karachi', 'Colombo', 'Shanghai', 'Manzanillo'];
const PORT_BY_ORIGIN: Record<string, string> = {
  Vietnam: 'Ho Chi Minh', Indonesia: 'Jakarta', China: 'Yantian', Bangladesh: 'Chittagong',
  India: 'Mundra', Pakistan: 'Karachi', 'Sri Lanka': 'Colombo', Mexico: 'Manzanillo',
  USA: 'Long Beach', Honduras: 'Puerto Cortes', 'Dominican Republic': 'Caucedo',
  Cambodia: 'Sihanoukville', Jordan: 'Aqaba', Italy: 'Genoa',
};
function portFor(origin: string): string { return PORT_BY_ORIGIN[origin] ?? pick(PORTS); }

// US first names (account managers, ops contacts)
const US_FIRST = ['Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Drew', 'Quinn', 'Reese', 'Sage', 'Devon', 'Hayden', 'Cameron', 'Parker', 'Skyler', 'Logan', 'Dakota', 'Emerson', 'Finley', 'Harper'];
const US_LAST = ['Walker', 'Bennett', 'Sullivan', 'Reed', 'Chen', 'Patel', 'Garcia', 'Murphy', 'Foster', 'Kim', 'Singh', 'Brooks', 'Bell', 'Hayes', 'Mitchell', 'Carter', 'Diaz', 'Nguyen', 'Powell', 'Hughes'];
function usName(): string { return `${pick(US_FIRST)} ${pick(US_LAST)}`; }

// US holiday/event windows (apparel)
const EVENT_WINDOWS = ['Memorial Day', 'July 4', 'BTS', 'Labor Day', 'BFCM'] as const;

// ====================================================================
// MASTER SKU TABLE — built once, used by every generator
// ====================================================================
interface SKU {
  product_id: string;     // e.g. APR-WB-0001-IND-32×32 (size-color granular)
  style_id: string;       // e.g. LEV-501
  style_code: string;     // human style number
  style_name: string;     // marketing name
  product_name: string;   // marketing name + color + size
  brand: string;
  dept: Dept;
  category_l1: string;    // mapped to grocery 'department' field too
  category_l2: string;
  size_set: string;
  size: string;
  color: string;
  season_tag: typeof SEASONS_ACTIVE[number];
  lifecycle_stage: Lifecycle;
  velocity_class: Velocity;
  supplier_id: string;
  supplier_name: string;
  cost_usd: number;
  mrp_usd: number;
  current_price_usd: number;
  margin_pct: number;
  weeks_on_floor: number;
  sell_through_pct: number;  // 0-1
  avg_daily_demand: number;  // network avg per size-color SKU
}

// Brand/dept seed for naming
const BRAND_NAMES_BY_DEPT: Record<Dept, string[]> = {
  "Women's Tops": ['Madewell', 'Lululemon', 'J.Crew', 'Zara', 'H&M', 'Old Navy', 'Banana Republic'],
  "Women's Bottoms": ['Levi\'s', 'Madewell', 'Lululemon', 'Old Navy', 'Gap'],
  "Women's Dresses": ['Zara', 'H&M', 'Madewell', 'Hansae', 'Forever 21'],
  "Men's Tops": ['Nike', 'Adidas', 'Under Armour', 'Calvin Klein', 'J.Crew', 'Gap', 'Hanes'],
  "Men's Bottoms": ['Levi\'s', 'Wrangler', 'Lee', 'Gap', 'Banana Republic'],
  "Kids'": ['Carter\'s', 'OshKosh B\'gosh', 'Old Navy', 'Nike Kids', 'Hanes Kids'],
  Footwear: ['Nike', 'Adidas', 'New Balance', 'Vans', 'Converse', 'Dr. Martens'],
  Accessories: ['Coach', 'Fossil', 'Ray-Ban', 'Herschel'],
};

const STYLE_TEMPLATES: Record<Dept, Array<[string, string]>> = {
  "Women's Tops": [['Crew Tee', 'Crew Tee'], ['Tank', 'Ribbed Tank'], ['Blouse', 'Silk Blouse'], ['Sweater', 'Cashmere Sweater'], ['Cardigan', 'Open Cardigan'], ['Polo', 'Pique Polo']],
  "Women's Bottoms": [['Jeans', '501 Original'], ['Jeans', 'Skinny Jean'], ['Jeans', 'Wide-Leg Crop'], ['Leggings', 'Align Pant'], ['Trousers', 'Pleated Trouser'], ['Shorts', 'Denim Short'], ['Skirt', 'A-Line Skirt']],
  "Women's Dresses": [['Midi Dress', 'Floral Midi'], ['Maxi Dress', 'Cotton Maxi'], ['Mini Dress', 'Bodycon Mini'], ['Wrap Dress', 'Wrap Dress']],
  "Men's Tops": [['Crew Tee', 'Sportswear Club Crew'], ['Polo', 'Cotton Polo'], ['Button-Down', 'Oxford Button-Down'], ['Sweater', 'Wool Sweater'], ['Hoodie', 'Fleece Hoodie']],
  "Men's Bottoms": [['Jeans', '501 Original'], ['Jeans', '502 Slim'], ['Chinos', 'Classic Chino'], ['Joggers', 'Tech Jogger'], ['Shorts', 'Cargo Short']],
  "Kids'": [['Tops', 'Crew Tee'], ['Bottoms', 'Pull-On Pant'], ['Outfits', '2-Piece Set'], ['Sleepwear', 'PJ Set']],
  Footwear: [['Sneakers', 'Air Force 1 \'07'], ['Sneakers', 'Air Max 90'], ['Sneakers', 'Stan Smith'], ['Boots', 'Chelsea Boot'], ['Sandals', 'Slide Sandal'], ['Heels', 'Block Heel'], ['Flats', 'Ballet Flat']],
  Accessories: [['Handbag', 'Tabby Shoulder Bag'], ['Wallet', 'Bifold Wallet'], ['Belt', 'Leather Belt'], ['Sunglasses', 'Aviator'], ['Watch', 'Minimalist Watch'], ['Backpack', 'Daypack']],
};

// pick supplier matching a dept
function supplierFor(dept: Dept, type?: SupplierType): SupplierSpec {
  let pool = SUPPLIERS.filter(s => s.depts.includes(dept));
  if (type) pool = pool.filter(s => s.type === type);
  if (pool.length === 0) pool = SUPPLIERS.filter(s => s.depts.includes(dept));
  if (pool.length === 0) pool = SUPPLIERS;
  return pool[Math.floor(r() * pool.length)];
}

// Build master style list (~250 styles)
interface StyleDef {
  style_id: string; style_code: string; style_name: string; brand: string;
  dept: Dept; category_l2: string; size_set: string;
  colors: string[]; season_tag: typeof SEASONS_ACTIVE[number];
  lifecycle_stage: Lifecycle; velocity_class: Velocity;
  supplier: SupplierSpec; cost_usd: number; mrp_usd: number; current_price_usd: number;
  margin_pct: number; weeks_on_floor: number; sell_through_pct: number;
}

function buildStyles(): StyleDef[] {
  const styles: StyleDef[] = [];
  let n = 0;
  // ~32 styles per dept × 8 depts ≈ 256
  for (const dept of DEPARTMENTS) {
    const tpls = STYLE_TEMPLATES[dept];
    const brands = BRAND_NAMES_BY_DEPT[dept];
    for (let i = 0; i < 32; i++) {
      const [l2, base] = tpls[i % tpls.length];
      const brand = brands[i % brands.length];
      const lifecycle = weightedPick(LIFECYCLE_WEIGHTS);
      const season = weightedPick(SEASON_WEIGHTS);
      const velocity = weightedPick(VELOCITY_WEIGHTS);
      const supplier = supplierFor(dept);
      const sizeSet = pickSizeSetFor(dept, l2);
      // 1-4 colors per style
      const numCols = 1 + Math.floor(r() * 4);
      const colors: string[] = [];
      const colorPool = [...COLORS].sort(() => r() - 0.5);
      for (let c = 0; c < numCols; c++) colors.push(colorPool[c]);
      // Cost / MRP / price by dept (USD)
      const mrpBase = dept === 'Footwear' ? rb(60, 220) :
        dept === 'Accessories' ? rb(45, 380) :
        dept === "Women's Dresses" ? rb(45, 220) :
        l2 === 'Jeans' ? rb(45, 145) :
        rb(18, 92);
      const mrp = Math.round(mrpBase);
      const marginPct = Math.round(clamp(gaussian(supplier.type === 'Private Label Vendor' ? 56 : supplier.type === 'Off-Price Reseller' ? 24 : supplier.type === 'Import Wholesaler' ? 32 : 42, 6), 14, 68));
      const cost = Math.round(mrp * (1 - marginPct / 100));
      // discount by lifecycle
      const disc = lifecycle === 'Markdown-1' ? 0.25 : lifecycle === 'Markdown-2' ? 0.40 : lifecycle === 'Markdown-3' ? 0.60 : lifecycle === 'Clearance' ? 0.80 : lifecycle === 'Discontinued' ? 0.80 : 0;
      const price = Math.max(cost, Math.round(mrp * (1 - disc)));
      // weeks on floor based on lifecycle
      const wof = lifecycle === 'Intro' ? ri(0, 3) : lifecycle === 'Core' ? ri(4, 12) :
        lifecycle === 'Markdown-1' ? ri(13, 16) : lifecycle === 'Markdown-2' ? ri(17, 20) :
        lifecycle === 'Markdown-3' ? ri(21, 24) : lifecycle === 'Clearance' ? ri(25, 38) : ri(36, 52);
      // sell-through by lifecycle
      const st = lifecycle === 'Intro' ? rb(0.05, 0.24) : lifecycle === 'Core' ? rb(0.32, 0.72) :
        lifecycle === 'Markdown-1' ? rb(0.55, 0.78) : lifecycle === 'Markdown-2' ? rb(0.68, 0.86) :
        lifecycle === 'Markdown-3' ? rb(0.78, 0.92) : lifecycle === 'Clearance' ? rb(0.86, 0.96) : rb(0.92, 0.99);
      const styleId = `${brand.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')}-${l2.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')}-${String(n).padStart(3, '0')}`;
      const styleName = `${brand} ${base}`;
      styles.push({
        style_id: styleId,
        style_code: `${brand.slice(0, 3).toUpperCase()}-${1000 + n}`,
        style_name: styleName,
        brand,
        dept,
        category_l2: l2,
        size_set: sizeSet,
        colors,
        season_tag: season,
        lifecycle_stage: lifecycle,
        velocity_class: velocity,
        supplier,
        cost_usd: cost,
        mrp_usd: mrp,
        current_price_usd: price,
        margin_pct: marginPct,
        weeks_on_floor: wof,
        sell_through_pct: Math.round(st * 100) / 100,
      });
      n++;
    }
  }
  return styles;
}

const STYLES = buildStyles();
// Sort by revenue proxy (velocity × price × (1-st)) so top-200 cap is sensible
const STYLES_RANKED = [...STYLES].sort((a, b) => {
  const vA = (a.velocity_class === 'A' ? 4 : a.velocity_class === 'B' ? 3 : a.velocity_class === 'C' ? 2 : 1);
  const vB = (b.velocity_class === 'A' ? 4 : b.velocity_class === 'B' ? 3 : b.velocity_class === 'C' ? 2 : 1);
  return (vB * b.current_price_usd) - (vA * a.current_price_usd);
});
const TOP_200_STYLES = STYLES_RANKED.slice(0, 200);

// Build SKU rows (size-color granular) at network-aggregate level for top 200 styles
function buildSkuRows(styles: StyleDef[], maxPerStyle = 8): SKU[] {
  const rows: SKU[] = [];
  let pidN = 0;
  for (const s of styles) {
    const sizes = SIZE_SETS[s.size_set];
    const cols = s.colors;
    // Limit to ~maxPerStyle size-color combos per style to keep tables sane
    const combos: Array<[string, string]> = [];
    for (const sz of sizes) for (const c of cols) combos.push([sz, c]);
    combos.sort(() => r() - 0.5);
    const take = combos.slice(0, Math.min(maxPerStyle, combos.length));
    for (const [sz, color] of take) {
      const deptCode = s.dept.startsWith("Women's Tops") ? 'WT' : s.dept.startsWith("Women's Bottoms") ? 'WB' :
        s.dept.startsWith("Women's Dresses") ? 'WD' : s.dept.startsWith("Men's Tops") ? 'MT' :
        s.dept.startsWith("Men's Bottoms") ? 'MB' : s.dept === "Kids'" ? 'KD' :
        s.dept === 'Footwear' ? 'FT' : 'AC';
      pidN++;
      const pid = `APR-${deptCode}-${String(pidN).padStart(4, '0')}-${color.slice(0, 3).toUpperCase()}-${sz}`;
      const baseDemand = s.velocity_class === 'A' ? rb(40, 96) : s.velocity_class === 'B' ? rb(14, 38) :
        s.velocity_class === 'C' ? rb(4, 12) : rb(0.6, 3);
      rows.push({
        product_id: pid,
        style_id: s.style_id,
        style_code: s.style_code,
        style_name: s.style_name,
        product_name: `${s.style_name} ${color} ${sz}`,
        brand: s.brand, dept: s.dept,
        category_l1: s.dept, category_l2: s.category_l2,
        size_set: s.size_set, size: sz, color,
        season_tag: s.season_tag,
        lifecycle_stage: s.lifecycle_stage,
        velocity_class: s.velocity_class,
        supplier_id: s.supplier.id,
        supplier_name: s.supplier.name,
        cost_usd: s.cost_usd, mrp_usd: s.mrp_usd, current_price_usd: s.current_price_usd,
        margin_pct: s.margin_pct,
        weeks_on_floor: s.weeks_on_floor,
        sell_through_pct: s.sell_through_pct,
        avg_daily_demand: Math.round(baseDemand * 10) / 10,
      });
    }
  }
  return rows;
}

const SKUS = buildSkuRows(TOP_200_STYLES, 8);

// ====================================================================
// HELPERS
// ====================================================================
function dateOffset(days: number): string {
  const d = new Date(CURRENT_DATE.getTime() + days * 86400000);
  return d.toISOString().slice(0, 10);
}
function monthLabel(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}
function last12MonthLabels(): string[] {
  const out: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(CURRENT_DATE);
    d.setMonth(d.getMonth() - i);
    out.push(monthLabel(d));
  }
  return out;
}

// ====================================================================
// GENERATORS — inventory_*.json (10 files)
// ====================================================================

// 2.16 inventory_kpis.json — preserved grocery shape (array of 1 stringified)
function genInventoryKpis() {
  const totalSkus = TOP_200_STYLES.length;
  const avgDos = round1(gaussian(42, 3));
  const stockoutPct = round1(SKUS.filter(s => s.avg_daily_demand > 8 && s.sell_through_pct > 0.94).length / SKUS.length * 100);
  const overstockPct = round1(SKUS.filter(s => s.weeks_on_floor > 20).length / SKUS.length * 100);
  const totalStockQty = Math.round(SKUS.reduce((sum, s) => sum + 200 * (1 - s.sell_through_pct), 0));
  return [{
    total_skus: String(totalSkus),
    avg_dos: String(avgDos),
    stockout_pct: String(stockoutPct),
    overstock_pct: String(overstockPct),
    total_stock_qty: String(totalStockQty),
  }];
}

// 2.17 inventory_alerts.json — ~120 alerts
function genInventoryAlerts() {
  const rows: any[] = [];
  const stockoutSkus = SKUS.filter(s => s.sell_through_pct > 0.92).slice(0, 30);
  const criticalSkus = SKUS.filter(s => s.sell_through_pct > 0.82 && s.sell_through_pct <= 0.92).slice(0, 30);
  const overstockSkus = SKUS.filter(s => s.weeks_on_floor > 20).slice(0, 30);
  const agedSkus = SKUS.filter(s => s.season_tag === 'SS25' || s.season_tag === 'FW25').slice(0, 30);

  function makeRow(s: SKU, type: 'stockout' | 'critical_low' | 'overstock' | 'aged', sev: string) {
    const store = pick(STORES);
    return {
      product_id: s.product_id,
      product_name: s.product_name,
      store_id: store.id, store_name: store.name,
      department: s.dept,
      alert_type: type, severity: sev,
      days_of_stock: type === 'stockout' ? '0.0' : type === 'critical_low' ? round1(rb(0.5, 4.8)).toString() :
        type === 'overstock' ? round1(rb(95, 220)).toString() : round1(rb(180, 320)).toString(),
      current_stock: type === 'stockout' ? '0' : String(ri(2, type === 'overstock' ? 480 : 24)),
      created_at: TODAY_ISO + 'T14:00:00.000Z',
      // Apparel-additive
      style_id: s.style_id, color: s.color, size: s.size,
      lifecycle_stage: s.lifecycle_stage,
    };
  }
  for (const s of stockoutSkus) rows.push(makeRow(s, 'stockout', 'critical'));
  for (const s of criticalSkus) rows.push(makeRow(s, 'critical_low', 'high'));
  for (const s of overstockSkus) rows.push(makeRow(s, 'overstock', 'medium'));
  for (const s of agedSkus) rows.push(makeRow(s, 'aged', 'medium'));
  return rows;
}

// 2.18 inventory_health_matrix.json — ~3000 rows; mirror grocery shape exactly
function genInventoryHealthMatrix() {
  const rows: any[] = [];
  // Sample ~3000 (store × SKU) pairings
  const target = 3000;
  for (let i = 0; i < target; i++) {
    const s = SKUS[Math.floor(r() * SKUS.length)];
    const store = STORES[Math.floor(r() * STORES.length)];
    const stock = s.sell_through_pct > 0.92 ? 0 : ri(2, 240);
    const dos = stock === 0 ? '0.0' : round1(stock / Math.max(0.4, s.avg_daily_demand / 50)).toString();
    const numDos = parseFloat(dos);
    const status = stock === 0 ? 'Stockout' : numDos < 7 ? 'Critical' : numDos < 14 ? 'Low' : numDos < 45 ? 'Healthy' : numDos < 90 ? 'Overstock' : 'Aged';
    rows.push({
      product_id: s.product_id, product_name: s.product_name,
      department: s.dept, city: store.city, store_type: store.format,
      abc_class: s.velocity_class === 'D' ? 'C' : s.velocity_class, // grocery uses A/B/C
      current_stock: String(stock),
      days_of_stock: dos,
      status,
      is_stockout: stock === 0 ? 'true' : 'false',
      is_perishable: 'false',
      // additive
      style_id: s.style_id, color: s.color, size: s.size,
      lifecycle_stage: s.lifecycle_stage, season_tag: s.season_tag,
    });
  }
  return rows;
}

// 2.19 inventory_dos_by_dept.json — 8 depts (vs grocery 5 — but linter checks shape, count is OK)
function genInventoryDosByDept() {
  const rows: any[] = [];
  for (const d of DEPARTMENTS) {
    const skus = SKUS.filter(s => s.dept === d);
    const stockoutSkus = skus.filter(s => s.sell_through_pct > 0.92);
    rows.push({
      department: d,
      avg_dos: round1(gaussian(42, 6)).toString(),
      sku_count: String(skus.length * 50), // network-extrapolated
      stockout_count: String(stockoutSkus.length * 8),
      stockout_pct: round1(stockoutSkus.length / Math.max(1, skus.length) * 100).toString(),
    });
  }
  return rows;
}

// 2.20 inventory_dos_distribution.json — preserved shape; apparel-specific buckets (whitelisted full-row)
function genInventoryDosDistribution() {
  return [
    { dos_bucket: 'Stockout (0)', sku_count: String(ri(820, 1180)), avg_stock: '0.0' },
    { dos_bucket: 'Critical (<7)', sku_count: String(ri(1800, 2400)), avg_stock: '14.0' },
    { dos_bucket: 'Low (7-21)', sku_count: String(ri(3800, 4600)), avg_stock: '38.0' },
    { dos_bucket: 'Normal (21-45)', sku_count: String(ri(4800, 6200)), avg_stock: '64.0' },
    { dos_bucket: 'Healthy (45-90)', sku_count: String(ri(3200, 4800)), avg_stock: '82.0' },
    { dos_bucket: 'Overstock (90-200)', sku_count: String(ri(1800, 2800)), avg_stock: '124.0' },
    { dos_bucket: 'Aged Season (200+)', sku_count: String(ri(680, 1100)), avg_stock: '186.0' },
  ];
}

// 2.21 inventory_replenishment.json — ~200 rows
function genInventoryReplenishment() {
  const rows: any[] = [];
  const urgent = SKUS.filter(s => s.sell_through_pct > 0.86).slice(0, 80);
  const high = SKUS.filter(s => s.sell_through_pct > 0.74 && s.sell_through_pct <= 0.86).slice(0, 70);
  const medium = SKUS.filter(s => s.sell_through_pct > 0.55 && s.sell_through_pct <= 0.74).slice(0, 50);
  const buckets: Array<[SKU[], string]> = [[urgent, 'URGENT'], [high, 'HIGH'], [medium, 'MEDIUM']];
  for (const [arr, prio] of buckets) {
    for (const s of arr) {
      const store = pick(STORES);
      const profile = SUPPLIER_TYPE_PROFILES[SUPPLIERS.find(x => x.id === s.supplier_id)!.type];
      const stock = prio === 'URGENT' ? 0 : ri(2, 28);
      rows.push({
        product_id: s.product_id, product_name: s.product_name,
        store_id: store.id, store_name: store.name,
        department: s.dept,
        abc_class: s.velocity_class === 'D' ? 'C' : s.velocity_class,
        current_stock: String(stock),
        days_of_stock: stock === 0 ? '0.0' : round1(stock / Math.max(0.4, s.avg_daily_demand / 50)).toString(),
        priority: prio,
        is_perishable: 'false',
        // additive
        style_id: s.style_id, color: s.color, size: s.size,
        supplier_moq: ri(300, 2000),
        lead_time_weeks: round1(rb(profile.lead_weeks_band[0], profile.lead_weeks_band[1])),
      });
    }
  }
  return rows;
}

// 2.22 inventory_safety_stock.json — 32 rows (8 dept × 4 ABCD, vs grocery 5×3 = 15)
function genInventorySafetyStock() {
  const rows: any[] = [];
  for (const d of DEPARTMENTS) {
    for (const cls of VELOCITY_CLASSES) {
      const dosBase = cls === 'A' ? 18 : cls === 'B' ? 28 : cls === 'C' ? 42 : 86;
      const skuCount = ri(8000, 28000);
      const coverage = clamp(gaussian({ A: 72, B: 84, C: 92, D: 78 }[cls], 6), 50, 99);
      const above = Math.round(skuCount * coverage / 100);
      rows.push({
        department: d,
        abc_class: cls === 'D' ? 'C' : cls, // grocery only knows A/B/C — use C for D; whitelisted full-row though
        sku_count: String(skuCount),
        avg_dos: round1(dosBase + gaussian(0, 3)).toString(),
        avg_stock: String(Math.round(rb(28, 120))),
        above_safety: String(above),
        below_safety: String(skuCount - above),
        coverage_pct: round1(coverage).toString(),
      });
    }
  }
  return rows;
}

// 2.23 inventory_sku_table.json — capped at 200 styles × 50 stores = 10,000 rows
function genInventorySkuTable() {
  const rows: any[] = [];
  for (const s of TOP_200_STYLES.slice(0, 200)) {
    // For each style, take just one representative size-color combo and project across all 50 stores
    const sizes = SIZE_SETS[s.size_set];
    const repSize = sizes[Math.floor(sizes.length / 2)];
    const repColor = s.colors[0];
    const deptCode = s.dept.startsWith("Women's Tops") ? 'WT' : s.dept.startsWith("Women's Bottoms") ? 'WB' :
      s.dept.startsWith("Women's Dresses") ? 'WD' : s.dept.startsWith("Men's Tops") ? 'MT' :
      s.dept.startsWith("Men's Bottoms") ? 'MB' : s.dept === "Kids'" ? 'KD' :
      s.dept === 'Footwear' ? 'FT' : 'AC';
    const baseDemand = s.velocity_class === 'A' ? rb(20, 60) : s.velocity_class === 'B' ? rb(8, 22) :
      s.velocity_class === 'C' ? rb(2, 8) : rb(0.4, 2);

    for (const store of STORES) {
      const pid = `APR-${deptCode}-${s.style_code}-${repColor.slice(0, 3).toUpperCase()}-${repSize}`;
      const formatBoost = store.format === 'Flagship' ? 1.4 : store.format === 'Outlet' ? 0.7 : 1.0;
      const dailyDemand = baseDemand * formatBoost;
      const stockBase = ri(0, 80);
      const isStockout = stockBase < 2;
      const dos = isStockout ? 0 : stockBase / Math.max(0.4, dailyDemand);
      const status = isStockout ? 'Stockout' : dos < 7 ? 'Critical' : dos < 21 ? 'Low' : dos < 45 ? 'Healthy' : dos < 90 ? 'Overstock' : 'Aged';
      rows.push({
        product_id: pid,
        product_name: `${s.style_name} ${repColor} ${repSize}`,
        store_id: store.id, store_name: store.name,
        department: s.dept,
        city: store.city,
        abc_class: s.velocity_class === 'D' ? 'C' : s.velocity_class,
        current_stock: String(stockBase),
        days_of_stock: round1(dos).toString(),
        status,
        is_stockout: isStockout ? 'true' : 'false',
        is_perishable: 'false',
        // additive
        style_id: s.style_id, color: repColor, size: repSize,
        lifecycle_stage: s.lifecycle_stage, season_tag: s.season_tag,
        sell_through_pct: s.sell_through_pct,
        weeks_on_floor: s.weeks_on_floor,
        retail_price_usd: s.current_price_usd,
      });
    }
  }
  return rows;
}

// 2.24 inventory_stockout_top_skus.json — 30 rows
function genInventoryStockoutTopSkus() {
  const top = [...SKUS].sort((a, b) => b.sell_through_pct - a.sell_through_pct).slice(0, 30);
  return top.map(s => ({
    product_id: s.product_id, product_name: s.product_name,
    department: s.dept,
    abc_class: s.velocity_class === 'D' ? 'C' : s.velocity_class,
    stores_affected: String(ri(18, 48)),
    stockout_instances: String(ri(400, 2400)),
    // additive
    style_id: s.style_id, color: s.color, size: s.size,
    lost_revenue_90d_usd_k: round1(rb(40, 280)),
  }));
}

// 2.25 inventory_stockout_trend.json — 12 months
function genInventoryStockoutTrend() {
  const months: string[] = [];
  const dStart = new Date(CURRENT_DATE);
  dStart.setMonth(dStart.getMonth() - 11);
  for (let i = 0; i < 12; i++) {
    const d = new Date(dStart);
    d.setMonth(d.getMonth() + i);
    months.push(d.toISOString().slice(0, 7));
  }
  return months.map(m => {
    const monthIdx = parseInt(m.slice(5, 7), 10);
    // Aug + Nov peaks (BTS + BFCM)
    const peak = monthIdx === 8 || monthIdx === 11 ? 1.7 : monthIdx === 7 || monthIdx === 10 ? 1.3 : 1.0;
    const total = ri(3800000, 4200000);
    const stockoutPct = round1(clamp(gaussian(4.2, 0.8) * peak, 1.6, 12.0));
    const stockoutCount = Math.round(total * stockoutPct / 100);
    return {
      month: m,
      stockout_count: String(stockoutCount),
      total_count: String(total),
      stockout_pct: round1(stockoutPct).toString(),
    };
  });
}

// 2.26 inventory_inbound.json — ~80 rows
function genInventoryInbound() {
  const rows: any[] = [];
  for (let i = 0; i < 80; i++) {
    const s = SKUS[Math.floor(r() * SKUS.length)];
    const store = pick(STORES);
    const supplier = SUPPLIERS.find(x => x.id === s.supplier_id)!;
    const origin = pick(supplier.origins);
    rows.push({
      product_id: s.product_id, product_name: s.product_name,
      store_id: store.id, store_name: store.name,
      department: s.dept,
      expected_qty: String(ri(0, 480)),
      expected_date: dateOffset(ri(1, 28)),
      status: pick(['scheduled', 'in_transit', 'delayed', 'on_track'] as const),
      // additive
      container_count: ri(1, 12),
      port_of_origin: portFor(origin),
      season_tag: s.season_tag,
    });
  }
  return rows;
}

// ====================================================================
// GENERATORS — supply_*.json (16 files)
// ====================================================================

// 2.1 supply_kpis.json — preserved shape + apparel-additive whitelisted keys
function genSupplyKpis() {
  const baseSpark = (mu: number, sigma = 0.04) => Array.from({ length: 7 }, (_, i) => round1(mu * (1 + (i - 3) * 0.01 + gaussian(0, sigma))));
  const revRisk = round1(clamp(gaussian(3.4, 0.4), 1.8, 4.6));
  const invValue = Math.round(clamp(gaussian(318, 12), 280, 360));
  const osa = round1(clamp(gaussian(92.4, 0.6), 85, 95));
  const avgDos = Math.round(clamp(gaussian(42, 4), 28, 60));
  const stockouts = Math.round(clamp(gaussian(1420, 180), 800, 2200));
  const otif = round1(clamp(gaussian(82.4, 1.2), 76, 92));
  const returnRate = round1(clamp(gaussian(19.4, 1.0), 14, 26));

  return {
    revenue_at_risk: {
      value: revRisk, prior: round1(revRisk - 0.3), unit: 'M', label: 'Revenue at Risk',
      stores_affected: ri(14, 24), skus_affected: ri(1200, 1900),
      sparkline: baseSpark(revRisk, 0.06),
    },
    inventory_value: {
      value: invValue, prior: invValue - ri(8, 18), unit: 'M', label: 'Working Capital',
      overstock_value: Math.round(invValue * 0.24),
      aging_45plus: Math.round(invValue * 0.13),
      // additive
      seasonal_carryover_value: Math.round(invValue * 0.18),
      sparkline: baseSpark(invValue, 0.02).map(v => Math.round(v)),
    },
    osa: {
      value: osa, prior: round1(osa + 1.2), unit: '%', label: 'On-Shelf Availability (size×color)',
      target: 95,
      daily_impact_cr: round1(rb(1.4, 2.4)), // grocery-shape: keep _cr name (value is USD-M-ish, render-time mapped)
      // additive
      style_osa_pct: round1(clamp(osa + rb(4, 6), 90, 99)),
      size_color_osa_pct: osa,
      sparkline: baseSpark(osa, 0.005),
    },
    avg_dos: {
      value: avgDos, prior: avgDos - 4, unit: 'days', label: 'Avg Days of Supply',
      target_min: 28, target_max: 56, below_7_days_pct: round1(rb(5.2, 8.2)),
      // additive
      dos_by_lifecycle: { Intro: 14, Core: 38, Markdown: 86, Clearance: 174 },
      sparkline: baseSpark(avgDos, 0.02).map(v => Math.round(v)),
    },
    stockout_count: {
      value: stockouts, prior: stockouts - ri(80, 160), unit: '', label: 'Active Size-Color Stockouts',
      rev_impact_today: round1(stockouts * 0.0006),
      stores_affected: ri(28, 42),
      sparkline: baseSpark(stockouts, 0.03).map(v => Math.round(v)),
    },
    supplier_otif: {
      value: otif, prior: round1(otif + 1.6), unit: '%', label: 'Supplier OTIF',
      suppliers_below_threshold: ri(5, 9), delayed_pos: ri(34, 52),
      // additive
      avg_delay_weeks: round1(rb(1.6, 3.2)),
      sparkline: baseSpark(otif, 0.008),
    },
    // additive 7th KPI tile
    return_rate: {
      value: returnRate, prior: round1(returnRate - 0.7), unit: '%', label: 'Return Rate',
      top_reason: 'Fit',
      sparkline: baseSpark(returnRate, 0.04),
    },
  };
}

// 2.2 supply_category_health.json
function genSupplyCategoryHealth() {
  const cats = DEPARTMENTS.map((d, i) => {
    const skus = SKUS.filter(s => s.dept === d);
    const status = i < 2 ? 'critical' : i < 5 ? 'at_risk' : i === 5 ? 'healthy' : 'overstock';
    const revAtRisk = round1(rb(0.08, 1.6));
    return {
      name: d,
      status,
      rev_at_risk_cr: revAtRisk, // grocery name
      osa_pct: round1(clamp(gaussian(91, 3), 82, 98)),
      avg_dos: Math.round(clamp(gaussian(42, 8), 18, 78)),
      stockout_skus: ri(38, 320),
      overstock_value_cr: round1(rb(4, 38)),
      turn_rate: round1(rb(3, 8)),
      // additive
      size_curve_completeness_pct: ri(58, 92),
      markdown_pressure_pct: ri(8, 38),
      season_carryover_pct: ri(6, 28),
    };
  });
  const matrix: any[] = [];
  for (const store of STORES) {
    for (const c of cats) {
      matrix.push({
        store_id: store.id, store_name: store.name, city: store.city,
        category: c.name, status: pick(['critical', 'at_risk', 'healthy', 'overstock'] as const),
        osa_pct: round1(clamp(gaussian(91, 4), 78, 99)),
        dos: round1(rb(8, 78)),
        stockout_skus: ri(1, 14),
      });
    }
  }
  const trendMonths = last12MonthLabels();
  const trend = trendMonths.map((m, i) => {
    const fallShift = i >= 8 ? 6 : 0; // overstock climbs Sep-Jan
    return {
      month: m,
      critical_pct: round1(clamp(18 + gaussian(0, 2), 8, 28)),
      at_risk_pct: round1(clamp(28 + gaussian(0, 3), 18, 38)),
      healthy_pct: round1(clamp(36 - fallShift + gaussian(0, 3), 22, 48)),
      overstock_pct: round1(clamp(18 + fallShift + gaussian(0, 2), 12, 32)),
    };
  });
  return {
    summary: {
      critical: 2, at_risk: 3, healthy: 1, overstock: 2,
      total_rev_at_risk_cr: round1(cats.reduce((s, c) => s + c.rev_at_risk_cr, 0)),
    },
    categories: cats,
    store_category_matrix: matrix,
    health_trend_12m: trend,
  };
}

// 2.3 supply_overstock.json
function genSupplyOverstock() {
  const cats = DEPARTMENTS.map(d => ({
    category: d,
    slow_moving_cr: round1(rb(4, 28)),
    dead_stock_cr: round1(rb(1, 12)),
    total_cr: 0,
    markdown_risk_skus: ri(20, 90),
    // additive
    season_carryover_cr: round1(rb(2, 14)),
  })).map(c => ({ ...c, total_cr: round1(c.slow_moving_cr + c.dead_stock_cr) }));
  // Apparel cadence waterfall stages
  const waterfall = [
    { stage: 'Total Overstock', value_cr: 78, type: 'total' },
    { stage: 'Sells at Full Price', value_cr: -8, type: 'positive' },
    { stage: 'Markdown -25% (Week 13)', value_cr: -18, type: 'negative' },
    { stage: 'Markdown -40% (Week 17)', value_cr: -22, type: 'negative' },
    { stage: 'Markdown -60% (Week 21)', value_cr: -16, type: 'negative' },
    { stage: 'Clearance (Week 25+)', value_cr: -9, type: 'negative' },
    { stage: 'Net Recovered Value', value_cr: 5, type: 'result' },
  ];
  // 18 months trend (vs grocery 12) — but the linter only checks [0] shape so extra rows are fine
  const months18: string[] = [];
  const dS = new Date(CURRENT_DATE);
  dS.setMonth(dS.getMonth() - 17);
  for (let i = 0; i < 18; i++) {
    const d = new Date(dS);
    d.setMonth(d.getMonth() + i);
    months18.push(monthLabel(d));
  }
  const trend = months18.map((m, i) => ({
    month: m,
    overstock_cr: Math.round(clamp(70 + i * 1.4 + gaussian(0, 5), 60, 120)),
    purchase_volume_cr: Math.round(clamp(140 + i * 2 + gaussian(0, 8), 120, 220)),
  }));
  // markdown recommendations (apparel-additive fields whitelisted)
  const recs = TOP_200_STYLES.filter(s => s.lifecycle_stage.startsWith('Markdown') || s.lifecycle_stage === 'Clearance').slice(0, 16).map(s => ({
    category: s.dept,
    overstock_cr: round1(rb(0.4, 3.8)),
    days_in_overstock_avg: s.weeks_on_floor * 7,
    recommended_markdown_pct: s.lifecycle_stage === 'Markdown-1' ? 40 : s.lifecycle_stage === 'Markdown-2' ? 60 : 80,
    recommended_timing: 'Next Friday',
    timing_reason: 'Aligns with weekly markdown cadence',
    expected_sell_through_pct: Math.round(rb(60, 92)),
    revenue_recovery_cr: round1(rb(0.2, 1.4)),
    margin_impact_cr: round1(rb(-0.4, 0.2)),
    net_benefit_vs_writeoff_cr: round1(rb(0.1, 0.8)),
    urgency: s.lifecycle_stage === 'Clearance' ? 'critical' : s.lifecycle_stage === 'Markdown-3' ? 'high' : 'medium',
    // additive
    style_id: s.style_id,
    style_name: s.style_name,
    weeks_on_floor: s.weeks_on_floor,
    lifecycle_stage: s.lifecycle_stage,
    current_markdown_pct: s.lifecycle_stage === 'Markdown-1' ? 25 : s.lifecycle_stage === 'Markdown-2' ? 40 : s.lifecycle_stage === 'Markdown-3' ? 60 : 0,
    recommended_markdown_step: s.lifecycle_stage === 'Markdown-1' ? 'Markdown-2 (-40%)' : 'Markdown-3 (-60%)',
    revenue_recovery_usd_k: round1(rb(20, 140)),
    next_markdown_date: dateOffset(ri(3, 14)),
  }));
  return {
    summary: { overstock_value_cr: 78, dead_stock_value_cr: 32, markdown_risk_skus: 384, trend: 'increasing' },
    by_category: cats,
    markdown_waterfall: waterfall,
    trend_vs_purchasing: trend,
    markdown_recommendations: recs,
  };
}

// 2.4 supply_replenishment.json
function genSupplyReplenishment() {
  const storeHealth = STORES.map((s, i) => {
    const health = clamp(gaussian(72 - (i < 6 ? 28 : 0), 8), 32, 96);
    return {
      store_id: s.id, store_name: s.name, city: s.city,
      health_score: Math.round(health),
      skus_below_safety: ri(8, 38),
      urgent_pending_cr: round1(rb(0.2, 1.4)),
      status: health < 50 ? 'critical' : health < 68 ? 'at_risk' : 'healthy',
      // additive
      store_format: s.format,
    };
  });
  const leadRows: any[] = [];
  for (let i = 0; i < 40; i++) {
    const sup = SUPPLIERS[i % SUPPLIERS.length];
    const profile = SUPPLIER_TYPE_PROFILES[sup.type];
    const lead = round1(rb(profile.lead_weeks_band[0], profile.lead_weeks_band[1]));
    const committed = round1(lead - rb(-1.4, 2.4));
    leadRows.push({
      supplier: sup.name,
      category: pick(sup.depts),
      avg_lead_days: lead, // grocery key — value is in WEEKS for apparel (UI sweep maps to label)
      committed_days: committed,
      status: committed > lead + 0.5 ? 'over_target' : committed > lead - 0.5 ? 'slight_slip' : 'on_target',
      // additive
      country_of_origin: pick(sup.origins),
    });
  }
  const safety = VELOCITY_CLASSES.map(cls => ({
    abc_class: cls === 'D' ? 'C' : cls, // grocery only A/B/C; D collapses; whitelisted full-row
    coverage_pct: round1(clamp(gaussian({ A: 84, B: 88, C: 92, D: 76 }[cls], 4), 60, 98)),
    target_pct: VELOCITY_SERVICE_LEVEL[cls],
    gap_skus: ri(8, 84),
  }));
  const funnel = [
    { stage: 'Trigger Detected', count: 184, on_schedule_pct: 96 },
    { stage: 'PO Placed', count: 142, on_schedule_pct: 94 },
    { stage: 'In Transit', count: 218, on_schedule_pct: 78 }, // apparel: 4× thicker in-transit
    { stage: 'ASN Received', count: 86, on_schedule_pct: 88 },
    { stage: 'Shelved', count: 62, on_schedule_pct: 92 },
  ];
  return {
    summary: {
      on_time_pct: 78.4,
      stores_below_safety_stock: storeHealth.filter(s => s.status === 'critical').length,
      urgent_pending_cr: round1(rb(8, 18)),
      avg_lead_time_days: 8.2, // weeks-as-days value
      lead_time_target_days: 6.4,
    },
    store_health_scores: storeHealth,
    lead_time_by_supplier_category: leadRows,
    safety_stock_by_abc: safety,
    replenishment_funnel: funnel,
  };
}

// 2.5 supply_inbound.json
function genSupplyInbound() {
  const gantt: any[] = [];
  for (let i = 0; i < 40; i++) {
    const sup = SUPPLIERS[Math.floor(r() * SUPPLIERS.length)];
    const dept = pick(sup.depts);
    const origin = pick(sup.origins);
    const isDom = origin === 'USA' || origin === 'Mexico';
    const dest = r() < 0.4 ? pick(DCS) : pick(STORES);
    gantt.push({
      shipment_id: `SHP-A${String(i + 1).padStart(4, '0')}`,
      supplier: sup.name,
      category: dept,
      store_name: dest.name,
      city: dest.city,
      expected_date: dateOffset(ri(1, 14)),
      value_cr: round1(rb(0.4, 2.8)), // grocery key — apparel values are USD-M (UI maps)
      status: pick(['on_track', 'at_risk', 'delayed', 'scheduled', 'customs_hold', 'port_congestion'] as const),
      skus_count: ri(8, 64),
      resolves_stockout: r() < 0.3,
      // additive
      container_count: isDom ? 0 : ri(1, 8),
      port_of_origin: portFor(origin),
      customs_status: isDom ? 'Domestic' : pick(['Cleared', 'Hold', 'Examining', 'Bonded'] as const),
      season_tag: pick(['SS26', 'FW26', 'Resort27'] as const),
    });
  }
  const delayed = gantt.filter(g => g.status === 'delayed' || g.status === 'port_congestion' || g.status === 'customs_hold').slice(0, 10).map(g => ({
    shipment_id: g.shipment_id,
    supplier: g.supplier,
    category: g.category,
    original_eta: g.expected_date,
    new_eta: dateOffset(ri(15, 36)),
    delay_days: ri(7, 28), // grocery key — value in days (small weeks * 7)
    skus_affected: g.skus_count,
    stores_affected: ri(6, 28),
    rev_at_risk_cr: round1(rb(0.2, 1.4)),
    action_required: 'Expedite via air freight or re-allocate',
    // additive
    event_window_missed: pick([null, 'Memorial Day', 'July 4', 'BTS', 'Labor Day', 'BFCM'] as const),
  }));
  const capacityRows = [];
  for (let i = 0; i < 14; i++) {
    const d = pick(DCS);
    const cap = d.capacity_pallets_day;
    const util = ri(60, 102);
    const pallets = Math.round(cap * util / 100);
    capacityRows.push({
      date: dateOffset(i),
      inbound_pallets: pallets,
      capacity_pallets: cap,
      utilization_pct: util,
      over_capacity: util > 100,
      // additive
      pre_ticketed_pallets: Math.round(pallets * 0.36),
    });
  }
  const reliability = Array.from(new Set(STORES.map(s => s.city))).slice(0, 12).map(city => ({
    city,
    on_time_pct: round1(clamp(gaussian(82, 6), 60, 96)),
    avg_delay_days: round1(rb(2, 12)),
    shipment_count: ri(18, 86),
  }));
  // additive container_utilization
  const containerUtil = [];
  for (let i = 0; i < 30; i++) {
    const sup = SUPPLIERS[Math.floor(r() * SUPPLIERS.length)];
    const origin = pick(sup.origins);
    containerUtil.push({
      po_id: `PO-A${String(2000 + i).padStart(6, '0')}`,
      supplier_name: sup.name,
      port_of_origin: portFor(origin),
      container_count: ri(1, 12),
      cube_utilization_pct: ri(62, 96),
      freight_cost_per_unit_usd: round2(rb(0.42, 1.84)),
    });
  }
  return {
    summary: {
      in_transit: { count: gantt.filter(g => g.status === 'on_track' || g.status === 'at_risk').length, value_cr: 28 },
      delayed: { count: delayed.length, value_cr: 8.4, avg_delay_days: 18.2 },
      due_this_week: { count: 18, value_cr: 14.2 },
      on_time_probability_pct: 72.4,
    },
    gantt_14d: gantt,
    delayed_impact: delayed,
    receiving_capacity: capacityRows,
    reliability_by_city: reliability,
    container_utilization: containerUtil,
  };
}

// 2.6 supply_supplier_otif.json
function genSupplySupplierOtif() {
  const suppliers = SUPPLIERS.map(sup => {
    const profile = SUPPLIER_TYPE_PROFILES[sup.type];
    const otif = round1(clamp(gaussian((profile.otif_band[0] + profile.otif_band[1]) / 2, 4), profile.otif_band[0] - 4, profile.otif_band[1] + 2));
    return {
      supplier_id: sup.id,
      name: sup.name,
      category: sup.depts.length > 2 ? 'Multi' : sup.depts[0],
      otif_pct: otif,
      avg_delay_days: round1(rb(profile.delay_weeks_band[0], profile.delay_weeks_band[1])), // value in WEEKS for apparel
      fill_rate_pct: round1(clamp(gaussian((profile.fill_band[0] + profile.fill_band[1]) / 2, 3), 60, 98)),
      order_value_cr: round1(rb(2, 48)), // value is USD-M for apparel
      stockouts_caused: ri(2, 48),
      trend: pick(['improving', 'stable', 'declining'] as const),
      // additive
      supplier_type: sup.type,
      country_of_origin: sup.origins[0],
    };
  });
  // delay reasons: apparel 6-key shape — grocery had 5 keys (manufacturing/logistics/quality/documentation/no_reason)
  // We MUST keep grocery keys present (linter checks). Populate them from apparel taxonomy by rough mapping
  // and add the 6 apparel keys as additive (whitelisted).
  const delayReasons = SUPPLIERS.map(sup => {
    const profile = SUPPLIER_TYPE_PROFILES[sup.type];
    const mix = profile.delay_mix;
    const sum = mix.fabric_shortage_pct + mix.port_congestion_pct + mix.production_capacity_pct + mix.qc_fail_pct + mix.customs_hold_pct + mix.sample_approval_pct;
    // normalize to ~100
    const k = 100 / Math.max(1, sum);
    const m = {
      fabric_shortage_pct: Math.round(mix.fabric_shortage_pct * k),
      port_congestion_pct: Math.round(mix.port_congestion_pct * k),
      production_capacity_pct: Math.round(mix.production_capacity_pct * k),
      qc_fail_pct: Math.round(mix.qc_fail_pct * k),
      customs_hold_pct: Math.round(mix.customs_hold_pct * k),
      sample_approval_pct: Math.round(mix.sample_approval_pct * k),
    };
    const total = m.fabric_shortage_pct + m.port_congestion_pct + m.production_capacity_pct + m.qc_fail_pct + m.customs_hold_pct + m.sample_approval_pct;
    if (total !== 100) m.production_capacity_pct += (100 - total);
    return {
      supplier_id: sup.id,
      name: sup.name,
      // grocery-shape: keep 5 keys present
      manufacturing_pct: m.production_capacity_pct,
      logistics_pct: m.port_congestion_pct,
      quality_pct: m.qc_fail_pct,
      documentation_pct: m.customs_hold_pct,
      no_reason_pct: m.sample_approval_pct + m.fabric_shortage_pct,
      // additive apparel taxonomy
      ...m,
    };
  });
  const months12 = last12MonthLabels();
  const trend = months12.map(m => {
    const monthIdx = parseInt(m.split(' ')[0] === 'Jan' ? '1' : '0', 10) || 0;
    const eventBand: 'BTS-Ramp' | 'BFCM-Ramp' | null = m.startsWith('Aug') ? 'BTS-Ramp' : m.startsWith('Nov') ? 'BFCM-Ramp' : null;
    return {
      month: m,
      otif_pct: round1(clamp(gaussian(82, 3), 70, 92)),
      stockout_count: ri(420, 1280),
      // additive
      event_band: eventBand,
    };
  });
  return { suppliers, delay_reasons: delayReasons, monthly_otif_vs_stockouts: trend };
}

// 2.7 supply_supplier_profiles.json — 30 suppliers
function genSupplySupplierProfiles() {
  const profiles: Record<string, any> = {};
  for (const sup of SUPPLIERS) {
    const profile = SUPPLIER_TYPE_PROFILES[sup.type];
    const otif = round1(clamp(gaussian((profile.otif_band[0] + profile.otif_band[1]) / 2, 4), 60, 98));
    const fill = round1(clamp(gaussian((profile.fill_band[0] + profile.fill_band[1]) / 2, 3), 60, 98));
    const delay = round1(rb(profile.delay_weeks_band[0], profile.delay_weeks_band[1]));
    const orderVal = round1(rb(2, 48));
    const months12 = last12MonthLabels();
    const otif12 = months12.map(m => ({ month: m, otif_pct: round1(clamp(otif + gaussian(0, 2), 60, 98)), target: Math.round((profile.otif_band[0] + profile.otif_band[1]) / 2) }));
    const profileMix = profile.delay_mix;
    const sum = profileMix.fabric_shortage_pct + profileMix.port_congestion_pct + profileMix.production_capacity_pct + profileMix.qc_fail_pct + profileMix.customs_hold_pct + profileMix.sample_approval_pct;
    const k2 = 100 / Math.max(1, sum);
    const m6 = {
      fabric_shortage_pct: Math.round(profileMix.fabric_shortage_pct * k2),
      port_congestion_pct: Math.round(profileMix.port_congestion_pct * k2),
      production_capacity_pct: Math.round(profileMix.production_capacity_pct * k2),
      qc_fail_pct: Math.round(profileMix.qc_fail_pct * k2),
      customs_hold_pct: Math.round(profileMix.customs_hold_pct * k2),
      sample_approval_pct: Math.round(profileMix.sample_approval_pct * k2),
    };
    const t = m6.fabric_shortage_pct + m6.port_congestion_pct + m6.production_capacity_pct + m6.qc_fail_pct + m6.customs_hold_pct + m6.sample_approval_pct;
    if (t !== 100) m6.production_capacity_pct += (100 - t);
    // grocery delay_reasons block — KEEP grocery keys for linter parity, additive apparel keys spread
    const delayReasonsBlock = {
      manufacturing_pct: m6.production_capacity_pct,
      logistics_pct: m6.port_congestion_pct,
      quality_pct: m6.qc_fail_pct,
      documentation_pct: m6.customs_hold_pct,
      no_reason_pct: m6.sample_approval_pct + m6.fabric_shortage_pct,
      ...m6,
    };
    const categoryPerf = sup.depts.slice(0, 2).map(d => ({
      category: d,
      otif_pct: round1(clamp(otif + gaussian(0, 3), 60, 98)),
      fill_rate_pct: round1(clamp(fill + gaussian(0, 3), 60, 98)),
      avg_delay_days: round1(delay + gaussian(0, 0.4)),
      order_value_cr: round1(orderVal / 2),
      stockouts_caused: ri(2, 28),
    }));
    const storeImpactCount = Math.min(STORES.length, 7);
    const storeImpact = STORES.slice(0, storeImpactCount).map(s => ({
      store_id: s.id, store_name: s.name, city: s.city,
      stockouts_caused: ri(1, 14),
      rev_at_risk_cr: round1(rb(0.04, 0.62)),
      last_delivery_status: pick(['on_time', 'delayed', 'partial'] as const),
    }));
    const supplierSkus = TOP_200_STYLES.filter(s => s.supplier.id === sup.id);
    const openPos = Array.from({ length: 3 }, (_, i) => ({
      po_id: `PO-A${String(2000 + i + parseInt(sup.id.slice(-3))).padStart(6, '0')}`,
      category: pick(sup.depts),
      store_name: pick(DCS).name,
      qty: ri(800, 18000),
      value_cr: round1(rb(0.4, 2.4)),
      expected_date: dateOffset(ri(8, 42)),
      status: pick(['in_transit', 'scheduled', 'at_risk'] as const),
      // additive
      season_tag: pick(['SS26', 'FW26', 'Resort27'] as const),
      container_count: ri(1, 8),
      port_of_origin: portFor(pick(sup.origins)),
    }));
    const topSkus = (supplierSkus.length ? supplierSkus.slice(0, 5) : TOP_200_STYLES.slice(0, 5)).map(s => {
      const sz = SIZE_SETS[s.size_set][Math.floor(SIZE_SETS[s.size_set].length / 2)];
      const col = s.colors[0];
      return {
        product_id: `APR-${s.style_code}-${col.slice(0, 3).toUpperCase()}-${sz}`,
        product_name: `${s.style_name} ${col} ${sz}`,
        category: s.dept,
        avg_daily_demand: Math.round(s.velocity_class === 'A' ? rb(40, 120) : s.velocity_class === 'B' ? rb(20, 60) : rb(4, 18)),
        current_stock: ri(40, 1840),
        days_of_supply: round1(rb(2.4, 32)),
        status: pick(['Healthy', 'Critical', 'Low', 'Overstock'] as const),
        stockout_events_90d: ri(0, 14),
        rev_at_risk_cr: round1(rb(0.02, 0.42)),
        // additive
        style_id: s.style_id, color: col, size: sz,
      };
    });
    const peers = SUPPLIERS.filter(x => x.type === sup.type && x.id !== sup.id).slice(0, 3).map(p => ({
      supplier_id: p.id, name: p.name, category: pick(p.depts),
      otif_pct: round1(rb(profile.otif_band[0], profile.otif_band[1])),
      order_value_cr: round1(rb(2, 38)),
      // additive
      supplier_type: p.type,
    }));
    const overallScore = Math.round(otif * 0.4 + fill * 0.3 + Math.max(0, 30 - delay * 4));
    profiles[sup.id] = {
      supplier_id: sup.id, name: sup.name, short_name: sup.short_name,
      category: sup.depts.length > 2 ? 'Multi' : sup.depts[0],
      categories_supplied: sup.depts.slice(0, 2),
      headquarters: `${sup.hq_city}, ${sup.hq_state}`,
      account_manager: usName(),
      contract_expiry: `${2027 + ri(0, 3)}-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`,
      relationship_years: ri(2, 14),
      overall_score: overallScore,
      score_trend: pick(['improving', 'stable', 'declining'] as const),
      otif_pct: otif,
      fill_rate_pct: fill,
      avg_delay_days: delay, // value in WEEKS
      order_value_cr: orderVal,
      stockouts_caused: ri(2, 48),
      trend: pick(['improving', 'stable', 'declining'] as const),
      otif_12m: otif12,
      delay_reasons: delayReasonsBlock,
      category_performance: categoryPerf,
      store_impact: storeImpact,
      open_pos: openPos,
      top_skus: topSkus,
      peer_comparison: peers,
      ai_recommendations: [
        { priority: 'high', action: `Pull forward FW26 PO by 2 weeks`, detail: `Current ETA misses BTS window. Air-freight delta vs revenue exposure favours expedite.`, expected_impact: `Recovers ~$${round1(rb(0.4, 0.9))}M of BTS revenue` },
        { priority: 'medium', action: `Diversify ${sup.origins[0]} concentration`, detail: `Single-origin risk during typhoon / port-strike season.`, expected_impact: `Reduces FW26 delivery variance by ${ri(2, 5)} weeks 90th-percentile` },
        { priority: 'low', action: `Negotiate MOQ down`, detail: `Current MOQ forces over-buying on tail sizes.`, expected_impact: `Frees $${ri(40, 140)}K working capital quarterly` },
      ],
      // additive
      supplier_type: sup.type,
    };
  }
  return profiles;
}

// 2.8 supply_forecast.json
function genSupplyForecast() {
  const dStart = new Date(CURRENT_DATE.getTime() - 90 * 86400000);
  const forecastVsActual: any[] = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date(dStart.getTime() + i * 86400000);
    const dayBase = 32000 + Math.sin(i / 6) * 4000 + (i % 7 < 2 ? 5000 : 0);
    const fc = Math.round(dayBase + gaussian(0, 1200));
    const actual = Math.round(fc * (1 + gaussian(0, 0.14)));
    forecastVsActual.push({
      date: d.toISOString().slice(0, 10),
      forecast: fc, actual,
      upper_bound: Math.round(fc * 1.16),
      lower_bound: Math.round(fc * 0.84),
    });
  }
  const decomp: any[] = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date(dStart.getTime() + i * 86400000);
    const baseline = 24000 + gaussian(0, 800);
    const trend = i * 28;
    const seasonal = Math.sin(i / 7) * 3200;
    const promo = i % 14 < 3 ? 2400 : 0;
    const eventLift = i % 30 === 5 ? 6800 : 0;
    decomp.push({
      date: d.toISOString().slice(0, 10),
      baseline: Math.round(baseline), trend: Math.round(trend), seasonal: Math.round(seasonal),
      promo_lift: promo,
      total: Math.round(baseline + trend + seasonal + promo + eventLift),
      // additive
      event_lift: eventLift,
    });
  }
  const accuracyByDept = DEPARTMENTS.map(d => ({
    department: d,
    mape: round1(d === 'Footwear' ? rb(10, 14) : d === "Women's Dresses" ? rb(20, 26) : rb(14, 22)),
    accuracy_pct: round1(rb(74, 88)),
    bias_pct: round1(rb(-6, 6)),
    trend: pick(['improving', 'stable', 'declining'] as const),
  }));
  const trend12w: any[] = [];
  for (let w = 1; w <= 12; w++) trend12w.push({
    week: `W${w}`,
    accuracy_pct: round1(clamp(gaussian(82, 3), 70, 92)),
    mape: round1(clamp(gaussian(18, 2), 12, 26)),
    bias_pct: round1(gaussian(0, 3)),
  });
  const modelComparison = [
    { model: 'Champion (GBM+events)', accuracy: 84.2, mape: 15.8, rmse: 2840, mae: 1680, status: 'production', last_trained: dateOffset(-7) },
    { model: 'Naive Seasonal', accuracy: 68.4, mape: 31.6, rmse: 5240, mae: 3120, status: 'baseline', last_trained: dateOffset(-30) },
    { model: 'Prophet', accuracy: 76.8, mape: 23.2, rmse: 3680, mae: 2240, status: 'shadow', last_trained: dateOffset(-14) },
    { model: 'LightGBM-no-events', accuracy: 78.4, mape: 21.6, rmse: 3420, mae: 2080, status: 'shadow', last_trained: dateOffset(-14) },
    { model: 'Ensemble', accuracy: 85.6, mape: 14.4, rmse: 2620, mae: 1540, status: 'champion-candidate', last_trained: dateOffset(-3) },
  ];
  const featureImportance = [
    { feature: 'weeks_to_next_event', importance: 0.84, direction: 'positive' },
    { feature: 'markdown_depth', importance: 0.71, direction: 'negative' },
    { feature: 'lifecycle_stage', importance: 0.62, direction: 'negative' },
    { feature: 'weather_temp_anomaly', importance: 0.54, direction: 'positive' },
    { feature: 'competitor_promo_active', importance: 0.48, direction: 'negative' },
    { feature: 'prior_year_same_event_lift', importance: 0.46, direction: 'positive' },
    { feature: 'creator_attribution_active', importance: 0.41, direction: 'positive' },
    { feature: 'size_curve_inventory_health', importance: 0.38, direction: 'positive' },
    { feature: 'store_format', importance: 0.34, direction: 'null' },
    { feature: 'days_in_market', importance: 0.31, direction: 'negative' },
    { feature: 'channel_mix_app_pct', importance: 0.28, direction: 'positive' },
    { feature: 'season_tag', importance: 0.24, direction: 'null' },
  ];
  return {
    kpis: {
      mape_pct: 15.8, mape_prior: 17.2, bias_pct: 2.4, bias_direction: 'under',
      lost_sales_from_miss_cr: 4.8, lost_sales_prior_cr: 5.2,
      forecast_coverage_pct: 82.4, model_health: 'stable',
    },
    forecast_vs_actual: forecastVsActual,
    accuracy_by_dept: accuracyByDept,
    accuracy_trend_12w: trend12w,
    model_comparison: modelComparison,
    feature_importance: featureImportance,
    demand_decomposition: decomp,
  };
}

// 2.9 supply_revenue_at_risk.json
function genSupplyRevenueAtRisk() {
  const byStore = STORES.map((s, i) => {
    const flagshipBoost = s.format === 'Flagship' ? 1.6 : s.format === 'Outlet' ? 0.6 : 1.0;
    const rar = round1(rb(0.04, 0.86) * flagshipBoost);
    return {
      store_id: s.id, store_name: s.name, city: s.city,
      rev_at_risk_cr: rar,
      daily_revenue_cr: round1(rb(2.4, 9.4) * flagshipBoost),
      pct_daily_rev: round1(rb(2, 14)),
      stockout_skus: ri(8, 48),
      avg_duration_days: round1(rb(0.8, 4.2)),
      status: rar > 0.6 ? 'critical' : rar > 0.3 ? 'at_risk' : 'healthy',
    };
  }).sort((a, b) => b.rev_at_risk_cr - a.rev_at_risk_cr);
  const byCategory = DEPARTMENTS.map(d => ({
    category: d,
    rev_at_risk_cr: round1(rb(0.2, 1.8)),
    days_running: ri(2, 28),
    stores_affected: ri(8, 36),
    stockout_skus: ri(28, 240),
  }));
  const trend60 = Array.from({ length: 60 }, (_, i) => ({
    date: dateOffset(i - 60),
    rev_at_risk_cr: round1(clamp(3.4 + Math.sin(i / 8) * 0.6 + gaussian(0, 0.3), 1.4, 5.2)),
  }));
  const weeks = Array.from({ length: 13 }, (_, i) => `W${i + 1}`);
  const lvr = weeks.map(w => {
    const lost = round1(rb(3.4, 6.8));
    return {
      week: w,
      lost_cr: lost,
      recovered_cr: round1(lost * 0.22), // apparel recovery ~22%
      recovery_rate_pct: 22,
    };
  });
  return { by_store: byStore, by_category: byCategory, trend_60d: trend60, weekly_lost_vs_recovered: lvr };
}

// 2.10 supply_safety_stock_intelligence.json
function genSupplySafetyStockIntelligence() {
  const byAbc = VELOCITY_CLASSES.map(cls => {
    const skuCount = cls === 'A' ? ri(160, 220) : cls === 'B' ? ri(380, 480) : cls === 'C' ? ri(720, 880) : ri(880, 1100);
    const leadWeeks = cls === 'A' ? rb(4, 8) : cls === 'B' ? rb(8, 12) : cls === 'C' ? rb(10, 14) : rb(12, 18);
    const recDays = Math.round(VELOCITY_Z[cls] * 18 * Math.sqrt(leadWeeks * 7) / 7) || 14;
    const curDays = recDays - ri(2, 8);
    return {
      abc_class: cls === 'D' ? 'C' : cls,
      sku_count: skuCount,
      avg_daily_demand: cls === 'A' ? 64 : cls === 'B' ? 28 : cls === 'C' ? 10 : 3,
      demand_std_dev: cls === 'A' ? 18 : cls === 'B' ? 8 : cls === 'C' ? 4 : 1.4,
      avg_lead_time_days: round1(leadWeeks * 7), // grocery field, days unit
      recommended_safety_stock_days: recDays,
      current_safety_stock_days: curDays,
      gap_days: recDays - curDays,
      gap_skus: ri(28, 96),
      stockout_risk_pct: round1(rb(10, 28)),
      recommended_service_level: VELOCITY_SERVICE_LEVEL[cls],
      current_service_level: VELOCITY_SERVICE_LEVEL[cls] - ri(4, 12),
      z_score: VELOCITY_Z[cls],
      formula_detail: `${VELOCITY_Z[cls]} × ${cls === 'A' ? 18 : 8} × √(${Math.round(leadWeeks)}×7) = ${recDays * (cls === 'A' ? 18 : 8)} units = ${recDays} days`,
    };
  });
  const byCategory = DEPARTMENTS.map(d => ({
    category: d,
    recommended_safety_stock_days: ri(18, 64),
    current_safety_stock_days: ri(12, 52),
    gap_days: ri(2, 14),
    urgency: pick(['critical', 'high', 'medium', 'low'] as const),
    reason: `${d} demand variance driven by event windows + size-curve dispersion`,
  }));
  return {
    methodology: 'Z-score model w/ size×color demand variability, weeks-lead-time basis',
    service_levels: {
      A: { target_pct: 98, z_score: 2.05 },
      B: { target_pct: 95, z_score: 1.65 },
      C: { target_pct: 90, z_score: 1.28 },
    },
    by_abc_class: byAbc,
    by_category: byCategory,
    working_capital_impact: {
      current_excess_inventory_cr: 78,
      if_optimised_savings_cr: 22,
      if_gaps_filled_cost_cr: 14,
      net_optimisation_benefit_cr: 8,
    },
  };
}

// 2.11 supply_reorder_intelligence.json
function genSupplyReorderIntelligence() {
  const byCategory = DEPARTMENTS.map(d => {
    const skus = TOP_200_STYLES.filter(s => s.dept === d).slice(0, 5);
    const sample = (skus.length ? skus : TOP_200_STYLES.slice(0, 5)).map((s, i) => {
      const sz = SIZE_SETS[s.size_set][Math.floor(SIZE_SETS[s.size_set].length / 2)];
      const col = s.colors[0];
      const profile = SUPPLIER_TYPE_PROFILES[s.supplier.type];
      const leadWeeks = round1(rb(profile.lead_weeks_band[0], profile.lead_weeks_band[1]));
      const demand = s.velocity_class === 'A' ? 24 : s.velocity_class === 'B' ? 10 : 4;
      const sigma = demand * 0.25;
      const recRop = Math.round(demand * leadWeeks * 7 + 1.65 * sigma * Math.sqrt(leadWeeks * 7));
      const curRop = Math.round(recRop * 0.66);
      const eoq = Math.round(Math.sqrt(2 * demand * 365 * 12 / 0.18) / 4);
      const moq = ri(300, 2000);
      return {
        product_id: `APR-${s.style_code}-${col.slice(0, 3).toUpperCase()}-${sz}`,
        product_name: `${s.style_name} ${col} ${sz}`,
        abc_class: s.velocity_class === 'D' ? 'C' : s.velocity_class,
        avg_daily_demand: demand,
        lead_time_days: round1(leadWeeks * 7), // grocery key (days); value reflects weeks
        demand_std_dev: Math.round(sigma * 10) / 10,
        current_reorder_point: curRop,
        recommended_reorder_point: recRop,
        reorder_point_gap: recRop - curRop,
        current_order_qty: Math.max(moq, eoq),
        eoq: eoq,
        order_qty_gap: Math.max(moq, eoq) - eoq,
        current_stock: ri(0, recRop * 2),
        status: pick(['below_reorder', 'at_reorder', 'above_reorder', 'stockout'] as const),
        annual_holding_cost_cr: round2(rb(0.08, 0.42)),
        annual_ordering_cost_cr: round2(rb(0.04, 0.18)),
        total_cost_current_cr: round2(rb(0.14, 0.62)),
        total_cost_eoq_cr: round2(rb(0.08, 0.42)),
        savings_cr: round2(rb(0.04, 0.24)),
        // additive
        style_id: s.style_id, color: col, size: sz,
        supplier_moq: moq,
        moq_binds: moq > eoq,
      };
    });
    return { category: d, sample_skus: sample };
  });
  return {
    summary: {
      skus_below_reorder_point: 184,
      skus_with_wrong_order_qty: 248,
      potential_savings_cr: 18,
      stockout_risk_skus: 96,
    },
    by_category: byCategory,
    eoq_formula: {
      description: 'EOQ = √(2DS/H), where D = annual demand, S = ordering cost, H = holding cost per unit per year',
      variables: { D: 'Annual demand (units)', S: 'Cost per order ($)', H: 'Annual holding cost per unit ($)' },
      assumptions: { ordering_cost_per_order: 280, holding_cost_rate_pct: 24, working_days_per_year: 365 },
    },
    reorder_point_formula: {
      description: 'ROP = Avg Daily Demand × Lead Time + Safety Stock',
      safety_stock_formula: 'Z × σ_demand × √(lead_days)',
    },
  };
}

// 2.12 supply_allocation.json
function genSupplyAllocation() {
  const byStore = STORES.map(s => {
    const formatBoost = s.format === 'Flagship' ? 1.6 : s.format === 'Outlet' ? 0.6 : 1.0;
    const cur = round1(rb(40, 80) * formatBoost);
    const opt = round1(cur + gaussian(0, 14));
    const gap = round1(cur - opt);
    return {
      store_id: s.id, store_name: s.name, city: s.city,
      current_allocation_cr: cur,
      revenue_optimal_allocation_cr: opt,
      gap_cr: gap,
      gap_type: gap < -2 ? 'under_allocated' : gap > 2 ? 'over_allocated' : 'on_target',
      daily_revenue_cr: round1(rb(4, 10) * formatBoost),
      revenue_lost_daily_cr: round1(Math.max(0, -gap * 0.06)),
      top_gap_category: pick(DEPARTMENTS),
      allocation_score: ri(38, 92),
      // additive
      store_format: s.format,
    };
  });
  const byCategory = DEPARTMENTS.map(d => ({
    category: d,
    total_current_allocation_cr: round1(rb(80, 280)),
    total_optimal_allocation_cr: round1(rb(80, 280)),
    gap_cr: round1(rb(-28, 28)),
    stores_under: ri(4, 18),
    stores_over: ri(4, 18),
    revenue_opportunity_cr: round1(rb(2, 18)),
  }));
  return {
    summary: {
      revenue_optimal_gap_cr: 34,
      stores_over_allocated: byStore.filter(s => s.gap_type === 'over_allocated').length,
      stores_under_allocated: byStore.filter(s => s.gap_type === 'under_allocated').length,
      skus_misallocated: 484,
      reallocation_opportunity_cr: 34,
    },
    by_store: byStore,
    by_category: byCategory,
  };
}

// 2.13 supply_transfers.json
function genSupplyTransfers() {
  const transfers: any[] = [];
  for (let i = 0; i < 24; i++) {
    const fromStore = pick(STORES);
    let toStore = pick(STORES);
    while (toStore.id === fromStore.id) toStore = pick(STORES);
    const s = TOP_200_STYLES[Math.floor(r() * TOP_200_STYLES.length)];
    const col = s.colors[0];
    const sz = SIZE_SETS[s.size_set];
    transfers.push({
      transfer_id: `TRF-A${String(i + 1).padStart(4, '0')}`,
      from_store_id: fromStore.id, from_store: fromStore.name, from_city: fromStore.city,
      to_store_id: toStore.id, to_store: toStore.name, to_city: toStore.city,
      category: s.dept,
      skus: [`${s.style_name} ${col} ${sz[Math.floor(sz.length / 2)]}`, `${s.style_name} ${col} ${sz[0]}`],
      transfer_qty: ri(80, 420),
      transfer_value_cr: round1(rb(0.4, 2.8)),
      from_current_dos: round1(rb(28, 86)),
      from_post_transfer_dos: round1(rb(18, 62)),
      to_current_dos: round1(rb(0, 6)),
      to_post_transfer_dos: round1(rb(8, 22)),
      revenue_preserved_cr: round1(rb(0.2, 1.4)),
      urgency: pick(['critical', 'high', 'medium'] as const),
      logistics_days: ri(1, 4),
      logistics_cost_cr: round2(rb(0.02, 0.12)),
      net_benefit_cr: round1(rb(0.1, 1.2)),
      status: pick(['recommended', 'in_progress', 'completed'] as const),
      // additive
      style_id: s.style_id, color: col, size_range: `${sz[0]}-${sz[sz.length - 1]}`,
      enables_event: pick([null, 'Memorial Day', 'July 4', 'BTS', 'Labor Day', 'BFCM'] as const),
    });
  }
  return {
    summary: {
      total_opportunities: transfers.length,
      total_value_cr: round1(transfers.reduce((s, t) => s + t.transfer_value_cr, 0)),
      immediate_action_count: transfers.filter(t => t.urgency === 'critical').length,
      estimated_revenue_preserved_cr: round1(transfers.reduce((s, t) => s + t.revenue_preserved_cr, 0)),
    },
    transfers,
  };
}

// 2.14 supply_substitution.json
function genSupplySubstitution() {
  const stockoutCands = TOP_200_STYLES.filter(s => s.sell_through_pct > 0.7).slice(0, 60);
  const substitutions = stockoutCands.map(s => {
    const sz = SIZE_SETS[s.size_set][Math.floor(SIZE_SETS[s.size_set].length / 2)];
    const col = s.colors[0];
    const altCol = s.colors[1] || pick(COLORS as readonly string[]);
    const styleSibling = TOP_200_STYLES.find(x => x.dept === s.dept && x.style_id !== s.style_id) || s;
    return {
      stockout_sku_id: `APR-${s.style_code}-${col.slice(0, 3).toUpperCase()}-${sz}`,
      stockout_sku_name: `${s.style_name} ${col} ${sz}`,
      category: s.dept,
      stockout_stores: ri(6, 32),
      daily_revenue_lost_cr: round1(rb(0.08, 0.42)),
      substitutes: [
        {
          substitute_sku_id: `APR-${s.style_code}-${altCol.slice(0, 3).toUpperCase()}-${sz}`,
          substitute_name: `${s.style_name} ${altCol} ${sz}`,
          brand: s.brand,
          price_variance_pct: 0,
          in_stock_stores: ri(18, 42),
          in_stock_dos: round1(rb(14, 38)),
          historical_acceptance_rate_pct: ri(54, 78),
          revenue_preservation_pct: ri(48, 72),
          recommendation: 'Primary substitute (same style, alt color)',
          confidence: 'high',
          // additive
          substitution_tier: 'Size-Color',
          fit_compatibility_score: 0.96,
        },
        {
          substitute_sku_id: `APR-${styleSibling.style_code}-${col.slice(0, 3).toUpperCase()}-${sz}`,
          substitute_name: `${styleSibling.style_name} ${col} ${sz}`,
          brand: styleSibling.brand,
          price_variance_pct: ri(-12, 12),
          in_stock_stores: ri(14, 36),
          in_stock_dos: round1(rb(12, 32)),
          historical_acceptance_rate_pct: ri(24, 42),
          revenue_preservation_pct: ri(22, 38),
          recommendation: 'Style sibling',
          confidence: 'medium',
          substitution_tier: 'Style-Family',
          fit_compatibility_score: round2(rb(0.62, 0.84)),
        },
      ],
      // additive
      style_id: s.style_id, color: col, size: sz,
    };
  });
  return {
    summary: {
      stockout_skus_with_substitutes: substitutions.length,
      revenue_preservation_opportunity_cr: round1(substitutions.reduce((sum, x) => sum + x.daily_revenue_lost_cr * 0.4, 0)),
      avg_substitution_acceptance_rate_pct: 56,
      top_substitute_pairs: 18,
    },
    substitutions,
  };
}

// 2.15 supply_echelon.json
function genSupplyEchelon() {
  const dcs = DCS.map(d => ({
    dc_id: d.id, name: d.name, city: d.city,
    inventory_cr: round1(rb(56, 124)),
    capacity_utilisation_pct: ri(62, 96),
    serves_regions: [d.region],
    avg_replenishment_days: round1(rb(1.4, 3.2)),
    status: pick(['healthy', 'near_capacity', 'at_risk'] as const),
  }));
  const regions = DCS.map(d => ({
    region: d.region,
    dc_id: d.id,
    cities: Array.from(new Set(STORES.filter(s => d.states.includes(s.state)).map(s => s.city))).slice(0, 4),
    regional_inventory_cr: round1(rb(60, 180)),
    store_inventory_cr: round1(rb(80, 220)),
    in_transit_cr: round1(rb(8, 28)),
    stores: STORES.filter(s => d.states.includes(s.state)).length,
    avg_dos: round1(rb(28, 56)),
    health: pick(['healthy', 'at_risk', 'overstock'] as const),
    imbalance_cr: round1(rb(8, 48)),
  }));
  const flow: any[] = [];
  for (const d of DCS) {
    flow.push({
      from: d.name, to: `${d.region} Region`,
      flow_cr: round1(rb(80, 180)),
      in_transit_cr: round1(rb(8, 24)),
      lead_days: round1(rb(1.4, 3.2)),
      status: pick(['on_time', 'delayed'] as const),
    });
  }
  // a few extra echelon-internal flows
  for (let i = 0; i < 6; i++) {
    flow.push({
      from: pick(DCS).name, to: pick(STORES).city + ' Region',
      flow_cr: round1(rb(20, 80)),
      in_transit_cr: round1(rb(2, 12)),
      lead_days: round1(rb(0.8, 2.8)),
      status: 'on_time',
    });
  }
  const rebalancing = [
    { from_region: 'West', to_region: 'East', category: "Women's Bottoms", transfer_value_cr: 8.4, units: 1800, benefit: 'Address NYC SoHo size-curve gap', urgency: 'high' },
    { from_region: 'Southeast', to_region: 'Central', category: 'Footwear', transfer_value_cr: 4.2, units: 920, benefit: 'Pre-position BTS allocation', urgency: 'medium' },
    { from_region: 'East', to_region: 'West', category: 'Accessories', transfer_value_cr: 2.8, units: 1240, benefit: 'Balance Beverly Center demand', urgency: 'medium' },
  ];
  const totalInv = Math.round(dcs.reduce((s, d) => s + d.inventory_cr, 0) + regions.reduce((s, r) => s + r.regional_inventory_cr + r.store_inventory_cr, 0));
  return {
    network_summary: {
      total_inventory_cr: totalInv,
      dc_inventory_cr: Math.round(dcs.reduce((s, d) => s + d.inventory_cr, 0)),
      regional_inventory_cr: Math.round(regions.reduce((s, r) => s + r.regional_inventory_cr, 0)),
      store_inventory_cr: Math.round(regions.reduce((s, r) => s + r.store_inventory_cr, 0)),
      dc_to_regional_in_transit_cr: 64,
      regional_to_store_in_transit_cr: 42,
      network_efficiency_pct: 74.2,
      imbalance_opportunity_cr: 124,
    },
    distribution_centres: dcs,
    regions,
    flow_data: flow,
    rebalancing_opportunities: rebalancing,
  };
}

// ====================================================================
// NEW APPAREL-NATIVE CACHES (6 files)
// ====================================================================

// 3.1 apparel_size_curve.json
function genApparelSizeCurve() {
  const styles = TOP_200_STYLES.slice(0, 200).map(s => {
    const sizes = SIZE_SETS[s.size_set].map(sz => {
      // Bell curve sell-through around median
      const idx = SIZE_SETS[s.size_set].indexOf(sz);
      const mid = (SIZE_SETS[s.size_set].length - 1) / 2;
      const dist = Math.abs(idx - mid);
      const st = clamp(s.sell_through_pct * (1 - dist * 0.08) + gaussian(0, 0.08), 0.04, 0.98);
      return {
        size: sz,
        sell_through_pct: round2(st),
        units_remaining: Math.round(200 * (1 - st) + ri(0, 40)),
        days_on_floor: s.weeks_on_floor * 7,
        stockout_flag: st > 0.94,
      };
    });
    return {
      style_id: s.style_id,
      style_name: s.style_name,
      brand: s.brand,
      category: s.dept,
      size_set: s.size_set,
      season_tag: s.season_tag,
      sizes,
    };
  });
  return {
    styles,
    summary: {
      styles_with_broken_size_curve: styles.filter(s => s.sizes.filter(x => x.stockout_flag).length > 2).length,
      total_units_at_risk_aged_sizes: 18400,
      over_indexed_sizes: ['XXL Tops', '30×30 M Jeans', 'XS Dresses'],
      under_indexed_sizes: ['M Tops', '32×32 M Jeans', 'S Dresses'],
    },
  };
}

// 3.4 apparel_color_performance.json
function genApparelColorPerformance() {
  const cells: any[] = [];
  for (const color of COLORS) {
    for (const cat of DEPARTMENTS) {
      const st = clamp(gaussian(color === 'Black' || color === 'Indigo' || color === 'Navy' ? 0.74 : color === 'Yellow' || color === 'Burgundy' ? 0.28 : 0.52, 0.14), 0.08, 0.96);
      cells.push({
        color,
        category: cat,
        sell_through_pct: round2(st),
        units_sold: Math.round(rb(200, 14000) * st),
        units_remaining: Math.round(rb(200, 3800) * (1 - st)),
        season_tag: pick(['SS26', 'FW25'] as const),
        margin_pct: ri(28, 56),
      });
    }
  }
  return {
    colors: [...COLORS],
    categories: [...DEPARTMENTS],
    cells,
    insights: [
      'Black and Indigo dominate sell-through (>70%) — protect inventory through end of season',
      'Burgundy and Yellow under-performing across categories — pull from FW26 buy plan',
      'Pink over-indexes in Accessories (62% ST) — extend buy depth for Spring 2027',
      'Olive moving slowly in Women\'s Dresses — markdown candidate week of Aug 1',
      'White footwear at 84% ST — restock priority for BTS window',
    ],
  };
}

// 3.3 apparel_style_velocity.json
function genApparelStyleVelocity() {
  const styles = TOP_200_STYLES.slice(0, 200).map(s => {
    // Stage durations summing to the style's weeks_on_floor
    const wks = (stage: Lifecycle) => {
      if (s.lifecycle_stage === 'Intro') return stage === 'Intro' ? s.weeks_on_floor : 0;
      if (s.lifecycle_stage === 'Core') return stage === 'Intro' ? 3 : stage === 'Core' ? s.weeks_on_floor - 3 : 0;
      if (s.lifecycle_stage === 'Markdown-1') return stage === 'Intro' ? 3 : stage === 'Core' ? 10 : stage === 'Markdown-1' ? s.weeks_on_floor - 13 : 0;
      if (s.lifecycle_stage === 'Markdown-2') return stage === 'Intro' ? 3 : stage === 'Core' ? 10 : stage === 'Markdown-1' ? 4 : stage === 'Markdown-2' ? s.weeks_on_floor - 17 : 0;
      if (s.lifecycle_stage === 'Markdown-3') return stage === 'Intro' ? 3 : stage === 'Core' ? 10 : stage === 'Markdown-1' ? 4 : stage === 'Markdown-2' ? 4 : stage === 'Markdown-3' ? s.weeks_on_floor - 21 : 0;
      if (s.lifecycle_stage === 'Clearance') return stage === 'Intro' ? 3 : stage === 'Core' ? 10 : stage === 'Markdown-1' ? 4 : stage === 'Markdown-2' ? 4 : stage === 'Markdown-3' ? 4 : stage === 'Clearance' ? s.weeks_on_floor - 25 : 0;
      return stage === 'Intro' ? 4 : stage === 'Core' ? 8 : stage === 'Markdown-1' ? 4 : stage === 'Markdown-2' ? 4 : stage === 'Markdown-3' ? 8 : stage === 'Clearance' ? 12 : 0;
    };
    const introDate = new Date(CURRENT_DATE.getTime() - s.weeks_on_floor * 7 * 86400000);
    let warning: string = 'normal';
    if (s.lifecycle_stage === 'Intro' && s.sell_through_pct < 0.1) warning = 'stuck_in_intro';
    if ((s.lifecycle_stage === 'Markdown-1' || s.lifecycle_stage === 'Markdown-2') && s.weeks_on_floor < 13) warning = 'racing_to_markdown';
    if (s.lifecycle_stage === 'Discontinued') warning = 'discontinued_candidate';
    return {
      style_id: s.style_id,
      style_name: s.style_name,
      brand: s.brand,
      category: s.dept,
      season_tag: s.season_tag,
      intro_start_date: introDate.toISOString().slice(0, 10),
      weeks_in_intro: wks('Intro'),
      weeks_in_core: wks('Core'),
      weeks_in_markdown_1: wks('Markdown-1'),
      weeks_in_markdown_2: wks('Markdown-2'),
      weeks_in_markdown_3: wks('Markdown-3'),
      weeks_in_clearance: wks('Clearance'),
      sell_through_intro_pct: round2(Math.min(0.24, s.sell_through_pct)),
      sell_through_core_pct: s.lifecycle_stage === 'Intro' ? 0 : round2(Math.min(0.78, s.sell_through_pct)),
      sell_through_markdown_pct: ['Markdown-1', 'Markdown-2', 'Markdown-3'].includes(s.lifecycle_stage) ? round2(s.sell_through_pct) : 0,
      sell_through_clearance_pct: s.lifecycle_stage === 'Clearance' || s.lifecycle_stage === 'Discontinued' ? round2(s.sell_through_pct) : 0,
      stuck_warning: warning,
    };
  });
  return {
    styles,
    benchmarks: { avg_weeks_to_core: 3.2, avg_weeks_to_first_markdown: 13.4, avg_weeks_to_clearance: 22.8 },
  };
}

// 3.5 apparel_aged_inventory.json (season aging matrix)
function genApparelAgedInventory() {
  const seasons = ['SS25', 'FW25', 'SS26', 'FW26'] as const;
  const cells: any[] = [];
  for (const season of seasons) {
    for (const cat of DEPARTMENTS) {
      const aged = season === 'SS25' || (season === 'FW25' && cat === "Women's Dresses");
      const weeks = season === 'SS25' ? ri(50, 68) : season === 'FW25' ? ri(30, 46) : season === 'SS26' ? ri(8, 22) : ri(0, 6);
      cells.push({
        season,
        category: cat,
        inventory_value_usd_m: round1(rb(2, 18) * (season === 'SS26' ? 1.4 : 1.0)),
        avg_weeks_on_floor: weeks,
        markdown_stage_distribution: {
          intro_pct: season === 'FW26' ? 80 : season === 'SS26' ? 18 : 0,
          core_pct: season === 'SS26' ? 64 : season === 'FW26' ? 18 : season === 'FW25' ? 12 : 0,
          markdown_pct: season === 'FW25' ? 56 : season === 'SS25' ? 22 : season === 'SS26' ? 16 : 2,
          clearance_pct: season === 'SS25' ? 78 : season === 'FW25' ? 32 : season === 'SS26' ? 2 : 0,
        },
        aged_flag: aged,
      });
    }
  }
  return {
    seasons: [...seasons],
    categories: [...DEPARTMENTS],
    cells,
    summary: {
      total_aged_value_usd_m: round1(cells.filter(c => c.aged_flag).reduce((s, c) => s + c.inventory_value_usd_m, 0)),
      worst_season: 'SS25',
      worst_category: "Women's Dresses",
    },
  };
}

// 3.6 apparel_markdown_lifecycle.json
function genApparelMarkdownLifecycle() {
  // Aggregate waterfall + per-style waterfalls for top 30 styles with markdown activity
  const networkWaterfall = [
    { stage: 'Total Overstock', value_usd_k: 78000, type: 'total', pct_of_skus: 100 },
    { stage: 'Sells at Full Price', value_usd_k: -8000, type: 'positive', pct_of_skus: 10 },
    { stage: 'Markdown -25% (Week 13)', value_usd_k: -18000, type: 'negative', pct_of_skus: 22 },
    { stage: 'Markdown -40% (Week 17)', value_usd_k: -22000, type: 'negative', pct_of_skus: 24 },
    { stage: 'Markdown -60% (Week 21)', value_usd_k: -16000, type: 'negative', pct_of_skus: 18 },
    { stage: 'Clearance (Week 25+)', value_usd_k: -9000, type: 'negative', pct_of_skus: 14 },
    { stage: 'Net Recovered Value', value_usd_k: 5000, type: 'result', pct_of_skus: 12 },
  ];
  const perStyle = TOP_200_STYLES.filter(s => s.lifecycle_stage.startsWith('Markdown') || s.lifecycle_stage === 'Clearance').slice(0, 30).map(s => {
    const start = Math.round(s.mrp_usd * 200);
    const sold25 = Math.round(start * 0.18);
    const sold40 = Math.round(start * 0.22);
    const sold60 = Math.round(start * 0.16);
    const clearance = Math.round(start * 0.12);
    return {
      style_id: s.style_id,
      style_name: s.style_name,
      category: s.dept,
      current_stage: s.lifecycle_stage,
      stages: [
        { stage: 'Total Overstock', value_usd_k: Math.round(start / 1000), type: 'total' },
        { stage: 'Markdown -25% (Week 13)', value_usd_k: -Math.round(sold25 / 1000), type: 'negative' },
        { stage: 'Markdown -40% (Week 17)', value_usd_k: -Math.round(sold40 / 1000), type: 'negative' },
        { stage: 'Markdown -60% (Week 21)', value_usd_k: -Math.round(sold60 / 1000), type: 'negative' },
        { stage: 'Clearance (Week 25+)', value_usd_k: -Math.round(clearance / 1000), type: 'negative' },
        { stage: 'Net Recovered', value_usd_k: Math.round((start - sold25 - sold40 - sold60 - clearance) / 1000), type: 'result' },
      ],
    };
  });
  return {
    network_waterfall: networkWaterfall,
    per_style_waterfalls: perStyle,
    cadence_summary: {
      avg_weeks_to_first_markdown: 13.4,
      avg_step_size_pct: 17,
      avg_clearance_recovery_pct: 8,
    },
  };
}

// 3.7 apparel_branded_vs_pl.json
function genApparelBrandedVsPl() {
  const types: Array<['Branded Direct' | 'Private Label Vendor' | 'Import Wholesaler' | 'Off-Price Reseller', number, number, number, number, number]> = [
    ['Branded Direct', 14, 284, 42, 7.4, 89],
    ['Private Label Vendor', 6, 138, 58, 14.2, 78],
    ['Import Wholesaler', 5, 62, 34, 12.8, 72],
    ['Off-Price Reseller', 5, 28, 24, 3.2, 91],
  ];
  const byType = types.map(([t, c, v, m, l, o]) => ({
    supplier_type: t, count: c, total_po_value_usd_m: v, avg_margin_pct: m, avg_lead_weeks: l, avg_otif_pct: o,
  }));
  const months12 = last12MonthLabels();
  const trend12m = months12.map(m => {
    const b = ri(52, 62), p = ri(22, 28), w = ri(8, 12), o = ri(4, 8);
    const total = b + p + w + o;
    return {
      month: m,
      branded_pct: Math.round(b / total * 100),
      private_label_pct: Math.round(p / total * 100),
      wholesaler_pct: Math.round(w / total * 100),
      off_price_pct: Math.round(o / total * 100),
    };
  });
  return {
    by_type: byType,
    trend_12m: trend12m,
    margin_gap_usd_m: 22, // PL margin advantage annualised
  };
}

// ====================================================================
// WRITE ALL FILES
// ====================================================================
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'cache', 'apparel');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const filesWritten: Array<[string, number]> = [];
function write(name: string, payload: any) {
  const json = JSON.stringify(payload, null, 2);
  const fp = path.join(OUT_DIR, name);
  fs.writeFileSync(fp, json);
  filesWritten.push([name, json.length]);
}

const tStart = Date.now();
console.log('[gen-apparel-inventory] writing files...');

// 20 grocery-mirror files
write('inventory_kpis.json', genInventoryKpis());
write('inventory_alerts.json', genInventoryAlerts());
write('inventory_health_matrix.json', genInventoryHealthMatrix());
write('inventory_dos_by_dept.json', genInventoryDosByDept());
write('inventory_dos_distribution.json', genInventoryDosDistribution());
write('inventory_replenishment.json', genInventoryReplenishment());
write('inventory_safety_stock.json', genInventorySafetyStock());
write('inventory_sku_table.json', genInventorySkuTable());
write('inventory_stockout_top_skus.json', genInventoryStockoutTopSkus());
write('inventory_stockout_trend.json', genInventoryStockoutTrend());
write('inventory_inbound.json', genInventoryInbound());

write('supply_kpis.json', genSupplyKpis());
write('supply_category_health.json', genSupplyCategoryHealth());
write('supply_overstock.json', genSupplyOverstock());
write('supply_replenishment.json', genSupplyReplenishment());
write('supply_inbound.json', genSupplyInbound());
write('supply_supplier_otif.json', genSupplySupplierOtif());
write('supply_supplier_profiles.json', genSupplySupplierProfiles());
write('supply_forecast.json', genSupplyForecast());
write('supply_revenue_at_risk.json', genSupplyRevenueAtRisk());
write('supply_safety_stock_intelligence.json', genSupplySafetyStockIntelligence());
write('supply_reorder_intelligence.json', genSupplyReorderIntelligence());
write('supply_allocation.json', genSupplyAllocation());
write('supply_transfers.json', genSupplyTransfers());
write('supply_substitution.json', genSupplySubstitution());
write('supply_echelon.json', genSupplyEchelon());

// 6 net-new apparel-native caches
write('apparel_size_curve.json', genApparelSizeCurve());
write('apparel_color_performance.json', genApparelColorPerformance());
write('apparel_style_velocity.json', genApparelStyleVelocity());
write('apparel_aged_inventory.json', genApparelAgedInventory());
write('apparel_markdown_lifecycle.json', genApparelMarkdownLifecycle());
write('apparel_branded_vs_pl.json', genApparelBrandedVsPl());

const elapsed = ((Date.now() - tStart) / 1000).toFixed(2);
const totalBytes = filesWritten.reduce((s, [, b]) => s + b, 0);
console.log('');
console.log(`✓ ${filesWritten.length} files written → cache/apparel/`);
for (const [n, b] of filesWritten) console.log(`  ${(b / 1024).toFixed(1).padStart(10)} KB  ${n}`);
console.log('');
console.log(`Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Runtime: ${elapsed}s`);
console.log(`Master styles: ${STYLES.length} (top-200 capped)`);
console.log(`Master SKU rows: ${SKUS.length} (size-color granular)`);
console.log(`Suppliers: ${SUPPLIERS.length}`);
console.log(`DCs: ${DCS.length}`);
console.log(`Stores: ${STORES.length}`);

// Lifecycle distribution
const lcDist: Record<string, number> = {};
for (const s of STYLES) lcDist[s.lifecycle_stage] = (lcDist[s.lifecycle_stage] || 0) + 1;
console.log(`Lifecycle distribution:`, lcDist);

// Velocity distribution
const vDist: Record<string, number> = {};
for (const s of STYLES) vDist[s.velocity_class] = (vDist[s.velocity_class] || 0) + 1;
console.log(`Velocity (ABCD) distribution:`, vDist);

// Top 5 suppliers by total PO value (style count × current_price × velocity weight)
const supRev: Record<string, number> = {};
for (const s of STYLES) {
  const w = s.velocity_class === 'A' ? 4 : s.velocity_class === 'B' ? 3 : s.velocity_class === 'C' ? 2 : 1;
  supRev[s.supplier.name] = (supRev[s.supplier.name] || 0) + s.current_price_usd * w * 1000;
}
const top5 = Object.entries(supRev).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log(`Top 5 suppliers by PO-value proxy:`);
for (const [name, val] of top5) console.log(`  $${(val / 1000000).toFixed(2)}M  ${name}`);
