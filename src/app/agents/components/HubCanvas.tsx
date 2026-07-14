'use client';

import AskCanvas from '@/app/ask/components/AskCanvas';
import type { UIComponentType } from '@/app/lib/types';

interface HubCanvasProps {
  components: UIComponentType[];
  loading?: boolean;
}

export default function HubCanvas({ components, loading }: HubCanvasProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse p-2">
        <div className="h-28 bg-[var(--bg-secondary)] rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-[var(--bg-secondary)] rounded-lg" />
          ))}
        </div>
        <div className="h-48 bg-[var(--bg-secondary)] rounded-xl" />
      </div>
    );
  }
  return <AskCanvas components={components} />;
}
