'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Sparkles,
  Target,
  Activity,
} from 'lucide-react';
import { ProductPricingDetail } from '@/app/lib/generate-product-pricing-detail';
import PriceHistoryChart from '../../components/PriceHistoryChart';
import DemandCurveChart from '../../components/DemandCurveChart';
import PromoHistoryTable from '../../components/PromoHistoryTable';
import CompetitorComparison from '../../components/CompetitorComparison';
import PriceSimulator from '../../components/PriceSimulator';

interface ProductPricingDetailContentProps {
  productDetail: ProductPricingDetail;
}

const PRIORITY_COLORS = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function ProductPricingDetailContent({
  productDetail,
}: ProductPricingDetailContentProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { product } = productDetail;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const priceChangeAmt = product.recommended_price - product.current_price;
  const priceChangePct = (priceChangeAmt / product.current_price) * 100;

  const handleExport = () => {
    const data = {
      product: {
        product_id: product.product_id,
        product_name: product.product_name,
        department: product.department,
        category: product.category,
      },
      pricing: {
        current_price: product.current_price,
        recommended_price: product.recommended_price,
        cost_price: product.cost_price,
        mrp: product.mrp,
        margin_pct: product.margin_pct,
        elasticity: product.elasticity,
      },
      priceHistory: productDetail.priceHistory,
      promoHistory: productDetail.promoHistory,
      competitors: productDetail.competitors,
      aiRecommendation: productDetail.aiRecommendation,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product.product_id}_pricing_detail.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-[var(--border-default)] px-6 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/price"
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Price Intelligence</span>
          </Link>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6 space-y-6">
        {/* Product Header */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-lg bg-[var(--accent-primary-light)] flex items-center justify-center">
              <DollarSign size={28} className="text-[var(--accent-primary)]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                  {product.product_id}
                </h1>
                <span className="text-lg text-[var(--text-secondary)]">—</span>
                <span className="text-lg text-[var(--text-primary)]">{product.product_name}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="px-2.5 py-1 rounded text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                  {product.department}
                </span>
                <span className="px-2.5 py-1 rounded text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                  {product.category}
                </span>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-medium border ${
                    PRIORITY_COLORS[product.recommendation_priority]
                  }`}
                >
                  {product.recommendation_priority} Priority
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {priceChangePct > 1 ? (
                <TrendingUp size={16} className="text-green-500" />
              ) : priceChangePct < -1 ? (
                <TrendingDown size={16} className="text-red-500" />
              ) : (
                <Target size={16} className="text-gray-400" />
              )}
              <span className="text-sm text-[var(--text-secondary)]">
                {priceChangePct > 1
                  ? 'Price Increase Recommended'
                  : priceChangePct < -1
                    ? 'Price Decrease Recommended'
                    : 'Optimal Price'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4">
          <KPICard
            label="Current Price"
            value={`₹${(product.current_price ?? 0).toFixed(0)}`}
            icon={DollarSign}
            iconBg="bg-blue-500"
          />
          <KPICard
            label="Recommended"
            value={`₹${(product.recommended_price ?? 0).toFixed(0)}`}
            change={priceChangePct}
            icon={Target}
            iconBg="bg-green-500"
          />
          <KPICard
            label="Current Margin"
            value={`${(product.margin_pct ?? 0).toFixed(1)}%`}
            icon={Percent}
            iconBg="bg-amber-500"
          />
          <KPICard
            label="Elasticity"
            value={(product.elasticity ?? 0).toFixed(2)}
            icon={Activity}
            iconBg="bg-purple-500"
          />
          <KPICard
            label="Comp. Index"
            value={(product.competitive_index ?? 0).toFixed(0)}
            icon={TrendingUp}
            iconBg="bg-indigo-500"
          />
        </div>

        {/* AI Recommendation Banner */}
        <div className="card bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Sparkles size={20} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                AI Pricing Recommendation
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {productDetail.aiRecommendation}
              </p>
            </div>
          </div>
        </div>

        {/* Price History and Demand Curve */}
        {isMounted && (
          <div className="grid grid-cols-2 gap-6">
            <PriceHistoryChart
              data={productDetail.priceHistory}
              currentPrice={product.current_price}
              recommendedPrice={product.recommended_price}
            />
            <DemandCurveChart
              data={productDetail.demandCurve}
              currentPrice={product.current_price}
              elasticity={product.elasticity}
            />
          </div>
        )}

        {/* Price Simulator and Competitor Comparison */}
        {isMounted && (
          <div className="grid grid-cols-2 gap-6">
            <PriceSimulator product={product} dailyDemand={productDetail.dailyDemand} />
            <CompetitorComparison
              data={productDetail.competitors}
              currentPrice={product.current_price}
            />
          </div>
        )}

        {/* Promo History */}
        {isMounted && <PromoHistoryTable data={productDetail.promoHistory} />}

        {/* Price Details Table */}
        <div className="card">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            Price Details
          </h3>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Metric
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--text-secondary)]">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--text-secondary)]">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">Cost Price</td>
                  <td className="px-4 py-3 text-right">₹{(product.cost_price ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">Unit cost from supplier</td>
                </tr>
                <tr className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">Current Price</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600">
                    ₹{(product.current_price ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">Active selling price</td>
                </tr>
                <tr className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">MRP</td>
                  <td className="px-4 py-3 text-right">₹{(product.mrp ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">Maximum retail price</td>
                </tr>
                <tr className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    Recommended Price
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      priceChangePct > 1
                        ? 'text-green-600'
                        : priceChangePct < -1
                          ? 'text-red-600'
                          : 'text-gray-600'
                    }`}
                  >
                    ₹{(product.recommended_price ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">
                    {priceChangePct >= 0 ? '+' : ''}
                    {(priceChangePct ?? 0).toFixed(1)}% change
                  </td>
                </tr>
                <tr className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    Competitor Avg
                  </td>
                  <td className="px-4 py-3 text-right">₹{(product.competitor_avg ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">
                    Based on {productDetail.competitors.length} competitors
                  </td>
                </tr>
                <tr className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    Competitive Index
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      product.competitive_index <= 100 ? 'text-green-600' : 'text-amber-600'
                    }`}
                  >
                    {(product.competitive_index ?? 0).toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">
                    {product.competitive_index <= 100
                      ? 'Below competitor average'
                      : 'Above competitor average'}
                  </td>
                </tr>
                <tr className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    Price Elasticity
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{(product.elasticity ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">
                    {Math.abs(product.elasticity) < 1
                      ? 'Inelastic - less price sensitive'
                      : 'Elastic - more price sensitive'}
                  </td>
                </tr>
                <tr className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    Current Margin
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">
                    {(product.margin_pct ?? 0).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">
                    ₹{(product.current_price - product.cost_price).toFixed(2)} per unit
                  </td>
                </tr>
                <tr className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">Daily Demand</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {(productDetail.dailyDemand ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">Estimated daily units</td>
                </tr>
                <tr className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    Annual Revenue
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600">
                    ₹{(productDetail.annualRevenue / 100000).toFixed(2)}L
                  </td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">
                    Projected at current price
                  </td>
                </tr>
                <tr className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                    Last Price Change
                  </td>
                  <td className="px-4 py-3 text-right">{product.last_price_change}</td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)]">
                    {product.price_change_90d >= 0 ? '+' : ''}
                    {(product.price_change_90d ?? 0).toFixed(1)}% in last 90 days
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  label: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  iconBg: string;
}

function KPICard({ label, value, change, icon: Icon, iconBg }: KPICardProps) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`p-2 rounded-lg ${iconBg}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold text-[var(--text-primary)]">{value}</p>
          {change !== undefined && (
            <span
              className={`text-xs font-medium ${
                change > 1 ? 'text-green-600' : change < -1 ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              {change >= 0 ? '+' : ''}
              {(change ?? 0).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
