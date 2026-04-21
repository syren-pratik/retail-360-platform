'use client';

interface SkeletonProps {
  className?: string;
}

/**
 * Base skeleton component with pulse animation
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[var(--bg-tertiary)] rounded ${className}`}
    />
  );
}

/**
 * KPI Card skeleton - matches KPICard dimensions
 */
export function KPISkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}

/**
 * Chart skeleton - card with fake chart outline
 */
export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div style={{ height }} className="relative">
        {/* Fake chart bars */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around h-full px-4">
          <Skeleton className="w-8 h-[60%]" />
          <Skeleton className="w-8 h-[80%]" />
          <Skeleton className="w-8 h-[45%]" />
          <Skeleton className="w-8 h-[90%]" />
          <Skeleton className="w-8 h-[70%]" />
        </div>
        {/* Fake axis */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--border-default)]" />
        <div className="absolute top-0 bottom-0 left-0 border-r border-[var(--border-default)]" />
      </div>
    </div>
  );
}

/**
 * Table skeleton - rows of gray bars
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      {/* Table header */}
      <div className="flex items-center gap-4 py-3 border-b border-[var(--border-default)]">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20 ml-auto" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 py-3 border-b border-[var(--border-subtle)]"
        >
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16 ml-auto" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Donut chart skeleton
 */
export function DonutSkeleton() {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div className="flex items-center justify-center h-[200px]">
        <div className="relative">
          <Skeleton className="w-40 h-40 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-white" />
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-4 mt-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

/**
 * Heatmap skeleton
 */
export function HeatmapSkeleton() {
  return (
    <div className="card h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * Full page skeleton for dashboard
 */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <div className="sticky top-0 z-30 bg-white border-b border-[var(--border-default)] px-6 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Title */}
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <KPISkeleton />
          <KPISkeleton />
          <KPISkeleton />
          <KPISkeleton />
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>

        {/* Table */}
        <TableSkeleton rows={8} />
      </div>
    </div>
  );
}
