import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

/**
 * Cache API - Serves data from the cache directory
 * No fallbacks - data must be refreshed from Databricks first
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  try {
    const { file } = await params;

    // Validate filename to prevent directory traversal
    if (!file || (file ?? '').includes('..') || (file ?? '').includes('/')) {
      return NextResponse.json(
        { error: 'Invalid cache file name' },
        { status: 400 }
      );
    }

    // Ensure .json extension
    const filename = (file ?? '').endsWith('.json') ? file : `${file}.json`;
    const cachePath = path.join(process.cwd(), 'cache', filename);

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

    // Return cache data with metadata
    return NextResponse.json({
      data,
      source: 'cache',
      filename,
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
