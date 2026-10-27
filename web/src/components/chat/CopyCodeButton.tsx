'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CopyCodeButtonProps {
  code: string;
  className?: string;
}

export default function CopyCodeButton({ code, className }: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!code) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[CopyCodeButton] Clipboard write error:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors select-none cursor-pointer',
        copied
          ? 'text-[#00a884] bg-[#00a884]/15'
          : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-white/5',
        className
      )}
      title="Copy code to clipboard"
      aria-label="Copy code"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-[#00a884]" />
          <span className="text-[#00a884]">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}
