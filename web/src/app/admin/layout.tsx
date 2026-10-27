'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { ShieldAlert, Activity, Clock, RefreshCw, Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [serverTime, setServerTime] = useState<string>('');

  // Live Server Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setServerTime(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Access Control Guard
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.systemRole === 'USER' || !user.systemRole) {
        router.push('/chat');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-wa-light-bg dark:bg-wa-dark-bg text-wa-light-text-primary dark:text-wa-dark-text-primary">
        <Loader2 className="w-8 h-8 text-[#00a884] animate-spin mb-3" />
        <p className="text-xs font-semibold tracking-wide uppercase text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
          Verifying administrative credentials...
        </p>
      </div>
    );
  }

  if (!user || user.systemRole === 'USER' || !user.systemRole) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-wa-light-bg dark:bg-wa-dark-bg text-wa-light-text-primary dark:text-wa-dark-text-primary">
      {/* Fixed Admin Sidebar */}
      <AdminSidebar />

      {/* Main Content Area with Top Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-[#e9edef] dark:border-white/10 bg-white/80 dark:bg-[#111b21]/80 backdrop-blur-md px-6 flex items-center justify-between gap-4 flex-shrink-0 z-10">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              All Systems Operational
            </span>
            <span className="hidden sm:inline text-wa-light-text-muted dark:text-wa-dark-text-muted text-xs">
              &bull; Node.js High-Performance Server
            </span>
          </div>

          {/* Right Controls: Clock & Status */}
          <div className="flex items-center gap-4 text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-wa-light-text-muted" />
              <span>{serverTime || 'Synchronizing...'}</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Production Active</span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
