'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DeviceCard, { DeviceSessionItem } from './DeviceCard';
import RevokeSessionModal from './RevokeSessionModal';
import { ArrowLeft, Laptop, ShieldCheck, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LinkedDevicesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export default function LinkedDevicesDrawer({
  isOpen,
  onClose,
  className,
}: LinkedDevicesDrawerProps) {
  const [sessions, setSessions] = useState<DeviceSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSessionForRevoke, setSelectedSessionForRevoke] = useState<DeviceSessionItem | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/sessions', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Failed to load active device sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, fetchSessions]);

  const handleRevokeSingle = async () => {
    if (!selectedSessionForRevoke) return;
    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/auth/sessions/${selectedSessionForRevoke.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== selectedSessionForRevoke.id));
        setSelectedSessionForRevoke(null);
      }
    } catch (err) {
      console.error('Error revoking device session:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRevokeAllOther = async () => {
    setIsProcessingAction(true);
    try {
      const res = await fetch('/api/auth/sessions', {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        setIsRevokingAll(false);
      }
    } catch (err) {
      console.error('Error revoking all other sessions:', err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-[100dvh] w-full md:w-[40%] md:min-w-[300px] md:max-w-[380px] lg:w-[33%] lg:min-w-[340px] lg:max-w-[450px] xl:w-[30%] xl:max-w-[500px] bg-wa-light-bg dark:bg-wa-dark-bg text-wa-light-text-primary dark:text-wa-dark-text-primary flex flex-col shadow-2xl transition-transform duration-300 ease-in-out border-r border-wa-light-border dark:border-wa-dark-border',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        {/* Drawer Header */}
        <div className="h-[60px] bg-wa-light-header dark:bg-wa-dark-header px-4 flex items-center gap-4 flex-shrink-0 border-b border-wa-light-border dark:border-wa-dark-border">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary transition-colors focus:outline-none cursor-pointer"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-base sm:text-lg">Linked devices</h2>
          <div className="ml-auto">
            <button
              type="button"
              onClick={fetchSessions}
              disabled={isLoading}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary transition-colors"
              title="Refresh device sessions"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin text-wa-green')} />
            </button>
          </div>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          {/* Top Hero Banner */}
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-wa-green/10 border border-wa-green/20">
            <div className="w-16 h-16 rounded-full bg-wa-green/20 flex items-center justify-center text-wa-green mb-3">
              <Laptop className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-base text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Multi-Device WebChat
            </h3>
            <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1 max-w-[280px] leading-relaxed">
              Log into your WebChat account across browsers, tablets, and phones simultaneously with real-time sync.
            </p>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] font-medium text-wa-green">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero-friction cryptographic session tokens</span>
            </div>
          </div>

          {/* Current Device Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-wa-light-text-muted dark:text-wa-dark-text-muted px-1">
              Current Device
            </h4>
            {isLoading && !currentSession ? (
              <div className="flex items-center justify-center py-6 text-wa-light-text-muted">
                <Loader2 className="w-5 h-5 animate-spin text-wa-green mr-2" />
                <span className="text-xs">Loading sessions...</span>
              </div>
            ) : currentSession ? (
              <DeviceCard session={currentSession} />
            ) : (
              <div className="p-3 rounded-xl bg-wa-light-input dark:bg-wa-dark-input text-xs text-wa-light-text-muted">
                This browser session is active.
              </div>
            )}
          </div>

          {/* Other Linked Devices Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-wa-light-text-muted dark:text-wa-dark-text-muted">
                Other Linked Devices ({otherSessions.length})
              </h4>
              {otherSessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsRevokingAll(true)}
                  className="text-xs text-red-500 hover:text-red-600 font-semibold hover:underline"
                >
                  Log out all
                </button>
              )}
            </div>

            {isLoading && otherSessions.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-wa-light-text-muted">
                <Loader2 className="w-5 h-5 animate-spin text-wa-green mr-2" />
                <span className="text-xs">Checking other devices...</span>
              </div>
            ) : otherSessions.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-wa-light-border dark:border-wa-dark-border text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
                No other devices are currently logged in to your account.
              </div>
            ) : (
              <div className="space-y-2">
                {otherSessions.map((session) => (
                  <DeviceCard
                    key={session.id}
                    session={session}
                    onRevoke={(s) => setSelectedSessionForRevoke(s)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom Log out from all button if multiple remote sessions */}
          {otherSessions.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsRevokingAll(true)}
                className="w-full py-3 px-4 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out from all other devices</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Confirmation Modals */}
      <RevokeSessionModal
        isOpen={Boolean(selectedSessionForRevoke)}
        onClose={() => setSelectedSessionForRevoke(null)}
        onConfirm={handleRevokeSingle}
        session={selectedSessionForRevoke}
        isProcessing={isProcessingAction}
      />

      <RevokeSessionModal
        isOpen={isRevokingAll}
        onClose={() => setIsRevokingAll(false)}
        onConfirm={handleRevokeAllOther}
        session={null}
        isRevokingAll={true}
        isProcessing={isProcessingAction}
      />
    </>
  );
}
