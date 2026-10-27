'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldAlert,
  User,
  Clock,
  MessageSquare,
  AlertTriangle,
  Trash2,
  Bell,
  VolumeX,
  Ban,
  CheckCircle,
  Calendar,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { AbuseReportItem } from '@shared/types';
import ModerationActionModal from './ModerationActionModal';

export interface ReportDetailDrawerProps {
  reportId: string | null;
  onClose: () => void;
  onReportResolved?: () => void;
}

export default function ReportDetailDrawer({
  reportId,
  onClose,
  onReportResolved,
}: ReportDetailDrawerProps) {
  const [report, setReport] = useState<any | null>(null);
  const [contextMessages, setContextMessages] = useState<any[]>([]);
  const [priorViolationsCount, setPriorViolationsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionModalAction, setActionModalAction] = useState<any | null>(null);

  useEffect(() => {
    if (!reportId) return;

    setIsLoading(true);
    setError(null);

    fetch(`/api/admin/moderation/${reportId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load report details');
        return res.json();
      })
      .then((data) => {
        setReport(data.report);
        setContextMessages(data.contextMessages || []);
        setPriorViolationsCount(data.priorViolationsCount || 0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [reportId]);

  if (!reportId) return null;

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'HARASSMENT':
      case 'PHISHING':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'SPAM':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'INAPPROPRIATE':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      default:
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-wa-light-sidebar dark:bg-wa-dark-sidebar border-l border-[#e9edef] dark:border-white/10 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#e9edef] dark:border-white/10 bg-wa-light-header dark:bg-wa-dark-header flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                Review Abuse Report
              </h2>
              <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                Report #{reportId.slice(0, 8)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-wa-light-text-secondary hover:text-wa-light-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-xs">
              {error}
            </div>
          ) : isLoading || !report ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-wa-light-text-secondary">
              <div className="w-7 h-7 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Loading report and surrounding context...</p>
            </div>
          ) : (
            <>
              {/* Category & Status Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getCategoryBadgeClass(
                      report.category
                    )}`}
                  >
                    {report.category}
                  </span>
                  <span className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                    Reported {new Date(report.createdAt).toLocaleString()}
                  </span>
                </div>

                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    report.status === 'PENDING'
                      ? 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                      : report.status === 'RESOLVED'
                      ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                      : 'bg-black/5 dark:bg-white/5 text-wa-light-text-secondary border-black/10'
                  }`}
                >
                  {report.status}
                </span>
              </div>

              {/* Reported User Profile Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                  Reported User
                </h3>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-black/10 shrink-0">
                      {report.reportedUserAvatar ? (
                        <img
                          src={report.reportedUserAvatar}
                          alt={report.reportedUserName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white bg-rose-500">
                          {report.reportedUserName[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                        {report.reportedUserName}
                      </h4>
                      <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                        @{report.reportedUserUsername}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {report.reportedUserSuspended ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 border border-rose-500/30">
                        <Ban className="w-3 h-3" />
                        <span>Suspended</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Account Active</span>
                      </span>
                    )}

                    {priorViolationsCount > 0 && (
                      <span className="text-[10px] font-bold text-rose-500">
                        {priorViolationsCount} prior report(s) on file
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#e9edef] dark:border-white/10 text-[11px] text-wa-light-text-secondary">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-wa-light-text-muted" />
                    <span>Joined: {new Date(report.reportedUserJoinedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-wa-light-text-muted" />
                    <span>Reporter: @{report.reporterUsername}</span>
                  </div>
                </div>
              </div>

              {/* Reporter Complaint Reason */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                  Reporter Complaint
                </h3>
                <p className="text-xs text-wa-light-text-primary dark:text-wa-dark-text-primary leading-relaxed bg-black/5 dark:bg-white/5 p-3 rounded-lg border-l-4 border-rose-500">
                  &ldquo;{report.reason}&rdquo;
                </p>
              </div>

              {/* Conversational Context Viewer */}
              {contextMessages.length > 0 && (
                <div className="p-4 rounded-xl bg-white dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-wa-light-text-secondary dark:text-wa-dark-text-secondary flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#00a884]" />
                      <span>Conversational Context (2 Before &amp; After)</span>
                    </h3>
                    <span className="text-[10px] text-wa-light-text-muted">
                      {contextMessages.length} messages shown
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {contextMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl text-xs transition-all ${
                          msg.isTarget
                            ? 'bg-rose-500/10 border-2 border-rose-500 shadow-xs'
                            : 'bg-black/5 dark:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`font-semibold ${
                              msg.isTarget ? 'text-rose-600 dark:text-rose-400' : 'text-wa-light-text-primary dark:text-wa-dark-text-primary'
                            }`}
                          >
                            {msg.senderName} {msg.isTarget && '(Reported Target)'}
                          </span>
                          <span className="text-[10px] text-wa-light-text-muted">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-wa-light-text-primary dark:text-wa-dark-text-primary whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Past Resolution Info if already resolved */}
              {report.status !== 'PENDING' && (
                <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-[#e9edef] dark:border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-wa-light-text-primary">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Resolution Record: {report.resolutionAction}</span>
                  </div>
                  {report.resolutionNotes && (
                    <p className="text-xs text-wa-light-text-secondary italic">
                      &ldquo;{report.resolutionNotes}&rdquo;
                    </p>
                  )}
                  <p className="text-[11px] text-wa-light-text-muted">
                    Resolved by {report.resolvedByName || 'Administrator'} on{' '}
                    {report.resolvedAt ? new Date(report.resolvedAt).toLocaleString() : ''}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions (if PENDING) */}
        {report && report.status === 'PENDING' && (
          <div className="p-4 border-t border-[#e9edef] dark:border-white/10 bg-wa-light-sidebar dark:bg-wa-dark-sidebar flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setActionModalAction('DISMISSED')}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-black/5 dark:bg-white/5 hover:bg-black/10 text-wa-light-text-secondary transition-colors cursor-pointer"
            >
              Dismiss Report
            </button>

            <div className="flex items-center gap-2">
              {report.messageId && !report.messageDeleted && (
                <button
                  type="button"
                  onClick={() => setActionModalAction('DELETE_MESSAGE')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Msg</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActionModalAction('WARN_USER')}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Issue Warning</span>
              </button>

              <button
                type="button"
                onClick={() => setActionModalAction('MUTE_USER')}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>Mute User</span>
              </button>

              <button
                type="button"
                onClick={() => setActionModalAction('SUSPEND_USER')}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Suspend</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Confirmation Modal */}
        {actionModalAction && report && (
          <ModerationActionModal
            isOpen={Boolean(actionModalAction)}
            onClose={() => setActionModalAction(null)}
            report={report}
            initialAction={actionModalAction}
            onActionComplete={() => {
              if (onReportResolved) onReportResolved();
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}
