'use client';

import React, { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export default function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Search or start new chat',
  className,
  autoFocus = false,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Global shortcut: Ctrl + / or Cmd + / immediately focuses and selects the input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleClear = () => {
    onChange('');
    if (onClear) {
      onClear();
    }
    inputRef.current?.focus();
  };

  return (
    <div
      className={cn(
        'relative flex items-center w-full bg-wa-light-input dark:bg-wa-dark-input rounded-lg transition-colors px-3 py-1.5 focus-within:ring-1 focus-within:ring-wa-green',
        className
      )}
    >
      <Search
        className="w-4 h-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary flex-shrink-0 mr-3 pointer-events-none"
        aria-hidden="true"
      />

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-transparent text-base sm:text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted dark:placeholder:text-wa-dark-text-muted focus:outline-none"
        aria-label={placeholder}
      />

      {value ? (
        <button
          type="button"
          onClick={handleClear}
          className="p-1.5 sm:p-1 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-sans font-medium text-wa-light-text-muted dark:text-wa-dark-text-muted bg-black/5 dark:bg-white/5 rounded border border-wa-light-border dark:border-wa-dark-border select-none pointer-events-none">
          <span className="text-xs">Ctrl</span> /
        </kbd>
      )}
    </div>
  );
}
