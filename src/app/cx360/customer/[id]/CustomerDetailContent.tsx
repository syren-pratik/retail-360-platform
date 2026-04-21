'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  Mail,
  Gift,
  Phone,
  Package,
  Star,
  StarOff,
  User,
  TrendingUp,
  TrendingDown,
  Lightbulb,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CustomerDetail } from '@/app/lib/generate-customer-detail';
import { useNextBestAction, CustomerData } from '@/app/hooks/useNextBestAction';
import NextBestAction from '@/app/components/customer/NextBestAction';
import ActionHistory from '@/app/components/customer/ActionHistory';

interface CustomerDetailContentProps {
  customer: CustomerDetail;
}

const segmentColors: Record<string, string> = {
  'Premium': 'bg-purple-100 text-purple-700 border-purple-200',
  'Loyal': 'bg-blue-100 text-blue-700 border-blue-200',
  'Regular': 'bg-green-100 text-green-700 border-green-200',
  'Occasional': 'bg-amber-100 text-amber-700 border-amber-200',
  'New': 'bg-gray-100 text-gray-700 border-gray-200',
};

const tierColors: Record<string, string> = {
  'Platinum': 'bg-slate-100 text-slate-700 border-slate-200',
  'Gold': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Silver': 'bg-gray-100 text-gray-600 border-gray-200',
  'Bronze': 'bg-orange-100 text-orange-700 border-orange-200',
  'None': 'bg-gray-50 text-gray-500 border-gray-200',
};

const riskColors: Record<string, { bg: string; dot: string }> = {
  'Critical': { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  'High': { bg: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  'Medium': { bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  'Low': { bg: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
};

const channelColors: Record<string, string> = {
  'Online': '#6366F1',
  'In-Store': '#10B981',
};

const CATEGORY_COLORS = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

const formatCurrency = (value: number) => {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

export default function CustomerDetailContent({ customer }: CustomerDetailContentProps) {
  const [isWatchListed, setIsWatchListed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Only render charts after component is mounted to avoid SSR issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Convert customer to CustomerData format for NBA hook
  const customerData: CustomerData = useMemo(() => ({
    customer_id: customer.customer_id,
    customer_segment: customer.customer_segment,
    loyalty_tier: customer.loyalty_tier,
    clv_12m: customer.clv_12m,
    clv_tier: customer.clv_tier || (customer.clv_12m > 100000 ? 'Platinum' : customer.clv_12m > 50000 ? 'Gold' : customer.clv_12m > 20000 ? 'Silver' : 'Bronze'),
    total_spend: customer.total_spend,
    total_transactions: customer.total_transactions,
    avg_basket: customer.avg_basket,
    days_since_last_purchase: customer.days_since_last_purchase,
    preferred_channel: customer.preferred_channel,
    top_category: customer.category_spend?.[0]?.category || 'Unknown',
    churn_prob_90d: customer.churn_prob_90d,
    churn_risk_tier: customer.churn_risk_tier,
    probability_alive: customer.probability_alive,
    purchase_frequency: customer.total_transactions,
  }), [customer]);

  // Fetch Next Best Actions
  const { actions, loading: nbaLoading, source: nbaSource, refresh: refreshNBA } = useNextBestAction(
    customer.customer_id,
    customerData
  );

  const handleSendCampaign = () => {
    toast.success(`Campaign queued for ${customer.customer_id}`);
  };

  const handleTriggerOffer = () => {
    toast.success(`Offer triggered for ${customer.customer_id}`, {
      description: '10% discount offer sent via email',
    });
  };

  const handleAssignCall = () => {
    toast.success(`Retention call assigned for ${customer.customer_id}`);
  };

  const handlePushRecommendation = () => {
    toast.success(`Product recommendation pushed to ${customer.customer_id}`);
  };

  const handleWatchList = () => {
    setIsWatchListed(!isWatchListed);
    toast.success(
      isWatchListed
        ? `Removed ${customer.customer_id} from watch list`
        : `Added ${customer.customer_id} to watch list`
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-[var(--border-default)] px-6 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/cx360"
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Customer Profile
            </span>
            <button className="btn-secondary flex items-center gap-2">
              <Download size={14} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6 space-y-6">
        {/* Customer Header Card */}
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--accent-primary-light)] flex items-center justify-center">
              <User size={32} className="text-[var(--accent-primary)]" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                {customer.customer_id}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    segmentColors[customer.customer_segment] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {customer.customer_segment}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    tierColors[customer.loyalty_tier] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {customer.loyalty_tier}
                </span>
                {customer.geography && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    {customer.geography}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                  {customer.preferred_channel}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-[var(--text-secondary)]">
                <span>Member since: {customer.member_since}</span>
                <span>•</span>
                <span>Last purchase: {customer.days_since_last_purchase} days ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4">
          <KPICard
            label="CLV (12m)"
            value={formatCurrency(customer.clv_12m)}
            trend={customer.clv_tier === 'Platinum' || customer.clv_tier === 'Gold' ? 'up' : undefined}
          />
          <KPICard
            label="Total Spend"
            value={formatCurrency(customer.total_spend)}
          />
          <KPICard
            label="Orders"
            value={customer.total_transactions.toString()}
          />
          <KPICard
            label="Avg Basket"
            value={formatCurrency(customer.avg_basket)}
          />
          <KPICard
            label="Churn Risk"
            value={formatPercent(customer.churn_prob_90d)}
            trend={customer.churn_risk_tier === 'Critical' || customer.churn_risk_tier === 'High' ? 'down' : undefined}
            invertTrend
          />
        </div>

        {/* AI-Powered Next Best Actions */}
        <NextBestAction
          customerId={customer.customer_id}
          customerName={customer.customer_id}
          actions={actions}
          loading={nbaLoading}
          source={nbaSource}
          onRefresh={refreshNBA}
          customerData={customerData}
        />

        {/* Charts Row 1 */}
        <div className="grid grid-cols-2 gap-6">
          {/* Purchase Timeline */}
          <div className="card">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
              Purchase Timeline
            </h3>
            <div className="h-[240px]">
              {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={customer.monthly_spend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-[var(--border-default)] rounded-lg p-2 shadow-sm text-xs">
                            <p className="font-medium">{payload[0].payload.month}</p>
                            <p>{formatCurrency(payload[0].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={{ fill: '#6366F1', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-[var(--bg-secondary)] rounded animate-pulse" />
              )}
            </div>
          </div>

          {/* Category Spend */}
          <div className="card">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
              Category Spend
            </h3>
            <div className="h-[240px]">
              {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={customer.category_spend}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-[var(--border-default)] rounded-lg p-2 shadow-sm text-xs">
                            <p className="font-medium">{payload[0].payload.category}</p>
                            <p>{formatCurrency(payload[0].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {customer.category_spend.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-[var(--bg-secondary)] rounded animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-2 gap-6">
          {/* Channel Usage */}
          <div className="card">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
              Channel Usage
            </h3>
            <div className="h-[200px]">
              {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customer.channel_split}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="channel"
                  >
                    {customer.channel_split.map((entry) => (
                      <Cell
                        key={entry.channel}
                        fill={channelColors[entry.channel] || '#94A3B8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const total = customer.channel_split.reduce((s, c) => s + c.count, 0);
                        const pct = ((payload[0].value as number) / total * 100).toFixed(1);
                        return (
                          <div className="bg-white border border-[var(--border-default)] rounded-lg p-2 shadow-sm text-xs">
                            <p className="font-medium">{payload[0].name}</p>
                            <p>{payload[0].value} orders ({pct}%)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-[var(--bg-secondary)] rounded animate-pulse" />
              )}
            </div>
          </div>

          {/* Risk & Predictions */}
          <div className="card">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
              Risk & Predictions
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                <span className="text-sm text-[var(--text-secondary)]">Churn Probability (90d)</span>
                <span className="text-sm font-medium">{formatPercent(customer.churn_prob_90d)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                <span className="text-sm text-[var(--text-secondary)]">Risk Tier</span>
                <span className={`flex items-center gap-2 text-sm font-medium ${riskColors[customer.churn_risk_tier]?.bg || ''} px-2 py-0.5 rounded`}>
                  <span className={`w-2 h-2 rounded-full ${riskColors[customer.churn_risk_tier]?.dot || 'bg-gray-400'}`} />
                  {customer.churn_risk_tier}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                <span className="text-sm text-[var(--text-secondary)]">Probability Alive</span>
                <span className="text-sm font-medium">{formatPercent(customer.probability_alive)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
                <span className="text-sm text-[var(--text-secondary)]">Predicted Purchases (12m)</span>
                <span className="text-sm font-medium">{customer.predicted_purchases_12m}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--text-secondary)]">Price Sensitivity</span>
                <span className="text-sm font-medium">{customer.price_sensitivity}</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="card">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Lightbulb size={18} className="text-amber-500" />
            AI Insights
          </h3>
          <div className="space-y-3">
            {customer.ai_insights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg"
              >
                <span className="text-amber-500 mt-0.5">💡</span>
                <p className="text-sm text-[var(--text-primary)]">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action History */}
        <ActionHistory customerId={customer.customer_id} limit={10} />

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSendCampaign}
              className="btn-secondary flex items-center gap-2"
            >
              <Mail size={16} />
              Send Campaign
            </button>
            <button
              onClick={handleTriggerOffer}
              className="btn-secondary flex items-center gap-2"
            >
              <Gift size={16} />
              Trigger Offer
            </button>
            <button
              onClick={handleAssignCall}
              className="btn-secondary flex items-center gap-2"
            >
              <Phone size={16} />
              Assign Retention Call
            </button>
            <button
              onClick={handlePushRecommendation}
              className="btn-secondary flex items-center gap-2"
            >
              <Package size={16} />
              Push Recommendation
            </button>
            <button
              onClick={handleWatchList}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                isWatchListed
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {isWatchListed ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
              {isWatchListed ? 'On Watch List' : 'Add to Watch List'}
            </button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">
            Recent Transactions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-3 py-2.5 text-left font-medium text-[var(--text-secondary)] rounded-tl-md">
                    Date
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-[var(--text-secondary)]">
                    Store
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-[var(--text-secondary)]">
                    Items
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-[var(--text-secondary)]">
                    Amount
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-[var(--text-secondary)]">
                    Channel
                  </th>
                  <th className="px-3 py-2.5 text-center font-medium text-[var(--text-secondary)] rounded-tr-md">
                    Promo
                  </th>
                </tr>
              </thead>
              <tbody>
                {customer.recent_transactions.map((txn, index) => (
                  <tr
                    key={index}
                    className="table-row border-b border-[var(--border-subtle)] last:border-b-0"
                  >
                    <td className="px-3 py-2.5 text-[var(--text-primary)]">
                      {txn.date}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                      {txn.store}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[var(--text-secondary)]">
                      {txn.items}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-[var(--text-primary)]">
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                          txn.channel === 'Online'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {txn.channel}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {txn.had_promo ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">No</span>
                      )}
                    </td>
                  </tr>
                ))}
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
  trend?: 'up' | 'down';
  invertTrend?: boolean;
}

function KPICard({ label, value, trend, invertTrend }: KPICardProps) {
  const trendColor = trend
    ? invertTrend
      ? trend === 'up' ? 'text-red-500' : 'text-green-500'
      : trend === 'up' ? 'text-green-500' : 'text-red-500'
    : '';

  return (
    <div className="card">
      <p className="text-xs text-[var(--text-secondary)] mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-xl font-semibold text-[var(--text-primary)]">{value}</p>
        {trend && (
          <span className={trendColor}>
            {trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </span>
        )}
      </div>
    </div>
  );
}
