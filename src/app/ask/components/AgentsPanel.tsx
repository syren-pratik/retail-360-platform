'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { AGENT_REGISTRY, AGENTS_BY_MODULE, getAgent, type AgentDefinition } from '@/app/agents/lib/agent-registry';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import type { UIComponentType } from '@/app/lib/types';
import AgentMiniForm from './AgentMiniForm';

interface AgentsPanelProps {
  core: PriceIntelCore | null;
  onAgentResult: (agentId: string, result: { answer: string; components: UIComponentType[] }) => void;
  selectedAgentId?: string | null;
  onAgentSelect?: (agentId: string | null) => void;
}

const MODULE_LABELS = { pricing: 'Pricing', clearance: 'Clearance', demand: 'Demand' } as const;

export default function AgentsPanel({
  core,
  onAgentResult,
  selectedAgentId,
  onAgentSelect,
}: AgentsPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync external selection (e.g. pill click in conversation) into the panel.
  useEffect(() => {
    if (selectedAgentId) {
      const agent = getAgent(selectedAgentId);
      if (agent) setSelectedAgent(agent);
    }
  }, [selectedAgentId]);

  function select(agent: AgentDefinition | null) {
    setSelectedAgent(agent);
    onAgentSelect?.(agent?.id ?? null);
  }

  async function handleRun(
    formValues: Record<string, string | number | string[]>,
    chatMessage?: string
  ) {
    if (!selectedAgent || loading) return;
    setLoading(true);

    const body = {
      agent_id: selectedAgent.id,
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
              onAgentResult(selectedAgent.id, {
                answer: parsed.answer || accumulated,
                components: parsed.components || [],
              });
            }
          } catch { /* skip malformed chunks */ }
        }
      }
    } catch (err) {
      console.error('Agent run failed:', err);
      onAgentResult(selectedAgent.id, {
        answer: 'Agent run failed. Please try again.',
        components: [],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-[260px] flex-shrink-0 border-l border-[var(--border-default)] flex flex-col bg-[var(--bg-secondary)] h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--text-primary)]">Agents</span>
          <span className="text-[10px] text-[var(--text-secondary)]">
            {AGENT_REGISTRY.length} available
          </span>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[var(--border-default)] rounded-lg px-2.5 py-1.5">
          <Search size={12} className="text-[var(--text-secondary)] flex-shrink-0" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] w-full"
          />
        </div>
      </div>

      {/* Agent list — scrollable */}
      <div className="flex-1 overflow-y-auto py-2">
        {(['pricing', 'clearance', 'demand'] as const).map((module) => {
          const agents = AGENTS_BY_MODULE[module].filter((a) =>
            searchQuery === '' ||
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.tagline.toLowerCase().includes(searchQuery.toLowerCase())
          );
          if (agents.length === 0) return null;

          return (
            <div key={module}>
              <div className="px-4 py-1.5 text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                {MODULE_LABELS[module]}
              </div>
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => select(selectedAgent?.id === agent.id ? null : agent)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-white transition-colors ${
                    selectedAgent?.id === agent.id
                      ? 'bg-white border-r-2 border-[var(--accent-primary)]'
                      : ''
                  }`}
                >
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${agent.color}`}>
                    {agent.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                      {agent.name}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)] truncate">
                      {agent.tagline}
                    </div>
                  </div>
                  <span className="text-[9px] text-[var(--text-secondary)] flex-shrink-0">
                    {agent.input_type === 'form' ? 'Form'
                      : agent.input_type === 'chat' ? 'Chat'
                      : '1-click'}
                  </span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Mini form — appears when agent selected */}
      {selectedAgent && (
        <div className="border-t border-[var(--border-default)] bg-white flex-shrink-0 max-h-[280px] overflow-y-auto">
          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
            <span className="text-sm">{selectedAgent.icon}</span>
            <span className="text-xs font-medium text-[var(--text-primary)]">
              {selectedAgent.name}
            </span>
          </div>
          <div className="px-4 pb-4">
            <AgentMiniForm
              key={selectedAgent.id}
              agent={selectedAgent}
              core={core}
              loading={loading}
              onRun={handleRun}
            />
          </div>
        </div>
      )}
    </div>
  );
}
