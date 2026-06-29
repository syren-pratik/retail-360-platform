// Apparel tenant color palette — per spec §4.
// Each map is Record<string, string>. Use getApparelColor(map, key) for safe fallback.

export const DEFAULT_APPAREL_COLOR = '#94A3B8';

export const DEPT_COLORS: Record<string, string> = {
  "Women's":      '#EC4899',
  "Men's":        '#1E40AF',
  "Kids'":        '#14B8A6',
  Athletic:       '#3B82F6',
  Footwear:       '#F97316',
  Accessories:    '#A855F7',
  Outerwear:      '#0EA5E9',
  Dresses:        '#DB2777',
};

export const SEGMENT_COLORS: Record<string, string> = {
  'Fashion Forward':     '#DB2777',
  'Athletic Enthusiast': '#3B82F6',
  'Value Shopper':       '#10B981',
  'Brand Loyalist':      '#7C3AED',
  Returner:              '#F97316',
  Lapsed:                '#94A3B8',
  Casual:                '#64748B',
  New:                   '#06B6D4',
};

export const LOYALTY_COLORS: Record<string, string> = {
  Elite:   '#6366F1',
  Reward:  '#F59E0B',
  Insider: '#64748B',
  Member:  '#A3A3A3',
  Guest:   '#D4D4D8',
};

export const RETURN_REASON_COLORS: Record<string, string> = {
  Fit:            '#F59E0B',
  Style:          '#A855F7',
  Quality:        '#EF4444',
  'Wrong Item':   '#F97316',
  Damaged:        '#DC2626',
  'Changed Mind': '#94A3B8',
};

export const CHANNEL_COLORS: Record<string, string> = {
  'In-Store':    '#1E40AF',
  Web:           '#3B82F6',
  App:           '#8B5CF6',
  Curbside:      '#10B981',
  Marketplace:   '#F59E0B',
};

// Brand colors — derived from brand category/tier. Top 25 brands per spec §1.3.
export const BRAND_COLORS: Record<string, string> = {
  "Levi's":          '#1E40AF',
  Wrangler:          '#92400E',
  Lee:               '#78350F',
  Madewell:          '#9D174D',
  Nike:              '#111111',
  Adidas:            '#000000',
  'Under Armour':    '#DC2626',
  Lululemon:         '#DB2777',
  'New Balance':     '#374151',
  'H&M':             '#EF4444',
  Zara:              '#1F2937',
  Uniqlo:            '#B91C1C',
  'Forever 21':      '#F59E0B',
  'Old Navy':        '#1D4ED8',
  Gap:               '#1E3A8A',
  'Banana Republic': '#525252',
  'J.Crew':          '#7C2D12',
  "Carter's":        '#F59E0B',
  "OshKosh B'gosh":  '#16A34A',
  Vans:              '#111111',
  Converse:          '#7F1D1D',
  'Dr. Martens':     '#451A03',
  Coach:             '#78350F',
  Fossil:            '#92400E',
  'Ray-Ban':         '#000000',
  Herschel:          '#1E3A8A',
};

/** Safe accessor with fallback for unknown keys. */
export function getApparelColor(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return DEFAULT_APPAREL_COLOR;
  return map[key] ?? DEFAULT_APPAREL_COLOR;
}

// ── Inventory / Supply additions (Phase D sweep) ──────────────────────────

/** Apparel lifecycle stage colors — Intro → Core → Markdown → Clearance. */
export const LIFECYCLE_STAGE_COLORS: Record<string, string> = {
  Intro:       '#06B6D4',
  Core:        '#10B981',
  'Markdown 1':'#FBBF24',
  'Markdown 2':'#F59E0B',
  'Markdown 3':'#F97316',
  Clearance:   '#DC2626',
};

/** ABCD velocity classes — A (fastest) → D (slowest). */
export const VELOCITY_ABCD_COLORS: Record<string, string> = {
  A: '#16A34A',
  B: '#3B82F6',
  C: '#F59E0B',
  D: '#DC2626',
};

/** Apparel season tags. */
export const SEASON_TAG_COLORS: Record<string, string> = {
  'Spring/Summer': '#FBBF24',
  'Fall/Winter':   '#1E40AF',
  Holiday:         '#DC2626',
  'Back-to-School':'#7C3AED',
  Resort:          '#06B6D4',
  Core:            '#64748B',
};

// ── Price-Intel additions (Phase D sweep) ──────────────────────────

/** Apparel markdown cadence step colors per Price Intel spec §1.2 / §5.2. */
export const APPAREL_MARKDOWN_STEP_COLORS: Record<string, string> = {
  full_price: '#10B981', // emerald
  md25:       '#84CC16', // lime
  md40:       '#EAB308', // yellow
  md60:       '#F97316', // orange
  md80:       '#EF4444', // red
  clearance:  '#94A3B8', // slate
  // Display-label aliases (used by some chart components)
  'Full Price': '#10B981',
  '25% off':    '#84CC16',
  '40% off':    '#EAB308',
  '60% off':    '#F97316',
  '80% off':    '#EF4444',
  Clearance:    '#94A3B8',
};

/** Apparel promo mechanic colors per Price Intel spec §1.3 / §5.2. */
export const APPAREL_PROMO_MECHANIC_COLORS: Record<string, string> = {
  bogo_50:     '#3B82F6',
  b2g1_half:   '#6366F1',
  pct_off:     '#10B981',
  dollar_off:  '#F59E0B',
  bundle:      '#A855F7',
  gwp:         '#EC4899',
  tiered:      '#06B6D4',
  free_ship:   '#84CC16',
  member_excl: '#F43F5E',
  // Label aliases
  'BOGO 50%':         '#3B82F6',
  'B2G1 Half':        '#6366F1',
  '% Off':            '#10B981',
  '$ Off':            '#F59E0B',
  Bundle:             '#A855F7',
  GWP:                '#EC4899',
  Tiered:             '#06B6D4',
  'Free Ship':        '#84CC16',
  'Member Exclusive': '#F43F5E',
};

/** US apparel competitor colors per Price Intel spec §1.4 / §5.2. */
export const APPAREL_COMPETITOR_COLORS: Record<string, string> = {
  AMZN:  '#FF9900',
  TGT:   '#CC0000',
  WMT:   '#0071CE',
  MACYS: '#E21A2C',
  NORD:  '#000000',
  OLDN:  '#0033A0',
  HM:    '#E50010',
  UNQ:   '#FF0000',
  ASOS:  '#1A1A1A',
  SHEIN: '#2A2A2A',
  // Name aliases
  Amazon:    '#FF9900',
  Target:    '#CC0000',
  Walmart:   '#0071CE',
  "Macy's":  '#E21A2C',
  Nordstrom: '#000000',
  'Old Navy':'#0033A0',
  'H&M':     '#E50010',
  Uniqlo:    '#FF0000',
  Shein:     '#2A2A2A',
};

/** Apparel department colors keyed on full apparel dept names from
 *  dimensions-apparel.json. Covers all Phase C generator outputs. */
export const APPAREL_DEPT_COLORS: Record<string, string> = {
  "Women's Tops":       '#EC4899',
  "Women's Bottoms":    '#DB2777',
  "Women's Dresses":    '#BE185D',
  "Women's Outerwear":  '#9D174D',
  "Men's Tops":         '#1E40AF',
  "Men's Bottoms":      '#1D4ED8',
  "Men's Denim":        '#1E3A8A',
  "Men's Outerwear":    '#312E81',
  "Kids' Apparel":      '#14B8A6',
  "Kids' Footwear":     '#0D9488',
  "Athletic Apparel":   '#3B82F6',
  "Athletic Footwear":  '#2563EB',
  Footwear:             '#F97316',
  Accessories:          '#A855F7',
  Outerwear:            '#0EA5E9',
  Dresses:              '#DB2777',
  Denim:                '#1E3A8A',
  Activewear:           '#3B82F6',
  Intimates:            '#F472B6',
  Sleepwear:            '#A78BFA',
};
