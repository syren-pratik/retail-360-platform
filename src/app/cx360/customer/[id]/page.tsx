// Force dynamic — tenant cookie is read per request to swap grocery ↔ apparel.
import { notFound } from 'next/navigation';
import CustomerDetailContent from './CustomerDetailContent';
import { loadCache, getTenantFromCookie } from '@/app/lib/cache-loader';
import { generateCustomerDetail } from '@/app/lib/generate-customer-detail';
import { generateApparelCustomerDetail } from '@/app/lib/generate-apparel-customer-detail';
import { transformCustomerRecords } from '@/app/lib/cache-transform';
import type { CustomerRecord } from '@/app/lib/types';

export const dynamic = 'force-dynamic';

interface CustomerDetailPageProps {
  params: { id: string };
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const tenant = getTenantFromCookie();
  const raw = await loadCache<unknown[]>('cx360_customer_table.json');
  const customerTable = transformCustomerRecords(raw);
  const customer = customerTable.find((c) => c.customer_id === params.id);

  if (!customer) {
    notFound();
  }

  // Preserve top_brand + return_rate_pct from raw (apparel mirror has them;
  // transform drops return_rate_pct since the grocery type doesn't carry it).
  const rawRow = (raw as Record<string, unknown>[]).find(
    (r) => r.customer_id === params.id,
  );
  const enriched: CustomerRecord & { top_brand?: string; return_rate_pct?: number } = {
    ...customer,
    top_brand: (rawRow?.top_brand as string | undefined) ?? customer.top_brand,
    return_rate_pct: typeof rawRow?.return_rate_pct === 'number'
      ? (rawRow.return_rate_pct as number)
      : undefined,
  };

  const customerDetail = tenant === 'us_apparel'
    ? generateApparelCustomerDetail(enriched)
    : generateCustomerDetail(enriched);

  return <CustomerDetailContent customer={customerDetail} />;
}
