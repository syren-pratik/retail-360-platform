import { notFound } from 'next/navigation';
import SupplierDetailContent from './SupplierDetailContent';
import type { SupplierProfile } from './SupplierDetailContent';
import profiles from '../../../../../cache/supply_supplier_profiles.json';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default function SupplierDetailPage({ params }: PageProps) {
  const profilesMap = profiles as Record<string, SupplierProfile>;
  const profile = profilesMap[params.id];

  if (!profile) {
    notFound();
  }

  return <SupplierDetailContent profile={profile} />;
}
