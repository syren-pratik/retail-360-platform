import type { Metadata } from 'next';
import './globals.css';
import LayoutShell from './components/layout/LayoutShell';

export const metadata: Metadata = {
  title: 'Retail 360 - Customer Analytics Dashboard',
  description: 'Retail 360 analytics dashboard with AI-powered insights',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
