'use client';

import React from 'react';
import { OrphanFileInfo } from '@shared/types';
import { formatBytes } from './StorageBreakdownCard';
import { Trash2, AlertTriangle, FileQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OrphanFilesTableProps {
  files: OrphanFileInfo[];
  selectedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onPurgeClick: () => void;
  loading?: boolean;
}

export default function OrphanFilesTable({
  files,
  selectedPaths,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onPurgeClick,
  loading = false,
}: OrphanFilesTableProps) {
  const allSelected = files.length > 0 && selectedPaths.size === files.length;
  const isIndeterminate = selectedPaths.size > 0 && selectedPaths.size < files.length;

  const selectedBytes = files
    .filter((f) => selectedPaths.has(f.relativePath))
    .reduce((acc, f) => acc + f.sizeBytes, 0);

  const categoryBadge = (category: OrphanFileInfo['category']) => {
    switch (category) {
      case 'images':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
            Image
          </span>
        );
      case 'voice':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            Voice
          </span>
        );
      case 'docs':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400">
            Doc
          </span>
        );
      case 'avatars':
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            Avatar
          </span>
        );
    }
  };

  if (files.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] p-10 text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
          <FileQuestion className="w-6 h-6" />
        </div>
        <h5 className="text-base font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
          No Orphan Media Files Found
        </h5>
        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1 max-w-md mx-auto">
          Every file on disk is actively referenced by a message, user profile, or chat in the database.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-[#e9edef] dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50 dark:bg-white/5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
            {files.length} Orphan Candidate{files.length !== 1 ? 's' : ''} Detected
          </span>
          {selectedPaths.size > 0 && (
            <span className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              ({selectedPaths.size} selected &bull; {formatBytes(selectedBytes)} reclaimable)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedPaths.size > 0 && (
            <button
              onClick={onClearSelection}
              type="button"
              className="text-xs px-2.5 py-1.5 rounded-lg text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              Clear Selection
            </button>
          )}

          <button
            onClick={onPurgeClick}
            disabled={selectedPaths.size === 0 || loading}
            type="button"
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all shadow-xs',
              selectedPaths.size > 0
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                : 'bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed'
            )}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge Selected ({selectedPaths.size})</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span>
          Files modified within the last 15 minutes are automatically excluded to protect in-flight user uploads.
        </span>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/80 dark:bg-white/5 border-b border-[#e9edef] dark:border-white/10 text-wa-light-text-secondary dark:text-wa-dark-text-secondary font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isIndeterminate;
                  }}
                  onChange={() => {
                    if (allSelected) {
                      onClearSelection();
                    } else {
                      onSelectAll();
                    }
                  }}
                  className="rounded border-gray-300 dark:border-white/20 text-[#00a884] focus:ring-[#00a884] cursor-pointer"
                />
              </th>
              <th className="p-3">File / Relative Path</th>
              <th className="p-3">Category</th>
              <th className="p-3">Size</th>
              <th className="p-3">Last Modified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9edef] dark:divide-white/5">
            {files.map((file) => {
              const isSelected = selectedPaths.has(file.relativePath);
              return (
                <tr
                  key={file.id}
                  onClick={() => onToggleSelect(file.relativePath)}
                  className={cn(
                    'hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer',
                    isSelected && 'bg-[#00a884]/5 dark:bg-[#00a884]/10'
                  )}
                >
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(file.relativePath)}
                      className="rounded border-gray-300 dark:border-white/20 text-[#00a884] focus:ring-[#00a884] cursor-pointer"
                    />
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-wa-light-text-primary dark:text-wa-dark-text-primary">
                      {file.relativePath}
                    </span>
                  </td>
                  <td className="p-3">{categoryBadge(file.category)}</td>
                  <td className="p-3 font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                    {formatBytes(file.sizeBytes)}
                  </td>
                  <td className="p-3 text-wa-light-text-muted dark:text-wa-dark-text-muted">
                    {new Date(file.modifiedAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
