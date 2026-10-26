'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SystemMessageBubbleProps {
  id: string;
  content: string;
  createdAt?: string | Date;
  className?: string;
}

export default function SystemMessageBubble({
  content,
  className,
}: SystemMessageBubbleProps) {
  return (
    <div className={cn('flex justify-center my-2 select-none w-full', className)}>
      <div className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg bg-wa-light-header/90 dark:bg-wa-dark-header/90 text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary shadow-xs max-w-md text-center leading-relaxed border border-black/5 dark:border-white/5">
        <span>{content}</span>
      </div>
    </div>
  );
}
