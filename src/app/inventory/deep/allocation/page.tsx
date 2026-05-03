export const dynamic = 'force-dynamic';

import allocationData from '../../../../../cache/supply_allocation.json';
import transferData from '../../../../../cache/supply_transfers.json';
import AllocationDeepDiveContent from './AllocationDeepDiveContent';

export const metadata = {
  title: 'Stock Allocation | Supply Intelligence',
};

export default function AllocationPage() {
  return (
    <AllocationDeepDiveContent
      allocation={allocationData as unknown}
      transfers={transferData as unknown}
    />
  );
}
