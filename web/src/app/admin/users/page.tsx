'use client';

import React, { useState, useEffect, useCallback } from 'react';
import UserFilterToolbar from '@/components/admin/UserFilterToolbar';
import UserDataGrid from '@/components/admin/UserDataGrid';
import ChangeRoleModal from '@/components/admin/ChangeRoleModal';
import SuspendUserModal from '@/components/admin/SuspendUserModal';
import UnsuspendUserModal from '@/components/admin/UnsuspendUserModal';
import { useAuth } from '@/context/AuthContext';
import { AdminUserView, SystemRole } from '@shared/types';
import { Users, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Role Modal state
  const [targetUserForRole, setTargetUserForRole] = useState<AdminUserView | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Suspend Modal state
  const [targetUserForSuspend, setTargetUserForSuspend] = useState<AdminUserView | null>(null);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);

  // Unsuspend Modal state
  const [targetUserForUnsuspend, setTargetUserForUnsuspend] = useState<AdminUserView | null>(null);
  const [isUnsuspendModalOpen, setIsUnsuspendModalOpen] = useState(false);

  // Toast alert
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        role: roleFilter,
        status: statusFilter,
      });
      if (search.trim()) {
        params.set('search', search.trim());
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotalUsers(data.pagination.totalUsers || 0);
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, search, roleFilter, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, statusFilter]);

  // Handle page/limit changes
  useEffect(() => {
    fetchUsers();
  }, [currentPage, limit]);

  const handleOpenRoleModal = (userToEdit: AdminUserView) => {
    setTargetUserForRole(userToEdit);
    setIsRoleModalOpen(true);
  };

  const handleOpenSuspendModal = (userToSuspend: AdminUserView) => {
    setTargetUserForSuspend(userToSuspend);
    setIsSuspendModalOpen(true);
  };

  const handleOpenUnsuspendModal = (userToUnsuspend: AdminUserView) => {
    setTargetUserForUnsuspend(userToUnsuspend);
    setIsUnsuspendModalOpen(true);
  };

  const handleSaveRole = async (userId: string, newRole: SystemRole, reason: string) => {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole, reason }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update user role');
    }

    const updated = await res.json();
    setToastMessage({
      text: `Updated @${updated.user.username}'s role to ${updated.user.systemRole}`,
      type: 'success',
    });

    // Update in local state
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, systemRole: updated.user.systemRole } : u))
    );
  };

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-fadeIn ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-[11px] underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-wa-light-text-primary dark:text-wa-dark-text-primary">
            User Directory & Role Administration
          </h2>
          <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1">
            Search, filter, and manage user roles across all registered accounts.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          type="button"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#00a884]' : ''}`} />
          <span>Refresh Users</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <UserFilterToolbar
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        totalUsers={totalUsers}
        onReset={handleResetFilters}
      />

      {/* Data Grid */}
      <UserDataGrid
        users={users}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        totalUsers={totalUsers}
        limit={limit}
        onPageChange={setCurrentPage}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setCurrentPage(1);
        }}
        onOpenRoleModal={handleOpenRoleModal}
        onOpenSuspendModal={handleOpenSuspendModal}
        onOpenUnsuspendModal={handleOpenUnsuspendModal}
      />

      {/* Role Delegation Modal */}
      <ChangeRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        targetUser={targetUserForRole}
        actorRole={currentUser?.systemRole || 'ADMIN'}
        onSave={handleSaveRole}
      />

      {/* Suspend User Modal */}
      <SuspendUserModal
        isOpen={isSuspendModalOpen}
        user={targetUserForSuspend}
        onClose={() => setIsSuspendModalOpen(false)}
        onSuccess={() => {
          setToastMessage({
            text: `User @${targetUserForSuspend?.username} has been suspended`,
            type: 'success',
          });
          fetchUsers();
        }}
      />

      {/* Unsuspend User Modal */}
      <UnsuspendUserModal
        isOpen={isUnsuspendModalOpen}
        user={targetUserForUnsuspend}
        onClose={() => setIsUnsuspendModalOpen(false)}
        onSuccess={() => {
          setToastMessage({
            text: `User @${targetUserForUnsuspend?.username} has been unsuspended`,
            type: 'success',
          });
          fetchUsers();
        }}
      />
    </div>
  );
}
