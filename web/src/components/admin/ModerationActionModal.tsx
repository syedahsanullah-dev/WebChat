'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, Trash2, Bell, VolumeX, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import { ModerationAction, AbuseReportItem } from '@shared/types';

export interface ModerationActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AbuseReportItem;
  initialAction?: ModerationAction;
  onActionComplete: () => void;
}

export default function ModerationActionModal({
  isOpen,
  onClose,
  report,
  initialAction = 'DELETE_MESSAGE',
  onActionComplete,
}: ModerationActionModalProps) {
  const [action, setAction] = useState<ModerationAction>(initialAction);
  const [notes, setNotes] = useState('');
  const [muteHours, setMuteHours] = useState(24);
  const [suspensionDuration, setSuspensionDuration] = useState('24h');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/moderation/${report.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: notes.trim() || undefined,
          muteDurationHours: action === 'MUTE_USER' ? muteHours : undefined,
          suspensionDuration: action === 'SUSPEND_USER' ? suspensionDuration : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to execute moderation action');
      }

      onActionComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionOptions: Array<{ id: ModerationAction; label: string; icon: any; color: string; desc: string }> = [
    {
      id: 'DELETE_MESSAGE',
      label: 'Delete Message',
      icon: Trash2,
      color: 'text-amber-500',
      desc: 'Soft-deletes message from chat stream and NVMe storage',
    },
    {
      id: 'WARN_USER',
      label: 'Issue Official Warning',
      icon: Bell,
      color: 'text-blue-500',
      desc: 'Sends a moderation system alert notice to the user',
    },
    {
      id: 'MUTE_USER',
      label: 'Mute User (Temporary)',
      icon: VolumeX,
      color: 'text-purple-500',
      desc: 'Prevents user from posting messages for a set time window',
    },
    {
      id: 'SUSPEND_USER',
      label: 'Suspend Account',
      icon: Ban,
      color: 'text-rose-500',
      desc: 'Force-kicks active sockets and revokes all login sessions',
    },
    {
      id: 'DISMISSED',
      label: 'Dismiss Report',
      icon: CheckCircle,
      color: 'text-emerald-500',
      desc: 'Closes report with no punitive action on reported user',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e9edef] dark:border-white/10 bg-wa-light-header dark:bg-wa-dark-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                Resolve Abuse Report
              </h2>
              <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                Report #{report.id.slice(0, 8)} • Against @{report.reportedUserName}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Choice Grid */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary block">
              Select Moderation Action
            </label>
            <div className="space-y-1.5">
              {actionOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = action === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setAction(opt.id)}
                    className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#00a884]/10 border-[#00a884] text-wa-light-text-primary dark:text-wa-dark-text-primary shadow-xs'
                        : 'bg-white dark:bg-[#111b21] border-[#e9edef] dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${opt.color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{opt.label}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#00a884]" />
                        )}
                      </div>
                      <span className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary leading-tight block mt-0.5">
                        {opt.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conditional Duration Options */}
          {action === 'MUTE_USER' && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
              <label className="text-xs font-semibold text-purple-700 dark:text-purple-300 block">
                Mute Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '1 Hour', val: 1 },
                  { label: '24 Hours', val: 24 },
                  { label: '7 Days', val: 168 },
                ].map((d) => (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => setMuteHours(d.val)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                      muteHours === d.val
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-[#111b21] text-wa-light-text-secondary border-black/10 dark:border-white/10'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {action === 'SUSPEND_USER' && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
              <label className="text-xs font-semibold text-rose-700 dark:text-rose-300 block">
                Suspension Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '24h', val: '24h' },
                  { label: '7d', val: '7d' },
                  { label: '30d', val: '30d' },
                  { label: 'Perm', val: 'permanent' },
                ].map((d) => (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => setSuspensionDuration(d.val)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                      suspensionDuration === d.val
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white dark:bg-[#111b21] text-wa-light-text-secondary border-black/10 dark:border-white/10'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes / Reason Textarea */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary block">
              Resolution Audit Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reasoning logged into audit trail and sent with warning/suspension..."
              className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted focus:outline-hidden focus:border-[#00a884] transition-colors"
            />
          </div>

          {/* Action Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#e9edef] dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-wa-light-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                action === 'DISMISSED'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : action === 'SUSPEND_USER'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-[#00a884] hover:bg-[#02906f]'
              }`}
            >
              {isSubmitting ? 'Executing...' : 'Confirm Resolution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
