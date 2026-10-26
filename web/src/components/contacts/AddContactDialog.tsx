'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { UserCheck, Loader2 } from 'lucide-react';

export interface TargetContactUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  about?: string | null;
  existingAlias?: string | null;
}

export interface AddContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: TargetContactUser | null;
  onContactSaved: () => void;
}

export default function AddContactDialog({
  isOpen,
  onClose,
  targetUser,
  onContactSaved,
}: AddContactDialogProps) {
  const [aliasName, setAliasName] = useState(targetUser?.existingAlias || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync aliasName when targetUser changes
  React.useEffect(() => {
    if (targetUser) {
      setAliasName(targetUser.existingAlias || '');
      setError(null);
    }
  }, [targetUser]);

  if (!targetUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactUserId: targetUser.id,
          aliasName: aliasName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save contact');
        return;
      }

      onContactSaved();
      onClose();
    } catch {
      setError('Network error saving contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={targetUser.existingAlias ? 'Edit Contact' : 'Add to Contacts'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User preview header */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-wa-light-input dark:bg-wa-dark-input border border-wa-light-border dark:border-wa-dark-border">
          <Avatar
            src={targetUser.avatarUrl}
            name={targetUser.displayName}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
              {targetUser.displayName}
            </h4>
            <p className="text-xs font-mono text-wa-green truncate">
              @{targetUser.username}
            </p>
            {targetUser.about && (
              <p className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted truncate mt-0.5">
                {targetUser.about}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
            {error}
          </div>
        )}

        {/* Optional Nickname input */}
        <div>
          <label
            htmlFor="aliasName"
            className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1"
          >
            Custom Nickname / Alias (Optional)
          </label>
          <input
            id="aliasName"
            type="text"
            value={aliasName}
            onChange={(e) => setAliasName(e.target.value)}
            placeholder={`e.g. ${targetUser.displayName} (Work)`}
            maxLength={100}
            className="w-full px-3.5 py-2.5 sm:py-2 rounded-lg bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-wa-light-border dark:border-wa-dark-border text-base sm:text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted focus:outline-none focus:ring-1 focus:ring-wa-green transition-all"
            autoFocus
          />
          <p className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted mt-1">
            This name will be visible only to you in your address book.
          </p>
        </div>

        {/* Dialog Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-wa-light-border dark:border-wa-dark-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 sm:py-2 min-h-[38px] rounded-lg text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2.5 sm:py-2 min-h-[38px] rounded-lg bg-wa-green hover:bg-wa-green-dark text-white text-xs font-medium flex items-center gap-1.5 shadow transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Save Contact</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
