'use client';

import React from 'react';
import { Radio, Users, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActiveSocketsCardProps {
  activeSockets: number;
  onlineUsers: number;
  activeRooms: number;
  uptimeSeconds: number;
  status?: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  loading?: boolean;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export default function ActiveSocketsCard({
  activeSockets = 0,
  onlineUsers = 0,
  activeRooms = 0,
  uptimeSeconds = 0,
  status = 'HEALTHY',
  loading = false,
}: ActiveSocketsCardProps) {
  const isHealthy = status === 'HEALTHY';

  return (
    <div className="rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] p-5 shadow-xs transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              Realtime WebSocket Mesh
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                isHealthy
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20'
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isHealthy ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'
                )}
              />
              {status}
            </span>
          </div>
          <h4 className="text-xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary mt-1">
            Active Socket Daemon
          </h4>
        </div>

        <div className="p-2.5 rounded-xl bg-[#00a884]/10 dark:bg-[#00a884]/20 text-[#00a884]">
          <Radio className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      {/* Main Stat */}
      <div className="space-y-4">
        <div>
          {loading ? (
            <div className="h-10 w-28 bg-gray-200 dark:bg-white/10 rounded-md animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-wa-light-text-primary dark:text-wa-dark-text-primary tracking-tight">
                {activeSockets}
              </span>
              <span className="text-sm font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                concurrent connections
              </span>
            </div>
          )}
        </div>

        {/* Breakdown sub-metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#f0f2f5] dark:border-white/5">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/5">
            <Users className="w-4 h-4 text-[#00a884]" />
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-semibold text-wa-light-text-muted dark:text-wa-dark-text-muted">
                Users
              </span>
              <span className="text-sm font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                {onlineUsers}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/5">
            <MessageSquare className="w-4 h-4 text-sky-500" />
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-semibold text-wa-light-text-muted dark:text-wa-dark-text-muted">
                Rooms
              </span>
              <span className="text-sm font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                {activeRooms}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-white/5">
            <Clock className="w-4 h-4 text-amber-500" />
            <div className="min-w-0">
              <span className="block text-[10px] uppercase font-semibold text-wa-light-text-muted dark:text-wa-dark-text-muted">
                Uptime
              </span>
              <span className="text-sm font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                {formatUptime(uptimeSeconds)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
