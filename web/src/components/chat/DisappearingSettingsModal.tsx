'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useWebSocket } from '@/context/WebSocketContext';
import { useAuth } from '@/context/AuthContext';
import { EPHEMERAL_DURATIONS, EphemeralDurationValue } from '@/lib/ephemeralUtils';
import { Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DisappearingSettingsModalProps {
  isOpen: boolean;
  chatId: string;
  currentDuration?: EphemeralDurationValue | number | null;
  onClose: () => void;
  onSaved?: (newDuration: EphemeralDurationValue) => void;
}

export default function DisappearingSettingsModal({
  isOpen,
  chatId,
  currentDuration = null,
  onClose,
  onSaved,
}: DisappearingSettingsModalProps) {
  const { send } = useWebSocket();
  const { user } = useAuth();
  const initialDuration =
    currentDuration === 86400 || currentDuration === 604800 || currentDuration === 7776000
      ? currentDuration
      : null;
  const [selectedDuration, setSelectedDuration] = useState<EphemeralDurationValue>(initialDuration);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const res = await fetch(`/api/chats/${chatId}/ephemeral`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: selectedDuration }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update disappearing messages settings');
      }

      const data = await res.json();

      // Broadcast update over WebSocket for real-time peer sync
      send({
        type: 'chat:ephemeral_update',
        payload: {
          chatId,
          duration: data.ephemeralDuration,
          updatedBy: {
            userId: user?.id || '',
            username: user?.username || 'You',
            displayName: user?.displayName || user?.username,
          },
        },
      });

      onSaved?.(data.ephemeralDuration);
      onClose();
    } catch (err: any) {
      console.error('[DisappearingSettingsModal] Save error:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Disappearing messages" maxWidth="sm">
      <div className="space-y-4 py-2 select-none">
        {/* Top Illustration / Icon Banner */}
        <div className="flex flex-col items-center text-center pb-2 border-b border-black/5 dark:border-white/5">
          <div className="w-14 h-14 rounded-full bg-[#00a884]/15 flex items-center justify-center text-[#00a884] mb-3">
            <Clock className="w-7 h-7" />
          </div>
          <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary leading-relaxed max-w-xs">
            When turned on, new messages in this chat will disappear after the selected duration.
            Existing messages won't be affected.
          </p>
        </div>

        {/* Radio Option Selector */}
        <div className="space-y-2">
          {EPHEMERAL_DURATIONS.map((opt) => {
            const isSelected = selectedDuration === opt.value;
            return (
              <label
                key={String(opt.value)}
                onClick={() => setSelectedDuration(opt.value as EphemeralDurationValue)}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer',
                  isSelected
                    ? 'border-[#00a884] bg-[#00a884]/10 text-wa-light-text-primary dark:text-white'
                    : 'border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary'
                )}
              >
                <div>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted mt-0.5">
                    {opt.description}
                  </p>
                </div>

                <div
                  className={cn(
                    'w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ml-3',
                    isSelected
                      ? 'border-[#00a884] bg-[#00a884] text-white'
                      : 'border-wa-light-text-muted dark:border-wa-dark-text-muted'
                  )}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </label>
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-rose-500 font-medium text-center">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 rounded-xl text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#00a884] hover:bg-[#00a884]/90 text-white font-medium text-sm transition-colors shadow-xs cursor-pointer flex items-center justify-center"
          >
            {isSaving ? 'Saving...' : 'Done'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
