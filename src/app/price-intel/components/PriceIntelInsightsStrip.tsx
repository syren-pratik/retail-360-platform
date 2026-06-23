'use client';

import { useState, useEffect, useCallback } from 'react';
import InsightStrip from '@/app/components/insights/InsightStrip';
import type { Insight } from '@/app/lib/insight-engine';

type StripSource = 'claude' | 'rules' | 'cache' | 'error';

function toStripSource(raw: string | undefined): StripSource {
  if (raw === 'claude' || raw === 'cache') return raw;
  if (raw === 'error') return 'error';
  return 'rules';
}

export default function PriceIntelInsightsStrip() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<StripSource>('rules');

  const fetchInsights = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const url = refresh
        ? '/api/price-intel/insights?refresh=true'
        : '/api/price-intel/insights';
      const res = await fetch(url);
      const data = await res.json();
      setInsights(data.insights ?? []);
      setSource(toStripSource(data.source));
    } catch {
      setInsights([]);
      setSource('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return (
    <InsightStrip
      insights={insights}
      loading={loading}
      source={source}
      onRefresh={() => fetchInsights(true)}
      isFiltered={false}
      onScrollToChart={() => {}}
    />
  );
}
