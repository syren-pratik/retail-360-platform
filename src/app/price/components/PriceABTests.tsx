'use client';

import { useMemo, useState } from 'react';
import { FlaskConical, CheckCircle2, XCircle, MinusCircle, Loader2, Sparkles } from 'lucide-react';
import { ABTest } from '@/app/lib/price-types';

interface PriceABTestsProps {
  data: ABTest[];
}

function WinnerBadge({ winner }: { winner: ABTest['winner'] }) {
  if (!winner) return null;

  const config = {
    test: { bg: 'bg-green-100', text: 'text-green-700', label: 'Test wins', icon: CheckCircle2 },
    control: { bg: 'bg-red-100', text: 'text-red-700', label: 'Control wins', icon: XCircle },
    inconclusive: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Inconclusive', icon: MinusCircle },
  };

  const c = config[winner];
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon size={12} />
      {c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: ABTest['status'] }) {
  if (status === 'running') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
        <Loader2 size={12} className="animate-spin" />
        Running
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
      <CheckCircle2 size={12} />
      Completed
    </span>
  );
}

function SignificanceBadge({ significance }: { significance: string | null }) {
  if (!significance) return <span className="text-gray-400">-</span>;

  const value = parseInt(significance);
  let color = 'bg-red-100 text-red-700';
  if (value >= 95) color = 'bg-green-100 text-green-700';
  else if (value >= 90) color = 'bg-amber-100 text-amber-700';

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {significance}
    </span>
  );
}

function TestComparisonChart({ test }: { test: ABTest }) {
  return (
    <div className="p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-secondary)]">
      <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">
        {test.product_name}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)] mb-1">
            <span>Control (₹{test.control_price})</span>
            <span>Test (₹{test.test_price})</span>
          </div>
          <div className="flex items-center gap-2 h-8">
            <div
              className="h-full bg-blue-400 rounded transition-all"
              style={{ width: `${(test.control_qty / Math.max(test.control_qty, test.test_qty || 0)) * 100}%` }}
              title={`${(test.control_qty ?? 0).toLocaleString()} units`}
            />
            <div
              className="h-full bg-green-400 rounded transition-all"
              style={{ width: `${((test.test_qty || 0) / Math.max(test.control_qty, test.test_qty || 0)) * 100}%` }}
              title={`${(test.test_qty || 0).toLocaleString()} units`}
            />
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-blue-600 font-medium">{(test.control_qty ?? 0).toLocaleString()}</span>
            <span className="text-green-600 font-medium">{(test.test_qty || 0).toLocaleString()}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[var(--text-tertiary)]">Revenue Lift</div>
          <div className={`text-sm font-semibold ${(test.revenue_lift_pct || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(test.revenue_lift_pct || 0) >= 0 ? '+' : ''}{(test.revenue_lift_pct || 0).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PriceABTests({ data }: PriceABTestsProps) {
  const [showAllTests, setShowAllTests] = useState(false);

  const completedTests = useMemo(() => (data ?? []).filter(t => t.status === 'completed'), [data]);
  const runningTests = useMemo(() => (data ?? []).filter(t => t.status === 'running'), [data]);

  const displayedTests = showAllTests ? data : (data ?? []).slice(0, 5);

  // Summary stats
  const testWins = completedTests.filter(t => t.winner === 'test').length;
  const controlWins = completedTests.filter(t => t.winner === 'control').length;
  const avgRevenueLift = (completedTests ?? []).length > 0
    ? (completedTests ?? []).reduce((sum, t) => sum + (t.revenue_lift_pct || 0), 0) / (completedTests ?? []).length
    : 0;

  if (data.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-100">
            <FlaskConical size={20} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Price A/B Tests
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Test price changes before rolling out
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-[var(--bg-secondary)] mb-4">
            <FlaskConical size={32} className="text-[var(--text-tertiary)]" />
          </div>
          <h4 className="text-base font-medium text-[var(--text-primary)] mb-2">
            No active price tests
          </h4>
          <p className="text-sm text-[var(--text-secondary)] max-w-md mb-4">
            Use the AI assistant to design a price test for any product.
          </p>
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary-light)] text-[var(--accent-primary)] rounded-lg text-sm">
            <Sparkles size={16} />
            Try: &quot;Design a price test for Tata Salt&quot;
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <FlaskConical size={20} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Price A/B Tests
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {(completedTests ?? []).length} completed · {(runningTests ?? []).length} running
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{testWins}</div>
            <div className="text-xs text-[var(--text-tertiary)]">Test wins</div>
          </div>
          <div className="h-8 w-px bg-[var(--border-subtle)]" />
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">{controlWins}</div>
            <div className="text-xs text-[var(--text-tertiary)]">Control wins</div>
          </div>
          <div className="h-8 w-px bg-[var(--border-subtle)]" />
          <div className="text-center">
            <div className={`text-lg font-semibold ${avgRevenueLift >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {avgRevenueLift >= 0 ? '+' : ''}{(avgRevenueLift ?? 0).toFixed(1)}%
            </div>
            <div className="text-xs text-[var(--text-tertiary)]">Avg revenue lift</div>
          </div>
        </div>
      </div>

      {/* Test Results Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="p-3 text-left font-medium text-[var(--text-secondary)]">Test ID</th>
              <th className="p-3 text-left font-medium text-[var(--text-secondary)]">Product</th>
              <th className="p-3 text-right font-medium text-[var(--text-secondary)]">Control ₹</th>
              <th className="p-3 text-right font-medium text-[var(--text-secondary)]">Test ₹</th>
              <th className="p-3 text-right font-medium text-[var(--text-secondary)]">Control Qty</th>
              <th className="p-3 text-right font-medium text-[var(--text-secondary)]">Test Qty</th>
              <th className="p-3 text-right font-medium text-[var(--text-secondary)]">Vol Lift</th>
              <th className="p-3 text-right font-medium text-[var(--text-secondary)]">Rev Lift</th>
              <th className="p-3 text-center font-medium text-[var(--text-secondary)]">Sig.</th>
              <th className="p-3 text-center font-medium text-[var(--text-secondary)]">Winner</th>
              <th className="p-3 text-center font-medium text-[var(--text-secondary)]">Status</th>
            </tr>
          </thead>
          <tbody>
            {(displayedTests ?? []).map((test) => (
              <tr key={test.test_id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                <td className="p-3 font-medium text-[var(--text-primary)]">{test.test_id}</td>
                <td className="p-3">
                  <div className="text-[var(--text-primary)]">{test.product_name}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{test.department}</div>
                </td>
                <td className="p-3 text-right text-[var(--text-primary)]">₹{test.control_price}</td>
                <td className="p-3 text-right text-[var(--text-primary)]">₹{test.test_price}</td>
                <td className="p-3 text-right text-[var(--text-primary)]">{(test.control_qty ?? 0).toLocaleString()}</td>
                <td className="p-3 text-right text-[var(--text-primary)]">
                  {test.test_qty ? (test.test_qty ?? 0).toLocaleString() : '-'}
                </td>
                <td className="p-3 text-right">
                  {test.lift_pct !== null ? (
                    <span className={test.lift_pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {test.lift_pct >= 0 ? '+' : ''}{(test.lift_pct ?? 0).toFixed(1)}%
                    </span>
                  ) : '-'}
                </td>
                <td className="p-3 text-right">
                  {test.revenue_lift_pct !== null ? (
                    <span className={test.revenue_lift_pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {test.revenue_lift_pct >= 0 ? '+' : ''}{(test.revenue_lift_pct ?? 0).toFixed(1)}%
                    </span>
                  ) : '-'}
                </td>
                <td className="p-3 text-center">
                  <SignificanceBadge significance={test.significance} />
                </td>
                <td className="p-3 text-center">
                  <WinnerBadge winner={test.winner} />
                </td>
                <td className="p-3 text-center">
                  <StatusBadge status={test.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(data ?? []).length > 5 && (
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowAllTests(!showAllTests)}
            className="text-sm text-[var(--accent-primary)] hover:text-[var(--accent-primary-dark)] transition-colors"
          >
            {showAllTests ? 'Show less' : `Show all ${(data ?? []).length} tests`}
          </button>
        </div>
      )}

      {/* Test Comparison Charts */}
      {(completedTests ?? []).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">
            Test Comparisons
          </h4>
          <div className="grid grid-cols-3 gap-4">
            {(completedTests ?? []).slice(0, 6).map((test) => (
              <TestComparisonChart key={test.test_id} test={test} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
