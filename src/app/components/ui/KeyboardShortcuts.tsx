'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useDashboard } from '@/app/context/DashboardContext';

interface ShortcutItem {
  keys: string[];
  description: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['/', '⌘K'], description: 'Focus search' },
  { keys: ['Esc'], description: 'Close modal / Clear filters' },
  { keys: ['⌘E'], description: 'Export current view as CSV' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
];

interface KeyboardShortcutsProps {
  onExport?: () => void;
  searchInputId?: string;
}

/**
 * Keyboard shortcuts handler and help modal
 */
export default function KeyboardShortcuts({
  onExport,
  searchInputId = 'customer-search-input',
}: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);
  const { expandedChart, setExpandedChart, clearAllDrilldowns, activeDrilldowns } = useDashboard();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Allow Escape to work even in inputs (to blur them)
      if (e.key === 'Escape') {
        e.preventDefault();
        // Priority: close modal > blur input > clear drilldowns
        if (expandedChart) {
          setExpandedChart(null);
        } else if (isInputFocused) {
          (target as HTMLInputElement).blur();
        } else if (activeDrilldowns.length > 0) {
          clearAllDrilldowns();
        }
        setShowHelp(false);
        return;
      }

      // Skip other shortcuts if typing
      if (isInputFocused) return;

      // Focus search: / or Cmd+K
      if (e.key === '/' || (e.metaKey && e.key === 'k')) {
        e.preventDefault();
        const searchInput = document.getElementById(searchInputId);
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // Export: Cmd+E
      if (e.metaKey && e.key === 'e') {
        e.preventDefault();
        onExport?.();
        return;
      }

      // Help: ?
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        setShowHelp(true);
        return;
      }
    },
    [expandedChart, setExpandedChart, clearAllDrilldowns, activeDrilldowns, onExport, searchInputId]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!showHelp) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setShowHelp(false)}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-[var(--accent-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={() => setShowHelp(false)}
            className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-3">
            {SHORTCUTS.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm text-[var(--text-secondary)]">
                  {shortcut.description}
                </span>
                <div className="flex items-center gap-1.5">
                  {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex} className="flex items-center gap-1">
                      {keyIndex > 0 && (
                        <span className="text-xs text-[var(--text-tertiary)]">or</span>
                      )}
                      <kbd className="px-2 py-1 text-xs font-mono bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded border border-[var(--border-default)]">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border-default)]">
          <p className="text-xs text-[var(--text-tertiary)] text-center">
            Press <kbd className="px-1.5 py-0.5 bg-white rounded border border-[var(--border-default)] font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Small hint badge showing keyboard shortcut
 */
export function ShortcutHint({ shortcut }: { shortcut: string }) {
  return (
    <kbd className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] rounded border border-[var(--border-default)]">
      {shortcut}
    </kbd>
  );
}
