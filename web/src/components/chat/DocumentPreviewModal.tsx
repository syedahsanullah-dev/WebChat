'use client';

import React from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

export interface DocumentPreviewModalProps {
  isOpen: boolean;
  documentUrl: string;
  documentName: string;
  onClose: () => void;
}

export default function DocumentPreviewModal({
  isOpen,
  documentUrl,
  documentName,
  onClose,
}: DocumentPreviewModalProps) {
  if (!isOpen || !documentUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-6 animate-fadeIn select-none">
      <div className="relative w-full max-w-5xl h-[90vh] bg-wa-light-sidebar dark:bg-[#111b21] rounded-2xl shadow-2xl flex flex-col border border-black/10 dark:border-white/10 overflow-hidden">
        {/* Top Header Bar */}
        <div className="h-14 px-4 bg-wa-light-header dark:bg-[#202c33] border-b border-[#e9edef] dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-5 h-5 text-red-500 shrink-0" />
            <span className="font-semibold text-sm text-wa-light-text-primary dark:text-white truncate">
              {documentName}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Open in New Window */}
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-white transition-colors"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Direct Download */}
            <a
              href={documentUrl}
              download={documentName}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-white transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-white transition-colors ml-1"
              title="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF Embedded Viewport */}
        <div className="flex-1 w-full bg-[#525659] relative overflow-hidden">
          <iframe
            src={`${documentUrl}#toolbar=1&navpanes=0`}
            className="w-full h-full border-none"
            title={documentName}
          />
        </div>
      </div>
    </div>
  );
}
