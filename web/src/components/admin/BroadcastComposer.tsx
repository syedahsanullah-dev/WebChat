'use client';

import React, { useState } from 'react';
import { Send, Megaphone, AlertTriangle, AlertOctagon, Eye } from 'lucide-react';

interface BroadcastComposerProps {
  onBroadcastCreated: () => void;
}

export default function BroadcastComposer({ onBroadcastCreated }: BroadcastComposerProps) {
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'INFO' | 'WARNING' | 'CRITICAL'>('INFO');
  const [durationHours, setDurationHours] = useState<string>('24');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          severity,
          durationHours: durationHours === 'indefinite' ? null : Number(durationHours),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch broadcast');
      }

      setMessage('');
      onBroadcastCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPreviewBadge = () => {
    switch (severity) {
      case 'CRITICAL':
        return {
          barClass: 'bg-rose-700 text-white animate-pulse',
          icon: <AlertOctagon className="w-4 h-4 shrink-0 text-white" />,
          title: 'CRITICAL ALERT',
        };
      case 'WARNING':
        return {
          barClass: 'bg-amber-600 text-white',
          icon: <AlertTriangle className="w-4 h-4 shrink-0 text-white" />,
          title: 'SYSTEM WARNING',
        };
      case 'INFO':
      default:
        return {
          barClass: 'bg-[#00a884] text-white',
          icon: <Megaphone className="w-4 h-4 shrink-0 text-white" />,
          title: 'ANNOUNCEMENT',
        };
    }
  };

  const preview = getPreviewBadge();

  return (
    <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-[#e9edef] dark:border-white/10">
        <Megaphone className="w-5 h-5 text-[#00a884]" />
        <div>
          <h2 className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Compose Platform-Wide Broadcast
          </h2>
          <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            Dispatched instantaneously (&lt; 50ms) to 100% of connected clients via WebSockets with sound chime.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
            Broadcast Announcement Message
          </label>
          <textarea
            required
            rows={3}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Scheduled server maintenance tonight from 02:00 to 02:30 UTC. Messaging may experience brief interruptions."
            className="w-full text-xs p-3 rounded-lg bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:border-[#00a884] resize-none"
          />
          <div className="flex justify-end mt-1">
            <span className="text-[10px] text-wa-light-text-secondary">
              {message.length} / 500 characters
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
              Severity Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSeverity('INFO')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                  severity === 'INFO'
                    ? 'bg-[#00a884] text-white border-[#00a884]'
                    : 'bg-[#f0f2f5] dark:bg-[#111b21] border-[#e9edef] dark:border-white/10 text-wa-light-text-secondary'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                INFO
              </button>
              <button
                type="button"
                onClick={() => setSeverity('WARNING')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                  severity === 'WARNING'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-[#f0f2f5] dark:bg-[#111b21] border-[#e9edef] dark:border-white/10 text-wa-light-text-secondary'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                WARN
              </button>
              <button
                type="button"
                onClick={() => setSeverity('CRITICAL')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                  severity === 'CRITICAL'
                    ? 'bg-rose-700 text-white border-rose-700'
                    : 'bg-[#f0f2f5] dark:bg-[#111b21] border-[#e9edef] dark:border-white/10 text-wa-light-text-secondary'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                CRITICAL
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
              Active Duration
            </label>
            <select
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:border-[#00a884]"
            >
              <option value="1">1 Hour</option>
              <option value="4">4 Hours</option>
              <option value="12">12 Hours</option>
              <option value="24">24 Hours (Default)</option>
              <option value="72">3 Days</option>
              <option value="indefinite">Until Manually Dismissed</option>
            </select>
          </div>
        </div>

        {/* Live Banner Preview */}
        <div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-wa-light-text-secondary mb-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>Live Client Banner Preview</span>
          </div>
          <div className={`rounded-xl p-3 shadow-md flex items-center justify-between gap-3 ${preview.barClass}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1 rounded bg-black/15">{preview.icon}</div>
              <div className="text-xs truncate">
                <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-black/20 mr-2 uppercase">
                  {preview.title}
                </span>
                <span>{message || 'Type message above to preview sliding banner...'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Live Broadcast'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
