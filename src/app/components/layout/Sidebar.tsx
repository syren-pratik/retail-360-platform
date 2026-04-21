'use client';

import { BarChart3, Package, DollarSign, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    name: 'CX360',
    href: '/cx360',
    icon: BarChart3,
    enabled: true,
  },
  // Demand Forecast hidden temporarily
  // {
  //   name: 'Demand Forecast',
  //   href: '/demand',
  //   icon: TrendingUp,
  //   enabled: true,
  // },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: Package,
    enabled: true,
  },
  {
    name: 'Price Intel',
    href: '/price',
    icon: DollarSign,
    enabled: true,
  },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-[var(--border-default)] flex flex-col transition-all duration-300 z-40 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo / App Name */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border-default)]">
        {!collapsed && (
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            Retail 360
          </span>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <li key={item.name} className="relative">
                {/* Active indicator - left border accent */}
                {isActive && item.enabled && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-[var(--accent-primary)] rounded-r-full" />
                )}
                {item.enabled ? (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon size={20} />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                ) : (
                  <div
                    className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-md text-sm font-medium text-[var(--text-tertiary)] cursor-not-allowed ${
                      collapsed ? 'justify-center' : ''
                    }`}
                  >
                    <Icon size={20} />
                    {!collapsed && (
                      <div className="flex items-center justify-between flex-1">
                        <span>{item.name}</span>
                        <span className="text-xs bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">
                          Soon
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Settings */}
      <div className="border-t border-[var(--border-default)] p-2">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] w-full transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Settings size={20} />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
