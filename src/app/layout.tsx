import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import LayoutShell from './components/layout/LayoutShell';
import { TENANT_COOKIE, DEFAULT_TENANT, type Tenant } from './lib/tenant-constants';

export const metadata: Metadata = {
  title: 'Retail 360 - Customer Analytics Dashboard',
  description: 'Retail 360 analytics dashboard with AI-powered insights',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read tenant from cookie server-side so the first render is correct
  // (no client-hydrate flicker between india_grocery and us_apparel).
  const cookieStore = cookies();
  const raw = cookieStore.get(TENANT_COOKIE)?.value;
  const initialTenant: Tenant =
    raw === 'us_apparel' || raw === 'us_retail' || raw === 'india_grocery' ? raw : DEFAULT_TENANT;

  return (
    <html lang="en">
      <body className="antialiased">
        <LayoutShell initialTenant={initialTenant}>{children}</LayoutShell>
      </body>
    </html>
  );
}
