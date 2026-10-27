'use client';

import React from 'react';
import { ShieldAlert, LogOut, Clock } from 'lucide-react';
import { format } from 'date-fns';

export interface AccountSuspendedModalProps {
  isOpen: boolean;
  reason?: string | null;
  suspendedUntil?: string | Date | null;
  isPermanent?: boolean;
  onLogout?: () => void;
}

export default function AccountSuspendedModal({
  isOpen,
  reason,
  suspendedUntil,
  isPermanent = false,
  onLogout,
}: AccountSuspendedModalProps) {
  if (!isOpen) return null;

  const handleLogout = async () => {
    try {
      if (onLogout) {
        onLogout();
      } else {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/login';
        }
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const untilDate = suspendedUntil ? new Date(suspendedUntil) : null;
  const isExpired = untilDate && !isNaN(untilDate.getTime()) && untilDate <= new Date();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none"
    >
      <div className="w-full max-w-md bg-wa-light-sidebar dark:bg-[#111b21] rounded-2xl shadow-2xl border border-rose-500/30 overflow-hidden flex flex-col p-6 text-center">
        {/* Shield Alert Icon Banner */}
        <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
        </div>

        <h2 className="text-xl font-bold text-wa-light-text-primary dark:text-white mb-2">
          Your Account Has Been Suspended
        </h2>

        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary leading-relaxed mb-5">
          An administrator has placed moderation restrictions on your account due to a violation of our
          enterprise communication guidelines.
        </p>

        {/* Reason Card */}
        <div className="w-full p-4 rounded-xl bg-black/5 dark:bg-[#182229] border border-black/10 dark:border-white/5 text-left mb-4 space-y-2">
          <div>
            <span className="text-[11px] font-semibold text-wa-light-text-muted dark:text-wa-dark-text-muted uppercase tracking-wider">
              Reason
            </span>
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400 mt-0.5">
              {reason || 'Violation of acceptable use policy.'}
            </p>
          </div>

          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
            <span className="text-wa-light-text-muted dark:text-wa-dark-text-muted flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Duration:
            </span>
            <span className="font-semibold text-wa-light-text-primary dark:text-white">
              {isPermanent || !untilDate
                ? 'Permanent Ban'
                : isExpired
                ? 'Expired (Log in again)'
                : `Until ${format(untilDate, 'PPp')}`}
            </span>
          </div>
        </div>

        {/* Mandatory Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
}
