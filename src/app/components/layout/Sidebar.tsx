'use client';

import {
  BarChart3, Package2, DollarSign, TrendingUp, TrendingDown,
  Settings, ChevronLeft, ChevronRight, ShoppingBag, Snowflake,
  ChevronDown, Tag, LineChart, Bot, BarChart2, Building2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface ChildItem {
  name: string;
  href: string;
  icon: React.ElementType;
  enabled: boolean;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  enabled: boolean;
  children?: ChildItem[];
}

const navItems: NavItem[] = [
  { name: 'Customer 360',           href: '/cx360',     icon: BarChart3,  enabled: true },
  { name: 'Inventory Intelligence', href: '/inventory', icon: Package2,   enabled: true },
  {
    name: 'Demand Planning',
    href: '/merchandise',
    icon: ShoppingBag,
    enabled: true,
    children: [
      { name: 'Demand',         href: '/merchandise/demand',                       icon: TrendingUp, enabled: true },
      { name: 'Cold-Start',     href: '/merchandise/cold-start',                   icon: Snowflake,  enabled: true },
      { name: 'Store Opening',  href: '/merchandise/cold-start/store-opening',     icon: Building2,  enabled: true },
    ],
  },
  {
    name: 'Price Intelligence',
    href: '/price-intel',
    icon: DollarSign,
    enabled: true,
    children: [
      { name: 'Overview',            href: '/price-intel?tab=overview',   icon: BarChart2,    enabled: true },
      { name: 'Promotions',          href: '/price-intel?tab=promo',      icon: Tag,          enabled: true },
      { name: 'Markdown & Clearance',href: '/price-intel?tab=markdown',   icon: TrendingDown, enabled: true },
      { name: 'Forecasting',         href: '/price-intel?tab=forecasting',icon: LineChart,    enabled: true },
      { name: 'AI Agents',           href: '/price-intel?tab=agents',     icon: Bot,          enabled: true },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    'Demand Planning': pathname.startsWith('/merchandise'),
    'Price Intelligence': pathname === '/price-intel' || pathname.startsWith('/price-intel/'),
  }));

  function toggleGroup(name: string) {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  }

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-[var(--border-default)] flex flex-col transition-all duration-300 z-40 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border-default)]">
        {!collapsed && (
          <span className="text-lg font-semibold text-[var(--text-primary)]">Retail 360</span>
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
            const isActive    = !hasChildren && (pathname === item.href || pathname.startsWith(item.href + '/'));
            const isParentActive = hasChildren && (pathname === item.href || pathname.startsWith(item.href + '/'));
            const isExpanded  = expanded[item.name] ?? false;
            const Icon        = item.icon;

            if (hasChildren) {
              return (
                <li key={item.name}>
                  <div className="relative">
                    {isParentActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-[var(--accent-primary)] rounded-r-full" />
                    )}
                    <button
                      onClick={() => !collapsed && toggleGroup(item.name)}
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
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </>
                      )}
                    </button>
                  </div>

                  {!collapsed && isExpanded && (
                    <ul className="mt-1 ml-4 space-y-1 border-l border-[var(--border-default)] pl-2">
                      {item.children!.map((child) => {
                        // Only the most-specific child should highlight when paths overlap (e.g. /cold-start vs /cold-start/store-opening)
                        const siblingMoreSpecific = item.children!.some(
                          (other) => other.href !== child.href && (pathname === other.href || pathname.startsWith(other.href + '/')) && other.href.startsWith(child.href + '/'),
                        );
                        const childActive = !siblingMoreSpecific && (pathname === child.href || pathname.startsWith(child.href + '/'));
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
                        <span className="text-xs bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded">Soon</span>
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
