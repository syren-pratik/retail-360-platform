import { InventoryProvider } from '@/app/context/InventoryContext';

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InventoryProvider>{children}</InventoryProvider>;
}
