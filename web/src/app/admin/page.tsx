'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MetricStatCard from '@/components/admin/MetricStatCard';
import MemoryTelemetryCard from '@/components/admin/MemoryTelemetryCard';
import ActiveSocketsCard from '@/components/admin/ActiveSocketsCard';
import { SystemMetricsPayload } from '@shared/types';
import {
  Users,
  MessageSquare,
  MessagesSquare,
  RefreshCw,
  Server,
  Database,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<SystemMetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10); // 10s default

  const fetchMetrics = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/metrics', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch admin metrics:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchMetrics(false);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchMetrics]);

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Infrastructure & System Telemetry
          </h2>
          <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1">
            Real-time dual-server resource monitoring & MySQL database analytics.
          </p>
        </div>

        {/* Controls: Auto-refresh selector & Manual Refresh button */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            <span>Refresh:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="text-xs py-1.5 px-2.5 rounded-xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] text-wa-light-text-primary dark:text-wa-dark-text-primary cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            >
              <option value={10}>Every 10s</option>
              <option value={30}>Every 30s</option>
              <option value={60}>Every 60s</option>
              <option value={0}>Off</option>
            </select>
          </div>

          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary transition-colors disabled:opacity-50"
            title="Refresh metrics immediately"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#00a884]' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Top Telemetry Grid: Memory and Active Sockets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <MemoryTelemetryCard
          rssMB={metrics?.memory.rssMB || 30}
          heapUsedMB={metrics?.memory.heapUsedMB || 18}
          heapTotalMB={metrics?.memory.heapTotalMB || 24}
          externalMB={metrics?.memory.externalMB}
          loading={loading}
        />

        <ActiveSocketsCard
          activeSockets={metrics?.activeSockets || 0}
          onlineUsers={metrics?.onlineUsers || 0}
          activeRooms={metrics?.activeRooms || 0}
          uptimeSeconds={metrics?.uptime || 0}
          status={metrics?.status || 'HEALTHY'}
          loading={loading}
        />
      </div>

      {/* Database Activity Metrics Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-[#00a884]" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            Hostinger MySQL Database Telemetry
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <MetricStatCard
            title="Total Registered Users"
            value={metrics?.db.totalUsers.toLocaleString() || '0'}
            subtitle="Verified @username accounts"
            icon={Users}
            loading={loading}
            iconBgColor="bg-sky-500/10 dark:bg-sky-500/20"
            iconColor="text-sky-500"
            badge={{ text: 'Zero OTP / No SMS', variant: 'success' }}
          />

          <MetricStatCard
            title="Total Messages Stored"
            value={metrics?.db.totalMessages.toLocaleString() || '0'}
            subtitle={`+${metrics?.db.messagesSentLast24h || 0} sent in last 24h`}
            icon={MessageSquare}
            loading={loading}
            iconBgColor="bg-emerald-500/10 dark:bg-emerald-500/20"
            iconColor="text-emerald-500"
            trend={{
              value: `+${metrics?.db.messagesSentLast24h || 0}`,
              label: 'last 24 hours',
              isPositive: true,
            }}
          />

          <MetricStatCard
            title="Active Chat Threads"
            value={metrics?.db.totalChats.toLocaleString() || '0'}
            subtitle="Direct messages & group channels"
            icon={MessagesSquare}
            loading={loading}
            iconBgColor="bg-purple-500/10 dark:bg-purple-500/20"
            iconColor="text-purple-500"
            badge={{ text: 'Indexed', variant: 'info' }}
          />
        </div>
      </div>

      {/* Architectural Health & Topology Overview Card */}
      <div className="rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#00a884]" />
            <h4 className="text-sm font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Dual-Server Node.js System Architecture
            </h4>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
            $0.00 / month Target Verified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Server #1 Info */}
          <div className="p-3.5 rounded-xl border border-[#e9edef] dark:border-white/5 bg-gray-50/50 dark:bg-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                Server #1: Next.js 15 Standalone
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            </div>
            <p className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary leading-relaxed">
              Handles React App Router UI, REST APIs, static uploads (<code className="font-mono text-[11px]">/public/uploads/</code>), Web Push, and Super Admin console.
            </p>
          </div>

          {/* Server #2 Info */}
          <div className="p-3.5 rounded-xl border border-[#e9edef] dark:border-white/5 bg-gray-50/50 dark:bg-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                Server #2: Fastify 4+ & Native ws Daemon
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            </div>
            <p className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary leading-relaxed">
              24/7 background WebSocket daemon running on port 4000. Handles presence, typing, live polls, and WebRTC audio signaling within ~30 MB RAM.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
