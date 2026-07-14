'use client';

import {
  Search, BarChart3, Bell, Play, TrendingUp, Users, Tag, Grid3x3,
  AlertCircle, FileText, type LucideIcon,
} from 'lucide-react';

export interface AskSuggestion {
  label: string;
  icon: string;          // lucide icon name (kebab-case)
  action: 'ask' | 'agent';
  prompt?: string;       // if action='ask', send this as next message
  agentId?: string;      // if action='agent', wired in Phase 2
}

interface AskSuggestionsProps {
  suggestions: AskSuggestion[];
  onAsk: (prompt: string) => void;
  onAgent: (agentId: string) => void;
}

const ICONS: Record<string, LucideIcon> = {
  'search': Search,
  'bar-chart': BarChart3,
  'bell': Bell,
  'play': Play,
  'trending-up': TrendingUp,
  'users': Users,
  'tag': Tag,
  'grid': Grid3x3,
  'alert-circle': AlertCircle,
  'file-text': FileText,
};

/** Keyword-matched suggestion pills — simple includes(), not ML. */
export function getSuggestionsForResponse(responseText: string): AskSuggestion[] {
  const t = responseText.toLowerCase();

  if (t.includes('margin')) {
    return [
      { label: 'Run margin leak analysis', icon: 'search', action: 'agent', agentId: 'margin-leak' },
      { label: 'Show by department', icon: 'bar-chart', action: 'ask', prompt: 'Break down margin by department' },
      { label: 'Set margin alert', icon: 'bell', action: 'ask', prompt: 'Set an alert when margin drops below 22%' },
    ];
  }

  if (t.includes('promo') || t.includes('campaign')) {
    return [
      { label: 'Run promo scenario', icon: 'play', action: 'agent', agentId: 'promo-scenario' },
      { label: 'Show campaign ROI', icon: 'trending-up', action: 'ask', prompt: 'Show me campaign ROI for last 14 weeks' },
      { label: 'Free-rider breakdown', icon: 'users', action: 'ask', prompt: 'Which campaigns have the highest free-rider ratio?' },
    ];
  }

  if (t.includes('sell-through') || t.includes('markdown')) {
    return [
      { label: 'Markdown timing agent', icon: 'tag', action: 'agent', agentId: 'markdown-timing' },
      { label: 'Show heatmap', icon: 'grid', action: 'ask', prompt: 'Show sell-through heatmap by category' },
    ];
  }

  return [
    { label: 'What needs attention today?', icon: 'alert-circle', action: 'ask', prompt: 'What are the top 3 pricing decisions I need to make today?' },
    { label: 'Weekly briefing', icon: 'file-text', action: 'agent', agentId: 'weekly-briefing' },
  ];
}

export default function AskSuggestions({ suggestions, onAsk, onAgent }: AskSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {suggestions.map((s) => {
        const Icon = ICONS[s.icon] ?? Search;
        const isAgent = s.action === 'agent';
        return (
          <button
            key={s.label}
            onClick={() => (s.action === 'ask' ? onAsk(s.prompt!) : onAgent(s.agentId!))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--border-default)] rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--accent-primary)] transition-colors"
          >
            <Icon size={12} />
            {s.label}
            {isAgent && (
              <span className="text-[9px] px-1 py-px rounded bg-[var(--accent-primary-light)] text-[var(--accent-primary)]">
                agent
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
