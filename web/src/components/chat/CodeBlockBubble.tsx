'use client';

import React, { useMemo } from 'react';
import LanguageBadge from '@/components/ui/LanguageBadge';
import CopyCodeButton from './CopyCodeButton';
import { highlightCode } from '@/lib/syntaxHighlighter';
import { cn } from '@/lib/utils';

export interface CodeBlockBubbleProps {
  code: string;
  language?: string;
  className?: string;
}

export default function CodeBlockBubble({
  code,
  language = 'text',
  className,
}: CodeBlockBubbleProps) {
  // Normalize and split into lines for line number gutter
  const cleanCode = code.replace(/\r\n/g, '\n').trimEnd();
  const lines = useMemo(() => cleanCode.split('\n'), [cleanCode]);

  // Syntax highlighted HTML via Prism.js
  const highlightedHtml = useMemo(
    () => highlightCode(cleanCode, language),
    [cleanCode, language]
  );

  return (
    <div
      className={cn(
        'w-full bg-[#182229] rounded-lg border border-[#2a3942] overflow-hidden my-1.5 shadow-sm text-left',
        className
      )}
    >
      {/* Top Header Bar */}
      <div className="h-9 px-3 bg-[#111b21] border-b border-[#2a3942] flex items-center justify-between gap-2 select-none">
        <LanguageBadge language={language} />
        <CopyCodeButton code={cleanCode} />
      </div>

      {/* Code Viewport with Line Numbers and Horizontal Scrolling */}
      <div className="flex font-mono text-xs sm:text-[13px] leading-relaxed p-3 overflow-x-auto custom-scrollbar">
        {/* Line Numbers Gutter */}
        <div
          className="select-none text-[#8696a0] opacity-60 text-right pr-3.5 border-r border-[#2a3942]/60 font-mono text-xs select-none shrink-0"
          aria-hidden="true"
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Highlighted Code Area */}
        <pre className="pl-3.5 m-0 font-mono text-[#e9edef] whitespace-pre flex-1 min-w-0">
          <code
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            className={`language-${language}`}
          />
        </pre>
      </div>
    </div>
  );
}
