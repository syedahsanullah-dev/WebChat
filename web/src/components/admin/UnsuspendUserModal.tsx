'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { UserCheck } from 'lucide-react';
import { UserAdminProfile } from '@shared/types';

export interface UnsuspendUserModalProps {
  isOpen: boolean;
  user: UserAdminProfile | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UnsuspendUserModal({
  isOpen,
  user,
  onClose,
  onSuccess,
}: UnsuspendUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleUnsuspend = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch(`/api/admin/users/${user.id}/unsuspend`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to unsuspend user');
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error reactivating account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reactivate User Account" maxWidth="sm">
      <div className="space-y-4 py-2 select-none">
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

        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary leading-relaxed">
          Are you sure you want to lift the suspension for @{user.username}?
          The user will immediately be permitted to log in and participate in conversations.
        </p>

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
            type="button"
            onClick={handleUnsuspend}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#00a884] hover:bg-[#00a884]/90 text-white font-medium text-sm transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <UserCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'Reactivating...' : 'Reactivate Account'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
