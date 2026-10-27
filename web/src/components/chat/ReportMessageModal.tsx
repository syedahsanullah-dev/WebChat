'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle, CheckCircle2, UserX } from 'lucide-react';
import { AbuseReportCategory } from '@shared/types';

export interface ReportMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  reportedUserId: string;
  reportedUserName?: string;
  messageId?: string;
  messageSnippet?: string;
  onSuccess?: () => void;
}

const CATEGORIES: Array<{ id: AbuseReportCategory; label: string; desc: string }> = [
  { id: 'SPAM', label: 'Spam', desc: 'Unsolicited advertising, repetitive content, or automated bots' },
  { id: 'HARASSMENT', label: 'Harassment', desc: 'Bullying, offensive language, hate speech, or threats' },
  { id: 'PHISHING', label: 'Phishing / Fraud', desc: 'Deceptive links, credential harvesting, or scams' },
  { id: 'INAPPROPRIATE', label: 'Inappropriate Content', desc: 'Sexually explicit, violent, or illegal media' },
  { id: 'OTHER', label: 'Other Violation', desc: 'Any other violation of community guidelines' },
];

export default function ReportMessageModal({
  isOpen,
  onClose,
  chatId,
  reportedUserId,
  reportedUserName = 'User',
  messageId,
  messageSnippet,
  onSuccess,
}: ReportMessageModalProps) {
  const [category, setCategory] = useState<AbuseReportCategory>('SPAM');
  const [reason, setReason] = useState('');
  const [blockUser, setBlockUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError('Please provide at least 5 characters explaining the issue.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          reportedUserId,
          messageId: messageId || null,
          category,
          reason: reason.trim(),
          blockUser,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setIsSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Error submitting report');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e9edef] dark:border-white/10 bg-wa-light-header dark:bg-wa-dark-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                Report {messageId ? 'Message' : `@${reportedUserName}`}
              </h2>
              <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                Confidential report submitted to community moderators
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-wa-light-text-secondary hover:text-wa-light-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Confirmation State */}
        {isSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-[#00a884] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Report Submitted
            </h3>
            <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary max-w-xs">
              Thank you for keeping our community safe. Our moderation team will review this report shortly.
            </p>
          </div>
        ) : (
          /* Form Content */
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Quoted Message Preview if applicable */}
            {messageSnippet && (
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border-l-4 border-rose-500 text-xs">
                <span className="text-[10px] uppercase font-bold text-wa-light-text-muted dark:text-wa-dark-text-muted">
                  Reported Message Content:
                </span>
                <p className="italic text-wa-light-text-primary dark:text-wa-dark-text-primary line-clamp-2 mt-0.5">
                  &ldquo;{messageSnippet}&rdquo;
                </p>
              </div>
            )}

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary block">
                Select Reason for Report
              </label>
              <div className="space-y-1.5">
                {CATEGORIES.map((c) => {
                  const isSelected = category === c.id;
                  return (
                    <label
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-rose-500/10 border-rose-500/50 text-wa-light-text-primary dark:text-wa-dark-text-primary shadow-xs'
                          : 'bg-white dark:bg-[#111b21] border-[#e9edef] dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportCategory"
                        checked={isSelected}
                        onChange={() => setCategory(c.id)}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold block">{c.label}</span>
                        <span className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary leading-tight block">
                          {c.desc}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Additional details textarea */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary block">
                Additional Details (Optional)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain what happened or why this content violates community rules..."
                className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted focus:outline-hidden focus:border-rose-500 transition-colors"
              />
            </div>

            {/* Block Checkbox */}
            <label className="flex items-center gap-2 text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={blockUser}
                onChange={(e) => setBlockUser(e.target.checked)}
                className="rounded-sm border-gray-400 text-rose-600 focus:ring-rose-500"
              />
              <span className="flex items-center gap-1">
                <UserX className="w-3.5 h-3.5 text-rose-500" />
                <span>Also block <strong>@{reportedUserName}</strong> from contacting me</span>
              </span>
            </label>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#e9edef] dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
