'use client';

import React, { useMemo } from 'react';
import CodeBlockBubble from './CodeBlockBubble';
import { parseMarkdownSegments, MessageContentSegment } from '@/lib/markdownParser';

export interface MessageTextRendererProps {
  content: string;
  searchQuery?: string;
  className?: string;
}

export default function MessageTextRenderer({
  content,
  searchQuery,
  className,
}: MessageTextRendererProps) {
  // Parse content into markdown segments (code blocks, inline code, text)
  const segments: MessageContentSegment[] = useMemo(
    () => parseMarkdownSegments(content),
    [content]
  );

  // Search keyword highlight helper
  const renderHighlightedText = (text: string, query?: string) => {
    if (!query || !query.trim() || !text) return text;
    const parts = text.split(
      new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    );
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          className="bg-amber-300 dark:bg-amber-500 text-black rounded-xs px-0.5 font-medium"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'code_block') {
          return (
            <CodeBlockBubble
              key={idx}
              code={seg.code}
              language={seg.language}
            />
          );
        }

        if (seg.type === 'inline_code') {
          return (
            <code
              key={idx}
              className="px-1.5 py-0.5 mx-0.5 rounded bg-black/10 dark:bg-[#182229] border border-black/5 dark:border-[#2a3942] font-mono text-xs text-[#00a884] dark:text-[#25d366]"
            >
              {seg.code}
            </code>
          );
        }

        // Standard text
        return (
          <span key={idx} className="whitespace-pre-wrap">
            {renderHighlightedText(seg.content, searchQuery)}
          </span>
        );
      })}
    </div>
  );
}
