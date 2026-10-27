'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { sanitizeSlug } from '@/lib/channelUtils';
import { Megaphone, Globe, AlertCircle, Loader2 } from 'lucide-react';

export interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated: (channel: any) => void;
}

export default function CreateChannelModal({
  isOpen,
  onClose,
  onChannelCreated,
}: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!customSlug || customSlug === sanitizeSlug(name)) {
      setCustomSlug(sanitizeSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Channel name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          slug: customSlug.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create channel');
      }

      const data = await res.json();
      onChannelCreated(data.channel);
      onClose();
      // Reset form
      setName('');
      setDescription('');
      setCustomSlug('');
    } catch (err: any) {
      setError(err?.message || 'Error creating channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      maxWidth="md"
      title="Create Broadcast Channel"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner explanation */}
        <div className="p-3 rounded-xl bg-[#00a884]/10 border border-[#00a884]/20 flex items-start gap-3">
          <Megaphone className="w-5 h-5 text-[#00a884] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-wa-light-text-secondary dark:text-wa-dark-text-secondary leading-relaxed">
            <span className="font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary block">
              Reach unlimited followers
            </span>
            Broadcast announcements, updates, and news. Followers have a clean, read-only experience.
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Channel Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            Channel Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            disabled={loading}
            maxLength={50}
            placeholder="e.g. Engineering Updates"
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e9edef] dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:ring-2 focus:ring-[#00a884]/30 focus:border-[#00a884]"
          />
          <div className="text-[10px] text-wa-light-text-muted text-right">
            {name.length}/50
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
            rows={2}
            maxLength={500}
            placeholder="Describe what updates your followers can expect..."
            className="w-full p-2.5 text-xs rounded-xl border border-[#e9edef] dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none focus:ring-2 focus:ring-[#00a884]/30 focus:border-[#00a884]"
          />
        </div>

        {/* Custom URL Slug */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-wa-light-text-muted" />
            <span>Public Invite Slug</span>
          </label>
          <div className="flex items-center rounded-xl border border-[#e9edef] dark:border-white/10 bg-gray-50/50 dark:bg-white/5 px-3 py-1.5 text-xs">
            <span className="text-wa-light-text-muted font-mono select-none">/channel/</span>
            <input
              type="text"
              value={customSlug}
              onChange={(e) => setCustomSlug(sanitizeSlug(e.target.value))}
              disabled={loading}
              placeholder="custom-slug"
              className="flex-1 bg-transparent border-0 text-xs font-mono text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e9edef] dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#00a884] hover:bg-[#008f6f] text-white shadow-xs transition-all disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Channel...</span>
              </>
            ) : (
              <>
                <Megaphone className="w-4 h-4" />
                <span>Create Channel</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
