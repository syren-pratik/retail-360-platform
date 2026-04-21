'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { generateInsights, Insight } from '@/app/lib/insight-engine';

interface UseAIInsightsResult {
  insights: Insight[];
  loading: boolean;
  source: 'claude' | 'rules' | 'cache' | 'error';
  refresh: () => void;
  isFiltered: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DashboardData = Record<string, any>;

export function useAIInsights(
  module: string,
  dashboardData: DashboardData,
  isFiltered: boolean = false
): UseAIInsightsResult {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'claude' | 'rules' | 'cache' | 'error'>('rules');
  const cachedAIInsightsRef = useRef<Insight[]>([]);
  const hasFetchedRef = useRef(false);

  // Generate rule-based insights as fallback
  const generateRuleBasedInsights = useCallback((): Insight[] => {
    if (!dashboardData || Object.keys(dashboardData).length === 0) {
      return [];
    }

    try {
      // Use the existing insight engine
      if (module === 'cx360') {
        return generateInsights({
          clvDistribution: dashboardData.clvDistribution as Parameters<typeof generateInsights>[0]['clvDistribution'],
          churnRisk: dashboardData.churnRisk as Parameters<typeof generateInsights>[0]['churnRisk'],
          cohortRetention: dashboardData.cohortRetention as Parameters<typeof generateInsights>[0]['cohortRetention'],
          revenueConcentration: dashboardData.revenueConcentration as Parameters<typeof generateInsights>[0]['revenueConcentration'],
          segmentMigration: dashboardData.segmentMigration as Parameters<typeof generateInsights>[0]['segmentMigration'],
          recencyFrequency: dashboardData.recencyFrequency as Parameters<typeof generateInsights>[0]['recencyFrequency'],
          channelAnalysis: dashboardData.channelAnalysis as Parameters<typeof generateInsights>[0]['channelAnalysis'],
          atRiskAlerts: dashboardData.atRiskAlerts as Parameters<typeof generateInsights>[0]['atRiskAlerts'],
        });
      }
      return [];
    } catch (error) {
      console.error('Rule-based insight generation failed:', error);
      return [];
    }
  }, [module, dashboardData]);

  const fetchAIInsights = useCallback(async (forceRefresh: boolean = false) => {
    // Don't fetch if no data loaded yet
    if (!dashboardData || Object.keys(dashboardData).length === 0) {
      setLoading(false);
      return;
    }

    // If filtered, use cached AI insights or rule-based
    if (isFiltered && !forceRefresh) {
      if (cachedAIInsightsRef.current.length > 0) {
        setInsights(cachedAIInsightsRef.current);
        setSource('cache');
      } else {
        const ruleInsights = generateRuleBasedInsights();
        setInsights(ruleInsights);
        setSource('rules');
      }
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, dashboardData, forceRefresh }),
      });

      const result = await response.json();

      if (result.insights && result.insights.length > 0) {
        setInsights(result.insights);
        cachedAIInsightsRef.current = result.insights;
        setSource(result.source === 'cache' ? 'cache' : 'claude');
      } else {
        // Fallback to rule-based insights
        const ruleInsights = generateRuleBasedInsights();
        setInsights(ruleInsights);
        setSource(result.source === 'error' ? 'error' : 'rules');
      }
    } catch (error) {
      console.error('AI insight fetch failed:', error);
      // Fallback to rule-based insights
      const ruleInsights = generateRuleBasedInsights();
      setInsights(ruleInsights);
      setSource('error');
    } finally {
      setLoading(false);
    }
  }, [module, dashboardData, isFiltered, generateRuleBasedInsights]);

  // Initial fetch on mount/data change
  useEffect(() => {
    // Only fetch once when data is available
    if (dashboardData && Object.keys(dashboardData).length > 0 && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchAIInsights(false);
    }
  }, [dashboardData, fetchAIInsights]);

  // Handle filter changes - use rule-based for filtered views
  useEffect(() => {
    if (isFiltered && hasFetchedRef.current) {
      const ruleInsights = generateRuleBasedInsights();
      setInsights(ruleInsights);
      setSource('rules');
      setLoading(false);
    } else if (!isFiltered && cachedAIInsightsRef.current.length > 0) {
      // Restore cached AI insights when filters are cleared
      setInsights(cachedAIInsightsRef.current);
      setSource('cache');
      setLoading(false);
    }
  }, [isFiltered, generateRuleBasedInsights]);

  const refresh = useCallback(() => {
    hasFetchedRef.current = false;
    fetchAIInsights(true);
  }, [fetchAIInsights]);

  return { insights, loading, source, refresh, isFiltered };
}
