'use client';

import { Bot } from 'lucide-react';
import type { UIComponentType } from '@/app/lib/types';
import AskCanvas from './AskCanvas';
import AskSuggestions, { getSuggestionsForResponse } from './AskSuggestions';
import { renderMarkdown } from '../lib/render-markdown';

interface AskMessageProps {
  role: 'user' | 'assistant';
  content: string;
  components?: UIComponentType[];
  isStreaming?: boolean;
  timestamp?: Date;
  agentName?: string;
  onFollowUp?: (text: string) => void;
  onAgent?: (agentId: string) => void;
}

function formatTime(d: Date): string {
  return d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
    .replace(' ', '');
}

export default function AskMessage({
  role,
  content,
  components,
  isStreaming = false,
  timestamp,
  agentName,
  onFollowUp,
  onAgent,
}: AskMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="bg-[var(--bg-secondary)] border border-[var(--border-default)] px-3.5 py-2.5 max-w-[80%]"
          style={{ borderRadius: '16px 4px 16px 16px' }}
        >
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{content}</p>
          {timestamp && (
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1 text-right">{formatTime(timestamp)}</p>
          )}
        </div>
      </div>
    );
  }

  // Assistant message — no bubble, raw prose with label.
  // Agent-produced messages get an attribution badge + accent border.
  const isAgentMessage = Boolean(agentName);

  return (
    <div className={isAgentMessage ? 'border-l-2 border-[var(--accent-primary)] pl-3 -ml-3' : undefined}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          {isAgentMessage ? 'Claude' : 'Retail 360'}
        </span>
        {isAgentMessage && (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-primary-light)] text-[var(--accent-primary)] font-medium">
            <Bot size={10} />
            {agentName} agent
          </span>
        )}
        {timestamp && !isStreaming && (
          <span className="text-[10px] text-[var(--text-tertiary)]">· {formatTime(timestamp)}</span>
        )}
      </div>

      <div className="text-sm text-[var(--text-primary)] space-y-0.5">
        {renderMarkdown(content)}
        {isStreaming && (
          <span className="inline-block w-0.5 h-4 bg-current animate-pulse ml-0.5 align-middle" />
        )}
      </div>

      {components && components.length > 0 && (
        <AskCanvas components={components} />
      )}

      {!isStreaming && onFollowUp && onAgent && content && (
        <AskSuggestions
          suggestions={getSuggestionsForResponse(content)}
          onAsk={onFollowUp}
          onAgent={onAgent}
        />
      )}
    </div>
  );
}
