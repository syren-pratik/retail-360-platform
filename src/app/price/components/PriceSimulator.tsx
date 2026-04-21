'use client';

import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown, Minus, RotateCcw } from 'lucide-react';
import { PriceProductRow } from '@/app/lib/price-types';

interface PriceSimulatorProps {
  product: PriceProductRow;
  dailyDemand: number;
  onClose?: () => void;
}

export default function PriceSimulator({ product, dailyDemand, onClose }: PriceSimulatorProps) {
  const [simulatedPrice, setSimulatedPrice] = useState(product.current_price);

  // Calculate metrics based on simulated price using elasticity formula
  const metrics = useMemo(() => {
    const priceChangePct = ((simulatedPrice - product.current_price) / product.current_price) * 100;

    // Elasticity formula: new_demand = current_demand × (1 + elasticity × (price_change_pct / 100))
    // Note: elasticity is negative (price up = demand down), so we use it directly
    const demandMultiplier = 1 + (product.elasticity * (priceChangePct / 100));
    const newDailyDemand = Math.max(0, dailyDemand * demandMultiplier);

    // Calculate revenues
    const currentDailyRevenue = dailyDemand * product.current_price;
    const newDailyRevenue = newDailyDemand * simulatedPrice;
    const revenueChangePct = currentDailyRevenue > 0
      ? ((newDailyRevenue - currentDailyRevenue) / currentDailyRevenue) * 100
      : 0;

    // Calculate margins
    const currentMargin = ((product.current_price - product.cost_price) / product.current_price) * 100;
    const newMargin = ((simulatedPrice - product.cost_price) / simulatedPrice) * 100;

    // Calculate profit
    const currentDailyProfit = dailyDemand * (product.current_price - product.cost_price);
    const newDailyProfit = newDailyDemand * (simulatedPrice - product.cost_price);
    const profitChangePct = currentDailyProfit > 0
      ? ((newDailyProfit - currentDailyProfit) / currentDailyProfit) * 100
      : 0;

    // Annual projections
    const annualRevenue = newDailyRevenue * 365;
    const annualProfit = newDailyProfit * 365;

    return {
      priceChangePct,
      demandMultiplier,
      newDailyDemand: Math.round(newDailyDemand),
      volumeChangePct: (demandMultiplier - 1) * 100,
      newDailyRevenue,
      revenueChangePct,
      currentMargin,
      newMargin,
      marginChange: newMargin - currentMargin,
      newDailyProfit,
      profitChangePct,
      annualRevenue,
      annualProfit,
    };
  }, [simulatedPrice, product, dailyDemand]);

  const handleReset = () => {
    setSimulatedPrice(product.current_price);
  };

  const handleSetRecommended = () => {
    setSimulatedPrice(product.recommended_price);
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${(value ?? 0).toFixed(0)}`;
  };

  const getChangeIcon = (value: number) => {
    if (value > 0.5) return <TrendingUp size={14} className="text-green-500" />;
    if (value < -0.5) return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  const getChangeColor = (value: number, invert = false) => {
    const isPositive = invert ? value < -0.5 : value > 0.5;
    const isNegative = invert ? value > 0.5 : value < -0.5;
    if (isPositive) return 'text-green-600';
    if (isNegative) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <Calculator size={20} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Price Simulator
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {product.product_name}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            ×
          </button>
        )}
      </div>

      {/* Current vs Simulated Price Display */}
      <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-lg mb-4">
        <div className="text-center">
          <div className="text-xs text-[var(--text-tertiary)] mb-1">Current</div>
          <div className="text-lg font-semibold text-[var(--text-primary)]">
            ₹{(product.current_price ?? 0).toFixed(0)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-px w-8 bg-[var(--border-default)]" />
          <div className={`text-sm font-medium ${getChangeColor(metrics.priceChangePct)}`}>
            {metrics.priceChangePct >= 0 ? '+' : ''}{(metrics.priceChangePct ?? 0).toFixed(1)}%
          </div>
          <div className="h-px w-8 bg-[var(--border-default)]" />
        </div>
        <div className="text-center">
          <div className="text-xs text-[var(--text-tertiary)] mb-1">Simulated</div>
          <div className="text-lg font-semibold text-purple-600">
            ₹{(simulatedPrice ?? 0).toFixed(0)}
          </div>
        </div>
      </div>

      {/* Price Slider */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-2">
          <span>Cost: ₹{(product.cost_price ?? 0).toFixed(0)}</span>
          <span>MRP: ₹{(product.mrp ?? 0).toFixed(0)}</span>
        </div>
        <input
          type="range"
          min={product.cost_price}
          max={product.mrp}
          step={1}
          value={simulatedPrice}
          onChange={(e) => setSimulatedPrice(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <div className="flex items-center justify-center gap-4 mt-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <RotateCcw size={12} />
            Reset
          </button>
          <button
            onClick={handleSetRecommended}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 border border-purple-200 rounded hover:bg-purple-50 transition-colors"
          >
            AI: ₹{(product.recommended_price ?? 0).toFixed(0)}
          </button>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={product.cost_price}
              max={product.mrp}
              value={(simulatedPrice ?? 0).toFixed(0)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= product.cost_price && val <= product.mrp) {
                  setSimulatedPrice(val);
                }
              }}
              className="w-20 px-2 py-1.5 text-sm text-center border border-[var(--border-default)] rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Key Parameters */}
      <div className="grid grid-cols-3 gap-4 p-3 bg-[var(--bg-secondary)] rounded-lg mb-4 text-center">
        <div>
          <div className="text-xs text-[var(--text-tertiary)]">Elasticity</div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {(product.elasticity ?? 0).toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-tertiary)]">Daily Demand</div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {(dailyDemand ?? 0).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-[var(--text-tertiary)]">Comp. Index</div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {(product.competitive_index ?? 0).toFixed(0)}
          </div>
        </div>
      </div>

      {/* Projected Metrics */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-[var(--text-primary)]">Projected Impact</h4>

        <div className="grid grid-cols-2 gap-3">
          {/* Volume */}
          <div className="p-3 border border-[var(--border-subtle)] rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--text-tertiary)]">Volume/Day</span>
              {getChangeIcon(metrics.volumeChangePct)}
            </div>
            <div className="text-lg font-semibold text-[var(--text-primary)]">
              {(metrics.newDailyDemand ?? 0).toLocaleString()}
            </div>
            <div className={`text-xs ${getChangeColor(metrics.volumeChangePct)}`}>
              {metrics.volumeChangePct >= 0 ? '+' : ''}{(metrics.volumeChangePct ?? 0).toFixed(1)}%
            </div>
          </div>

          {/* Revenue */}
          <div className="p-3 border border-[var(--border-subtle)] rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--text-tertiary)]">Revenue/Day</span>
              {getChangeIcon(metrics.revenueChangePct)}
            </div>
            <div className="text-lg font-semibold text-[var(--text-primary)]">
              {formatCurrency(metrics.newDailyRevenue)}
            </div>
            <div className={`text-xs ${getChangeColor(metrics.revenueChangePct)}`}>
              {metrics.revenueChangePct >= 0 ? '+' : ''}{(metrics.revenueChangePct ?? 0).toFixed(1)}%
            </div>
          </div>

          {/* Margin */}
          <div className="p-3 border border-[var(--border-subtle)] rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--text-tertiary)]">Margin %</span>
              {getChangeIcon(metrics.marginChange)}
            </div>
            <div className="text-lg font-semibold text-[var(--text-primary)]">
              {(metrics.newMargin ?? 0).toFixed(1)}%
            </div>
            <div className={`text-xs ${getChangeColor(metrics.marginChange)}`}>
              {metrics.marginChange >= 0 ? '+' : ''}{(metrics.marginChange ?? 0).toFixed(1)}pp
            </div>
          </div>

          {/* Profit */}
          <div className="p-3 border border-[var(--border-subtle)] rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--text-tertiary)]">Profit/Day</span>
              {getChangeIcon(metrics.profitChangePct)}
            </div>
            <div className="text-lg font-semibold text-[var(--text-primary)]">
              {formatCurrency(metrics.newDailyProfit)}
            </div>
            <div className={`text-xs ${getChangeColor(metrics.profitChangePct)}`}>
              {metrics.profitChangePct >= 0 ? '+' : ''}{(metrics.profitChangePct ?? 0).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Annual Projections */}
        <div className="p-3 bg-purple-50 rounded-lg">
          <div className="text-xs text-purple-600 font-medium mb-2">Annual Projection (365 days)</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">Revenue</div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {formatCurrency(metrics.annualRevenue)}
              </div>
            </div>
            <div className="h-6 w-px bg-purple-200" />
            <div>
              <div className="text-xs text-[var(--text-tertiary)]">Profit</div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {formatCurrency(metrics.annualProfit)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Elasticity explanation */}
      <div className="mt-4 p-3 bg-[var(--bg-secondary)] rounded-lg text-xs text-[var(--text-secondary)]">
        <strong>Note:</strong> Elasticity of {(product.elasticity ?? 0).toFixed(2)} means a 1% price
        {product.elasticity < 0 ? ' increase' : ' decrease'} leads to ~{Math.abs(product.elasticity).toFixed(1)}%
        volume {product.elasticity < 0 ? 'decrease' : 'increase'}.
      </div>
    </div>
  );
}
