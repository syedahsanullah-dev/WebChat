'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StorageBreakdownCard, { formatBytes } from '@/components/admin/StorageBreakdownCard';
import OrphanFilesTable from '@/components/admin/OrphanFilesTable';
import CleanOrphansModal from '@/components/admin/CleanOrphansModal';
import { StorageAnalyticsPayload, OrphanFileInfo } from '@shared/types';
import {
  HardDrive,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function AdminStoragePage() {
  const [analytics, setAnalytics] = useState<StorageAnalyticsPayload | null>(null);
  const [orphanFiles, setOrphanFiles] = useState<OrphanFileInfo[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [hasScanned, setHasScanned] = useState(false);

  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch('/api/admin/storage/analytics', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to load storage analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleScanOrphans = async () => {
    setScanning(true);
    setToastMessage(null);
    try {
      const res = await fetch('/api/admin/storage/orphan-scan', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setOrphanFiles(data.files || []);
        setSelectedPaths(new Set()); // Start with unselected
        setHasScanned(true);
      } else {
        const err = await res.json();
        setToastMessage({ text: err.error || 'Failed to scan orphan files', type: 'error' });
      }
    } catch (err: any) {
      setToastMessage({ text: err?.message || 'Network error scanning orphans', type: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const handleToggleSelect = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set(orphanFiles.map((f) => f.relativePath));
    setSelectedPaths(all);
  };

  const handleClearSelection = () => {
    setSelectedPaths(new Set());
  };

  const handleExecutePurge = async () => {
    if (selectedPaths.size === 0) return;
    setCleaning(true);
    try {
      const res = await fetch('/api/admin/storage/orphan-clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: Array.from(selectedPaths) }),
      });

      if (res.ok) {
        const result = await res.json();
        setToastMessage({
          text: `Purged ${result.filesDeleted} file(s) and reclaimed ${formatBytes(result.bytesReclaimed)}!`,
          type: 'success',
        });
        setIsCleanModalOpen(false);
        // Remove purged files from current state
        setOrphanFiles((prev) => prev.filter((f) => !selectedPaths.has(f.relativePath)));
        setSelectedPaths(new Set());
        // Refresh live analytics
        fetchAnalytics();
      } else {
        const err = await res.json();
        setToastMessage({ text: err.error || 'Failed to purge orphan files', type: 'error' });
      }
    } catch (err: any) {
      setToastMessage({ text: err?.message || 'Purge request failed', type: 'error' });
    } finally {
      setCleaning(false);
    }
  };

  const selectedBytes = orphanFiles
    .filter((f) => selectedPaths.has(f.relativePath))
    .reduce((acc, f) => acc + f.sizeBytes, 0);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-fadeIn ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[11px] underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Storage & Media Health
          </h2>
          <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1">
            Audit physical files on disk storage and safely purge unreferenced orphan media.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={fetchAnalytics}
            disabled={loadingAnalytics}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary transition-colors disabled:opacity-50"
            title="Refresh storage statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalytics ? 'animate-spin text-[#00a884]' : ''}`} />
            <span>Refresh Stats</span>
          </button>

          <button
            onClick={handleScanOrphans}
            disabled={scanning}
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            {scanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning NVMe Disk...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Scan for Orphan Files</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Storage Breakdown Component */}
      <StorageBreakdownCard data={analytics || undefined} loading={loadingAnalytics} />

      {/* Orphan Files Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Orphan Media Candidates
            </h3>
          </div>

          {hasScanned && orphanFiles.length > 0 && (
            <span className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
              {orphanFiles.length} file{orphanFiles.length !== 1 ? 's' : ''} detected
            </span>
          )}
        </div>

        {hasScanned ? (
          <OrphanFilesTable
            files={orphanFiles}
            selectedPaths={selectedPaths}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onPurgeClick={() => setIsCleanModalOpen(true)}
            loading={cleaning}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-[#e9edef] dark:border-white/10 p-10 text-center bg-gray-50/50 dark:bg-white/5">
            <HardDrive className="w-10 h-10 text-wa-light-text-muted dark:text-wa-dark-text-muted mx-auto mb-3" />
            <h5 className="text-sm font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Orphan Media Scanner Ready
            </h5>
            <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1 max-w-md mx-auto">
              Click &quot;Scan for Orphan Files&quot; above to cross-reference physical files on disk against active MySQL records.
            </p>
          </div>
        )}
      </div>

      {/* Clean Confirmation Modal */}
      <CleanOrphansModal
        isOpen={isCleanModalOpen}
        onClose={() => setIsCleanModalOpen(false)}
        onConfirm={handleExecutePurge}
        fileCount={selectedPaths.size}
        totalBytes={selectedBytes}
        loading={cleaning}
      />
    </div>
  );
}
