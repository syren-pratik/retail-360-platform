export const dynamic = 'force-dynamic';

import AllocationDeepDiveContent from './AllocationDeepDiveContent';
import { loadCache } from '@/app/lib/cache-loader';

export const metadata = {
  title: 'Stock Allocation | Supply Intelligence',
};

export default async function AllocationPage() {
  const [allocationData, transferData] = await Promise.all([
    loadCache('supply_allocation.json'),
    loadCache('supply_transfers.json'),
  ]);
  return (
    <AllocationDeepDiveContent
      allocation={allocationData as unknown as never}
      transfers={transferData as unknown as never}
    />
  );
}
