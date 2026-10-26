'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TypingDotsProps {
  className?: string;
  size?: 'sm' | 'md';
}

export default function TypingDots({ className, size = 'sm' }: TypingDotsProps) {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={cn('inline-flex items-center gap-1 py-0.5', className)}
      aria-label="typing"
      role="status"
    >
      <span
        className={cn(
          dotSize,
          'rounded-full bg-wa-green animate-bounce [animation-delay:-0.32s] [animation-duration:1s]'
        )}
      />
      <span
        className={cn(
          dotSize,
          'rounded-full bg-wa-green animate-bounce [animation-delay:-0.16s] [animation-duration:1s]'
        )}
      />
      <span
        className={cn(
          dotSize,
          'rounded-full bg-wa-green animate-bounce [animation-duration:1s]'
        )}
      />
    </span>
  );
}
