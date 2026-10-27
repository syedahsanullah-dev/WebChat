'use client';

import React, { useState } from 'react';
import { MaintenanceState } from '@shared/types';
import { Wrench, ShieldAlert, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface MaintenanceToggleCardProps {
  initialState: MaintenanceState;
  onStateChange?: (state: MaintenanceState) => void;
}

export default function MaintenanceToggleCard({
  initialState,
  onStateChange,
}: MaintenanceToggleCardProps) {
  const [state, setState] = useState<MaintenanceState>(initialState);
  const [reason, setReason] = useState<string>(
    initialState.reason || 'WebChat is undergoing scheduled database and server maintenance.'
  );
  const [estimatedEnd, setEstimatedEnd] = useState<string>(
    initialState.estimatedEnd
      ? new Date(initialState.estimatedEnd).toISOString().slice(0, 16)
      : ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const handleToggle = async (enable: boolean) => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/maintenance/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: enable,
          reason: reason.trim(),
          estimatedEnd: estimatedEnd ? new Date(estimatedEnd).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update maintenance state');
      }

      setState(data.state);
      if (onStateChange) onStateChange(data.state);

      setSuccessMsg(
        enable
          ? 'Maintenance mode ENABLED. Non-admin users have been disconnected and redirected.'
          : 'Maintenance mode DISABLED. Regular user traffic has been restored.'
      );
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsLoading(false);
      setConfirmModalOpen(false);
    }
  };

  return (
    <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#e9edef] dark:border-white/10">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              state.enabled
                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                : 'bg-[#00a884]/15 text-[#00a884] border border-[#00a884]/30'
            }`}
          >
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              System Maintenance Mode
            </h2>
            <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              Redirects non-admin traffic to public maintenance page & drops active WebSockets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              state.enabled
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {state.enabled ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>MAINTENANCE ACTIVE</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SYSTEM ONLINE</span>
              </>
            )}
          </span>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              if (!state.enabled) {
                setConfirmModalOpen(true);
              } else {
                handleToggle(false);
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
              state.enabled
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
            }`}
          >
            {isLoading
              ? 'Updating...'
              : state.enabled
              ? 'Disable Maintenance'
              : 'Enable Maintenance'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1.5">
            Public Maintenance Notice / Reason
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={state.enabled}
            placeholder="WebChat is currently undergoing scheduled platform upgrades..."
            className="w-full text-xs p-3 rounded-xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-hidden focus:border-[#00a884] transition-colors disabled:opacity-60"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1.5">
              Estimated Completion Time (Optional Countdown)
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={estimatedEnd}
                onChange={(e) => setEstimatedEnd(e.target.value)}
                disabled={state.enabled}
                className="w-full text-xs p-2.5 rounded-xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-hidden focus:border-[#00a884] transition-colors disabled:opacity-60"
              />
            </div>
            <p className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted mt-1">
              Users viewing the splash page will see a live countdown ticking down to this time.
            </p>
          </div>

          {state.updatedBy && (
            <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              <span>Last updated by: </span>
              <span className="font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                @{state.updatedBy}
              </span>
              {state.updatedAt && (
                <span className="ml-2">({new Date(state.updatedAt).toLocaleString()})</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-base text-wa-light-text-primary dark:text-wa-dark-text-primary">
                Activate Maintenance Mode?
              </h3>
            </div>
            <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary leading-relaxed">
              Activating maintenance mode will immediately disconnect all active WebSocket clients for non-admin users with code <strong>4003 (Service Unavailable)</strong>, and redirect all regular user page visits to <code>/maintenance</code>.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggle(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                Confirm & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
