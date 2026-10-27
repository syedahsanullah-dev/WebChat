'use client';

import React from 'react';
import { getLanguageDisplayLabel } from '@/lib/markdownParser';
import { cn } from '@/lib/utils';

export interface LanguageBadgeProps {
  language: string;
  className?: string;
}

export default function LanguageBadge({ language, className }: LanguageBadgeProps) {
  const displayLabel = getLanguageDisplayLabel(language);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium tracking-wide uppercase',
        'bg-[#202c33] text-[#8696a0] border border-[#2a3942]',
        className
      )}
      title={`Language: ${displayLabel}`}
    >
      {displayLabel}
    </span>
  );
}
