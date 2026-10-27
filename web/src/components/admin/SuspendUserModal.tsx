'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { ShieldAlert, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminUserView } from '@shared/types';

export interface SuspendUserModalProps {
  isOpen: boolean;
  user: AdminUserView | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export type SuspensionOption = '24H' | '7D' | '30D' | 'PERMANENT';

const DURATION_OPTIONS: { id: SuspensionOption; label: string; desc: string }[] = [
  { id: '24H', label: '24 Hours', desc: 'Temporary cooldown period for minor infractions' },
  { id: '7D', label: '7 Days', desc: 'One-week suspension for repeat violations' },
  { id: '30D', label: '30 Days', desc: 'One-month suspension for serious policy breaches' },
  { id: 'PERMANENT', label: 'Permanent Ban', desc: 'Irreversible termination of chat privileges' },
];

export default function SuspendUserModal({
  isOpen,
  user,
  onClose,
  onSuccess,
}: SuspendUserModalProps) {
  const [duration, setDuration] = useState<SuspensionOption>('PERMANENT');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a mandatory reason of at least 5 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch(`/api/admin/users/${user.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to suspend user');
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error executing account suspension');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Suspend User Account" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 py-2 select-none">
        {/* User Profile Card */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-[#182229] border border-black/10 dark:border-white/5">
          <Avatar
            name={user.displayName || user.username}
            src={user.avatarUrl}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-wa-light-text-primary dark:text-white truncate">
              {user.displayName || user.username}
            </p>
            <p className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted truncate">
              @{user.username} &bull; {user.email}
            </p>
          </div>
        </div>

        {/* Duration Options */}
        <div>
          <label className="block text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-2">
            Suspension Duration
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DURATION_OPTIONS.map((opt) => {
              const isSelected = duration === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setDuration(opt.id)}
                  className={cn(
                    'p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between',
                    isSelected
                      ? 'border-rose-500 bg-rose-500/10 text-wa-light-text-primary dark:text-white'
                      : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{opt.label}</span>
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0',
                        isSelected
                          ? 'border-rose-500 bg-rose-500 text-white'
                          : 'border-wa-light-text-muted dark:border-wa-dark-text-muted'
                      )}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted leading-tight">
                    {opt.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reason Textarea */}
        <div>
          <label className="block text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1.5">
            Mandatory Suspension Reason <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Describe the policy violation or reason for suspension..."
            className="w-full rounded-xl bg-wa-light-input dark:bg-wa-dark-input border border-black/10 dark:border-white/10 p-3 text-xs sm:text-sm text-wa-light-text-primary dark:text-white placeholder:text-wa-light-text-muted dark:placeholder:text-wa-dark-text-muted focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-rose-500 font-medium">{error}</p>
        )}

        {/* Footer Actions */}
        <div className="flex gap-2 pt-2 border-t border-black/5 dark:border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{isSubmitting ? 'Suspending...' : 'Suspend & Kick User'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
