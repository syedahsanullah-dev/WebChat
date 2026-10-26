'use client';

import React, { useState } from 'react';
import { Megaphone, AlertTriangle, AlertOctagon, CheckCircle2, XCircle, StopCircle } from 'lucide-react';

export interface SystemBroadcastItem {
  id: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  creator?: {
    id: string;
    username: string;
    displayName?: string;
  };
}

interface BroadcastHistoryTableProps {
  broadcasts: SystemBroadcastItem[];
  onDeactivate: (id: string) => Promise<void>;
}

export default function BroadcastHistoryTable({
  broadcasts,
  onDeactivate,
}: BroadcastHistoryTableProps) {
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this broadcast across all client screens?')) return;
    setDeactivatingId(id);
    try {
      await onDeactivate(id);
    } finally {
      setDeactivatingId(null);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertOctagon className="w-3 h-3" />
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3" />
            WARNING
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Megaphone className="w-3 h-3" />
            INFO
          </span>
        );
    }
  };

  return (
    <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f0f2f5] dark:bg-[#111b21] text-wa-light-text-secondary dark:text-wa-dark-text-secondary uppercase text-[10px] tracking-wider border-b border-[#e9edef] dark:border-white/10">
            <tr>
              <th className="py-3 px-4 font-semibold">Severity</th>
              <th className="py-3 px-4 font-semibold">Message Content</th>
              <th className="py-3 px-4 font-semibold">Author</th>
              <th className="py-3 px-4 font-semibold">Dispatched At</th>
              <th className="py-3 px-4 font-semibold">Expires At</th>
              <th className="py-3 px-4 font-semibold text-center">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9edef] dark:divide-white/5">
            {broadcasts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-wa-light-text-secondary">
                  No broadcasts recorded yet.
                </td>
              </tr>
            ) : (
              broadcasts.map((b) => {
                const isDeactivating = deactivatingId === b.id;
                const isExpired = b.expiresAt ? new Date(b.expiresAt) < new Date() : false;
                const isLive = b.isActive && !isExpired;

                return (
                  <tr
                    key={b.id}
                    className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">{getSeverityBadge(b.severity)}</td>
                    <td className="py-3 px-4 max-w-xs font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
                      {b.message}
                    </td>
                    <td className="py-3 px-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                      {b.creator?.displayName || (b.creator ? `@${b.creator.username}` : 'System')}
                    </td>
                    <td className="py-3 px-4 text-wa-light-text-secondary">
                      {new Date(b.createdAt).toLocaleDateString()} {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-wa-light-text-secondary">
                      {b.expiresAt
                        ? `${new Date(b.expiresAt).toLocaleDateString()} ${new Date(b.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'Indefinite'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          <XCircle className="w-3 h-3" />
                          {isExpired ? 'Expired' : 'Dismissed'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isLive && (
                        <button
                          type="button"
                          disabled={isDeactivating}
                          onClick={() => handleDeactivate(b.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50"
                        >
                          <StopCircle className="w-3.5 h-3.5" />
                          <span>Deactivate</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
