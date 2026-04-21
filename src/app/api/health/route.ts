import { NextResponse } from 'next/server';
import { isDatabricksConfigured, testConnection } from '@/app/lib/databricks';
import { readFile } from 'fs/promises';
import path from 'path';

export interface HealthStatus {
  databricks: {
    configured: boolean;
    connected: boolean;
    error: string | null;
    host?: string;
  };
  anthropic: {
    configured: boolean;
  };
  cache: {
    lastRefresh: string | null;
    fileCount: number;
    totalSize: number;
  };
  timestamp: string;
}

export async function GET() {
  const status: HealthStatus = {
    databricks: {
      configured: isDatabricksConfigured(),
      connected: false,
      error: null,
      host: process.env.DATABRICKS_HOST ? maskHost(process.env.DATABRICKS_HOST) : undefined,
    },
    anthropic: {
      configured: !!process.env.ANTHROPIC_API_KEY,
    },
    cache: {
      lastRefresh: null,
      fileCount: 0,
      totalSize: 0,
    },
    timestamp: new Date().toISOString(),
  };

  // Test Databricks connection
  if (status.databricks.configured) {
    try {
      const result = await testConnection();
      status.databricks.connected = result.success;
      if (!result.success) {
        status.databricks.error = result.error || 'Connection failed';
      }
    } catch (e) {
      status.databricks.error = e instanceof Error ? e.message : 'Connection test failed';
    }
  }

  // Check cache files
  try {
    const metaPath = path.join(process.cwd(), 'cache', '_meta.json');
    const content = await readFile(metaPath, 'utf-8');
    const meta = JSON.parse(content);
    status.cache.lastRefresh = meta.lastRefresh;
    status.cache.fileCount = meta.results?.length || 0;
  } catch {
    // Meta file doesn't exist or is invalid
  }

  // Count cache files and total size
  try {
    const fs = await import('fs/promises');
    const cacheDir = path.join(process.cwd(), 'cache');
    const files = await fs.readdir(cacheDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f !== '_meta.json');
    status.cache.fileCount = jsonFiles.length;

    let totalSize = 0;
    for (const file of jsonFiles) {
      try {
        const stat = await fs.stat(path.join(cacheDir, file));
        totalSize += stat.size;
      } catch {
        // File may not exist
      }
    }
    status.cache.totalSize = totalSize;
  } catch {
    // Cache directory doesn't exist
  }

  return NextResponse.json(status);
}

// Mask the Databricks host for security
function maskHost(host: string): string {
  try {
    const url = new URL(host);
    const parts = url.hostname.split('.');
    if (parts.length > 2) {
      return `${parts[0].substring(0, 8)}***.${parts.slice(-2).join('.')}`;
    }
    return url.hostname;
  } catch {
    return host.substring(0, 15) + '***';
  }
}
