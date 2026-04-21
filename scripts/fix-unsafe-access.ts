const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all TS/TSX files
const files = glob.sync('src/app/**/*.{ts,tsx}', { ignore: ['**/node_modules/**'] });

let totalFixes = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  let fixes = 0;
  const original = content;

  // FIX 1: [...data] spread on potentially non-iterable
  // [...data].sort  →  [...(data || [])].sort
  content = content.replace(
    /\[\.\.\.(\w+)\]\.(sort|map|filter|reduce)/g,
    (match: string, varName: string, method: string) => {
      fixes++;
      return `[...(${varName} ?? [])].${method}`;
    }
  );

  // FIX 2: data.map(  →  (data ?? []).map(
  // But NOT on chained calls like something.data.map
  // Match: variable.map( where variable is a simple identifier at start of expression
  content = content.replace(
    /(?<!=\s*)(?<!\.)(\b\w+)\.(map|filter|reduce|forEach|find|some|every|flatMap)\(/g,
    (match: string, varName: string, method: string) => {
      // Skip if it's a known safe object (React, Math, Object, Array, console, etc.)
      const safeObjects = ['React', 'Math', 'Object', 'Array', 'console', 'JSON',
        'window', 'document', 'Promise', 'Date', 'String', 'Number', 'localStorage',
        'sessionStorage', 'navigator', 'response', 'event', 'e', 'err', 'error',
        'router', 'params', 'searchParams', 'entries', 'keys', 'values', 'Set',
        'Map', 'WeakMap', 'WeakSet', 'Reflect', 'Proxy', 'Symbol', 'BigInt',
        'Intl', 'Atomics', 'SharedArrayBuffer', 'DataView', 'ArrayBuffer',
        'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array',
        'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array',
        'BigUint64Array', 'next', 'prev', 'current', 'cache', 'chunks', 'PROMO_TYPES',
        'STATUS_CONFIG', 'STATUS_COLORS', 'STATUS_LABELS', 'columns', 'history'];
      if (safeObjects.includes(varName)) return match;
      // Skip if it's 'this'
      if (varName === 'this') return match;
      // Skip if already wrapped with ??
      if (match.includes('??')) return match;
      fixes++;
      return `(${varName} ?? []).${method}(`;
    }
  );

  // FIX 3: data.length  →  (data ?? []).length
  // Only when data is likely an array variable
  content = content.replace(
    /(?<!\.)(\b\w+)\.length(?!\s*[=(])/g,
    (match: string, varName: string) => {
      const safeObjects = ['response', 'error', 'err', 'e', 'window', 'str',
        'text', 'message', 'name', 'title', 'label', 'value', 'key', 'id',
        'className', 'style', 'ref', 'content', 'result', 'query', 'sql',
        'path', 'url', 'file', 'line', 'match', 'args', 'arguments', 'password',
        'email', 'username', 'token', 'code', 'description', 'summary', 'body',
        'header', 'footer', 'payload', 'request', 'input', 'output', 'searchQuery',
        'sortField', 'sortDirection', 'Object', 'Array', 'String', 'columns',
        'safeData', 'safeProducts', 'safeUpcoming', 'safePastImpact', 'history'];
      if (safeObjects.includes(varName)) return match;
      if (varName.length <= 1) return match; // skip single letter vars
      // Skip if already wrapped
      if (match.includes('??')) return match;
      fixes++;
      return `(${varName} ?? []).length`;
    }
  );

  // FIX 4: value.toLocaleString  →  (value ?? 0).toLocaleString
  content = content.replace(
    /(?<!\?\?\s*\d+\))(\b\w+)\.(toLocaleString|toFixed|toPrecision)\(/g,
    (match: string, varName: string, method: string) => {
      const safe = ['Math', 'Number', 'Date', 'parseFloat', 'parseInt', 'safeValue'];
      if (safe.includes(varName)) return match;
      if (/^\d/.test(varName)) return match; // skip literal numbers
      // Skip if already wrapped
      if (match.includes('??')) return match;
      fixes++;
      return `(${varName} ?? 0).${method}(`;
    }
  );

  // FIX 5: string methods on potentially undefined strings
  content = content.replace(
    /(?<!\?\?\s*['"][^'"]*['"]\))(\b\w+)\.(toLowerCase|toUpperCase|trim|split|charAt|substring|slice|replace|match|startsWith|endsWith|includes|padStart|padEnd)\(/g,
    (match: string, varName: string, method: string) => {
      const safe = ['String', 'JSON', 'Math', 'console', 'window', 'document', 'navigator',
        'event', 'e', 'err', 'error', 'searchQuery', 'query', 'key', 'label', 'value'];
      if (safe.includes(varName)) return match;
      if (/^['"]/.test(varName)) return match; // skip string literals
      // Skip if already wrapped
      if (match.includes('??')) return match;
      fixes++;
      return `(${varName} ?? '').${method}(`;
    }
  );

  if (fixes > 0 && content !== original) {
    fs.writeFileSync(file, content);
    console.log(`  ✓ ${file} — ${fixes} fixes`);
    totalFixes += fixes;
  }
}

console.log(`\nTotal: ${totalFixes} unsafe patterns fixed across ${files.length} files`);
