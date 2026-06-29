export const dynamic = 'force-dynamic';

import StockHealthDeepDiveContent from './StockHealthDeepDiveContent';
import { loadCache } from '@/app/lib/cache-loader';
import type {
  SupplyKPIs,
  RevenueAtRiskData,
  CategoryHealthData,
  OverstockData,
} from '../../components/InventoryDashboardContent';

export const metadata = {
  title: 'Stock Health Analysis | Supply Intelligence',
};

export default async function StockHealthPage() {
  const [kpisData, revenueAtRiskData, categoryHealthData, overstockData] = await Promise.all([
    loadCache<SupplyKPIs>('supply_kpis.json'),
    loadCache<RevenueAtRiskData>('supply_revenue_at_risk.json'),
    loadCache<CategoryHealthData>('supply_category_health.json'),
    loadCache<OverstockData>('supply_overstock.json'),
  ]);
  return (
    <StockHealthDeepDiveContent
      kpis={kpisData}
      revenueAtRisk={revenueAtRiskData}
      categoryHealth={categoryHealthData}
      overstock={overstockData}
    />
  );
}
