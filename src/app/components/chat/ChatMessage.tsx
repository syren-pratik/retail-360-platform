'use client';

import { Sparkles, User, ChevronDown, ChevronUp, Copy, Check, Database, Clock, Rows3, Wrench } from 'lucide-react';
import { useState, useCallback } from 'react';
import { UIComponentType } from '@/app/lib/types';
import ChatComponentRenderer from './ChatComponentRenderer';
import {
  CreateSegmentCard,
  SetAlertCard,
  ExportDataCard,
  FilterAppliedCard,
  NBATriggerCard,
} from './AgentActionCards';
import ChartOptionsSelector, { ChartOptionData } from './ChartOptionsSelector';
import ChartActionBar from './ChartActionBar';
import type { PinnedChart } from '@/app/lib/pinned-charts';

// ============================================================================
// TYPES
// ============================================================================

interface SQLMeta {
  executionTime?: number;
  rowCount?: number;
  source?: 'mock' | 'databricks' | 'claude';
}

interface ToolResult {
  tool: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

interface ChartConfig {
  id: string;
  chart_type: PinnedChart['chart_type'];
  title: string;
  data: unknown[];
  config: Record<string, unknown>;
  pinnable: boolean;
}

interface DashboardAction {
  type: 'pin_chart' | 'create_segment' | 'set_alert' | 'apply_filter' | 'download_csv' | 'show_nba';
  payload: Record<string, unknown>;
}

interface ChartProposal {
  question: string;
  data_summary: string;
  options: ChartOptionData[];
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  ui_component?: UIComponentType;
  sql?: string;
  sqlMeta?: SQLMeta;
  timestamp?: Date;
  onChartClick?: (data: { key: string; value: string | number; label: string; chartTitle?: string }) => void;
  // Agent-specific props
  toolResults?: ToolResult[];
  chartsCreated?: ChartConfig[];
  chartProposal?: ChartProposal;
  actions?: DashboardAction[];
  onFilterApply?: (filterType: string, value: string, action: string) => void;
  onNBAView?: (targetType: string, targetId: string) => void;
  onChartOptionSelect?: (option: ChartOptionData) => void;
  onCustomizeChart?: (chartId: string) => void;
}

// Simple SQL syntax highlighter
function highlightSQL(sql: string): React.ReactNode {
  const keywords = /\b(SELECT|FROM|WHERE|AND|OR|GROUP BY|ORDER BY|HAVING|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|DISTINCT|COUNT|SUM|AVG|MIN|MAX|LIMIT|OFFSET|DESC|ASC|IN|NOT|NULL|IS|LIKE|BETWEEN|CASE|WHEN|THEN|ELSE|END|WITH|UNION|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|VIEW)\b/gi;
  const strings = /('[^']*')/g;
  const numbers = /\b(\d+\.?\d*)\b/g;

  let result = sql;

  // Highlight strings (green)
  result = result.replace(strings, '<span class="text-green-600">$1</span>');

  // Highlight numbers (orange)
  result = result.replace(numbers, '<span class="text-orange-500">$1</span>');

  // Highlight keywords (blue)
  result = result.replace(keywords, '<span class="text-blue-600 font-medium">$1</span>');

  return <span dangerouslySetInnerHTML={{ __html: result }} />;
}

export default function ChatMessage({
  role,
  content,
  ui_component,
  sql,
  sqlMeta,
  onChartClick,
  toolResults,
  chartsCreated,
  chartProposal,
  actions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onFilterApply,
  onNBAView,
  onChartOptionSelect,
  onCustomizeChart,
}: ChatMessageProps) {
  const [showSQL, setShowSQL] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set());
  const [savedSegments, setSavedSegments] = useState<Set<string>>(new Set());
  const [savedAlerts, setSavedAlerts] = useState<Set<string>>(new Set());
  const isUser = role === 'user';

  // Check if this is an agent response
  const isAgentResponse = !!(toolResults?.length || chartsCreated?.length || chartProposal || actions?.length);

  const handleCopySQL = useCallback(() => {
    if (sql) {
      navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [sql]);

  // Parse markdown bold text
  const formatContent = (text: string) => {
    // Convert **text** to bold spans
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex gap-2 max-w-[85%]">
          <div className="bg-[var(--accent-primary-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]">
            {content}
          </div>
          <div className="w-7 h-7 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
            <User size={14} className="text-[var(--text-secondary)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-[var(--accent-primary-light)] flex items-center justify-center flex-shrink-0">
        <Sparkles size={14} className="text-[var(--accent-primary)]" />
      </div>
      <div className="flex-1 max-w-[90%]">
        <div className="bg-white border border-[var(--border-default)] rounded-lg px-3 py-2">
          <div className="text-sm text-[var(--text-primary)] leading-relaxed">
            {formatContent(content)}
          </div>

          {/* Render UI Component */}
          {ui_component && ui_component.type !== 'text_only' && (
            <ChatComponentRenderer
              component={ui_component}
              onElementClick={onChartClick}
            />
          )}

          {/* Render Chart Proposal Options */}
          {chartProposal && onChartOptionSelect && (
            <ChartOptionsSelector
              question={chartProposal.question}
              dataSummary={chartProposal.data_summary}
              options={chartProposal.options}
              onSelect={onChartOptionSelect}
            />
          )}

          {/* Render Charts Created by Agent */}
          {chartsCreated && chartsCreated.length > 0 && (
            <div className="mt-3 space-y-3">
              {chartsCreated.map((chart) => {
                const chartComponent = {
                  type: chart.chart_type,
                  data: chart.data,
                  title: chart.title,
                  ...chart.config,
                } as UIComponentType;

                return (
                  <div key={chart.id}>
                    <ChatComponentRenderer
                      component={chartComponent}
                      onElementClick={onChartClick}
                    />

                    {/* Action Bar for rendered charts (Pin/Export/Customize) */}
                    {chart.pinnable && (
                      <ChartActionBar
                        chartId={chart.id}
                        chartType={chart.chart_type}
                        title={chart.title}
                        data={chart.data as unknown[]}
                        config={chart.config}
                        onCustomize={onCustomizeChart ? () => onCustomizeChart(chart.id) : undefined}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Render Agent Actions */}
          {actions && actions.length > 0 && (
            <div className="mt-3 space-y-2">
              {actions.map((action, idx) => {
                const actionKey = `${action.type}_${idx}`;

                // Create Segment Action
                if (action.type === 'create_segment' && !savedSegments.has(actionKey) && !dismissedActions.has(actionKey)) {
                  const segmentPayload = action.payload.segment as Record<string, unknown> | undefined;
                  if (segmentPayload) {
                    return (
                      <CreateSegmentCard
                        key={actionKey}
                        segmentData={{
                          name: segmentPayload.name as string,
                          rules: segmentPayload.rules as Array<{ field: string; operator: string; value: unknown }>,
                          description: segmentPayload.description as string | undefined,
                          customerCount: action.payload.customerCount as number | undefined,
                        }}
                        onSave={() => setSavedSegments((prev) => new Set(prev).add(actionKey))}
                        onCancel={() => setDismissedActions((prev) => new Set(prev).add(actionKey))}
                      />
                    );
                  }
                }

                // Set Alert Action
                if (action.type === 'set_alert' && !savedAlerts.has(actionKey) && !dismissedActions.has(actionKey)) {
                  const alertPayload = action.payload.alert as Record<string, unknown> | undefined;
                  if (alertPayload) {
                    return (
                      <SetAlertCard
                        key={actionKey}
                        alertData={{
                          name: alertPayload.name as string,
                          metric: alertPayload.metric as string,
                          condition: alertPayload.condition as 'above' | 'below' | 'change_by',
                          threshold: alertPayload.threshold as number,
                          segment_filter: alertPayload.segment_filter as string | undefined,
                          frequency: alertPayload.frequency as 'daily' | 'weekly' | 'on_refresh' | undefined,
                        }}
                        onSave={() => setSavedAlerts((prev) => new Set(prev).add(actionKey))}
                        onCancel={() => setDismissedActions((prev) => new Set(prev).add(actionKey))}
                      />
                    );
                  }
                }

                // Apply Filter Action
                if (action.type === 'apply_filter') {
                  return (
                    <FilterAppliedCard
                      key={actionKey}
                      filterType={action.payload.filterType as string}
                      value={action.payload.value as string}
                      action={action.payload.filterAction as 'add' | 'remove' | 'reset_all'}
                    />
                  );
                }

                // Download CSV Action
                if (action.type === 'download_csv' && !dismissedActions.has(actionKey)) {
                  return (
                    <ExportDataCard
                      key={actionKey}
                      filename={action.payload.filename as string}
                      data={action.payload.data as unknown[]}
                      description={action.payload.description as string | undefined}
                      onDownload={() => setDismissedActions((prev) => new Set(prev).add(actionKey))}
                    />
                  );
                }

                // Show NBA Action
                if (action.type === 'show_nba') {
                  return (
                    <NBATriggerCard
                      key={actionKey}
                      targetType={action.payload.targetType as 'customer' | 'segment'}
                      targetId={action.payload.targetId as string}
                      maxCustomers={action.payload.maxCustomers as number | undefined}
                      onViewActions={() => onNBAView?.(
                        action.payload.targetType as string,
                        action.payload.targetId as string
                      )}
                    />
                  );
                }

                return null;
              })}
            </div>
          )}

          {/* Tool Results Toggle (for debugging/transparency) */}
          {isAgentResponse && toolResults && toolResults.length > 0 && (
            <div className="mt-3 pt-2 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setShowTools(!showTools)}
                className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              >
                {showTools ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <Wrench size={12} />
                <span>{toolResults.length} tool{toolResults.length > 1 ? 's' : ''} used</span>
              </button>

              {showTools && (
                <div className="mt-2 space-y-2">
                  {toolResults.map((result, idx) => (
                    <div key={idx} className="text-xs p-2 bg-[var(--bg-secondary)] rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[var(--text-primary)]">{result.tool}</span>
                        {result.output.success ? (
                          <span className="text-green-600 text-xs font-semibold">OK</span>
                        ) : (
                          <span className="text-red-600 text-xs font-semibold">Error</span>
                        )}
                      </div>
                      {typeof result.output.rowCount === 'number' && (
                        <span className="text-[var(--text-tertiary)]">
                          {result.output.rowCount} rows
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SQL Toggle with enhanced viewer */}
          {sql && (
            <div className="mt-3 pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowSQL(!showSQL)}
                  className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {showSQL ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  <span>SQL Query</span>
                </button>

                {/* SQL metadata badges */}
                <div className="flex items-center gap-2">
                  {sqlMeta?.source && (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      sqlMeta.source === 'databricks'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      <Database size={10} />
                      {sqlMeta.source === 'databricks' ? 'Live' : 'Mock'}
                    </span>
                  )}
                  {sqlMeta?.executionTime !== undefined && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                      <Clock size={10} />
                      {(sqlMeta.executionTime / 1000).toFixed(2)}s
                    </span>
                  )}
                  {sqlMeta?.rowCount !== undefined && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                      <Rows3 size={10} />
                      {sqlMeta.rowCount} rows
                    </span>
                  )}
                </div>
              </div>

              {showSQL && (
                <div className="mt-2 relative">
                  <pre className="p-3 bg-[var(--bg-tertiary)] rounded text-xs overflow-x-auto font-mono leading-relaxed">
                    <code>{highlightSQL(sql)}</code>
                  </pre>
                  <button
                    onClick={handleCopySQL}
                    className="absolute top-2 right-2 p-1.5 rounded bg-white/80 hover:bg-white text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Copy SQL"
                  >
                    {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
