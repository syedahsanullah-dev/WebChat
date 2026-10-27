'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wrench, ShieldAlert, RefreshCw, Clock, ArrowRight, Lock } from 'lucide-react';
import { MaintenanceState } from '@shared/types';

export default function MaintenancePage() {
  const router = useRouter();
  const [status, setStatus] = useState<MaintenanceState | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/maintenance/status');
      if (res.ok) {
        const data: MaintenanceState = await res.json();
        setStatus(data);
        if (!data.enabled) {
          // Maintenance mode turned off, redirect user back to app
          router.push('/chat');
        }
      }
    } catch (err) {
      console.error('Failed to fetch maintenance status:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Update countdown timer every second
  useEffect(() => {
    if (!status?.estimatedEnd) {
      setTimeLeft(null);
      return;
    }

    const targetDate = new Date(status.estimatedEnd).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [status?.estimatedEnd]);

  return (
    <div className="min-h-screen bg-[#111b21] flex flex-col items-center justify-center p-4 selection:bg-[#00a884]/30 selection:text-[#00a884]">
      {/* Background Decorative Rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00a884]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#202c33]/40 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg bg-[#202c33] border border-[#2a3942] rounded-2xl shadow-2xl p-8 sm:p-10 flex flex-col items-center text-center">
        {/* Animated Icon Avatar */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-[#00a884]/15 border border-[#00a884]/30 flex items-center justify-center text-[#00a884] shadow-inner">
            <Wrench className="w-10 h-10 animate-bounce duration-1000" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-[#e9edef] tracking-tight mb-2">
          Scheduled Maintenance
        </h1>
        <p className="text-[#8696a0] text-sm leading-relaxed mb-6 max-w-md">
          {status?.reason ||
            'WebChat is currently undergoing essential platform enhancements and database maintenance. We will be back online shortly.'}
        </p>

        {/* Countdown Box */}
        {timeLeft ? (
          <div className="w-full bg-[#111b21] border border-[#2a3942] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-[#00a884] font-medium mb-3">
              <Clock className="w-3.5 h-3.5" />
              <span>Estimated Resumption In</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center bg-[#202c33] border border-[#2a3942] rounded-lg py-2">
                <span className="text-2xl font-bold text-[#e9edef] tabular-nums">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-[#8696a0] uppercase tracking-wider mt-0.5">Hours</span>
              </div>
              <div className="flex flex-col items-center bg-[#202c33] border border-[#2a3942] rounded-lg py-2">
                <span className="text-2xl font-bold text-[#e9edef] tabular-nums">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-[#8696a0] uppercase tracking-wider mt-0.5">Minutes</span>
              </div>
              <div className="flex flex-col items-center bg-[#202c33] border border-[#2a3942] rounded-lg py-2">
                <span className="text-2xl font-bold text-[#e9edef] tabular-nums">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-[#8696a0] uppercase tracking-wider mt-0.5">Seconds</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full bg-[#111b21] border border-[#2a3942] rounded-xl p-4 mb-6 flex items-center justify-center gap-3 text-sm text-[#8696a0]">
            <Clock className="w-4 h-4 text-[#00a884]" />
            <span>Finalizing system upgrades and database integrity verification...</span>
          </div>
        )}

        {/* Refresh Action */}
        <button
          onClick={fetchStatus}
          disabled={isRefreshing}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00a884] hover:bg-[#02906f] active:bg-[#007f61] text-[#111b21] font-semibold text-sm transition-colors shadow-lg shadow-[#00a884]/20 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Checking Status...' : 'Check Status Now'}</span>
        </button>

        {/* Admin Login Bypass Link */}
        <div className="mt-8 pt-6 border-t border-[#2a3942] w-full flex items-center justify-between text-xs text-[#8696a0]">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#00a884]" />
            <span>Authorized Operations Only</span>
          </div>
          <Link
            href="/admin"
            className="text-[#00a884] hover:text-[#02906f] hover:underline flex items-center gap-1 font-medium transition-colors"
          >
            <span>Admin Console</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-6 text-center text-xs text-[#8696a0]">
        <span>WebChat • System Maintenance</span>
      </div>
    </div>
  );
}
