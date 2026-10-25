'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon, MessageSquare } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-wa-light-bg dark:bg-wa-dark-bg p-4 relative transition-colors duration-200">
      {/* Decorative WhatsApp Top Green Bar on larger screens */}
      <div className="hidden sm:block absolute top-0 left-0 right-0 h-32 bg-wa-green dark:bg-wa-green-dark z-0" />

      {/* Theme Switcher Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-white/20 sm:bg-white/30 dark:bg-black/30 text-white sm:text-white dark:text-wa-dark-text-primary backdrop-blur-sm hover:scale-105 transition-all focus:outline-none"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Auth Card Container */}
      <div className="w-full max-w-md z-10 my-auto">
        {/* Brand Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-wa-green flex items-center justify-center shadow-lg mb-3">
            <MessageSquare className="w-8 h-8 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-wa-light-text-primary dark:text-wa-dark-text-primary sm:text-white sm:dark:text-white">
            WebChat
          </h1>
          <p className="text-xs sm:text-sm text-wa-light-text-secondary dark:text-wa-dark-text-secondary sm:text-white/80 mt-1">
            Simple, reliable, private messaging and HD audio calls
          </p>
        </div>

        {/* Card Body */}
        <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-wa-light-border dark:border-wa-dark-border rounded-2xl shadow-xl p-6 sm:p-8 transition-colors">
          {children}
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
          <span>Protected by end-to-end authentication • $0 / mo zero cost</span>
        </div>
      </div>
    </div>
  );
}
