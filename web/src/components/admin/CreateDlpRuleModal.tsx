'use client';

import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';

interface CreateDlpRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateDlpRuleModal({
  isOpen,
  onClose,
  onCreated,
}: CreateDlpRuleModalProps) {
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState('');
  const [category, setCategory] = useState<'CREDENTIALS' | 'FINANCIAL' | 'IDENTITY' | 'CUSTOM'>('CUSTOM');
  const [action, setAction] = useState<'BLOCK' | 'WARN' | 'LOG'>('BLOCK');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validateRegex = (input: string) => {
    try {
      new RegExp(input);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a name for this rule.');
      return;
    }

    if (!pattern.trim()) {
      setError('Please provide a valid regex pattern.');
      return;
    }

    if (!validateRegex(pattern.trim())) {
      setError('Invalid regular expression syntax.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/dlp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          pattern: pattern.trim(),
          category,
          action,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create DLP rule');
      }

      setName('');
      setPattern('');
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-wa-light-sidebar dark:bg-wa-dark-sidebar border border-[#e9edef] dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-[#e9edef] dark:border-white/10">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#00a884]" />
            <h2 className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Add Custom DLP Rule
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-wa-light-text-secondary hover:text-wa-light-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
              Rule Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Stripe Secret Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:border-[#00a884]"
            />
          </div>

          <div>
            <label className="block font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
              Regex Pattern (ECMAScript syntax)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. sk_live_[0-9a-zA-Z]{24}"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-full px-3 py-2 font-mono text-xs rounded-lg bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:border-[#00a884]"
            />
            <p className="mt-1 text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              Evaluated with case-insensitive flag in memory (&lt; 1ms).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:border-[#00a884]"
              >
                <option value="CREDENTIALS">CREDENTIALS</option>
                <option value="FINANCIAL">FINANCIAL</option>
                <option value="IDENTITY">IDENTITY</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
                Enforcement Action
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-[#f0f2f5] dark:bg-[#111b21] border border-[#e9edef] dark:border-white/10 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:border-[#00a884]"
              >
                <option value="BLOCK">BLOCK (Reject &amp; Error)</option>
                <option value="WARN">WARN</option>
                <option value="LOG">LOG ONLY</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-wa-light-text-secondary hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-[#00a884] hover:bg-[#008f6f] text-white font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
