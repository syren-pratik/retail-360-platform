'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { CustomerRecord } from '@/app/lib/types';
import { useFormatMoneyPlain } from '@/app/lib/format-money';

interface CustomerSearchProps {
  customers: CustomerRecord[];
}

const segmentColors: Record<string, string> = {
  'High-Value VIP': 'bg-purple-100 text-purple-700',
  'Loyal Active': 'bg-green-100 text-green-700',
  'Medium Risk': 'bg-amber-100 text-amber-700',
  'High Risk': 'bg-orange-100 text-orange-700',
  'New Customers': 'bg-blue-100 text-blue-700',
  'Churned': 'bg-red-100 text-red-700',
  'Low-Value': 'bg-gray-100 text-gray-700',
};

export default function CustomerSearch({ customers }: CustomerSearchProps) {
  const router = useRouter();
  const formatCurrency = useFormatMoneyPlain();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<CustomerRecord[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      const searchQuery = query.toLowerCase();
      const filtered = customers.filter((customer) =>
        customer.customer_id.toLowerCase().includes(searchQuery) ||
        customer.customer_segment.toLowerCase().includes(searchQuery) ||
        customer.loyalty_tier.toLowerCase().includes(searchQuery) ||
        customer.top_category.toLowerCase().includes(searchQuery)
      ).slice(0, 8);

      setResults(filtered);
      setIsOpen(filtered.length > 0);
      setSelectedIndex(-1);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, customers]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigateToCustomer = useCallback((customerId: string) => {
    setQuery('');
    setIsOpen(false);
    router.push(`/cx360/customer/${customerId}`);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        navigateToCustomer(results[selectedIndex].customer_id);
      } else if (query.trim()) {
        // Check for exact customer_id match
        const exactMatch = customers.find(
          (c) => c.customer_id.toLowerCase() === query.toLowerCase()
        );
        if (exactMatch) {
          navigateToCustomer(exactMatch.customer_id);
        }
        // Otherwise, the dropdown shows the filtered results
      }
    }
  };

  const clearSearch = () => {
    setQuery('');
    setIsOpen(false);
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex-1 min-w-[280px] max-w-xl">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
      />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search customers..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="input-base pl-9 pr-8 w-full"
      />
      {query && (
        <button
          onClick={clearSearch}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          <X size={14} />
        </button>
      )}

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border-default)] rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto"
        >
          {results.map((customer, index) => (
            <button
              key={customer.customer_id}
              onClick={() => navigateToCustomer(customer.customer_id)}
              className={`w-full text-left px-4 py-3 border-b border-[var(--border-subtle)] last:border-b-0 transition-colors ${
                index === selectedIndex
                  ? 'bg-[var(--bg-secondary)]'
                  : 'hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {customer.customer_id}
                </span>
                <span className="text-sm font-medium text-[var(--positive)]">
                  {formatCurrency(customer.clv_12m)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    segmentColors[customer.customer_segment] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {customer.customer_segment}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {customer.loyalty_tier}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  • {customer.top_category}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {isOpen && query.trim() && results.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border-default)] rounded-lg shadow-lg z-50 px-4 py-3"
        >
          <p className="text-sm text-[var(--text-secondary)]">
            No customers found for &ldquo;{query}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
