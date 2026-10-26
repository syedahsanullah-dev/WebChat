'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import RoleBadge from './RoleBadge';
import { SystemRole } from '@shared/types';
import { canManageRole, ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/lib/rbac';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    username: string;
    displayName: string;
    systemRole: SystemRole;
  } | null;
  actorRole: SystemRole;
  onSave: (userId: string, newRole: SystemRole, reason: string) => Promise<void>;
}

const ROLES: SystemRole[] = ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'];

export default function ChangeRoleModal({
  isOpen,
  onClose,
  targetUser,
  actorRole,
  onSave,
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState<SystemRole>('USER');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (targetUser) {
      setSelectedRole(targetUser.systemRole);
      setReason('');
      setError(null);
    }
  }, [targetUser, isOpen]);

  if (!targetUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 4) {
      setError('A valid audit reason is required (minimum 4 characters).');
      return;
    }

    if (selectedRole === targetUser.systemRole) {
      setError('Please select a different role to change.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSave(targetUser.id, selectedRole, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update user role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      maxWidth="md"
      title={`Change System Role for @${targetUser.username}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User Summary Card */}
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-[#e9edef] dark:border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary block">
              {targetUser.displayName}
            </span>
            <span className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted">
              @{targetUser.username}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted">Current:</span>
            <RoleBadge role={targetUser.systemRole} />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Role Options */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary block">
            Select New System Role:
          </label>

          <div className="space-y-2">
            {ROLES.map((role) => {
              const isAllowed = canManageRole(actorRole, role);
              const isSelected = selectedRole === role;

              return (
                <label
                  key={role}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer',
                    isSelected
                      ? 'border-[#00a884] bg-[#00a884]/5 dark:bg-[#00a884]/10'
                      : 'border-[#e9edef] dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5',
                    !isAllowed && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                  )}
                >
                  <input
                    type="radio"
                    name="systemRole"
                    value={role}
                    checked={isSelected}
                    disabled={!isAllowed || loading}
                    onChange={() => setSelectedRole(role)}
                    className="mt-1 text-[#00a884] focus:ring-[#00a884]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                        {ROLE_LABELS[role]}
                      </span>
                      <RoleBadge role={role} size="sm" />
                      {!isAllowed && (
                        <span className="text-[10px] text-rose-500 font-medium">
                          (Requires higher privilege)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-0.5 leading-snug">
                      {ROLE_DESCRIPTIONS[role]}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Mandatory Reason Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary flex items-center justify-between">
            <span>Mandatory Audit Justification</span>
            <span className="text-[10px] text-wa-light-text-muted">Recorded in audit_logs</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            rows={2}
            placeholder="e.g. Assigned Moderator privileges for abuse queue management"
            className="w-full p-2.5 text-xs rounded-xl border border-[#e9edef] dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted focus:outline-none focus:ring-2 focus:ring-[#00a884]/30 focus:border-[#00a884]"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e9edef] dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading || selectedRole === targetUser.systemRole || !canManageRole(actorRole, selectedRole)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00a884] hover:bg-[#008f6f] text-white shadow-xs transition-all disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Save Role Delegation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
