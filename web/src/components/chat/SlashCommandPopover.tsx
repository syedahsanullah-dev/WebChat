'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal, Clock, BarChart2, Megaphone, HelpCircle } from 'lucide-react';
import { AVAILABLE_COMMANDS } from '@/lib/slashCommandParser';
import { SlashCommandDefinition } from '@shared/types';
import { cn } from '@/lib/utils';

interface SlashCommandPopoverProps {
  query: string;
  selectedIndex: number;
  onSelectCommand: (command: SlashCommandDefinition) => void;
  onClose: () => void;
}

export default function SlashCommandPopover({
  query,
  selectedIndex,
  onSelectCommand,
  onClose,
}: SlashCommandPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter commands matching current query after '/'
  const searchFilter = query.slice(1).toLowerCase();
  const filteredCommands = AVAILABLE_COMMANDS.filter(
    (c) =>
      c.command.toLowerCase().includes(searchFilter) ||
      c.description.toLowerCase().includes(searchFilter)
  );

  const getIcon = (cmd: string) => {
    switch (cmd) {
      case '/poll':
        return <BarChart2 className="w-4 h-4 text-amber-500" />;
      case '/remind':
        return <Clock className="w-4 h-4 text-emerald-500" />;
      case '/announce':
        return <Megaphone className="w-4 h-4 text-indigo-500" />;
      case '/help':
      default:
        return <HelpCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  useEffect(() => {
    // Scroll selected item into view if necessary
    if (containerRef.current) {
      const activeEl = containerRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (filteredCommands.length === 0) {
    return (
      <div className="absolute bottom-full mb-2 left-2 right-2 sm:left-4 sm:right-auto sm:w-80 bg-wa-light-sidebar-bg dark:bg-wa-dark-sidebar-bg border border-wa-light-border dark:border-wa-dark-border rounded-lg shadow-xl p-3 z-40 text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary select-none">
        <div className="flex items-center gap-1.5 text-wa-light-text-muted dark:text-wa-dark-text-muted">
          <Terminal className="w-3.5 h-3.5" />
          <span>No matching commands. Try /help</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full mb-2 left-2 right-2 sm:left-4 sm:right-auto sm:w-96 bg-wa-light-sidebar-bg dark:bg-wa-dark-sidebar-bg border border-wa-light-border dark:border-wa-dark-border rounded-lg shadow-xl overflow-hidden z-40 max-h-72 overflow-y-auto select-none py-1"
      role="listbox"
      aria-label="Slash Commands"
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-wa-light-text-muted dark:text-wa-dark-text-muted border-b border-wa-light-border dark:border-wa-dark-border flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Terminal className="w-3 h-3 text-wa-green" />
          Commands
        </span>
        <span className="text-[9px]">Tab or Enter to select</span>
      </div>

      {filteredCommands.map((item, idx) => {
        const isSelected = idx === selectedIndex % filteredCommands.length;
        return (
          <button
            key={item.command}
            type="button"
            onClick={() => onSelectCommand(item)}
            className={cn(
              'w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors cursor-pointer',
              isSelected
                ? 'bg-wa-light-hover dark:bg-wa-dark-hover border-l-2 border-wa-green'
                : 'hover:bg-wa-light-hover/60 dark:hover:bg-wa-dark-hover/60 border-l-2 border-transparent'
            )}
            role="option"
            aria-selected={isSelected}
          >
            <div className="p-1 rounded bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg shrink-0 mt-0.5">
              {getIcon(item.command)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                  {item.command}
                </span>
                <span className="text-[10px] font-mono text-wa-light-text-muted dark:text-wa-dark-text-muted truncate">
                  {item.syntax.replace(item.command, '').trim()}
                </span>
              </div>
              <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary line-clamp-1 mt-0.5">
                {item.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
