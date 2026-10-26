'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Eye, Volume2, ShieldAlert } from 'lucide-react';
import { useWebPush } from '@/hooks/useWebPush';

export interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const { isSupported, isSubscribed, permission, isLoading, subscribeToPush, unsubscribeFromPush } =
    useWebPush();

  const [messagePreview, setMessagePreview] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const previewPref = localStorage.getItem('webchat_pref_message_preview');
    if (previewPref !== null) setMessagePreview(previewPref === 'true');

    const soundPref = localStorage.getItem('webchat_pref_sound_enabled');
    if (soundPref !== null) setSoundEnabled(soundPref === 'true');
  }, []);

  if (!isOpen) return null;

  const handleTogglePush = async () => {
    setActionLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribeFromPush();
      } else {
        await subscribeToPush();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePreview = () => {
    const nextVal = !messagePreview;
    setMessagePreview(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('webchat_pref_message_preview', String(nextVal));
    }
  };

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('webchat_pref_sound_enabled', String(nextVal));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-wa-light-bg-sidebar dark:bg-wa-dark-bg-sidebar h-full flex flex-col shadow-2xl border-r border-wa-light-border dark:border-wa-dark-border">
        {/* Header */}
        <div className="h-16 bg-wa-light-bg-header dark:bg-wa-dark-bg-header px-4 flex items-center gap-3 border-b border-wa-light-border dark:border-wa-dark-border">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-wa-light-text-secondary dark:text-wa-dark-text-secondary transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Notifications
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Permission warning if denied */}
          {permission === 'denied' && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3 text-xs text-amber-300">
              <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-200">Notifications are blocked</p>
                <p className="mt-0.5 opacity-90">
                  You blocked notifications in browser site settings. Click the lock/info icon in your URL bar to allow notifications.
                </p>
              </div>
            </div>
          )}

          {/* Master Push Toggle */}
          <div className="bg-wa-light-bg-primary dark:bg-wa-dark-bg-primary p-4 rounded-xl border border-wa-light-border dark:border-wa-dark-border flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#00a884]/15 text-[#00a884] mt-0.5">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
                  Desktop & Mobile Push
                </h3>
                <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-0.5">
                  Receive background alerts even when browser tabs or app are closed
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={isSubscribed}
                onChange={handleTogglePush}
                disabled={actionLoading || isLoading || permission === 'denied' || !isSupported}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884] disabled:opacity-50"></div>
            </label>
          </div>

          {/* Message Preview Toggle */}
          <div className="bg-wa-light-bg-primary dark:bg-wa-dark-bg-primary p-4 rounded-xl border border-wa-light-border dark:border-wa-dark-border flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400 mt-0.5">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
                  Show Message Preview
                </h3>
                <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-0.5">
                  Display sender name and message snippet in push notifications
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={messagePreview}
                onChange={handleTogglePreview}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
            </label>
          </div>

          {/* Sound Toggle */}
          <div className="bg-wa-light-bg-primary dark:bg-wa-dark-bg-primary p-4 rounded-xl border border-wa-light-border dark:border-wa-dark-border flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 mt-0.5">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
                  Notification Sounds
                </h3>
                <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-0.5">
                  Play subtle chimes for incoming messages and incoming calls
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={handleToggleSound}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
