'use client';

import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { SystemRole } from '@shared/types';

export interface UserFilterToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  totalUsers?: number;
  onReset: () => void;
}

export default function UserFilterToolbar({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  totalUsers,
  onReset,
}: UserFilterToolbarProps) {
  const hasActiveFilters = search.trim() !== '' || roleFilter !== 'ALL' || statusFilter !== 'ALL';

  return (
    <div className="rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] p-4 shadow-xs space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-wa-light-text-muted dark:text-wa-dark-text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by @username, display name, or email..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#e9edef] dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted dark:placeholder:text-wa-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#00a884]/30 focus:border-[#00a884]"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-wa-light-text-muted hover:text-wa-light-text-primary"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-wa-light-text-muted dark:text-wa-dark-text-muted hidden sm:block" />
            <select
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-[#e9edef] dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:ring-2 focus:ring-[#00a884]/30 cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="USER">User</option>
              <option value="MODERATOR">Moderator</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-[#e9edef] dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:ring-2 focus:ring-[#00a884]/30 cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-xs px-2.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-medium transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Counter subheader */}
      {totalUsers !== undefined && (
        <div className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted flex items-center justify-between">
          <span>
            Showing results matching criteria: <strong className="text-wa-light-text-primary dark:text-wa-dark-text-primary">{totalUsers}</strong> user{totalUsers !== 1 ? 's' : ''} found
          </span>
        </div>
      )}
    </div>
  );
}
