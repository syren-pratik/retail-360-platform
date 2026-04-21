'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Edit2,
  AlertTriangle,
  Clock,
  Truck,
  CheckCircle,
  Package,
  Filter,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import ChartCard from '@/app/components/charts/ChartCard';
import { UrgencyBadge, StatusBadge } from '@/app/components/ui/SafeBadge';
import { safeLookup } from '@/app/lib/safe-data';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface ReplenishmentItem {
  product_id: string;
  product_name: string;
  store_id: string;
  store_name: string;
  department: string;
  current_stock: number;
  reorder_point: number;
  days_to_stockout: number;
  suggested_qty: number;
  suggested_date: string;
  supplier: string;
  lead_time_days: number;
  estimated_cost: number;
  urgency: string; // Changed from union to string for safety
  status: string; // Changed from union to string for safety
}

interface ReplenishmentQueueProps {
  data: ReplenishmentItem[];
}

// Safe lookup required — data values may vary in casing or include unmapped values
const URGENCY_ORDER: Record<string, number> = {
  Critical: 0, URGENT: 0,
  High: 1, HIGH: 1,
  Medium: 2, MEDIUM: 2,
  Low: 3, LOW: 3,
};

// Status icons for inline rendering
const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={12} />,
  approved: <CheckCircle size={12} />,
  ordered: <Package size={12} />,
  in_transit: <Truck size={12} />,
};

// Mock demand history for expanded rows
function generateDemandHistory() {
  const data = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      demand: Math.floor(Math.random() * 50) + 20,
    });
  }
  return data;
}

function MiniDemandChart() {
  const data = useMemo(() => generateDemandHistory(), []);

  return (
    <div className="h-16 w-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
          <defs>
            <linearGradient id="miniDemandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <Tooltip
            contentStyle={{ fontSize: 10, padding: '4px 8px' }}
            labelStyle={{ fontSize: 10 }}
          />
          <Area
            type="monotone"
            dataKey="demand"
            stroke="#3B82F6"
            fill="url(#miniDemandGrad)"
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ExpandedRowProps {
  item: ReplenishmentItem;
}

function ExpandedRow({ item }: ExpandedRowProps) {
  // Mock replenishment history
  const history = [
    { date: '2024-05-20', qty: 250, supplier: item.supplier, status: 'delivered' },
    { date: '2024-05-05', qty: 300, supplier: item.supplier, status: 'delivered' },
    { date: '2024-04-18', qty: 200, supplier: item.supplier, status: 'delivered' },
  ];

  return (
    <tr>
      <td colSpan={10} className="bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] p-4">
        <div className="grid grid-cols-3 gap-6">
          {/* Demand Trend */}
          <div>
            <h4 className="text-xs font-medium text-[var(--text-secondary)] mb-2">14-Day Demand Trend</h4>
            <MiniDemandChart />
          </div>

          {/* Stock Details */}
          <div>
            <h4 className="text-xs font-medium text-[var(--text-secondary)] mb-2">Stock Details</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">Current Stock:</span>
                <span className="font-medium">{(item.current_stock ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">Reorder Point:</span>
                <span className="font-medium">{(item.reorder_point ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">Lead Time:</span>
                <span className="font-medium">{(item.lead_time_days ?? 0)} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">Supplier:</span>
                <span className="font-medium">{item.supplier}</span>
              </div>
            </div>
          </div>

          {/* Replenishment History */}
          <div>
            <h4 className="text-xs font-medium text-[var(--text-secondary)] mb-2">Recent Orders</h4>
            <div className="space-y-1.5">
              {(history ?? []).map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1 border border-[var(--border-subtle)]">
                  <span className="text-[var(--text-tertiary)]">{h.date ?? ''}</span>
                  <span className="font-medium">{(h.qty ?? 0)} units</span>
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle size={10} />
                    Delivered
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function ReplenishmentQueue({ data }: ReplenishmentQueueProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [localData, setLocalData] = useState<ReplenishmentItem[]>(data);

  // Filter data by urgency
  const filteredData = useMemo(() => {
    if (urgencyFilter === 'all') return localData;
    return (localData ?? []).filter(d => d.urgency === urgencyFilter);
  }, [localData, urgencyFilter]);

  // Sort by urgency then days to stockout - using safe lookup
  const sortedData = useMemo(() => {
    return (filteredData ?? []).slice().sort((a, b) => {
      const orderA = safeLookup(URGENCY_ORDER, a.urgency, 99);
      const orderB = safeLookup(URGENCY_ORDER, b.urgency, 99);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.days_to_stockout ?? 0) - (b.days_to_stockout ?? 0);
    });
  }, [filteredData]);

  // Summary stats
  const stats = useMemo(() => {
    const pending = (localData ?? []).filter(d => d.status === 'pending');
    return {
      totalPending: (pending ?? []).length,
      totalValue: (pending ?? []).reduce((sum, d) => sum + (d.estimated_cost ?? 0), 0),
      criticalCount: (pending ?? []).filter(d => d.urgency === 'Critical' || d.urgency === 'High').length,
    };
  }, [localData]);

  const getRowKey = (item: ReplenishmentItem) => `${item.product_id}-${item.store_id}`;

  const toggleSelect = useCallback((key: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === (sortedData ?? []).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set((sortedData ?? []).map(getRowKey)));
    }
  }, [selectedIds.size, sortedData]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const startEditing = useCallback((item: ReplenishmentItem) => {
    setEditingId(getRowKey(item));
    setEditQty(item.suggested_qty);
  }, []);

  const saveEdit = useCallback((key: string) => {
    setLocalData(prev =>
      (prev ?? []).map(item => {
        if (getRowKey(item) === key) {
          return {
            ...item,
            suggested_qty: editQty ?? 0,
            estimated_cost: ((item.estimated_cost ?? 0) / (item.suggested_qty ?? 1)) * (editQty ?? 0),
          };
        }
        return item;
      })
    );
    setEditingId(null);
  }, [editQty]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditQty(0);
  }, []);

  const approveSelected = useCallback(() => {
    setLocalData(prev =>
      (prev ?? []).map(item => {
        if (selectedIds.has(getRowKey(item))) {
          return { ...item, status: 'approved' as const };
        }
        return item;
      })
    );
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handleProductClick = useCallback((productId: string) => {
    router.push(`/inventory/product/${productId}`);
  }, [router]);

  // Guard against null/undefined data - after all hooks
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataFallback title="No data" message="Data is not available." />;
  }

  return (
    <ChartCard
      id="replenishment-queue"
      title="Replenishment Queue"
      subtitle={`${stats.totalPending} pending • ${stats.criticalCount} urgent • ₹${(stats.totalValue / 100000).toFixed(1)}L value`}
      height={480}
      data={localData as unknown as Record<string, unknown>[]}
    >
      <div className="h-full flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border-subtle)]">
          {/* Left: Bulk actions */}
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <span className="text-xs text-[var(--text-secondary)]">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={approveSelected}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <Check size={12} />
                  Approve Selected
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <X size={12} />
                  Clear
                </button>
              </>
            )}
          </div>

          {/* Right: Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[var(--text-tertiary)]" />
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="text-xs border border-[var(--border-default)] rounded-md px-2 py-1 bg-white"
            >
              <option value="all">All Urgencies</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-left text-[var(--text-tertiary)] border-b border-[var(--border-default)]">
                <th className="py-2 px-2 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === (sortedData ?? []).length && (sortedData ?? []).length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="py-2 px-1 w-6"></th>
                <th className="py-2 px-2 font-medium">Product</th>
                <th className="py-2 px-2 font-medium">Store</th>
                <th className="py-2 px-2 font-medium text-right">Days to SO</th>
                <th className="py-2 px-2 font-medium text-right">Qty</th>
                <th className="py-2 px-2 font-medium text-right">Cost</th>
                <th className="py-2 px-2 font-medium">Urgency</th>
                <th className="py-2 px-2 font-medium">Status</th>
                <th className="py-2 px-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(sortedData ?? []).map((item) => {
                const key = getRowKey(item);
                const isSelected = selectedIds.has(key);
                const isExpanded = expandedIds.has(key);
                const isEditing = editingId === key;
                const isCritical = (item.urgency ?? '')?.toLowerCase() === 'critical' || item.urgency === 'URGENT';
                const statusIcon = safeLookup(STATUS_ICONS, item.status ?? '', null);

                return (
                  <>
                    <tr
                      key={key}
                      className={`border-t border-[var(--border-subtle)] transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(key)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <button
                          onClick={() => toggleExpand(key)}
                          className="p-0.5 hover:bg-[var(--bg-tertiary)] rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
                          ) : (
                            <ChevronRight size={14} className="text-[var(--text-tertiary)]" />
                          )}
                        </button>
                      </td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => handleProductClick(item.product_id)}
                          className="text-left hover:text-[var(--accent-blue)]"
                        >
                          <p className="font-medium text-[var(--text-primary)] truncate max-w-[140px]" title={item.product_name}>
                            {item.product_name}
                          </p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">{item.product_id}</p>
                        </button>
                      </td>
                      <td className="py-2 px-2">
                        <p className="text-[var(--text-secondary)] truncate max-w-[100px]" title={item.store_name}>
                          {item.store_name}
                        </p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">{item.department}</p>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className={`font-medium ${
                          (item.days_to_stockout ?? 0) <= 3 ? 'text-red-600' :
                          (item.days_to_stockout ?? 0) <= 7 ? 'text-amber-600' :
                          'text-[var(--text-primary)]'
                        }`}>
                          {(item.days_to_stockout ?? 0).toFixed(1)}d
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editQty ?? 0}
                            onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
                            className="w-16 text-right border border-[var(--accent-blue)] rounded px-1 py-0.5 text-xs"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-[var(--text-primary)]">
                            {(item.suggested_qty ?? 0)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                        ₹{((item.estimated_cost ?? 0) / 1000).toFixed(1)}K
                      </td>
                      <td className="py-2 px-2">
                        <UrgencyBadge
                          value={item.urgency}
                          icon={isCritical ? <AlertTriangle size={10} /> : undefined}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <StatusBadge
                          value={item.status}
                          icon={statusIcon}
                        />
                      </td>
                      <td className="py-2 px-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => saveEdit(key)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(item)}
                            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-secondary)] rounded"
                            title="Edit quantity"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && <ExpandedRow item={item} />}
                  </>
                );
              })}
            </tbody>
          </table>

          {(sortedData ?? []).length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
              <Package size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No replenishment items</p>
            </div>
          )}
        </div>
      </div>
    </ChartCard>
  );
}
