'use client';

import React, { useState } from 'react';
import { BackupInfo } from '@shared/types';
import {
  Database,
  Download,
  Trash2,
  PlusCircle,
  FileArchive,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface BackupHistoryTableProps {
  initialBackups: BackupInfo[];
}

export default function BackupHistoryTable({ initialBackups }: BackupHistoryTableProps) {
  const [backups, setBackups] = useState<BackupInfo[]>(initialBackups);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const refreshBackups = async () => {
    try {
      const res = await fetch('/api/admin/maintenance/backup');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (err) {
      console.error('Failed to reload backups:', err);
    }
  };

  const handleCreateBackup = async () => {
    setIsGenerating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/maintenance/backup', {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate backup');
      }

      setMessage({
        text: `Emergency database backup ${data.backup?.filename || ''} generated successfully!`,
        type: 'success',
      });
      await refreshBackups();
    } catch (err: any) {
      setMessage({
        text: err.message || 'Backup generation failed',
        type: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    setIsDeleting(filename);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/maintenance/backup/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete backup');
      }

      setMessage({
        text: `Backup ${filename} deleted successfully.`,
        type: 'success',
      });
      setBackups((prev) => prev.filter((b) => b.filename !== filename));
    } catch (err: any) {
      setMessage({
        text: err.message || 'Deletion failed',
        type: 'error',
      });
    } finally {
      setIsDeleting(null);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e9edef] dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00a884]/15 border border-[#00a884]/30 flex items-center justify-center text-[#00a884]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Emergency Database Backups
            </h3>
            <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              Gzip compressed snapshots (`.sql.gz`) stored securely on local storage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshBackups}
            title="Refresh backups list"
            className="p-2 rounded-xl text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleCreateBackup}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00a884] hover:bg-[#02906f] active:bg-[#007f61] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <PlusCircle className="w-4 h-4" />
            )}
            <span>{isGenerating ? 'Generating Backup...' : 'Create Backup Now'}</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Backups Table */}
      {backups.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-wa-light-text-muted dark:text-wa-dark-text-muted mb-3">
            <FileArchive className="w-6 h-6" />
          </div>
          <p className="text-xs font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary mb-1">
            No database backups found
          </p>
          <p className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted max-w-sm mb-4">
            Click &quot;Create Backup Now&quot; to perform an instantaneous compressed snapshot of your MySQL database.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#e9edef] dark:border-white/10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-wa-light-header/40 dark:bg-wa-dark-header/40 border-b border-[#e9edef] dark:border-white/10 text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                <th className="py-3 px-4 font-semibold">Backup Filename</th>
                <th className="py-3 px-4 font-semibold">Size</th>
                <th className="py-3 px-4 font-semibold">Created Timestamp</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9edef] dark:divide-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {backups.map((b) => (
                <tr key={b.filename} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium flex items-center gap-2">
                    <FileArchive className="w-4 h-4 text-[#00a884] shrink-0" />
                    <span>{b.filename}</span>
                  </td>
                  <td className="py-3 px-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                    {formatBytes(b.sizeBytes)}
                  </td>
                  <td className="py-3 px-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/api/admin/maintenance/backup/${encodeURIComponent(b.filename)}`}
                        download={b.filename}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[#00a884]/15 hover:text-[#00a884] transition-colors text-xs font-medium cursor-pointer"
                        title="Download backup file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                      <button
                        type="button"
                        disabled={isDeleting === b.filename}
                        onClick={() => setDeleteTarget(b.filename)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete backup"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-wa-light-text-primary dark:text-wa-dark-text-primary">
                Delete Backup File?
              </h3>
            </div>
            <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary leading-relaxed">
              Are you sure you want to permanently delete <strong>{deleteTarget}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBackup(deleteTarget)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
