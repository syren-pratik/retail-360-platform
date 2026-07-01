export const dynamic = 'force-dynamic';

import { loadCache } from '@/app/lib/cache-loader';
import DemandForecastDeepDiveContent from '../inventory/deep/demand-forecast/DemandForecastDeepDiveContent';
import type { SupplyKPIs, ForecastData } from '../inventory/components/InventoryDashboardContent';

export const metadata = {
  title: 'Demand Forecasting | Retail 360',
  description: 'Forecast accuracy, model performance, and demand intelligence',
};

export default async function DemandPage() {
  const [kpisData, forecastData] = await Promise.all([
    loadCache<SupplyKPIs>('supply_kpis.json'),
    loadCache<ForecastData>('supply_forecast.json'),
  ]);

  return (
    <DemandForecastDeepDiveContent
      kpis={kpisData}
      forecast={forecastData}
      isStandalonePage={true}
    />
  );
}
