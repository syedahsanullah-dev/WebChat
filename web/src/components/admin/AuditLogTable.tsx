'use client';

import React from 'react';
import Avatar from '@/components/ui/Avatar';
import { Eye, Shield, Lock, Users, AlertTriangle, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditLogTableProps {
  logs: any[];
  onViewDetails: (log: any) => void;
}

export default function AuditLogTable({ logs, onViewDetails }: AuditLogTableProps) {
  const getActionBadge = (action: string) => {
    if (action.startsWith('AUTH_') || action.includes('PASSWORD')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
    if (action.includes('SUSPEND') || action.includes('DLP') || action.includes('BLOCK')) {
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    }
    if (action.includes('LEGAL_HOLD') || action.includes('PURGE')) {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
    if (action.includes('ROLE') || action.includes('ADMIN') || action.includes('GROUP')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    }
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  };

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-wa-light-text-muted dark:text-wa-dark-text-muted">
        <Shield className="w-10 h-10 opacity-30 mb-2" />
        <p className="text-sm font-medium">No audit events match current filters</p>
        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1">
          Try adjusting your search criteria or date range
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg text-wa-light-text-secondary dark:text-wa-dark-text-secondary border-b border-wa-light-border dark:border-wa-dark-border select-none">
          <tr>
            <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[11px]">Timestamp</th>
            <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[11px]">Actor</th>
            <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[11px]">Action</th>
            <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[11px]">Resource</th>
            <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[11px]">IP Address</th>
            <th className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[11px] text-right">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-wa-light-border dark:divide-wa-dark-border">
          {logs.map((log) => {
            const date = new Date(log.createdAt);
            const timeStr = date.toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <tr
                key={log.id}
                className="hover:bg-wa-light-hover/60 dark:hover:bg-wa-dark-hover/60 transition-colors"
              >
                <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                  {timeStr}
                </td>
                <td className="py-2 px-3 whitespace-nowrap">
                  {log.user ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar
                        name={log.user.displayName || log.user.username}
                        src={log.user.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <span className="font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary block truncate max-w-[120px]">
                          {log.user.displayName}
                        </span>
                        <span className="text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted font-mono block">
                          @{log.user.username}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-wa-light-text-muted dark:text-wa-dark-text-muted">
                      <Database className="w-3 h-3" />
                      <span>SYSTEM</span>
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 whitespace-nowrap">
                  <span
                    className={cn(
                      'inline-block px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold border',
                      getActionBadge(log.action)
                    )}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-wa-light-text-primary dark:text-wa-dark-text-primary">
                  {log.resource}
                </td>
                <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                  {log.ipAddress || '127.0.0.1'}
                </td>
                <td className="py-2 px-3 whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => onViewDetails(log)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg border border-wa-light-border dark:border-wa-dark-border hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover text-wa-light-text-primary dark:text-wa-dark-text-primary cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
