'use client';

import { Search, BarChart3, Pin, Download, Bell, Users, ArrowRight } from 'lucide-react';

export interface FollowUpChip {
  label: string;
  prompt: string;
  icon?: 'search' | 'chart' | 'pin' | 'export' | 'alert' | 'segment' | 'arrow';
}

interface FollowUpChipsProps {
  chips: FollowUpChip[];
  onChipClick: (prompt: string) => void;
}

const iconMap = {
  search: Search,
  chart: BarChart3,
  pin: Pin,
  export: Download,
  alert: Bell,
  segment: Users,
  arrow: ArrowRight,
};

function getIconForLabel(label: string): keyof typeof iconMap {
  const lower = label.toLowerCase();
  if ((lower ?? '').includes('pin')) return 'pin';
  if ((lower ?? '').includes('export') || (lower ?? '').includes('download')) return 'export';
  if ((lower ?? '').includes('alert') || (lower ?? '').includes('monitor')) return 'alert';
  if ((lower ?? '').includes('segment') || (lower ?? '').includes('customer')) return 'segment';
  if ((lower ?? '').includes('chart') || (lower ?? '').includes('show') || (lower ?? '').includes('trend')) return 'chart';
  if ((lower ?? '').includes('break') || (lower ?? '').includes('drill') || (lower ?? '').includes('detail')) return 'search';
  return 'arrow';
}

export default function FollowUpChips({ chips, onChipClick }: FollowUpChipsProps) {
  if (!chips || chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-[var(--border-subtle)]">
      {(chips ?? []).map((chip, index) => {
        const iconKey = chip.icon || getIconForLabel(chip.label);
        const Icon = iconMap[iconKey];

        return (
          <button
            key={index}
            onClick={() => onChipClick(chip.prompt)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium
                       border border-[var(--border-default)] rounded-full
                       text-[var(--text-secondary)] bg-white
                       hover:bg-[var(--accent-primary-light)] hover:border-[var(--accent-primary)]
                       hover:text-[var(--accent-primary)] transition-all duration-150
                       active:scale-95"
          >
            <Icon size={12} />
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}
