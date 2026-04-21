import { ReactNode } from 'react';
import { PriceProvider } from '@/app/context/PriceContext';

interface PriceLayoutProps {
  children: ReactNode;
}

export default function PriceLayout({ children }: PriceLayoutProps) {
  return <PriceProvider>{children}</PriceProvider>;
}
