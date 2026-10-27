'use client';

import React from 'react';
import { Cpu, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MemoryMetricsCardProps {
  rssMB: number;
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB?: number;
  maxMB?: number; // e.g. 1024 MB allocation
  loading?: boolean;
}

export default function MemoryMetricsCard({
  rssMB = 30,
  heapUsedMB = 18,
  heapTotalMB = 24,
  externalMB,
  maxMB = 1024,
  loading = false,
}: MemoryMetricsCardProps) {
  // Determine severity tier based on rssMB:
  // Green: < 60 MB (Optimal Fastify efficiency)
  // Yellow: 60 - 100 MB (Moderate load)
  // Red: > 100 MB (High memory alert)
  const isOptimal = rssMB < 60;
  const isModerate = rssMB >= 60 && rssMB <= 100;
  const isHigh = rssMB > 100;

  const percentage = Math.min(Math.max(Math.round((rssMB / maxMB) * 100), 1), 100);

  const barColor = isOptimal
    ? 'bg-emerald-500'
    : isModerate
    ? 'bg-amber-500'
    : 'bg-rose-500';

  const statusBadge = isOptimal ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Ultra Low Footprint
    </span>
  ) : isModerate ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
      Moderate Load
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
      High Memory Usage
    </span>
  );

  return (
    <div className="rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] p-5 shadow-xs transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              Socket Server Memory
            </span>
            {statusBadge}
          </div>
          <h4 className="text-xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary mt-1">
            Fastify & Native ws Daemon
          </h4>
        </div>

        <div className="p-2.5 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
          <Cpu className="w-5 h-5" />
        </div>
      </div>

      {/* Main Metric & Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            {loading ? (
              <div className="h-9 w-20 bg-gray-200 dark:bg-white/10 rounded-md animate-pulse" />
            ) : (
              <span className="text-3xl font-extrabold text-wa-light-text-primary dark:text-wa-dark-text-primary tracking-tight">
                {rssMB} <span className="text-sm font-medium text-wa-light-text-muted dark:text-wa-dark-text-muted">MB RSS</span>
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-wa-light-text-muted dark:text-wa-dark-text-muted">
            {percentage}% of {maxMB} MB CloudLinux allocation
          </span>
        </div>

        {/* Multi-segment / Progress bar */}
        <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden relative">
          <div
            className={cn('h-full transition-all duration-700 rounded-full', barColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#f0f2f5] dark:border-white/5 text-center">
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-white/5">
            <span className="block text-[10px] uppercase font-semibold text-wa-light-text-muted dark:text-wa-dark-text-muted">
              Heap Used
            </span>
            <span className="text-sm font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {heapUsedMB} MB
            </span>
          </div>

          <div className="p-2 rounded-lg bg-gray-50 dark:bg-white/5">
            <span className="block text-[10px] uppercase font-semibold text-wa-light-text-muted dark:text-wa-dark-text-muted">
              Heap Total
            </span>
            <span className="text-sm font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {heapTotalMB} MB
            </span>
          </div>

          <div className="p-2 rounded-lg bg-gray-50 dark:bg-white/5">
            <span className="block text-[10px] uppercase font-semibold text-wa-light-text-muted dark:text-wa-dark-text-muted">
              External
            </span>
            <span className="text-sm font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {externalMB !== undefined ? `${externalMB} MB` : '~2 MB'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Tagline */}
      <div className="mt-4 flex items-center gap-1.5 text-xs text-[#00a884] dark:text-[#25d366] font-medium">
        <Zap className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Fastify 4+ & Native ws Daemon (~70% lower RAM than Socket.io)</span>
      </div>
    </div>
  );
}
