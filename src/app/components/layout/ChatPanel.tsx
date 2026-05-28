'use client';

import { Sparkles, X } from 'lucide-react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useParams } from 'next/navigation';
import ChatMessage from '../chat/ChatMessage';
import ChatInput from '../chat/ChatInput';
import { UIComponentType } from '@/app/lib/types';
import { useDashboard } from '@/app/context/DashboardContext';
import { ChartOptionData } from '../chat/ChartOptionsSelector';
import type { PinnedChart } from '@/app/lib/pinned-charts';

interface ChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ui_component?: UIComponentType;
  sql?: string;
  sqlMeta?: {
    executionTime?: number;
    rowCount?: number;
    source?: 'mock' | 'databricks' | 'claude';
  };
  timestamp: Date;
  // Agent-specific fields
  toolResults?: ToolResult[];
  chartsCreated?: ChartConfig[];
  chartProposal?: ChartProposal;
  actions?: DashboardAction[];
}

type ModuleType = 'cx360' | 'demand' | 'inventory' | 'merchandise' | 'coldstart';

// Context-aware prompt configurations
const CX360_DEFAULT_PROMPTS = [
  'Show churn by segment',
  'Create a segment of high-value churners',
  'Alert me if Premium churn > 25%',
];

const CX360_SEGMENT_FILTER_PROMPTS = (segment: string) => [
  `What's the churn rate for ${segment} customers?`,
  `Show me ${segment} customers at risk of churning`,
  `Compare ${segment} CLV to other segments`,
];

const CX360_DRILLDOWN_PROMPTS = (drilldown: { source: string; field: string; value: string }) => {
  const { source, field, value } = drilldown;
  if (source.includes('clv') || field.includes('tier') || field.includes('clv')) {
    return [
      `Why are ${value} tier customers churning?`,
      `What's the retention pattern for ${value} tier?`,
      `Show me ${value} tier customers by store`,
    ];
  }
  if (source.includes('churn') || field.includes('churn')) {
    return [
      `What's driving ${value} risk churn?`,
      `How can we retain ${value} risk customers?`,
      `Show top ${value} risk customers`,
    ];
  }
  return CX360_DEFAULT_PROMPTS;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CX360_CUSTOMER_DETAIL_PROMPTS = (_customerId: string) => [
  `What drives this customer's churn risk?`,
  'Show me similar customers to this one',
  'What products should I recommend to this customer?',
];

const DEMAND_DEFAULT_PROMPTS = [
  "What's the forecast accuracy for Dairy?",
  'Which SKUs have the most lost sales?',
  'Show me the demand forecast for next 14 days',
  "What's driving demand for Beverages?",
];

const INVENTORY_DEFAULT_PROMPTS = [
  "Why is revenue at risk increasing this week?",
  "Which supplier is causing the most stockouts?",
  "Show me categories with worst forecast accuracy",
  "Which stores need urgent replenishment today?",
];

const CX360_WELCOME: Message = {
  id: 'welcome-cx360',
  role: 'assistant',
  content: "Hi! I'm your AI **agent** for customer analytics. I can not only answer questions, but also **take actions** on your dashboard:\n\n- Query data and create charts\n- Pin charts to your dashboard\n- Create customer segments\n- Set up monitoring alerts\n- Generate action recommendations\n\nTry asking me to \"show churn by segment and pin it\" or \"create a segment of high-value churning customers\"!",
  timestamp: new Date(),
};

const DEMAND_WELCOME: Message = {
  id: 'welcome-demand',
  role: 'assistant',
  content: "Hi! I'm your AI **agent** for demand forecasting. I can not only answer questions, but also **take actions** on your dashboard:\n\n- Query forecast data and visualize\n- Pin charts to your dashboard\n- Set up alerts for anomalies\n- Export data to CSV\n\nTry asking me about \"forecast accuracy for Dairy\" or \"which SKUs have the most lost sales\"!",
  timestamp: new Date(),
};

const INVENTORY_WELCOME: Message = {
  id: 'welcome-inventory',
  role: 'assistant',
  content: "Hi! I'm your Inventory Intelligence assistant. I can analyse inventory health, forecast accuracy, supplier performance, and recommend actions.\n\n- Identify stockout root causes\n- Analyse supplier OTIF trends\n- Forecast accuracy by department\n- Replenishment priority recommendations\n\nTry asking me to analyse stockout root causes or identify reorder priorities.",
  timestamp: new Date(),
};

const MERCHANDISE_WELCOME: Message = {
  id: 'welcome-merchandise',
  role: 'assistant',
  content: "Hi! I'm your Merchandise Demand analyst. I help category managers act on forecast signals, event ramp-ups, and promo performance — not just answer questions, but surface the next action.\n\n- Identify understock and overstock risks by category\n- Surface SKUs not ramped for upcoming events\n- Analyse promo lift vs. target and flag under-performers\n- Forecast accuracy by velocity class and department\n\nTry asking \"which SKUs are not ramped for the next event?\" or \"which categories will miss their Q2 plan?\"",
  timestamp: new Date(),
};

const COLDSTART_WELCOME: Message = {
  id: 'welcome-coldstart',
  role: 'assistant',
  content: "Hi! I'm your Cold-Start Forecasting analyst for the Lucknow new-store launch.\n\n- Drill into individual SKU accuracy — predicted vs actual with 95% CI bands\n- Understand how Bayesian blending evolves as local data accumulates (α curve)\n- Identify which festival × category pairs drive the largest demand spikes\n- Compare analog city contributions in the prediction decomposition\n- Find the worst-forecasting SKUs in the 90-day holdout set\n\nTry asking \"at what α does the blended model stabilise?\" or \"which SKU has the widest CI on Day 1?\"",
  timestamp: new Date(),
};

const COLDSTART_DEFAULT_PROMPTS = [
  'Which hero SKU has the highest analog MAPE vs champion MAPE gap?',
  'At what day does the confidence interval narrow below 20% of predicted?',
  'Which festival × category pair shows the sharpest demand ramp?',
  'How does the blended prediction decompose on Day 45 for Coffee?',
  'Which SKU holdout rows have error > 40% and why?',
];

export default function ChatPanel({ isOpen, onToggle }: ChatPanelProps) {
  const pathname = usePathname();
  const params = useParams();
  const currentModule: ModuleType =
    pathname.startsWith('/merchandise/cold-start') ? 'coldstart' :
    pathname.startsWith('/merchandise') ? 'merchandise' :
    pathname.startsWith('/demand') ? 'demand' :
    pathname.startsWith('/inventory') ? 'inventory' : 'cx360';
  const [lastModule, setLastModule] = useState<ModuleType>(currentModule);

  const welcomeMessage =
    currentModule === 'coldstart' ? COLDSTART_WELCOME :
    currentModule === 'merchandise' ? MERCHANDISE_WELCOME :
    currentModule === 'demand' ? DEMAND_WELCOME :
    currentModule === 'inventory' ? INVENTORY_WELCOME : CX360_WELCOME;

  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    pendingChatMessage,
    clearPendingChatMessage,
    globalFilters,
    activeDrilldowns,
  } = useDashboard();

  // Determine if on customer detail page
  const isCustomerDetailPage = pathname.includes('/customer/');
  const currentCustomerId = isCustomerDetailPage ? (params?.id as string) : undefined;

  // Context-aware prompts based on active state
  const examplePrompts = useMemo(() => {
    if (currentModule === 'coldstart') {
      return COLDSTART_DEFAULT_PROMPTS;
    }
    if (currentModule === 'merchandise') {
      return [
        'Which SKUs are not ramped for the next event?',
        'Show me under-performing promos',
        "What's the forecast accuracy for Grocery & Staples?",
        'Which categories will miss their Q2 plan?',
      ];
    }
    if (currentModule === 'demand') {
      return DEMAND_DEFAULT_PROMPTS;
    }
    if (currentModule === 'inventory') {
      return INVENTORY_DEFAULT_PROMPTS;
    }

    // Customer detail page prompts
    if (isCustomerDetailPage && currentCustomerId) {
      return CX360_CUSTOMER_DETAIL_PROMPTS(currentCustomerId);
    }

    // Drilldown active - use drilldown-specific prompts
    if (activeDrilldowns.length > 0) {
      const latestDrilldown = activeDrilldowns[activeDrilldowns.length - 1];
      return CX360_DRILLDOWN_PROMPTS(latestDrilldown);
    }

    // Segment filter active
    if (globalFilters.segments.length === 1) {
      return CX360_SEGMENT_FILTER_PROMPTS(globalFilters.segments[0]);
    }

    // Loyalty tier filter active
    if (globalFilters.loyaltyTiers.length === 1) {
      const tier = globalFilters.loyaltyTiers[0];
      return [
        `What's the CLV for ${tier} tier customers?`,
        `Show ${tier} tier churn patterns`,
        `How do ${tier} customers compare?`,
      ];
    }

    return CX360_DEFAULT_PROMPTS;
  }, [currentModule, isCustomerDetailPage, currentCustomerId, activeDrilldowns, globalFilters]);

  // Reset chat when switching modules
  useEffect(() => {
    if (currentModule !== lastModule) {
      const newWelcome =
        currentModule === 'merchandise' ? MERCHANDISE_WELCOME :
        currentModule === 'demand' ? DEMAND_WELCOME :
        currentModule === 'inventory' ? INVENTORY_WELCOME : CX360_WELCOME;
      setMessages([newWelcome]);
      setLastModule(currentModule);
    }
  }, [currentModule, lastModule]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle pending chat messages from chart clicks
  useEffect(() => {
    if (pendingChatMessage && !isLoading) {
      handleSendMessage(pendingChatMessage);
      clearPendingChatMessage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatMessage]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Prepare history for API (exclude welcome message, include SQL for context) - last 10 messages
      const history = messages
        .filter((m) => !m.id.startsWith('welcome'))
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.content,
          sql: m.sql, // Include SQL for multi-turn context
        }));

      // Build dashboard context for the API
      const dashboardContext = {
        filters: globalFilters,
        drilldowns: activeDrilldowns,
        currentPage: isCustomerDetailPage ? 'customer-detail' : 'dashboard',
        customerId: currentCustomerId,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history,
          module: currentModule,
          context: dashboardContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add assistant message with SQL metadata and agent fields
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'I apologize, but I could not process your request.',
        ui_component: data.ui_component,
        sql: data.sql,
        sqlMeta: {
          executionTime: data.executionTime,
          rowCount: data.rowCount,
          source: data.source,
        },
        timestamp: new Date(),
        // Agent-specific fields
        toolResults: data.toolResults,
        chartsCreated: data.chartsCreated,
        chartProposal: data.chartProposal,
        actions: data.actions,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Handle filter actions immediately
      if (data.actions) {
        for (const action of data.actions) {
          if (action.type === 'apply_filter') {
            handleFilterAction(
              action.payload.filterType as string,
              action.payload.value as string,
              action.payload.filterAction as string
            );
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error instanceof Error
          ? `Sorry, I encountered an error: ${error.message}`
          : 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle chart element clicks from chat components (drilldown)
  const handleChartClick = useCallback((elementData: { key: string; value: string | number; label: string; chartTitle?: string }) => {
    const followUpMessage = `Tell me more about ${elementData.label} "${elementData.value}"${
      elementData.chartTitle ? ` in the ${elementData.chartTitle} analysis` : ''
    } — what's driving this?`;
    handleSendMessage(followUpMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle filter actions from agent
  const handleFilterAction = useCallback((filterType: string, value: string, action: string) => {
    // TODO: Integrate with dashboard context to actually apply filters
    // For now, this is a placeholder - the FilterAppliedCard shows the confirmation
    console.log('Agent filter action:', { filterType, value, action });
  }, []);

  // Handle NBA view from agent
  const handleNBAView = useCallback((targetType: string, targetId: string) => {
    // Navigate to customer detail if targeting a specific customer
    if (targetType === 'customer') {
      window.location.href = `/cx360/customer/${targetId}`;
    } else {
      // For segments, send a follow-up message to show the customers
      handleSendMessage(`Show me the top customers in the ${targetId} segment with their recommended actions`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle chart option selection from proposal
  const handleChartOptionSelect = useCallback((option: ChartOptionData) => {
    // Send a message indicating the user's selection
    const selectionMessage = `I'll go with Option ${option.option_id}: ${option.title}`;
    handleSendMessage(selectionMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle customize chart request
  const handleCustomizeChart = useCallback((chartId: string) => {
    // Send a message asking to customize the chart
    handleSendMessage(`I want to customize the chart (ID: ${chartId}). What options do I have?`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-4 bottom-6 z-50 flex items-center gap-2 bg-[var(--accent-primary)] text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-[#4338CA] transition-colors group"
      >
        <Sparkles size={18} className="group-hover:animate-pulse" />
        <span className="text-sm font-medium">AI Assistant</span>
      </button>
    );
  }

  return (
    <aside className="fixed right-0 top-[57px] h-[calc(100vh-57px)] w-[380px] bg-white border-l border-[var(--border-default)] flex flex-col z-40">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-[var(--accent-primary)]" />
          <span className="text-base font-semibold text-[var(--text-primary)]">
            AI Assistant
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
            {currentModule === 'merchandise' ? 'Merchandising' : currentModule === 'demand' ? 'Demand' : currentModule === 'inventory' ? 'Supply' : 'CX360'}
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
            ui_component={message.ui_component}
            sql={message.sql}
            sqlMeta={message.sqlMeta}
            timestamp={message.timestamp}
            onChartClick={handleChartClick}
            toolResults={message.toolResults}
            chartsCreated={message.chartsCreated}
            chartProposal={message.chartProposal}
            actions={message.actions}
            onFilterApply={handleFilterAction}
            onNBAView={handleNBAView}
            onChartOptionSelect={handleChartOptionSelect}
            onCustomizeChart={handleCustomizeChart}
          />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-[var(--accent-primary-light)] flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} className="text-[var(--accent-primary)]" />
            </div>
            <div className="bg-white border border-[var(--border-default)] rounded-lg px-3 py-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Example Prompts - show only when few messages */}
      {messages.length <= 2 && !isLoading && (
        <div className="px-4 pb-2">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-[var(--border-default)]">
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </aside>
  );
}
