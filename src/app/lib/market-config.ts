import type {
  MerchDemandChannel,
  MerchDemandEvent,
  MerchDemandEventLift,
} from './merch-demand-types';

export interface MerchMarketConfig {
  market_code: 'india-v1';
  country: string;
  locale: string;
  currency: { code: string; symbol: string; format: 'lakhs_crores' | 'thousands_millions' };
  geography_hierarchy: string[];
  channels: MerchDemandChannel[];
  store_types: string[];
  departments: { name: string; categories: { name: string; subcategories: string[] }[] }[];
  events: MerchDemandEvent[];
  event_lifts: MerchDemandEventLift[];
  cultural_patterns: {
    salary_week_days: number[];
    monsoon_months: number[];
    ipl_season: { start: string; end: string };
    school_summer_holiday: { start: string; end: string };
    weekend_days: number[];
  };
}

export const INDIA_V1: MerchMarketConfig = {
  market_code: 'india-v1',
  country: 'India',
  locale: 'en-IN',
  currency: { code: 'INR', symbol: '₹', format: 'lakhs_crores' },
  geography_hierarchy: ['Region', 'Tier', 'State', 'City', 'Store'],
  channels: ['In-Store', 'Online', 'Dark Store', 'Quick-Commerce'],
  store_types: ['Hypermarket', 'Supermarket', 'Express', 'Dark Store', 'Kirana Partner'],

  departments: [
    {
      name: 'Grocery & Staples',
      categories: [
        { name: 'Edible Oil',      subcategories: ['Refined Oil', 'Mustard Oil', 'Coconut Oil', 'Ghee'] },
        { name: 'Spices',          subcategories: ['Whole Spices', 'Ground Spices', 'Masala Mixes'] },
        { name: 'Atta & Flour',    subcategories: ['Wheat Atta', 'Multigrain', 'Specialty Flours'] },
        { name: 'Dal & Pulses',    subcategories: ['Toor Dal', 'Moong Dal', 'Chana', 'Rajma & Beans'] },
        { name: 'Salt',            subcategories: ['Iodized Salt', 'Rock Salt'] },
        { name: 'Rice',            subcategories: ['Basmati', 'Non-Basmati', 'Brown & Specialty'] },
        { name: 'Sugar & Jaggery', subcategories: ['White Sugar', 'Jaggery', 'Brown Sugar'] },
      ],
    },
    {
      name: 'Dairy & Frozen',
      categories: [
        { name: 'Milk',         subcategories: ['Toned', 'Full Cream', 'Skimmed'] },
        { name: 'Curd & Yogurt',subcategories: ['Plain Curd', 'Flavored Yogurt', 'Greek Yogurt'] },
        { name: 'Butter & Ghee',subcategories: ['Salted Butter', 'Unsalted Butter', 'Cow Ghee'] },
        { name: 'Cheese',       subcategories: ['Processed', 'Mozzarella', 'Cheese Spreads'] },
        { name: 'Paneer',       subcategories: ['Fresh', 'Frozen'] },
        { name: 'Ice Cream',    subcategories: ['Family Pack', 'Sticks & Bars', 'Premium Tubs'] },
        { name: 'Frozen Foods', subcategories: ['Frozen Snacks', 'Frozen Vegetables', 'Frozen Meals'] },
      ],
    },
    {
      name: 'Beverages',
      categories: [
        { name: 'Soft Drinks',   subcategories: ['Colas', 'Lemon-Lime', 'Orange'] },
        { name: 'Juice',         subcategories: ['100% Juice', 'Nectar', 'Concentrates'] },
        { name: 'Tea',           subcategories: ['Black Tea', 'Green Tea', 'Specialty Tea'] },
        { name: 'Coffee',        subcategories: ['Instant', 'Filter', 'Premium'] },
        { name: 'Energy Drinks', subcategories: ['Standard', 'Sugar-Free'] },
        { name: 'Water',         subcategories: ['Still', 'Sparkling'] },
      ],
    },
    {
      name: 'Snacks & Biscuits',
      categories: [
        { name: 'Biscuits',      subcategories: ['Glucose', 'Cream', 'Cookies', 'Premium'] },
        { name: 'Chips & Namkeen', subcategories: ['Potato Chips', 'Bhujia & Mixtures', 'Regional Namkeen'] },
        { name: 'Noodles',       subcategories: ['Instant', 'Ready-to-Eat'] },
      ],
    },
    {
      name: 'Personal Care',
      categories: [
        { name: 'Shampoo',    subcategories: ['Daily Use', 'Anti-Dandruff', 'Premium'] },
        { name: 'Soaps',      subcategories: ['Bathing Bars', 'Liquid Body Wash', 'Specialty'] },
        { name: 'Toothpaste', subcategories: ['Daily Use', 'Specialty', 'Kids'] },
        { name: 'Detergent',  subcategories: ['Powder', 'Liquid', 'Bar'] },
      ],
    },
  ],

  events: [
    // ── Festivals ──────────────────────────────────────────────────────────
    {
      event_id: 'eid-al-adha-2026', event_name: 'Eid al-Adha', event_type: 'festival',
      date: '2026-06-06', window_start: '2026-05-30', window_end: '2026-06-09',
      regions_affected: [], cultural_significance: 'high', typical_prep_days: 14,
    },
    {
      event_id: 'independence-day-sale-2026', event_name: 'Independence Day Sale', event_type: 'shopping_event',
      date: '2026-08-15', window_start: '2026-08-10', window_end: '2026-08-18',
      regions_affected: [], cultural_significance: 'medium', typical_prep_days: 7,
    },
    {
      event_id: 'raksha-bandhan-2026', event_name: 'Raksha Bandhan', event_type: 'festival',
      date: '2026-08-19', window_start: '2026-08-14', window_end: '2026-08-21',
      regions_affected: [], cultural_significance: 'high', typical_prep_days: 7,
    },
    {
      event_id: 'janmashtami-2026', event_name: 'Janmashtami', event_type: 'festival',
      date: '2026-08-26', window_start: '2026-08-24', window_end: '2026-08-28',
      regions_affected: [], cultural_significance: 'medium', typical_prep_days: 5,
    },
    {
      event_id: 'ganesh-chaturthi-2026', event_name: 'Ganesh Chaturthi', event_type: 'festival',
      date: '2026-08-27', window_start: '2026-08-27', window_end: '2026-09-06',
      regions_affected: ['West', 'South'], cultural_significance: 'high', typical_prep_days: 10,
    },
    {
      event_id: 'onam-2026', event_name: 'Onam', event_type: 'festival',
      date: '2026-09-13', window_start: '2026-09-05', window_end: '2026-09-17',
      regions_affected: ['South'], cultural_significance: 'high', typical_prep_days: 14,
    },
    {
      event_id: 'navratri-2026', event_name: 'Navratri', event_type: 'festival',
      date: '2026-10-02', window_start: '2026-10-02', window_end: '2026-10-12',
      regions_affected: [], cultural_significance: 'high', typical_prep_days: 7,
    },
    {
      event_id: 'dussehra-2026', event_name: 'Dussehra', event_type: 'festival',
      date: '2026-10-11', window_start: '2026-10-08', window_end: '2026-10-13',
      regions_affected: [], cultural_significance: 'high', typical_prep_days: 7,
    },
    {
      event_id: 'karwa-chauth-2026', event_name: 'Karwa Chauth', event_type: 'festival',
      date: '2026-10-28', window_start: '2026-10-24', window_end: '2026-10-29',
      regions_affected: ['North'], cultural_significance: 'high', typical_prep_days: 7,
    },
    {
      event_id: 'diwali-sale-2026', event_name: 'Diwali Sale', event_type: 'shopping_event',
      date: '2026-10-20', window_start: '2026-10-15', window_end: '2026-11-05',
      regions_affected: [], cultural_significance: 'high', typical_prep_days: 21,
    },
    {
      event_id: 'diwali-2026', event_name: 'Diwali', event_type: 'festival',
      date: '2026-11-01', window_start: '2026-10-25', window_end: '2026-11-05',
      regions_affected: [], cultural_significance: 'high', typical_prep_days: 21,
    },
    {
      event_id: 'bhai-dooj-2026', event_name: 'Bhai Dooj', event_type: 'festival',
      date: '2026-11-03', window_start: '2026-11-03', window_end: '2026-11-05',
      regions_affected: [], cultural_significance: 'medium', typical_prep_days: 3,
    },
    {
      event_id: 'year-end-sale-2026', event_name: 'Year-End Sale', event_type: 'shopping_event',
      date: '2026-12-25', window_start: '2026-12-20', window_end: '2026-12-31',
      regions_affected: [], cultural_significance: 'medium', typical_prep_days: 7,
    },
    {
      event_id: 'christmas-2026', event_name: 'Christmas', event_type: 'festival',
      date: '2026-12-25', window_start: '2026-12-20', window_end: '2026-12-27',
      regions_affected: [], cultural_significance: 'medium', typical_prep_days: 7,
    },
    {
      event_id: 'new-year-2027', event_name: 'New Year', event_type: 'festival',
      date: '2027-01-01', window_start: '2026-12-29', window_end: '2027-01-03',
      regions_affected: [], cultural_significance: 'medium', typical_prep_days: 3,
    },
    {
      event_id: 'pongal-2027', event_name: 'Pongal / Makar Sankranti', event_type: 'festival',
      date: '2027-01-14', window_start: '2027-01-12', window_end: '2027-01-17',
      regions_affected: ['South', 'North'], cultural_significance: 'high', typical_prep_days: 7,
    },
    {
      event_id: 'republic-day-sale-2027', event_name: 'Republic Day Sale', event_type: 'shopping_event',
      date: '2027-01-26', window_start: '2027-01-20', window_end: '2027-01-28',
      regions_affected: [], cultural_significance: 'medium', typical_prep_days: 5,
    },
    {
      event_id: 'holi-2027', event_name: 'Holi', event_type: 'festival',
      date: '2027-03-03', window_start: '2027-02-28', window_end: '2027-03-05',
      regions_affected: [], cultural_significance: 'high', typical_prep_days: 10,
    },
    {
      event_id: 'ram-navami-2027', event_name: 'Ram Navami', event_type: 'festival',
      date: '2027-04-06', window_start: '2027-04-04', window_end: '2027-04-08',
      regions_affected: [], cultural_significance: 'medium', typical_prep_days: 5,
    },
    {
      event_id: 'baisakhi-2027', event_name: 'Baisakhi', event_type: 'festival',
      date: '2027-04-14', window_start: '2027-04-12', window_end: '2027-04-16',
      regions_affected: ['North'], cultural_significance: 'high', typical_prep_days: 7,
    },
    {
      event_id: 'ugadi-2027', event_name: 'Ugadi', event_type: 'festival',
      date: '2027-03-30', window_start: '2027-03-28', window_end: '2027-04-01',
      regions_affected: ['South'], cultural_significance: 'high', typical_prep_days: 7,
    },
    {
      event_id: 'eid-al-fitr-2027', event_name: 'Eid al-Fitr', event_type: 'festival',
      date: '2027-04-20', window_start: '2027-04-17', window_end: '2027-04-23',
      regions_affected: [], cultural_significance: 'high', typical_prep_days: 14,
    },
    {
      event_id: 'buddha-purnima-2027', event_name: 'Buddha Purnima', event_type: 'festival',
      date: '2027-05-12', window_start: '2027-05-10', window_end: '2027-05-14',
      regions_affected: [], cultural_significance: 'low', typical_prep_days: 3,
    },
    // ── Sports ─────────────────────────────────────────────────────────────
    {
      event_id: 'ipl-season-2027', event_name: 'IPL Season 2027', event_type: 'sports',
      date: '2027-04-15', window_start: '2027-03-15', window_end: '2027-05-28',
      regions_affected: [], cultural_significance: 'high', typical_prep_days: 7,
    },
    // ── School ─────────────────────────────────────────────────────────────
    {
      event_id: 'summer-holiday-2026', event_name: 'School Summer Holiday', event_type: 'school',
      date: '2026-05-20', window_start: '2026-05-10', window_end: '2026-06-30',
      regions_affected: [], cultural_significance: 'medium', typical_prep_days: 0,
    },
    {
      event_id: 'school-reopening-2026', event_name: 'School Reopening', event_type: 'school',
      date: '2026-07-01', window_start: '2026-06-10', window_end: '2026-07-15',
      regions_affected: [], cultural_significance: 'medium', typical_prep_days: 7,
    },
    {
      event_id: 'summer-holiday-2027', event_name: 'School Summer Holiday 2027', event_type: 'school',
      date: '2027-05-15', window_start: '2027-05-01', window_end: '2027-05-31',
      regions_affected: [], cultural_significance: 'medium', typical_prep_days: 0,
    },
    // ── Seasons ────────────────────────────────────────────────────────────
    {
      event_id: 'monsoon-onset-2026', event_name: 'Monsoon Onset', event_type: 'season',
      date: '2026-06-10', window_start: '2026-06-01', window_end: '2026-06-20',
      regions_affected: [], cultural_significance: 'low', typical_prep_days: 0,
    },
    {
      event_id: 'monsoon-peak-2026', event_name: 'Monsoon Peak', event_type: 'season',
      date: '2026-07-20', window_start: '2026-07-01', window_end: '2026-09-15',
      regions_affected: [], cultural_significance: 'low', typical_prep_days: 0,
    },
    {
      event_id: 'winter-onset-2026', event_name: 'Winter Onset', event_type: 'season',
      date: '2026-11-15', window_start: '2026-11-01', window_end: '2026-12-15',
      regions_affected: [], cultural_significance: 'low', typical_prep_days: 0,
    },
    {
      event_id: 'summer-heat-wave-2027', event_name: 'Summer Heat Wave', event_type: 'season',
      date: '2027-04-25', window_start: '2027-04-01', window_end: '2027-05-31',
      regions_affected: [], cultural_significance: 'low', typical_prep_days: 0,
    },
  ],

  event_lifts: [
    // ── Diwali ─────────────────────────────────────────────────────────────
    { event_id: 'diwali-2026', category: 'Grocery & Staples', expected_lift_pct: 150, peak_offset_days: -3, historical_lifts: [{ year: 2025, actual_lift_pct: 148 }, { year: 2024, actual_lift_pct: 163 }, { year: 2023, actual_lift_pct: 141 }] },
    { event_id: 'diwali-2026', category: 'Dairy & Frozen',    expected_lift_pct: 220, peak_offset_days: -3, historical_lifts: [{ year: 2025, actual_lift_pct: 228 }, { year: 2024, actual_lift_pct: 207 }, { year: 2023, actual_lift_pct: 231 }] },
    { event_id: 'diwali-2026', category: 'Snacks & Biscuits', expected_lift_pct: 180, peak_offset_days: -2, historical_lifts: [{ year: 2025, actual_lift_pct: 172 }, { year: 2024, actual_lift_pct: 188 }, { year: 2023, actual_lift_pct: 175 }] },
    { event_id: 'diwali-2026', category: 'Personal Care',     expected_lift_pct: 40,  peak_offset_days: -7, historical_lifts: [{ year: 2025, actual_lift_pct: 38 }, { year: 2024, actual_lift_pct: 44 }, { year: 2023, actual_lift_pct: 37 }] },
    { event_id: 'diwali-2026', category: 'Beverages',         expected_lift_pct: 70,  peak_offset_days: -2, historical_lifts: [{ year: 2025, actual_lift_pct: 68 }, { year: 2024, actual_lift_pct: 76 }, { year: 2023, actual_lift_pct: 65 }] },
    // ── Diwali Sale ────────────────────────────────────────────────────────
    { event_id: 'diwali-sale-2026', category: 'Grocery & Staples', expected_lift_pct: 80, peak_offset_days: -7, historical_lifts: [{ year: 2025, actual_lift_pct: 77 }, { year: 2024, actual_lift_pct: 84 }] },
    { event_id: 'diwali-sale-2026', category: 'Snacks & Biscuits', expected_lift_pct: 100, peak_offset_days: -7, historical_lifts: [{ year: 2025, actual_lift_pct: 97 }, { year: 2024, actual_lift_pct: 108 }] },
    { event_id: 'diwali-sale-2026', category: 'Personal Care',     expected_lift_pct: 60,  peak_offset_days: -7, historical_lifts: [{ year: 2025, actual_lift_pct: 59 }, { year: 2024, actual_lift_pct: 65 }] },
    { event_id: 'diwali-sale-2026', category: 'Beverages',         expected_lift_pct: 55,  peak_offset_days: -5, historical_lifts: [{ year: 2025, actual_lift_pct: 52 }, { year: 2024, actual_lift_pct: 58 }] },
    // ── Holi ───────────────────────────────────────────────────────────────
    { event_id: 'holi-2027', category: 'Beverages',         expected_lift_pct: 90, peak_offset_days: 0,  historical_lifts: [{ year: 2026, actual_lift_pct: 93 }, { year: 2025, actual_lift_pct: 86 }, { year: 2024, actual_lift_pct: 91 }] },
    { event_id: 'holi-2027', category: 'Snacks & Biscuits', expected_lift_pct: 65, peak_offset_days: 0,  historical_lifts: [{ year: 2026, actual_lift_pct: 68 }, { year: 2025, actual_lift_pct: 62 }, { year: 2024, actual_lift_pct: 67 }] },
    { event_id: 'holi-2027', category: 'Grocery & Staples', expected_lift_pct: 45, peak_offset_days: -2, historical_lifts: [{ year: 2026, actual_lift_pct: 44 }, { year: 2025, actual_lift_pct: 48 }, { year: 2024, actual_lift_pct: 42 }] },
    { event_id: 'holi-2027', category: 'Personal Care',     expected_lift_pct: 30, peak_offset_days: -2, historical_lifts: [{ year: 2026, actual_lift_pct: 31 }, { year: 2025, actual_lift_pct: 28 }, { year: 2024, actual_lift_pct: 33 }] },
    // ── Eid al-Adha ────────────────────────────────────────────────────────
    { event_id: 'eid-al-adha-2026', category: 'Grocery & Staples', expected_lift_pct: 150, peak_offset_days: -2, historical_lifts: [{ year: 2025, actual_lift_pct: 146 }, { year: 2024, actual_lift_pct: 157 }] },
    { event_id: 'eid-al-adha-2026', category: 'Dairy & Frozen',    expected_lift_pct: 80,  peak_offset_days: -2, historical_lifts: [{ year: 2025, actual_lift_pct: 78 }, { year: 2024, actual_lift_pct: 84 }] },
    { event_id: 'eid-al-adha-2026', category: 'Snacks & Biscuits', expected_lift_pct: 90,  peak_offset_days: -1, historical_lifts: [{ year: 2025, actual_lift_pct: 87 }, { year: 2024, actual_lift_pct: 95 }] },
    { event_id: 'eid-al-adha-2026', category: 'Beverages',         expected_lift_pct: 60,  peak_offset_days: 0,  historical_lifts: [{ year: 2025, actual_lift_pct: 58 }, { year: 2024, actual_lift_pct: 63 }] },
    // ── Eid al-Fitr 2027 ───────────────────────────────────────────────────
    { event_id: 'eid-al-fitr-2027', category: 'Grocery & Staples', expected_lift_pct: 150, peak_offset_days: -2, historical_lifts: [{ year: 2026, actual_lift_pct: 152 }, { year: 2025, actual_lift_pct: 145 }] },
    { event_id: 'eid-al-fitr-2027', category: 'Dairy & Frozen',    expected_lift_pct: 80,  peak_offset_days: -2, historical_lifts: [{ year: 2026, actual_lift_pct: 83 }, { year: 2025, actual_lift_pct: 77 }] },
    { event_id: 'eid-al-fitr-2027', category: 'Snacks & Biscuits', expected_lift_pct: 90,  peak_offset_days: -1, historical_lifts: [{ year: 2026, actual_lift_pct: 88 }, { year: 2025, actual_lift_pct: 93 }] },
    // ── Onam (South only) ──────────────────────────────────────────────────
    { event_id: 'onam-2026', category: 'Dairy & Frozen',    expected_lift_pct: 110, peak_offset_days: -1, historical_lifts: [{ year: 2025, actual_lift_pct: 114 }, { year: 2024, actual_lift_pct: 107 }, { year: 2023, actual_lift_pct: 112 }] },
    { event_id: 'onam-2026', category: 'Grocery & Staples', expected_lift_pct: 70,  peak_offset_days: -2, historical_lifts: [{ year: 2025, actual_lift_pct: 73 }, { year: 2024, actual_lift_pct: 68 }, { year: 2023, actual_lift_pct: 71 }] },
    { event_id: 'onam-2026', category: 'Beverages',         expected_lift_pct: 40,  peak_offset_days: 0,  historical_lifts: [{ year: 2025, actual_lift_pct: 38 }, { year: 2024, actual_lift_pct: 42 }, { year: 2023, actual_lift_pct: 39 }] },
    { event_id: 'onam-2026', category: 'Snacks & Biscuits', expected_lift_pct: 55,  peak_offset_days: 0,  historical_lifts: [{ year: 2025, actual_lift_pct: 57 }, { year: 2024, actual_lift_pct: 52 }, { year: 2023, actual_lift_pct: 56 }] },
    // ── Navratri ───────────────────────────────────────────────────────────
    { event_id: 'navratri-2026', category: 'Snacks & Biscuits', expected_lift_pct: 45, peak_offset_days: 4, historical_lifts: [{ year: 2025, actual_lift_pct: 43 }, { year: 2024, actual_lift_pct: 47 }] },
    { event_id: 'navratri-2026', category: 'Dairy & Frozen',    expected_lift_pct: 55, peak_offset_days: 4, historical_lifts: [{ year: 2025, actual_lift_pct: 53 }, { year: 2024, actual_lift_pct: 58 }] },
    { event_id: 'navratri-2026', category: 'Beverages',         expected_lift_pct: 35, peak_offset_days: 4, historical_lifts: [{ year: 2025, actual_lift_pct: 34 }, { year: 2024, actual_lift_pct: 37 }] },
    { event_id: 'navratri-2026', category: 'Grocery & Staples', expected_lift_pct: 40, peak_offset_days: 2, historical_lifts: [{ year: 2025, actual_lift_pct: 38 }, { year: 2024, actual_lift_pct: 43 }] },
    // ── Dussehra ───────────────────────────────────────────────────────────
    { event_id: 'dussehra-2026', category: 'Grocery & Staples', expected_lift_pct: 60, peak_offset_days: 0, historical_lifts: [{ year: 2025, actual_lift_pct: 58 }, { year: 2024, actual_lift_pct: 63 }] },
    { event_id: 'dussehra-2026', category: 'Snacks & Biscuits', expected_lift_pct: 80, peak_offset_days: 0, historical_lifts: [{ year: 2025, actual_lift_pct: 78 }, { year: 2024, actual_lift_pct: 83 }] },
    { event_id: 'dussehra-2026', category: 'Beverages',         expected_lift_pct: 50, peak_offset_days: 0, historical_lifts: [{ year: 2025, actual_lift_pct: 49 }, { year: 2024, actual_lift_pct: 52 }] },
    // ── Ganesh Chaturthi ───────────────────────────────────────────────────
    { event_id: 'ganesh-chaturthi-2026', category: 'Grocery & Staples', expected_lift_pct: 60, peak_offset_days: -2, historical_lifts: [{ year: 2025, actual_lift_pct: 62 }, { year: 2024, actual_lift_pct: 58 }] },
    { event_id: 'ganesh-chaturthi-2026', category: 'Dairy & Frozen',    expected_lift_pct: 80, peak_offset_days: -2, historical_lifts: [{ year: 2025, actual_lift_pct: 83 }, { year: 2024, actual_lift_pct: 77 }] },
    { event_id: 'ganesh-chaturthi-2026', category: 'Snacks & Biscuits', expected_lift_pct: 70, peak_offset_days: 0,  historical_lifts: [{ year: 2025, actual_lift_pct: 68 }, { year: 2024, actual_lift_pct: 73 }] },
    // ── Karwa Chauth (North only) ──────────────────────────────────────────
    { event_id: 'karwa-chauth-2026', category: 'Personal Care',     expected_lift_pct: 35, peak_offset_days: -3, historical_lifts: [{ year: 2025, actual_lift_pct: 34 }, { year: 2024, actual_lift_pct: 37 }] },
    { event_id: 'karwa-chauth-2026', category: 'Grocery & Staples', expected_lift_pct: 25, peak_offset_days: -2, historical_lifts: [{ year: 2025, actual_lift_pct: 24 }, { year: 2024, actual_lift_pct: 27 }] },
    // ── Raksha Bandhan ─────────────────────────────────────────────────────
    { event_id: 'raksha-bandhan-2026', category: 'Snacks & Biscuits', expected_lift_pct: 60, peak_offset_days: -1, historical_lifts: [{ year: 2025, actual_lift_pct: 62 }, { year: 2024, actual_lift_pct: 58 }] },
    { event_id: 'raksha-bandhan-2026', category: 'Dairy & Frozen',    expected_lift_pct: 70, peak_offset_days: -1, historical_lifts: [{ year: 2025, actual_lift_pct: 73 }, { year: 2024, actual_lift_pct: 67 }] },
    { event_id: 'raksha-bandhan-2026', category: 'Beverages',         expected_lift_pct: 30, peak_offset_days: 0,  historical_lifts: [{ year: 2025, actual_lift_pct: 29 }, { year: 2024, actual_lift_pct: 32 }] },
    // ── Christmas ──────────────────────────────────────────────────────────
    { event_id: 'christmas-2026', category: 'Dairy & Frozen',    expected_lift_pct: 90, peak_offset_days: 0, historical_lifts: [{ year: 2025, actual_lift_pct: 88 }, { year: 2024, actual_lift_pct: 93 }, { year: 2023, actual_lift_pct: 87 }] },
    { event_id: 'christmas-2026', category: 'Beverages',         expected_lift_pct: 60, peak_offset_days: 0, historical_lifts: [{ year: 2025, actual_lift_pct: 58 }, { year: 2024, actual_lift_pct: 63 }, { year: 2023, actual_lift_pct: 57 }] },
    { event_id: 'christmas-2026', category: 'Snacks & Biscuits', expected_lift_pct: 50, peak_offset_days: 0, historical_lifts: [{ year: 2025, actual_lift_pct: 48 }, { year: 2024, actual_lift_pct: 53 }, { year: 2023, actual_lift_pct: 49 }] },
    // ── New Year ───────────────────────────────────────────────────────────
    { event_id: 'new-year-2027', category: 'Beverages',         expected_lift_pct: 80, peak_offset_days: 0, historical_lifts: [{ year: 2026, actual_lift_pct: 82 }, { year: 2025, actual_lift_pct: 77 }] },
    { event_id: 'new-year-2027', category: 'Snacks & Biscuits', expected_lift_pct: 60, peak_offset_days: 0, historical_lifts: [{ year: 2026, actual_lift_pct: 63 }, { year: 2025, actual_lift_pct: 58 }] },
    { event_id: 'new-year-2027', category: 'Dairy & Frozen',    expected_lift_pct: 40, peak_offset_days: 0, historical_lifts: [{ year: 2026, actual_lift_pct: 42 }, { year: 2025, actual_lift_pct: 38 }] },
    // ── Pongal / Makar Sankranti ───────────────────────────────────────────
    { event_id: 'pongal-2027', category: 'Grocery & Staples', expected_lift_pct: 80, peak_offset_days: -1, historical_lifts: [{ year: 2026, actual_lift_pct: 83 }, { year: 2025, actual_lift_pct: 78 }] },
    { event_id: 'pongal-2027', category: 'Dairy & Frozen',    expected_lift_pct: 90, peak_offset_days: -1, historical_lifts: [{ year: 2026, actual_lift_pct: 93 }, { year: 2025, actual_lift_pct: 87 }] },
    { event_id: 'pongal-2027', category: 'Snacks & Biscuits', expected_lift_pct: 50, peak_offset_days: 0,  historical_lifts: [{ year: 2026, actual_lift_pct: 52 }, { year: 2025, actual_lift_pct: 48 }] },
    // ── Baisakhi (North only) ──────────────────────────────────────────────
    { event_id: 'baisakhi-2027', category: 'Grocery & Staples', expected_lift_pct: 70, peak_offset_days: -1, historical_lifts: [{ year: 2026, actual_lift_pct: 72 }, { year: 2025, actual_lift_pct: 68 }] },
    { event_id: 'baisakhi-2027', category: 'Beverages',         expected_lift_pct: 40, peak_offset_days: 0,  historical_lifts: [{ year: 2026, actual_lift_pct: 41 }, { year: 2025, actual_lift_pct: 39 }] },
    // ── Republic Day Sale ──────────────────────────────────────────────────
    { event_id: 'republic-day-sale-2027', category: 'Personal Care',     expected_lift_pct: 45, peak_offset_days: 0, historical_lifts: [{ year: 2026, actual_lift_pct: 44 }, { year: 2025, actual_lift_pct: 47 }] },
    { event_id: 'republic-day-sale-2027', category: 'Snacks & Biscuits', expected_lift_pct: 40, peak_offset_days: 0, historical_lifts: [{ year: 2026, actual_lift_pct: 39 }, { year: 2025, actual_lift_pct: 42 }] },
    { event_id: 'republic-day-sale-2027', category: 'Beverages',         expected_lift_pct: 35, peak_offset_days: 0, historical_lifts: [{ year: 2026, actual_lift_pct: 34 }, { year: 2025, actual_lift_pct: 37 }] },
    // ── Independence Day Sale ──────────────────────────────────────────────
    { event_id: 'independence-day-sale-2026', category: 'Snacks & Biscuits', expected_lift_pct: 45, peak_offset_days: 0, historical_lifts: [{ year: 2025, actual_lift_pct: 44 }, { year: 2024, actual_lift_pct: 47 }] },
    { event_id: 'independence-day-sale-2026', category: 'Beverages',         expected_lift_pct: 40, peak_offset_days: 0, historical_lifts: [{ year: 2025, actual_lift_pct: 39 }, { year: 2024, actual_lift_pct: 42 }] },
    // ── Monsoon Peak (weather-driven, some negative) ───────────────────────
    { event_id: 'monsoon-peak-2026', category: 'Beverages',         expected_lift_pct: -25, peak_offset_days: 30, historical_lifts: [{ year: 2025, actual_lift_pct: -24 }, { year: 2024, actual_lift_pct: -27 }, { year: 2023, actual_lift_pct: -23 }] },
    { event_id: 'monsoon-peak-2026', category: 'Snacks & Biscuits', expected_lift_pct: 30,  peak_offset_days: 30, historical_lifts: [{ year: 2025, actual_lift_pct: 29 }, { year: 2024, actual_lift_pct: 32 }, { year: 2023, actual_lift_pct: 28 }] },
    { event_id: 'monsoon-peak-2026', category: 'Dairy & Frozen',    expected_lift_pct: -15, peak_offset_days: 30, historical_lifts: [{ year: 2025, actual_lift_pct: -14 }, { year: 2024, actual_lift_pct: -17 }, { year: 2023, actual_lift_pct: -13 }] },
    { event_id: 'monsoon-peak-2026', category: 'Personal Care',     expected_lift_pct: 20,  peak_offset_days: 30, historical_lifts: [{ year: 2025, actual_lift_pct: 19 }, { year: 2024, actual_lift_pct: 22 }, { year: 2023, actual_lift_pct: 19 }] },
    // ── Summer Heat Wave ───────────────────────────────────────────────────
    { event_id: 'summer-heat-wave-2027', category: 'Beverages',         expected_lift_pct: 80,  peak_offset_days: 30, historical_lifts: [{ year: 2026, actual_lift_pct: 82 }, { year: 2025, actual_lift_pct: 78 }] },
    { event_id: 'summer-heat-wave-2027', category: 'Dairy & Frozen',    expected_lift_pct: 200, peak_offset_days: 30, historical_lifts: [{ year: 2026, actual_lift_pct: 205 }, { year: 2025, actual_lift_pct: 193 }] },
    { event_id: 'summer-heat-wave-2027', category: 'Personal Care',     expected_lift_pct: 25,  peak_offset_days: 30, historical_lifts: [{ year: 2026, actual_lift_pct: 24 }, { year: 2025, actual_lift_pct: 26 }] },
    // ── IPL Season ─────────────────────────────────────────────────────────
    { event_id: 'ipl-season-2027', category: 'Beverages',         expected_lift_pct: 60, peak_offset_days: 30, historical_lifts: [{ year: 2026, actual_lift_pct: 58 }, { year: 2025, actual_lift_pct: 63 }] },
    { event_id: 'ipl-season-2027', category: 'Snacks & Biscuits', expected_lift_pct: 50, peak_offset_days: 30, historical_lifts: [{ year: 2026, actual_lift_pct: 52 }, { year: 2025, actual_lift_pct: 48 }] },
    // ── School Summer Holiday ──────────────────────────────────────────────
    { event_id: 'summer-holiday-2026', category: 'Dairy & Frozen',    expected_lift_pct: 70, peak_offset_days: 7, historical_lifts: [{ year: 2025, actual_lift_pct: 72 }, { year: 2024, actual_lift_pct: 68 }] },
    { event_id: 'summer-holiday-2026', category: 'Beverages',         expected_lift_pct: 40, peak_offset_days: 7, historical_lifts: [{ year: 2025, actual_lift_pct: 39 }, { year: 2024, actual_lift_pct: 42 }] },
    { event_id: 'summer-holiday-2026', category: 'Snacks & Biscuits', expected_lift_pct: 35, peak_offset_days: 7, historical_lifts: [{ year: 2025, actual_lift_pct: 34 }, { year: 2024, actual_lift_pct: 37 }] },
    // ── Year-End Sale ──────────────────────────────────────────────────────
    { event_id: 'year-end-sale-2026', category: 'Snacks & Biscuits', expected_lift_pct: 55, peak_offset_days: 0, historical_lifts: [{ year: 2025, actual_lift_pct: 53 }, { year: 2024, actual_lift_pct: 57 }] },
    { event_id: 'year-end-sale-2026', category: 'Beverages',         expected_lift_pct: 50, peak_offset_days: 0, historical_lifts: [{ year: 2025, actual_lift_pct: 48 }, { year: 2024, actual_lift_pct: 52 }] },
    { event_id: 'year-end-sale-2026', category: 'Personal Care',     expected_lift_pct: 40, peak_offset_days: 0, historical_lifts: [{ year: 2025, actual_lift_pct: 39 }, { year: 2024, actual_lift_pct: 42 }] },
  ],

  cultural_patterns: {
    salary_week_days: [1, 2, 3, 4, 5, 6, 7],
    monsoon_months: [6, 7, 8, 9],
    ipl_season: { start: '2027-03-15', end: '2027-05-28' },
    school_summer_holiday: { start: '2026-05-10', end: '2026-06-30' },
    weekend_days: [0, 6],
  },
};
