import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { TENANT_COOKIE } from '@/app/context/TenantContext';

// Force dynamic so each request reads its own tenant cookie (no static optimization)
export const dynamic = 'force-dynamic';

/**
 * Cache API - Serves data from the cache directory.
 * Tenant-aware: when the rct_tenant cookie === 'us_apparel', the route
 * reads cache/apparel/<file> first and falls back to cache/<file> if
 * the apparel mirror doesn't exist for that file.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { file: string } }
) {
  try {
    const { file } = params;

    // Validate filename to prevent directory traversal
    if (!file || (file ?? '').includes('..') || (file ?? '').includes('/')) {
      return NextResponse.json(
        { error: 'Invalid cache file name' },
        { status: 400 }
      );
    }

    // Ensure .json extension
    const filename = (file ?? '').endsWith('.json') ? file : `${file}.json`;
    const groceryPath = path.join(process.cwd(), 'cache', filename);

    // Resolve tenant from cookie; apparel mirror has priority when present.
    // Read from the request header directly (always dynamic, no static-opt issues).
    let tenant = 'india_grocery';
    let cachePath = groceryPath;
    let servedFrom: 'grocery' | 'apparel' = 'grocery';
    const cookieHeader = request.headers.get('cookie') ?? '';
    const tenantMatch = cookieHeader.match(new RegExp(`${TENANT_COOKIE}=([^;]+)`));
    const cookieVal = tenantMatch?.[1];
    if (cookieVal === 'us_apparel') {
      tenant = 'us_apparel';
      const apparelPath = path.join(process.cwd(), 'cache', 'apparel', filename);
      if (existsSync(apparelPath)) {
        cachePath = apparelPath;
        servedFrom = 'apparel';
      }
    }

    // Check if cache file exists
    if (!existsSync(cachePath)) {
      return NextResponse.json(
        {
          error: 'Cache not populated',
          details: `Cache file ${filename} does not exist. Run cache refresh to populate data from Databricks.`,
          needsRefresh: true,
        },
        { status: 404 }
      );
    }

    // Read and parse cache file
    const rawData = readFileSync(cachePath, 'utf-8');
    const data = JSON.parse(rawData);

    // Return cache data with metadata (servedFrom helps debug tenant routing)
    return NextResponse.json({
      data,
      source: 'cache',
      filename,
      tenant,
      servedFrom,
      cachedAt: data._meta?.lastRefresh || null,
    });
  } catch (error) {
    console.error('Cache API error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid cache data', details: 'Cache file contains invalid JSON' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to read cache', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
