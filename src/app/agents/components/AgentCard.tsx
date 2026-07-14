'use client';

import type { AgentDefinition } from '@/app/agents/lib/agent-registry';

interface AgentCardProps {
  agent: AgentDefinition;
  isSelected: boolean;
  onClick: () => void;
  lastRun?: { timestamp: string; success: boolean } | null;
}

export default function AgentCard({ agent, isSelected, onClick, lastRun }: AgentCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col p-4 rounded-xl text-left transition-colors bg-white ${
        isSelected
          ? 'border-2 border-[var(--accent-primary)] bg-[var(--accent-primary-light)]'
          : 'border border-[var(--border-default)] hover:border-[var(--border-hover)]'
      }`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${agent.color}`}>
        {agent.icon}
      </div>

      {/* Name + tagline */}
      <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1 text-left">
        {agent.name}
      </h3>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3 text-left">
        {agent.tagline}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-2 mt-auto w-full">
        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)]">
          {agent.input_type === 'form' ? 'Form'
            : agent.input_type === 'chat' ? 'Chat'
            : 'One-click'}
        </span>
        {lastRun && (
          <span className="text-[10px] text-[var(--text-secondary)] ml-auto">
            {lastRun.success ? '✓' : '!'} {lastRun.timestamp}
          </span>
        )}
      </div>
    </button>
  );
}
