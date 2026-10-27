'use client';

import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react';

interface LegalHoldToggleProps {
  chatId: string;
  initialIsLegalHold: boolean;
  onToggled?: (newState: boolean) => void;
}

export default function LegalHoldToggle({
  chatId,
  initialIsLegalHold,
  onToggled,
}: LegalHoldToggleProps) {
  const [isLegalHold, setIsLegalHold] = useState(initialIsLegalHold);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);

  const handleToggle = async (targetState: boolean) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/chats/${chatId}/legal-hold`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isLegalHold: targetState,
          reason: reason || 'Administrative compliance directive',
        }),
      });

      if (res.ok) {
        setIsLegalHold(targetState);
        setShowPrompt(false);
        setReason('');
        onToggled?.(targetState);
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg border border-wa-light-border dark:border-wa-dark-border rounded-lg space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isLegalHold ? (
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-wa-green" />
          )}
          <span className="font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Legal Hold Status
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!isLegalHold) {
              setShowPrompt(true);
            } else {
              handleToggle(false);
            }
          }}
          disabled={loading}
          className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
            isLegalHold
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30'
              : 'bg-wa-light-hover dark:bg-wa-dark-hover text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary'
          }`}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isLegalHold ? (
            'Disable Hold'
          ) : (
            'Enable Hold'
          )}
        </button>
      </div>

      {showPrompt && !isLegalHold && (
        <div className="pt-2 border-t border-wa-light-border dark:border-wa-dark-border space-y-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for Legal Hold (e.g., Pending litigation, Internal Audit)"
            className="w-full px-2.5 py-1.5 text-xs bg-wa-light-sidebar-bg dark:bg-wa-dark-sidebar-bg border border-wa-light-border dark:border-wa-dark-border rounded-md"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPrompt(false)}
              className="px-2.5 py-1 text-xs text-wa-light-text-muted hover:text-wa-light-text-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleToggle(true)}
              disabled={loading}
              className="px-3 py-1 text-xs font-semibold bg-amber-600 text-white rounded-md hover:bg-amber-700"
            >
              Confirm Hold
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
