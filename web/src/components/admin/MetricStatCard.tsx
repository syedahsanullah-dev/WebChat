'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'info' | 'danger' | 'neutral';
  };
  trend?: {
    value: string;
    label?: string;
    isPositive?: boolean;
  };
  className?: string;
  loading?: boolean;
  iconBgColor?: string;
  iconColor?: string;
}

export default function MetricStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
  className,
  loading = false,
  iconBgColor = 'bg-[#00a884]/10 dark:bg-[#00a884]/20',
  iconColor = 'text-[#00a884]',
}: MetricStatCardProps) {
  const badgeVariantStyles = {
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20',
    info: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20',
    neutral: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/20',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            {title}
          </p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-200 dark:bg-white/10 rounded-md animate-pulse mt-1" />
          ) : (
            <h3 className="text-2xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary tracking-tight">
              {value}
            </h3>
          )}
        </div>

        <div className={cn('p-2.5 rounded-xl flex items-center justify-center flex-shrink-0', iconBgColor)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-[#f0f2f5] dark:border-white/5">
        {subtitle && (
          <span className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted truncate">
            {subtitle}
          </span>
        )}

        {badge && (
          <span
            className={cn(
              'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border',
              badgeVariantStyles[badge.variant || 'neutral']
            )}
          >
            {badge.text}
          </span>
        )}

        {trend && (
          <div className="flex items-center gap-1 text-[11px] font-medium ml-auto">
            <span
              className={cn(
                'font-semibold',
                trend.isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              )}
            >
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-wa-light-text-muted dark:text-wa-dark-text-muted text-[10px]">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
