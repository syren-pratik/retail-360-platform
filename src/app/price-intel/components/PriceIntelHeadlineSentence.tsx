'use client';

import type { PriceIntelHeadline } from '@/app/lib/price-intel-types';

interface Props {
  headline: PriceIntelHeadline;
}

function renderWithHighlight(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /₹[\d,.]+(?:L|Cr)?/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={key++} style={{ color: '#fbbf24', fontStyle: 'italic' }}>
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function PriceIntelHeadlineSentence({ headline }: Props) {
  return (
    <div className="rounded-xl p-8 mb-6" style={{ backgroundColor: '#111827' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9ca3af' }}>
          {headline.week_label}
        </span>
        <span style={{ color: '#4b5563' }}>·</span>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9ca3af' }}>
          {headline.season_context}
        </span>
      </div>

      <h2 className="text-3xl font-semibold leading-tight mb-4" style={{ color: '#ffffff' }}>
        {renderWithHighlight(headline.sentence)}
      </h2>

      <p className="text-sm max-w-2xl" style={{ color: '#9ca3af' }}>
        {headline.supporting_line}
      </p>
    </div>
  );
}
