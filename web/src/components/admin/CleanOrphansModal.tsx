'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import { formatBytes } from './StorageBreakdownCard';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

export interface CleanOrphansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fileCount: number;
  totalBytes: number;
  loading?: boolean;
}

export default function CleanOrphansModal({
  isOpen,
  onClose,
  onConfirm,
  fileCount,
  totalBytes,
  loading = false,
}: CleanOrphansModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      maxWidth="md"
      title="Purge Orphan Media"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-rose-700 dark:text-rose-300 space-y-1">
            <span className="font-semibold block text-sm">Permanent Storage Purge</span>
            <p>
              You are about to permanently delete{' '}
              <strong className="font-bold underline">{fileCount} orphan file{fileCount !== 1 ? 's' : ''}</strong> from Hostinger NVMe disk.
            </p>
            <p>
              This action will immediately reclaim{' '}
              <strong className="font-bold text-rose-800 dark:text-rose-200">
                {formatBytes(totalBytes)}
              </strong>{' '}
              of server storage. This operation cannot be undone.
            </p>
          </div>
        </div>

        <div className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
          <p>
            An immutable record will be stored in <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">audit_logs</code> with action{' '}
            <code className="text-[#00a884] font-semibold">STORAGE_ORPHANS_PURGED</code> and your administrator ID.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e9edef] dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Purging disk...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirm & Purge {formatBytes(totalBytes)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
