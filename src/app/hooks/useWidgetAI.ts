'use client';

import { useState, useCallback } from 'react';

export interface WidgetMetric {
  label: string;
  value: string;
  color: 'positive' | 'negative' | 'warning' | 'neutral';
}

export interface WidgetFollowUp {
  label: string;
  prompt: string;
}

export interface WidgetAnalysis {
  insight: string;
  metrics: WidgetMetric[];
  follow_ups: WidgetFollowUp[];
}

interface UseWidgetAIReturn {
  analysis: WidgetAnalysis | null;
  loading: boolean;
  activeChart: string | null;
  error: string | null;
  analyze: (
    chartId: string,
    chartTitle: string,
    chartType: string,
    data: unknown[],
    filters: Record<string, unknown>,
    module: string
  ) => Promise<void>;
  close: () => void;
}

export function useWidgetAI(): UseWidgetAIReturn {
  const [analysis, setAnalysis] = useState<WidgetAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeChart, setActiveChart] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (
      chartId: string,
      chartTitle: string,
      chartType: string,
      data: unknown[],
      filters: Record<string, unknown>,
      module: string
    ) => {
      // Toggle — if same chart clicked again, close it
      if (activeChart === chartId) {
        setActiveChart(null);
        setAnalysis(null);
        setError(null);
        return;
      }

      setActiveChart(chartId);
      setLoading(true);
      setError(null);
      setAnalysis(null);

      try {
        const res = await fetch('/api/widget-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chartId,
            chartTitle,
            chartType,
            data,
            filters,
            module,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to analyze chart');
        }

        const result = await res.json();
        setAnalysis(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Analysis unavailable');
        setAnalysis({
          insight: 'Analysis unavailable. Try again later.',
          metrics: [],
          follow_ups: [],
        });
      } finally {
        setLoading(false);
      }
    },
    [activeChart]
  );

  const close = useCallback(() => {
    setActiveChart(null);
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    loading,
    activeChart,
    error,
    analyze,
    close,
  };
}
