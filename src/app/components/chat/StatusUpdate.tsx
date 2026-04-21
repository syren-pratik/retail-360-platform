'use client';

import { Check, Info, AlertTriangle, Pin, Bell, Users, Download, Filter } from 'lucide-react';
import { safeLookup } from '@/app/lib/safe-data';

export interface StatusUpdateData {
  status: 'success' | 'info' | 'warning';
  message: string;
  detail?: string;
  actionType?: 'pin_chart' | 'create_segment' | 'set_alert' | 'export' | 'apply_filter';
  actions?: { label: string; onClick?: () => void }[];
}

interface StatusUpdateProps {
  data: StatusUpdateData;
  onActionClick?: (action: string) => void;
}

interface StatusStyle {
  bg: string;
  border: string;
  icon: typeof Check;
  iconColor: string;
}

const DEFAULT_STATUS_STYLE: StatusStyle = {
  bg: 'bg-gray-50',
  border: 'border-gray-200',
  icon: Info,
  iconColor: 'text-gray-600',
};

const statusStyles: Record<string, StatusStyle> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: Check,
    iconColor: 'text-green-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Info,
    iconColor: 'text-blue-600',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
  },
};

const actionIcons: Record<string, typeof Pin> = {
  pin_chart: Pin,
  create_segment: Users,
  set_alert: Bell,
  export: Download,
  apply_filter: Filter,
};

export default function StatusUpdate({ data, onActionClick }: StatusUpdateProps) {
  const style = safeLookup(statusStyles, data.status, DEFAULT_STATUS_STYLE, { normalize: 'lowercase' });
  const StatusIcon = style.icon;
  const ActionIcon = data.actionType ? safeLookup(actionIcons, data.actionType, null as unknown as typeof Pin, { normalize: 'lowercase' }) : null;

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-lg p-3 my-2`}
    >
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 ${style.iconColor}`}>
          {ActionIcon ? <ActionIcon size={16} /> : <StatusIcon size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--text-primary)]">
            {data.message}
          </div>
          {data.detail && (
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">
              {data.detail}
            </div>
          )}
          {data.actions && data.actions.length > 0 && (
            <div className="flex gap-2 mt-2">
              {data.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick?.();
                    onActionClick?.(action.label);
                  }}
                  className="text-xs font-medium text-[var(--accent-primary)] hover:underline"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
