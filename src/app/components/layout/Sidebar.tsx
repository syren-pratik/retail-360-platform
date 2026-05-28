'use client';

import { BarChart3, Package2, DollarSign, TrendingUp, Settings, ChevronLeft, ChevronRight, ShoppingBag, Snowflake, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  enabled: boolean;
  children?: { name: string; href: string; icon: React.ElementType; enabled: boolean }[];
}

const navItems: NavItem[] = [
  { name: 'Customer 360',           href: '/cx360',      icon: BarChart3,   enabled: true },
  { name: 'Inventory Intelligence', href: '/inventory',  icon: Package2,    enabled: true },
  {
    name: 'Forecasting',
    href: '/merchandise',
    icon: ShoppingBag,
    enabled: true,
    children: [
      { name: 'Demand',      href: '/merchandise/demand',      icon: TrendingUp, enabled: true },
      { name: 'Cold-Start',  href: '/merchandise/cold-start',  icon: Snowflake,  enabled: true },
    ],
  },
  { name: 'Price Intelligence', href: '/price', icon: DollarSign, enabled: true },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const isMerchActive = pathname.startsWith('/merchandise');
  const [merchExpanded, setMerchExpanded] = useState(isMerchActive);

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
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const hasChildren = !!item.children?.length;
            const isActive = !hasChildren && (pathname === item.href || pathname.startsWith(item.href + '/'));
            const isParentActive = hasChildren && pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            if (hasChildren) {
              return (
                <li key={item.name}>
                  {/* Parent row */}
                  <div className="relative">
                    {isParentActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-[var(--accent-primary)] rounded-r-full" />
                    )}
                    <button
                      onClick={() => !collapsed && setMerchExpanded((prev) => !prev)}
                      className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-[calc(100%-16px)] ${
                        isParentActive
                          ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon size={20} className="flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.name}</span>
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${merchExpanded ? 'rotate-180' : ''}`}
                          />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Children */}
                  {!collapsed && merchExpanded && (
                    <ul className="mt-1 ml-4 space-y-1 border-l border-[var(--border-default)] pl-2">
                      {item.children!.map((child) => {
                        const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
                        const ChildIcon = child.icon;
                        return (
                          <li key={child.name} className="relative">
                            {childActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[var(--accent-primary)] rounded-r-full -ml-2" />
                            )}
                            <Link
                              href={child.href}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                                childActive
                                  ? 'bg-[var(--accent-primary-light)] text-[var(--accent-primary)]'
                                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                              }`}
                            >
                              <ChildIcon size={14} />
                              <span>{child.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            }

            // Regular item
            return (
              <li key={item.name} className="relative">
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
