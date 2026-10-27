'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import RoleBadge from './RoleBadge';
import Avatar from '@/components/ui/Avatar';
import {
  LayoutDashboard,
  Users,
  HardDrive,
  ShieldAlert,
  FileText,
  Megaphone,
  ShieldCheck,
  ArrowLeft,
  Server,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    {
      label: 'Overview',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: 'User Directory',
      href: '/admin/users',
      icon: Users,
      exact: false,
    },
    {
      label: 'Storage Governance',
      href: '/admin/storage',
      icon: HardDrive,
      exact: false,
    },
    {
      label: 'Abuse Moderation',
      href: '/admin/moderation',
      icon: ShieldAlert,
      exact: false,
      badge: 'Phase 33',
    },
    {
      label: 'Audit Logging',
      href: '/admin/audit',
      icon: FileText,
      exact: false,
      badge: 'Phase 27',
    },
    {
      label: 'Global Broadcasts',
      href: '/admin/broadcasts',
      icon: Megaphone,
      exact: false,
      badge: 'Phase 35',
    },
    {
      label: 'DLP Scanner',
      href: '/admin/dlp',
      icon: ShieldCheck,
      exact: false,
      badge: 'Phase 34',
    },
    {
      label: 'Maintenance & Backups',
      href: '/admin/maintenance',
      icon: Wrench,
      exact: false,
      badge: 'Phase 36',
    },
  ];

  return (
    <aside className="w-64 bg-wa-light-sidebar dark:bg-wa-dark-sidebar border-r border-[#e9edef] dark:border-white/10 flex flex-col h-full select-none flex-shrink-0 transition-colors">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#e9edef] dark:border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#00a884] flex items-center justify-center text-white shadow-xs">
          <Server className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary leading-tight truncate">
            WebChat Admin
          </h1>
          <span className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            Enterprise Console
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group',
                isActive
                  ? 'bg-[#00a884] text-white shadow-xs font-semibold'
                  : 'text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-wa-light-text-muted dark:text-wa-dark-text-muted group-hover:text-current')} />
                <span>{item.label}</span>
              </div>
              {item.badge && !isActive && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-black/5 dark:bg-white/10 text-wa-light-text-muted dark:text-wa-dark-text-muted">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer Card & Exit Link */}
      <div className="p-3 border-t border-[#e9edef] dark:border-white/10 space-y-2 bg-wa-light-header/40 dark:bg-wa-dark-header/40">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <Avatar
            name={user?.displayName || 'Admin'}
            src={user?.avatarUrl}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
              {user?.displayName || 'Admin'}
            </div>
            <div className="mt-0.5">
              <RoleBadge role={user?.systemRole || 'ADMIN'} size="sm" />
            </div>
          </div>
        </div>

        <Link
          href="/chat"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs text-wa-light-text-primary dark:text-wa-dark-text-primary font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to WebChat</span>
        </Link>
      </div>
    </aside>
  );
}
