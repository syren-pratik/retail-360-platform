'use client';

import { useRef, useState } from 'react';
import { ArrowUp, Bot } from 'lucide-react';

interface AskInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function AskInput({
  onSend,
  disabled = false,
  placeholder = 'Ask anything about your pricing, demand, or customer data...',
}: AskInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const message = value.trim();
    if (!message || disabled) return;
    onSend(message);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  return (
    <div className="border-t border-[var(--border-default)] bg-[var(--bg-primary)] px-6 py-4">
      <div className="flex items-end gap-3 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-xl px-4 py-3 max-w-3xl mx-auto">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 bg-transparent resize-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none leading-relaxed disabled:opacity-60"
          style={{ maxHeight: '120px' }}
          onChange={handleInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Agent trigger button — Phase 2 wires this */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            title="Use an agent (coming in next update)"
            type="button"
          >
            <Bot size={15} />
          </button>
          {/* Send */}
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--accent-primary)] text-white disabled:opacity-40"
            type="button"
          >
            <ArrowUp size={15} />
          </button>
        </div>
      </div>
      <p className="text-center text-[10px] text-[var(--text-tertiary)] mt-2">
        Queries run on your Databricks data · agents use Claude · data stays in your environment
      </p>
    </div>
  );
}
