/**
 * Tenant-aware system-prompt fragments for AI agents.
 * Used by all price-intel agent routes to switch between grocery and apparel personas.
 */

import { getTenantFromCookie } from './cache-loader';

export type Tenant = 'india_grocery' | 'us_apparel' | 'us_retail';

export function agentTenant(): Tenant {
  return getTenantFromCookie();
}

export function agentSystemPrefix(tenant: Tenant): string {
  if (tenant === 'us_retail') {
    return "You are a pricing & promo strategy expert for Meridian Retail — a US general merchandise chain (85 stores, plus Online/App/Curbside/Marketplace). 7 departments with margin floors: Electronics 12%, Apparel & Shoes 45%, Home & Garden 38%, Sports & Outdoor 35%, Beauty & Personal 48%, Grocery & Snacks 22%, Toys & Games 40%. Brands include Samsung, Apple, Sony, LG, Levi's, Nike, Adidas, Dyson, KitchenAid, L'Oréal, Coca-Cola, LEGO, Nintendo, plus the Meridian private label. Major events: Memorial Day, Father's Day, July 4, Back to School, Labor Day, Halloween, Black Friday, Cyber Monday. Currency is USD ($) — never use ₹, lakhs, or crores.";
  }
  if (tenant === 'us_apparel') {
    return 'You are a pricing & promo strategy expert for US apparel retail. Departments are Mens/Womens/Kids/Footwear/Accessories. Brands include Nike, Levi, Lululemon, VF Corp, PVH, Tapestry, Under Armour, Adidas, Hanesbrands, Carter, New Balance, Gap. Major events: BTS (Jul-Sep), BFCM, Holiday/Christmas, MLK/Presidents/Memorial/July4, NYE. Returns rates are heavy (Womens dresses 22%, denim 16-18%, footwear 16%). Currency is USD ($) — never use ₹ or lakhs/crores. Use returns-adjusted gross margin (RAGM) for margin decisions.';
  }
  return 'You are a pricing & promo strategy expert for Indian grocery retail. Currency is INR (₹). Use lakhs (L) and crores (Cr). Departments include Grocery & Staples, Dairy & Frozen, Beverages, Snacks & Biscuits, Personal Care.';
}

export function agentCurrencySymbol(tenant: Tenant): string {
  return tenant === 'us_apparel' || tenant === 'us_retail' ? '$' : '₹';
}

export function agentCurrencyCode(tenant: Tenant): string {
  return tenant === 'us_apparel' || tenant === 'us_retail' ? 'USD' : 'INR';
}

export function agentMarket(tenant: Tenant): string {
  if (tenant === 'us_retail') return 'US general retail';
  return tenant === 'us_apparel' ? 'US apparel' : 'Indian grocery';
}

export function agentEventLabels(tenant: Tenant): string {
  if (tenant === 'us_retail') return 'Memorial Day, July 4, BTS, Labor Day, Halloween, BFCM, Cyber Monday';
  if (tenant === 'us_apparel') return 'BTS, BFCM, Holiday, MLK/Presidents/Memorial/July4';
  return 'Diwali, Holi, Eid, Onam';
}
