'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar, Plus, X, Save, Percent, TrendingUp } from 'lucide-react';
import { PromoCalendarItem } from '@/app/lib/price-types';
import { NoDataFallback } from '@/app/components/ui/NoDataFallback';

interface PromoCalendarProps {
  data: PromoCalendarItem[];
}

interface EditingCell {
  category: string;
  week: string;
}

interface PromoEdit {
  promo_type: string;
  discount: number;
  expected_lift: number;
}

const PROMO_TYPES = [
  { value: 'Flat 5%', color: '#3B82F6', label: 'Flat Discount' },
  { value: 'Flat 10%', color: '#3B82F6', label: 'Flat Discount' },
  { value: 'Flat 15%', color: '#3B82F6', label: 'Flat Discount' },
  { value: 'Flat 20%', color: '#3B82F6', label: 'Flat Discount' },
  { value: 'Flat 25%', color: '#3B82F6', label: 'Flat Discount' },
  { value: 'BOGO', color: '#8B5CF6', label: 'BOGO' },
  { value: 'Bundle', color: '#10B981', label: 'Bundle' },
  { value: 'Cashback', color: '#F59E0B', label: 'Cashback' },
  { value: 'Combo', color: '#14B8A6', label: 'Combo' },
];

function getPromoColor(promoType: string | null): string {
  if (!promoType) return 'transparent';
  if ((promoType ?? '').includes('BOGO')) return '#8B5CF6';
  if ((promoType ?? '').includes('Bundle') || (promoType ?? '').includes('Pack')) return '#10B981';
  if ((promoType ?? '').includes('Combo')) return '#14B8A6';
  if ((promoType ?? '').includes('Cashback')) return '#F59E0B';
  // Default to blue for flat discounts
  return '#3B82F6';
}

function getExpectedLift(promoType: string, discount: number): number {
  // Simple lift estimation based on promo type and discount
  if ((promoType ?? '').includes('BOGO')) return 75 + Math.random() * 20;
  if ((promoType ?? '').includes('Bundle') || (promoType ?? '').includes('Pack')) return 15 + discount * 0.8;
  if ((promoType ?? '').includes('Combo')) return 35 + discount * 0.5;
  if ((promoType ?? '').includes('Cashback')) return 20 + discount * 0.6;
  // Flat discount
  return 8 + discount * 2.2;
}

const STORAGE_KEY = 'price_promo_calendar_edits';

export default function PromoCalendar({ data }: PromoCalendarProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editForm, setEditForm] = useState<PromoEdit>({ promo_type: 'Flat 10%', discount: 10, expected_lift: 15 });
  const [localEdits, setLocalEdits] = useState<Record<string, PromoCalendarItem>>({});

  // Load edits from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setLocalEdits(JSON.parse(saved));
      } catch {
        console.error('Failed to parse saved promo edits');
      }
    }
  }, []);

  // Save edits to localStorage
  const saveEdits = useCallback((edits: Record<string, PromoCalendarItem>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
    setLocalEdits(edits);
  }, []);

  const safeData = data ?? [];

  // Get unique categories and weeks
  const { categories, weeks } = useMemo(() => {
    const cats = Array.from(new Set((safeData ?? []).map(d => d.category)));
    const wks = Array.from(new Set((safeData ?? []).map(d => d.week)));
    return { categories: cats, weeks: wks };
  }, [safeData]);

  // Merge original data with local edits
  const mergedData = useMemo(() => {
    const result: Record<string, Record<string, PromoCalendarItem>> = {};

    (categories ?? []).forEach(cat => {
      result[cat] = {};
      (weeks ?? []).forEach(week => {
        const key = `${cat}-${week}`;
        const original = safeData.find(d => d.category === cat && d.week === week);
        result[cat][week] = localEdits[key] || original || {
          category: cat,
          week,
          promo_type: null,
          expected_lift: null,
          discount: null,
          active: false,
        };
      });
    });

    return result;
  }, [safeData, localEdits, categories, weeks]);

  // Count promos per category
  const promoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (categories ?? []).forEach(cat => {
      counts[cat] = Object.values(mergedData[cat] ?? {}).filter(d => d.active).length;
    });
    return counts;
  }, [mergedData, categories]);

  // Guard against null/undefined data - after all hooks
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <NoDataFallback title="No promo data" message="Promo calendar data is not available." />;
  }

  const handleCellClick = (category: string, week: string) => {
    const current = mergedData[category][week];
    if (current.active && current.promo_type) {
      // Edit existing promo
      setEditForm({
        promo_type: current.promo_type,
        discount: current.discount || 10,
        expected_lift: current.expected_lift || 15,
      });
    } else {
      // New promo
      setEditForm({ promo_type: 'Flat 10%', discount: 10, expected_lift: 15 });
    }
    setEditingCell({ category, week });
  };

  const handleSave = () => {
    if (!editingCell) return;

    const key = `${editingCell.category}-${editingCell.week}`;
    const newItem: PromoCalendarItem = {
      category: editingCell.category,
      week: editingCell.week,
      promo_type: editForm.promo_type,
      expected_lift: Math.round(getExpectedLift(editForm.promo_type, editForm.discount)),
      discount: editForm.discount,
      active: true,
    };

    saveEdits({ ...localEdits, [key]: newItem });
    setEditingCell(null);
  };

  const handleDelete = () => {
    if (!editingCell) return;

    const key = `${editingCell.category}-${editingCell.week}`;
    const newItem: PromoCalendarItem = {
      category: editingCell.category,
      week: editingCell.week,
      promo_type: null,
      expected_lift: null,
      discount: null,
      active: false,
    };

    saveEdits({ ...localEdits, [key]: newItem });
    setEditingCell(null);
  };

  const handlePromoTypeChange = (promoType: string) => {
    const discount = (promoType ?? '').includes('BOGO') ? 50 :
                     (promoType ?? '').match(/\d+/) ? parseInt((promoType ?? '').match(/\d+/)![0]) : 10;
    setEditForm({
      promo_type: promoType,
      discount,
      expected_lift: Math.round(getExpectedLift(promoType, discount)),
    });
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100">
            <Calendar size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Promo Calendar
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              12-week promotional planning view
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#3B82F6' }} />
            Flat Discount
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#8B5CF6' }} />
            BOGO
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }} />
            Bundle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }} />
            Cashback
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#14B8A6' }} />
            Combo
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border-subtle)] min-w-[120px]">
                Category
              </th>
              {(weeks ?? []).map((week, index) => (
                <th
                  key={week}
                  className={`p-2 text-center text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border-subtle)] min-w-[70px] ${
                    index === 0 ? 'bg-indigo-50' : ''
                  }`}
                >
                  {(week ?? '').replace(' (', '\n(').split('\n')[0]}
                  <div className="text-[10px] text-[var(--text-tertiary)] font-normal">
                    {(week ?? '').match(/\(([^)]+)\)/)?.[1]}
                  </div>
                </th>
              ))}
              <th className="p-2 text-center text-xs font-medium text-[var(--text-secondary)] border-b border-[var(--border-subtle)] min-w-[60px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {(categories ?? []).map((category) => (
              <tr key={category} className="hover:bg-[var(--bg-secondary)]">
                <td className="p-2 text-sm font-medium text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  {category}
                </td>
                {(weeks ?? []).map((week, weekIndex) => {
                  const cell = mergedData[category][week];
                  const isEditing = editingCell?.category === category && editingCell?.week === week;
                  const color = getPromoColor(cell.promo_type);

                  return (
                    <td
                      key={week}
                      className={`p-1 border-b border-[var(--border-subtle)] relative ${
                        weekIndex === 0 ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <button
                        onClick={() => handleCellClick(category, week)}
                        className={`w-full h-10 rounded flex items-center justify-center text-xs font-medium transition-all ${
                          cell.active
                            ? 'text-white shadow-sm hover:opacity-90'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)]'
                        }`}
                        style={cell.active ? { backgroundColor: color } : undefined}
                      >
                        {cell.active ? (
                          <div className="text-center">
                            <div className="text-[10px] opacity-90 truncate px-1">
                              {cell.promo_type?.includes('%')
                                ? cell.promo_type
                                : cell.discount
                                  ? `${cell.discount}%`
                                  : cell.promo_type}
                            </div>
                            {cell.expected_lift && (
                              <div className="text-[9px] opacity-75">
                                +{cell.expected_lift}% lift
                              </div>
                            )}
                          </div>
                        ) : (
                          <Plus size={14} />
                        )}
                      </button>

                      {/* Edit Popover */}
                      {isEditing && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setEditingCell(null)}
                          />
                          <div className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-lg shadow-xl border border-[var(--border-default)] p-3 w-56">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-[var(--text-primary)]">
                                {cell.active ? 'Edit Promo' : 'Plan Promo'}
                              </span>
                              <button
                                onClick={() => setEditingCell(null)}
                                className="p-1 hover:bg-[var(--bg-secondary)] rounded"
                              >
                                <X size={14} className="text-[var(--text-tertiary)]" />
                              </button>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs text-[var(--text-tertiary)] mb-1">
                                  Promo Type
                                </label>
                                <select
                                  value={editForm.promo_type}
                                  onChange={(e) => handlePromoTypeChange(e.target.value)}
                                  className="w-full px-2 py-1.5 border border-[var(--border-default)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                                >
                                  {PROMO_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                      {type.value}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs text-[var(--text-tertiary)] mb-1">
                                  Discount %
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={editForm.discount}
                                    onChange={(e) => {
                                      const discount = parseInt(e.target.value) || 0;
                                      setEditForm({
                                        ...editForm,
                                        discount,
                                        expected_lift: Math.round(getExpectedLift(editForm.promo_type, discount)),
                                      });
                                    }}
                                    className="w-full px-2 py-1.5 border border-[var(--border-default)] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                                  />
                                  <Percent size={14} className="text-[var(--text-tertiary)]" />
                                </div>
                              </div>

                              <div className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded">
                                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                                  <TrendingUp size={14} className="text-green-500" />
                                  Expected Lift
                                </div>
                                <span className="text-sm font-medium text-green-600">
                                  +{editForm.expected_lift}%
                                </span>
                              </div>

                              <div className="flex gap-2 pt-1">
                                {cell.active && (
                                  <button
                                    onClick={handleDelete}
                                    className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                                  >
                                    Remove
                                  </button>
                                )}
                                <button
                                  onClick={handleSave}
                                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[var(--accent-primary)] rounded hover:bg-[var(--accent-primary-dark)] transition-colors"
                                >
                                  <Save size={12} />
                                  Save
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </td>
                  );
                })}
                <td className="p-2 text-center text-sm font-medium text-[var(--text-primary)] border-b border-[var(--border-subtle)]">
                  {promoCounts[category]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-tertiary)]">
        <span>Click any cell to plan or edit a promotion. Changes are saved locally.</span>
        <span className="flex items-center gap-1">
          <div className="w-4 h-4 bg-indigo-50 rounded" />
          Current week (W1)
        </span>
      </div>
    </div>
  );
}
