'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { AGENT_REGISTRY, AGENTS_BY_MODULE, getAgent, type AgentDefinition } from '@/app/agents/lib/agent-registry';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import type { UIComponentType } from '@/app/lib/types';
import { fetchPriceIntelCore } from '@/app/lib/price-intel-loader';
import AgentCard from './components/AgentCard';
import ActionAgentCard from './components/ActionAgentCard';
import AgentDrawer from './components/AgentDrawer';
import RunHistory, { useRunHistory, type RunHistoryItem } from './components/RunHistory';
import InventoryReplenishmentAgent from './action/InventoryReplenishmentAgent';
import PriceChangeExecutionAgent from './action/PriceChangeExecutionAgent';
import CampaignPauseAgent from './action/CampaignPauseAgent';
import MarkdownExecutionAgent from './action/MarkdownExecutionAgent';
import RFQGeneratorAgent from './action/RFQGeneratorAgent';
import WeeklyDistributionAgent from './action/WeeklyDistributionAgent';

const MODULE_LABELS = {
  pricing: 'Pricing intelligence',
  clearance: 'Clearance & markdown',
  demand: 'Demand intelligence',
} as const;

export default function AgentHub() {
  const [core, setCore] = useState<PriceIntelCore | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'all' | 'pricing' | 'clearance' | 'demand'>('all');
  const [replayResult, setReplayResult] = useState<{ answer: string; components: UIComponentType[] } | null>(null);
  const [activeActionAgent, setActiveActionAgent] = useState<AgentDefinition | null>(null);
  const [showActionPanel, setShowActionPanel] = useState(false);
  const { history: runHistory, addRun } = useRunHistory();

  const actionAgents = AGENT_REGISTRY.filter((a) => a.is_action_agent);

  useEffect(() => {
    fetchPriceIntelCore().then(setCore).catch(console.error);
  }, []);

  function handleReplay(run: RunHistoryItem) {
    const agent = getAgent(run.agent_id);
    if (agent) {
      setSelectedAgent(agent);
      setReplayResult({
        answer: run.full_answer ?? run.answer_preview,
        components: run.components ?? [],
      });
    }
  }

  const noSearchMatches =
    searchQuery !== '' &&
    AGENT_REGISTRY.filter((a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.tagline.toLowerCase().includes(searchQuery.toLowerCase())
    ).length === 0;

  return (
    <div className="flex h-screen bg-[var(--bg-primary)]">
      {/* Gallery — left + center */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Page header */}
        <div className="border-b border-[var(--border-default)] bg-white px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-medium text-[var(--text-primary)]">
                AI agents
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {AGENT_REGISTRY.length} agents · powered by Claude · generative UI
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--positive)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--positive)] animate-pulse" />
              Connected
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 mt-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-[var(--border-default)] rounded-lg bg-white text-[var(--text-primary)] outline-none focus:border-[var(--border-hover)]"
              />
            </div>
            {(['all', 'pricing', 'clearance', 'demand'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModuleFilter(m)}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                  moduleFilter === m
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {m === 'all' ? 'All agents' : m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable gallery body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Run history — only when there are runs and nothing selected */}
          {runHistory.length > 0 && !selectedAgent && (
            <RunHistory history={runHistory} onReplay={handleReplay} />
          )}

          {/* Action agents section */}
          {moduleFilter === 'all' && actionAgents.length > 0 && !showActionPanel && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Action agents
                </h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Execute actions · human in loop
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {actionAgents.map((agent) => (
                  <ActionAgentCard
                    key={agent.id}
                    agent={agent}
                    isSelected={activeActionAgent?.id === agent.id}
                    onClick={() => {
                      setActiveActionAgent(agent);
                      setShowActionPanel(true);
                      setSelectedAgent(null);
                    }}
                  />
                ))}
              </div>
              <p className="mt-3 text-[11px] text-[var(--text-secondary)]">
                Action agents check your connected systems, propose changes for your approval, then generate files and update Databricks. No ERP? They create a manual handoff package.
              </p>
            </div>
          )}

          {/* Active action panel */}
          {showActionPanel && activeActionAgent && core && (
            <div className="mb-10 rounded-xl border border-[var(--border-default)] bg-white overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-default)]">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${activeActionAgent.color}`}>
                  {activeActionAgent.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">
                      {activeActionAgent.name}
                    </h3>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Action agent
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    {activeActionAgent.tagline}
                  </p>
                </div>
                <button
                  onClick={() => { setShowActionPanel(false); setActiveActionAgent(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                >
                  <X size={16} />
                </button>
              </div>
              <div>
                {activeActionAgent.id === 'inventory-replenishment' && (
                  <InventoryReplenishmentAgent core={core} />
                )}
                {activeActionAgent.id === 'price-change-execution' && (
                  <PriceChangeExecutionAgent core={core} />
                )}
                {activeActionAgent.id === 'campaign-pause' && (
                  <CampaignPauseAgent core={core} />
                )}
                {activeActionAgent.id === 'markdown-execution' && (
                  <MarkdownExecutionAgent core={core} />
                )}
                {activeActionAgent.id === 'rfq-generator' && (
                  <RFQGeneratorAgent core={core} />
                )}
                {activeActionAgent.id === 'weekly-distribution' && (
                  <WeeklyDistributionAgent core={core} />
                )}
              </div>
            </div>
          )}

          {/* Module sections */}
          {(['pricing', 'clearance', 'demand'] as const)
            .filter((m) => moduleFilter === 'all' || moduleFilter === m)
            .map((module) => {
              const agents = AGENTS_BY_MODULE[module].filter((a) =>
                !a.is_action_agent && (
                searchQuery === '' ||
                a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.tagline.toLowerCase().includes(searchQuery.toLowerCase()))
              );
              if (agents.length === 0) return null;

              return (
                <div key={module} className="mb-10">
                  <h2 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                    {MODULE_LABELS[module]}
                  </h2>
                  <div className="grid grid-cols-3 gap-4">
                    {agents.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        isSelected={selectedAgent?.id === agent.id}
                        lastRun={runHistory.find((r) => r.agent_id === agent.id) ?? null}
                        onClick={() => {
                          setSelectedAgent(selectedAgent?.id === agent.id ? null : agent);
                          setReplayResult(null);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

          {/* Empty search state */}
          {noSearchMatches && (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--text-secondary)]">
                No agents match “{searchQuery}”
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-[var(--accent-primary)] mt-2 hover:underline"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drawer — right side */}
      {selectedAgent && (
        <AgentDrawer
          key={selectedAgent.id}
          agent={selectedAgent}
          core={core}
          replayResult={replayResult}
          onClose={() => { setSelectedAgent(null); setReplayResult(null); }}
          onRunComplete={addRun}
        />
      )}
    </div>
  );
}
