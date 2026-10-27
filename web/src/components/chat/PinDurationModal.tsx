'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Pin, Loader2 } from 'lucide-react';
import { useWebSocket } from '@/context/WebSocketContext';

export interface PinDurationModalProps {
  isOpen: boolean;
  chatId: string;
  messageId: string;
  onClose: () => void;
  onPinned?: () => void;
}

export default function PinDurationModal({
  isOpen,
  chatId,
  messageId,
  onClose,
  onPinned,
}: PinDurationModalProps) {
  const { send } = useWebSocket();
  const [durationDays, setDurationDays] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePin = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fast WebSocket dispatch
      send({
        type: 'chat:pin',
        payload: {
          chatId,
          messageId,
          durationSeconds: durationDays * 86400,
        },
      });

      // REST persistence
      const res = await fetch(`/api/chats/${chatId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          durationDays,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to pin message');
      }

      if (onPinned) onPinned();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to pin message');
    } finally {
      setLoading(false);
    }
  };

  const options = [
    { label: '24 Hours', value: 1 },
    { label: '7 Days', value: 7, isDefault: true },
    { label: '30 Days', value: 30 },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pin message" maxWidth="sm">
      <div className="space-y-4 py-1 select-none text-wa-light-text-primary dark:text-wa-dark-text-primary">
        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
          Choose how long your pin lasts. You can unpin at any time. Max 3 pinned messages per chat.
        </p>

        {error && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                durationDays === opt.value
                  ? 'border-[#00a884] bg-[#00a884]/10 text-[#00a884] font-semibold'
                  : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="pinDuration"
                  value={opt.value}
                  checked={durationDays === opt.value}
                  onChange={() => setDurationDays(opt.value)}
                  className="accent-[#00a884] cursor-pointer"
                />
                <span className="text-xs sm:text-sm">{opt.label}</span>
              </div>
              {opt.isDefault && (
                <span className="text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted font-normal uppercase">
                  Default
                </span>
              )}
            </label>
          ))}
        </div>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePin}
            disabled={loading}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Pinning...</span>
              </>
            ) : (
              <>
                <Pin className="w-3.5 h-3.5" />
                <span>Pin</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
