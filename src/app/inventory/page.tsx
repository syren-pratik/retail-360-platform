import InventoryDashboardContent from './components/InventoryDashboardContent';
import { loadCache } from '@/app/lib/cache-loader';
import type { SizeCurveData } from '@/app/components/charts/SizeCurveSellThrough';
import type { ReturnsByReasonInventoryData } from '@/app/components/charts/ReturnsByReasonInventory';
import type { StyleVelocityData } from '@/app/components/charts/StyleVelocity';
import type { AgedInventoryData } from '@/app/components/charts/AgedInventoryMatrix';
import type { ColorPerformanceData } from '@/app/components/charts/ColorPerformanceHeatmap';
import type { MarkdownLifecycleData } from '@/app/components/charts/MarkdownLifecycleWaterfall';
import type { BrandedVsPLData } from '@/app/components/charts/BrandedVsPrivateLabel';

export const metadata = {
  title: 'Inventory Intelligence | Retail 360',
  description: 'Inventory health, demand forecasting, and supply chain performance across all stores',
};

async function safeLoad<T>(name: string): Promise<T | null> {
  try {
    return await loadCache<T>(name);
  } catch {
    return null;
  }
}

export default async function InventoryPage() {
  const [
    apparelSizeCurve,
    apparelReturnsByReason,
    apparelStyleVelocity,
    apparelAgedInventory,
    apparelColorPerformance,
    apparelMarkdownLifecycle,
    apparelBrandedVsPL,
  ] = await Promise.all([
    safeLoad<SizeCurveData>('apparel_size_curve.json'),
    safeLoad<ReturnsByReasonInventoryData>('cx360_returns_by_reason.json'),
    safeLoad<StyleVelocityData>('apparel_style_velocity.json'),
    safeLoad<AgedInventoryData>('apparel_aged_inventory.json'),
    safeLoad<ColorPerformanceData>('apparel_color_performance.json'),
    safeLoad<MarkdownLifecycleData>('apparel_markdown_lifecycle.json'),
    safeLoad<BrandedVsPLData>('apparel_branded_vs_pl.json'),
  ]);

  return (
    <InventoryDashboardContent
      apparelSizeCurve={apparelSizeCurve}
      apparelReturnsByReason={apparelReturnsByReason}
      apparelStyleVelocity={apparelStyleVelocity}
      apparelAgedInventory={apparelAgedInventory}
      apparelColorPerformance={apparelColorPerformance}
      apparelMarkdownLifecycle={apparelMarkdownLifecycle}
      apparelBrandedVsPL={apparelBrandedVsPL}
    />
  );
}
