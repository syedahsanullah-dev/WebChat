'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Plus, RefreshCw, AlertOctagon, Key, CreditCard, UserCheck } from 'lucide-react';
import DlpRulesTable, { DlpRule } from '@/components/admin/DlpRulesTable';
import CreateDlpRuleModal from '@/components/admin/CreateDlpRuleModal';
import DlpTesterWidget from '@/components/admin/DlpTesterWidget';

export default function AdminDlpPage() {
  const [rules, setRules] = useState<DlpRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/dlp');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch DLP rules');
      }
      setRules(data.rules || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/dlp/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update rule');
      }
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isActive: !current } : r))
      );
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleChangeAction = async (id: string, action: 'BLOCK' | 'WARN' | 'LOG') => {
    try {
      const res = await fetch(`/api/admin/dlp/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update action');
      }
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, action } : r))
      );
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/dlp/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete rule');
      }
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const activeRulesCount = rules.filter((r) => r.isActive).length;
  const totalMatchesCount = rules.reduce((acc, r) => acc + (r.matchCount || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00a884]/10 text-[#00a884] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Data Loss Prevention (DLP) Regex Scanner
            </h1>
          </div>
          <p className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1">
            Intercepts outbound WebSockets in memory (&lt; 1ms) to block accidental API credentials and financial data leaks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchRules}
            disabled={isLoading}
            className="p-2 rounded-lg bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 text-wa-light-text-secondary hover:text-wa-light-text-primary transition-colors"
            title="Refresh Rules"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Rule</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-2">
            <span className="text-xs font-medium">Active Rules</span>
            <ShieldCheck className="w-4 h-4 text-[#00a884]" />
          </div>
          <div className="text-2xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
            {activeRulesCount} <span className="text-xs font-normal text-wa-light-text-secondary">/ {rules.length}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-2">
            <span className="text-xs font-medium">Total Blocked Leaks</span>
            <AlertOctagon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {totalMatchesCount}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-2">
            <span className="text-xs font-medium">Credential Rules</span>
            <Key className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
            {rules.filter((r) => r.category === 'CREDENTIALS').length}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-2">
            <span className="text-xs font-medium">Financial Rules</span>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
            {rules.filter((r) => r.category === 'FINANCIAL').length}
          </div>
        </div>
      </div>

      {/* Interactive Tester Widget */}
      <DlpTesterWidget rules={rules} />

      {/* Rules Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Active DLP Detection Rules
          </h2>
          <span className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            {rules.length} total patterns compiled
          </span>
        </div>

        {error ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-xs text-wa-light-text-secondary">
            <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading DLP regex engine...
          </div>
        ) : (
          <DlpRulesTable
            rules={rules}
            onToggleActive={handleToggleActive}
            onChangeAction={handleChangeAction}
            onDeleteRule={handleDeleteRule}
          />
        )}
      </div>

      {/* Modal */}
      <CreateDlpRuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchRules}
      />
    </div>
  );
}
