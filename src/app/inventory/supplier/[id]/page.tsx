import { notFound } from 'next/navigation';
import SupplierDetailContent from './SupplierDetailContent';
import type { SupplierProfile } from './SupplierDetailContent';
import { loadCache } from '@/app/lib/cache-loader';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function SupplierDetailPage({ params }: PageProps) {
  const profiles = await loadCache<Record<string, SupplierProfile>>('supply_supplier_profiles.json');
  const profile = profiles[params.id];

  if (!profile) {
    notFound();
  }

  return <SupplierDetailContent profile={profile} />;
}
