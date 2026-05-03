export const dynamic = 'force-dynamic';

import supplierOTIFData from '../../../../../cache/supply_supplier_otif.json';
import replenishmentData from '../../../../../cache/supply_replenishment.json';
import inboundData from '../../../../../cache/supply_inbound.json';
import kpisData from '../../../../../cache/supply_kpis.json';
import SupplyChainDeepDiveContent from './SupplyChainDeepDiveContent';
import type { SupplyKPIs, SupplierOTIFData, ReplenishmentData, InboundData } from '../../components/InventoryDashboardContent';

export const metadata = {
  title: 'Supply Chain Analysis | Supply Intelligence',
};

export default function SupplyChainPage() {
  return (
    <SupplyChainDeepDiveContent
      kpis={kpisData as unknown as SupplyKPIs}
      supplierOTIF={supplierOTIFData as unknown as SupplierOTIFData}
      replenishment={replenishmentData as unknown as ReplenishmentData}
      inbound={inboundData as unknown as InboundData}
    />
  );
}
