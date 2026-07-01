import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const files = execSync('find src/app/merchandise/demand -name "*.tsx"').toString().trim().split(String.fromCharCode(10));
let touched = 0;
for (const f of files) {
  let src = readFileSync(f, 'utf8');
  const orig = src;
  // Pattern 1: ₹{expr} → ${formatMoneyPlainAuto(expr)}
  src = src.replace(/₹\{([^}]+)\}/g, '${formatMoneyPlainAuto($1)}');
  // Pattern 2: .toLocaleString('en-IN') → .toLocaleString(getLocaleAuto())
  src = src.replace(/\.toLocaleString\(['"]en-IN['"]\)/g, '.toLocaleString(getLocaleAuto())');
  // Pattern 3: .toLocaleString('en-IN', {…}) — preserve options
  src = src.replace(/\.toLocaleString\(['"]en-IN['"](,\s*\{)/g, '.toLocaleString(getLocaleAuto()$1');
  if (src !== orig) {
    // Add imports if not present
    const needsFormat = src.includes('formatMoneyPlainAuto') && !src.match(/import\s+\{[^}]*formatMoneyPlainAuto[^}]*\}\s+from\s+['"]@\/app\/lib\/format-money['"]/);
    const needsLocale = src.includes('getLocaleAuto()') && !src.match(/import\s+\{[^}]*getLocaleAuto[^}]*\}\s+from\s+['"]@\/app\/lib\/format-money['"]/);
    const hasFormatImport = /from ['"]@\/app\/lib\/format-money['"]/.test(src);
    if (hasFormatImport && (needsFormat || needsLocale)) {
      src = src.replace(/import\s+\{([^}]+)\}\s+from\s+['"]@\/app\/lib\/format-money['"]/, (_m, names) => {
        const set = new Set(names.split(',').map((s) => s.trim()));
        if (needsFormat) set.add('formatMoneyPlainAuto');
        if (needsLocale) set.add('getLocaleAuto');
        return `import { ${Array.from(set).sort().join(', ')} } from '@/app/lib/format-money'`;
      });
    } else if (!hasFormatImport && (needsFormat || needsLocale)) {
      const parts = [];
      if (needsFormat) parts.push('formatMoneyPlainAuto');
      if (needsLocale) parts.push('getLocaleAuto');
      const insertion = `import { ${parts.join(', ')} } from '@/app/lib/format-money';\n`;
      // Insert after last existing top import
      const lastImport = src.lastIndexOf('import ');
      if (lastImport >= 0) {
        const eol = src.indexOf('\n', lastImport);
        src = src.slice(0, eol + 1) + insertion + src.slice(eol + 1);
      } else {
        src = insertion + src;
      }
    }
    writeFileSync(f, src);
    touched++;
    console.log('✓', f);
  }
}
console.log(`\ntouched ${touched} files`);
