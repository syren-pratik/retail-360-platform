import { Suspense } from 'react';
import PriceIntelShell from './PriceIntelShell';

export default function PriceIntelPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[60vh] gap-3">
        <div className="animate-spin w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
        <span className="text-sm text-[var(--text-secondary)]">Loading Price Intel…</span>
      </div>
    }>
      <PriceIntelShell />
    </Suspense>
  );
}
