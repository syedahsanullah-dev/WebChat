'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface HeaderProps {
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export default function Header({
  leftContent,
  rightContent,
  children,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'h-14 sm:h-16 min-h-[56px] sm:min-h-[64px] px-3 sm:px-4 py-2 bg-wa-light-header dark:bg-wa-dark-header border-b border-wa-light-border dark:border-wa-dark-border flex items-center justify-between flex-shrink-0 sticky top-0 w-full z-10 transition-colors',
        className
      )}
    >
      {children ? (
        children
      ) : (
        <>
          <div className="flex items-center gap-3 min-w-0">{leftContent}</div>
          <div className="flex items-center gap-2">{rightContent}</div>
        </>
      )}
    </header>
  );
}
