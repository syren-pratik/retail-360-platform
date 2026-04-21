'use client';

import { useRouter } from 'next/navigation';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend,
} from 'recharts';
import { Maximize2 } from 'lucide-react';
import { RFMCustomer } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import ChartWrapper from './ChartWrapper';
import ChartExpandModal from './ChartExpandModal';

interface RFMScatterProps {
  data: RFMCustomer[];
}

const TIER_COLORS: Record<string, string> = {
  'Platinum': '#6366F1',
  'Gold': '#F59E0B',
  'Silver': '#64748B',
  'Bronze': '#92400E',
  'At-Risk': '#F43F5E',
};

const CHART_ID = 'rfm_scatter';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RFMCustomer }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-[var(--border-default)] rounded-lg p-3 shadow-sm">
        <p className="font-medium text-sm mb-1">{data.customer_id}</p>
        <p className="text-xs text-[var(--text-secondary)]">Tier: {data.clv_tier}</p>
        <div className="mt-2 space-y-1 text-sm">
          <p>Recency: {data.recency_days} days</p>
          <p>Frequency: {data.purchase_frequency}</p>
          <p>CLV: ₹{data.clv_12m.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <p className="mt-2 text-xs text-[var(--accent-primary)]">Click to view details</p>
      </div>
    );
  }
  return null;
};

export default function RFMScatter({ data }: RFMScatterProps) {
  const router = useRouter();
  const { expandedChart, setExpandedChart } = useDashboard();

  // Group data by tier for different scatter series
  const tierGroups = data.reduce((acc, customer) => {
    if (!acc[customer.clv_tier]) {
      acc[customer.clv_tier] = [];
    }
    acc[customer.clv_tier].push(customer);
    return acc;
  }, {} as Record<string, RFMCustomer[]>);

  const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze', 'At-Risk'];

  const handleDotClick = (customer: RFMCustomer) => {
    router.push(`/cx360/customer/${customer.customer_id}`);
  };

  const handleExpand = () => {
    setExpandedChart(CHART_ID);
  };

  const renderChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
        <XAxis
          type="number"
          dataKey="recency_days"
          name="Recency"
          unit=" days"
          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-default)' }}
          label={{
            value: 'Recency (days)',
            position: 'bottom',
            offset: 0,
            style: { fontSize: 11, fill: 'var(--text-tertiary)' },
          }}
        />
        <YAxis
          type="number"
          dataKey="purchase_frequency"
          name="Frequency"
          tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
          tickLine={false}
          axisLine={false}
          label={{
            value: 'Frequency',
            angle: -90,
            position: 'insideLeft',
            style: { fontSize: 11, fill: 'var(--text-tertiary)' },
          }}
        />
        <ZAxis
          type="number"
          dataKey="clv_12m"
          range={[20, 400]}
          name="CLV"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
          iconSize={8}
        />
        {tiers.map((tier) => (
          tierGroups[tier] && (
            <Scatter
              key={tier}
              name={tier}
              data={tierGroups[tier]}
              fill={TIER_COLORS[tier]}
              fillOpacity={0.6}
              onClick={(payload) => handleDotClick(payload as unknown as RFMCustomer)}
              cursor="pointer"
            />
          )
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );

  // Render expanded modal
  if (expandedChart === CHART_ID) {
    return (
      <>
        <RFMScatterCard
          data={data}
          tierGroups={tierGroups}
          tiers={tiers}
          onDotClick={handleDotClick}
          onExpand={handleExpand}
        />
        <ChartExpandModal
          title="RFM Scatter Plot"
          subtitle="Recency vs Frequency, bubble size = CLV (Click any dot to view customer)"
          rawData={data}
          columns={[
            { key: 'customer_id', label: 'Customer ID' },
            { key: 'clv_tier', label: 'CLV Tier' },
            { key: 'recency_days', label: 'Recency (days)' },
            { key: 'purchase_frequency', label: 'Frequency' },
            { key: 'clv_12m', label: 'CLV (12m)', format: (v) => `₹${(v as number).toLocaleString('en-IN')}` },
            { key: 'probability_alive', label: 'P(Alive)', format: (v) => `${((v as number) * 100).toFixed(1)}%` },
          ]}
        >
          <ChartWrapper height={400}>
            {renderChart()}
          </ChartWrapper>
        </ChartExpandModal>
      </>
    );
  }

  return (
    <RFMScatterCard
      data={data}
      tierGroups={tierGroups}
      tiers={tiers}
      onDotClick={handleDotClick}
      onExpand={handleExpand}
    />
  );
}

// Separate card component
interface RFMScatterCardProps {
  data: RFMCustomer[];
  tierGroups: Record<string, RFMCustomer[]>;
  tiers: string[];
  onDotClick: (customer: RFMCustomer) => void;
  onExpand: () => void;
}

function RFMScatterCard({
  tierGroups,
  tiers,
  onDotClick,
  onExpand,
}: RFMScatterCardProps) {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            RFM Scatter Plot
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            Recency vs Frequency, bubble size = CLV
          </p>
        </div>
        <button
          onClick={onExpand}
          className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          title="Expand chart"
        >
          <Maximize2 size={16} />
        </button>
      </div>
      <div className="h-[280px]">
        <ChartWrapper height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                type="number"
                dataKey="recency_days"
                name="Recency"
                unit=" days"
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-default)' }}
                label={{
                  value: 'Recency (days)',
                  position: 'bottom',
                  offset: 0,
                  style: { fontSize: 11, fill: 'var(--text-tertiary)' },
                }}
              />
              <YAxis
                type="number"
                dataKey="purchase_frequency"
                name="Frequency"
                tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: 'Frequency',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: 'var(--text-tertiary)' },
                }}
              />
              <ZAxis
                type="number"
                dataKey="clv_12m"
                range={[20, 400]}
                name="CLV"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                iconSize={8}
              />
              {tiers.map((tier) => (
                tierGroups[tier] && (
                  <Scatter
                    key={tier}
                    name={tier}
                    data={tierGroups[tier]}
                    fill={TIER_COLORS[tier]}
                    fillOpacity={0.6}
                    onClick={(payload) => onDotClick(payload as unknown as RFMCustomer)}
                    cursor="pointer"
                  />
                )
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>
    </div>
  );
}
