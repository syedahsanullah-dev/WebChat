'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useWebPush } from '@/hooks/useWebPush';

const DISMISS_KEY = 'webchat_push_banner_dismissed';

export default function PushPermissionBanner() {
  const { isSupported, permission, isSubscribed, isLoading, subscribeToPush } = useWebPush();
  const [dismissed, setDismissed] = useState<boolean>(true);
  const [subscribing, setSubscribing] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isDismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    setDismissed(isDismissed);
  }, []);

  // Only show if supported, not already subscribed, permission is default, and user hasn't dismissed
  if (!isSupported || isSubscribed || permission !== 'default' || dismissed || isLoading) {
    return null;
  }

  const handleEnable = async () => {
    setSubscribing(true);
    try {
      const success = await subscribeToPush();
      if (!success) {
        setDismissed(true);
      }
    } finally {
      setSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISS_KEY, 'true');
    }
  };

  return (
    <div className="bg-[#182229] border-b border-[#222e35] px-4 py-2.5 flex items-center justify-between gap-3 text-sm text-[#e9edef] animate-in fade-in duration-200">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-[#00a884]/20 flex items-center justify-center flex-shrink-0 text-[#00a884]">
          <Bell className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-xs sm:text-sm truncate">Get notified of new messages</p>
          <p className="text-[11px] sm:text-xs text-[#8696a0] truncate">
            Turn on desktop notifications to stay alerted even when tabs are closed
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleEnable}
          disabled={subscribing}
          className="px-3 py-1 bg-[#00a884] hover:bg-[#008f6f] text-[#111b21] font-medium text-xs rounded-md transition-colors disabled:opacity-50"
        >
          {subscribing ? 'Enabling...' : 'Turn on'}
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-[#8696a0] hover:text-[#e9edef] transition-colors rounded"
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
