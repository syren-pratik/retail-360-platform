'use client';

import { useState } from 'react';
import { mockMarkdownPayload } from './markdown-data';
import type { Region, StoreType } from './markdown-types';

import MarkdownFilterBar from './components/MarkdownFilterBar';
import MarkdownHeadline from './components/MarkdownHeadline';
import MarkdownKPIStrip from './components/MarkdownKPIStrip';
import SellThroughHeatmap from './components/SellThroughHeatmap';
import MarkdownQueue from './components/MarkdownQueue';
import MarkdownCadenceChart from './components/MarkdownCadenceChart';
import CategorySellThroughChart from './components/CategorySellThroughChart';
import InventoryAgingBuckets from './components/InventoryAgingBuckets';
import AIMarkdownSuggestions from './components/AIMarkdownSuggestions';

export default function MarkdownClearanceShell() {
  const payload = mockMarkdownPayload;

  const [selectedRegion, setSelectedRegion] = useState<Region | 'All'>('All');
  const [selectedStoreType, setSelectedStoreType] = useState<StoreType | 'All'>('All');

  // In production: filter payload based on selectedRegion + selectedStoreType
  // by re-querying Databricks with store_id IN (stores matching filters).
  // For mock: pass data through directly.

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Sticky filter bar */}
      <MarkdownFilterBar
        regions={payload.regions}
        storeTypes={payload.store_types}
        selectedRegion={selectedRegion}
        selectedStoreType={selectedStoreType}
        onRegionChange={setSelectedRegion}
        onStoreTypeChange={setSelectedStoreType}
        generatedAt={payload.generated_at}
      />

      <div className="px-8 py-6 space-y-6">

        {/* A — Headline + Context */}
        <section className="animate-fade-slide-up stagger-1">
          <MarkdownHeadline
            headline={payload.headline}
            activeSeason={payload.active_season}
          />
        </section>

        {/* B — 5 KPI Cards */}
        <section className="animate-fade-slide-up stagger-2">
          <MarkdownKPIStrip kpis={payload.kpis} />
        </section>

        {/* C + D — Heatmap + Markdown Queue (side by side) */}
        <section className="grid grid-cols-[1fr_320px] gap-6 animate-fade-slide-up stagger-3">
          {/* C — Sell-Through Pace Heatmap */}
          <SellThroughHeatmap
            categories={payload.heatmap_categories}
            currentWeek={payload.active_season.current_week}
            totalWeeks={payload.active_season.total_weeks}
          />

          {/* D — Markdown Queue */}
          <MarkdownQueue queue={payload.markdown_queue} />
        </section>

        {/* E + F — Cadence Chart + Category Sell-Through (side by side) */}
        <section className="grid grid-cols-2 gap-6 animate-fade-slide-up stagger-4">
          {/* E — Markdown Cadence: Plan vs Actual */}
          <MarkdownCadenceChart data={payload.cadence_data} />

          {/* F — Sell-Through vs Plan: Top Categories */}
          <CategorySellThroughChart
            data={payload.category_sell_through}
            onCategoryClick={(cat) => console.log('Drill into category:', cat)}
          />
        </section>

        {/* G — Inventory Aging Buckets */}
        <section className="animate-fade-slide-up stagger-5">
          <InventoryAgingBuckets data={payload.aging_data} />
        </section>

        {/* H — AI-Driven Markdown Suggestions */}
        <section className="animate-fade-slide-up stagger-6">
          <AIMarkdownSuggestions suggestions={payload.ai_suggestions} />
        </section>

        {/* Footer context */}
        <footer className="text-center text-[10px] text-[var(--text-tertiary)] pb-4">
          cx360 Markdown Clearance Cockpit · Summer 2026 Season · 150 stores · 5 regions ·
          Powered by Databricks + Claude AI · Data as of{' '}
          {new Date(payload.generated_at).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'Asia/Kolkata',
          })} IST
        </footer>
      </div>
    </div>
  );
}
