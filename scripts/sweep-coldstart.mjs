import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
const files = execSync('find src/app/merchandise/cold-start -maxdepth 3 -name "*.tsx" ! -path "*store-opening*"').toString().trim().split('\n');
let touched = 0;
for (const f of files) {
  let src = readFileSync(f, 'utf8');
  const orig = src;
  src = src.replace(/₹\{([^}]+)\}/g, '{formatMoneyPlainAuto($1)}');
  src = src.replace(/\.toLocaleString\(['"]en-IN['"]\)/g, '.toLocaleString(getLocaleAuto())');
  src = src.replace(/\.toLocaleString\(['"]en-IN['"](,\s*\{)/g, '.toLocaleString(getLocaleAuto()$1');
  if (src !== orig) {
    const needsFormat = src.includes('formatMoneyPlainAuto') && !src.match(/formatMoneyPlainAuto[^;]*from.*format-money/);
    const needsLocale = src.includes('getLocaleAuto()') && !src.match(/getLocaleAuto[^;]*from.*format-money/);
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
      const lastImport = src.lastIndexOf('import ');
      if (lastImport >= 0) {
        const eol = src.indexOf('\n', lastImport);
        src = src.slice(0, eol + 1) + insertion + src.slice(eol + 1);
      } else src = insertion + src;
    }
    writeFileSync(f, src);
    touched++;
    console.log('✓', f);
  }
}
console.log(`touched ${touched}`);
