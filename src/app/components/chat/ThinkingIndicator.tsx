'use client';

import { useState, useEffect } from 'react';
import { Search, Database, Brain, BarChart3, Check, Loader2 } from 'lucide-react';

export type ThinkingStep = 'understanding' | 'querying' | 'analyzing' | 'visualizing';

interface ThinkingIndicatorProps {
  currentStep?: ThinkingStep;
  isComplete?: boolean;
}

const steps: { key: ThinkingStep; label: string; icon: React.ElementType }[] = [
  { key: 'understanding', label: 'Understanding...', icon: Brain },
  { key: 'querying', label: 'Querying data...', icon: Database },
  { key: 'analyzing', label: 'Analyzing...', icon: Search },
  { key: 'visualizing', label: 'Creating view...', icon: BarChart3 },
];

export default function ThinkingIndicator({ currentStep = 'understanding', isComplete = false }: ThinkingIndicatorProps) {
  const [animatedStep, setAnimatedStep] = useState(0);
  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  // Auto-advance animation if no step is provided
  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      setAnimatedStep((prev) => (prev + 1) % (steps ?? []).length);
    }, 1500);

    return () => clearInterval(interval);
  }, [isComplete]);

  const displayStepIndex = currentStepIndex >= 0 ? currentStepIndex : animatedStep;
  const displayStep = steps[displayStepIndex];
  const Icon = displayStep.icon;

  if (isComplete) {
    return (
      <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
        <Check size={14} className="text-green-600" />
        <span className="text-xs text-green-700">Done</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg">
      <div className="relative">
        <Loader2 size={18} className="text-[var(--accent-primary)] animate-spin" />
        <Icon
          size={10}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--accent-primary)]"
        />
      </div>
      <div className="flex-1">
        <div className="text-xs font-medium text-[var(--text-primary)]">
          {displayStep.label}
        </div>
        {/* Progress dots */}
        <div className="flex gap-1 mt-1.5">
          {(steps ?? []).map((step, index) => (
            <div
              key={step.key}
              className={`h-1 rounded-full transition-all duration-300 ${
                index <= displayStepIndex
                  ? 'w-6 bg-[var(--accent-primary)]'
                  : 'w-3 bg-[var(--border-default)]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
