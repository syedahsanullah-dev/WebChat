'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Download, FileText, Image, Calendar, Loader2, CheckCircle2 } from 'lucide-react';

interface ExportChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle?: string;
}

export default function ExportChatModal({
  isOpen,
  onClose,
  chatId,
  chatTitle,
}: ExportChatModalProps) {
  const [includeMedia, setIncludeMedia] = useState(true);
  const [dateRange, setDateRange] = useState<'all' | '30days' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleStartExport = () => {
    setIsExporting(true);

    const params = new URLSearchParams();
    if (includeMedia) params.set('includeMedia', 'true');

    if (dateRange === '30days') {
      const past30 = new Date();
      past30.setDate(past30.getDate() - 30);
      params.set('startDate', past30.toISOString());
    } else if (dateRange === 'custom') {
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }

    const exportUrl = `/api/chats/${chatId}/export?${params.toString()}`;

    // Trigger download in new window/tab
    window.location.href = exportUrl;

    setTimeout(() => {
      setIsExporting(false);
      setExportComplete(true);
    }, 2000);
  };

  const handleClose = () => {
    setIsExporting(false);
    setExportComplete(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Export Chat History & Compliance Archive" size="md">
      {exportComplete ? (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Archive Download Triggered!
          </h3>
          <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary max-w-sm mx-auto">
            Your archive (.zip) containing offline HTML viewer, JSON transcript, and attachments is downloading.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 text-xs font-semibold bg-wa-green text-white rounded-md hover:bg-wa-green-hover"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 py-1">
          <div className="p-3 bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg border border-wa-light-border dark:border-wa-dark-border rounded-lg text-xs space-y-1">
            <div className="font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Target Conversation: {chatTitle || 'Chat'}
            </div>
            <div className="text-wa-light-text-muted dark:text-wa-dark-text-muted text-[11px]">
              Generates a standalone, styled offline HTML viewer (<code>transcript.html</code>) and machine-readable data (<code>transcript.json</code>).
            </div>
          </div>

          {/* Include Media Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-lg border border-wa-light-border dark:border-wa-dark-border bg-wa-light-sidebar-bg dark:bg-wa-dark-sidebar-bg cursor-pointer hover:bg-wa-light-hover/60 dark:hover:bg-wa-dark-hover/60 transition-colors">
            <input
              type="checkbox"
              checked={includeMedia}
              onChange={(e) => setIncludeMedia(e.target.checked)}
              className="mt-0.5 rounded text-wa-green focus:ring-wa-green"
            />
            <div className="text-xs">
              <span className="font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary block">
                Include Media Attachments
              </span>
              <span className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted block mt-0.5">
                Bundles uploaded images, photos, and voice notes into the archive.
              </span>
            </div>
          </label>

          {/* Date Range Selector */}
          <div>
            <label className="block text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1.5 uppercase tracking-wider">
              Date Range
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDateRange('all')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                  dateRange === 'all'
                    ? 'border-wa-green bg-wa-green/10 text-wa-green font-bold'
                    : 'border-wa-light-border dark:border-wa-dark-border hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setDateRange('30days')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                  dateRange === '30days'
                    ? 'border-wa-green bg-wa-green/10 text-wa-green font-bold'
                    : 'border-wa-light-border dark:border-wa-dark-border hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover'
                }`}
              >
                Past 30 Days
              </button>
              <button
                type="button"
                onClick={() => setDateRange('custom')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                  dateRange === 'custom'
                    ? 'border-wa-green bg-wa-green/10 text-wa-green font-bold'
                    : 'border-wa-light-border dark:border-wa-dark-border hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover'
                }`}
              >
                Custom Range
              </button>
            </div>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-wa-light-border dark:border-wa-dark-border">
                <div>
                  <span className="text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted block mb-1">
                    Start Date
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg border border-wa-light-border dark:border-wa-dark-border rounded-md"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted block mb-1">
                    End Date
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg border border-wa-light-border dark:border-wa-dark-border rounded-md"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-wa-light-border dark:border-wa-dark-border">
            <button
              type="button"
              onClick={handleClose}
              disabled={isExporting}
              className="px-3.5 py-1.5 text-xs font-medium rounded-md hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-wa-green text-white rounded-md hover:bg-wa-green-hover shadow-xs disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Packaging Archive...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Archive (.zip)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
