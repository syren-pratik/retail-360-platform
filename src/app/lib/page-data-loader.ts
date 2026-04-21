/**
 * Universal page data loader.
 * - Loads cache files safely
 * - Returns null for missing/broken files (never undefined)
 * - Components that receive null simply don't render
 */

export interface LoadResult {
  [key: string]: unknown | null;
}

export async function loadPageData(files: string[]): Promise<LoadResult> {
  const result: LoadResult = {};

  for (const file of files) {
    const key = file.replace('.json', '');
    try {
      // Try dynamic import for build-time JSON
      const data = await import(`../../../cache/${file}`)
        .then(m => m.default || m)
        .catch(() => null);

      if (data === null || data === undefined) {
        result[key] = null;
        continue;
      }

      // Validate: if it should be an array, ensure it is
      if (Array.isArray(data)) {
        result[key] = data.length > 0 ? data : null;
      } else if (typeof data === 'object') {
        result[key] = Object.keys(data).length > 0 ? data : null;
      } else {
        result[key] = data;
      }
    } catch (error) {
      console.warn(`Failed to load cache/${file}:`, error);
      result[key] = null;
    }
  }

  return result;
}

/**
 * Synchronous version for client components that import JSON directly
 */
export function safeData<T>(data: T | null | undefined, fallback: T): T {
  if (data === null || data === undefined) return fallback;
  if (Array.isArray(data) && data.length === 0) return fallback;
  if (typeof data === 'object' && Object.keys(data as object).length === 0) return fallback;
  return data;
}

/**
 * Safe array access - always returns an array
 */
export function safeArray<T>(data: T[] | null | undefined): T[] {
  if (!data || !Array.isArray(data)) return [];
  return data;
}

/**
 * Safe object access - always returns an object with defaults
 */
export function safeObject<T extends Record<string, unknown>>(
  data: T | null | undefined,
  defaults: T
): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return defaults;
  return { ...defaults, ...data };
}
