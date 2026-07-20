'use client';

import { Search, FileSpreadsheet, Mail, Database, Percent, FileText, TrendingDown, BarChart3, Calendar, MessageCircle } from 'lucide-react';
import type { AgentDefinition } from '@/app/agents/lib/agent-registry';

interface Props {
  agent: AgentDefinition;
  isSelected: boolean;
  onClick: () => void;
}

interface Capability {
  icon: React.ReactNode;
  label: string;
}

function getActionCapabilities(id: string): Capability[] {
  if (id === 'inventory-replenishment') {
    return [
      { icon: <Search size={12} />, label: 'Detect SKUs at stockout risk before events' },
      { icon: <FileSpreadsheet size={12} />, label: 'Generate PO spreadsheet (xlsx)' },
      { icon: <Mail size={12} />, label: 'Draft supplier email for procurement' },
      { icon: <Database size={12} />, label: 'Flag SKUs in Databricks inventory_intent' },
    ];
  }
  if (id === 'price-change-execution') {
    return [
      { icon: <Search size={12} />, label: 'Identify high-impact price recommendations' },
      { icon: <FileSpreadsheet size={12} />, label: 'Generate POS-ready price change file' },
      { icon: <Mail size={12} />, label: 'Draft store ops rollout email' },
      { icon: <Database size={12} />, label: 'Update price_master in Databricks' },
    ];
  }
  if (id === 'campaign-pause') {
    return [
      { icon: <Percent size={12} />, label: 'Detect live campaigns above 50% free-rider ratio' },
      { icon: <FileText size={12} />, label: 'Generate campaign pause memo (xlsx)' },
      { icon: <Mail size={12} />, label: 'Draft promo team notification' },
      { icon: <Database size={12} />, label: 'Pause campaigns in silver.campaigns' },
    ];
  }
  if (id === 'markdown-execution') {
    return [
      { icon: <TrendingDown size={12} />, label: 'Rank markdown queue by urgency and risk' },
      { icon: <FileSpreadsheet size={12} />, label: 'Generate POS + WhatsApp instructions' },
      { icon: <MessageCircle size={12} />, label: 'Draft store manager broadcast' },
      { icon: <Database size={12} />, label: 'Approve events in gold.markdown_events' },
    ];
  }
  if (id === 'rfq-generator') {
    return [
      { icon: <Search size={12} />, label: 'Find SKUs where supplier costs compress margin' },
      { icon: <FileText size={12} />, label: 'Generate formal RFQ spreadsheet' },
      { icon: <Mail size={12} />, label: 'Draft supplier negotiation email' },
      { icon: <Database size={12} />, label: 'Log RFQ in procurement_rfqs' },
    ];
  }
  if (id === 'weekly-distribution') {
    return [
      { icon: <BarChart3 size={12} />, label: 'Assemble 3-sheet weekly brief' },
      { icon: <Mail size={12} />, label: 'Draft leadership brief email' },
      { icon: <MessageCircle size={12} />, label: 'Prepare 160-char VP WhatsApp summary' },
      { icon: <Calendar size={12} />, label: 'Log distribution in weekly_briefs' },
    ];
  }
  return [];
}

export default function ActionAgentCard({ agent, isSelected, onClick }: Props) {
  const caps = getActionCapabilities(agent.id);
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col p-5 rounded-xl text-left transition-colors bg-white ${
        isSelected
          ? 'border-2 border-[var(--accent-primary)]'
          : 'border border-[var(--border-default)] hover:border-[var(--border-hover)]'
      }`}
    >
      <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        Takes action
      </span>
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${agent.color}`}
      >
        {agent.icon}
      </div>
      <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">{agent.name}</h3>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">{agent.tagline}</p>

      <div className="space-y-1.5 mt-auto pt-3 border-t border-[var(--border-default)] w-full">
        {caps.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
            <span className="text-emerald-600">{c.icon}</span>
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </button>
  );
}
