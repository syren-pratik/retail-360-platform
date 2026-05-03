export const dynamic = 'force-dynamic';

import forecastData from '../../../cache/supply_forecast.json';
import kpisData from '../../../cache/supply_kpis.json';
import DemandForecastDeepDiveContent from '../inventory/deep/demand-forecast/DemandForecastDeepDiveContent';
import type { SupplyKPIs, ForecastData } from '../inventory/components/InventoryDashboardContent';

export const metadata = {
  title: 'Demand Forecasting | Retail 360',
  description: 'Forecast accuracy, model performance, and demand intelligence',
};

export default function DemandPage() {
  return (
    <DemandForecastDeepDiveContent
      kpis={kpisData as unknown as SupplyKPIs}
      forecast={forecastData as unknown as ForecastData}
      isStandalonePage={true}
    />
  );
}
