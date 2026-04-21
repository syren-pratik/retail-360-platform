'use client';

import { MapPin, Filter, User, BarChart3, DollarSign, TrendingUp } from 'lucide-react';

export interface ContextCardData {
  type: 'page' | 'filter' | 'customer';
  title: string;
  subtitle?: string;
  suggestions: { label: string; prompt: string }[];
}

interface ContextCardProps {
  data: ContextCardData;
  onSuggestionClick: (prompt: string) => void;
}

const contextIcons = {
  page: MapPin,
  filter: Filter,
  customer: User,
};

// Icons for module context (reserved for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _moduleIcons: Record<string, React.ElementType> = {
  cx360: BarChart3,
  price: DollarSign,
  demand: TrendingUp,
};

export default function ContextCard({ data, onSuggestionClick }: ContextCardProps) {
  const Icon = contextIcons[data.type];

  return (
    <div className="bg-gradient-to-r from-[var(--bg-secondary)] to-white border border-[var(--border-subtle)] rounded-lg p-3 my-2">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-[var(--text-tertiary)]" />
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          {data.title}
        </span>
      </div>

      {data.subtitle && (
        <div className="text-[10px] text-[var(--text-tertiary)] mb-2">
          {data.subtitle}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {data.suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion.prompt)}
            className="text-[11px] px-2.5 py-1 rounded-md
                       bg-white border border-[var(--border-default)]
                       text-[var(--text-secondary)]
                       hover:bg-[var(--accent-primary-light)] hover:border-[var(--accent-primary)]
                       hover:text-[var(--accent-primary)] transition-all"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Helper to generate context cards based on navigation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getContextForPage(pathname: string, _module?: string): ContextCardData | null {
  if ((pathname ?? '').startsWith('/price')) {
    return {
      type: 'page',
      title: "You're viewing Price Intelligence",
      suggestions: [
        { label: 'Revenue impact summary', prompt: 'What is the total revenue impact of price recommendations?' },
        { label: 'Pricing opportunities', prompt: 'Which products have the biggest pricing opportunities?' },
        { label: 'Promo ROI analysis', prompt: 'What is the ROI by promo type?' },
      ],
    };
  }

  if ((pathname ?? '').startsWith('/demand')) {
    return {
      type: 'page',
      title: "You're viewing Demand Forecasting",
      suggestions: [
        { label: 'Forecast accuracy', prompt: 'What is the forecast accuracy by department?' },
        { label: 'Lost sales analysis', prompt: 'Which SKUs have the most lost sales?' },
        { label: 'Demand drivers', prompt: 'What features are most important for demand prediction?' },
      ],
    };
  }

  if ((pathname ?? '').includes('/customer/')) {
    const customerId = (pathname ?? '').split('/customer/')[1];
    return {
      type: 'customer',
      title: `Viewing: ${customerId}`,
      suggestions: [
        { label: 'Run NBA', prompt: `What are the next best actions for customer ${customerId}?` },
        { label: 'Similar customers', prompt: `Show me customers similar to ${customerId}` },
        { label: 'Purchase pattern', prompt: `What is the purchase pattern for ${customerId}?` },
      ],
    };
  }

  if (pathname === '/cx360' || pathname === '/') {
    return {
      type: 'page',
      title: "You're viewing CX360 Dashboard",
      suggestions: [
        { label: 'Churn overview', prompt: 'Show me churn rate by segment' },
        { label: 'High-value at risk', prompt: 'Which high-value customers are at risk of churning?' },
        { label: 'CLV distribution', prompt: 'What is the CLV distribution across tiers?' },
      ],
    };
  }

  return null;
}

export function getContextForFilter(filterType: string, value: string): ContextCardData {
  return {
    type: 'filter',
    title: `Filtered to: ${value}`,
    subtitle: `Viewing ${filterType} = ${value}`,
    suggestions: [
      { label: `${value} insights`, prompt: `What are the key insights for ${value}?` },
      { label: `${value} trends`, prompt: `Show me the trend for ${value}` },
      { label: 'Compare to others', prompt: `Compare ${value} to other ${filterType}s` },
    ],
  };
}
