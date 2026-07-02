/**
 * Tenant-aware system-prompt fragments for AI agents.
 * Used by all price-intel agent routes to switch between grocery and apparel personas.
 */

import { getTenantFromCookie } from './cache-loader';

export type Tenant = 'india_grocery' | 'us_apparel';

export function agentTenant(): Tenant {
  return getTenantFromCookie();
}

export function agentSystemPrefix(tenant: Tenant): string {
  if (tenant === 'us_apparel') {
    return 'You are a pricing & promo strategy expert for US apparel retail. Departments are Mens/Womens/Kids/Footwear/Accessories. Brands include Nike, Levi, Lululemon, VF Corp, PVH, Tapestry, Under Armour, Adidas, Hanesbrands, Carter, New Balance, Gap. Major events: BTS (Jul-Sep), BFCM, Holiday/Christmas, MLK/Presidents/Memorial/July4, NYE. Returns rates are heavy (Womens dresses 22%, denim 16-18%, footwear 16%). Currency is USD ($) — never use ₹ or lakhs/crores. Use returns-adjusted gross margin (RAGM) for margin decisions.';
  }
  return 'You are a pricing & promo strategy expert for Indian grocery retail. Currency is INR (₹). Use lakhs (L) and crores (Cr). Departments include Grocery & Staples, Dairy & Frozen, Beverages, Snacks & Biscuits, Personal Care.';
}

export function agentCurrencySymbol(tenant: Tenant): string {
  return tenant === 'us_apparel' ? '$' : '₹';
}

export function agentCurrencyCode(tenant: Tenant): string {
  return tenant === 'us_apparel' ? 'USD' : 'INR';
}

export function agentMarket(tenant: Tenant): string {
  return tenant === 'us_apparel' ? 'US apparel' : 'Indian grocery';
}

export function agentEventLabels(tenant: Tenant): string {
  if (tenant === 'us_apparel') return 'BTS, BFCM, Holiday, MLK/Presidents/Memorial/July4';
  return 'Diwali, Holi, Eid, Onam';
}
