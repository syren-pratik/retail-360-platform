'use client';

import { useState } from 'react';
import {
  FlaskConical,
  TrendingUp,
  Calendar,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';
import { useTenant } from '@/app/context/TenantContext';
import { AlertTriangle } from 'lucide-react';
import PromoScenarioAgent from '../agents/PromoScenarioAgent';
import PriceStrategyAgent from '../agents/PriceStrategyAgent';
import MarkdownTimingAgent from '../agents/MarkdownTimingAgent';
import CompetitiveResponseAgent from '../agents/CompetitiveResponseAgent';
import WeeklyBriefingAgent from '../agents/WeeklyBriefingAgent';

interface Props {
  core: PriceIntelCore;
}

interface AgentConfig {
  id: string;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  color: 'violet' | 'blue' | 'amber' | 'rose' | 'emerald';
  component: React.ComponentType<{ core: PriceIntelCore }>;
}

const COLOR_MAP: Record<AgentConfig['color'], { badge: string; icon: string; border: string }> = {
  violet: {
    badge: 'bg-violet-100 text-violet-700',
    icon: 'text-violet-600',
    border: 'border-violet-200 hover:border-violet-300',
  },
  blue: {
    badge: 'bg-blue-100 text-blue-700',
    icon: 'text-blue-600',
    border: 'border-blue-200 hover:border-blue-300',
  },
  amber: {
    badge: 'bg-amber-100 text-amber-700',
    icon: 'text-amber-600',
    border: 'border-amber-200 hover:border-amber-300',
  },
  rose: {
    badge: 'bg-rose-100 text-rose-700',
    icon: 'text-rose-600',
    border: 'border-rose-200 hover:border-rose-300',
  },
  emerald: {
    badge: 'bg-emerald-100 text-emerald-700',
    icon: 'text-emerald-600',
    border: 'border-emerald-200 hover:border-emerald-300',
  },
};

const AGENTS: AgentConfig[] = [
  {
    id: 'promo-scenario',
    name: 'Promo Scenario Planner',
    tagline: 'Simulate promo ROI before spend',
    icon: <FlaskConical size={18} />,
    color: 'violet',
    component: PromoScenarioAgent,
  },
  {
    id: 'price-strategy',
    name: 'Price Strategy Advisor',
    tagline: 'Category-level pricing recommendations',
    icon: <TrendingUp size={18} />,
    color: 'blue',
    component: PriceStrategyAgent,
  },
  {
    id: 'markdown-timing',
    name: 'Markdown Timing Optimizer',
    tagline: 'Schedule markdowns to maximize recovery',
    icon: <Calendar size={18} />,
    color: 'amber',
    component: MarkdownTimingAgent,
  },
  {
    id: 'competitive-response',
    name: 'Competitive Response Analyst',
    tagline: 'Chat-based competitor move analysis',
    icon: <MessageSquare size={18} />,
    color: 'rose',
    component: CompetitiveResponseAgent,
  },
  {
    id: 'weekly-briefing',
    name: 'Weekly Pricing Brief',
    tagline: 'Auto-generated weekly pricing summary',
    icon: <FileText size={18} />,
    color: 'emerald',
    component: WeeklyBriefingAgent,
  },
];

function AgentCard({ agent, core }: { agent: AgentConfig; core: PriceIntelCore }) {
  const [expanded, setExpanded] = useState(false);
  const colors = COLOR_MAP[agent.color];
  const AgentComponent = agent.component;

  return (
    <div className={`card border ${colors.border} transition-colors`}>
      <button
        className="w-full p-4 flex items-center gap-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className={`flex-shrink-0 ${colors.icon}`}>{agent.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-[var(--text-primary)]">{agent.name}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
              AI
            </span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">{agent.tagline}</p>
        </div>
        <span className="flex-shrink-0 text-[var(--text-tertiary)]">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border-default)] p-4">
          <AgentComponent core={core} />
        </div>
      )}
    </div>
  );
}

export default function AgentsTab({ core }: Props) {
  const { isApparel } = useTenant();
  return (
    <div>
      {/* Apparel-mode deferred-notice banner (Price Intel spec §4.3) */}
      {isApparel && (
        <div className="rounded-lg p-3 mb-4 bg-amber-50 border border-amber-200 flex items-start gap-2">
          <span className="flex-shrink-0 text-amber-600 mt-0.5">
            <AlertTriangle size={16} />
          </span>
          <p className="text-sm text-amber-800 leading-relaxed">
            AI Agents are in grocery mode — apparel agent skins coming in a future sprint.
          </p>
        </div>
      )}

      {/* Banner */}
      <div className="rounded-lg p-4 mb-6 bg-violet-50 border border-violet-200 flex items-start gap-3">
        <span className="flex-shrink-0 text-violet-600 mt-0.5">
          <Sparkles size={18} />
        </span>
        <p className="text-sm text-violet-800 leading-relaxed">
          <span className="font-semibold">AI agents run on Claude.</span> Each agent takes your
          data context and generates structured analysis. API key required for live results —
          fallback mode provides computed estimates.
        </p>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 gap-4">
        {AGENTS.map((agent) => (
          <AgentCard key={agent.id} agent={agent} core={core} />
        ))}
      </div>
    </div>
  );
}
