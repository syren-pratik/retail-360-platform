'use client';

import { useState, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel';
import KeyboardShortcuts from '@/app/components/ui/KeyboardShortcuts';
import { DashboardProvider } from '@/app/context/DashboardContext';

interface LayoutShellProps {
  children: React.ReactNode;
}

export default function LayoutShell({ children }: LayoutShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);

  // Global export handler for keyboard shortcut
  const handleGlobalExport = useCallback(() => {
    // Try to find customer data table and export it
    const tableSection = document.getElementById('section-customer-table');
    if (tableSection) {
      toast.info('Use the Export button on the customer table or charts to export data');
    } else {
      toast.info('Navigate to a dashboard to export data');
    }
  }, []);

  return (
    <DashboardProvider>
      <div className="min-h-screen bg-[var(--bg-secondary)]">
        {/* Keyboard shortcuts handler */}
        <KeyboardShortcuts onExport={handleGlobalExport} />

        {/* Left Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Content */}
        <main
          className={`transition-all duration-300 ${
            sidebarCollapsed ? 'ml-16' : 'ml-60'
          } ${chatOpen ? 'mr-[380px]' : 'mr-0'}`}
        >
          {children}
        </main>

        {/* Right Chat Panel */}
        <ChatPanel
          isOpen={chatOpen}
          onToggle={() => setChatOpen(!chatOpen)}
        />

        {/* Toast notifications */}
        <Toaster position="bottom-right" richColors />
      </div>
    </DashboardProvider>
  );
}
