'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Action {
  priority: number;
  action_type: 'retain' | 'upsell' | 'cross_sell' | 'win_back' | 'reward' | 'no_action';
  title: string;
  description: string;
  offer: { type: string; detail: string };
  channel: string;
  urgency: 'immediate' | 'this_week' | 'this_month';
  expected_impact: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface CustomerData {
  customer_id: string;
  customer_segment: string;
  loyalty_tier: string;
  clv_12m: number;
  clv_tier: string;
  total_spend: number;
  total_transactions: number;
  avg_basket: number;
  days_since_last_purchase: number;
  preferred_channel: string;
  top_category: string;
  churn_prob_90d: number;
  churn_risk_tier: string;
  probability_alive?: number;
  purchase_frequency?: number;
}

interface UseNextBestActionResult {
  actions: Action[];
  loading: boolean;
  source: 'claude' | 'rules' | 'cache';
  refresh: () => void;
}

export function useNextBestAction(
  customerId: string | null,
  customerData: CustomerData | null
): UseNextBestActionResult {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'claude' | 'rules' | 'cache'>('rules');

  const fetchActions = useCallback(async (forceRefresh: boolean = false) => {
    if (!customerId || !customerData) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/next-best-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, customerData, forceRefresh }),
      });

      const data = await response.json();
      setActions(data.actions || []);
      setSource(data.source || 'rules');
    } catch (error) {
      console.error('Failed to fetch NBA:', error);
      setActions([]);
      setSource('rules');
    } finally {
      setLoading(false);
    }
  }, [customerId, customerData]);

  useEffect(() => {
    fetchActions(false);
  }, [fetchActions]);

  const refresh = useCallback(() => {
    fetchActions(true);
  }, [fetchActions]);

  return { actions, loading, source, refresh };
}
