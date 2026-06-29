export const dynamic = 'force-dynamic';

import SupplyChainDeepDiveContent from './SupplyChainDeepDiveContent';
import { loadCache } from '@/app/lib/cache-loader';
import type { SupplyKPIs, SupplierOTIFData, ReplenishmentData, InboundData } from '../../components/InventoryDashboardContent';

export const metadata = {
  title: 'Supply Chain Analysis | Supply Intelligence',
};

export default async function SupplyChainPage() {
  const [kpisData, supplierOTIFData, replenishmentData, inboundData] = await Promise.all([
    loadCache<SupplyKPIs>('supply_kpis.json'),
    loadCache<SupplierOTIFData>('supply_supplier_otif.json'),
    loadCache<ReplenishmentData>('supply_replenishment.json'),
    loadCache<InboundData>('supply_inbound.json'),
  ]);
  return (
    <SupplyChainDeepDiveContent
      kpis={kpisData}
      supplierOTIF={supplierOTIFData}
      replenishment={replenishmentData}
      inbound={inboundData}
    />
  );
}
