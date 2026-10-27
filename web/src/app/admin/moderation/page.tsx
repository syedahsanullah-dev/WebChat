'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Clock,
  CheckCircle,
  FolderArchive,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { AbuseReportItem, AbuseReportCategory } from '@shared/types';
import ModerationQueueTable from '@/components/admin/ModerationQueueTable';
import ReportDetailDrawer from '@/components/admin/ReportDetailDrawer';

export default function AdminModerationPage() {
  const [reports, setReports] = useState<AbuseReportItem[]>([]);
  const [stats, setStats] = useState({
    totalPending: 0,
    resolvedToday: 0,
    totalReports: 0,
  });
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'RESOLVED' | 'DISMISSED' | 'ALL'>('PENDING');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);

      const res = await fetch(`/api/admin/moderation?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch moderation queue');
      }

      setReports(data.reports || []);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      setError(err.message || 'Error loading reports');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Abuse Reporting &amp; Moderation Queue
            </h1>
          </div>
          <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1">
            Review user-flagged messages, inspect 5-message conversational contexts, and take one-click disciplinary actions.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReports}
          disabled={isLoading}
          className="p-2 self-start sm:self-auto rounded-lg bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 text-wa-light-text-secondary hover:text-wa-light-text-primary transition-colors cursor-pointer"
          title="Refresh Queue"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary uppercase tracking-wider">
              Pending Reports
            </span>
            <div className="text-2xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {stats.totalPending}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-[#00a884] flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary uppercase tracking-wider">
              Resolved Today
            </span>
            <div className="text-2xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {stats.resolvedToday}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary uppercase tracking-wider">
              Lifetime Reports
            </span>
            <div className="text-2xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {stats.totalReports}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-[#111b21] rounded-2xl border border-[#e9edef] dark:border-white/10 shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === tab
                  ? 'bg-[#00a884] text-white shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 text-wa-light-text-secondary hover:text-wa-light-text-primary'
              }`}
            >
              {tab === 'PENDING' && `Pending (${stats.totalPending})`}
              {tab === 'RESOLVED' && 'Resolved'}
              {tab === 'DISMISSED' && 'Dismissed'}
              {tab === 'ALL' && 'All Reports'}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-wa-light-text-muted shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-hidden focus:border-[#00a884] cursor-pointer"
          >
            <option value="">All Categories</option>
            <option value="SPAM">Spam</option>
            <option value="HARASSMENT">Harassment</option>
            <option value="PHISHING">Phishing</option>
            <option value="INAPPROPRIATE">Inappropriate Content</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-xs">
          {error}
        </div>
      ) : isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-wa-light-text-secondary">
          <div className="w-7 h-7 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Loading moderation queue...</p>
        </div>
      ) : (
        <ModerationQueueTable
          reports={reports}
          onSelectReport={(id) => setSelectedReportId(id)}
        />
      )}

      {/* Detail Slide-out Drawer */}
      {selectedReportId && (
        <ReportDetailDrawer
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onReportResolved={fetchReports}
        />
      )}
    </div>
  );
}
