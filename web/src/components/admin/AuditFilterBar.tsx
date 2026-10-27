'use client';

import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

interface AuditFilterBarProps {
  action: string;
  onActionChange: (action: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  onReset: () => void;
}

const ACTION_OPTIONS = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'AUTH_LOGIN', label: 'Login (AUTH_LOGIN)' },
  { value: 'AUTH_LOGOUT', label: 'Logout (AUTH_LOGOUT)' },
  { value: 'SESSION_REVOKED', label: 'Session Revoked' },
  { value: 'USER_ROLE_ELEVATED', label: 'Role Changed' },
  { value: 'USER_SUSPENDED', label: 'User Suspended' },
  { value: 'DLP_VIOLATION_BLOCKED', label: 'DLP Blocked' },
  { value: 'LEGAL_HOLD_ENABLED', label: 'Legal Hold Enabled' },
  { value: 'LEGAL_HOLD_DISABLED', label: 'Legal Hold Disabled' },
  { value: 'CHAT_EXPORT_DOWNLOADED', label: 'Export Downloaded' },
  { value: 'GLOBAL_BROADCAST_CREATED', label: 'Broadcast Created' },
  { value: 'MAINTENANCE_TOGGLED', label: 'Maintenance Toggled' },
  { value: 'ORPHAN_FILES_PURGED', label: 'Orphan Purge' },
];

export default function AuditFilterBar({
  action,
  onActionChange,
  search,
  onSearchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  onReset,
}: AuditFilterBarProps) {
  return (
    <div className="p-3 bg-wa-light-sidebar-bg dark:bg-wa-dark-sidebar-bg border border-wa-light-border dark:border-wa-dark-border rounded-xl space-y-3 shadow-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-wa-light-text-muted dark:text-wa-dark-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search action, IP, username..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg border border-wa-light-border dark:border-wa-dark-border rounded-lg focus:outline-hidden focus:border-wa-green text-wa-light-text-primary dark:text-wa-dark-text-primary"
          />
        </div>

        {/* Action Type Dropdown */}
        <div className="relative">
          <select
            value={action}
            onChange={(e) => onActionChange(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg border border-wa-light-border dark:border-wa-dark-border rounded-lg focus:outline-hidden focus:border-wa-green text-wa-light-text-primary dark:text-wa-dark-text-primary"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg border border-wa-light-border dark:border-wa-dark-border rounded-lg focus:outline-hidden focus:border-wa-green text-wa-light-text-primary dark:text-wa-dark-text-primary"
            title="Start Date"
          />
        </div>

        {/* End Date & Reset Button */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg border border-wa-light-border dark:border-wa-dark-border rounded-lg focus:outline-hidden focus:border-wa-green text-wa-light-text-primary dark:text-wa-dark-text-primary"
            title="End Date"
          />
          <button
            type="button"
            onClick={onReset}
            className="p-2 rounded-lg border border-wa-light-border dark:border-wa-dark-border hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover text-wa-light-text-secondary dark:text-wa-dark-text-secondary"
            title="Reset Filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
