// Constants shared by server and client tenant code. Extracted out of
// TenantContext.tsx — that file is 'use client' and server-side imports of
// client modules return module shims, so the constants there came through as
// empty objects on the server. This module is plain TS so server imports work.

export type Tenant = 'india_grocery' | 'us_apparel' | 'us_retail';

export const TENANT_COOKIE = 'rct_tenant';
export const TENANT_LS_KEY = 'rct_tenant';
export const DEFAULT_TENANT: Tenant = 'india_grocery';
