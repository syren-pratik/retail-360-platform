'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { AgentDefinition, AgentParam } from '@/app/agents/lib/agent-registry';
import type { PriceIntelCore } from '@/app/lib/price-intel-types';

interface AgentMiniFormProps {
  agent: AgentDefinition;
  core: PriceIntelCore | null;
  onRun: (formValues: Record<string, string | number | string[]>, chatMessage?: string) => void;
  loading: boolean;
}

type FormValues = Record<string, string | number | string[]>;

function dynamicOptions(param: AgentParam, core: PriceIntelCore | null): Array<{ value: string; label: string }> {
  if (!core) return [];
  switch (param.options_source) {
    case 'skus':
      return [...core.skus]
        .sort((a, b) => Math.abs(b.revenue_impact_inr) - Math.abs(a.revenue_impact_inr))
        .slice(0, 30)
        .map((s) => ({ value: s.sku_id, label: `${s.product_name} (${s.department})` }));
    case 'categories':
      return core.departments.flatMap((d) => d.categories.map((c) => ({ value: c, label: c })));
    case 'markdown_queue':
      return core.markdown_queue.map((i) => ({
        value: i.sku_id,
        label: `${i.product_name} — ${i.recommended_depth_pct}%`,
      }));
    case 'departments':
      return core.departments.map((d) => ({ value: d.name, label: d.name }));
    default:
      return param.options ?? [];
  }
}

function initialValues(agent: AgentDefinition): FormValues {
  const values: FormValues = {};
  for (const p of agent.params ?? []) {
    if (p.default_value !== undefined) values[p.id] = p.default_value;
    else if (p.type === 'multiselect') values[p.id] = [];
  }
  return values;
}

export default function AgentMiniForm({ agent, core, onRun, loading }: AgentMiniFormProps) {
  const [formValues, setFormValues] = useState<FormValues>(() => initialValues(agent));
  const [chatMessage, setChatMessage] = useState('');

  const set = (id: string, value: string | number | string[]) =>
    setFormValues((prev) => ({ ...prev, [id]: value }));

  const isFormValid = (() => {
    if (agent.input_type === 'chat') return chatMessage.trim().length > 0;
    if (agent.input_type === 'oneclick') return true;
    return (agent.params ?? [])
      .filter((p) => p.required)
      .every((p) => {
        const v = formValues[p.id];
        if (Array.isArray(v)) return v.length > 0;
        return v !== undefined && v !== '';
      });
  })();

  return (
    <div className="space-y-3">
      {/* oneclick: description only */}
      {agent.input_type === 'oneclick' && (
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{agent.description}</p>
      )}

      {/* chat: example chip + textarea */}
      {agent.input_type === 'chat' && (
        <>
          {agent.example_prompt && (
            <button
              type="button"
              onClick={() => setChatMessage(agent.example_prompt!)}
              className="w-full text-left text-[11px] px-2.5 py-2 rounded-lg border border-dashed border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] hover:border-[var(--border-hover)] transition-colors"
            >
              e.g. “{agent.example_prompt}”
            </button>
          )}
          <textarea
            rows={3}
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder={agent.chat_placeholder ?? 'Describe...'}
            className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg px-2.5 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none resize-none"
          />
        </>
      )}

      {/* form: render each param */}
      {agent.input_type === 'form' &&
        (agent.params ?? []).map((param) => {
          const options = dynamicOptions(param, core);

          if (param.type === 'select') {
            return (
              <div key={param.id}>
                <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">
                  {param.label}{param.required && ' *'}
                </label>
                <select
                  value={String(formValues[param.id] ?? '')}
                  onChange={(e) => set(param.id, e.target.value)}
                  className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 text-[var(--text-primary)] outline-none"
                >
                  <option value="">{param.placeholder ?? 'Select...'}</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            );
          }

          if (param.type === 'slider') {
            const v = Number(formValues[param.id] ?? param.default_value ?? param.min ?? 0);
            return (
              <div key={param.id}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-medium text-[var(--text-secondary)]">
                    {param.label}{param.required && ' *'}
                  </label>
                  <span className="text-[10px] font-semibold text-[var(--accent-primary)]">{v}{param.id.includes('pct') ? '%' : ''}</span>
                </div>
                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={v}
                  onChange={(e) => set(param.id, Number(e.target.value))}
                  className="w-full accent-[var(--accent-primary)]"
                />
              </div>
            );
          }

          if (param.type === 'multiselect') {
            const selected = (formValues[param.id] as string[]) ?? [];
            return (
              <div key={param.id}>
                <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">
                  {param.label}{param.required && ' *'}{selected.length > 0 && ` (${selected.length})`}
                </label>
                <div className="max-h-[110px] overflow-y-auto space-y-1 border border-[var(--border-default)] rounded-lg p-1.5 bg-[var(--bg-secondary)]">
                  {options.slice(0, 12).map((o) => (
                    <label key={o.value} className="flex items-center gap-1.5 text-[11px] text-[var(--text-primary)] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(o.value)}
                        onChange={(e) =>
                          set(param.id, e.target.checked
                            ? [...selected, o.value]
                            : selected.filter((s) => s !== o.value))
                        }
                        className="accent-[var(--accent-primary)]"
                      />
                      <span className="truncate">{o.label}</span>
                    </label>
                  ))}
                  {options.length === 0 && (
                    <p className="text-[10px] text-[var(--text-tertiary)] p-1">No options available</p>
                  )}
                </div>
              </div>
            );
          }

          // textarea
          return (
            <div key={param.id}>
              <label className="block text-[10px] font-medium text-[var(--text-secondary)] mb-1">
                {param.label}{param.required && ' *'}
              </label>
              <textarea
                rows={2}
                value={String(formValues[param.id] ?? '')}
                onChange={(e) => set(param.id, e.target.value)}
                placeholder={param.placeholder}
                className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg px-2.5 py-2 text-[var(--text-primary)] outline-none resize-none"
              />
            </div>
          );
        })}

      {/* Run button */}
      <button
        onClick={() => onRun(formValues, chatMessage || undefined)}
        disabled={loading || !isFormValid}
        className="w-full py-2.5 text-sm font-medium bg-[var(--accent-primary)] text-white rounded-lg disabled:opacity-40 flex items-center justify-center gap-2"
        type="button"
      >
        {loading
          ? <><Loader2 size={14} className="animate-spin" />Running...</>
          : <>Run in chat →</>
        }
      </button>
    </div>
  );
}
