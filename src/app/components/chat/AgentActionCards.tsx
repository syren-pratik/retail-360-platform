'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Pin,
  PinOff,
  Download,
  Users,
  Bell,
  Filter,
  Target,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { pinChart, PinnedChart } from '@/app/lib/pinned-charts';
import { saveAlert, AlertRule } from '@/app/lib/alerts';
import { saveSegment, CustomerSegment, formatRule } from '@/app/lib/segments';

// ============================================================================
// TYPES
// ============================================================================

interface ChartConfig {
  id: string;
  chart_type: string;
  title: string;
  data: unknown[];
  config: Record<string, unknown>;
  pinnable: boolean;
}

// ============================================================================
// PIN CHART ACTION CARD
// ============================================================================

interface PinChartCardProps {
  chart: ChartConfig;
  onPin: () => void;
  onCancel: () => void;
}

export function PinChartCard({ chart, onPin, onCancel }: PinChartCardProps) {
  const [section, setSection] = useState<PinnedChart['section']>('after_kpis');
  const [size, setSize] = useState<'half' | 'full'>('half');
  const [isPinning, setIsPinning] = useState(false);

  const handlePin = async () => {
    setIsPinning(true);
    try {
      pinChart({
        id: chart.id,
        chart_type: chart.chart_type as PinnedChart['chart_type'],
        title: chart.title,
        data: chart.data,
        config: chart.config as PinnedChart['config'],
        section,
        size,
        pinnedBy: 'ai_agent',
        module: 'cx360',
      });
      toast.success(`Chart "${chart.title}" pinned to dashboard`);
      onPin();
    } catch (error) {
      toast.error('Failed to pin chart');
      console.error(error);
    } finally {
      setIsPinning(false);
    }
  };

  return (
    <div className="mt-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Pin size={16} className="text-indigo-600" />
        <span className="font-medium text-indigo-900">Pin to Dashboard?</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-indigo-700 mb-1">Section</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as PinnedChart['section'])}
            className="w-full px-2 py-1.5 text-sm border border-indigo-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="top">Top</option>
            <option value="after_kpis">After KPIs</option>
            <option value="after_churn">After Churn Analysis</option>
            <option value="after_cohort">After Cohort</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-indigo-700 mb-1">Size</label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as 'half' | 'full')}
            className="w-full px-2 py-1.5 text-sm border border-indigo-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="half">Half Width</option>
            <option value="full">Full Width</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePin}
          disabled={isPinning}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Check size={14} />
          {isPinning ? 'Pinning...' : 'Pin Chart'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 border border-indigo-200 text-indigo-700 rounded-md text-sm font-medium hover:bg-indigo-100 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// CREATE SEGMENT ACTION CARD
// ============================================================================

interface SegmentData {
  name: string;
  rules: Array<{ field: string; operator: string; value: unknown }>;
  description?: string;
  customerCount?: number;
}

interface CreateSegmentCardProps {
  segmentData: SegmentData;
  onSave: (segment: CustomerSegment) => void;
  onCancel: () => void;
}

export function CreateSegmentCard({ segmentData, onSave, onCancel }: CreateSegmentCardProps) {
  const [name, setName] = useState(segmentData.name);
  const [description, setDescription] = useState(segmentData.description || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const segment = saveSegment({
        name,
        description,
        rules: segmentData.rules as CustomerSegment['rules'],
        createdBy: 'ai_agent',
        module: 'cx360',
        customerCount: segmentData.customerCount,
      });
      toast.success(`Segment "${name}" created successfully`);
      onSave(segment);
    } catch (error) {
      toast.error('Failed to create segment');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-purple-600" />
          <span className="font-medium text-purple-900">Create Segment</span>
        </div>
        {segmentData.customerCount && (
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
            ~{segmentData.customerCount.toLocaleString()} customers
          </span>
        )}
      </div>

      <div className="space-y-3 mb-3">
        <div>
          <label className="block text-xs text-purple-700 mb-1">Segment Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-purple-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs text-purple-700 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full px-3 py-1.5 text-sm border border-purple-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Rules */}
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-purple-700 hover:text-purple-900"
          >
            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {segmentData.rules.length} filter rules
          </button>
          {isExpanded && (
            <div className="mt-2 space-y-1">
              {segmentData.rules.map((rule, idx) => (
                <div key={idx} className="text-xs text-purple-800 bg-purple-100 px-2 py-1 rounded">
                  {formatRule(rule as CustomerSegment['rules'][0])}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          <Check size={14} />
          {isSaving ? 'Saving...' : 'Save Segment'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 border border-purple-200 text-purple-700 rounded-md text-sm font-medium hover:bg-purple-100 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SET ALERT ACTION CARD
// ============================================================================

interface AlertData {
  name: string;
  metric: string;
  condition: 'above' | 'below' | 'change_by';
  threshold: number;
  segment_filter?: string;
  frequency?: 'daily' | 'weekly' | 'on_refresh';
}

interface SetAlertCardProps {
  alertData: AlertData;
  onSave: (alert: AlertRule) => void;
  onCancel: () => void;
}

export function SetAlertCard({ alertData, onSave, onCancel }: SetAlertCardProps) {
  const [name, setName] = useState(alertData.name);
  const [threshold, setThreshold] = useState(alertData.threshold);
  const [frequency, setFrequency] = useState<AlertRule['frequency']>(alertData.frequency || 'on_refresh');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const alert = saveAlert({
        name,
        metric: alertData.metric,
        condition: alertData.condition,
        threshold,
        segmentFilter: alertData.segment_filter,
        frequency,
        active: true,
        createdBy: 'ai_agent',
        module: 'cx360',
      });
      toast.success(`Alert "${name}" created and activated`);
      onSave(alert);
    } catch (error) {
      toast.error('Failed to create alert');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatThreshold = () => {
    if (alertData.metric.includes('rate') || alertData.metric.includes('probability')) {
      return `${(threshold * 100).toFixed(0)}%`;
    }
    if (alertData.metric.includes('clv') || alertData.metric.includes('spend')) {
      return `₹${threshold.toLocaleString('en-IN')}`;
    }
    return threshold.toLocaleString('en-IN');
  };

  return (
    <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Bell size={16} className="text-amber-600" />
        <span className="font-medium text-amber-900">Create Alert</span>
      </div>

      <div className="space-y-3 mb-3">
        <div>
          <label className="block text-xs text-amber-700 mb-1">Alert Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-amber-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="p-2 bg-amber-100 rounded text-sm">
          <span className="text-amber-800">
            Trigger when <strong>{alertData.metric}</strong> goes{' '}
            <strong>{alertData.condition}</strong> <strong>{formatThreshold()}</strong>
            {alertData.segment_filter && (
              <> for <strong>{alertData.segment_filter}</strong> segment</>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-amber-700 mb-1">Threshold</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              step={alertData.metric.includes('rate') ? 0.01 : 100}
              className="w-full px-3 py-1.5 text-sm border border-amber-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-amber-700 mb-1">Check Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as AlertRule['frequency'])}
              className="w-full px-2 py-1.5 text-sm border border-amber-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="on_refresh">On Data Refresh</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          <Check size={14} />
          {isSaving ? 'Activating...' : 'Activate Alert'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 border border-amber-200 text-amber-700 rounded-md text-sm font-medium hover:bg-amber-100 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT DATA ACTION CARD
// ============================================================================

interface ExportDataCardProps {
  filename: string;
  data: unknown[];
  description?: string;
  onDownload: () => void;
}

export function ExportDataCard({ filename, data, description, onDownload }: ExportDataCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);

    try {
      // Convert data to CSV
      if (!Array.isArray(data) || data.length === 0) {
        toast.error('No data to export');
        return;
      }

      const headers = Object.keys(data[0] as object);
      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          headers.map((h) => {
            const value = (row as Record<string, unknown>)[h];
            // Escape quotes and wrap in quotes if contains comma
            const str = String(value ?? '');
            return str.includes(',') || str.includes('"')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(',')
        ),
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${filename}`);
      onDownload();
    } catch (error) {
      toast.error('Failed to export data');
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Download size={16} className="text-green-600" />
          <span className="font-medium text-green-900">Export Ready</span>
        </div>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          {data.length} rows
        </span>
      </div>

      <div className="text-sm text-green-800 mb-3">
        <p className="font-medium">{filename}</p>
        {description && <p className="text-xs text-green-600 mt-1">{description}</p>}
      </div>

      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        <Download size={14} />
        {isDownloading ? 'Downloading...' : 'Download CSV'}
      </button>
    </div>
  );
}

// ============================================================================
// FILTER APPLIED ACTION CARD
// ============================================================================

interface FilterAppliedCardProps {
  filterType: string;
  value: string;
  action: 'add' | 'remove' | 'reset_all';
}

export function FilterAppliedCard({ filterType, value, action }: FilterAppliedCardProps) {
  return (
    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
      <Filter size={16} className="text-blue-600" />
      <span className="text-sm text-blue-900">
        {action === 'reset_all' ? (
          'All filters cleared'
        ) : action === 'remove' ? (
          <>Removed filter: <strong>{filterType} = {value}</strong></>
        ) : (
          <>Dashboard filtered to: <strong>{value}</strong></>
        )}
      </span>
      <Check size={14} className="text-blue-600 ml-auto" />
    </div>
  );
}

// ============================================================================
// NBA TRIGGER CARD
// ============================================================================

interface NBATriggerCardProps {
  targetType: 'customer' | 'segment';
  targetId: string;
  maxCustomers?: number;
  onViewActions: () => void;
}

export function NBATriggerCard({ targetType, targetId, maxCustomers, onViewActions }: NBATriggerCardProps) {
  return (
    <div className="mt-3 p-4 bg-rose-50 border border-rose-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Target size={16} className="text-rose-600" />
        <span className="font-medium text-rose-900">Next Best Actions</span>
      </div>

      <p className="text-sm text-rose-800 mb-3">
        {targetType === 'customer' ? (
          <>Generating personalized actions for customer <strong>{targetId}</strong></>
        ) : (
          <>Generating actions for <strong>{targetId}</strong> segment
            {maxCustomers && <> (top {maxCustomers} customers)</>}</>
        )}
      </p>

      <button
        onClick={onViewActions}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-600 text-white rounded-md text-sm font-medium hover:bg-rose-700 transition-colors"
      >
        <ExternalLink size={14} />
        View Recommended Actions
      </button>
    </div>
  );
}

// ============================================================================
// PINNED CONFIRMATION CARD (shown after successful pin)
// ============================================================================

interface PinnedConfirmationProps {
  chartTitle: string;
  section: string;
  onUnpin: () => void;
}

export function PinnedConfirmation({ chartTitle, section, onUnpin }: PinnedConfirmationProps) {
  return (
    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pin size={16} className="text-green-600" />
          <span className="text-sm text-green-900">
            <strong>{chartTitle}</strong> pinned to {section.replace('_', ' ')}
          </span>
        </div>
        <button
          onClick={onUnpin}
          className="text-xs text-green-700 hover:text-green-900 flex items-center gap-1"
        >
          <PinOff size={12} />
          Unpin
        </button>
      </div>
    </div>
  );
}
