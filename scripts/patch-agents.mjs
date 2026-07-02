import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const routes = execSync('find src/app/api/price-intel/agents -name "route.ts"').toString().trim().split('\n');

for (const f of routes) {
  let src = readFileSync(f, 'utf8');
  const orig = src;

  // Add import if not present
  if (!src.includes("from '@/app/lib/agent-tenant'")) {
    src = src.replace(
      /(import Anthropic from '@anthropic-ai\/sdk';)/,
      "$1\nimport { agentTenant, agentSystemPrefix, agentCurrencySymbol, agentMarket } from '@/app/lib/agent-tenant';"
    );
  }

  // Swap grocery system prompt language
  src = src.replace(
    /'You are a[^']*Indian retail[^']*'/g,
    (m) => {
      // capture the JSON-return part after "Indian retail"
      const jsonPart = m.match(/(Return[^']*|Use \[ONLY[^']*|.*)/)?.[0] ?? '';
      return `agentSystemPrefix(agentTenant()) + ' ${jsonPart.replace(/'/g, "\\'").trim()}'`;
    }
  );

  // Swap hardcoded "Indian retail" or "for Indian" in user prompt strings
  src = src.replace(/Indian retail promotional scenario/g, `${'${agentMarket(agentTenant())} promotional scenario'}`);
  src = src.replace(/for Indian retail/g, `for ${'${agentMarket(agentTenant())} retail'}`);

  if (src !== orig) {
    writeFileSync(f, src);
    console.log('✓', f);
  }
}
