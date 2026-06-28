/**
 * Tenant-aware cache loader.
 *
 * Any /api/* route that reads a JSON file from cache/ should go through this
 * helper. It transparently swaps to cache/apparel/<file> when the request
 * comes from a user with TENANT_COOKIE === 'us_apparel'. Falls back to the
 * grocery file if the apparel mirror doesn't exist yet (Phase B is gradual).
 *
 * File contents are cached in memory across requests because they're static
 * JSON — no point re-reading off disk for every dashboard load.
 */

import { promises as fsp } from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { TENANT_COOKIE, DEFAULT_TENANT, type Tenant } from '@/app/lib/tenant-constants';

const CACHE_ROOT = path.join(process.cwd(), 'cache');
const APPAREL_ROOT = path.join(CACHE_ROOT, 'apparel');

interface MemEntry {
  data: unknown;
  loadedAt: number;
}

const memCache = new Map<string, MemEntry>();
const MEM_TTL_MS = 5 * 60 * 1000; // 5 min — survives hot-reload of one dev session

/** Read the tenant from the incoming request cookie, falling back to default. */
export function getTenantFromCookie(): Tenant {
  try {
    const raw = cookies().get(TENANT_COOKIE)?.value;
    if (raw === 'us_apparel' || raw === 'india_grocery') return raw;
  } catch {
    // cookies() throws if called outside a request scope — caller may pass explicit tenant
  }
  return DEFAULT_TENANT;
}

/**
 * Load a cache file for the current tenant.
 *
 * @param filename basename only, e.g. "cx360_kpis.json"
 * @param explicitTenant override the cookie (useful for scripts/tests)
 * @returns parsed JSON
 */
export async function loadCache<T = unknown>(
  filename: string,
  explicitTenant?: Tenant,
): Promise<T> {
  const tenant = explicitTenant ?? getTenantFromCookie();
  const resolved = await resolvePath(filename, tenant);

  const key = `${tenant}::${resolved}`;
  const hit = memCache.get(key);
  if (hit && Date.now() - hit.loadedAt < MEM_TTL_MS) {
    return hit.data as T;
  }

  const raw = await fsp.readFile(resolved, 'utf-8');
  const data = JSON.parse(raw) as T;
  memCache.set(key, { data, loadedAt: Date.now() });
  return data;
}

async function resolvePath(filename: string, tenant: Tenant): Promise<string> {
  if (tenant === 'us_apparel') {
    const apparel = path.join(APPAREL_ROOT, filename);
    try {
      await fsp.access(apparel);
      return apparel;
    } catch {
      // apparel mirror not generated yet for this file — fall through to grocery
    }
  }
  return path.join(CACHE_ROOT, filename);
}

/** Clear in-memory cache. Used after regenerating fixtures. */
export function clearCacheLoaderMemory(): void {
  memCache.clear();
}
