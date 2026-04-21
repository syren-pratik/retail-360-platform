'use client';

import { DemandProvider } from '@/app/context/DemandContext';
import DemandDashboardContent from './components/DemandDashboardContent';

export default function DemandPage() {
  return (
    <DemandProvider>
      <DemandDashboardContent />
    </DemandProvider>
  );
}
