'use client';

import { useState } from 'react';
import { X, RotateCcw, Loader2 } from 'lucide-react';
import type { AgentDefinition } from '@/app/agents/lib/agent-registry';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import type { UIComponentType } from '@/app/lib/types';
import AgentMiniForm from '@/app/ask/components/AgentMiniForm';
import { renderMarkdown } from '@/app/ask/lib/render-markdown';
import HubCanvas from './HubCanvas';
import type { RunHistoryItem } from './RunHistory';

interface AgentDrawerProps {
  agent: AgentDefinition | null;
  core: PriceIntelCore | null;
  onClose: () => void;
  onRunComplete: (run: RunHistoryItem) => void;
  /** When replaying from history, show this instead of a fresh form. */
  replayResult?: { answer: string; components: UIComponentType[] } | null;
}

export default function AgentDrawer({
  agent,
  core,
  onClose,
  onRunComplete,
  replayResult,
}: AgentDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ answer: string; components: UIComponentType[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!agent) return null;

  const shown = result ?? replayResult ?? null;

  async function handleRun(
    formValues: Record<string, string | number | string[]>,
    chatMessage?: string
  ) {
    if (!agent) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const body = {
      agent_id: agent.id,
      form_values: formValues,
      chat_message: chatMessage,
      kpis: core?.kpis,
      action_queue: core?.action_queue?.slice(0, 8),
      campaigns: core?.campaigns,
      markdown_queue: core?.markdown_queue,
      departments: core?.departments,
      forecast_14w: core?.forecast_14w,
      skus: core?.skus
        ? [...core.skus]
            .sort((a, b) => Math.abs(b.revenue_impact_inr) - Math.abs(a.revenue_impact_inr))
            .slice(0, 10)
        : undefined,
    };

    const stamp = () =>
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const res = await fetch('/api/agents/run', {
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
            if (parsed.type === 'text') accumulated += parsed.content;
            if (parsed.type === 'done') {
              const components: UIComponentType[] = parsed.components || [];
              const answer: string = parsed.answer || accumulated;
              setResult({ answer, components });
              onRunComplete({
                id: crypto.randomUUID(),
                agent_id: agent.id,
                agent_name: agent.name,
                agent_icon: agent.icon,
                timestamp: stamp(),
                answer_preview: answer.slice(0, 80),
                components_count: components.length,
                success: true,
                full_answer: answer,
                components,
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent run failed');
      onRunComplete({
        id: crypto.randomUUID(),
        agent_id: agent.id,
        agent_name: agent.name,
        agent_icon: agent.icon,
        timestamp: stamp(),
        answer_preview: 'Run failed',
        components_count: 0,
        success: false,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-[480px] flex-shrink-0 border-l border-[var(--border-default)] flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[var(--border-default)] flex-shrink-0">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${agent.color}`}>
          {agent.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            {agent.name}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] truncate">
            {agent.tagline}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Description */}
        {!shown && !loading && (
          <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
            {agent.description}
          </p>
        )}

        {/* Form — form/chat agents only (oneclick uses the footer button) */}
        {!shown && !loading && agent.input_type !== 'oneclick' && (
          <AgentMiniForm
            key={agent.id}
            agent={agent}
            core={core}
            loading={loading}
            onRun={handleRun}
          />
        )}

        {/* Loading */}
        {loading && <HubCanvas loading={true} components={[]} />}

        {/* Result */}
        {shown && !loading && (
          <div>
            {shown.answer && (
              <div className="text-sm text-[var(--text-primary)] space-y-0.5 mb-4">
                {renderMarkdown(shown.answer)}
              </div>
            )}

            <HubCanvas components={shown.components} />

            <button
              onClick={() => { setResult(null); setError(null); }}
              className="mt-4 text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1"
            >
              <RotateCcw size={11} /> Run again
            </button>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
            {error}
            <button onClick={() => setError(null)} className="block text-xs underline mt-2">
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Footer — oneclick run button */}
      {!shown && agent.input_type === 'oneclick' && (
        <div className="flex-shrink-0 px-6 py-4 border-t border-[var(--border-default)]">
          <button
            disabled={loading}
            onClick={() => handleRun({})}
            className="w-full py-3 text-sm font-medium text-white bg-[var(--accent-primary)] rounded-xl disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 size={14} className="animate-spin" />Running...</>
              : <>{agent.icon} Run {agent.name}</>
            }
          </button>
          <p className="text-center text-[10px] text-[var(--text-secondary)] mt-2">
            ~{agent.avg_seconds}s · Claude Sonnet
          </p>
        </div>
      )}
    </div>
  );
}
