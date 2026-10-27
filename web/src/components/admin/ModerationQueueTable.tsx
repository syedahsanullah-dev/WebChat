'use client';

import React from 'react';
import { AbuseReportItem } from '@shared/types';
import { Eye, ShieldAlert, CheckCircle, Ban, Clock } from 'lucide-react';

export interface ModerationQueueTableProps {
  reports: AbuseReportItem[];
  onSelectReport: (reportId: string) => void;
}

export default function ModerationQueueTable({
  reports,
  onSelectReport,
}: ModerationQueueTableProps) {
  if (reports.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-[#111b21] rounded-2xl border border-[#e9edef] dark:border-white/10">
        <div className="w-12 h-12 rounded-2xl bg-[#00a884]/10 text-[#00a884] flex items-center justify-center mb-3">
          <CheckCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary mb-1">
          No reports found
        </h3>
        <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary max-w-sm">
          All caught up! There are currently no user abuse reports matching the selected filter criteria.
        </p>
      </div>
    );
  }

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'HARASSMENT':
      case 'PHISHING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            {category}
          </span>
        );
      case 'SPAM':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            {category}
          </span>
        );
      case 'INAPPROPRIATE':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            {category}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            {category}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
            <Clock className="w-2.5 h-2.5" />
            <span>PENDING</span>
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-2.5 h-2.5" />
            <span>RESOLVED</span>
          </span>
        );
      case 'DISMISSED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/10 text-wa-light-text-secondary border border-black/10">
            <span>DISMISSED</span>
          </span>
        );
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21]">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-wa-light-header/50 dark:bg-wa-dark-header/50 border-b border-[#e9edef] dark:border-white/10 text-wa-light-text-secondary dark:text-wa-dark-text-secondary select-none">
            <th className="py-3 px-4 font-semibold">Category</th>
            <th className="py-3 px-4 font-semibold">Reported User</th>
            <th className="py-3 px-4 font-semibold">Reporter</th>
            <th className="py-3 px-4 font-semibold">Complaint / Message</th>
            <th className="py-3 px-4 font-semibold">Status</th>
            <th className="py-3 px-4 font-semibold">Date</th>
            <th className="py-3 px-4 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e9edef] dark:divide-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary">
          {reports.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSelectReport(r.id)}
              className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
            >
              {/* Category */}
              <td className="py-3.5 px-4 whitespace-nowrap">
                {getCategoryBadge(r.category)}
              </td>

              {/* Reported User */}
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-black/10 shrink-0">
                    {r.reportedUserAvatar ? (
                      <img
                        src={r.reportedUserAvatar}
                        alt={r.reportedUserName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-white bg-rose-500">
                        {r.reportedUserName[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold block truncate max-w-[120px]">
                      {r.reportedUserName}
                    </span>
                    <span className="text-[10px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                      @{r.reportedUserUsername}
                    </span>
                  </div>
                </div>
              </td>

              {/* Reporter */}
              <td className="py-3.5 px-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary whitespace-nowrap">
                <span>@{r.reporterUsername}</span>
              </td>

              {/* Snippet */}
              <td className="py-3.5 px-4 max-w-xs">
                <p className="truncate text-xs font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
                  {r.messageContent ? (
                    <span className="italic">&ldquo;{r.messageContent}&rdquo;</span>
                  ) : (
                    <span>Profile Report: {r.reason}</span>
                  )}
                </p>
                <span className="text-[10px] text-wa-light-text-secondary truncate block">
                  {r.reason}
                </span>
              </td>

              {/* Status */}
              <td className="py-3.5 px-4 whitespace-nowrap">
                {getStatusBadge(r.status)}
              </td>

              {/* Date */}
              <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-wa-light-text-secondary">
                {new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </td>

              {/* Action Button */}
              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectReport(r.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00a884]/10 hover:bg-[#00a884]/20 text-[#00a884] font-semibold text-xs transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Review</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
