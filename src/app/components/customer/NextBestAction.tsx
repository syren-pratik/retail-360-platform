'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Play,
  SkipForward,
  Edit3,
  Clock,
  Target,
  Phone,
  Mail,
  MessageSquare,
  Bell,
  Store,
  AlertTriangle,
  TrendingUp,
  Gift,
  Users,
  Trophy,
  Eye,
  Check,
  X,
} from 'lucide-react';
import { Action, CustomerData } from '@/app/hooks/useNextBestAction';
import { logAction, getActionTypeLabel } from '@/app/lib/action-log';

interface NextBestActionProps {
  customerId: string;
  customerName?: string;
  actions: Action[];
  loading: boolean;
  source: 'claude' | 'rules' | 'cache';
  onRefresh: () => void;
  customerData: CustomerData;
}

const actionTypeIcons: Record<Action['action_type'], React.ReactNode> = {
  retain: <AlertTriangle size={16} />,
  upsell: <TrendingUp size={16} />,
  cross_sell: <Gift size={16} />,
  win_back: <Users size={16} />,
  reward: <Trophy size={16} />,
  no_action: <Eye size={16} />,
};

const actionTypeColors: Record<Action['action_type'], { bg: string; border: string; text: string }> = {
  retain: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  upsell: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  cross_sell: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  win_back: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  reward: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  no_action: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
};

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail size={14} />,
  sms: <MessageSquare size={14} />,
  whatsapp: <MessageSquare size={14} />,
  push: <Bell size={14} />,
  in_store: <Store size={14} />,
  phone_call: <Phone size={14} />,
};

const urgencyColors: Record<string, string> = {
  immediate: 'bg-red-100 text-red-700',
  this_week: 'bg-amber-100 text-amber-700',
  this_month: 'bg-gray-100 text-gray-600',
};

const confidenceColors: Record<string, string> = {
  high: 'text-green-600',
  medium: 'text-amber-600',
  low: 'text-gray-500',
};

function ActionSkeleton() {
  return (
    <div className="p-4 border border-[var(--border-default)] rounded-lg animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="flex-1">
          <div className="w-24 h-4 bg-gray-200 rounded mb-2" />
          <div className="w-full h-5 bg-gray-200 rounded mb-2" />
          <div className="w-3/4 h-4 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

interface CustomizeModalProps {
  action: Action;
  onClose: () => void;
  onSave: (modifiedOffer: string, modifiedChannel: string) => void;
}

function CustomizeModal({ action, onClose, onSave }: CustomizeModalProps) {
  const [offer, setOffer] = useState(action.offer.detail);
  const [channel, setChannel] = useState(action.channel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Customize Action
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Offer
            </label>
            <input
              type="text"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-default)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-default)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="push">Push Notification</option>
              <option value="in_store">In-Store</option>
              <option value="phone_call">Phone Call</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(offer, channel)}
            className="px-4 py-2 text-sm font-medium text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] rounded-md transition-colors"
          >
            Save & Execute
          </button>
        </div>
      </div>
    </div>
  );
}

interface ActionCardProps {
  action: Action;
  customerId: string;
  customerName?: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function ActionCard({ action, customerId, customerName, isExpanded, onToggle }: ActionCardProps) {
  const [showCustomize, setShowCustomize] = useState(false);
  const colors = actionTypeColors[action.action_type];

  const handleExecute = () => {
    logAction({
      customerId,
      customerName,
      action,
      status: 'executed',
    });
    toast.success(`Action executed: ${action.title}`, {
      description: `${action.offer.detail} via ${action.channel}`,
    });
  };

  const handleSkip = () => {
    logAction({
      customerId,
      customerName,
      action,
      status: 'skipped',
    });
    toast.info(`Action skipped: ${action.title}`);
  };

  const handleCustomize = (modifiedOffer: string, modifiedChannel: string) => {
    logAction({
      customerId,
      customerName,
      action,
      status: 'customized',
      customization: {
        originalOffer: action.offer.detail,
        modifiedOffer,
        originalChannel: action.channel,
        modifiedChannel,
      },
    });
    setShowCustomize(false);
    toast.success(`Customized action executed: ${action.title}`, {
      description: `${modifiedOffer} via ${modifiedChannel}`,
    });
  };

  return (
    <>
      <div
        className={`border rounded-lg overflow-hidden transition-all ${colors.border} ${
          action.priority === 1 ? 'ring-2 ring-[var(--accent-primary)] ring-opacity-50' : ''
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 cursor-pointer ${colors.bg}`}
          onClick={onToggle}
        >
          <div className="flex items-start gap-3">
            {/* Priority Badge */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                action.priority === 1
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-white border border-[var(--border-default)] text-[var(--text-secondary)]'
              }`}
            >
              <span className="text-sm font-bold">{action.priority}</span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Action Type Tag */}
              <div className="flex items-center gap-2 mb-1">
                <span className={`flex items-center gap-1 text-xs font-medium ${colors.text}`}>
                  {actionTypeIcons[action.action_type]}
                  {getActionTypeLabel(action.action_type)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${urgencyColors[action.urgency]}`}>
                  {action.urgency === 'immediate' ? 'Urgent' : action.urgency === 'this_week' ? 'This week' : 'This month'}
                </span>
              </div>

              {/* Title */}
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                {action.title}
              </h4>

              {/* Description Preview */}
              {!isExpanded && (
                <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                  {action.description}
                </p>
              )}
            </div>

            {/* Expand Toggle */}
            <button className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="p-4 bg-white border-t border-[var(--border-subtle)]">
            {/* Full Description */}
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {action.description}
            </p>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Offer */}
              <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Offer</p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {action.offer.type === 'none' ? 'No offer needed' : action.offer.detail}
                </p>
              </div>

              {/* Channel */}
              <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Channel</p>
                <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                  {channelIcons[action.channel]}
                  <span className="capitalize">{action.channel.replace('_', ' ')}</span>
                </p>
              </div>

              {/* Expected Impact */}
              <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Expected Impact</p>
                <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                  <Target size={14} className="text-green-600" />
                  {action.expected_impact}
                </p>
              </div>

              {/* Confidence */}
              <div className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Confidence</p>
                <p className={`text-sm font-medium capitalize ${confidenceColors[action.confidence]}`}>
                  {action.confidence}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {action.action_type !== 'no_action' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExecute}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-md text-sm font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
                >
                  <Play size={14} />
                  Execute
                </button>
                <button
                  onClick={() => setShowCustomize(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-[var(--border-default)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <Edit3 size={14} />
                  Customize
                </button>
                <button
                  onClick={handleSkip}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-[var(--border-default)] rounded-md text-sm font-medium text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <SkipForward size={14} />
                  Skip
                </button>
              </div>
            )}

            {action.action_type === 'no_action' && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Check size={16} className="text-green-600" />
                <span className="text-sm text-[var(--text-secondary)]">
                  No immediate action required. Continue monitoring.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customize Modal */}
      {showCustomize && (
        <CustomizeModal
          action={action}
          onClose={() => setShowCustomize(false)}
          onSave={handleCustomize}
        />
      )}
    </>
  );
}

export default function NextBestAction({
  customerId,
  customerName,
  actions,
  loading,
  source,
  onRefresh,
  customerData,
}: NextBestActionProps) {
  const [expandedIndex, setExpandedIndex] = useState<number>(0); // First action expanded by default
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  // Show loading skeleton
  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--accent-primary)]" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Next Best Actions
            </h3>
            <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full animate-pulse">
              Analyzing...
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <ActionSkeleton />
          <ActionSkeleton />
          <ActionSkeleton />
        </div>
      </div>
    );
  }

  if (actions.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--accent-primary)]" />
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Next Best Actions
            </h3>
          </div>
        </div>
        <div className="text-center py-8 text-[var(--text-tertiary)]">
          <X size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Unable to generate recommendations</p>
          <button
            onClick={handleRefresh}
            className="mt-3 text-sm text-[var(--accent-primary)] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[var(--accent-primary)]" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Next Best Actions
          </h3>
          <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
            {actions.length}
          </span>
          {/* Source Badge */}
          {source === 'claude' || source === 'cache' ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex items-center gap-1">
              <Sparkles size={10} />
              AI-powered
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
              <Clock size={10} />
              Rule-based
            </span>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          title="Regenerate recommendations"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Customer Context Summary */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-[var(--bg-secondary)] rounded-lg text-xs">
        <div>
          <span className="text-[var(--text-tertiary)]">CLV:</span>{' '}
          <span className="font-medium text-[var(--text-primary)]">
            ₹{Math.round(customerData.clv_12m).toLocaleString('en-IN')}
          </span>
        </div>
        <div>
          <span className="text-[var(--text-tertiary)]">Churn Risk:</span>{' '}
          <span className={`font-medium ${
            customerData.churn_prob_90d > 0.5 ? 'text-red-600' :
            customerData.churn_prob_90d > 0.3 ? 'text-amber-600' : 'text-green-600'
          }`}>
            {(customerData.churn_prob_90d * 100).toFixed(0)}%
          </span>
        </div>
        <div>
          <span className="text-[var(--text-tertiary)]">Last Purchase:</span>{' '}
          <span className="font-medium text-[var(--text-primary)]">
            {customerData.days_since_last_purchase} days ago
          </span>
        </div>
        <div>
          <span className="text-[var(--text-tertiary)]">Top Category:</span>{' '}
          <span className="font-medium text-[var(--text-primary)]">
            {customerData.top_category}
          </span>
        </div>
      </div>

      {/* Action Cards */}
      <div className="space-y-3">
        {actions.map((action, index) => (
          <ActionCard
            key={`${action.priority}-${action.action_type}`}
            action={action}
            customerId={customerId}
            customerName={customerName}
            isExpanded={expandedIndex === index}
            onToggle={() => setExpandedIndex(expandedIndex === index ? -1 : index)}
          />
        ))}
      </div>
    </div>
  );
}
