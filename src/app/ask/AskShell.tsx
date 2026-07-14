'use client';

import { useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { UIComponentType } from '@/app/lib/types';
import { useTenant } from '@/app/context/TenantContext';
import AskMessage from './components/AskMessage';
import AskInput from './components/AskInput';

interface AskMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  components?: UIComponentType[];
  timestamp?: Date;
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const starters = isApparel ? STARTER_QUESTIONS_APPAREL : STARTER_QUESTIONS_GROCERY;

  function scrollToBottom() {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }

  async function handleSend(text: string) {
    const message = text.trim();
    if (!message || isStreaming) return;

    setIsStreaming(true);
    setStreamingContent('');
    setStreamingComponents([]);

    const userMsg: AskMessageItem = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
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
              const assistantMsg: AskMessageItem = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: typeof parsed.answer === 'string' && parsed.answer ? parsed.answer : accumulated,
                components: parsed.components || [],
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setIsStreaming(false);
              setStreamingContent('');
              setStreamingComponents([]);
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch {
      setIsStreaming(false);
      setStreamingContent('');
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          timestamp: new Date(),
        },
      ]);
    }

    scrollToBottom();
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)]">
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
        {/* Empty state */}
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
              Claude queries your Databricks data and returns insights with charts.
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

        {/* Message list */}
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => (
            <AskMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              components={msg.components}
              timestamp={msg.timestamp}
              onFollowUp={handleSend}
            />
          ))}

          {/* Streaming message */}
          {isStreaming && (
            <AskMessage
              role="assistant"
              content={streamingContent || '…'}
              components={streamingComponents}
              isStreaming={true}
            />
          )}
        </div>
      </div>

      {/* Input */}
      <AskInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
