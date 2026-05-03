export const dynamic = 'force-dynamic';

import revenueAtRiskData from '../../../../../cache/supply_revenue_at_risk.json';
import categoryHealthData from '../../../../../cache/supply_category_health.json';
import overstockData from '../../../../../cache/supply_overstock.json';
import kpisData from '../../../../../cache/supply_kpis.json';
import StockHealthDeepDiveContent from './StockHealthDeepDiveContent';
import type {
  SupplyKPIs,
  RevenueAtRiskData,
  CategoryHealthData,
  OverstockData,
} from '../../components/InventoryDashboardContent';

export const metadata = {
  title: 'Stock Health Analysis | Supply Intelligence',
};

export default function StockHealthPage() {
  return (
    <StockHealthDeepDiveContent
      kpis={kpisData as unknown as SupplyKPIs}
      revenueAtRisk={revenueAtRiskData as unknown as RevenueAtRiskData}
      categoryHealth={categoryHealthData as unknown as CategoryHealthData}
      overstock={overstockData as unknown as OverstockData}
    />
  );
}
