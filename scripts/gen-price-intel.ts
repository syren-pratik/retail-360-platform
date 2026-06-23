#!/usr/bin/env ts-node
/**
 * Sprint P1 generator — Price Intelligence data architecture.
 *   cache/price_intel/core.json
 *   cache/price_intel/precomputed.json
 *   cache/price_intel/sku_detail/*.json  (all SKUs)
 *
 * Run: npm run gen:price-intel
 */

import * as fs from 'fs';
import * as path from 'path';

const GEN_START = Date.now();

// ─── Constants ────────────────────────────────────────────────────────────────

const SEED = 42;
const ANCHOR = '2026-05-17';

// ─── PRNG (Mulberry32) ────────────────────────────────────────────────────────

let _s = SEED;
function rng(): number {
  _s = (_s + 0x6d2b79f5) >>> 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rand(lo: number, hi: number): number { return lo + rng() * (hi - lo); }
function randInt(lo: number, hi: number): number { return lo + Math.floor(rng() * (hi - lo + 1)); }
function gaussian(mean: number, std: number): number {
  const u1 = Math.max(1e-10, rng()), u2 = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }
function round2(v: number): number { return Math.round(v * 100) / 100; }
function pickOne<T>(arr: T[]): T { return arr[Math.floor(rng() * arr.length)]; }

// ─── Date helpers ─────────────────────────────────────────────────────────────

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

// ─── Model constants ──────────────────────────────────────────────────────────

const MAX_INCREASE = 0.15;
const MAX_DECREASE = 0.10;
const PRICE_CHANGE_THRESHOLD = 0.05;

const DEPT_FLOOR: Record<string, number> = {
  'Grocery & Staples':  0.22,
  'Beverages':          0.26,
  'Dairy & Frozen':     0.18,
  'Snacks & Biscuits':  0.28,
  'Personal Care':      0.34,
};

// Low-substitute → inelastic; moderate → moderate; high/default → elastic
const LOW_SUB_CATS  = new Set(['Atta & Flours', 'Dal & Pulses', 'Rice', 'Sugar & Salt']);
const MOD_SUB_CATS  = new Set(['Edible Oil', 'Spices & Masala', 'Tea', 'Milk & Curd', 'Butter & Ghee', 'Ghee & Oils', 'Water & Others']);

function assignElasticity(vel: 'A'|'B'|'C', cat: string, festSens: boolean): number {
  if (vel === 'C') return -1.31;
  if (vel === 'A') {
    if (LOW_SUB_CATS.has(cat))  return gaussian(-0.28, 0.02);
    if (MOD_SUB_CATS.has(cat))  return gaussian(-0.52, 0.03);
    return gaussian(-0.91, 0.05);
  }
  // B
  if (festSens) return gaussian(-0.65, 0.04);
  return gaussian(-0.74, 0.04);
}

// ─── Product catalog ──────────────────────────────────────────────────────────

type VelClass = 'A' | 'B' | 'C';

interface ProductTemplate {
  name: string; dept: string; cat: string; sub: string; mrp: number; vel: VelClass;
}

const CATALOG: ProductTemplate[] = [
  // ── Grocery & Staples ──────────────────────────────────────────────────────
  // Atta & Flours
  { name: 'Aashirvaad Atta 5kg',        dept: 'Grocery & Staples', cat: 'Atta & Flours',    sub: 'Wheat Flour',  mrp: 265, vel: 'A' },
  { name: 'Aashirvaad Atta 10kg',       dept: 'Grocery & Staples', cat: 'Atta & Flours',    sub: 'Wheat Flour',  mrp: 520, vel: 'B' },
  { name: 'Pillsbury Atta 5kg',         dept: 'Grocery & Staples', cat: 'Atta & Flours',    sub: 'Wheat Flour',  mrp: 258, vel: 'A' },
  { name: 'Fortune Atta 5kg',           dept: 'Grocery & Staples', cat: 'Atta & Flours',    sub: 'Wheat Flour',  mrp: 248, vel: 'B' },
  { name: 'Rajdhani Atta 5kg',          dept: 'Grocery & Staples', cat: 'Atta & Flours',    sub: 'Wheat Flour',  mrp: 241, vel: 'B' },
  { name: 'Shakti Bhog Atta 5kg',       dept: 'Grocery & Staples', cat: 'Atta & Flours',    sub: 'Wheat Flour',  mrp: 235, vel: 'C' },
  { name: 'Nature Fresh Chakki Atta 5kg', dept: 'Grocery & Staples', cat: 'Atta & Flours',  sub: 'Wheat Flour',  mrp: 262, vel: 'C' },
  { name: 'Patanjali Atta 5kg',         dept: 'Grocery & Staples', cat: 'Atta & Flours',    sub: 'Wheat Flour',  mrp: 228, vel: 'C' },
  // Dal & Pulses
  { name: 'Tata Sampann Tur Dal 1kg',   dept: 'Grocery & Staples', cat: 'Dal & Pulses',     sub: 'Tur Dal',      mrp: 142, vel: 'A' },
  { name: 'Tata Sampann Chana Dal 1kg', dept: 'Grocery & Staples', cat: 'Dal & Pulses',     sub: 'Chana Dal',    mrp: 105, vel: 'A' },
  { name: 'Tata Sampann Moong Dal 1kg', dept: 'Grocery & Staples', cat: 'Dal & Pulses',     sub: 'Moong Dal',    mrp: 138, vel: 'B' },
  { name: 'Patanjali Tur Dal 1kg',      dept: 'Grocery & Staples', cat: 'Dal & Pulses',     sub: 'Tur Dal',      mrp: 135, vel: 'B' },
  { name: 'Organic India Tur Dal 500g', dept: 'Grocery & Staples', cat: 'Dal & Pulses',     sub: 'Tur Dal',      mrp: 85,  vel: 'C' },
  { name: 'Vedaka Masoor Dal 1kg',      dept: 'Grocery & Staples', cat: 'Dal & Pulses',     sub: 'Masoor Dal',   mrp: 118, vel: 'C' },
  { name: 'Daawat Yellow Moong 1kg',    dept: 'Grocery & Staples', cat: 'Dal & Pulses',     sub: 'Moong Dal',    mrp: 132, vel: 'C' },
  // Rice
  { name: 'India Gate Basmati 5kg',     dept: 'Grocery & Staples', cat: 'Rice',             sub: 'Basmati',      mrp: 478, vel: 'A' },
  { name: 'India Gate Classic 1kg',     dept: 'Grocery & Staples', cat: 'Rice',             sub: 'Basmati',      mrp: 108, vel: 'A' },
  { name: 'Daawat Basmati Rice 1kg',    dept: 'Grocery & Staples', cat: 'Rice',             sub: 'Basmati',      mrp: 102, vel: 'B' },
  { name: 'Kohinoor Basmati 5kg',       dept: 'Grocery & Staples', cat: 'Rice',             sub: 'Basmati',      mrp: 458, vel: 'B' },
  { name: '24 Mantra Sona Masoori 5kg', dept: 'Grocery & Staples', cat: 'Rice',             sub: 'Sona Masoori', mrp: 385, vel: 'C' },
  { name: 'Fortune Sona Masoori 5kg',   dept: 'Grocery & Staples', cat: 'Rice',             sub: 'Sona Masoori', mrp: 368, vel: 'C' },
  { name: 'Amira Basmati Rice 1kg',     dept: 'Grocery & Staples', cat: 'Rice',             sub: 'Basmati',      mrp: 95,  vel: 'C' },
  // Edible Oil
  { name: 'Fortune Sunflower Oil 1L',   dept: 'Grocery & Staples', cat: 'Edible Oil',       sub: 'Sunflower Oil', mrp: 175, vel: 'A' },
  { name: 'Fortune Sunflower Oil 5L',   dept: 'Grocery & Staples', cat: 'Edible Oil',       sub: 'Sunflower Oil', mrp: 838, vel: 'A' },
  { name: 'Saffola Gold 1L',            dept: 'Grocery & Staples', cat: 'Edible Oil',       sub: 'Blended Oil',   mrp: 195, vel: 'A' },
  { name: 'Saffola Active 1L',          dept: 'Grocery & Staples', cat: 'Edible Oil',       sub: 'Blended Oil',   mrp: 188, vel: 'B' },
  { name: 'Dhara Refined Oil 1L',       dept: 'Grocery & Staples', cat: 'Edible Oil',       sub: 'Sunflower Oil', mrp: 168, vel: 'B' },
  { name: 'Sundrop Sunflower Oil 1L',   dept: 'Grocery & Staples', cat: 'Edible Oil',       sub: 'Sunflower Oil', mrp: 172, vel: 'B' },
  { name: 'Patanjali Mustard Oil 1L',   dept: 'Grocery & Staples', cat: 'Edible Oil',       sub: 'Mustard Oil',   mrp: 145, vel: 'C' },
  { name: 'Engine Mustard Oil 1L',      dept: 'Grocery & Staples', cat: 'Edible Oil',       sub: 'Mustard Oil',   mrp: 138, vel: 'C' },
  // Spices
  { name: 'MDH Chana Masala 100g',      dept: 'Grocery & Staples', cat: 'Spices & Masala',  sub: 'Blended Masala', mrp: 65, vel: 'A' },
  { name: 'MDH Kitchen King 100g',      dept: 'Grocery & Staples', cat: 'Spices & Masala',  sub: 'Blended Masala', mrp: 72, vel: 'B' },
  { name: 'Everest Garam Masala 100g',  dept: 'Grocery & Staples', cat: 'Spices & Masala',  sub: 'Blended Masala', mrp: 55, vel: 'A' },
  { name: 'Everest Rajma Masala 50g',   dept: 'Grocery & Staples', cat: 'Spices & Masala',  sub: 'Blended Masala', mrp: 35, vel: 'B' },
  { name: 'Catch Turmeric Powder 200g', dept: 'Grocery & Staples', cat: 'Spices & Masala',  sub: 'Single Spice',   mrp: 72, vel: 'B' },
  { name: 'Patanjali Haldi Powder 100g',dept: 'Grocery & Staples', cat: 'Spices & Masala',  sub: 'Single Spice',   mrp: 42, vel: 'C' },
  { name: 'MDH Coriander Powder 200g',  dept: 'Grocery & Staples', cat: 'Spices & Masala',  sub: 'Single Spice',   mrp: 68, vel: 'C' },
  { name: 'Catch Cumin Powder 100g',    dept: 'Grocery & Staples', cat: 'Spices & Masala',  sub: 'Single Spice',   mrp: 58, vel: 'C' },
  // Sugar & Salt and Other Grocery
  { name: 'Tata Salt 1kg',              dept: 'Grocery & Staples', cat: 'Sugar & Salt',     sub: 'Salt',           mrp: 22,  vel: 'A' },
  { name: 'i-Shakkar Sugar 1kg',        dept: 'Grocery & Staples', cat: 'Sugar & Salt',     sub: 'Sugar',          mrp: 48,  vel: 'A' },
  { name: 'Madhur Sugar 5kg',           dept: 'Grocery & Staples', cat: 'Sugar & Salt',     sub: 'Sugar',          mrp: 228, vel: 'B' },
  { name: 'Tata Rock Salt 1kg',         dept: 'Grocery & Staples', cat: 'Sugar & Salt',     sub: 'Salt',           mrp: 28,  vel: 'B' },
  { name: 'Maggi Noodles 4pk',          dept: 'Grocery & Staples', cat: 'Packaged Foods',   sub: 'Instant Noodles',mrp: 68,  vel: 'A' },
  { name: 'Kellogg\'s Corn Flakes 475g',dept: 'Grocery & Staples', cat: 'Packaged Foods',   sub: 'Breakfast Cereal',mrp: 238, vel: 'B' },
  { name: 'Quaker Oats 500g',           dept: 'Grocery & Staples', cat: 'Packaged Foods',   sub: 'Breakfast Cereal',mrp: 158, vel: 'B' },
  { name: 'Cadbury Bournvita 500g',     dept: 'Grocery & Staples', cat: 'Packaged Foods',   sub: 'Health Drink',   mrp: 285, vel: 'A' },
  { name: 'Horlicks Original 500g',     dept: 'Grocery & Staples', cat: 'Packaged Foods',   sub: 'Health Drink',   mrp: 265, vel: 'B' },
  { name: 'Complan Chocolate 500g',     dept: 'Grocery & Staples', cat: 'Packaged Foods',   sub: 'Health Drink',   mrp: 312, vel: 'C' },
  { name: 'Boost Chocolate Malt 500g',  dept: 'Grocery & Staples', cat: 'Packaged Foods',   sub: 'Health Drink',   mrp: 252, vel: 'C' },
  { name: 'Kissan Mixed Fruit Jam 500g',dept: 'Grocery & Staples', cat: 'Packaged Foods',   sub: 'Jam & Spreads',  mrp: 145, vel: 'B' },
  { name: 'MTR Rava Idli Mix 500g',     dept: 'Grocery & Staples', cat: 'Packaged Foods',   sub: 'Ready Mix',      mrp: 95,  vel: 'C' },
  { name: 'Parachute Coconut Oil 200ml',dept: 'Grocery & Staples', cat: 'Edible Oil',       sub: 'Coconut Oil',    mrp: 95,  vel: 'B' },
  { name: 'Figaro Olive Oil 250ml',     dept: 'Grocery & Staples', cat: 'Edible Oil',       sub: 'Olive Oil',      mrp: 285, vel: 'C' },
  { name: 'Tata Sampann Besan 500g',    dept: 'Grocery & Staples', cat: 'Atta & Flours',    sub: 'Gram Flour',     mrp: 65,  vel: 'B' },

  // ── Beverages ──────────────────────────────────────────────────────────────
  // Tea
  { name: 'Tata Tea Premium 500g',      dept: 'Beverages', cat: 'Tea',              sub: 'Loose Leaf Tea',  mrp: 242, vel: 'A' },
  { name: 'Red Label Natural Care 500g',dept: 'Beverages', cat: 'Tea',              sub: 'Loose Leaf Tea',  mrp: 258, vel: 'A' },
  { name: 'Taaza Tea 500g',             dept: 'Beverages', cat: 'Tea',              sub: 'Loose Leaf Tea',  mrp: 198, vel: 'B' },
  { name: 'Wagh Bakri Tea 500g',        dept: 'Beverages', cat: 'Tea',              sub: 'Loose Leaf Tea',  mrp: 235, vel: 'B' },
  { name: 'Patanjali Green Tea 100g',   dept: 'Beverages', cat: 'Tea',              sub: 'Green Tea',       mrp: 145, vel: 'C' },
  { name: 'Society Tea Premium 500g',   dept: 'Beverages', cat: 'Tea',              sub: 'Loose Leaf Tea',  mrp: 265, vel: 'C' },
  { name: 'Girnar Green Tea 36 bags',   dept: 'Beverages', cat: 'Tea',              sub: 'Green Tea',       mrp: 135, vel: 'C' },
  { name: 'Lipton Yellow Label 250g',   dept: 'Beverages', cat: 'Tea',              sub: 'Loose Leaf Tea',  mrp: 148, vel: 'C' },
  // Coffee
  { name: 'Nescafe Classic 200g',       dept: 'Beverages', cat: 'Coffee',           sub: 'Instant Coffee',  mrp: 485, vel: 'A' },
  { name: 'Bru Instant Coffee 200g',    dept: 'Beverages', cat: 'Coffee',           sub: 'Instant Coffee',  mrp: 285, vel: 'A' },
  { name: 'BRU Gold 200g',              dept: 'Beverages', cat: 'Coffee',           sub: 'Instant Coffee',  mrp: 425, vel: 'B' },
  { name: 'Tata Coffee Premium 200g',   dept: 'Beverages', cat: 'Coffee',           sub: 'Instant Coffee',  mrp: 265, vel: 'C' },
  { name: 'Davidoff Espresso 100g',     dept: 'Beverages', cat: 'Coffee',           sub: 'Premium Coffee',  mrp: 695, vel: 'C' },
  // Soft Drinks
  { name: 'Coca-Cola 750ml',            dept: 'Beverages', cat: 'Soft Drinks',      sub: 'Cola',            mrp: 45,  vel: 'A' },
  { name: 'Pepsi 750ml',                dept: 'Beverages', cat: 'Soft Drinks',      sub: 'Cola',            mrp: 45,  vel: 'A' },
  { name: 'Thums Up 750ml',             dept: 'Beverages', cat: 'Soft Drinks',      sub: 'Cola',            mrp: 45,  vel: 'A' },
  { name: 'Sprite 750ml',               dept: 'Beverages', cat: 'Soft Drinks',      sub: 'Lime',            mrp: 42,  vel: 'B' },
  { name: 'Limca 750ml',                dept: 'Beverages', cat: 'Soft Drinks',      sub: 'Lime',            mrp: 40,  vel: 'B' },
  { name: '7UP 750ml',                  dept: 'Beverages', cat: 'Soft Drinks',      sub: 'Lime',            mrp: 40,  vel: 'B' },
  { name: 'Maaza Mango 1.2L',           dept: 'Beverages', cat: 'Soft Drinks',      sub: 'Mango',           mrp: 55,  vel: 'A' },
  { name: 'Frooti Mango 1.2L',          dept: 'Beverages', cat: 'Soft Drinks',      sub: 'Mango',           mrp: 52,  vel: 'B' },
  { name: 'Real Fruit Power Orange 1L', dept: 'Beverages', cat: 'Soft Drinks',      sub: 'Juice',           mrp: 128, vel: 'B' },
  { name: 'Tropicana Orange 1L',        dept: 'Beverages', cat: 'Soft Drinks',      sub: 'Juice',           mrp: 135, vel: 'C' },
  { name: 'Paper Boat Aam Panna 200ml', dept: 'Beverages', cat: 'Soft Drinks',      sub: 'Traditional',     mrp: 25,  vel: 'C' },
  { name: 'Sting Energy Drink 250ml',   dept: 'Beverages', cat: 'Soft Drinks',      sub: 'Energy Drink',    mrp: 30,  vel: 'C' },
  // Water & Others
  { name: 'Bisleri Water 1L',           dept: 'Beverages', cat: 'Water & Others',   sub: 'Packaged Water',  mrp: 20,  vel: 'A' },
  { name: 'Kinley Water 1L',            dept: 'Beverages', cat: 'Water & Others',   sub: 'Packaged Water',  mrp: 20,  vel: 'A' },
  { name: 'Bailley Water 1L',           dept: 'Beverages', cat: 'Water & Others',   sub: 'Packaged Water',  mrp: 18,  vel: 'B' },
  { name: 'Aquafina Water 1L',          dept: 'Beverages', cat: 'Water & Others',   sub: 'Packaged Water',  mrp: 22,  vel: 'B' },
  { name: 'Bisleri Water 2L',           dept: 'Beverages', cat: 'Water & Others',   sub: 'Packaged Water',  mrp: 30,  vel: 'B' },
  { name: 'Red Bull 250ml',             dept: 'Beverages', cat: 'Water & Others',   sub: 'Energy Drink',    mrp: 125, vel: 'C' },
  { name: 'Monster Energy 350ml',       dept: 'Beverages', cat: 'Water & Others',   sub: 'Energy Drink',    mrp: 125, vel: 'C' },
  { name: 'Amul Kool Milk 200ml',       dept: 'Beverages', cat: 'Water & Others',   sub: 'Flavoured Milk',  mrp: 25,  vel: 'B' },
  { name: 'Amul Lassi 200ml',           dept: 'Beverages', cat: 'Water & Others',   sub: 'Flavoured Milk',  mrp: 30,  vel: 'B' },
  { name: 'Nescafe Ready-to-Drink 180ml',dept:'Beverages', cat: 'Coffee',           sub: 'RTD Coffee',      mrp: 35,  vel: 'B' },

  // ── Dairy & Frozen ─────────────────────────────────────────────────────────
  // Milk
  { name: 'Amul Taaza Toned Milk 1L',   dept: 'Dairy & Frozen', cat: 'Milk & Curd',      sub: 'Toned Milk',    mrp: 62,  vel: 'A' },
  { name: 'Mother Dairy Toned Milk 1L', dept: 'Dairy & Frozen', cat: 'Milk & Curd',      sub: 'Toned Milk',    mrp: 60,  vel: 'A' },
  { name: 'Nandini Toned Milk 1L',      dept: 'Dairy & Frozen', cat: 'Milk & Curd',      sub: 'Toned Milk',    mrp: 58,  vel: 'A' },
  { name: 'Aavin Toned Milk 500ml',     dept: 'Dairy & Frozen', cat: 'Milk & Curd',      sub: 'Toned Milk',    mrp: 28,  vel: 'B' },
  { name: 'Amul Slim & Trim Milk 1L',   dept: 'Dairy & Frozen', cat: 'Milk & Curd',      sub: 'Toned Milk',    mrp: 72,  vel: 'B' },
  { name: 'Mother Dairy Full Cream 1L', dept: 'Dairy & Frozen', cat: 'Milk & Curd',      sub: 'Full Cream',    mrp: 72,  vel: 'B' },
  // Curd & Paneer
  { name: 'Amul Dahi 400g',             dept: 'Dairy & Frozen', cat: 'Milk & Curd',      sub: 'Curd',          mrp: 52,  vel: 'A' },
  { name: 'Mother Dairy Dahi 400g',     dept: 'Dairy & Frozen', cat: 'Milk & Curd',      sub: 'Curd',          mrp: 50,  vel: 'A' },
  { name: 'Nestle Nesfruta Dahi 400g',  dept: 'Dairy & Frozen', cat: 'Milk & Curd',      sub: 'Curd',          mrp: 58,  vel: 'B' },
  { name: 'Amul Fresh Paneer 200g',     dept: 'Dairy & Frozen', cat: 'Milk & Curd',      sub: 'Paneer',        mrp: 85,  vel: 'A' },
  { name: 'Mother Dairy Paneer 200g',   dept: 'Dairy & Frozen', cat: 'Milk & Curd',      sub: 'Paneer',        mrp: 82,  vel: 'B' },
  { name: 'Go Cheese Spread 180g',      dept: 'Dairy & Frozen', cat: 'Milk & Curd',      sub: 'Cheese',        mrp: 145, vel: 'C' },
  { name: 'Britannia Cheese Slices 200g',dept:'Dairy & Frozen', cat: 'Milk & Curd',      sub: 'Cheese',        mrp: 135, vel: 'C' },
  // Butter & Ghee
  { name: 'Amul Butter 500g',           dept: 'Dairy & Frozen', cat: 'Butter & Ghee',    sub: 'Butter',        mrp: 285, vel: 'A' },
  { name: 'Britannia Butter 500g',      dept: 'Dairy & Frozen', cat: 'Butter & Ghee',    sub: 'Butter',        mrp: 275, vel: 'B' },
  { name: 'Patanjali Cow Ghee 1L',      dept: 'Dairy & Frozen', cat: 'Butter & Ghee',    sub: 'Ghee',          mrp: 445, vel: 'B' },
  { name: 'Amul Pure Ghee 1L',          dept: 'Dairy & Frozen', cat: 'Butter & Ghee',    sub: 'Ghee',          mrp: 568, vel: 'A' },
  { name: 'Gowardhan Ghee 1L',          dept: 'Dairy & Frozen', cat: 'Butter & Ghee',    sub: 'Ghee',          mrp: 532, vel: 'C' },
  // Ice Cream
  { name: 'Amul Vanilla Magic 500ml',   dept: 'Dairy & Frozen', cat: 'Ice Cream',        sub: 'Family Pack',   mrp: 145, vel: 'B' },
  { name: 'Kwality Walls Mango 700ml',  dept: 'Dairy & Frozen', cat: 'Ice Cream',        sub: 'Family Pack',   mrp: 165, vel: 'B' },
  { name: 'Amul Strawberry Bar 6pk',    dept: 'Dairy & Frozen', cat: 'Ice Cream',        sub: 'Bar',           mrp: 120, vel: 'C' },
  { name: 'Kwality Walls Cornetto 4pk', dept: 'Dairy & Frozen', cat: 'Ice Cream',        sub: 'Cone',          mrp: 165, vel: 'C' },
  { name: 'Havmor Kulfi 6pk',           dept: 'Dairy & Frozen', cat: 'Ice Cream',        sub: 'Kulfi',         mrp: 148, vel: 'C' },
  // Frozen
  { name: 'McCain French Fries 420g',   dept: 'Dairy & Frozen', cat: 'Frozen Foods',     sub: 'Fries',         mrp: 165, vel: 'B' },
  { name: 'McCain Corn Nuggets 400g',   dept: 'Dairy & Frozen', cat: 'Frozen Foods',     sub: 'Nuggets',       mrp: 175, vel: 'B' },
  { name: 'Godrej Yummiez Nuggets 400g',dept: 'Dairy & Frozen', cat: 'Frozen Foods',     sub: 'Nuggets',       mrp: 185, vel: 'C' },
  { name: 'Sumeru Idli 20pk',           dept: 'Dairy & Frozen', cat: 'Frozen Foods',     sub: 'Ready Meals',   mrp: 95,  vel: 'C' },
  { name: 'ITC MasterChef Paneer 285g', dept: 'Dairy & Frozen', cat: 'Frozen Foods',     sub: 'Ready Meals',   mrp: 155, vel: 'C' },
  { name: 'Safal Frozen Peas 500g',     dept: 'Dairy & Frozen', cat: 'Frozen Foods',     sub: 'Vegetables',    mrp: 78,  vel: 'B' },
  { name: 'Amul Pizza Base 200g',       dept: 'Dairy & Frozen', cat: 'Frozen Foods',     sub: 'Bakery',        mrp: 65,  vel: 'C' },

  // ── Snacks & Biscuits ──────────────────────────────────────────────────────
  // Biscuits
  { name: 'Parle-G 800g',               dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Glucose',      mrp: 62,  vel: 'A' },
  { name: 'Parle-G 40g 2pk',            dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Glucose',      mrp: 15,  vel: 'A' },
  { name: 'Britannia Good Day 250g',     dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Cookies',      mrp: 40,  vel: 'A' },
  { name: 'Britannia Marie Gold 300g',   dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Marie',        mrp: 40,  vel: 'A' },
  { name: 'Britannia NutriChoice 150g',  dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Health',       mrp: 42,  vel: 'B' },
  { name: 'Hide & Seek Fab 120g',        dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Cookies',      mrp: 35,  vel: 'B' },
  { name: 'Bourbon Biscuit 200g',        dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Cream',        mrp: 35,  vel: 'B' },
  { name: 'Tiger Biscuit 300g',          dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Glucose',      mrp: 32,  vel: 'C' },
  { name: 'Sunfeast Dark Fantasy 300g',  dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Cookies',      mrp: 75,  vel: 'B' },
  { name: 'Sunfeast Mom\'s Magic 200g',  dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Cookies',      mrp: 35,  vel: 'C' },
  { name: 'Oreo Original 264g',          dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Cream',        mrp: 75,  vel: 'A' },
  { name: 'McVitie\'s Digestive 400g',   dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Health',       mrp: 95,  vel: 'C' },
  { name: 'Parle Monaco Classic 200g',   dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Salty',        mrp: 35,  vel: 'B' },
  { name: 'Unibic Oatmeal Cookie 75g',   dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Health',       mrp: 30,  vel: 'C' },
  { name: 'Priyagold Classic Cream 150g',dept: 'Snacks & Biscuits', cat: 'Biscuits', sub: 'Cream',        mrp: 20,  vel: 'C' },
  // Chips & Namkeen
  { name: 'Lay\'s Classic Salted 26g',   dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Chips', mrp: 20,  vel: 'A' },
  { name: 'Lay\'s American Style 52g',   dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Chips', mrp: 30,  vel: 'A' },
  { name: 'Kurkure Masala Munch 78g',    dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Extruded',mrp: 30, vel: 'A' },
  { name: 'Bingo Mad Angles 90g',        dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Extruded',mrp: 30, vel: 'A' },
  { name: 'Haldiram\'s Aloo Bhujia 400g',dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Namkeen',mrp: 135, vel: 'A' },
  { name: 'Haldiram\'s Bhujia 400g',     dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Namkeen',mrp: 138, vel: 'A' },
  { name: 'Haldiram\'s Mixture 400g',    dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Namkeen',mrp: 125, vel: 'B' },
  { name: 'Balaji Wafers 45g',           dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Chips', mrp: 20,  vel: 'B' },
  { name: 'Lay\'s Magic Masala 78g',     dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Chips', mrp: 35,  vel: 'B' },
  { name: 'Kurkure Triangles 70g',       dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Extruded',mrp: 28, vel: 'B' },
  { name: 'Pringles Original 107g',      dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Chips', mrp: 99,  vel: 'C' },
  { name: 'Doritos Nacho Cheese 70g',    dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Chips', mrp: 55,  vel: 'C' },
  { name: 'Bikaji Bhujiaa 400g',         dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Namkeen',mrp: 125, vel: 'B' },
  { name: 'Haldiram\'s Khatta Meetha 400g',dept:'Snacks & Biscuits',cat:'Chips & Namkeen',  sub: 'Namkeen',mrp: 128, vel: 'C' },
  { name: 'Bikaji Khatta Meetha 400g',   dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Namkeen',mrp: 120, vel: 'B' },
  // Chocolates
  { name: 'Cadbury Dairy Milk 160g',     dept: 'Snacks & Biscuits', cat: 'Chocolates', sub: 'Milk Choc',   mrp: 115, vel: 'A' },
  { name: 'Kit Kat 4-Finger 41.5g',      dept: 'Snacks & Biscuits', cat: 'Chocolates', sub: 'Wafer Choc',  mrp: 30,  vel: 'A' },
  { name: 'Cadbury 5 Star 40g 2pk',      dept: 'Snacks & Biscuits', cat: 'Chocolates', sub: 'Caramel',     mrp: 30,  vel: 'A' },
  { name: 'Munch Chocolate 4pk',         dept: 'Snacks & Biscuits', cat: 'Chocolates', sub: 'Wafer Choc',  mrp: 30,  vel: 'B' },
  { name: 'Ferrero Rocher 16pc',         dept: 'Snacks & Biscuits', cat: 'Chocolates', sub: 'Premium Choc',mrp: 385, vel: 'C' },
  { name: 'Toblerone 100g',              dept: 'Snacks & Biscuits', cat: 'Chocolates', sub: 'Premium Choc',mrp: 285, vel: 'C' },
  { name: 'Cadbury Temptations 72g',     dept: 'Snacks & Biscuits', cat: 'Chocolates', sub: 'Dark Choc',   mrp: 95,  vel: 'C' },
  { name: 'Milkybar 50g',                dept: 'Snacks & Biscuits', cat: 'Chocolates', sub: 'White Choc',  mrp: 35,  vel: 'B' },
  { name: 'Eclairs 18pc',                dept: 'Snacks & Biscuits', cat: 'Chocolates', sub: 'Candy',       mrp: 30,  vel: 'B' },
  { name: 'Gems 50g',                    dept: 'Snacks & Biscuits', cat: 'Chocolates', sub: 'Candy',       mrp: 40,  vel: 'B' },
  { name: 'Kellogg\'s Chocos 300g',      dept: 'Snacks & Biscuits', cat: 'Chocolates', sub: 'Cereal',      mrp: 155, vel: 'B' },
  { name: 'Haldiram\'s Chana Dal 400g',  dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Namkeen',mrp: 128, vel: 'B' },
  { name: 'Lay\'s Baked 87g',            dept: 'Snacks & Biscuits', cat: 'Chips & Namkeen', sub: 'Baked',  mrp: 40,  vel: 'C' },
  { name: 'DailyDelight Roasted Peanuts 500g',dept:'Snacks & Biscuits',cat:'Chips & Namkeen',sub:'Peanuts',mrp: 95,  vel: 'C' },

  // ── Personal Care ──────────────────────────────────────────────────────────
  // Soap & Body Wash
  { name: 'Dove Body Wash 250ml',        dept: 'Personal Care', cat: 'Soap & Body Wash', sub: 'Body Wash',     mrp: 175, vel: 'A' },
  { name: 'Dove Soap Bar 4pk',           dept: 'Personal Care', cat: 'Soap & Body Wash', sub: 'Soap',          mrp: 135, vel: 'A' },
  { name: 'Lux Soft Touch Soap 4pk',     dept: 'Personal Care', cat: 'Soap & Body Wash', sub: 'Soap',          mrp: 118, vel: 'A' },
  { name: 'Dettol Original Soap 4pk',    dept: 'Personal Care', cat: 'Soap & Body Wash', sub: 'Antiseptic Soap',mrp: 145, vel: 'B' },
  { name: 'Lifebuoy Total 100g 4pk',     dept: 'Personal Care', cat: 'Soap & Body Wash', sub: 'Soap',          mrp: 98,  vel: 'B' },
  { name: 'Pears Transparent Soap 4pk',  dept: 'Personal Care', cat: 'Soap & Body Wash', sub: 'Soap',          mrp: 165, vel: 'C' },
  { name: 'Nivea Cream Soap 4pk',        dept: 'Personal Care', cat: 'Soap & Body Wash', sub: 'Soap',          mrp: 175, vel: 'C' },
  { name: 'Fiama Shower Gel 250ml',      dept: 'Personal Care', cat: 'Soap & Body Wash', sub: 'Body Wash',     mrp: 245, vel: 'C' },
  // Shampoo & Conditioner
  { name: 'Head & Shoulders 340ml',      dept: 'Personal Care', cat: 'Shampoo',          sub: 'Anti-Dandruff', mrp: 295, vel: 'A' },
  { name: 'Pantene Silky Smooth 340ml',  dept: 'Personal Care', cat: 'Shampoo',          sub: 'Repair',        mrp: 265, vel: 'A' },
  { name: 'Sunsilk Thick & Long 340ml',  dept: 'Personal Care', cat: 'Shampoo',          sub: 'Growth',        mrp: 218, vel: 'A' },
  { name: 'Clinic Plus Strong 340ml',    dept: 'Personal Care', cat: 'Shampoo',          sub: 'Strength',      mrp: 178, vel: 'A' },
  { name: 'Dove Intense Repair 340ml',   dept: 'Personal Care', cat: 'Shampoo',          sub: 'Repair',        mrp: 295, vel: 'B' },
  { name: 'Tresemme Smooth 340ml',       dept: 'Personal Care', cat: 'Shampoo',          sub: 'Smooth',        mrp: 285, vel: 'B' },
  { name: 'Biotique Bio Bhringraj 200ml',dept: 'Personal Care', cat: 'Shampoo',          sub: 'Herbal',        mrp: 168, vel: 'C' },
  { name: 'Patanjali Kesh Kanti 200ml',  dept: 'Personal Care', cat: 'Shampoo',          sub: 'Herbal',        mrp: 95,  vel: 'C' },
  // Toothpaste
  { name: 'Colgate MaxFresh 150g 2pk',   dept: 'Personal Care', cat: 'Oral Care',        sub: 'Toothpaste',    mrp: 165, vel: 'A' },
  { name: 'Colgate Vedshakti 150g',      dept: 'Personal Care', cat: 'Oral Care',        sub: 'Herbal Paste',  mrp: 85,  vel: 'A' },
  { name: 'Pepsodent Germicheck 2pk',    dept: 'Personal Care', cat: 'Oral Care',        sub: 'Toothpaste',    mrp: 155, vel: 'B' },
  { name: 'Close-Up Deep Action 150g',   dept: 'Personal Care', cat: 'Oral Care',        sub: 'Toothpaste',    mrp: 95,  vel: 'B' },
  { name: 'Dabur Red Paste 200g',        dept: 'Personal Care', cat: 'Oral Care',        sub: 'Herbal Paste',  mrp: 115, vel: 'B' },
  // Skincare & Deodorant
  { name: 'Vaseline Intensive Care 400ml',dept:'Personal Care', cat: 'Skincare',         sub: 'Body Lotion',   mrp: 265, vel: 'A' },
  { name: 'Nivea Soft Moisturizer 200ml',dept: 'Personal Care', cat: 'Skincare',         sub: 'Face Cream',    mrp: 215, vel: 'A' },
  { name: 'Ponds Light Moisturizer 75g', dept: 'Personal Care', cat: 'Skincare',         sub: 'Face Cream',    mrp: 175, vel: 'B' },
  { name: 'Lakme 9to5 Kajal',            dept: 'Personal Care', cat: 'Skincare',         sub: 'Cosmetics',     mrp: 250, vel: 'B' },
  { name: 'Axe Intense Deodorant 150ml', dept: 'Personal Care', cat: 'Deodorant',        sub: 'Deodorant',     mrp: 185, vel: 'B' },
  { name: 'Wild Stone Forest 150ml',     dept: 'Personal Care', cat: 'Deodorant',        sub: 'Deodorant',     mrp: 175, vel: 'C' },
  { name: 'Engage Moments Deo 150ml',    dept: 'Personal Care', cat: 'Deodorant',        sub: 'Deodorant',     mrp: 185, vel: 'C' },
  { name: 'Parachute Body Lotion 250ml', dept: 'Personal Care', cat: 'Skincare',         sub: 'Body Lotion',   mrp: 158, vel: 'C' },
  // Handwash & Others
  { name: 'Dettol Handwash 200ml',       dept: 'Personal Care', cat: 'Handwash',         sub: 'Antiseptic',    mrp: 95,  vel: 'A' },
  { name: 'Lifebuoy Germ Protect 200ml', dept: 'Personal Care', cat: 'Handwash',         sub: 'Germ Protect',  mrp: 88,  vel: 'A' },
  { name: 'Savlon Surface Spray 200ml',  dept: 'Personal Care', cat: 'Handwash',         sub: 'Disinfectant',  mrp: 125, vel: 'B' },
  { name: 'Harpic Toilet Cleaner 1L',    dept: 'Personal Care', cat: 'Home Care',        sub: 'Toilet Cleaner',mrp: 168, vel: 'B' },
  { name: 'Lysol Disinfectant 400ml',    dept: 'Personal Care', cat: 'Home Care',        sub: 'Disinfectant',  mrp: 385, vel: 'C' },
  { name: 'Colin Glass Cleaner 500ml',   dept: 'Personal Care', cat: 'Home Care',        sub: 'Glass Cleaner', mrp: 128, vel: 'C' },
  { name: 'Domex Toilet Cleaner 500ml',  dept: 'Personal Care', cat: 'Home Care',        sub: 'Toilet Cleaner',mrp: 95,  vel: 'B' },
  { name: 'Maggi Oats Masala 4pc',       dept: 'Snacks & Biscuits', cat: 'Noodles',      sub: 'Oats Noodles',  mrp: 75,  vel: 'B' },
];

// Verify we have exactly 200
if (CATALOG.length !== 200) {
  console.warn(`⚠ CATALOG has ${CATALOG.length} products, expected 200`);
}

// ─── Generate SKUs ────────────────────────────────────────────────────────────

interface SKU {
  sku_id: string;
  product_name: string;
  department: string;
  category: string;
  subcategory: string;
  velocity_class: 'A' | 'B' | 'C';
  mrp_inr: number;
  cost_inr: number;
  current_price_inr: number;
  current_margin_pct: number;
  target_margin_pct: number;
  elasticity: number;
  elasticity_class: 'inelastic' | 'moderate' | 'elastic';
  recommended_price_inr: number;
  price_change_pct: number;
  projected_margin_pct: number;
  revenue_impact_inr: number;
  recommendation_priority: 'High' | 'Medium' | 'Low';
  is_festival_sensitive: boolean;
  is_weather_sensitive: boolean;
  launch_date: string;
  promo_frequency_pct: number;
  weeks_of_supply: number;
  sell_through_pct: number;
  sell_through_target_pct: number;
  inventory_age_bucket: '0-4W' | '5-8W' | '9-12W' | '13W+';
  base_weekly_units: number; // for internal calculations only
}

const FEST_SENSITIVE_CATS = new Set(['Atta & Flours', 'Dal & Pulses', 'Rice', 'Edible Oil', 'Spices & Masala', 'Soft Drinks', 'Biscuits', 'Chocolates']);
const WEATHER_SENSITIVE_CATS = new Set(['Soft Drinks', 'Water & Others', 'Ice Cream', 'Frozen Foods']);
const AGE_BUCKETS: Array<'0-4W' | '5-8W' | '9-12W' | '13W+'> = ['0-4W', '5-8W', '9-12W', '13W+'];

const skus: SKU[] = CATALOG.map((p, idx) => {
  const sku_id = `PRD-${String(idx + 1).padStart(6, '0')}`;
  const floor = DEPT_FLOOR[p.dept] ?? 0.22;
  const target_margin = floor + 0.02; // model targets 2pp above floor

  // Current price: 88-98% of MRP
  const current_price = Math.round(p.mrp * (0.88 + rng() * 0.10));
  // Actual margin: floor ± 8pp
  const actual_margin = clamp(gaussian(floor - 0.02, 0.06), floor - 0.10, floor + 0.08);
  const cost = Math.round(current_price * (1 - actual_margin) * 100) / 100;
  const current_margin_pct = round2((current_price - cost) / current_price);

  const elasticity = round2(assignElasticity(p.vel, p.cat, FEST_SENSITIVE_CATS.has(p.cat)));
  const elasticity_class: 'inelastic'|'moderate'|'elastic' =
    elasticity > -0.3 ? 'inelastic' : elasticity < -0.7 ? 'elastic' : 'moderate';

  // Optimize price
  let rec_price = Math.round(cost / (1 - target_margin));
  rec_price = clamp(rec_price, Math.round(current_price * (1 - MAX_DECREASE)), Math.round(current_price * (1 + MAX_INCREASE)));
  rec_price = Math.min(rec_price, p.mrp);
  const raw_change_pct = (rec_price - current_price) / current_price;
  if (Math.abs(raw_change_pct) < PRICE_CHANGE_THRESHOLD) rec_price = current_price;

  const price_change_pct = round2((rec_price - current_price) / current_price);
  const projected_margin_pct = round2((rec_price - cost) / rec_price);

  // Weekly units by velocity
  const base_weekly_units = p.vel === 'A'
    ? randInt(200, 800)
    : p.vel === 'B' ? randInt(80, 300) : randInt(20, 100);

  // Revenue impact using elasticity
  const volume_change = (rec_price / current_price - 1) * elasticity * base_weekly_units;
  const revenue_impact = Math.round(
    rec_price * (base_weekly_units + volume_change) - current_price * base_weekly_units
  );

  const margin_gap = target_margin - current_margin_pct;
  const recommendation_priority: 'High' | 'Medium' | 'Low' =
    margin_gap > 0.10 && revenue_impact > 0 ? 'High'
    : margin_gap > 0.05 || revenue_impact > 1000 ? 'Medium'
    : 'Low';

  const is_festival_sensitive = FEST_SENSITIVE_CATS.has(p.cat);
  const is_weather_sensitive = WEATHER_SENSITIVE_CATS.has(p.cat);

  // Launch date: 6-36 months ago
  const launch_date = addDays(ANCHOR, -randInt(180, 1080));

  const promo_frequency_pct = round2(rand(5, 65));
  const weeks_of_supply = round2(rand(1.5, 14));
  const sell_through_target = p.dept === 'Dairy & Frozen' ? 85 : p.dept === 'Snacks & Biscuits' ? 78 : 70;
  const sell_through_pct = round2(clamp(gaussian(sell_through_target - 5, 12), 20, 98));

  const age_weights = p.vel === 'A' ? [0.7, 0.2, 0.07, 0.03] : p.vel === 'B' ? [0.5, 0.3, 0.15, 0.05] : [0.35, 0.35, 0.2, 0.1];
  const r = rng();
  let cum = 0; let ageIdx = 0;
  for (let i = 0; i < age_weights.length; i++) { cum += age_weights[i]; if (r < cum) { ageIdx = i; break; } }
  const inventory_age_bucket = AGE_BUCKETS[ageIdx];

  return {
    sku_id, product_name: p.name, department: p.dept, category: p.cat, subcategory: p.sub,
    velocity_class: p.vel, mrp_inr: p.mrp, cost_inr: round2(cost), current_price_inr: current_price,
    current_margin_pct, target_margin_pct: round2(target_margin), elasticity, elasticity_class,
    recommended_price_inr: rec_price, price_change_pct, projected_margin_pct, revenue_impact_inr: revenue_impact,
    recommendation_priority, is_festival_sensitive, is_weather_sensitive, launch_date, promo_frequency_pct,
    weeks_of_supply, sell_through_pct, sell_through_target_pct: sell_through_target,
    inventory_age_bucket, base_weekly_units,
  };
});

// ─── Departments ──────────────────────────────────────────────────────────────

const DEPT_NAMES = Object.keys(DEPT_FLOOR);
const DEPT_CATS: Record<string, Set<string>> = {};
for (const s of skus) {
  if (!DEPT_CATS[s.department]) DEPT_CATS[s.department] = new Set();
  DEPT_CATS[s.department].add(s.category);
}

const departments = DEPT_NAMES.map(name => {
  const ds = skus.filter(s => s.department === name);
  const avg_margin = round2(ds.reduce((a, s) => a + s.current_margin_pct, 0) / ds.length);
  const floor = DEPT_FLOOR[name];
  return {
    name, sku_count: ds.length, margin_floor_pct: floor,
    current_margin_pct: avg_margin, margin_vs_floor: round2(avg_margin - floor),
    promo_roi_index: round2(rand(55, 82)),
    sell_through_pct: round2(ds.reduce((a, s) => a + s.sell_through_pct, 0) / ds.length),
    sell_through_target_pct: name === 'Dairy & Frozen' ? 85 : name === 'Snacks & Biscuits' ? 78 : 70,
    categories: Array.from(DEPT_CATS[name] ?? []),
  };
});

// ─── Model card ───────────────────────────────────────────────────────────────

const avg_current_margin = round2(skus.reduce((a, s) => a + s.current_margin_pct, 0) / skus.length);
const avg_projected_margin = round2(skus.reduce((a, s) => a + s.projected_margin_pct, 0) / skus.length);
const total_revenue_impact = skus.reduce((a, s) => a + s.revenue_impact_inr, 0);
const products_with_increase = skus.filter(s => s.price_change_pct > 0).length;
const products_with_decrease = skus.filter(s => s.price_change_pct < 0).length;

const model_card = {
  experiment: '/Shared/retail_price_optimization',
  target_margin_pct: 0.30,
  max_price_increase_pct: 0.15,
  max_price_decrease_pct: 0.10,
  min_transactions: 100,
  products_analyzed: 200,
  avg_current_margin,
  avg_projected_margin,
  total_revenue_impact,
  products_with_increase,
  products_with_decrease,
};

// ─── Campaigns (12: 8 live, 4 ended) ─────────────────────────────────────────

const MECHANICS: Array<'pct_off'|'bogo'|'bundle'|'multipack'|'cashback'> = ['pct_off','bogo','bundle','multipack','cashback'];
const MECH_NAMES: Record<string, string> = { pct_off: '% Off', bogo: 'BOGO', bundle: 'Bundle Deal', multipack: 'Multipack', cashback: 'Cashback' };

const CAMPAIGN_DEFS = [
  { id:'CAMP-001', name:'Eid Essentials Offer',         mechanic:'pct_off',   dept:'Grocery & Staples',  cat:'Atta & Flours',     budget:1800000, status:'live',   free_rider:58, dip:-12, roi:2.1 },
  { id:'CAMP-002', name:'Loyalty Gold Cashback',        mechanic:'cashback',  dept:'Personal Care',      cat:'Shampoo',           budget:1400000, status:'live',   free_rider:31, dip:-4,  roi:3.7 },
  { id:'CAMP-003', name:'Weekend Snack Bundle',         mechanic:'bundle',    dept:'Snacks & Biscuits',  cat:'Chips & Namkeen',   budget:900000,  status:'live',   free_rider:62, dip:-14, roi:1.4 },
  { id:'CAMP-004', name:'Cola Summer Slam',             mechanic:'pct_off',   dept:'Beverages',          cat:'Soft Drinks',       budget:1200000, status:'live',   free_rider:44, dip:-6,  roi:2.8 },
  { id:'CAMP-005', name:'Dairy Double Value Pack',      mechanic:'multipack', dept:'Dairy & Frozen',     cat:'Milk & Curd',       budget:750000,  status:'live',   free_rider:35, dip:-3,  roi:3.2 },
  { id:'CAMP-006', name:'Oil BOGO Festival Prep',       mechanic:'bogo',      dept:'Grocery & Staples',  cat:'Edible Oil',        budget:1600000, status:'live',   free_rider:57, dip:-11, roi:2.0 },
  { id:'CAMP-007', name:'Biscuit Box Multipack',        mechanic:'multipack', dept:'Snacks & Biscuits',  cat:'Biscuits',          budget:600000,  status:'live',   free_rider:41, dip:-5,  roi:2.9 },
  { id:'CAMP-008', name:'Tea Festive Bundle',           mechanic:'bundle',    dept:'Beverages',          cat:'Tea',               budget:800000,  status:'paused', free_rider:48, dip:-7,  roi:1.8 },
  { id:'CAMP-009', name:'Holi Personal Care Blitz',     mechanic:'pct_off',   dept:'Personal Care',      cat:'Soap & Body Wash',  budget:1100000, status:'ended',  free_rider:52, dip:-9,  roi:2.4 },
  { id:'CAMP-010', name:'Summer Skin Protection Pack',  mechanic:'bundle',    dept:'Personal Care',      cat:'Skincare',          budget:950000,  status:'ended',  free_rider:38, dip:-5,  roi:3.0 },
  { id:'CAMP-011', name:'Frozen Breakfast Launch',      mechanic:'cashback',  dept:'Dairy & Frozen',     cat:'Frozen Foods',      budget:650000,  status:'ended',  free_rider:29, dip:-2,  roi:2.6 },
  { id:'CAMP-012', name:'Premium Biscuit Trial',        mechanic:'pct_off',   dept:'Snacks & Biscuits',  cat:'Biscuits',          budget:500000,  status:'ended',  free_rider:44, dip:-8,  roi:0.72 },
] as const;

// Date ranges (relative to anchor)
const CAMPAIGN_DATES = [
  [addDays(ANCHOR,-7),  addDays(ANCHOR,14)],  // CAMP-001 live
  [addDays(ANCHOR,-14), addDays(ANCHOR,21)],  // CAMP-002 live best
  [addDays(ANCHOR,-3),  addDays(ANCHOR,11)],  // CAMP-003 live
  [addDays(ANCHOR,-10), addDays(ANCHOR,7)],   // CAMP-004 live
  [addDays(ANCHOR,-5),  addDays(ANCHOR,9)],   // CAMP-005 live
  [addDays(ANCHOR,-6),  addDays(ANCHOR,8)],   // CAMP-006 live
  [addDays(ANCHOR,-2),  addDays(ANCHOR,12)],  // CAMP-007 live
  [addDays(ANCHOR,-9),  addDays(ANCHOR,5)],   // CAMP-008 paused
  [addDays(ANCHOR,-45), addDays(ANCHOR,-18)], // CAMP-009 ended
  [addDays(ANCHOR,-38), addDays(ANCHOR,-12)], // CAMP-010 ended
  [addDays(ANCHOR,-30), addDays(ANCHOR,-8)],  // CAMP-011 ended
  [addDays(ANCHOR,-28), addDays(ANCHOR,-7)],  // CAMP-012 ended
];

function getDeptSkus(dept: string, cat: string, n: number): string[] {
  return skus.filter(s => s.department === dept && s.category === cat).slice(0, n).map(s => s.sku_id);
}

const campaigns = CAMPAIGN_DEFS.map((c, i) => {
  const [start, end] = CAMPAIGN_DATES[i];
  const budget = c.budget;
  const days_elapsed = c.status === 'ended' ? 100
    : c.status === 'paused' ? 60
    : Math.max(1, Math.round((new Date(ANCHOR+'T00:00:00Z').getTime() - new Date(start+'T00:00:00Z').getTime()) / 86400000));
  const total_days = Math.max(1, Math.round((new Date(end+'T00:00:00Z').getTime() - new Date(start+'T00:00:00Z').getTime()) / 86400000));
  const spend_pct = c.status === 'ended' ? 0.92 + rng() * 0.08
    : Math.min(0.95, days_elapsed / total_days * (0.9 + rng() * 0.2));
  const spend_to_date = Math.round(budget * spend_pct);
  const incremental = Math.round(spend_to_date * c.roi);
  const gross = Math.round(incremental * (1 + rng() * 0.4));
  const cannib = Math.round(incremental * rand(0.05, 0.18));
  const net_incr = incremental - cannib;
  const lift_pct = round2(rand(8, 42));
  const confidence = round2(rand(0.62, 0.91));
  return {
    campaign_id: c.id, campaign_name: c.name, mechanic: c.mechanic as 'pct_off'|'bogo'|'bundle'|'multipack'|'cashback',
    department: c.dept, category: c.cat, budget_inr: budget, start_date: start, end_date: end,
    status: c.status as 'live'|'ended'|'paused'|'review',
    spend_to_date_inr: spend_to_date, incremental_revenue_inr: incremental,
    gross_promo_revenue_inr: gross, roi: round2(c.roi), free_rider_ratio_pct: c.free_rider,
    post_promo_dip_pct: c.dip, lift_pct, cannibalization_inr: cannib,
    net_incremental_inr: net_incr, confidence,
    affected_skus: getDeptSkus(c.dept, c.cat, 4),
  };
});

// ─── Promo ROI trend (exact values from spec) ─────────────────────────────────

const EXACT_ROI = [2.48,2.61,2.71,2.89,2.95,3.02,3.08,3.15,3.21,3.18,3.28,3.35,3.41,3.52];
const SPEND_BASE = 1800000;
const CAMP_NAMES_CYCLE = ['Eid Essentials Offer', 'Loyalty Gold Cashback', 'Cola Summer Slam', null, 'Weekend Snack Bundle', null, 'Loyalty Gold Cashback', 'Oil BOGO Festival Prep', null, 'Biscuit Box Multipack', null, 'Loyalty Gold Cashback', null, 'Eid Essentials Offer'];

const promo_roi_trend = EXACT_ROI.map((roi, i) => {
  const spend = Math.round(SPEND_BASE * (0.8 + rng() * 0.5));
  return {
    week: i + 1, week_label: `W${i + 1}`, roi, spend_inr: spend,
    incremental_revenue_inr: Math.round(spend * roi),
    goal_roi: 3.0, active_campaign_name: CAMP_NAMES_CYCLE[i] ?? null,
  };
});

// ─── AI suggestions ───────────────────────────────────────────────────────────

const ai_suggestions = [
  {
    id: 'SUG-001', type: 'raise_depth' as const,
    badge_label: 'LIFT +₹2.1L', badge_color: 'green' as const,
    campaign_name: 'Loyalty Gold Cashback',
    sku_or_category: 'Shampoo · Personal Care',
    explanation: 'Free-rider ratio is only 31% — well below category average. Increasing cashback depth from 10% to 15% for loyalty-gated customers projects ₹2.1L incremental revenue with 86% confidence.',
    financial_impact_inr: 210000, confidence: 0.86, action_label: 'Apply',
  },
  {
    id: 'SUG-002', type: 'pause' as const,
    badge_label: 'CUT SPEND −₹84K', badge_color: 'red' as const,
    campaign_name: 'Premium Biscuit Trial',
    sku_or_category: 'Biscuits · Snacks & Biscuits',
    explanation: 'ROI at 0.72× is well below the 3.0× goal. 91% confidence that continuing burns budget with no incremental lift — the buyer cohort has price-anchored at the discounted level.',
    financial_impact_inr: 84000, confidence: 0.91, action_label: 'Apply',
  },
  {
    id: 'SUG-003', type: 'extend' as const,
    badge_label: 'LIFT +₹1.4L', badge_color: 'green' as const,
    campaign_name: 'Dairy Double Value Pack',
    sku_or_category: 'Milk & Curd · Dairy & Frozen',
    explanation: 'ROI at 3.2× is tracking above goal with no post-promo dip detected. Extending for 7 more days while Eid demand is building projects ₹1.4L additional lift at 78% confidence.',
    financial_impact_inr: 140000, confidence: 0.78, action_label: 'Review',
  },
  {
    id: 'SUG-004', type: 'redirect' as const,
    badge_label: 'NET +₹1.8L', badge_color: 'amber' as const,
    campaign_name: 'Oil BOGO Festival Prep',
    sku_or_category: 'Edible Oil → Loyalty Gold Cashback',
    explanation: 'Redirect ₹4.2L of unspent Oil BOGO budget to the Loyalty Cashback campaign. Oil BOGO has 57% free-rider waste vs 31% for Cashback — same spend, ₹1.8L more incremental projected.',
    financial_impact_inr: 180000, confidence: 0.74, action_label: 'Review',
  },
  {
    id: 'SUG-005', type: 'cut_spend' as const,
    badge_label: 'CUT SPEND −₹1.2L', badge_color: 'red' as const,
    campaign_name: 'Eid Essentials Offer',
    sku_or_category: 'Loyal Core segment',
    explanation: 'Loyal Core customers have 71% free-rider ratio on this campaign — they buy Atta regardless. Excluding this segment from the discount saves ₹1.2L with minimal volume impact.',
    financial_impact_inr: 120000, confidence: 0.83, action_label: 'Apply',
  },
];

// ─── Lift by segment ──────────────────────────────────────────────────────────

const lift_by_segment = [
  { segment: 'Elastic switchers',  lift_pct: 41.2, free_rider_ratio_pct: 18.4, bar_width_pct: 100 },
  { segment: 'Occasional buyers',  lift_pct: 28.6, free_rider_ratio_pct: 31.2, bar_width_pct: 69 },
  { segment: 'New-to-brand',       lift_pct: 22.4, free_rider_ratio_pct: 24.8, bar_width_pct: 54 },
  { segment: 'Lapsed',             lift_pct: 17.8, free_rider_ratio_pct: 38.1, bar_width_pct: 43 },
  { segment: 'Loyal core',         lift_pct: 8.4,  free_rider_ratio_pct: 68.2, bar_width_pct: 20 },
];

// ─── Mechanic ROI ─────────────────────────────────────────────────────────────

const mechanic_roi = [
  { mechanic: 'Cashback',    roi: 3.4, color: '#3B82F6', share_pct: 18 },
  { mechanic: 'Bundle',      roi: 2.9, color: '#10B981', share_pct: 22 },
  { mechanic: 'Multipack',   roi: 2.7, color: '#F59E0B', share_pct: 19 },
  { mechanic: '% Off MRP',   roi: 2.3, color: '#6366F1', share_pct: 28 },
  { mechanic: 'BOGO',        roi: 1.8, color: '#F43F5E', share_pct: 13 },
];

// ─── Sell-through heatmap ─────────────────────────────────────────────────────

const HEATMAP_CATS = [
  { cat: 'Edible Oil',     dept: 'Grocery & Staples', target: 68 },
  { cat: 'Atta & Flours',  dept: 'Grocery & Staples', target: 65 },
  { cat: 'Dal & Pulses',   dept: 'Grocery & Staples', target: 65 },
  { cat: 'Rice',           dept: 'Grocery & Staples', target: 63 },
  { cat: 'Tea',            dept: 'Beverages',          target: 72 },
  { cat: 'Coffee',         dept: 'Beverages',          target: 70 },
  { cat: 'Milk & Curd',    dept: 'Dairy & Frozen',     target: 88 },
  { cat: 'Frozen Foods',   dept: 'Dairy & Frozen',     target: 82 },
  { cat: 'Chips & Namkeen',dept: 'Snacks & Biscuits',  target: 78 },
  { cat: 'Biscuits',       dept: 'Snacks & Biscuits',  target: 76 },
  { cat: 'Soft Drinks',    dept: 'Beverages',           target: 74 },
  { cat: 'Spices & Masala',dept: 'Grocery & Staples',  target: 60 },
  { cat: 'Soaps & Body Wash', dept: 'Personal Care',   target: 70 },
  { cat: 'Hair Care',      dept: 'Personal Care',      target: 68 },
  { cat: 'Oral Care',      dept: 'Personal Care',      target: 72 },
];

// W1-W3: 5-25%; W4-W6: 25-50%; W7-W8 (current): 40-75%; W9-W14: 0
function buildHeatmapRow(target: number, isDairy: boolean): number[] {
  const values: number[] = [];
  for (let w = 1; w <= 14; w++) {
    if (w >= 9) { values.push(0); continue; }
    let base: number;
    if (w <= 3)      base = rand(5, 25);
    else if (w <= 6) base = rand(25, 50);
    else             base = rand(isDairy ? 55 : 40, isDairy ? 92 : 75);
    values.push(Math.round(clamp(base + gaussian(0, 4), 2, 99)));
  }
  return values;
}

const sell_through_heatmap = HEATMAP_CATS.map(h => ({
  category: h.cat, department: h.dept,
  values: buildHeatmapRow(h.target, h.dept === 'Dairy & Frozen'),
  target_pct: h.target,
}));

// ─── Markdown queue ───────────────────────────────────────────────────────────

// Every department must have markdown candidates so the department filter
// never produces an empty queue (clients read empty as a broken filter).
const md_urgency = (s: (typeof skus)[number]) =>
  s.weeks_of_supply - s.sell_through_pct / 10;
const md_candidates = [...skus]
  .filter(s => s.weeks_of_supply > 3)
  .sort((a, b) => md_urgency(b) - md_urgency(a));

const low_st_skus: typeof md_candidates = [];
const md_dept_count = new Map<string, number>();
for (const s of md_candidates) {
  const c = md_dept_count.get(s.department) ?? 0;
  if (c < 2) { low_st_skus.push(s); md_dept_count.set(s.department, c + 1); }
}
for (const s of md_candidates) {
  if (low_st_skus.length >= 12) break;
  if (!low_st_skus.includes(s)) low_st_skus.push(s);
}
low_st_skus.sort((a, b) => md_urgency(b) - md_urgency(a));

const markdown_queue = low_st_skus.map((s, i) => {
  const depth_pct = -Math.round(clamp(
    (s.sell_through_target_pct - s.sell_through_pct) * 0.4 + s.weeks_of_supply * 1.5,
    8, 35
  ));
  const rec_price = Math.round(s.current_price_inr * (1 + depth_pct / 100));
  const units_at_risk = Math.round(s.base_weekly_units * s.weeks_of_supply * (1 - s.sell_through_pct / 100));
  const urgency = Math.round(
    (s.weeks_of_supply / 14 * 40) + ((s.sell_through_target_pct - s.sell_through_pct) / 50 * 40) +
    (['9-12W','13W+'].includes(s.inventory_age_bucket) ? 20 : 0)
  );
  return {
    sku_id: s.sku_id, product_name: s.product_name, category: s.category, department: s.department,
    current_sell_through_pct: s.sell_through_pct, target_sell_through_pct: s.sell_through_target_pct,
    days_remaining: randInt(8, 45), weeks_of_supply: s.weeks_of_supply,
    recommended_depth_pct: depth_pct, recommended_price_inr: Math.max(rec_price, Math.round(s.cost_inr * 1.05)),
    units_at_risk, revenue_at_risk_inr: Math.round(units_at_risk * s.current_price_inr),
    urgency_score: clamp(urgency, 10, 95),
    inventory_age_bucket: s.inventory_age_bucket, status: i < 2 ? 'pending' as const : i === 2 ? 'approved' as const : 'pending' as const,
  };
});

// ─── Inventory aging ──────────────────────────────────────────────────────────

const totalUnits = skus.reduce((a, s) => a + s.base_weekly_units * s.weeks_of_supply, 0);
const totalValue = skus.reduce((a, s) => a + s.base_weekly_units * s.weeks_of_supply * s.cost_inr, 0);

const inventory_aging = {
  bucket_0_4w: { units: Math.round(totalUnits * 0.52), value_inr: Math.round(totalValue * 0.52) },
  bucket_5_8w: { units: Math.round(totalUnits * 0.28), value_inr: Math.round(totalValue * 0.28), flag: false },
  bucket_9_12w: { units: Math.round(totalUnits * 0.13), value_inr: Math.round(totalValue * 0.13), flag: true },
  bucket_13w_plus: { units: Math.round(totalUnits * 0.07), value_inr: Math.round(totalValue * 0.07), flag: true },
  insight: '13W+ stock down 41% vs same week last year — markdown acceleration program is working',
};

// ─── Channel performance ──────────────────────────────────────────────────────

const channel_revenue = [4820000, 3240000, 1980000, 1420000, 920000]; // In-Store, Online, Dark Store, QComm, Wholesale
const channel_total = channel_revenue.reduce((a, b) => a + b, 0);
const channel_performance = [
  { channel: 'In-Store',       revenue_inr: channel_revenue[0], revenue_lift_pct: 4.2,  bar_width_pct: 100, baseline_bar_width_pct: 96 },
  { channel: 'Online',         revenue_inr: channel_revenue[1], revenue_lift_pct: 11.8, bar_width_pct: Math.round(channel_revenue[1]/channel_revenue[0]*100), baseline_bar_width_pct: Math.round(channel_revenue[1]/channel_revenue[0]*89) },
  { channel: 'Dark Store',     revenue_inr: channel_revenue[2], revenue_lift_pct: 18.4, bar_width_pct: Math.round(channel_revenue[2]/channel_revenue[0]*100), baseline_bar_width_pct: Math.round(channel_revenue[2]/channel_revenue[0]*84) },
  { channel: 'Quick-Commerce', revenue_inr: channel_revenue[3], revenue_lift_pct: -3.2, bar_width_pct: Math.round(channel_revenue[3]/channel_revenue[0]*100), baseline_bar_width_pct: Math.round(channel_revenue[3]/channel_revenue[0]*103) },
  { channel: 'Wholesale',      revenue_inr: channel_revenue[4], revenue_lift_pct: -1.8, bar_width_pct: Math.round(channel_revenue[4]/channel_revenue[0]*100), baseline_bar_width_pct: Math.round(channel_revenue[4]/channel_revenue[0]*102) },
];
const total_weekly_revenue = channel_total;

// ─── KPIs ─────────────────────────────────────────────────────────────────────

const FREE_RIDER_INR  = 980000;
const PASSTHROUGH_INR = 620000;
const MARKDOWN_INR    = 340000;
const ELASTICITY_INR  = 290000;
const TOTAL_LEAKAGE   = FREE_RIDER_INR + PASSTHROUGH_INR + MARKDOWN_INR + ELASTICITY_INR;

const theoretical_margin_inr = total_weekly_revenue * (avg_projected_margin + 0.042);
const realized_margin_inr = total_weekly_revenue * avg_current_margin;
const margin_realization_pct = round2((realized_margin_inr / theoretical_margin_inr) * 100);

const trend_12w = Array.from({ length: 12 }, (_, i) => ({
  week: i + 1,
  margin_realization_pct: round2(clamp(gaussian(margin_realization_pct - (11-i)*0.4, 1.2), 78, 89)),
  promo_roi: round2(EXACT_ROI[i] ?? 3.0),
  sell_through: round2(rand(64, 76)),
}));
trend_12w[11].margin_realization_pct = margin_realization_pct;
trend_12w[11].promo_roi = 3.52;

const avg_sell_through = round2(skus.reduce((a, s) => a + s.sell_through_pct, 0) / skus.length);
const avg_wos = round2(skus.reduce((a, s) => a + s.weeks_of_supply, 0) / skus.length);

const kpis = {
  margin_realization_pct,
  margin_realization_trend: -1.4,
  gross_margin_pct: round2(avg_current_margin * 100),
  gross_margin_vs_floor: round2((avg_current_margin - 0.24) * 100),
  promo_roi_index: 68.4,
  promo_roi_trend: 3.2,
  free_rider_ratio_pct: 41.2,
  sell_through_pct: round2(avg_sell_through),
  sell_through_vs_target: round2(avg_sell_through - 75),
  active_alerts: 11,
  total_margin_leakage_inr: TOTAL_LEAKAGE,
  margin_leakage_breakdown: {
    promo_free_rider_inr: FREE_RIDER_INR,
    cost_passthrough_gap_inr: PASSTHROUGH_INR,
    premature_markdown_inr: MARKDOWN_INR,
    elasticity_underpricing_inr: ELASTICITY_INR,
  },
  weeks_of_supply: round2(avg_wos),
  weeks_of_supply_trend: -0.4,
  trend_12w,
};

// ─── Margin waterfall ─────────────────────────────────────────────────────────

const theoretical_weekly = Math.round(total_weekly_revenue * (avg_projected_margin + 0.042));
const margin_waterfall = [
  { label: 'Theoretical max',       value_inr: theoretical_weekly, is_total: true,  color_type: 'base'  as const },
  { label: 'Free-rider waste',       value_inr: -FREE_RIDER_INR,   is_total: false, color_type: 'leak'  as const },
  { label: 'Cost passthrough gap',   value_inr: -PASSTHROUGH_INR,  is_total: false, color_type: 'leak'  as const },
  { label: 'Premature markdown',     value_inr: -MARKDOWN_INR,     is_total: false, color_type: 'leak'  as const },
  { label: 'Elasticity gap',         value_inr: -ELASTICITY_INR,   is_total: false, color_type: 'leak'  as const },
  { label: 'Realized margin',        value_inr: theoretical_weekly - TOTAL_LEAKAGE, is_total: true, color_type: 'result' as const },
];

// ─── Forecast 14w ────────────────────────────────────────────────────────────

const EID_WEEK = 3; // Eid al-Adha ~June 6 = ~20 days from anchor = Week 3
const SEASONALITY = [1.0, 1.05, 1.35, 1.15, 0.98, 0.95, 0.92, 0.94, 1.02, 1.04, 1.08, 1.10, 1.12, 1.10];
const EVENT_LABELS: (string|null)[] = [null, null, 'Eid al-Adha', 'Post-Eid', null, null, null, null, 'Sawan Begins', null, null, null, 'Independence Day', null];

const forecast_14w = Array.from({ length: 14 }, (_, i) => {
  const rev = Math.round(total_weekly_revenue * SEASONALITY[i] * (1 + gaussian(0, 0.02)));
  const mar = Math.round(rev * avg_current_margin);
  const ci_w = Math.round(rev * (0.05 + i * 0.003));
  return {
    week: i + 1, week_label: `W${i+1}`,
    forecast_revenue_inr: rev, forecast_margin_inr: mar,
    lower_ci_inr: rev - ci_w, upper_ci_inr: rev + ci_w,
    seasonality_index: round2(SEASONALITY[i]),
    event_label: EVENT_LABELS[i],
  };
});

// ─── Action queue ─────────────────────────────────────────────────────────────

const highImpactSkus = [...skus].sort((a,b) => Math.abs(b.revenue_impact_inr) - Math.abs(a.revenue_impact_inr));

const action_queue = [
  // 4 urgent
  {
    id: 'AQ-001', priority: 'urgent' as const, alert_type: 'free_rider' as const,
    sku_id: 'CAMP-001', product_name: 'Eid Essentials Offer', department: 'Grocery & Staples', category: 'Atta & Flours',
    headline: '58% of promo buyers are free-riders — ₹5.7L in discount waste this week.',
    recommended_action: 'Gate offer to new-to-brand and lapsed segments only. Estimated saving: ₹3.2L.',
    financial_impact_inr: 320000, confidence: 'high' as const, action_window: 'Act by Thursday', status: 'pending' as const,
  },
  {
    id: 'AQ-002', priority: 'urgent' as const, alert_type: 'cost_passthrough' as const,
    sku_id: highImpactSkus[0].sku_id, product_name: highImpactSkus[0].product_name, department: highImpactSkus[0].department, category: highImpactSkus[0].category,
    headline: `Cost up 8% since last review — shelf price not updated, margin now ${(highImpactSkus[0].current_margin_pct*100).toFixed(1)}%.`,
    recommended_action: `Raise shelf price by ₹${Math.round(highImpactSkus[0].recommended_price_inr - highImpactSkus[0].current_price_inr)} to restore target margin.`,
    financial_impact_inr: Math.abs(highImpactSkus[0].revenue_impact_inr), confidence: 'high' as const, action_window: 'Act by EOD', status: 'pending' as const,
  },
  {
    id: 'AQ-003', priority: 'urgent' as const, alert_type: 'margin_floor' as const,
    sku_id: highImpactSkus[1].sku_id, product_name: highImpactSkus[1].product_name, department: highImpactSkus[1].department, category: highImpactSkus[1].category,
    headline: `Margin at ${(highImpactSkus[1].current_margin_pct*100).toFixed(1)}% — ${((DEPT_FLOOR[highImpactSkus[1].department] - highImpactSkus[1].current_margin_pct)*100).toFixed(1)}pp below the ${highImpactSkus[1].department} floor.`,
    recommended_action: `Increase price from ₹${highImpactSkus[1].current_price_inr} to ₹${highImpactSkus[1].recommended_price_inr}.`,
    financial_impact_inr: Math.abs(highImpactSkus[1].revenue_impact_inr), confidence: 'high' as const, action_window: 'Review by Friday', status: 'pending' as const,
  },
  {
    id: 'AQ-004', priority: 'urgent' as const, alert_type: 'free_rider' as const,
    sku_id: 'CAMP-006', product_name: 'Oil BOGO Festival Prep', department: 'Grocery & Staples', category: 'Edible Oil',
    headline: 'BOGO on Edible Oil: 57% free-rider ratio — loyal buyers stocking up, not switching.',
    recommended_action: 'Switch to Bundle mechanic with a new SKU (Saffola + spice combo). Projected ₹2.8L leakage recovery.',
    financial_impact_inr: 280000, confidence: 'medium' as const, action_window: 'Act by Monday', status: 'pending' as const,
  },
  // 4 review
  {
    id: 'AQ-005', priority: 'review' as const, alert_type: 'cost_passthrough' as const,
    sku_id: highImpactSkus[2].sku_id, product_name: highImpactSkus[2].product_name, department: highImpactSkus[2].department, category: highImpactSkus[2].category,
    headline: 'Supplier cost increase not passed through — ₹1.2L weekly margin gap accumulating.',
    recommended_action: 'Review pricing agreement with merchandising team before next cycle.',
    financial_impact_inr: 120000, confidence: 'medium' as const, action_window: 'Review by Friday', status: 'pending' as const,
  },
  {
    id: 'AQ-006', priority: 'review' as const, alert_type: 'elasticity_opportunity' as const,
    sku_id: highImpactSkus[3].sku_id, product_name: highImpactSkus[3].product_name, department: highImpactSkus[3].department, category: highImpactSkus[3].category,
    headline: `Inelastic demand (ε=${highImpactSkus[3].elasticity.toFixed(2)}) — price increase of ₹${Math.round(highImpactSkus[3].recommended_price_inr - highImpactSkus[3].current_price_inr)} has minimal volume impact.`,
    recommended_action: 'Approve recommended price change ahead of Eid demand build.',
    financial_impact_inr: Math.abs(highImpactSkus[3].revenue_impact_inr), confidence: 'high' as const, action_window: 'Review by Thursday', status: 'pending' as const,
  },
  {
    id: 'AQ-007', priority: 'review' as const, alert_type: 'promo_ending' as const,
    sku_id: 'CAMP-008', product_name: 'Tea Festive Bundle', department: 'Beverages', category: 'Tea',
    headline: 'Tea Festive Bundle paused — ₹3.4L unspent budget at risk of lapsing.',
    recommended_action: 'Redirect remaining budget to Loyalty Gold Cashback (best-performing campaign, 3.7× ROI).',
    financial_impact_inr: 185000, confidence: 'medium' as const, action_window: 'Review by Wednesday', status: 'pending' as const,
  },
  {
    id: 'AQ-008', priority: 'review' as const, alert_type: 'markdown_trigger' as const,
    sku_id: markdown_queue[0]?.sku_id ?? 'PRD-000050', product_name: markdown_queue[0]?.product_name ?? 'Kellogg\'s Corn Flakes 475g', department: markdown_queue[0]?.department ?? 'Grocery & Staples', category: markdown_queue[0]?.category ?? 'Packaged Foods',
    headline: `${markdown_queue[0]?.weeks_of_supply.toFixed(1) ?? '8.4'} weeks of supply and sell-through at ${markdown_queue[0]?.current_sell_through_pct ?? 38}% — markdown trigger hit.`,
    recommended_action: `Apply ${Math.abs(markdown_queue[0]?.recommended_depth_pct ?? -15)}% markdown to clear ${markdown_queue[0]?.units_at_risk ?? 240} units at risk.`,
    financial_impact_inr: markdown_queue[0]?.revenue_at_risk_inr ?? 95000, confidence: 'high' as const, action_window: 'Review by EOD', status: 'pending' as const,
  },
  // 3 info
  {
    id: 'AQ-009', priority: 'info' as const, alert_type: 'free_rider' as const,
    sku_id: 'CAMP-003', product_name: 'Weekend Snack Bundle', department: 'Snacks & Biscuits', category: 'Chips & Namkeen',
    headline: 'Weekend Snack Bundle free-rider ratio at 62% — highest in current portfolio.',
    recommended_action: 'Monitor through week-end before adjusting. Consider loyalty-gating in next campaign cycle.',
    financial_impact_inr: 68000, confidence: 'low' as const, action_window: 'Monitor', status: 'snoozed' as const,
  },
  {
    id: 'AQ-010', priority: 'info' as const, alert_type: 'sell_through' as const,
    sku_id: highImpactSkus[8]?.sku_id ?? 'PRD-000010', product_name: highImpactSkus[8]?.product_name ?? 'Tata Sampann Tur Dal 1kg', department: highImpactSkus[8]?.department ?? 'Grocery & Staples', category: highImpactSkus[8]?.category ?? 'Dal & Pulses',
    headline: 'Sell-through 12pp below category average — demand softness or placement issue.',
    recommended_action: 'Check shelf placement and review if reorder point is too high for current pace.',
    financial_impact_inr: 42000, confidence: 'low' as const, action_window: 'Review next week', status: 'pending' as const,
  },
  {
    id: 'AQ-011', priority: 'info' as const, alert_type: 'margin_floor' as const,
    sku_id: highImpactSkus[5].sku_id, product_name: highImpactSkus[5].product_name, department: highImpactSkus[5].department, category: highImpactSkus[5].category,
    headline: `${highImpactSkus[5].product_name} margin trending toward floor — monitor over next 2 weeks.`,
    recommended_action: 'No action needed now. Alert auto-escalates to Review if margin drops another 2pp.',
    financial_impact_inr: 28000, confidence: 'low' as const, action_window: 'Monitor', status: 'pending' as const,
  },
];

// ─── Live activity ────────────────────────────────────────────────────────────

const live_activity = [
  { id:'LA-001', event_type:'free_rider_detected'as const, severity:'red'as const,
    headline:'High free-rider alert: Eid Essentials Offer', detail:'58% of transactions this hour are from loyal buyers who purchase regardless of promo.', timestamp_ago:'12 min ago' },
  { id:'LA-002', event_type:'campaign_live'as const, severity:'green'as const,
    headline:'Loyalty Gold Cashback ROI hit 3.7×', detail:'Best week since campaign launch — 180 loyalty-gated redemptions in last 2 hours.', timestamp_ago:'41 min ago' },
  { id:'LA-003', event_type:'cost_alert'as const, severity:'amber'as const,
    headline:'Cost revision: Edible Oil +6.2% from supplier', detail:'Dhara and Sundrop invoice prices updated — 4 SKUs now below margin floor.', timestamp_ago:'1h ago' },
  { id:'LA-004', event_type:'markdown_triggered'as const, severity:'amber'as const,
    headline:`Markdown trigger: ${markdown_queue[0]?.product_name ?? 'Kellogg\'s Corn Flakes 475g'}`, detail:`Sell-through at ${markdown_queue[0]?.current_sell_through_pct ?? 38}% with ${markdown_queue[0]?.weeks_of_supply.toFixed(1) ?? '8.4'} weeks of supply — auto-flagged for review.`, timestamp_ago:'2h ago' },
  { id:'LA-005', event_type:'season_alert'as const, severity:'blue'as const,
    headline:'Eid al-Adha demand ramp starting', detail:'Grocery & Staples volume up 18% vs same time last week — Atta and Edible Oil leading.', timestamp_ago:'3h ago' },
  { id:'LA-006', event_type:'compliance_gap'as const, severity:'amber'as const,
    headline:'MRP compliance gap: 2 SKUs priced above MRP', detail:'Pringles Original and Ferrero Rocher shelf tags updated — prices corrected automatically.', timestamp_ago:'4h ago' },
  { id:'LA-007', event_type:'elasticity_update'as const, severity:'blue'as const,
    headline:'Elasticity model refresh: Atta & Flours', detail:'Post-Eid demand data incorporated — Aashirvaad elasticity updated from −0.30 to −0.26 (more inelastic).', timestamp_ago:'5h ago' },
  { id:'LA-008', event_type:'promo_accepted'as const, severity:'green'as const,
    headline:'Dairy Double Value Pack extension approved', detail:'7-day extension approved by category manager — projected ₹1.4L incremental lift.', timestamp_ago:'6h ago' },
];

// ─── Headline ─────────────────────────────────────────────────────────────────

const headline = {
  sentence: `You are leaving ${fmt(TOTAL_LEAKAGE)} on the table this week — ${fmt(FREE_RIDER_INR)} in free-rider promotions in Snacks & Biscuits, ${fmt(PASSTHROUGH_INR)} in cost passthrough gaps, and ${fmt(MARKDOWN_INR)} in premature markdowns.`,
  supporting_line: 'Optimization model has 11 actionable recommendations that could recover ₹8.4L this week.',
  week_label: 'Week of May 17, 2026',
  season_context: 'Pre-Eid build · 20 days to Eid al-Adha',
};

// ─── Assemble core.json ───────────────────────────────────────────────────────

const core = {
  generated_at: '2026-05-17T00:00:00.000Z',
  anchor_date: ANCHOR,
  headline, kpis, action_queue, live_activity,
  skus: skus.map(({ base_weekly_units: _, ...rest }) => rest), // strip internal field
  departments, campaigns, promo_roi_trend, ai_suggestions, lift_by_segment, mechanic_roi,
  sell_through_heatmap, markdown_queue, inventory_aging, channel_performance, margin_waterfall,
  forecast_14w, model_card,
};

// ─── Precomputed ──────────────────────────────────────────────────────────────

function buildDeptPrecomputed(deptFilter: string | null) {
  const filteredSkus = deptFilter ? skus.filter(s => s.department === deptFilter) : skus;
  const filteredCampaigns = deptFilter ? campaigns.filter(c => c.department === deptFilter) : campaigns;

  const top_skus_by_impact: object[] = [...filteredSkus]
    .sort((a, b) => Math.abs(b.revenue_impact_inr) - Math.abs(a.revenue_impact_inr))
    .slice(0, 10)
    .map(s => ({
      sku_id: s.sku_id, product_name: s.product_name, category: s.category,
      revenue_impact_inr: s.revenue_impact_inr, price_change_pct: s.price_change_pct,
      recommendation_priority: s.recommendation_priority,
    }));

  const catSet = new Set(filteredSkus.map(s => s.category));
  const margin_by_category = Array.from(catSet).map(cat => {
    const cs = filteredSkus.filter(s => s.category === cat);
    const dept = cs[0]?.department ?? '';
    return {
      category: cat,
      current_margin_pct: round2(cs.reduce((a, s) => a + s.current_margin_pct, 0) / cs.length),
      target_margin_pct: round2(cs.reduce((a, s) => a + s.target_margin_pct, 0) / cs.length),
      margin_floor_pct: DEPT_FLOOR[dept] ?? 0.22,
      sku_count: cs.length,
    };
  });

  const heatmapRows = deptFilter
    ? sell_through_heatmap.filter(r => r.department === deptFilter)
    : sell_through_heatmap;

  return { sell_through_heatmap: heatmapRows, top_skus_by_impact, margin_by_category, campaign_performance: filteredCampaigns };
}

const precomputed = {
  generated_at: '2026-05-17T00:00:00.000Z',
  departments: {
    all: buildDeptPrecomputed(null),
    'Grocery & Staples':  buildDeptPrecomputed('Grocery & Staples'),
    'Snacks & Biscuits':  buildDeptPrecomputed('Snacks & Biscuits'),
    'Dairy & Frozen':     buildDeptPrecomputed('Dairy & Frozen'),
    'Beverages':          buildDeptPrecomputed('Beverages'),
    'Personal Care':      buildDeptPrecomputed('Personal Care'),
  },
};

// ─── SKU detail (top 30) ──────────────────────────────────────────────────────

const top30 = [...skus]
  .sort((a, b) => Math.abs(b.revenue_impact_inr) - Math.abs(a.revenue_impact_inr));
// Generate detail files for ALL SKUs (not just top 30) so every SKU is expandable

const PROMO_MECHANICS = ['pct_off', 'bogo', 'bundle', 'multipack', 'cashback'];
const EVENT_NAMES = ['Eid al-Adha', 'Holi', 'Diwali', 'Republic Day', 'Independence Day'];

function buildPriceHistory(s: SKU): object[] {
  const pts = [];
  let cur_price = Math.round(s.current_price_inr * (0.92 + rng() * 0.08));
  let cur_cost = Math.round(s.cost_inr * (0.94 + rng() * 0.06));
  const cost_bump_day = randInt(20, 60);
  const promo_days = new Set<number>();
  // 2-4 promo windows in the 90-day history
  const n_promos = randInt(2, 4);
  for (let p = 0; p < n_promos; p++) {
    const start = randInt(5, 80);
    const len = randInt(5, 14);
    for (let d = start; d < Math.min(start + len, 90); d++) promo_days.add(d);
  }

  for (let d = 0; d < 91; d++) {
    const date = addDays(ANCHOR, d - 90);
    if (d === cost_bump_day) cur_cost = Math.round(cur_cost * (1 + rand(0.03, 0.10)));
    const is_promo = promo_days.has(d);
    const promo_depth = is_promo ? round2(rand(0.08, 0.25)) : null;
    const eff_price = is_promo ? Math.round(cur_price * (1 - (promo_depth ?? 0))) : cur_price;
    const event_nearby = d >= 68 && d <= 75 ? pickOne([...EVENT_NAMES, null, null]) : null;
    pts.push({
      date, price_inr: eff_price, mrp_inr: s.mrp_inr, cost_inr: cur_cost,
      margin_pct: round2((eff_price - cur_cost) / eff_price),
      is_promo, promo_depth_pct: promo_depth ? round2(promo_depth * 100) : null,
      event_name: event_nearby,
    });
  }
  return pts;
}

function buildElasticityCurve(s: SKU): object[] {
  const base_units = s.base_weekly_units;
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const factor = 0.7 + i * 0.03; // 0.7 to 1.3
    const p = Math.round(s.current_price_inr * factor * 100) / 100;
    const demand_index = round2(1 + s.elasticity * (factor - 1));
    const units = Math.max(0, base_units * demand_index);
    pts.push({
      price_inr: p,
      demand_index: Math.max(0.05, demand_index),
      margin_inr: Math.round((p - s.cost_inr) * units),
      revenue_inr: Math.round(p * units),
    });
  }
  return pts;
}

function buildMarginWaterfall(s: SKU): object {
  const gross_margin_inr = Math.round(s.current_price_inr - s.cost_inr);
  const gross_margin_pct = round2(gross_margin_inr / s.current_price_inr);
  const promo_discount = Math.round(s.current_price_inr * s.promo_frequency_pct / 100 * rand(0.08, 0.20));
  const realized_price = s.current_price_inr - promo_discount;
  const realized_margin_inr = Math.round(realized_price - s.cost_inr);
  const realized_margin_pct = round2(realized_margin_inr / realized_price);
  const free_rider_waste = Math.round(promo_discount * rand(0.30, 0.65));
  const net_margin_inr = realized_margin_inr - free_rider_waste;
  return {
    cost_inr: s.cost_inr, shelf_price_inr: s.current_price_inr,
    gross_margin_inr, gross_margin_pct, promo_discount_inr: promo_discount,
    realized_price_inr: Math.round(realized_price), realized_margin_inr, realized_margin_pct,
    free_rider_waste_inr: free_rider_waste, net_margin_inr, net_margin_pct: round2(net_margin_inr / realized_price),
  };
}

function buildPromoHistory(s: SKU): object[] {
  const n = randInt(3, 6);
  const promos = [];
  for (let i = 0; i < n; i++) {
    const start = addDays(ANCHOR, -randInt(7 + i*14, 21 + i*14));
    const end = addDays(start, randInt(5, 14));
    const depth = round2(rand(0.08, 0.28));
    const budget = Math.round(s.current_price_inr * s.base_weekly_units * rand(0.5, 2.0));
    const lift_pct = round2(rand(5, 38));
    const incr = Math.round(budget * rand(0.8, 3.5));
    const free_rider = round2(rand(25, 65));
    const dip = round2(rand(-16, -1));
    const roi = round2(incr / budget);
    const net_roi = round2(roi * (1 - free_rider / 100));
    promos.push({
      promo_id: `PROMO-${s.sku_id}-${i+1}`, mechanic: pickOne(PROMO_MECHANICS),
      start_date: start, end_date: end, depth_pct: round2(depth * 100), budget_inr: budget,
      lift_pct, incremental_revenue_inr: incr, free_rider_ratio_pct: free_rider,
      post_promo_dip_pct: dip, roi, net_roi,
    });
  }
  return promos;
}

function buildRecommendation(s: SKU): object {
  const margin_gap = s.target_margin_pct - s.current_margin_pct;
  const vol_change = round2((s.recommended_price_inr / s.current_price_inr - 1) * s.elasticity * 100);
  const rev_change = Math.round(
    s.recommended_price_inr * s.base_weekly_units * (1 + vol_change/100) - s.current_price_inr * s.base_weekly_units
  );
  const mar_change = round2((s.projected_margin_pct - s.current_margin_pct) * 100);
  const action = s.recommended_price_inr > s.current_price_inr ? 'increase' : s.recommended_price_inr < s.current_price_inr ? 'decrease' : 'maintain';
  const conf: 'high'|'medium'|'low' = Math.abs(s.elasticity) > 0.7 ? 'medium' : Math.abs(s.elasticity) < 0.35 ? 'high' : 'high';
  return {
    current_price_inr: s.current_price_inr, recommended_price_inr: s.recommended_price_inr,
    price_change_pct: s.price_change_pct,
    rationale: action === 'maintain'
      ? `${s.product_name} is already priced optimally — current margin of ${(s.current_margin_pct*100).toFixed(1)}% meets the ${s.department} target. Model confidence is high with ${Math.abs(s.elasticity).toFixed(2)} elasticity coefficient.`
      : `Model recommends a ${Math.abs(s.price_change_pct*100).toFixed(1)}% price ${action} to ₹${s.recommended_price_inr}. With elasticity of ${s.elasticity.toFixed(2)}, projected volume ${vol_change > 0 ? 'increase' : 'decrease'} is ${Math.abs(vol_change).toFixed(1)}%. Net margin improvement of ${mar_change.toFixed(1)}pp recovers ₹${Math.round(Math.abs(rev_change)/1000)}K weekly.`,
    projected_volume_change_pct: vol_change, projected_revenue_change_inr: rev_change,
    projected_margin_change_pp: mar_change, confidence: conf,
    priority: s.recommendation_priority,
  };
}

// ─── Write files ──────────────────────────────────────────────────────────────

const OUT_DIR = path.join(process.cwd(), 'cache', 'price_intel');
const SKU_DIR = path.join(OUT_DIR, 'sku_detail');
fs.mkdirSync(SKU_DIR, { recursive: true });

const coreStr = JSON.stringify(core, null, 2);
fs.writeFileSync(path.join(OUT_DIR, 'core.json'), coreStr);
const coreSizeKB = (Buffer.byteLength(coreStr, 'utf8') / 1024).toFixed(1);

const preStr = JSON.stringify(precomputed, null, 2);
fs.writeFileSync(path.join(OUT_DIR, 'precomputed.json'), preStr);
const preSizeKB = (Buffer.byteLength(preStr, 'utf8') / 1024).toFixed(1);

let skuTotalKB = 0;
for (const s of top30) {
  const detail = {
    sku_id: s.sku_id, product_name: s.product_name,
    price_history: buildPriceHistory(s),
    elasticity_curve: buildElasticityCurve(s),
    margin_waterfall: buildMarginWaterfall(s),
    promo_history: buildPromoHistory(s),
    recommendation: buildRecommendation(s),
  };
  const str = JSON.stringify(detail, null, 2);
  fs.writeFileSync(path.join(SKU_DIR, `${s.sku_id}.json`), str);
  skuTotalKB += Buffer.byteLength(str, 'utf8') / 1024;
}

const elapsed = ((Date.now() - GEN_START) / 1000).toFixed(1);
console.log(`\n✅ Price Intel data generated in ${elapsed}s\n`);
console.log(`   cache/price_intel/core.json          ${coreSizeKB} KB`);
console.log(`   cache/price_intel/precomputed.json   ${preSizeKB} KB`);
console.log(`   cache/price_intel/sku_detail/        ${top30.length} files (all SKUs), ${skuTotalKB.toFixed(1)} KB total`);
console.log(`\n   SKUs: ${skus.length} · Campaigns: ${campaigns.length} · Action items: ${action_queue.length}`);
console.log(`   Margin leakage: ${fmt(TOTAL_LEAKAGE)}/week`);
console.log(`   Inelastic sample: ${skus.find(s => s.elasticity_class === 'inelastic')?.elasticity.toFixed(3)} (${skus.find(s => s.elasticity_class === 'inelastic')?.product_name})`);
