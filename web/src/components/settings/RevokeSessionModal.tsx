'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import { DeviceSessionItem } from './DeviceCard';
import { AlertTriangle, LogOut } from 'lucide-react';

export interface RevokeSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  session: DeviceSessionItem | null;
  isRevokingAll?: boolean;
  isProcessing?: boolean;
}

export default function RevokeSessionModal({
  isOpen,
  onClose,
  onConfirm,
  session,
  isRevokingAll = false,
  isProcessing = false,
}: RevokeSessionModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isRevokingAll ? 'Log out from all other devices?' : 'Log out from this device?'}
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-medium leading-relaxed">
            {isRevokingAll
              ? 'This will immediately disconnect and log out all active sessions on your account except this current browser.'
              : session
              ? `You will immediately terminate the session for ${session.browser} on ${session.os} (${session.ipAddress}).`
              : 'You will immediately terminate this remote session.'}
          </p>
        </div>

        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary leading-normal">
          Any unsaved drafts on that device will be lost, and the user must sign back in with their password.
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isProcessing ? 'Logging out...' : 'Log out'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
