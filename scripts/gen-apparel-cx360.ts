/**
 * Apparel CX360 data generator — emits 24 cache files into cache/apparel/
 * Spec: docs/apparel-cx360-spec.md
 *
 * Run: npx ts-node --project scripts/tsconfig.json scripts/gen-apparel-cx360.ts
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
const SEED = 0xa9981ed1; // "apparel v1"
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
  // Box-Muller
  const u1 = Math.max(1e-9, r());
  const u2 = r();
  return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ====================================================================
// APPAREL DOMAIN CONSTANTS — §1 of spec
// ====================================================================

// §1.6 Customer segments
const SEGMENTS = [
  'Fashion Forward', 'Athletic Enthusiast', 'Value Shopper', 'Brand Loyalist',
  'Returner', 'Lapsed', 'Casual', 'New',
] as const;
type Segment = typeof SEGMENTS[number];
const SEGMENT_WEIGHTS: Array<[Segment, number]> = [
  ['Fashion Forward', 9], ['Athletic Enthusiast', 14], ['Value Shopper', 22], ['Brand Loyalist', 12],
  ['Returner', 7], ['Lapsed', 18], ['Casual', 13], ['New', 5],
];

// §1.7 Loyalty tiers
const LOYALTY_TIERS = ['Elite', 'Reward', 'Insider', 'Member', 'Guest'] as const;
type LoyaltyTier = typeof LOYALTY_TIERS[number];
const LOYALTY_WEIGHTS: Array<[LoyaltyTier, number]> = [
  ['Elite', 4], ['Reward', 18], ['Insider', 38], ['Member', 22], ['Guest', 18],
];

// §1.8 Channels (shopping)
const CHANNELS = ['In-Store', 'Web', 'App', 'Curbside', 'Marketplace'] as const;
type Channel = typeof CHANNELS[number];
const CHANNEL_WEIGHTS: Array<[Channel, number]> = [
  ['In-Store', 42], ['Web', 28], ['App', 18], ['Curbside', 4], ['Marketplace', 8],
];

// Acquisition channels (7)
const ACQ_CHANNELS = ['Organic', 'Paid Social', 'Paid Search', 'Direct', 'Email', 'Referral', 'Affiliate'] as const;
type AcqChannel = typeof ACQ_CHANNELS[number];
const ACQ_WEIGHTS: Array<[AcqChannel, number]> = [
  ['Organic', 22], ['Paid Social', 24], ['Paid Search', 14], ['Direct', 10],
  ['Email', 10], ['Referral', 12], ['Affiliate', 8],
];
const ACQ_CAC: Record<AcqChannel, [number, number]> = {
  Organic: [0, 0], 'Paid Social': [42, 92], 'Paid Search': [28, 58],
  Direct: [0, 0], Email: [4, 12], Referral: [6, 22], Affiliate: [18, 48],
};
const ACQ_DESC: Record<AcqChannel, string> = {
  Organic: 'Organic search, social discovery, content',
  'Paid Social': 'Meta, TikTok, Pinterest ads',
  'Paid Search': 'Google, Microsoft ad spend',
  Direct: 'Direct site visits, brand awareness',
  Email: 'Email marketing campaigns',
  Referral: 'Word of mouth, referral programs',
  Affiliate: 'Affiliate networks & creator partnerships',
};

// §1.10 Churn risk tiers
const CHURN_TIERS = ['Critical', 'High', 'Medium', 'Low'] as const;
type ChurnTier = typeof CHURN_TIERS[number] | 'Loyal';

// CLV tiers
const CLV_TIERS = ['Platinum', 'Gold', 'Silver', 'Bronze', 'At-Risk'] as const;
type CLVTier = typeof CLV_TIERS[number];

// §1.12 US stores (50)
const STORES = [
  { id: 'STR-A001', name: 'Flagship SoHo NYC', city: 'New York', state: 'NY', metro: 'NYC' },
  { id: 'STR-A002', name: 'Standard 5th Ave NYC', city: 'New York', state: 'NY', metro: 'NYC' },
  { id: 'STR-A003', name: 'Outlet Woodbury Common', city: 'Central Valley', state: 'NY', metro: 'NYC' },
  { id: 'STR-A004', name: 'Standard Brooklyn Atlantic', city: 'Brooklyn', state: 'NY', metro: 'NYC' },
  { id: 'STR-A005', name: 'Flagship Newbury St Boston', city: 'Boston', state: 'MA', metro: 'Boston' },
  { id: 'STR-A006', name: 'Standard Prudential Boston', city: 'Boston', state: 'MA', metro: 'Boston' },
  { id: 'STR-A007', name: 'Outlet Wrentham Premium', city: 'Wrentham', state: 'MA', metro: 'Boston' },
  { id: 'STR-A008', name: 'Standard King of Prussia', city: 'King of Prussia', state: 'PA', metro: 'Philadelphia' },
  { id: 'STR-A009', name: 'Standard Walnut St Philly', city: 'Philadelphia', state: 'PA', metro: 'Philadelphia' },
  { id: 'STR-A010', name: 'Flagship Mag Mile Chicago', city: 'Chicago', state: 'IL', metro: 'Chicago' },
  { id: 'STR-A011', name: 'Standard Oakbrook Center', city: 'Oak Brook', state: 'IL', metro: 'Chicago' },
  { id: 'STR-A012', name: 'Outlet Aurora Premium', city: 'Aurora', state: 'IL', metro: 'Chicago' },
  { id: 'STR-A013', name: 'Standard Mall of America', city: 'Bloomington', state: 'MN', metro: 'Minneapolis' },
  { id: 'STR-A014', name: 'Standard Somerset Detroit', city: 'Troy', state: 'MI', metro: 'Detroit' },
  { id: 'STR-A015', name: 'Standard Easton Town Center', city: 'Columbus', state: 'OH', metro: 'Columbus' },
  { id: 'STR-A016', name: 'Flagship Lenox Square Atlanta', city: 'Atlanta', state: 'GA', metro: 'Atlanta' },
  { id: 'STR-A017', name: 'Outlet North Georgia Premium', city: 'Dawsonville', state: 'GA', metro: 'Atlanta' },
  { id: 'STR-A018', name: 'Standard SouthPark Charlotte', city: 'Charlotte', state: 'NC', metro: 'Charlotte' },
  { id: 'STR-A019', name: 'Standard Bal Harbour Shops Miami', city: 'Bal Harbour', state: 'FL', metro: 'Miami' },
  { id: 'STR-A020', name: 'Standard Aventura Mall', city: 'Aventura', state: 'FL', metro: 'Miami' },
  { id: 'STR-A021', name: 'Outlet Sawgrass Mills', city: 'Sunrise', state: 'FL', metro: 'Miami' },
  { id: 'STR-A022', name: 'Standard Mall at Millenia Orlando', city: 'Orlando', state: 'FL', metro: 'Orlando' },
  { id: 'STR-A023', name: 'Standard Galleria Houston', city: 'Houston', state: 'TX', metro: 'Houston' },
  { id: 'STR-A024', name: 'Standard Highland Village Houston', city: 'Houston', state: 'TX', metro: 'Houston' },
  { id: 'STR-A025', name: 'Flagship Galleria Dallas', city: 'Dallas', state: 'TX', metro: 'Dallas' },
  { id: 'STR-A026', name: 'Standard NorthPark Dallas', city: 'Dallas', state: 'TX', metro: 'Dallas' },
  { id: 'STR-A027', name: 'Outlet Allen Premium', city: 'Allen', state: 'TX', metro: 'Dallas' },
  { id: 'STR-A028', name: 'Flagship S Congress Austin', city: 'Austin', state: 'TX', metro: 'Austin' },
  { id: 'STR-A029', name: 'Standard Domain Austin', city: 'Austin', state: 'TX', metro: 'Austin' },
  { id: 'STR-A030', name: 'Standard La Cantera San Antonio', city: 'San Antonio', state: 'TX', metro: 'San Antonio' },
  { id: 'STR-A031', name: 'Flagship Beverly Center LA', city: 'Los Angeles', state: 'CA', metro: 'Los Angeles' },
  { id: 'STR-A032', name: 'Standard Grove LA', city: 'Los Angeles', state: 'CA', metro: 'Los Angeles' },
  { id: 'STR-A033', name: 'Standard South Coast Plaza', city: 'Costa Mesa', state: 'CA', metro: 'Los Angeles' },
  { id: 'STR-A034', name: 'Outlet Citadel LA', city: 'Commerce', state: 'CA', metro: 'Los Angeles' },
  { id: 'STR-A035', name: 'Flagship Union Sq SF', city: 'San Francisco', state: 'CA', metro: 'San Francisco' },
  { id: 'STR-A036', name: 'Standard Stanford Shopping', city: 'Palo Alto', state: 'CA', metro: 'San Francisco' },
  { id: 'STR-A037', name: 'Standard Fashion Valley San Diego', city: 'San Diego', state: 'CA', metro: 'San Diego' },
  { id: 'STR-A038', name: 'Standard Scottsdale Fashion Square', city: 'Scottsdale', state: 'AZ', metro: 'Phoenix' },
  { id: 'STR-A039', name: 'Outlet Phoenix Premium', city: 'Chandler', state: 'AZ', metro: 'Phoenix' },
  { id: 'STR-A040', name: 'Standard Forum Las Vegas', city: 'Las Vegas', state: 'NV', metro: 'Las Vegas' },
  { id: 'STR-A041', name: 'Standard Cherry Creek Denver', city: 'Denver', state: 'CO', metro: 'Denver' },
  { id: 'STR-A042', name: 'Standard Park Meadows Denver', city: 'Lone Tree', state: 'CO', metro: 'Denver' },
  { id: 'STR-A043', name: 'Flagship University Village Seattle', city: 'Seattle', state: 'WA', metro: 'Seattle' },
  { id: 'STR-A044', name: 'Standard Bellevue Square', city: 'Bellevue', state: 'WA', metro: 'Seattle' },
  { id: 'STR-A045', name: 'Standard Pioneer Place Portland', city: 'Portland', state: 'OR', metro: 'Portland' },
  { id: 'STR-A046', name: 'Standard Plaza Frontenac St Louis', city: 'St. Louis', state: 'MO', metro: 'St. Louis' },
  { id: 'STR-A047', name: 'Standard Country Club Plaza KC', city: 'Kansas City', state: 'MO', metro: 'Kansas City' },
  { id: 'STR-A048', name: 'Standard Crocker Park Cleveland', city: 'Westlake', state: 'OH', metro: 'Cleveland' },
  { id: 'STR-A049', name: 'Standard Indianapolis Fashion Mall', city: 'Indianapolis', state: 'IN', metro: 'Indianapolis' },
  { id: 'STR-A050', name: 'Standard Stamford Town Center', city: 'Stamford', state: 'CT', metro: 'NYC' },
];
const METROS = Array.from(new Set(STORES.map(s => s.metro)));
const METRO_WEIGHTS: Array<[string, number]> = METROS.map(m => {
  let w = STORES.filter(s => s.metro === m).length;
  if (m === 'NYC' || m === 'Los Angeles') w = Math.round(w * 1.6);
  return [m, w];
});

// §1.3 Brands (25) — allowed departments + share map
type Dept = "Women's Tops" | "Women's Bottoms" | "Women's Dresses" | "Men's Tops" | "Men's Bottoms" | "Kids'" | 'Footwear' | 'Accessories';
const DEPARTMENTS: Dept[] = ["Women's Tops", "Women's Bottoms", "Women's Dresses", "Men's Tops", "Men's Bottoms", "Kids'", 'Footwear', 'Accessories'];

interface BrandSpec { id: string; name: string; tier: 'Premium' | 'Mid' | 'Value'; depts: Partial<Record<Dept, number>>; }
const BRANDS: BrandSpec[] = [
  { id: 'LEV', name: "Levi's", tier: 'Mid', depts: { "Men's Bottoms": 18, "Women's Bottoms": 9 } },
  { id: 'WRG', name: 'Wrangler', tier: 'Value', depts: { "Men's Bottoms": 6 } },
  { id: 'LEE', name: 'Lee', tier: 'Value', depts: { "Men's Bottoms": 4, "Women's Bottoms": 3 } },
  { id: 'MAD', name: 'Madewell', tier: 'Premium', depts: { "Women's Bottoms": 7, "Women's Tops": 4 } },
  { id: 'NKE', name: 'Nike', tier: 'Premium', depts: { "Men's Tops": 14, "Women's Tops": 9, Footwear: 18, "Kids'": 8 } },
  { id: 'ADI', name: 'Adidas', tier: 'Premium', depts: { "Men's Tops": 7, "Women's Tops": 5, Footwear: 11 } },
  { id: 'UAR', name: 'Under Armour', tier: 'Mid', depts: { "Men's Tops": 5, "Women's Tops": 3 } },
  { id: 'LUL', name: 'Lululemon', tier: 'Premium', depts: { "Women's Tops": 12, "Women's Bottoms": 14, "Men's Tops": 4 } },
  { id: 'NB', name: 'New Balance', tier: 'Mid', depts: { Footwear: 9 } },
  { id: 'HM', name: 'H&M', tier: 'Value', depts: { "Women's Tops": 11, "Women's Dresses": 14, "Men's Tops": 6, "Kids'": 9 } },
  { id: 'ZRA', name: 'Zara', tier: 'Mid', depts: { "Women's Dresses": 18, "Women's Tops": 9, "Men's Tops": 5 } },
  { id: 'UNQ', name: 'Uniqlo', tier: 'Value', depts: { "Men's Tops": 8, "Women's Tops": 7 } },
  { id: 'FOR', name: 'Forever 21', tier: 'Value', depts: { "Women's Tops": 6, "Women's Dresses": 8 } },
  { id: 'ON', name: 'Old Navy', tier: 'Value', depts: { "Women's Bottoms": 10, "Men's Bottoms": 9, "Kids'": 14 } },
  { id: 'GAP', name: 'Gap', tier: 'Mid', depts: { "Men's Bottoms": 7, "Men's Tops": 6 } },
  { id: 'BR', name: 'Banana Republic', tier: 'Premium', depts: { "Men's Bottoms": 5, "Men's Tops": 4 } },
  { id: 'JCR', name: 'J.Crew', tier: 'Premium', depts: { "Men's Tops": 7, "Women's Tops": 4 } },
  { id: 'CRT', name: "Carter's", tier: 'Value', depts: { "Kids'": 22 } },
  { id: 'OSH', name: "OshKosh B'gosh", tier: 'Value', depts: { "Kids'": 14 } },
  { id: 'VAN', name: 'Vans', tier: 'Mid', depts: { Footwear: 10 } },
  { id: 'CNV', name: 'Converse', tier: 'Mid', depts: { Footwear: 7 } },
  { id: 'DRM', name: 'Dr. Martens', tier: 'Premium', depts: { Footwear: 5 } },
  { id: 'COA', name: 'Coach', tier: 'Premium', depts: { Accessories: 18 } },
  { id: 'FOS', name: 'Fossil', tier: 'Mid', depts: { Accessories: 9 } },
  { id: 'RAY', name: 'Ray-Ban', tier: 'Premium', depts: { Accessories: 14 } },
  { id: 'HER', name: 'Herschel', tier: 'Mid', depts: { Accessories: 7 } },
];

// §1.2 Categories (L2 → parent dept) + AOV per cat
interface CatSpec { name: string; dept: Dept; aov: [number, number, number]; l1: string; }
const CATEGORIES: CatSpec[] = [
  { name: 'Crew Tee', dept: "Women's Tops", aov: [12, 22, 45], l1: 'Tops' },
  { name: 'Tank', dept: "Women's Tops", aov: [12, 22, 45], l1: 'Tops' },
  { name: 'Blouse', dept: "Women's Tops", aov: [35, 58, 110], l1: 'Tops' },
  { name: 'Cardigan', dept: "Women's Tops", aov: [40, 65, 120], l1: 'Tops' },
  { name: 'Pullover', dept: "Women's Tops", aov: [35, 58, 95], l1: 'Tops' },
  { name: 'Hoodie', dept: "Women's Tops", aov: [35, 58, 95], l1: 'Tops' },
  { name: 'Skinny Jean', dept: "Women's Bottoms", aov: [38, 72, 170], l1: 'Bottoms' },
  { name: 'Mom Jean', dept: "Women's Bottoms", aov: [38, 72, 170], l1: 'Bottoms' },
  { name: 'Wide-Leg Jean', dept: "Women's Bottoms", aov: [38, 72, 170], l1: 'Bottoms' },
  { name: 'Legging', dept: "Women's Bottoms", aov: [28, 58, 128], l1: 'Bottoms' },
  { name: 'Trouser', dept: "Women's Bottoms", aov: [28, 58, 128], l1: 'Bottoms' },
  { name: 'Mini Dress', dept: "Women's Dresses", aov: [30, 65, 140], l1: 'Outerwear' },
  { name: 'Midi Dress', dept: "Women's Dresses", aov: [45, 90, 180], l1: 'Outerwear' },
  { name: 'Maxi Dress', dept: "Women's Dresses", aov: [50, 110, 200], l1: 'Outerwear' },
  { name: 'Wrap Dress', dept: "Women's Dresses", aov: [50, 110, 200], l1: 'Outerwear' },
  { name: 'Polo', dept: "Men's Tops", aov: [22, 38, 75], l1: 'Tops' },
  { name: 'Henley', dept: "Men's Tops", aov: [22, 38, 75], l1: 'Tops' },
  { name: 'Button-Down', dept: "Men's Tops", aov: [35, 58, 110], l1: 'Tops' },
  { name: 'Flannel', dept: "Men's Tops", aov: [40, 65, 120], l1: 'Tops' },
  { name: 'Slim Jean', dept: "Men's Bottoms", aov: [40, 75, 180], l1: 'Bottoms' },
  { name: 'Straight Jean', dept: "Men's Bottoms", aov: [40, 75, 180], l1: 'Bottoms' },
  { name: 'Chino', dept: "Men's Bottoms", aov: [40, 75, 180], l1: 'Bottoms' },
  { name: 'Cargo', dept: "Men's Bottoms", aov: [40, 75, 180], l1: 'Bottoms' },
  { name: 'Short', dept: "Men's Bottoms", aov: [25, 45, 95], l1: 'Bottoms' },
  { name: 'Graphic Tee', dept: "Kids'", aov: [10, 22, 45], l1: 'Tops' },
  { name: 'Kids Jean', dept: "Kids'", aov: [10, 22, 45], l1: 'Bottoms' },
  { name: 'Kids Hoodie', dept: "Kids'", aov: [10, 22, 45], l1: 'Tops' },
  { name: 'Puffer Jacket', dept: "Kids'", aov: [80, 180, 350], l1: 'Outerwear' },
  { name: 'Running Sneaker', dept: 'Footwear', aov: [50, 105, 180], l1: 'Footwear' },
  { name: 'Casual Sneaker', dept: 'Footwear', aov: [50, 105, 180], l1: 'Footwear' },
  { name: 'Boot', dept: 'Footwear', aov: [90, 160, 250], l1: 'Footwear' },
  { name: 'Sandal', dept: 'Footwear', aov: [25, 55, 110], l1: 'Footwear' },
  { name: 'Tote Bag', dept: 'Accessories', aov: [35, 95, 395], l1: 'Accessories' },
  { name: 'Backpack', dept: 'Accessories', aov: [35, 95, 395], l1: 'Accessories' },
  { name: 'Belt', dept: 'Accessories', aov: [18, 40, 95], l1: 'Accessories' },
  { name: 'Sunglasses', dept: 'Accessories', aov: [40, 110, 220], l1: 'Accessories' },
  { name: 'Watch', dept: 'Accessories', aov: [75, 175, 400], l1: 'Accessories' },
];

// §1.13 Return reasons
const RETURN_REASONS = ['Fit', 'Style', 'Quality', 'Wrong Item', 'Damaged', 'Changed Mind'] as const;

// §1.11 Holidays
const HOLIDAYS = [
  { name: "New Year's Day", window: 'Jan 1', depts: 'All', uplift: 0.6 },
  { name: 'MLK Day Sale', window: 'Jan 16-19', depts: 'All', uplift: 1.4 },
  { name: "Valentine's Day", window: 'Feb 7-14', depts: "Women's, Accessories", uplift: 1.7 },
  { name: 'Presidents Day Sale', window: 'Feb 13-16', depts: 'All', uplift: 1.6 },
  { name: 'Spring Break Drop', window: 'Mar 7-22', depts: "Women's, Footwear", uplift: 1.8 },
  { name: 'Easter', window: 'Apr 5', depts: "Kids', Women's Dresses", uplift: 1.5 },
  { name: "Mother's Day", window: 'May 3-10', depts: "Women's, Accessories", uplift: 2.0 },
  { name: 'Memorial Day Sale', window: 'May 22-25', depts: 'All', uplift: 2.4 },
  { name: "Father's Day", window: 'Jun 14-21', depts: "Men's", uplift: 1.7 },
  { name: '4th of July', window: 'Jul 1-5', depts: 'All', uplift: 1.9 },
  { name: 'Back-to-School', window: 'Jul 25-Aug 25', depts: "Kids', Footwear, M+W Bottoms", uplift: 2.8 },
  { name: 'Tax-Free Weekends', window: 'Aug 7-9', depts: 'All', uplift: 1.9 },
  { name: 'Labor Day Sale', window: 'Sep 4-7', depts: 'All', uplift: 2.1 },
  { name: 'Fall Drop / NYFW', window: 'Sep 10-20', depts: 'All', uplift: 1.6 },
  { name: "Columbus Day", window: 'Oct 9-12', depts: 'All', uplift: 1.4 },
  { name: 'Halloween', window: 'Oct 20-31', depts: "Kids', Accessories", uplift: 1.3 },
  { name: 'Veterans Day Sale', window: 'Nov 7-11', depts: 'All', uplift: 1.5 },
  { name: 'Pre-Black Friday', window: 'Nov 16-24', depts: 'All', uplift: 2.6 },
  { name: 'Black Friday', window: 'Nov 27', depts: 'All', uplift: 4.2 },
  { name: 'Cyber Monday', window: 'Nov 30', depts: 'Web, App', uplift: 3.6 },
  { name: 'Free Shipping Day', window: 'Dec 14', depts: 'Web, App', uplift: 2.0 },
  { name: 'Christmas Eve', window: 'Dec 24', depts: 'All', uplift: 1.9 },
  { name: 'Christmas', window: 'Dec 25', depts: 'All', uplift: 0.3 },
  { name: 'NYE Clearance', window: 'Dec 26-31', depts: 'All', uplift: 2.3 },
];

// §1.15 Name pools
const FIRST_NAMES = ['Aisha','Alex','Amir','Andrea','Anika','Ariana','Brandon','Brianna','Camila','Carlos','Chloe','Daniel','David','DeShawn','Diego','Elena','Emily','Emma','Ethan','Fatima','Grace','Hannah','Imani','Isabella','Jaden','James','Jasmine','Jessica','Jordan','Kai','Katherine','Kevin','Liam','Maya','Marcus','Mia','Michael','Nadia','Noah','Olivia','Priya','Rachel','Raj','Ricardo','Samantha','Sarah','Sofia','Tyler','Vanessa','Zoe'];
const LAST_NAMES = ['Adams','Alvarez','Bennett','Brown','Carter','Chen','Cohen','Davis','Diaz','Edwards','Fischer','Foster','Garcia','Gonzalez','Green','Hall','Harris','Hernandez','Jackson','Johnson','Kim','Kumar','Lee','Lewis','Lopez','Martinez','Miller','Mitchell','Nakamura','Nguyen',"O'Brien",'Park','Patel','Perez','Phillips','Reyes','Rivera','Roberts','Rodriguez','Rosen','Singh','Smith','Taylor','Thompson','Torres','Walker','Washington','White','Williams','Wong'];

function nameForId(id: string): string {
  // simple deterministic hash
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const f = FIRST_NAMES[Math.abs(h) % FIRST_NAMES.length];
  const l = LAST_NAMES[Math.abs(h >>> 7) % LAST_NAMES.length];
  return `${f} ${l}`;
}

// §1.16 NBA actions
const NBA_ACTIONS: Record<string, string> = {
  send_new_drop: 'Send new-drop email featuring saved sizes',
  offer_15_off_next: 'Offer 15% off next purchase',
  offer_25_off_reactivation: 'Reactivation: 25% off + free returns',
  free_shipping_invite: 'Free shipping on next order',
  concierge_fit_consult: 'Book virtual fit consult with stylist',
  size_up_recommendation: 'Trigger size-up recommendation on app',
  app_install_push: 'Push: install app for early access',
  wardrobe_quiz_invite: 'Send wardrobe quiz invitation',
  gift_with_purchase_invite: 'Invite to GWP threshold ($150)',
  loyalty_tier_upgrade_invite: 'Invite to upgrade to Reward tier',
  promote_lululemon_arrivals: 'Promote new Lululemon arrivals',
  promote_nike_arrivals: 'Promote new Nike arrivals',
  add_to_watch_list: 'Add to CX watch list',
  creator_lookbook_send: 'Send creator-curated lookbook',
};

// ====================================================================
// MASTER CUSTOMER TABLE — 80,000 rows
// ====================================================================
interface Customer {
  customer_id: string;
  customer_segment: string;
  loyalty_tier: string;
  clv_12m: number;
  clv_tier: string;
  churn_prob_90d: number;
  churn_risk_tier: string;
  total_spend: number;
  total_transactions: number;
  avg_basket: number;
  days_since_last_purchase: number;
  preferred_channel: string;
  acquisition_channel: string;
  city: string;
  geography: string;
  top_category: string;
  top_brand: string;
  return_rate_pct: number;
  probability_alive: number;
  purchase_frequency: number;
  recency_days: number;
  days_since_signup: number;
}

const TOTAL_CUSTOMERS = 80000;

function clvTierOf(clv: number): CLVTier {
  if (clv >= 2000) return 'Platinum';
  if (clv >= 800) return 'Gold';
  if (clv >= 300) return 'Silver';
  if (clv >= 80) return 'Bronze';
  return 'At-Risk';
}
function churnTierOf(p: number): ChurnTier {
  if (p >= 0.70) return 'Critical';
  if (p >= 0.45) return 'High';
  if (p >= 0.20) return 'Medium';
  if (p >= 0.05) return 'Low';
  return 'Loyal';
}

const SEG_CLV: Record<Segment, [number, number]> = {
  'Fashion Forward': [820, 280], 'Athletic Enthusiast': [940, 310], 'Brand Loyalist': [1140, 420],
  'Value Shopper': [310, 120], 'Casual': [240, 110], 'Returner': [420, 190], 'New': [120, 40], 'Lapsed': [190, 110],
};

function brandForCategoryAndSegment(cat: CatSpec, seg: Segment): string {
  // Find brands ranged on cat.dept; weight by share + segment bias.
  const candidates = BRANDS.filter(b => b.depts[cat.dept] !== undefined);
  if (candidates.length === 0) return 'Old Navy';
  const weights: Array<[string, number]> = candidates.map(b => {
    let w = b.depts[cat.dept]!;
    if (seg === 'Athletic Enthusiast' && ['NKE','LUL','UAR','ADI','NB'].includes(b.id)) w *= 2.5;
    if (seg === 'Fashion Forward' && ['ZRA','MAD','FOR'].includes(b.id)) w *= 2.5;
    if (seg === 'Value Shopper' && ['HM','ON','FOR','UNQ','WRG','LEE'].includes(b.id)) w *= 2.0;
    if (seg === 'Brand Loyalist' && ['LUL','COA','MAD','BR','JCR'].includes(b.id)) w *= 2.0;
    return [b.name, w];
  });
  return weightedPick(weights);
}

function categoryForSegment(seg: Segment): CatSpec {
  // Weighted: Athletic → activewear (Legging, Sneaker, Hoodie); Fashion Forward → dresses/tops; Value → Tee/Jean; etc.
  const ws: Array<[string, number]> = CATEGORIES.map(c => {
    let w = 1;
    if (seg === 'Athletic Enthusiast' && (c.name.includes('Legging') || c.name.includes('Sneaker') || c.name.includes('Hoodie') || c.name === 'Tank')) w = 5;
    if (seg === 'Fashion Forward' && (c.l1 === 'Outerwear' || c.dept === "Women's Tops")) w = 4;
    if (seg === 'Value Shopper' && (c.name === 'Crew Tee' || c.name === 'Graphic Tee' || c.name.includes('Jean'))) w = 4;
    if (seg === 'Brand Loyalist' && c.dept === 'Accessories') w = 3;
    return [c.name, w];
  });
  const name = weightedPick(ws);
  return CATEGORIES.find(c => c.name === name)!;
}

console.log(`[gen] seed=0x${SEED.toString(16)} — generating ${TOTAL_CUSTOMERS} customers...`);
const tStart = Date.now();

const customers: Customer[] = new Array(TOTAL_CUSTOMERS);
for (let i = 0; i < TOTAL_CUSTOMERS; i++) {
  const id = `CUST-${i.toString().padStart(5, '0')}`;
  const segment = weightedPick(SEGMENT_WEIGHTS);
  let loyalty: LoyaltyTier = weightedPick(LOYALTY_WEIGHTS);
  if (segment === 'Brand Loyalist' && r() < 0.4) loyalty = pick(['Elite', 'Reward']);
  if (segment === 'New' && r() < 0.5) loyalty = pick(['Guest', 'Member']);
  if (segment === 'Lapsed' && r() < 0.4) loyalty = pick(['Member', 'Guest']);

  const metro = weightedPick(METRO_WEIGHTS);

  const [mu, sigma] = SEG_CLV[segment];
  let clv = Math.round(clamp(gaussian(mu, sigma), 10, 5000));
  const clvT = clvTierOf(clv);

  const spendMult = rb(1.4, 4.5);
  const total_spend = Math.round(clv * spendMult);

  // base transactions per year
  let baseTxn = 2.4;
  if (segment === 'Athletic Enthusiast') baseTxn = 6;
  if (segment === 'Fashion Forward') baseTxn = 5;
  if (segment === 'Brand Loyalist') baseTxn = 7;
  if (segment === 'Value Shopper') baseTxn = 3;
  if (segment === 'Returner') baseTxn = 5;
  if (segment === 'Casual') baseTxn = 1.5;
  if (segment === 'New') baseTxn = 1.2;
  if (segment === 'Lapsed') baseTxn = 0.6;
  const years = rb(1, 4);
  const total_transactions = Math.max(1, Math.round(baseTxn * years * rb(0.8, 1.3)));

  const avg_basket = clamp(total_spend / total_transactions, 25, 280);

  let days_since_last: number;
  if (segment === 'Lapsed') days_since_last = ri(180, 540);
  else if (segment === 'Casual') days_since_last = ri(60, 200);
  else if (segment === 'New') days_since_last = ri(1, 60);
  else days_since_last = ri(1, 90);

  // Target distribution: Critical 11%, High 16%, Medium 28%, Low 38%, Loyal 7%.
  // We model churn as a base draw shaped by segment, then jitter.
  // Lapsed (18%) → high churn band; Returner partial → high; Brand Loyalist/Athletic → low.
  let churnBase: number;
  if (segment === 'Lapsed') churnBase = 0.60 + r() * 0.35;       // 0.60–0.95 → Critical/High
  else if (segment === 'Returner') churnBase = 0.35 + r() * 0.40; // 0.35–0.75 → Medium/High/Critical
  else if (segment === 'Brand Loyalist') churnBase = r() * 0.18;  // 0.0–0.18 → Loyal/Low
  else if (segment === 'Athletic Enthusiast') churnBase = r() * 0.22;
  else if (segment === 'Fashion Forward') churnBase = r() * 0.30;
  else if (segment === 'New') churnBase = 0.10 + r() * 0.25;      // Low/Medium
  else if (segment === 'Casual') churnBase = 0.15 + r() * 0.30;   // Low/Medium
  else /* Value Shopper */ churnBase = 0.20 + r() * 0.35;          // Medium-leaning
  // Sigmoid uplift from recency (centered 120d)
  const recencyBump = 0.2 * (1 / (1 + Math.exp(-(days_since_last - 120) / 60)) - 0.5);
  let churn = clamp(churnBase + recencyBump + gaussian(0, 0.04), 0.02, 0.96);

  const churnTier = churnTierOf(churn);

  let prefCh: Channel = weightedPick(CHANNEL_WEIGHTS);
  if ((segment === 'New' || segment === 'Athletic Enthusiast') && r() < 0.45) prefCh = 'App';
  if ((segment === 'Lapsed' || segment === 'Casual') && r() < 0.5) prefCh = 'In-Store';

  const acq = weightedPick(ACQ_WEIGHTS);
  const cat = categoryForSegment(segment);
  const brand = brandForCategoryAndSegment(cat, segment);

  let retRate = clamp(gaussian(0.18, 0.10), 0, 0.7);
  if (segment === 'Returner') retRate = Math.max(retRate, 0.35 + r() * 0.25);

  customers[i] = {
    customer_id: id,
    customer_segment: segment,
    loyalty_tier: loyalty,
    clv_12m: clv,
    clv_tier: clvT,
    churn_prob_90d: Math.round(churn * 1000) / 1000,
    churn_risk_tier: churnTier,
    total_spend,
    total_transactions,
    avg_basket: Math.round(avg_basket),
    days_since_last_purchase: days_since_last,
    preferred_channel: prefCh,
    acquisition_channel: acq,
    city: metro,
    geography: metro,
    top_category: cat.name,
    top_brand: brand,
    return_rate_pct: Math.round(retRate * 1000) / 1000,
    probability_alive: Math.round((1 - churn * 0.85) * 1000) / 1000,
    purchase_frequency: total_transactions,
    recency_days: days_since_last,
    days_since_signup: ri(1, 1460),
  };
}
console.log(`[gen] customers built in ${((Date.now() - tStart) / 1000).toFixed(1)}s`);

// ====================================================================
// Helper: sum / mean / pct
// ====================================================================
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const mean = (a: number[]) => a.length ? sum(a) / a.length : 0;

const totalRevenue = sum(customers.map(c => c.total_spend));
const avgClv = Math.round(mean(customers.map(c => c.clv_12m)));
const activeCount = customers.filter(c => c.days_since_last_purchase <= 30).length;
const activeRate = Math.round((activeCount / TOTAL_CUSTOMERS) * 1000) / 10;
const atRiskCount = customers.filter(c => c.churn_risk_tier === 'Critical' || c.churn_risk_tier === 'High').length;
const churnRate = Math.round((atRiskCount / TOTAL_CUSTOMERS) * 1000) / 10;
const newCount = customers.filter(c => c.days_since_signup <= 30).length;
const avgBasket = Math.round(mean(customers.map(c => c.avg_basket)));

// ====================================================================
// FILE GENERATORS — §2.1–2.21 + 3 new apparel files
// ====================================================================
const OUT_DIR = path.join(process.cwd(), 'cache', 'apparel');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function write(name: string, payload: any): number {
  const p = path.join(OUT_DIR, name);
  // Customer table & RFM sample are large arrays — write compact to keep size in budget.
  const compact = name === 'cx360_customer_table.json' || name === 'cx360_rfm_sample.json' || name === 'cx360_return_reason_waterfall.json';
  const json = compact ? JSON.stringify(payload) : JSON.stringify(payload, null, 2);
  fs.writeFileSync(p, json);
  return Buffer.byteLength(json);
}

function trend(prior: number, current: number, n = 6): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(Math.round((prior + (current - prior) * t) * (1 + gaussian(0, 0.01)) * 100) / 100);
  }
  return out;
}

// 2.1 KPIs
function genKpis() {
  const priorTotal = Math.round(TOTAL_CUSTOMERS * (1 - rb(0.02, 0.08)));
  const priorClv = Math.round(avgClv * (1 - rb(0.02, 0.08)));
  const priorChurn = Math.round(churnRate * (1 - rb(0.02, 0.06)) * 10) / 10;
  const priorActive = Math.round(activeRate * (1 + rb(0.02, 0.06)) * 10) / 10;
  return {
    total_customers: TOTAL_CUSTOMERS,
    active_customers: activeCount,
    active_rate_pct: activeRate,
    avg_clv: avgClv,
    total_revenue: totalRevenue,
    avg_basket_value: avgBasket,
    churn_rate_pct: churnRate,
    new_customers_30d: newCount,
    at_risk_count: atRiskCount,
    at_risk_rate_pct: churnRate,
    total_customers_prior: priorTotal,
    total_customers_trend: trend(priorTotal, TOTAL_CUSTOMERS).map(v => Math.round(v)),
    avg_clv_prior: priorClv,
    avg_clv_trend: trend(priorClv, avgClv).map(v => Math.round(v)),
    churn_rate_pct_prior: priorChurn,
    churn_rate_pct_trend: trend(priorChurn, churnRate),
    active_rate_pct_prior: priorActive,
    active_rate_pct_trend: trend(priorActive, activeRate),
  };
}

// 2.3 CLV distribution
function genClvDistribution() {
  return CLV_TIERS.map(tier => {
    const rows = customers.filter(c => c.clv_tier === tier);
    return {
      clv_tier: tier,
      customer_count: rows.length,
      pct: Math.round((rows.length / TOTAL_CUSTOMERS) * 1000) / 10,
      avg_clv: Math.round(mean(rows.map(c => c.clv_12m))),
      total_clv: Math.round(sum(rows.map(c => c.clv_12m))),
      avg_frequency: Math.round(mean(rows.map(c => c.total_transactions)) * 10) / 10,
      avg_recency: Math.round(mean(rows.map(c => c.days_since_last_purchase))),
      avg_basket: Math.round(mean(rows.map(c => c.avg_basket))),
    };
  });
}

// 2.4 CLV detail
function genClvDetail() {
  const sorted = [...customers].sort((a, b) => b.clv_12m - a.clv_12m);
  const totalClv = sum(sorted.map(c => c.clv_12m));
  const pareto = [];
  for (let p = 10; p <= 100; p += 10) {
    const cutoff = Math.floor(TOTAL_CUSTOMERS * p / 100);
    const slice = sorted.slice(0, cutoff);
    pareto.push({
      top_pct: p,
      customers: cutoff,
      clv_share: Math.round((sum(slice.map(c => c.clv_12m)) / totalClv) * 1000) / 10,
    });
  }
  const tierEconomics = CLV_TIERS.map(tier => {
    const rows = customers.filter(c => c.clv_tier === tier);
    const pct = Math.round((rows.length / TOTAL_CUSTOMERS) * 1000) / 10;
    const aClv = Math.round(mean(rows.map(c => c.clv_12m)));
    const tot = Math.round(sum(rows.map(c => c.clv_12m)));
    const cac = tier === 'Platinum' ? 180 : tier === 'Gold' ? 95 : tier === 'Silver' ? 48 : tier === 'Bronze' ? 28 : 18;
    return {
      tier, customer_count: rows.length, pct, avg_clv: aClv, total_clv: tot,
      margin_pct: tier === 'Platinum' ? 48 : tier === 'Gold' ? 42 : tier === 'Silver' ? 34 : tier === 'Bronze' ? 26 : 18,
      cac, ltv_cac: Math.round(aClv / cac), payback_months: Math.round((cac / Math.max(1, aClv / 12)) * 10) / 10,
      avg_basket: Math.round(mean(rows.map(c => c.avg_basket))),
      avg_frequency: Math.round(mean(rows.map(c => c.total_transactions)) * 10) / 10,
      avg_recency: Math.round(mean(rows.map(c => c.days_since_last_purchase))),
    };
  });
  const behavioral = CLV_TIERS.map(tier => {
    const rows = customers.filter(c => c.clv_tier === tier);
    const top = rows.length ? rows[0].top_category : 'Crew Tee';
    return {
      tier, top_category: top, top_channel: tier === 'Platinum' || tier === 'Gold' ? 'In-Store' : 'Web',
      avg_sessions_pw: Math.round(rb(1.2, 5.2) * 10) / 10,
      browse_to_buy: Math.round(rb(0.12, 0.42) * 100) / 100,
      discount_sensitivity: tier === 'Platinum' || tier === 'Gold' ? 'low' : tier === 'At-Risk' ? 'high' : 'medium',
      omni_rate: Math.round(rb(0.18, 0.72) * 100) / 100,
      mobile_share: Math.round(rb(0.28, 0.72) * 100) / 100,
      nps: Math.round(rb(28, 78)),
    };
  });
  return {
    summary: {
      total_customers: TOTAL_CUSTOMERS,
      total_clv: totalClv,
      avg_clv: avgClv,
      median_clv: Math.round(sorted[Math.floor(TOTAL_CUSTOMERS / 2)].clv_12m),
      top_tier_share: 0.412,
      platinum_pct: Math.round((customers.filter(c => c.clv_tier === 'Platinum').length / TOTAL_CUSTOMERS) * 1000) / 10,
      avg_payback_months: 6.2,
      clv_growth_mom: 2.4,
    },
    tier_economics: tierEconomics,
    behavioral_profile: behavioral,
    pareto: pareto.slice(0, 6).map((p, i) => ({ top_pct: [5, 10, 20, 30, 40, 50][i], customers: Math.round(TOTAL_CUSTOMERS * [0.05, 0.1, 0.2, 0.3, 0.4, 0.5][i]), clv_share: p.clv_share })),
    migration_flows: [
      { from: 'Bronze', to: 'Silver', count: 1850, direction: 'up' },
      { from: 'Silver', to: 'Gold', count: 920, direction: 'up' },
      { from: 'Gold', to: 'Platinum', count: 240, direction: 'up' },
      { from: 'Silver', to: 'Bronze', count: 1420, direction: 'down' },
      { from: 'Bronze', to: 'At-Risk', count: 2180, direction: 'down' },
    ],
    upgrade_opportunities: [
      { tier: 'Gold → Platinum', customers: 1840, gap_avg_clv: 980, revenue_potential: 1803200, action: 'Concierge stylist + early-access invites' },
      { tier: 'Silver → Gold', customers: 4200, gap_avg_clv: 480, revenue_potential: 2016000, action: 'Loyalty tier upgrade nudge + free shipping' },
      { tier: 'Bronze → Silver', customers: 6800, gap_avg_clv: 280, revenue_potential: 1904000, action: 'Wardrobe quiz + curated lookbook' },
    ],
    at_risk_high_clv: [
      { tier: 'Platinum', at_risk_count: 180, avg_clv: 2680, revenue_at_risk: 482400, avg_days_inactive: 62, action: 'Personal outreach from store stylist' },
      { tier: 'Gold', at_risk_count: 920, avg_clv: 1180, revenue_at_risk: 1085600, avg_days_inactive: 88, action: 'Reactivation: 25% off + free returns' },
    ],
    trends: ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'].map(m => ({
      month: m,
      platinum_avg: Math.round(2600 + gaussian(0, 80)),
      gold_avg: Math.round(1150 + gaussian(0, 40)),
      silver_avg: Math.round(470 + gaussian(0, 18)),
      bronze_avg: Math.round(180 + gaussian(0, 8)),
      total_avg: Math.round(avgClv + gaussian(0, 12)),
    })),
    insights: [
      `Platinum tier (${Math.round(customers.filter(c => c.clv_tier === 'Platinum').length / TOTAL_CUSTOMERS * 1000) / 10}% of customers) contributes 41% of total CLV — $${Math.round(sum(customers.filter(c => c.clv_tier === 'Platinum').map(c => c.clv_12m)) / 1e6 * 10) / 10}M of $${Math.round(totalClv / 1e6)}M`,
      'Gold→Platinum is the highest-leverage upgrade — ~1,840 customers within $980 of the next tier',
      'Activewear and accessories over-index in Platinum baskets (Lululemon, Coach drive 38% of tier spend)',
    ],
  };
}

// 2.5 Churn risk
function genChurnRisk() {
  return (['Critical', 'High', 'Medium', 'Low'] as const).map(tier => {
    const rows = customers.filter(c => c.churn_risk_tier === tier);
    const probs = rows.map(c => c.churn_prob_90d);
    const avg90 = mean(probs);
    return {
      churn_risk_tier: tier,
      customer_count: rows.length,
      avg_prob_30d: Math.round(avg90 * 0.7 * 1000) / 1000,
      avg_prob_60d: Math.round(avg90 * 0.85 * 1000) / 1000,
      avg_prob_90d: Math.round(avg90 * 1000) / 1000,
      total_clv_at_risk: Math.round(sum(rows.map(c => c.clv_12m * c.churn_prob_90d))),
    };
  });
}

// 2.6 Churn drivers
function genChurnDrivers() {
  return [
    { driver: 'Days Since Last Purchase', high_churn_avg: 162, low_churn_avg: 28, impact_score: 0.84 },
    { driver: 'Return Rate %', high_churn_avg: 38, low_churn_avg: 11, impact_score: 0.71 },
    { driver: 'Mobile App Active (30d)', high_churn_avg: 0.18, low_churn_avg: 0.74, impact_score: 0.62 },
    { driver: 'Category Breadth', high_churn_avg: 1.4, low_churn_avg: 4.2, impact_score: 0.58 },
    { driver: 'Markdown Share %', high_churn_avg: 78, low_churn_avg: 32, impact_score: 0.54 },
    { driver: 'Avg Discount Taken %', high_churn_avg: 41, low_churn_avg: 18, impact_score: 0.49 },
    { driver: 'Loyalty Points Balance', high_churn_avg: 80, low_churn_avg: 640, impact_score: 0.45 },
    { driver: 'AOV Trend 6m', high_churn_avg: -0.18, low_churn_avg: 0.08, impact_score: 0.41 },
    { driver: 'Email Engagement', high_churn_avg: 0.4, low_churn_avg: 3.6, impact_score: 0.38 },
    { driver: 'Last Promo Response (days)', high_churn_avg: 240, low_churn_avg: 22, impact_score: 0.34 },
  ];
}

// 2.7 Churn detail — preserve grocery structure
function genChurnDetail() {
  const tierDetail = (['Critical', 'High', 'Medium', 'Low'] as const).map(tier => {
    const rows = customers.filter(c => c.churn_risk_tier === tier);
    const avg90 = mean(rows.map(c => c.churn_prob_90d));
    const revAtRisk = Math.round(sum(rows.map(c => c.clv_12m * c.churn_prob_90d)));
    const action = tier === 'Critical' ? 'Personal outreach + 25% off + free returns'
      : tier === 'High' ? 'Reactivation email + free shipping'
      : tier === 'Medium' ? 'Re-engagement: style quiz + curated drop'
      : 'Loyalty nurture campaign';
    const saveRate = tier === 'Critical' ? 0.22 : tier === 'High' ? 0.34 : tier === 'Medium' ? 0.48 : 0.72;
    const cost = tier === 'Critical' ? 12 : tier === 'High' ? 8 : tier === 'Medium' ? 4 : 1;
    return {
      tier, customer_count: rows.length, pct_of_total: Math.round(rows.length / TOTAL_CUSTOMERS * 1000) / 10,
      avg_prob_30d: Math.round(avg90 * 0.7 * 1000) / 1000,
      avg_prob_60d: Math.round(avg90 * 0.85 * 1000) / 1000,
      avg_prob_90d: Math.round(avg90 * 1000) / 1000,
      revenue_at_risk: revAtRisk,
      margin_at_risk: Math.round(revAtRisk * 0.32),
      avg_clv: Math.round(mean(rows.map(c => c.clv_12m))),
      avg_days_since_purchase: Math.round(mean(rows.map(c => c.days_since_last_purchase))),
      top_drivers: [
        { driver: 'Days since last purchase', pct_affected: 82, direction: 'increasing' },
        { driver: 'Return rate rising', pct_affected: 64, direction: 'increasing' },
        { driver: 'App engagement dropping', pct_affected: 58, direction: 'decreasing' },
        { driver: 'Markdown-only purchase', pct_affected: 42, direction: 'increasing' },
        { driver: 'Category breadth shrinking', pct_affected: 38, direction: 'decreasing' },
      ],
      recommended_action: action,
      historical_save_rate: saveRate,
      cost_per_intervention: cost,
      expected_roi: Math.round(saveRate * mean(rows.map(c => c.clv_12m)) / cost * 10) / 10,
    };
  });
  const totalRevAtRisk = Math.round(sum(customers.filter(c => c.churn_risk_tier === 'Critical' || c.churn_risk_tier === 'High').map(c => c.clv_12m * c.churn_prob_90d)));
  return {
    summary: {
      total_customers: TOTAL_CUSTOMERS,
      overall_churn_rate_90d: churnRate,
      net_churn_last_month: 1240,
      revenue_at_risk_90d: totalRevAtRisk,
      margin_at_risk_90d: Math.round(totalRevAtRisk * 0.32),
      save_rate_last_quarter: 38,
      intervention_roi: 6.4,
      churn_trend_mom: 1.8,
      model_last_retrained: '2026-05-28',
      model_precision: 0.84,
      model_recall: 0.79,
    },
    tier_detail: tierDetail,
    risk_value_matrix: [
      { risk: 'Critical', value: 'High (Platinum/Gold)', customers: 480, revenue_at_risk: Math.round(totalRevAtRisk * 0.32), avg_clv: 1840, action: 'War room — personal stylist outreach', priority: 1 },
      { risk: 'Critical', value: 'Medium (Silver)', customers: 2200, revenue_at_risk: Math.round(totalRevAtRisk * 0.22), avg_clv: 480, action: 'Reactivation: 25% off + free returns', priority: 2 },
      { risk: 'High', value: 'High (Platinum/Gold)', customers: 720, revenue_at_risk: Math.round(totalRevAtRisk * 0.18), avg_clv: 1620, action: 'Concierge fit consult + new-drop email', priority: 2 },
      { risk: 'High', value: 'Medium (Silver)', customers: 3800, revenue_at_risk: Math.round(totalRevAtRisk * 0.14), avg_clv: 420, action: 'Style quiz + curated lookbook', priority: 3 },
    ],
    tier_migration: {
      period: 'Last Month',
      flows: [
        { from: 'Low', to: 'Low', count: 28400, direction: 'same' },
        { from: 'Low', to: 'Medium', count: 1820, direction: 'down' },
        { from: 'Medium', to: 'High', count: 1240, direction: 'down' },
        { from: 'High', to: 'Critical', count: 680, direction: 'down' },
        { from: 'High', to: 'Medium', count: 920, direction: 'up' },
        { from: 'Medium', to: 'Low', count: 1480, direction: 'up' },
      ],
      net_movement: { improved: 2400, worsened: 3740, churned: 1240, net: -1340, direction: 'worsening' },
    },
    churn_trend: ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'].map((m, i) => ({
      month: m,
      critical_pct: Math.round((9 + i * 0.4) * 10) / 10,
      high_pct: Math.round((14 + i * 0.4) * 10) / 10,
      medium_pct: Math.round((28 + Math.sin(i) * 1.2) * 10) / 10,
      low_pct: Math.round((49 - i * 0.6) * 10) / 10,
      revenue_at_risk: Math.round(totalRevAtRisk * (0.92 + i * 0.018)),
    })),
    by_channel: ACQ_CHANNELS.map(ch => ({
      channel: ch,
      critical_pct: Math.round(rb(8, 18) * 10) / 10,
      high_pct: Math.round(rb(12, 24) * 10) / 10,
      medium_pct: Math.round(rb(24, 34) * 10) / 10,
      low_pct: Math.round(rb(32, 52) * 10) / 10,
      total_at_risk: ri(800, 4800),
    })),
    recently_churned: customers.filter(c => c.churn_risk_tier === 'Critical').slice(0, 8).map(c => ({
      customer_id: c.customer_id,
      segment: c.customer_segment,
      clv: c.clv_12m,
      last_purchase: new Date(Date.now() - c.days_since_last_purchase * 86400000).toISOString().slice(0, 10),
      days_since: c.days_since_last_purchase,
      lifetime_spend: c.total_spend,
      top_category: c.top_category,
      cause: pick(['Competitor switch', 'Fit complaint cluster', 'App churn', 'Markdown-only buyer', 'Style mismatch']),
    })),
    intervention_results: {
      last_quarter: {
        total_interventions: 4200,
        total_cost: 28400,
        customers_saved: 1596,
        save_rate: 0.38,
        revenue_retained: 1980000,
        roi: 69.7,
      },
      by_tier: tierDetail.map(t => ({
        tier: t.tier, interventions: Math.round(t.customer_count * 0.05),
        saved: Math.round(t.customer_count * 0.05 * t.historical_save_rate),
        save_rate: t.historical_save_rate, cost: Math.round(t.customer_count * 0.05 * t.cost_per_intervention),
        revenue_saved: Math.round(t.customer_count * 0.05 * t.historical_save_rate * t.avg_clv),
        roi: t.expected_roi,
      })),
      by_action: [
        { action: 'Personal stylist call', count: 320, save_rate: 0.42, avg_cost: 18, roi: 92 },
        { action: 'Reactivation discount', count: 1800, save_rate: 0.34, avg_cost: 8, roi: 64 },
        { action: 'Free shipping invite', count: 1200, save_rate: 0.28, avg_cost: 6, roi: 48 },
        { action: 'App install push', count: 880, save_rate: 0.22, avg_cost: 1, roi: 88 },
      ],
    },
    model_performance: {
      precision: 0.84, recall: 0.79, f1: 0.81, auc_roc: 0.89,
      last_retrained: '2026-05-28',
      calibration: 'Well-calibrated within ±3pp for all tiers',
      predicted_vs_actual: (['Critical', 'High', 'Medium', 'Low'] as const).map(tier => ({
        tier, predicted_churn_pct: tier === 'Critical' ? 85 : tier === 'High' ? 58 : tier === 'Medium' ? 32 : 12,
        actual_churn_pct: tier === 'Critical' ? 82 : tier === 'High' ? 56 : tier === 'Medium' ? 30 : 11,
      })),
    },
    insights: [
      `$${(totalRevAtRisk / 1e6).toFixed(1)}M revenue at risk in next 90 days. ${480 + 720} Platinum/Gold customers in Critical+High need personal outreach NOW.`,
      'Return Rate % is the #2 churn driver — fit-complaint clusters explain 38% of Returner-segment churn.',
      'App-inactive customers churn at 3.4× the rate of app-active — App install push is highest-ROI intervention.',
    ],
  };
}

// 2.8 Cohort retention (long form)
function genCohortRetention() {
  const out: any[] = [];
  const months = ['January 2025', 'February 2025', 'March 2025', 'April 2025', 'May 2025', 'June 2025', 'July 2025', 'August 2025', 'September 2025', 'October 2025', 'November 2025', 'December 2025'];
  // Anchor at 12 cohorts × 12 periods = 144 (close to grocery 78; matches 12-cohort shape)
  const curve = [1.0, 0.42, 0.32, 0.26, 0.22, 0.19, 0.17, 0.15, 0.13, 0.12, 0.10, 0.08];
  for (const m of months) {
    const orig = ri(3800, 5400);
    for (let p = 0; p < 12; p++) {
      const rate = clamp(curve[p] + gaussian(0, 0.01), 0.02, 1);
      out.push({
        cohort_month: m,
        original_customers: orig,
        period_number: p,
        retention_rate: Math.round(rate * 100) / 100,
        retained_customers: Math.round(orig * rate),
      });
    }
  }
  return out;
}

// 2.9 Cohort detail
function genCohortDetail() {
  const months = ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025'];
  const heatmap = months.map((m, i) => {
    const size = ri(3800, 5400);
    const row: any = { cohort: m, size };
    for (let p = 0; p <= 11; p++) {
      const base = p === 0 ? 100 : Math.max(8, Math.round((42 - p * 2.6) + gaussian(0, 2)));
      row[`m${p}`] = base;
    }
    return row;
  });
  const revRetention = months.slice(0, 6).map(m => {
    const sizeRev = ri(2_000_000, 3_500_000);
    const row: any = { cohort: m, size_revenue: sizeRev };
    for (let p = 0; p <= 11; p++) row[`m${p}`] = p === 0 ? 100 : Math.max(20, Math.round(60 - p * 2.4 + gaussian(0, 2)));
    return row;
  });
  return {
    summary: {
      weighted_avg_m1: 42.4, weighted_avg_m6: 17.2, weighted_avg_m12: 8.4,
      best_cohort: { month: 'Aug 2025', m6_retention: 22.4 },
      worst_cohort: { month: 'Mar 2025', m6_retention: 12.1 },
      m1_trend_mom: 1.2, pct_cohorts_hitting_target: 42, target_m6: 20, avg_payback_months: 5.4,
    },
    retention_heatmap: heatmap,
    revenue_retention: revRetention,
    cohort_quality: months.map(m => ({
      cohort: m, size: ri(3800, 5400), paid_pct: ri(22, 48), organic_pct: ri(22, 38), referral_pct: ri(10, 22),
      avg_cac: ri(28, 92), first_aov: ri(58, 142),
      campaign: pick(['Spring Drop', 'BTS Push', 'Black Friday', 'Holiday Hub', 'Memorial Day']),
      shape: pick(['slow_bleed', 'smile', 'cliff', 'plateau']),
    })),
    by_channel: {
      Paid: months.slice(0, 6).map(m => ({ cohort: m, m1: ri(32, 48), m3: ri(18, 28), m6: ri(10, 18) })),
      Organic: months.slice(0, 6).map(m => ({ cohort: m, m1: ri(46, 62), m3: ri(28, 38), m6: ri(18, 26) })),
      Referral: months.slice(0, 6).map(m => ({ cohort: m, m1: ri(58, 72), m3: ri(38, 48), m6: ri(28, 36) })),
    },
    cumulative_revenue: months.slice(0, 6).map(m => {
      const m0 = ri(2_000_000, 3_500_000);
      return { cohort: m, m0, m3: Math.round(m0 * 1.6), m6: Math.round(m0 * 2.2), m9: Math.round(m0 * 2.6), m11: Math.round(m0 * 2.9), cac_payback_month: ri(2, 6), cohort_cac_total: Math.round(m0 * 0.18) };
    }),
    curve_shapes: {
      'Jan 2025': { shape: 'slow_bleed', description: 'Linear decline — no retention hook after first season', action: 'Introduce wardrobe-builder bundle nudges' },
      'Feb 2025': { shape: 'smile', description: 'Drops then recovers at M6 — BTS re-engagement trigger', action: 'Replicate the M5→M6 BTS push to all cohorts' },
      'Apr 2025': { shape: 'cliff', description: 'Sharp drop at M1 — markdown-acquired one-off buyers', action: 'Reduce first-order discount eligibility' },
      'Jun 2025': { shape: 'plateau', description: 'Flattens at ~28% by M3 — strong PMF from referral-heavy cohort', action: 'Scale referral programme' },
      'Sep 2025': { shape: 'plateau', description: 'Organic cohort plateau — high engagement from first touch', action: 'Double organic budget' },
    },
    leading_indicator: {
      m1_predicts_m12_r2: 0.82,
      predictions: [
        { cohort: 'Oct 2025', m1_actual: 38, m12_predicted: 7.2, m12_target: 8.5, status: 'at_risk' },
        { cohort: 'Nov 2025', m1_actual: 44, m12_predicted: 9.4, m12_target: 8.5, status: 'on_track' },
        { cohort: 'Dec 2025', m1_actual: 41, m12_predicted: 8.6, m12_target: 8.5, status: 'on_track' },
      ],
      historical_scatter: months.slice(0, 8).map(m => ({ cohort: m, m1: ri(34, 52), m12: ri(6, 12), predicted: false })),
      insight: 'M1 retention explains 82% of variance in M12. Oct 2025 cohort at-risk — projected to miss M12 target by 1.3pp.',
    },
    insights: [
      'Apr 2025 cohort is your worst — 48% paid acquisition with markdown discounting acquired one-off buyers.',
      'Referral cohorts retain at 2.4× the rate of paid — scale the referral programme aggressively.',
      'M1 retention is the canary — invest in onboarding (welcome email series, app install, wardrobe quiz).',
      'BTS cohorts (Aug) consistently outperform — kids segment drives sticky family-loyalty patterns.',
      'Holiday cohorts (Nov-Dec) front-load full-price purchases — set expectations early to avoid markdown dependency.',
      'Plateau-shape cohorts (Sep, organic) have 3.2× LTV vs cliff-shape cohorts (Apr, paid markdown).',
    ],
  };
}

// 2.10 Segment migration
function genSegmentMigration() {
  const flows: any[] = [];
  for (const from of SEGMENTS) {
    const fromCount = customers.filter(c => c.customer_segment === from).length;
    // diagonal weight
    flows.push({ from, to: from, count: Math.round(fromCount * rb(0.55, 0.78)) });
    for (const to of SEGMENTS) {
      if (to === from) continue;
      const baseShare = rb(0.01, 0.08);
      const cnt = Math.round(fromCount * baseShare);
      if (cnt > 80) flows.push({ from, to, count: cnt });
    }
  }
  return {
    period: 'Q1 2026 → Q2 2026',
    flows: flows.slice(0, 27), // mirror grocery cardinality
  };
}

// 2.11 Basket distribution
function genBasketDistribution() {
  const ranges: Array<[string, number, number]> = [
    ['$0-30', 0, 30],
    ['$30-60', 30, 60],
    ['$60-120', 60, 120],
    ['$120-250', 120, 250],
    ['$250+', 250, 99999],
  ];
  const distribution = ranges.map(([range, mn, mx]) => {
    const rows = customers.filter(c => c.avg_basket >= mn && c.avg_basket < mx);
    const ct = rows.length;
    const rev = sum(rows.map(c => c.total_spend));
    return {
      range, min: mn, max: mx === 99999 ? 9999 : mx,
      customer_count: ct,
      pct_customers: Math.round(ct / TOTAL_CUSTOMERS * 1000) / 10,
      transactions: Math.round(sum(rows.map(c => c.total_transactions))),
      pct_transactions: Math.round(sum(rows.map(c => c.total_transactions)) / sum(customers.map(c => c.total_transactions)) * 1000) / 10,
      revenue: rev,
      pct_revenue: Math.round(rev / totalRevenue * 1000) / 10,
      avg_value: Math.round(mean(rows.map(c => c.avg_basket)) || mn),
      median_value: Math.round(mean(rows.map(c => c.avg_basket)) || mn),
    };
  });
  const bySeg = ranges.map(([range, mn, mx]) => {
    const row: any = { range };
    for (const s of SEGMENTS) row[s] = customers.filter(c => c.customer_segment === s && c.avg_basket >= mn && c.avg_basket < mx).length;
    return row;
  });
  const byCh = ranges.map(([range, mn, mx]) => {
    const row: any = { range };
    for (const ch of CHANNELS) row[ch] = customers.filter(c => c.preferred_channel === ch && c.avg_basket >= mn && c.avg_basket < mx).length;
    return row;
  });
  return {
    summary: {
      total_customers: TOTAL_CUSTOMERS,
      total_transactions: sum(customers.map(c => c.total_transactions)),
      total_revenue: totalRevenue,
      mean_basket: avgBasket,
      median_basket: Math.round(avgBasket * 0.88),
      top_10pct_threshold: 180,
      top_20pct_revenue_share: 58.6,
      basket_trend_mom: 2.4,
    },
    distribution,
    by_segment: bySeg,
    by_channel: byCh,
    basket_frequency_matrix: [
      { basket_range: '<$30', frequency_range: '1-2x/year', customers: 12400, label: 'Infrequent small', quadrant: 'let_go' },
      { basket_range: '$30-120', frequency_range: '3-5x/year', customers: 28600, label: 'Frequent medium', quadrant: 'grow' },
      { basket_range: '$120-250', frequency_range: '3-5x/year', customers: 14200, label: 'Frequent large', quadrant: 'protect' },
      { basket_range: '$250+', frequency_range: '6x+/year', customers: 4800, label: 'Power shoppers', quadrant: 'vip' },
    ],
    trend: ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'].map((m, i) => ({
      month: m,
      mean: Math.round(avgBasket * (0.94 + i * 0.012)),
      median: Math.round(avgBasket * 0.88),
      p75: Math.round(avgBasket * 1.6),
      p90: Math.round(avgBasket * 2.4),
    })),
    category_by_basket: {
      '<$30': { Tops: 48, Accessories: 22, Bottoms: 18, Footwear: 8, Other: 4 },
      '$30-120': { Tops: 32, Bottoms: 28, Accessories: 18, Footwear: 14, Outerwear: 8 },
      '$120-250': { Bottoms: 28, Outerwear: 22, Footwear: 22, Tops: 16, Accessories: 12 },
      '$250+': { Outerwear: 35, Footwear: 24, Accessories: 22, Bottoms: 12, Tops: 7 },
    },
    discount_dependency: ranges.map(([range]) => ({
      range,
      promo_pct: range === '$0-30' ? 72 : range === '$30-60' ? 58 : range === '$60-120' ? 44 : range === '$120-250' ? 32 : 18,
      full_price_pct: range === '$0-30' ? 28 : range === '$30-60' ? 42 : range === '$60-120' ? 56 : range === '$120-250' ? 68 : 82,
    })),
    insights: [
      'Power shoppers ($250+, 6x+ year) are 6% of customers but 28% of revenue — apparel\'s long tail of accessories and outerwear.',
      '58% of revenue comes from $60-250 basket — the sweet spot for wardrobe-builder bundle promotions.',
      'Markdown dependency is highest in <$30 buckets — Value Shopper segment concentrates here.',
    ],
  };
}

// 2.12 Recency / frequency
function genRecencyFrequency() {
  const recBuckets: Array<[string, number, number]> = [['0-7', 0, 7], ['8-14', 8, 14], ['15-30', 15, 30], ['31-60', 31, 60], ['61-90', 61, 90], ['91-180', 91, 180], ['180+', 181, 99999]];
  const freqBuckets: Array<[string, number, number]> = [['1', 1, 1], ['2-3', 2, 3], ['4-5', 4, 5], ['6-8', 6, 8], ['9-12', 9, 12], ['13+', 13, 9999]];
  return {
    recency_distribution: recBuckets.map(([band, mn, mx]) => ({
      recency_band: band,
      customer_count: customers.filter(c => c.days_since_last_purchase >= mn && c.days_since_last_purchase <= mx).length,
    })),
    frequency_distribution: freqBuckets.map(([band, mn, mx]) => ({
      frequency_band: band,
      customer_count: customers.filter(c => c.total_transactions >= mn && c.total_transactions <= mx).length,
    })),
  };
}

// 2.13 Frequency detail
function genFrequencyDetail() {
  const buckets: Array<[string, number, number]> = [['1x', 1, 1], ['2-3x', 2, 3], ['4-5x', 4, 5], ['6-8x', 6, 8], ['9-12x', 9, 12], ['13-20x', 13, 20], ['20+x', 21, 9999]];
  const dist = buckets.map(([range, mn, mx]) => {
    const rows = customers.filter(c => c.total_transactions >= mn && c.total_transactions <= mx);
    return {
      range, customer_count: rows.length,
      pct: Math.round(rows.length / TOTAL_CUSTOMERS * 1000) / 10,
      revenue: Math.round(sum(rows.map(c => c.total_spend))),
      pct_revenue: Math.round(sum(rows.map(c => c.total_spend)) / totalRevenue * 1000) / 10,
      avg_basket: Math.round(mean(rows.map(c => c.avg_basket)) || 0),
      avg_clv: Math.round(mean(rows.map(c => c.clv_12m)) || 0),
    };
  });
  const bySeg = buckets.map(([range, mn, mx]) => {
    const row: any = { range };
    for (const s of SEGMENTS) row[s] = customers.filter(c => c.customer_segment === s && c.total_transactions >= mn && c.total_transactions <= mx).length;
    return row;
  });
  const withRecency = buckets.map(([range, mn, mx]) => {
    const rows = customers.filter(c => c.total_transactions >= mn && c.total_transactions <= mx);
    return {
      range,
      active_30d: rows.filter(c => c.days_since_last_purchase <= 30).length,
      slipping_30_90: rows.filter(c => c.days_since_last_purchase > 30 && c.days_since_last_purchase <= 90).length,
      at_risk_90_180: rows.filter(c => c.days_since_last_purchase > 90 && c.days_since_last_purchase <= 180).length,
      lost_180plus: rows.filter(c => c.days_since_last_purchase > 180).length,
    };
  });
  const flows: any[] = [];
  const bucketNames = buckets.map(b => b[0]);
  for (let i = 0; i < bucketNames.length; i++) {
    flows.push({ from: bucketNames[i], to: bucketNames[i], count: ri(800, 8000), direction: 'same' });
    if (i + 1 < bucketNames.length) flows.push({ from: bucketNames[i], to: bucketNames[i + 1], count: ri(180, 1200), direction: 'up' });
    if (i - 1 >= 0) flows.push({ from: bucketNames[i], to: bucketNames[i - 1], count: ri(120, 900), direction: 'down' });
  }
  return {
    summary: {
      total_customers: TOTAL_CUSTOMERS,
      avg_frequency: Math.round(mean(customers.map(c => c.total_transactions)) * 10) / 10,
      median_frequency: 2,
      repeat_rate_90d: 42.8,
      pct_active_30d: activeRate,
      pct_active_60d: Math.round(customers.filter(c => c.days_since_last_purchase <= 60).length / TOTAL_CUSTOMERS * 1000) / 10,
      pct_active_90d: Math.round(customers.filter(c => c.days_since_last_purchase <= 90).length / TOTAL_CUSTOMERS * 1000) / 10,
      median_interpurchase_days: 62,
      omni_frequent_pct: 8.4,
      frequency_trend_mom: 1.4,
    },
    distribution: dist,
    by_segment: bySeg,
    with_recency: withRecency,
    frequency_migration: { period: 'Q1 2026 → Q2 2026', flows: flows.slice(0, 26) },
    interpurchase_interval: buckets.map(([range]) => ({
      range: range === '1x' ? '180+ days' : range === '2-3x' ? '90-180 days' : range === '4-5x' ? '60-90 days' : range === '6-8x' ? '30-60 days' : range === '9-12x' ? '20-30 days' : range === '13-20x' ? '10-20 days' : '<10 days',
      customers: ri(2000, 18000),
      pct: Math.round(rb(2, 22) * 10) / 10,
      segment_dominant: pick(SEGMENTS as any),
    })),
    frequency_trend: ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'].map((m, i) => ({
      month: m, avg_freq: Math.round((2.3 + i * 0.04) * 10) / 10, median_freq: 2, repeat_rate: Math.round((40 + i * 0.6) * 10) / 10, active_pct: Math.round((38 + i * 0.4) * 10) / 10,
    })),
    early_warning: customers.filter(c => c.churn_risk_tier === 'High' && c.clv_12m > 800).slice(0, 7).map(c => ({
      customer_id: c.customer_id, normal_interval: 30, current_gap: c.days_since_last_purchase, days_overdue: Math.max(0, c.days_since_last_purchase - 30), clv: c.clv_12m, risk: 'high',
    })),
    insights: [
      'Frequency-1 customers are 55% of base but generate 22% of revenue — biggest unlock is converting them to 2-3x/year.',
      'Active-30d rate at 41.4% is healthy for apparel (industry 35-45%).',
      'Athletic Enthusiast over-indexes on 6-12x frequency (gym/yoga refresh cycle).',
      'Markdown-only buyers concentrate in 2-3x bucket — high churn risk on next full-price drop.',
      'BTS seasonal shoppers (kids) spike frequency Jul-Aug then dormant until Nov-Dec.',
    ],
  };
}

// 2.14 RFM sample
function genRfmSample() {
  const sampleSize = 800;
  const idxs: number[] = [];
  for (let i = 0; i < sampleSize; i++) idxs.push(Math.floor(r() * TOTAL_CUSTOMERS));
  return idxs.map(i => {
    const c = customers[i];
    const r_score = c.recency_days <= 45 ? 3 : c.recency_days <= 120 ? 2 : 1;
    const f_score = c.total_transactions >= 4 ? 3 : c.total_transactions >= 2 ? 2 : 1;
    const m_score = c.clv_12m > 600 ? 3 : c.clv_12m >= 150 ? 2 : 1;
    return {
      customer_id: c.customer_id,
      recency_days: c.recency_days,
      frequency: c.total_transactions,
      monetary: Math.round(c.clv_12m * 100) / 100,
      clv_tier: c.clv_tier,
      customer_segment: c.customer_segment,
      r_score, f_score, m_score,
      purchase_frequency: c.purchase_frequency,
      probability_alive: c.probability_alive,
      clv_12m: c.clv_12m,
    };
  });
}

// 2.15 RFM detail
function genRfmDetail() {
  const nineBox: any[] = [];
  const labels: Record<string, string> = {
    '3-3': 'Champions', '3-2': 'Loyal Customers', '3-1': 'Potential Loyalists',
    '2-3': 'At Risk', '2-2': 'Needs Attention', '2-1': 'About to Sleep',
    '1-3': "Can't Lose Them", '1-2': 'Hibernating', '1-1': 'Lost',
  };
  const colors: Record<string, string> = {
    Champions: '#10B981', 'Loyal Customers': '#34D399', 'Potential Loyalists': '#60A5FA',
    'At Risk': '#F59E0B', 'Needs Attention': '#FCD34D', 'About to Sleep': '#FB923C',
    "Can't Lose Them": '#DC2626', Hibernating: '#94A3B8', Lost: '#6B7280',
  };
  for (let r_score = 3; r_score >= 1; r_score--) {
    for (let f_score = 1; f_score <= 3; f_score++) {
      const key = `${r_score}-${f_score}`;
      const label = labels[key];
      const rows = customers.filter(c => {
        const rs = c.recency_days <= 45 ? 3 : c.recency_days <= 120 ? 2 : 1;
        const fs = c.total_transactions >= 4 ? 3 : c.total_transactions >= 2 ? 2 : 1;
        return rs === r_score && fs === f_score;
      });
      nineBox.push({
        r_band: r_score === 3 ? 'Recent (1-3)' : r_score === 2 ? 'Mid (2)' : 'Lapsed (1)',
        f_band: f_score === 3 ? 'Frequent (3)' : f_score === 2 ? 'Medium (2)' : 'Low (1)',
        label, r_score, f_score,
        customer_count: rows.length,
        avg_clv: Math.round(mean(rows.map(c => c.clv_12m)) || 0),
        revenue: Math.round(sum(rows.map(c => c.clv_12m))),
        avg_recency: Math.round(mean(rows.map(c => c.recency_days)) || 0),
        avg_frequency: Math.round(mean(rows.map(c => c.total_transactions)) * 10) / 10 || 0,
        action: label === 'Champions' ? 'Early-access to new drop — saved sizes' : label === 'Loyal Customers' ? 'Wardrobe-builder bundle' : label === 'At Risk' ? 'Reactivation: 25% off + free returns' : 'Re-engagement playbook',
        color: colors[label],
      });
    }
  }
  const density: any[] = [];
  for (let rs = 1; rs <= 3; rs++) for (let fs = 1; fs <= 3; fs++) for (let ms = 1; ms <= 3; ms++) {
    density.push({ r_score: rs, f_score: fs, m_score: ms, count: ri(200, 4800) });
  }
  return {
    summary: {
      total_customers: TOTAL_CUSTOMERS,
      champions_pct: Math.round(nineBox.find(b => b.label === 'Champions')!.customer_count / TOTAL_CUSTOMERS * 1000) / 10,
      at_risk_pct: Math.round(nineBox.find(b => b.label === 'At Risk')!.customer_count / TOTAL_CUSTOMERS * 1000) / 10,
      avg_rfm_score: 5.8,
      segments_monitored: 9,
      high_value_at_risk_revenue: Math.round(nineBox.find(b => b.label === "Can't Lose Them")!.revenue),
    },
    nine_box: nineBox,
    density_heatmap: density,
    action_playbook: [
      { segment: 'Champions', size: nineBox[0].customer_count, message: 'Early-access to next drop — your sizes saved', channel: 'App push + Email', timing: 'Immediate', expected_lift: 0.22, cost_per_customer: 0.4 },
      { segment: 'Loyal', size: nineBox[1].customer_count, message: 'Wardrobe-builder bundle — 15% off 3+ items', channel: 'Email', timing: '7 days', expected_lift: 0.16, cost_per_customer: 0.3 },
      { segment: 'Potential Loyalists', size: nineBox[2].customer_count, message: 'Loyalty tier upgrade invite + free shipping', channel: 'Email', timing: 'Immediate', expected_lift: 0.18, cost_per_customer: 0.2 },
      { segment: 'New Customers', size: 4200, message: 'Welcome series + first-purchase share', channel: 'Email', timing: '0-14 days', expected_lift: 0.24, cost_per_customer: 0.5 },
      { segment: 'Promising', size: 5200, message: 'Style quiz + curated lookbook', channel: 'App push', timing: '14 days', expected_lift: 0.12, cost_per_customer: 0.3 },
      { segment: 'Needs Attention', size: nineBox[4].customer_count, message: '"We miss your style" — 20% off', channel: 'Email + SMS', timing: 'Immediate', expected_lift: 0.14, cost_per_customer: 0.6 },
      { segment: 'At Risk', size: nineBox[3].customer_count, message: 'Reactivation: 25% off + free returns', channel: 'Email + SMS', timing: 'Immediate', expected_lift: 0.10, cost_per_customer: 0.9 },
      { segment: 'Hibernating / Lost', size: nineBox[7].customer_count + nineBox[8].customer_count, message: 'Win-back: 30% off entire purchase, no min', channel: 'Email', timing: 'Immediate', expected_lift: 0.06, cost_per_customer: 1.2 },
    ],
    migration: {
      period: 'Q1 2026 → Q2 2026',
      flows: [
        { from: 'Potential Loyalists', to: 'Champions', count: 820 },
        { from: 'Needs Attention', to: 'At Risk', count: 1240 },
        { from: 'New Customers', to: 'Promising', count: 1840 },
        { from: 'At Risk', to: 'Hibernating', count: 920 },
        { from: 'Hibernating', to: 'Lost', count: 480 },
        { from: 'Champions', to: 'Loyal Customers', count: 320 },
        { from: 'Loyal Customers', to: 'Champions', count: 240 },
      ],
      net_change: { upgraded: 3220, stable: 58200, downgraded: 14400, lost: 4180 },
    },
    definitions: [
      { metric: 'R Score (Recency)', definition: '1-3 score: 3=purchased within 45 days, 2=46-120 days, 1=121+ days', why: 'Recent buyers are more likely to respond to offers' },
      { metric: 'F Score (Frequency)', definition: '1-3 score: 3=4+ orders/year, 2=2-3, 1=1', why: 'Repeat buyers indicate engagement & loyalty' },
      { metric: 'M Score (Monetary)', definition: '1-3 score: 3=>$600 t-12m, 2=$150-600, 1=<$150', why: 'Spend tier predicts CLV trajectory' },
      { metric: 'Champions', definition: 'R=3, F=3 — recent + frequent buyers', why: 'Your VIPs; protect with early-access & curation' },
      { metric: "Can't Lose Them", definition: 'R=1, F=3 — used to be frequent, now lapsed', why: 'Highest reactivation ROI' },
      { metric: 'Lost', definition: 'R=1, F=1 — rare buyers who churned', why: 'Lowest priority; deprioritize win-back spend' },
    ],
    insights: [
      `Champions (${Math.round(nineBox[0].customer_count / TOTAL_CUSTOMERS * 1000) / 10}%) generate 28% of revenue — protect with VIP experiences`,
      `${nineBox[3].customer_count.toLocaleString()} At Risk customers ($${(nineBox[3].revenue / 1e6).toFixed(1)}M CLV) need reactivation NOW`,
      "Can't Lose Them is the highest-leverage segment — small but high-CLV reactivation win",
      'New Customer → Promising transition is the early-funnel KPI — focus on M1 retention',
      'Hibernating → Lost flow is steady — accept some attrition; don\'t overspend on win-back below $80 CLV',
    ],
  };
}

// 2.16 Revenue concentration
function genRevenueConcentration() {
  const sorted = [...customers].sort((a, b) => b.total_spend - a.total_spend);
  const pareto = [10, 20, 30, 40, 50, 100].map(p => {
    const cutoff = Math.floor(TOTAL_CUSTOMERS * p / 100);
    const slice = sorted.slice(0, cutoff);
    return {
      percentile: `Top ${p}%`,
      customer_count: cutoff,
      revenue_share: Math.round(sum(slice.map(c => c.total_spend)) / totalRevenue * 1000) / 10,
      total_revenue: sum(slice.map(c => c.total_spend)),
    };
  });
  const bySeg = SEGMENTS.map(s => {
    const rows = customers.filter(c => c.customer_segment === s);
    const rev = sum(rows.map(c => c.total_spend));
    return {
      segment: s,
      total_revenue: rev,
      customer_count: rows.length,
      revenue_share: Math.round(rev / totalRevenue * 1000) / 10,
      avg_revenue_per_customer: Math.round(rev / Math.max(1, rows.length)),
    };
  }).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 7);
  return { pareto, by_segment: bySeg };
}

// 2.17 Revenue detail
function genRevenueDetail() {
  const segs = SEGMENTS.map(s => {
    const rows = customers.filter(c => c.customer_segment === s);
    const rev = sum(rows.map(c => c.total_spend));
    const status = s === 'Lapsed' || s === 'Returner' ? 'critical' : s === 'Casual' || s === 'Value Shopper' ? 'warning' : 'healthy';
    const topCat = rows.length ? rows[0].top_category : 'Crew Tee';
    return {
      segment: s, revenue: rev, customers: rows.length,
      revenue_pct: Math.round(rev / totalRevenue * 1000) / 10,
      avg_revenue: Math.round(rev / Math.max(1, rows.length)),
      risk_status: status,
      margin_pct: status === 'healthy' ? 44 : status === 'warning' ? 32 : 22,
      growth_mom: Math.round(gaussian(2, 1.5) * 10) / 10,
      avg_basket: Math.round(mean(rows.map(c => c.avg_basket)) || avgBasket),
      top_category: topCat,
      repeat_rate: Math.round(rb(0.18, 0.78) * 100) / 100,
    };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 7);
  return {
    summary: {
      total_revenue: totalRevenue,
      top_20pct_customers_revenue_share: 58.6,
      gini_coefficient: 0.62,
      fastest_growing_segment: 'Athletic Enthusiast',
      fastest_growing_mom: 4.2,
      revenue_at_risk: Math.round(sum(customers.filter(c => c.churn_risk_tier === 'Critical' || c.churn_risk_tier === 'High').map(c => c.total_spend * c.churn_prob_90d))),
      revenue_at_risk_pct: 12.4,
      avg_revenue_per_customer: Math.round(totalRevenue / TOTAL_CUSTOMERS),
    },
    segments: segs,
    concentration: [5, 10, 20, 30, 40, 50, 100].map(p => {
      const cutoff = Math.floor(TOTAL_CUSTOMERS * p / 100);
      const sorted = [...customers].sort((a, b) => b.total_spend - a.total_spend);
      const slice = sorted.slice(0, cutoff);
      return {
        top_pct: p,
        customer_count: cutoff,
        revenue: Math.round(sum(slice.map(c => c.total_spend))),
        cumulative_revenue_pct: Math.round(sum(slice.map(c => c.total_spend)) / totalRevenue * 1000) / 10,
      };
    }),
    quality: segs.map(s => ({
      segment: s.segment, nps: ri(28, 78), repeat_rate: s.repeat_rate, avg_tenure_months: ri(8, 42),
      discount_dependency: Math.round(rb(0.12, 0.62) * 100) / 100, margin_pct: s.margin_pct,
      cac: ri(22, 142), ltv_cac: Math.round(s.avg_revenue / Math.max(28, ri(28, 142))),
    })),
    health_matrix: segs.map(s => ({
      segment: s.segment,
      revenue_trend: s.growth_mom > 1 ? 'up' : s.growth_mom < -1 ? 'down' : 'flat',
      churn_risk: s.risk_status === 'critical' ? 'high' : s.risk_status === 'warning' ? 'medium' : 'low',
      growth_potential: s.segment === 'Athletic Enthusiast' || s.segment === 'New' ? 'high' : 'medium',
      health_score: ri(48, 92),
      action: s.risk_status === 'critical' ? 'Reactivate or de-prioritize' : 'Deepen loyalty + cross-sell',
    })),
    revenue_migration: {
      period: 'Q1 2026 → Q2 2026',
      waterfall: [
        { label: 'Q1 Revenue', value: Math.round(totalRevenue * 0.92), type: 'base' },
        { label: 'New Customers', value: 980000, type: 'positive' },
        { label: 'Upgraded Segments', value: 640000, type: 'positive' },
        { label: 'Re-activations', value: 320000, type: 'positive' },
        { label: 'Downgraded Segments', value: -420000, type: 'negative' },
        { label: 'Churned', value: -780000, type: 'negative' },
        { label: 'Returns Allowance', value: -260000, type: 'negative' },
        { label: 'Q2 Revenue', value: totalRevenue, type: 'base' },
      ],
    },
    drill_down: Object.fromEntries(segs.slice(0, 3).map(s => [s.segment, {
      top_skus: ['Lululemon Align Legging', 'Nike Dri-Fit Tee', 'Levi\'s 501 Slim'].slice(0, 3),
      top_cities: ['Los Angeles', 'New York', 'Dallas'].slice(0, 3),
      channel_mix: { in_store: 0.42, online: 0.36, mobile: 0.22 },
      avg_items_per_basket: Math.round(rb(1.8, 3.4) * 10) / 10,
      preferred_day: pick(['Weekend', 'Weekday']),
      seasonal_peak: pick(['Aug-Sep (BTS)', 'Nov-Dec (Holiday)', 'May-Jun (Summer)', 'Mar-Apr (Spring Drop)']),
    }])),
    insights: [
      'Top 20% of customers generate 58.6% of revenue — Pareto holds but flatter than industry avg of 65% (apparel returns dilute the long tail).',
      'Athletic Enthusiast is the fastest-growing segment at +4.2% MoM — Lululemon/Nike drive 62% of growth.',
      'Lapsed + Returner segments together = 25% of base but only 12% of revenue — re-engagement ROI is concentrated here.',
      'Brand Loyalist has the highest avg revenue per customer at $1,140 — protect with VIP early-access.',
      'Returns allowance is now -$260K/quarter — fit-consult interventions could reduce this by 35%.',
    ],
  };
}

// 2.18 Channel analysis
function genChannelAnalysis() {
  return {
    acquisition: ACQ_CHANNELS.map(ch => {
      const rows = customers.filter(c => c.acquisition_channel === ch);
      const [cacLo, cacHi] = ACQ_CAC[ch];
      const cac = cacLo === 0 ? 0 : Math.round(rb(cacLo, cacHi));
      const aClv = Math.round(mean(rows.map(c => c.clv_12m)) || 0);
      return {
        channel: ch,
        customer_count: rows.length,
        pct_of_total: Math.round(rows.length / TOTAL_CUSTOMERS * 1000) / 10,
        avg_clv: aClv,
        total_revenue: Math.round(sum(rows.map(c => c.total_spend))),
        description: ACQ_DESC[ch],
      };
    }),
    shopping: CHANNELS.map(ch => {
      const rows = customers.filter(c => c.preferred_channel === ch);
      return {
        channel: ch,
        customer_count: rows.length,
        pct_of_total: Math.round(rows.length / TOTAL_CUSTOMERS * 1000) / 10,
        avg_basket: Math.round(mean(rows.map(c => c.avg_basket)) || avgBasket),
        total_transactions: sum(rows.map(c => c.total_transactions)),
      };
    }),
  };
}

// 2.19 Channel deep
function genChannelDeep() {
  const months = ['Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'];
  const onlinePct = Math.round(customers.filter(c => c.preferred_channel === 'Web' || c.preferred_channel === 'App').length / TOTAL_CUSTOMERS * 100);
  const offlinePct = Math.round(customers.filter(c => c.preferred_channel === 'In-Store').length / TOTAL_CUSTOMERS * 100);
  return {
    kpis: {
      total_acquired: TOTAL_CUSTOMERS,
      online_pct: onlinePct,
      offline_pct: offlinePct,
      omni_pct: Math.max(0, 100 - onlinePct - offlinePct),
      blended_cac: 42,
      top_channel: 'Paid Social',
      growth_rate: 8.4,
    },
    monthly_trend: months.map(m => ({
      month: m,
      Organic: ri(1400, 2200), Paid: ri(1100, 1900), Direct: ri(800, 1300),
      Referral: ri(600, 1100), Email: ri(500, 900), Social: ri(400, 800),
      Marketplace: ri(380, 720), Offline: ri(420, 620),
    })),
    cac_trend: months.slice(0, 6).map(m => ({
      month: m, Paid: ri(48, 92), Social: ri(32, 68), Email: ri(4, 12), Referral: ri(6, 22), Marketplace: ri(18, 48),
    })),
    budget: [
      { channel: 'Paid Social (Meta/TikTok)', spent: 1820000, allocated: 2400000, utilization: 76 },
      { channel: 'Paid Search (Google)', spent: 980000, allocated: 1200000, utilization: 82 },
      { channel: 'Affiliate / Creator', spent: 480000, allocated: 600000, utilization: 80 },
      { channel: 'Email / SMS', spent: 120000, allocated: 180000, utilization: 67 },
    ],
    ltv_cac: ACQ_CHANNELS.map(ch => {
      const [cacLo, cacHi] = ACQ_CAC[ch];
      const cac = cacLo === 0 ? 1 : Math.round(rb(cacLo, cacHi));
      const ltv = Math.round(mean(customers.filter(c => c.acquisition_channel === ch).map(c => c.clv_12m)) || 580);
      return { channel: ch, ltv, cac, ratio: Math.round(ltv / cac * 10) / 10, payback_months: Math.round(cac / (ltv / 12) * 10) / 10 };
    }),
    repeat_rates: ACQ_CHANNELS.map(ch => ({
      channel: ch, r30: ri(28, 72), r60: ri(22, 62), r90: ri(18, 52),
    })),
    first_purchase_category: ACQ_CHANNELS.map(ch => ({
      channel: ch, Tops: ri(22, 38), Bottoms: ri(18, 32), Outerwear: ri(8, 22), Footwear: ri(12, 28), Accessories: ri(8, 22),
    })),
    city_channel_split: METROS.slice(0, 12).map(city => ({
      city, Organic: ri(380, 1400), Paid: ri(280, 1100), Direct: ri(180, 800), Referral: ri(120, 600), Social: ri(220, 720), Offline: ri(140, 480), Email: ri(80, 380), Marketplace: ri(60, 280),
    })),
    alerts: [
      { severity: 'warning', message: 'Marketplace LTV:CAC is 2.4:1 — below 3:1 target, watch for next quarter.' },
      { severity: 'info', message: 'Referral repeat-30d is 62% — scale referral programme.' },
      { severity: 'critical', message: 'Paid Social CAC up 18% MoM — TikTok auctions tightening, diversify spend.' },
    ],
    time_to_first_purchase: ACQ_CHANNELS.map(ch => ({
      channel: ch, avg_days: ri(0, 14), median_days: ri(0, 10),
    })),
  };
}

// 2.20 Category by segment
function genCategoryBySegment() {
  const L1S = ['Tops', 'Bottoms', 'Outerwear', 'Footwear', 'Accessories'];
  const matrix = SEGMENTS.map(seg => {
    const rows = customers.filter(c => c.customer_segment === seg);
    const cats: any = {};
    for (const l1 of L1S) {
      const ct = Math.round(rows.length * rb(0.18, 0.78));
      const rev = ct * Math.round(rb(80, 480));
      cats[l1] = {
        customers: ct,
        revenue: rev,
        penetration: Math.round(ct / Math.max(1, rows.length) * 100),
        revenue_share: Math.round(rev / Math.max(1, sum(rows.map(c => c.total_spend))) * 1000) / 10,
        avg_spend: Math.round(rev / Math.max(1, ct)),
        growth_mom: Math.round(gaussian(2, 4) * 10) / 10,
        affinity_index: Math.round(rb(0.3, 4.2) * 10) / 10,
      };
    }
    return {
      segment: seg,
      total_customers: rows.length,
      total_revenue: sum(rows.map(c => c.total_spend)),
      categories: cats,
    };
  });
  return {
    categories: L1S,
    segments: [...SEGMENTS],
    matrix,
    cross_sell_opportunities: SEGMENTS.slice(0, 6).map(seg => ({
      segment: seg,
      from_category: 'Tops',
      to_category: pick(['Bottoms', 'Outerwear', 'Footwear', 'Accessories']),
      current_penetration: ri(18, 38),
      potential_penetration: ri(48, 68),
      gap_customers: ri(800, 4200),
      estimated_revenue: ri(180000, 1800000),
      priority: pick(['High', 'Medium', 'High']),
    })),
    segment_diagnostics: Object.fromEntries(SEGMENTS.map(s => [s, `${s}: ${pick(['Outerwear', 'Accessories', 'Footwear'])} under-indexed — cross-sell opportunity via curated lookbooks.`])),
  };
}

// 2.21 At-risk alerts
function genAtRiskAlerts() {
  const ranked = [...customers]
    .map(c => ({ c, score: c.clv_12m * c.churn_prob_90d }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  const APPAREL_ALERTS = ['high_value_declining', 'return_abuse', 'cart_abandon_streak', 'app_uninstall_signal', 'seasonal_lapser', 'markdown_only_buyer', 'size_complaint_loop'] as const;
  const alerts = ranked.map(({ c }) => {
    let alert_type: typeof APPAREL_ALERTS[number] = 'high_value_declining';
    if (c.return_rate_pct > 0.4) alert_type = 'return_abuse';
    else if (c.days_since_last_purchase >= 90 && c.days_since_last_purchase <= 180) alert_type = 'seasonal_lapser';
    else if (c.return_rate_pct > 0.25 && c.top_category.includes('Jean')) alert_type = 'size_complaint_loop';
    else if (c.customer_segment === 'Value Shopper') alert_type = 'markdown_only_buyer';
    const action = alert_type === 'return_abuse' ? NBA_ACTIONS.concierge_fit_consult
      : alert_type === 'size_complaint_loop' ? NBA_ACTIONS.size_up_recommendation
      : alert_type === 'markdown_only_buyer' ? NBA_ACTIONS.gift_with_purchase_invite
      : alert_type === 'seasonal_lapser' ? NBA_ACTIONS.send_new_drop
      : c.top_brand === 'Lululemon' ? NBA_ACTIONS.promote_lululemon_arrivals
      : c.top_brand === 'Nike' ? NBA_ACTIONS.promote_nike_arrivals
      : NBA_ACTIONS.offer_25_off_reactivation;
    return {
      customer_id: c.customer_id,
      customer_name: nameForId(c.customer_id),
      segment: c.customer_segment,
      clv: c.clv_12m,
      churn_probability: c.churn_prob_90d,
      days_since_last_order: c.days_since_last_purchase,
      alert_type,
      recommended_action: action,
      potential_revenue_at_risk: Math.round(c.clv_12m * 0.4),
    };
  });
  return {
    alerts,
    summary: {
      total_at_risk: atRiskCount,
      high_priority: customers.filter(c => c.churn_risk_tier === 'Critical').length,
      medium_priority: customers.filter(c => c.churn_risk_tier === 'High').length,
      low_priority: 0,
      total_revenue_at_risk: Math.round(sum(customers.filter(c => c.churn_risk_tier === 'Critical' || c.churn_risk_tier === 'High').map(c => c.clv_12m * c.churn_prob_90d))),
      avg_churn_probability: Math.round(mean(customers.filter(c => c.churn_risk_tier === 'Critical' || c.churn_risk_tier === 'High').map(c => c.churn_prob_90d)) * 1000) / 1000,
    },
  };
}

// 2.22 Dimensions
function genDimensions() {
  const out: any[] = [];
  for (const s of STORES) out.push({ dim_type: 'stores', id: s.id, name: s.name, city: s.city, state: s.state, metro: s.metro });
  for (const b of BRANDS) out.push({ dim_type: 'brands', id: b.id, name: b.name, tier: b.tier });
  for (const c of CATEGORIES) out.push({ dim_type: 'categories', id: c.name.toLowerCase().replace(/[^a-z0-9]/g, '_'), name: c.name, parent_department: c.dept });
  for (const s of SEGMENTS) out.push({ dim_type: 'segments', id: s.toLowerCase().replace(/\s+/g, '_'), name: s });
  for (const t of LOYALTY_TIERS) out.push({ dim_type: 'loyalty_tiers', id: t.toLowerCase(), name: t });
  for (const ch of CHANNELS) out.push({ dim_type: 'channels', id: ch.toLowerCase().replace(/[^a-z0-9]/g, '_'), name: ch });
  for (const ch of ACQ_CHANNELS) out.push({ dim_type: 'acquisition_channels', id: ch.toLowerCase().replace(/[^a-z0-9]/g, '_'), name: ch });
  for (const h of HOLIDAYS) out.push({ dim_type: 'holidays', id: h.name.toLowerCase().replace(/[^a-z0-9]/g, '_'), name: h.name, window: h.window, depts: h.depts, uplift: h.uplift });
  for (const rr of RETURN_REASONS) out.push({ dim_type: 'return_reasons', id: rr.toLowerCase().replace(/[^a-z0-9]/g, '_'), name: rr });
  return out;
}

// === NEW apparel-native files ===

// 3.1 Returns by reason
function genReturnsByReason() {
  const totalRet = ri(34000, 38000);
  const reasonPct: Record<string, number> = { Fit: 41.2, Style: 19.3, Quality: 12.8, 'Wrong Item': 8.7, Damaged: 8.3, 'Changed Mind': 9.7 };
  const reasons = RETURN_REASONS.map(rr => {
    const pct = reasonPct[rr];
    const count = Math.round(totalRet * pct / 100);
    const avgRefund = rr === 'Quality' ? 85 : rr === 'Damaged' ? 78 : rr === 'Style' ? 72 : rr === 'Fit' ? 68 : rr === 'Wrong Item' ? 64 : 70;
    return {
      reason: rr,
      count,
      pct,
      avg_refund_usd: avgRefund,
      margin_impact_usd: Math.round(count * avgRefund * 0.42),
    };
  });
  const trend = [];
  for (let w = 1; w <= 12; w++) trend.push({ week: `W${w}`, return_rate_pct: Math.round((14 + Math.sin(w / 2) * 2 + gaussian(0, 0.3)) * 100) / 100 });
  return {
    total_returns_90d: totalRet,
    return_rate_pct: 14.8,
    return_margin_impact_usd: Math.round(sum(reasons.map(r => r.margin_impact_usd))),
    reasons,
    trend_12w: trend,
  };
}

// 3.2 Brand affinity heatmap
function genBrandAffinity() {
  const topBrands = BRANDS.map(b => b.name).slice(0, 10);
  // Compute share of wallet per (segment, brand)
  const cells: any[] = [];
  for (const seg of SEGMENTS) {
    const segCustomers = customers.filter(c => c.customer_segment === seg);
    const segSpend = sum(segCustomers.map(c => c.total_spend));
    for (const brand of topBrands) {
      const rows = segCustomers.filter(c => c.top_brand === brand);
      const sow = segSpend > 0 ? Math.round(sum(rows.map(c => c.total_spend)) / segSpend * 1000) / 10 : 0;
      cells.push({
        segment: seg,
        brand,
        share_of_wallet_pct: sow,
        avg_aov_with_brand: Math.round(mean(rows.map(c => c.avg_basket)) || 80),
        customer_count: rows.length,
      });
    }
  }
  return {
    segments: [...SEGMENTS],
    brands: topBrands,
    cells,
    insights: [
      'Athletic Enthusiasts spend 28% of wallet on Lululemon — 4.2× the next-closest segment',
      'Brand Loyalists concentrate 38% of spend on Coach — protect with VIP early-access',
      'Value Shoppers split between H&M (19.6%) and Old Navy (16.4%) — markdown-driven',
      'Fashion Forward over-indexes on Zara (22.8%) and Madewell (14.4%) — trend-led shoppers',
      'Lapsed segment shows fragmented brand affinity — no clear loyalty hook to re-engage',
    ],
  };
}

// 3.3 Return reason waterfall (sample 200 customers)
function genReturnReasonWaterfall() {
  const sample = customers.filter(c => c.return_rate_pct > 0.15).slice(0, 200);
  return sample.map(c => {
    const totalRet = Math.max(1, Math.round(c.total_transactions * c.return_rate_pct));
    const reasons: any[] = [];
    const dist = { 'Fit (too small)': 0.32, 'Fit (too large)': 0.18, Style: 0.18, Quality: 0.12, 'Wrong Item': 0.08, Damaged: 0.04, 'Changed Mind': 0.08 };
    let remaining = totalRet;
    const keys = Object.keys(dist);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const cnt = i === keys.length - 1 ? remaining : Math.round(totalRet * (dist as any)[k]);
      if (cnt > 0) reasons.push({ reason: k, count: cnt, pct: Math.round(cnt / totalRet * 100) });
      remaining -= cnt;
    }
    return {
      customer_id: c.customer_id,
      total_returns_12m: totalRet,
      return_value_usd: Math.round(totalRet * c.avg_basket),
      reasons,
      size_complaint_cluster: c.return_rate_pct > 0.35 && c.top_category.includes('Jean') ? `Bottoms 32×32 ran small` : null,
    };
  });
}

// ====================================================================
// WRITE ALL FILES
// ====================================================================
const filesWritten: Array<[string, number]> = [];

function out(name: string, payload: any) {
  const bytes = write(name, payload);
  filesWritten.push([name, bytes]);
}

console.log('[gen] writing files...');
out('cx360_kpis.json', genKpis());
out('cx360_customer_table.json', customers);
out('cx360_clv_distribution.json', genClvDistribution());
out('cx360_clv_detail.json', genClvDetail());
out('cx360_churn_risk.json', genChurnRisk());
out('cx360_churn_drivers.json', genChurnDrivers());
out('cx360_churn_detail.json', genChurnDetail());
out('cx360_cohort_retention.json', genCohortRetention());
out('cx360_cohort_detail.json', genCohortDetail());
out('cx360_segment_migration.json', genSegmentMigration());
out('cx360_basket_distribution.json', genBasketDistribution());
out('cx360_recency_frequency.json', genRecencyFrequency());
out('cx360_frequency_detail.json', genFrequencyDetail());
out('cx360_rfm_sample.json', genRfmSample());
out('cx360_rfm_detail.json', genRfmDetail());
out('cx360_revenue_concentration.json', genRevenueConcentration());
out('cx360_revenue_detail.json', genRevenueDetail());
out('cx360_channel_analysis.json', genChannelAnalysis());
out('cx360_channel_deep.json', genChannelDeep());
out('cx360_category_by_segment.json', genCategoryBySegment());
out('cx360_at_risk_alerts.json', genAtRiskAlerts());
out('dimensions.json', genDimensions());
// 3 net-new apparel files
out('cx360_returns_by_reason.json', genReturnsByReason());
out('cx360_brand_affinity.json', genBrandAffinity());
out('cx360_return_reason_waterfall.json', genReturnReasonWaterfall());

const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
const totalBytes = filesWritten.reduce((s, [, b]) => s + b, 0);
console.log('');
console.log(`✓ ${filesWritten.length} files written → cache/apparel/`);
for (const [n, b] of filesWritten) console.log(`  ${(b / 1024).toFixed(1).padStart(10)} KB  ${n}`);
console.log('');
console.log(`Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Runtime: ${elapsed}s`);
console.log(`Customers: ${TOTAL_CUSTOMERS}`);
const churnDist: any = {};
for (const c of customers) churnDist[c.churn_risk_tier] = (churnDist[c.churn_risk_tier] || 0) + 1;
console.log(`Churn distribution:`, churnDist);
const segPop: any = {};
for (const c of customers) segPop[c.customer_segment] = (segPop[c.customer_segment] || 0) + 1;
console.log(`Segment populations:`, segPop);
const brandRev: any = {};
for (const c of customers) brandRev[c.top_brand] = (brandRev[c.top_brand] || 0) + c.total_spend;
const topBrands = Object.entries(brandRev).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
console.log(`Top 5 brands by revenue:`, topBrands.map(([n, v]: any) => `${n}: $${(v / 1e6).toFixed(1)}M`).join(', '));
