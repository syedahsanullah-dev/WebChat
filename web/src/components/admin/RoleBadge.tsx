'use client';

import React from 'react';
import { SystemRole } from '@shared/types';
import { ShieldCheck, Shield, Award, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RoleBadgeProps {
  role: SystemRole | string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function RoleBadge({ role, size = 'sm', className }: RoleBadgeProps) {
  const normalized = (role?.toUpperCase() || 'USER') as SystemRole;

  switch (normalized) {
    case 'SUPER_ADMIN':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-medium rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 select-none',
            size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
            className
          )}
        >
          <Award className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>Super Admin</span>
        </span>
      );

    case 'ADMIN':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-medium rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 select-none',
            size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
            className
          )}
        >
          <ShieldCheck className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>Admin</span>
        </span>
      );

    case 'MODERATOR':
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-medium rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 select-none',
            size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
            className
          )}
        >
          <Shield className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>Moderator</span>
        </span>
      );

    case 'USER':
    default:
      return (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-medium rounded-full bg-gray-500/15 text-gray-600 dark:text-gray-400 border border-gray-500/20 select-none',
            size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
            className
          )}
        >
          <UserIcon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
          <span>User</span>
        </span>
      );
  }
}
