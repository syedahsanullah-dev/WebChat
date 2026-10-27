'use client';

import React from 'react';
import { HardDrive, Image as ImageIcon, Mic, FileText, User } from 'lucide-react';
import { StorageAnalyticsPayload } from '@shared/types';
import { cn } from '@/lib/utils';

export interface StorageBreakdownCardProps {
  data?: StorageAnalyticsPayload;
  loading?: boolean;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function StorageBreakdownCard({ data, loading = false }: StorageBreakdownCardProps) {
  const totalBytes = data?.totalBytes || 0;
  const totalFiles = data?.totalFiles || 0;
  const categories = data?.categories || {
    images: { bytes: 0, count: 0 },
    voice: { bytes: 0, count: 0 },
    docs: { bytes: 0, count: 0 },
    avatars: { bytes: 0, count: 0 },
  };

  const getPercent = (bytes: number) => {
    if (totalBytes === 0) return 0;
    return Math.round((bytes / totalBytes) * 100);
  };

  const categoryConfigs = [
    {
      key: 'images',
      label: 'Chat Images',
      icon: ImageIcon,
      color: 'bg-sky-500',
      textColor: 'text-sky-500',
      bgColor: 'bg-sky-500/10',
      bytes: categories.images.bytes,
      count: categories.images.count,
      percent: getPercent(categories.images.bytes),
    },
    {
      key: 'voice',
      label: 'Voice Notes',
      icon: Mic,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      bytes: categories.voice.bytes,
      count: categories.voice.count,
      percent: getPercent(categories.voice.bytes),
    },
    {
      key: 'docs',
      label: 'Documents',
      icon: FileText,
      color: 'bg-purple-500',
      textColor: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      bytes: categories.docs.bytes,
      count: categories.docs.count,
      percent: getPercent(categories.docs.bytes),
    },
    {
      key: 'avatars',
      label: 'User Avatars',
      icon: User,
      color: 'bg-amber-500',
      textColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      bytes: categories.avatars.bytes,
      count: categories.avatars.count,
      percent: getPercent(categories.avatars.bytes),
    },
  ];

  return (
    <div className="rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] p-5 shadow-xs transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            Disk Usage Distribution
          </span>
          <h4 className="text-xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary mt-1">
            Local Storage Usage
          </h4>
        </div>

        <div className="p-2.5 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-500">
          <HardDrive className="w-5 h-5" />
        </div>
      </div>

      {/* Main Total */}
      <div className="mb-4">
        {loading ? (
          <div className="h-9 w-32 bg-gray-200 dark:bg-white/10 rounded-md animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-wa-light-text-primary dark:text-wa-dark-text-primary tracking-tight">
              {formatBytes(totalBytes)}
            </span>
            <span className="text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              across {totalFiles.toLocaleString()} files in <code className="text-[11px] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">/public/uploads/</code>
            </span>
          </div>
        )}
      </div>

      {/* Segmented Progress Bar */}
      <div className="w-full h-3.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden flex mb-6">
        {categoryConfigs.map((cat) => {
          if (cat.percent === 0) return null;
          return (
            <div
              key={cat.key}
              className={cn('h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full', cat.color)}
              style={{ width: `${cat.percent}%` }}
              title={`${cat.label}: ${formatBytes(cat.bytes)} (${cat.percent}%)`}
            />
          );
        })}
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categoryConfigs.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.key}
              className="p-3 rounded-xl border border-[#e9edef] dark:border-white/5 bg-gray-50/50 dark:bg-white/5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className={cn('p-1.5 rounded-lg', cat.bgColor, cat.textColor)}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                  {cat.percent}%
                </span>
              </div>

              <div>
                <span className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate">
                  {cat.label}
                </span>
                <span className="text-sm font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                  {formatBytes(cat.bytes)}
                </span>
              </div>

              <div className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted">
                {cat.count.toLocaleString()} file{cat.count !== 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
