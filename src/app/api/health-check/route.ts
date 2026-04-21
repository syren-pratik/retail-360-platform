import { NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import { validateDataContract, getAllContractKeys } from '@/app/lib/data-contracts';

interface CacheFileResult {
  status: 'ok' | 'error' | 'missing' | 'warning';
  errors: string[];
  warnings: string[];
  rowCount?: number;
  sampleKeys?: string[];
  fileSize?: number;
  lastModified?: string;
}

export async function GET() {
  const results: Record<string, CacheFileResult> = {};
  const cacheDir = path.join(process.cwd(), 'cache');

  // Get all contract keys
  const contractKeys = getAllContractKeys();

  // Check each cache file against its contract
  for (const cacheKey of contractKeys) {
    const filePath = path.join(cacheDir, `${cacheKey}.json`);
    try {
      const [rawData, fileStats] = await Promise.all([
        readFile(filePath, 'utf-8'),
        stat(filePath),
      ]);

      const data = JSON.parse(rawData);
      const validation = validateDataContract(cacheKey, data);

      results[cacheKey] = {
        status: validation.valid
          ? validation.warnings.length > 0
            ? 'warning'
            : 'ok'
          : 'error',
        errors: validation.errors,
        warnings: validation.warnings,
        rowCount: validation.rowCount,
        sampleKeys: validation.sampleKeys,
        fileSize: fileStats.size,
        lastModified: fileStats.mtime.toISOString(),
      };
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      if (err.code === 'ENOENT') {
        results[cacheKey] = {
          status: 'missing',
          errors: [`File not found: ${cacheKey}.json`],
          warnings: [],
        };
      } else {
        results[cacheKey] = {
          status: 'error',
          errors: [err.message || 'Unknown error'],
          warnings: [],
        };
      }
    }
  }

  // Also check for any cache files that don't have contracts
  try {
    const allFiles = await readdir(cacheDir);
    const jsonFiles = allFiles.filter(f => (f ?? '').endsWith('.json') && f !== '_meta.json');
    for (const file of jsonFiles) {
      const key = (file ?? '').replace('.json', '');
      if (!(key in results)) {
        results[key] = {
          status: 'warning',
          errors: [],
          warnings: [`No contract defined for ${key}`],
        };
      }
    }
  } catch {
    // Cache directory might not exist
  }

  // Calculate summary
  const resultValues = Object.values(results);
  const summary = {
    total: (resultValues ?? []).length,
    healthy: (resultValues ?? []).filter(r => r.status === 'ok').length,
    warnings: (resultValues ?? []).filter(r => r.status === 'warning').length,
    errors: (resultValues ?? []).filter(r => r.status === 'error').length,
    missing: (resultValues ?? []).filter(r => r.status === 'missing').length,
  };

  // Group by module
  const byModule: Record<string, Record<string, CacheFileResult>> = {
    cx360: {},
    demand: {},
    inventory: {},
    price: {},
    shared: {},
    unknown: {},
  };

  for (const [key, result] of Object.entries(results)) {
    if (key.startsWith('cx360_')) byModule.cx360[key] = result;
    else if (key.startsWith('demand_')) byModule.demand[key] = result;
    else if (key.startsWith('inventory_')) byModule.inventory[key] = result;
    else if (key.startsWith('price_')) byModule.price[key] = result;
    else if (key === 'dimensions') byModule.shared[key] = result;
    else byModule.unknown[key] = result;
  }

  return NextResponse.json({
    summary,
    byModule,
    results,
    timestamp: new Date().toISOString(),
  });
}
