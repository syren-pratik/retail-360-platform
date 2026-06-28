// Tiny module-scoped tenant register. Lives outside of format-money / TenantContext
// to avoid a circular import. Set by TenantProvider during render so SSR and
// client first-render see the same value (no hydration mismatch).

import type { Tenant } from '@/app/lib/tenant-constants';

let _runtimeTenant: Tenant = 'india_grocery';

export function setRuntimeTenant(t: Tenant): void {
  _runtimeTenant = t;
}

export function getRuntimeTenant(): Tenant {
  return _runtimeTenant;
}
