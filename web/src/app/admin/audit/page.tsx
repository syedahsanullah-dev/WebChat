'use client';

import React, { useState, useEffect } from 'react';
import AuditFilterBar from '@/components/admin/AuditFilterBar';
import AuditLogTable from '@/components/admin/AuditLogTable';
import AuditDetailsModal from '@/components/admin/AuditDetailsModal';
import { Shield, Download, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [action, setAction] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Details Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async (targetPage = page) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', targetPage.toString());
      params.set('limit', '50');
      if (action && action !== 'ALL') params.set('action', action);
      if (search.trim()) params.set('search', search.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [action, startDate, endDate]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchLogs(1);
  };

  const handleReset = () => {
    setAction('ALL');
    setSearch('');
    setStartDate('');
    setEndDate('');
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (action && action !== 'ALL') params.set('action', action);
    if (search.trim()) params.set('search', search.trim());
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    window.open(`/api/admin/audit/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-wa-light-border dark:border-wa-dark-border">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-wa-light-text-primary dark:text-wa-dark-text-primary">
            <Shield className="w-5 h-5 text-indigo-500" />
            <span>Immutable Security Audit Log</span>
          </h1>
          <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-0.5">
            Tamper-resistant append-only ledger of all authentication, administrative, and compliance events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-wa-light-border dark:border-wa-dark-border hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting || total === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-wa-green text-white hover:bg-wa-green-hover transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <AuditFilterBar
        action={action}
        onActionChange={setAction}
        search={search}
        onSearchChange={setSearch}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onReset={handleReset}
      />

      {/* Audit Log Table Container */}
      <div className="bg-wa-light-sidebar-bg dark:bg-wa-dark-sidebar-bg border border-wa-light-border dark:border-wa-dark-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-3 border-b border-wa-light-border dark:border-wa-dark-border flex items-center justify-between text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
          <span className="font-semibold uppercase tracking-wider text-[11px]">
            Showing {logs.length} of {total} total records
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px]">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => fetchLogs(page - 1)}
                className="p-1 rounded border border-wa-light-border dark:border-wa-dark-border hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => fetchLogs(page + 1)}
                className="p-1 rounded border border-wa-light-border dark:border-wa-dark-border hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-wa-light-text-muted dark:text-wa-dark-text-muted">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <span className="text-xs">Loading audit trail...</span>
          </div>
        ) : (
          <AuditLogTable logs={logs} onViewDetails={(l) => setSelectedLog(l)} />
        )}
      </div>

      {/* Details Inspector Modal */}
      <AuditDetailsModal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </div>
  );
}
