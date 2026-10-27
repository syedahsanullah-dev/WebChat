'use client';

import React from 'react';
import { X, FileUp } from 'lucide-react';

export interface FileUploadProgressBarProps {
  filename: string;
  progressPercent?: number;
  onCancel?: () => void;
}

export default function FileUploadProgressBar({
  filename,
  progressPercent = 50,
  onCancel,
}: FileUploadProgressBarProps) {
  return (
    <div className="w-full px-4 py-2 bg-wa-light-header dark:bg-wa-dark-header border-t border-wa-light-border dark:border-wa-dark-border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="w-8 h-8 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884] shrink-0">
        <FileUp className="w-4 h-4 animate-pulse" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
            Uploading {filename}...
          </span>
          <span className="text-wa-light-text-muted dark:text-wa-dark-text-muted shrink-0 ml-2">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00a884] rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary transition-colors shrink-0"
          title="Cancel upload"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
