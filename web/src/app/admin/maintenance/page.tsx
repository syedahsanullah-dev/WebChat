'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wrench, Database, RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';
import MaintenanceToggleCard from '@/components/admin/MaintenanceToggleCard';
import BackupHistoryTable from '@/components/admin/BackupHistoryTable';
import { MaintenanceState, BackupInfo } from '@shared/types';

export default function AdminMaintenancePage() {
  const [maintenanceState, setMaintenanceState] = useState<MaintenanceState>({
    enabled: false,
    reason: '',
    estimatedEnd: null,
  });
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [mRes, bRes] = await Promise.all([
        fetch('/api/maintenance/status'),
        fetch('/api/admin/maintenance/backup'),
      ]);

      if (mRes.ok) {
        const mData = await mRes.json();
        setMaintenanceState(mData);
      }

      if (bRes.ok) {
        const bData = await bRes.json();
        setBackups(bData.backups || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load maintenance data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00a884]/10 text-[#00a884] flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              System Maintenance &amp; Database Backups
            </h1>
          </div>
          <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1">
            Toggle platform maintenance mode with active WebSocket termination and generate instant compressed database backups.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
              maintenanceState.enabled
                ? 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {maintenanceState.enabled ? (
              <>
                <ShieldAlert className="w-4 h-4 animate-pulse" />
                <span>Maintenance In Effect</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>System Production Live</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-lg bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 text-wa-light-text-secondary hover:text-wa-light-text-primary transition-colors cursor-pointer"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-xs text-wa-light-text-secondary">
          <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading system maintenance status and backup archives...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card 1: Maintenance Mode Toggle */}
          <MaintenanceToggleCard
            initialState={maintenanceState}
            onStateChange={setMaintenanceState}
          />

          {/* Card 2: Emergency Database Backups */}
          <BackupHistoryTable initialBackups={backups} />
        </div>
      )}
    </div>
  );
}
