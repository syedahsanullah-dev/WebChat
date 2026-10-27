'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Plus, Trash2, BarChart2, Loader2, Check } from 'lucide-react';

export interface CreatePollModalProps {
  isOpen: boolean;
  chatId: string;
  onClose: () => void;
  onPollCreated?: (newPoll: any) => void;
}

export default function CreatePollModal({
  isOpen,
  chatId,
  onClose,
  onPollCreated,
}: CreatePollModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;

    // Automatically append new empty option if typing in the last field (up to 12 max)
    if (index === updated.length - 1 && value.trim().length > 0 && updated.length < 12) {
      updated.push('');
    }

    setOptions(updated);
    setError(null);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      setError('Please enter a poll question');
      return;
    }

    const cleanOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (cleanOptions.length < 2) {
      setError('At least 2 options are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          question: cleanQuestion,
          options: cleanOptions,
          allowMultiple,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to create poll');
      }

      const data = await res.json();
      if (onPollCreated) {
        onPollCreated(data);
      }

      // Reset form
      setQuestion('');
      setOptions(['', '']);
      setAllowMultiple(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the poll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Poll" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 py-1 select-none">
        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
            {error}
          </div>
        )}

        {/* Question Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              setError(null);
            }}
            placeholder="Ask a question..."
            maxLength={500}
            required
            className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:ring-1 focus:ring-[#00a884]"
          />
        </div>

        {/* Options List */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            Options (min 2, max 12)
          </label>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={255}
                  className="flex-1 px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-[#e9edef] dark:border-white/10 bg-white dark:bg-[#111b21] text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-1.5 rounded-lg text-wa-light-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Remove option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 12 && (
            <button
              type="button"
              onClick={() => setOptions([...options, ''])}
              className="text-xs font-medium text-[#00a884] hover:text-[#008f6f] flex items-center gap-1 pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add option</span>
            </button>
          )}
        </div>

        {/* Multiple Answers Toggle */}
        <div className="pt-2 border-t border-[#e9edef] dark:border-white/10 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-wa-light-text-primary dark:text-white">
              Allow multiple answers
            </span>
            <p className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted">
              Participants can choose more than one option
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAllowMultiple(!allowMultiple)}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              allowMultiple ? 'bg-[#00a884]' : 'bg-gray-300 dark:bg-white/20'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                allowMultiple ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Bottom Actions */}
        <div className="pt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-[#00a884] hover:bg-[#008f6f] text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Create Poll</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
