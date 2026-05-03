import { InventoryProvider } from '@/app/context/InventoryContext';

export default function DemandLayout({ children }: { children: React.ReactNode }) {
  return <InventoryProvider>{children}</InventoryProvider>;
}
