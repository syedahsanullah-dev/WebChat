'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, RefreshCw, Radio } from 'lucide-react';
import BroadcastComposer from '@/components/admin/BroadcastComposer';
import BroadcastHistoryTable, { SystemBroadcastItem } from '@/components/admin/BroadcastHistoryTable';

export default function AdminBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<SystemBroadcastItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBroadcasts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/broadcasts');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch broadcasts');
      }
      setBroadcasts(data.broadcasts || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to deactivate broadcast');
      }
      setBroadcasts((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isActive: false } : b))
      );
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const activeBroadcast = broadcasts.find(
    (b) => b.isActive && (!b.expiresAt || new Date(b.expiresAt) > new Date())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00a884]/10 text-[#00a884] flex items-center justify-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Real-Time Global System Broadcasts
            </h1>
          </div>
          <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1">
            Publish platform announcements, maintenance notices, and urgent alerts across 100% of connected clients in &lt; 50ms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeBroadcast && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <Radio className="w-4 h-4 animate-pulse text-emerald-600" />
              <span>1 Live Broadcast Active</span>
            </div>
          )}
          <button
            type="button"
            onClick={fetchBroadcasts}
            disabled={isLoading}
            className="p-2 rounded-lg bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 text-wa-light-text-secondary hover:text-wa-light-text-primary transition-colors"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Composer Card */}
      <BroadcastComposer onBroadcastCreated={fetchBroadcasts} />

      {/* History Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Broadcast History &amp; Delivery Log
          </h2>
          <span className="text-xs text-wa-light-text-secondary">
            {broadcasts.length} past announcements recorded
          </span>
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-xs text-wa-light-text-secondary">
            <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading broadcast dispatch records...
          </div>
        ) : (
          <BroadcastHistoryTable
            broadcasts={broadcasts}
            onDeactivate={handleDeactivate}
          />
        )}
      </div>
    </div>
  );
}
