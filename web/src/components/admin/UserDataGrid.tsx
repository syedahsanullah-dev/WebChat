'use client';

import React from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import RoleBadge from './RoleBadge';
import { AdminUserView } from '@shared/types';
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Smartphone,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UserDataGridProps {
  users: AdminUserView[];
  loading?: boolean;
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onOpenRoleModal: (user: AdminUserView) => void;
  onOpenSuspendModal?: (user: AdminUserView) => void;
  onOpenUnsuspendModal?: (user: AdminUserView) => void;
}

export default function UserDataGrid({
  users,
  loading = false,
  currentPage,
  totalPages,
  totalUsers,
  limit,
  onPageChange,
  onLimitChange,
  onOpenRoleModal,
  onOpenSuspendModal,
  onOpenUnsuspendModal,
}: UserDataGridProps) {
  if (users.length === 0 && !loading) {
    return (
      <div className="rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/10 text-wa-light-text-muted mx-auto flex items-center justify-center mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h5 className="text-base font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
          No Users Found
        </h5>
        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1">
          No user accounts matched the given search query and filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] shadow-xs overflow-hidden flex flex-col">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50/80 dark:bg-white/5 border-b border-[#e9edef] dark:border-white/10 text-wa-light-text-secondary dark:text-wa-dark-text-secondary font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3.5">User</th>
              <th className="p-3.5">Email</th>
              <th className="p-3.5">System Role</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-center">Activity</th>
              <th className="p-3.5">Registered</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9edef] dark:divide-white/5">
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
              >
                {/* User Column */}
                <td className="p-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={user.displayName || user.username}
                      src={user.avatarUrl}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary truncate flex items-center gap-1.5">
                        <span>{user.displayName}</span>
                        {user.isOnline && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Online" />
                        )}
                      </div>
                      <div className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted truncate">
                        @{user.username}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Email Column */}
                <td className="p-3.5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary font-mono text-[11px]">
                  {user.email}
                </td>

                {/* Role Column */}
                <td className="p-3.5">
                  <RoleBadge role={user.systemRole} />
                </td>

                {/* Status Column */}
                <td className="p-3.5">
                  {user.isSuspended ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/20 px-2 py-0.5 rounded-full">
                      <XCircle className="w-3 h-3" />
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </td>

                {/* Activity Stats */}
                <td className="p-3.5 text-center">
                  <div className="flex items-center justify-center gap-3 text-wa-light-text-muted dark:text-wa-dark-text-muted">
                    <span className="inline-flex items-center gap-1 text-[11px]" title="Messages Sent">
                      <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                      <span className="font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                        {user._count?.sentMessages || 0}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px]" title="Active Sessions">
                      <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                        {user._count?.sessions || 0}
                      </span>
                    </span>
                  </div>
                </td>

                {/* Registered Date */}
                <td className="p-3.5 text-wa-light-text-muted dark:text-wa-dark-text-muted text-[11px]">
                  {new Date(user.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>

                {/* Actions Column */}
                <td className="p-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onOpenRoleModal(user)}
                      type="button"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e9edef] dark:border-white/10 hover:border-[#00a884] text-[11px] font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary hover:bg-[#00a884]/10 transition-colors"
                      title="Change Role"
                    >
                      <Shield className="w-3 h-3 text-[#00a884]" />
                      <span>Role</span>
                    </button>

                    <Link
                      href={`/admin/users/${user.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e9edef] dark:border-white/10 hover:border-sky-500 text-[11px] font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary hover:bg-sky-500/10 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-3 h-3 text-sky-500" />
                      <span>Details</span>
                    </Link>

                    {user.isSuspended ? (
                      <button
                        onClick={() => onOpenUnsuspendModal?.(user)}
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e9edef] dark:border-white/10 hover:border-emerald-500 text-[11px] font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary hover:bg-emerald-500/10 transition-colors"
                        title="Reactivate Account"
                      >
                        <UserCheck className="w-3 h-3 text-emerald-500" />
                        <span>Unsuspend</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenSuspendModal?.(user)}
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#e9edef] dark:border-white/10 hover:border-rose-500 text-[11px] font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary hover:bg-rose-500/10 transition-colors"
                        title="Suspend Account"
                      >
                        <ShieldAlert className="w-3 h-3 text-rose-500" />
                        <span>Suspend</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-[#e9edef] dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50 dark:bg-white/5">
        <div className="flex items-center gap-2 text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
          <span>Show:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="text-xs py-1 px-2 rounded-lg border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] text-wa-light-text-primary dark:text-wa-dark-text-primary cursor-pointer"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <span className="text-wa-light-text-muted">
            &bull; Showing {users.length > 0 ? (currentPage - 1) * limit + 1 : 0} to{' '}
            {Math.min(currentPage * limit, totalUsers)} of {totalUsers} users
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            type="button"
            className="p-1.5 rounded-lg border border-[#e9edef] dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-wa-light-text-primary dark:text-wa-dark-text-primary" />
          </button>

          <span className="text-xs font-semibold px-2 text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Page {currentPage} of {totalPages || 1}
          </span>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            type="button"
            className="p-1.5 rounded-lg border border-[#e9edef] dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-wa-light-text-primary dark:text-wa-dark-text-primary" />
          </button>
        </div>
      </div>
    </div>
  );
}
