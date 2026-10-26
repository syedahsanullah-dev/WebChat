'use client';

import React, { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import RoleBadge from '@/components/admin/RoleBadge';
import ChangeRoleModal from '@/components/admin/ChangeRoleModal';
import { useAuth } from '@/context/AuthContext';
import { SystemRole } from '@shared/types';
import {
  ArrowLeft,
  Shield,
  Smartphone,
  MessageSquare,
  HardDrive,
  Calendar,
  Mail,
  User,
  Clock,
  Laptop,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
} from 'lucide-react';

interface UserDetailPayload {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  about?: string;
  systemRole: SystemRole;
  isSuspended: boolean;
  isOnline: boolean;
  lastSeen?: string | null;
  createdAt: string;
  updatedAt: string;
  sessions: Array<{
    id: string;
    deviceType: string;
    browser: string;
    os: string;
    ipAddress: string;
    lastActiveAt: string;
    createdAt: string;
  }>;
  stats: {
    totalSentMessages: number;
    totalMediaSent: number;
    chatParticipantsCount: number;
    activeSessionsCount: number;
  };
  auditLogs: Array<{
    id: string;
    action: string;
    resource: string;
    ipAddress?: string | null;
    createdAt: string;
    metadata?: any;
  }>;
}

export default function UserDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  const { user: currentUser } = useAuth();

  const [userData, setUserData] = useState<UserDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const fetchUserDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      } else {
        const err = await res.json();
        setError(err.error || 'User not found');
      }
    } catch (err: any) {
      setError(err?.message || 'Error fetching user details');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  const handleSaveRole = async (targetUserId: string, newRole: SystemRole, reason: string) => {
    const res = await fetch(`/api/admin/users/${targetUserId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole, reason }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update user role');
    }

    fetchUserDetails();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16">
        <Loader2 className="w-8 h-8 text-[#00a884] animate-spin mb-3" />
        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
          Loading user profile details...
        </p>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
          <XCircle className="w-6 h-6" />
        </div>
        <h4 className="text-lg font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
          User Account Error
        </h4>
        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary max-w-sm mx-auto">
          {error || 'Unable to retrieve the requested user account.'}
        </p>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-semibold hover:bg-black/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to User Directory</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="p-2 rounded-xl border border-[#e9edef] dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Back to User Directory"
          >
            <ArrowLeft className="w-4 h-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary" />
          </Link>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-wa-light-text-primary dark:text-wa-dark-text-primary flex items-center gap-2">
              <span>{userData.displayName}</span>
              <RoleBadge role={userData.systemRole} />
            </h2>
            <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-0.5">
              @{userData.username} &bull; Account ID: <code className="font-mono text-[11px]">{userData.id}</code>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsRoleModalOpen(true)}
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold shadow-xs transition-all self-stretch sm:self-auto justify-center"
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Elevate / Modify Role</span>
        </button>
      </div>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] p-5 shadow-xs space-y-4">
          <div className="flex flex-col items-center text-center pb-4 border-b border-[#e9edef] dark:border-white/10">
            <Avatar
              name={userData.displayName || userData.username}
              src={userData.avatarUrl}
              size="lg"
            />
            <h3 className="text-base font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary mt-3">
              {userData.displayName}
            </h3>
            <p className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
              @{userData.username}
            </p>

            <div className="mt-3 flex items-center gap-2">
              {userData.isSuspended ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                  <XCircle className="w-3.5 h-3.5" />
                  Suspended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active Account
                </span>
              )}

              {userData.isOnline && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Online
                </span>
              )}
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2.5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              <Mail className="w-4 h-4 text-wa-light-text-muted flex-shrink-0" />
              <span className="truncate font-mono">{userData.email}</span>
            </div>

            <div className="flex items-center gap-2.5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              <Calendar className="w-4 h-4 text-wa-light-text-muted flex-shrink-0" />
              <span>Joined {new Date(userData.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <div className="flex items-center gap-2.5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              <Clock className="w-4 h-4 text-wa-light-text-muted flex-shrink-0" />
              <span>Last seen {userData.lastSeen ? new Date(userData.lastSeen).toLocaleString() : 'Never'}</span>
            </div>

            {userData.about && (
              <div className="pt-2 border-t border-[#f0f2f5] dark:border-white/5">
                <span className="block text-[10px] uppercase font-bold text-wa-light-text-muted mb-1">
                  About
                </span>
                <p className="text-xs text-wa-light-text-primary dark:text-wa-dark-text-primary italic">
                  &ldquo;{userData.about}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Activity Stats & Active Sessions */}
        <div className="md:col-span-2 space-y-6">
          {/* Activity Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] space-y-1">
              <div className="flex items-center justify-between text-sky-500">
                <MessageSquare className="w-4 h-4" />
                <span className="text-[10px] uppercase font-semibold text-wa-light-text-muted">Messages</span>
              </div>
              <div className="text-xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                {userData.stats.totalSentMessages}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] space-y-1">
              <div className="flex items-center justify-between text-purple-500">
                <HardDrive className="w-4 h-4" />
                <span className="text-[10px] uppercase font-semibold text-wa-light-text-muted">Media</span>
              </div>
              <div className="text-xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                {userData.stats.totalMediaSent}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] space-y-1">
              <div className="flex items-center justify-between text-[#00a884]">
                <User className="w-4 h-4" />
                <span className="text-[10px] uppercase font-semibold text-wa-light-text-muted">Chats</span>
              </div>
              <div className="text-xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                {userData.stats.chatParticipantsCount}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] space-y-1">
              <div className="flex items-center justify-between text-amber-500">
                <Smartphone className="w-4 h-4" />
                <span className="text-[10px] uppercase font-semibold text-wa-light-text-muted">Sessions</span>
              </div>
              <div className="text-xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                {userData.stats.activeSessionsCount}
              </div>
            </div>
          </div>

          {/* Active Device Sessions List */}
          <div className="rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-wa-light-text-secondary" />
              <h4 className="text-sm font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                Active Device Sessions ({userData.sessions.length})
              </h4>
            </div>

            {userData.sessions.length === 0 ? (
              <p className="text-xs text-wa-light-text-muted py-2">No active device sessions registered.</p>
            ) : (
              <div className="divide-y divide-[#e9edef] dark:divide-white/5">
                {userData.sessions.map((sess) => (
                  <div key={sess.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-white/5">
                        <Smartphone className="w-4 h-4 text-wa-light-text-secondary" />
                      </div>
                      <div>
                        <span className="font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary block">
                          {sess.browser || 'Browser'} on {sess.os || 'OS'}
                        </span>
                        <span className="text-[11px] text-wa-light-text-muted font-mono">
                          {sess.ipAddress} &bull; Type: {sess.deviceType}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] text-wa-light-text-muted">
                      Active {new Date(sess.lastActiveAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Logs History */}
          <div className="rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-wa-light-text-secondary" />
              <h4 className="text-sm font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                Audit Trail History ({userData.auditLogs.length})
              </h4>
            </div>

            {userData.auditLogs.length === 0 ? (
              <p className="text-xs text-wa-light-text-muted py-2">No audit events recorded for this user.</p>
            ) : (
              <div className="divide-y divide-[#e9edef] dark:divide-white/5">
                {userData.auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono font-semibold text-[#00a884] block">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-wa-light-text-muted">
                        Resource: {log.resource} &bull; IP: {log.ipAddress || 'Internal'}
                      </span>
                    </div>
                    <span className="text-[11px] text-wa-light-text-muted">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role Delegation Modal */}
      <ChangeRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        targetUser={{
          id: userData.id,
          username: userData.username,
          displayName: userData.displayName,
          systemRole: userData.systemRole,
        }}
        actorRole={currentUser?.systemRole || 'ADMIN'}
        onSave={handleSaveRole}
      />
    </div>
  );
}
