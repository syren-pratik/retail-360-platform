'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { UIComponentType } from '@/app/lib/types';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { fetchPriceIntelCore } from '@/app/lib/price-intel-loader';
import { getAgent } from '@/app/agents/lib/agent-registry';
import { useTenant } from '@/app/context/TenantContext';
import AskMessage from './components/AskMessage';
import AskInput from './components/AskInput';
import AgentsPanel from './components/AgentsPanel';

interface AskMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  components?: UIComponentType[];
  timestamp?: Date;
  agentId?: string;
  agentName?: string;
}

const STARTER_QUESTIONS_GROCERY = [
  'Why did margin drop in Beverages this week?',
  'Which promotions have the highest free-rider ratio?',
  'Are we on track for sell-through targets?',
  'What are the top 3 pricing decisions I need to make today?',
  'Show me the 14-week promo ROI trend',
];

const STARTER_QUESTIONS_APPAREL = [
  'Why did margin drop in Womens this week?',
  'Which promotions have the highest free-rider ratio?',
  'Are we on track for BTS sell-through targets?',
  'What are the top 3 pricing decisions I need to make today?',
  'Show me the 14-week promo ROI trend',
];

export default function AskShell() {
  const { isApparel } = useTenant();
  const [messages, setMessages] = useState<AskMessageItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingComponents, setStreamingComponents] = useState<UIComponentType[]>([]);
  const [streamingAgentName, setStreamingAgentName] = useState<string | undefined>(undefined);
  const [core, setCore] = useState<PriceIntelCore | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const starters = isApparel ? STARTER_QUESTIONS_APPAREL : STARTER_QUESTIONS_GROCERY;

  useEffect(() => {
    fetchPriceIntelCore().then(setCore).catch(console.error);
  }, []);

  function scrollToBottom() {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }

  /** Consume an SSE stream from either /api/ask or /api/agents/run. */
  async function streamFrom(
    url: string,
    body: unknown,
    meta?: { agentId?: string; agentName?: string }
  ) {
    setIsStreaming(true);
    setStreamingContent('');
    setStreamingComponents([]);
    setStreamingAgentName(meta?.agentName);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'text') {
              accumulated += parsed.content;
              setStreamingContent(accumulated);
              scrollToBottom();
            } else if (parsed.type === 'done') {
              setMessages((prev) => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: typeof parsed.answer === 'string' && parsed.answer ? parsed.answer : accumulated,
                components: parsed.components || [],
                timestamp: new Date(),
                agentId: meta?.agentId,
                agentName: meta?.agentName,
              }]);
              setIsStreaming(false);
              setStreamingContent('');
              setStreamingComponents([]);
              setStreamingAgentName(undefined);
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch {
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingAgentName(undefined);
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        timestamp: new Date(),
      }]);
    }

    scrollToBottom();
  }

  async function handleSend(text: string) {
    const message = text.trim();
    if (!message || isStreaming) return;

    const userMsg: AskMessageItem = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    await streamFrom('/api/ask', {
      messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
    });
  }

  /** Result arriving from the agents panel (form/chat agents run there). */
  function handleAgentResult(
    agentId: string,
    result: { answer: string; components: UIComponentType[] }
  ) {
    const agent = getAgent(agentId);
    setMessages((prev) => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: result.answer,
      components: result.components,
      timestamp: new Date(),
      agentId,
      agentName: agent?.name,
    }]);
    scrollToBottom();
  }

  /** Agent pill clicked in conversation. Oneclick agents run immediately;
   *  form/chat agents get selected in the panel for the user to fill in. */
  async function handleAgentFromPill(agentId: string) {
    setSelectedAgentId(agentId);
    const agent = getAgent(agentId);
    if (!agent) return;

    if (agent.input_type === 'oneclick' && !isStreaming) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'user',
        content: `Run ${agent.name}`,
        timestamp: new Date(),
      }]);
      scrollToBottom();

      await streamFrom('/api/agents/run', {
        agent_id: agentId,
        kpis: core?.kpis,
        action_queue: core?.action_queue?.slice(0, 8),
        campaigns: core?.campaigns,
        markdown_queue: core?.markdown_queue,
        departments: core?.departments,
      }, { agentId, agentName: agent.name });
    }
    // form/chat agents: panel highlights via selectedAgentId; user fills the mini form.
  }

  return (
    <div className="flex h-screen bg-[var(--bg-primary)]">
      {/* Left: conversation */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-[var(--border-default)] bg-white flex-shrink-0">
          <div>
            <h1 className="text-base font-medium text-[var(--text-primary)]">Ask anything</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Connected to Databricks · Retail 360 · {isApparel ? 'US apparel' : 'India grocery'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--positive)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)] animate-pulse" />
            Live data
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-8 py-6" ref={scrollRef}>
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary-light)] flex items-center justify-center mb-4">
                <Sparkles size={22} className="text-[var(--accent-primary)]" />
              </div>
              <h2 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                Ask about your retail data
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
                Ask about pricing, demand, promotions, or customer behaviour.
                Claude queries your Databricks data and returns insights with charts —
                or pick an agent on the right for a structured analysis.
              </p>
              <div className="w-full space-y-2">
                {starters.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="w-full text-left px-4 py-3 text-sm text-[var(--text-secondary)] bg-white border border-[var(--border-default)] rounded-xl hover:border-[var(--border-hover)] hover:text-[var(--accent-primary)] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <AskMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                components={msg.components}
                timestamp={msg.timestamp}
                agentName={msg.agentName}
                onFollowUp={handleSend}
                onAgent={handleAgentFromPill}
              />
            ))}

            {isStreaming && (
              <AskMessage
                role="assistant"
                content={streamingContent || '…'}
                components={streamingComponents}
                agentName={streamingAgentName}
                isStreaming={true}
              />
            )}
          </div>
        </div>

        {/* Input */}
        <AskInput onSend={handleSend} disabled={isStreaming} />
      </div>

      {/* Right: agents panel */}
      <AgentsPanel
        core={core}
        selectedAgentId={selectedAgentId}
        onAgentSelect={setSelectedAgentId}
        onAgentResult={handleAgentResult}
      />
    </div>
  );
}
