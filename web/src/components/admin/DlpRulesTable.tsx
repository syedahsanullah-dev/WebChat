'use client';

import React, { useState } from 'react';
import { Shield, Trash2, CheckCircle2, XCircle } from 'lucide-react';

export interface DlpRule {
  id: string;
  name: string;
  pattern: string;
  category: string;
  action: 'BLOCK' | 'WARN' | 'LOG';
  isActive: boolean;
  matchCount: number;
  createdAt: string;
}

interface DlpRulesTableProps {
  rules: DlpRule[];
  onToggleActive: (id: string, current: boolean) => Promise<void>;
  onChangeAction: (id: string, action: 'BLOCK' | 'WARN' | 'LOG') => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
}

export default function DlpRulesTable({
  rules,
  onToggleActive,
  onChangeAction,
  onDeleteRule,
}: DlpRulesTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'CREDENTIALS':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'FINANCIAL':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'IDENTITY':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    setLoadingId(id);
    try {
      await onToggleActive(id, current);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this DLP rule?')) return;
    setLoadingId(id);
    try {
      await onDeleteRule(id);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f0f2f5] dark:bg-[#111b21] text-wa-light-text-secondary dark:text-wa-dark-text-secondary uppercase text-[10px] tracking-wider border-b border-[#e9edef] dark:border-white/10">
            <tr>
              <th className="py-3 px-4 font-semibold">Rule Name</th>
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-4 font-semibold">Pattern Regex</th>
              <th className="py-3 px-4 font-semibold">Action</th>
              <th className="py-3 px-4 font-semibold text-center">Matches</th>
              <th className="py-3 px-4 font-semibold text-center">Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9edef] dark:divide-white/5">
            {rules.map((rule) => {
              const isLoading = loadingId === rule.id;

              return (
                <tr
                  key={rule.id}
                  className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#00a884] shrink-0" />
                      <span className="font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
                        {rule.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getCategoryBadgeClass(
                        rule.category
                      )}`}
                    >
                      {rule.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary max-w-[220px] truncate">
                    <code>/{rule.pattern}/i</code>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={rule.action}
                      disabled={isLoading}
                      onChange={(e) =>
                        onChangeAction(
                          rule.id,
                          e.target.value as 'BLOCK' | 'WARN' | 'LOG'
                        )
                      }
                      className="text-xs bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 rounded px-2 py-1 focus:outline-none focus:border-[#00a884]"
                    >
                      <option value="BLOCK">BLOCK</option>
                      <option value="WARN">WARN</option>
                      <option value="LOG">LOG ONLY</option>
                    </select>
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                    {rule.matchCount}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleToggle(rule.id, rule.isActive)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                        rule.isActive
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {rule.isActive ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleDelete(rule.id)}
                      className="p-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
