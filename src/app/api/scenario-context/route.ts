/**
 * Returns the real Databricks baseline a scenario needs before Claude
 * reasons about cascade impact. Used by ScenarioSimulator and any other
 * "what-if" UI that needs grounded numbers.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  supplierHealth,
  inventoryStatus,
  demandLookup,
} from '@/app/lib/dbx-tools';

interface ScenarioContext {
  baseline: Record<string, unknown>;
  source: 'databricks' | 'cache' | 'mock';
  queriedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenario, params } = body as {
      scenario: string;
      params: Record<string, unknown>;
    };

    const baseline = await getBaseline(scenario, params);

    const ctx: ScenarioContext = {
      baseline,
      source: 'databricks',
      queriedAt: new Date().toISOString(),
    };
    return NextResponse.json(ctx);
  } catch (error) {
    return NextResponse.json(
      {
        baseline: {},
        source: 'mock',
        error: error instanceof Error ? error.message : 'context fetch failed',
        queriedAt: new Date().toISOString(),
      },
      { status: 200 }, // soft-fail so the simulator still runs
    );
  }
}

async function getBaseline(
  scenario: string,
  params: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (scenario) {
    case 'supplier_delay': {
      const supplierName = params.supplier as string | undefined;
      const [scorecard, network] = await Promise.all([
        supplierHealth({
          scope: 'supplier_lookup',
          filter: { supplier_name: supplierName },
        }),
        inventoryStatus({ scope: 'health_summary' }),
      ]);
      return {
        supplier: scorecard.data?.[0] ?? null,
        network_health: network.data?.slice(0, 10) ?? [],
        explanation:
          'supplier scorecard from gold_supplier_scorecard + current inventory health by department',
      };
    }
    case 'demand_spike': {
      const category = params.category as string | undefined;
      const [sales, inv] = await Promise.all([
        demandLookup({
          scope: 'sales_summary',
          filter: { department: category, window_days: 7 },
        }),
        inventoryStatus({
          scope: 'health_summary',
          filter: { department: category },
        }),
      ]);
      return {
        recent_sales_7d: sales.data ?? [],
        category_inventory: inv.data ?? [],
        explanation:
          'last 7 days of category sales + current inventory health for this department',
      };
    }
    case 'store_closure': {
      const store = params.store as string | undefined;
      const [topMovers, inv] = await Promise.all([
        demandLookup({
          scope: 'top_movers',
          filter: { window_days: 7 },
          limit: 20,
        }),
        inventoryStatus({ scope: 'stockouts_now', limit: 30 }),
      ]);
      return {
        target_store: store,
        recent_top_movers: topMovers.data ?? [],
        current_stockouts: inv.data ?? [],
        explanation:
          'recent top movers + current stockouts to estimate cascade impact of closure',
      };
    }
    case 'dc_disruption': {
      const [network, replenishment] = await Promise.all([
        inventoryStatus({ scope: 'health_summary' }),
        inventoryStatus({ scope: 'replenishment_needed', limit: 20 }),
      ]);
      return {
        dc_name: params.dc,
        network_health: network.data ?? [],
        pending_replenishment: replenishment.data ?? [],
        explanation:
          'network-wide inventory health + pending replenishment orders that would be blocked',
      };
    }
    default:
      return { explanation: 'unknown scenario — no baseline fetched' };
  }
}
