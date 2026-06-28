'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Send,
  Loader2,
  ShieldAlert,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { TOP_SKUS, CATEGORIES } from '@/app/lib/dbx-fixtures';

interface Props {
  core: PriceIntelCore;
}

interface KotlerAnalysis {
  competitive_position: string;
  threat_level: 'low' | 'medium' | 'high' | 'critical';
  recommended_response: string;
  price_adjustment_pct: number;
  supporting_actions: string[];
  market_share_risk_pct: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  analysis?: KotlerAnalysis;
  timestamp: Date;
}

const THREAT_BADGE: Record<KotlerAnalysis['threat_level'], { cls: string; label: string }> = {
  low:      { cls: 'bg-emerald-100 text-emerald-700', label: 'Low Threat'      },
  medium:   { cls: 'bg-amber-100 text-amber-700',     label: 'Medium Threat'   },
  high:     { cls: 'bg-rose-100 text-rose-700',        label: 'High Threat'     },
  critical: { cls: 'bg-rose-600 text-white',           label: 'Critical Threat' },
};

// Real competitor-response prompts built from live top-SKU / category data.
const _topSku = TOP_SKUS[0]?.product_id ?? 'PRD-000001';
const _topCat = CATEGORIES[0]?.category_l1 ?? 'Spices';
const _topDept = CATEGORIES[1]?.department ?? 'Grocery & Staples';
const SUGGESTION_CHIPS = [
  `Zepto cut ${_topSku} by 15% — should we respond?`,
  `Blinkit launched a flash sale on ${_topCat} — what's our move?`,
  `BigBasket is bundling ${_topDept} products — analyse the threat`,
];

function ThreatBadge({ level }: { level: KotlerAnalysis['threat_level'] }) {
  const { cls, label } = THREAT_BADGE[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <ShieldAlert size={10} />
      {label}
    </span>
  );
}

function KotlerCard({ analysis }: { analysis: KotlerAnalysis }) {
  return (
    <div className="mt-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] p-3 space-y-3">
      {/* Threat + position */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <ThreatBadge level={analysis.threat_level} />
        <span className="text-xs text-[var(--text-tertiary)] text-right max-w-[60%]">
          {analysis.competitive_position}
        </span>
      </div>

      {/* Recommended response */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-0.5">Recommended Response</p>
        <p className="text-sm text-[var(--text-primary)] leading-relaxed">{analysis.recommended_response}</p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-[var(--bg-secondary)] border border-[var(--border-default)] px-2.5 py-2">
          <p className="text-xs text-[var(--text-tertiary)] mb-0.5">Price Adjustment</p>
          <p className={`text-base font-bold ${analysis.price_adjustment_pct < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {analysis.price_adjustment_pct >= 0 ? '+' : ''}{analysis.price_adjustment_pct.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-md bg-[var(--bg-secondary)] border border-[var(--border-default)] px-2.5 py-2">
          <p className="text-xs text-[var(--text-tertiary)] mb-0.5">Mkt Share Risk</p>
          <p className="text-base font-bold text-amber-600">
            {analysis.market_share_risk_pct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Supporting actions */}
      {analysis.supporting_actions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">Supporting Actions</p>
          <ul className="space-y-1">
            {analysis.supporting_actions.map((action, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                <Zap size={10} className="text-[var(--accent-primary)] mt-0.5 shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function CompetitiveResponseAgent({ core }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/price-intel/agents/competitive-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
          context: {
            kpis: core.kpis,
            departments: core.departments.slice(0, 3),
          },
        }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data: { reply: string; analysis?: KotlerAnalysis } = await res.json();
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.reply,
        analysis: data.analysis,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="card p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} className="text-[var(--accent-primary)]" />
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Competitive Response Agent</h2>
          <p className="text-xs text-[var(--text-tertiary)]">Kotler framework — competitive pricing analysis</p>
        </div>
      </div>

      {/* Conversation history */}
      <div
        ref={scrollRef}
        className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 max-h-64 overflow-y-auto space-y-3 min-h-[80px]"
      >
        {messages.length === 0 && !loading && (
          <p className="text-xs text-[var(--text-tertiary)] text-center py-4">
            Describe a competitor pricing move to get a Kotler-framework response.
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--accent-primary)] text-white rounded-br-sm'
                  : 'bg-[var(--bg-primary)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)] mt-0.5 px-1">
              {formatTime(msg.timestamp)}
            </span>
            {msg.role === 'assistant' && msg.analysis && (
              <div className="w-full max-w-[90%]">
                <KotlerCard analysis={msg.analysis} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-2">
            <div className="rounded-xl rounded-bl-sm bg-[var(--bg-primary)] border border-[var(--border-default)] px-3 py-2">
              <Loader2 size={14} className="animate-spin text-[var(--accent-primary)]" />
            </div>
          </div>
        )}
      </div>

      {/* Suggestion chips — only shown before first message */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTION_CHIPS.map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => sendMessage(chip)}
              disabled={loading}
              className="px-3 py-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-700">
          <AlertTriangle size={13} />
          {error}
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={2}
          placeholder="Describe a competitor pricing move…"
          className="flex-1 resize-none rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm px-3 py-2 placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--accent-primary)] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          aria-label="Send"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
      <p className="text-[10px] text-[var(--text-tertiary)] -mt-2">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
