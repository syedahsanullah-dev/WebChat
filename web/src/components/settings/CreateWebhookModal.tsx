'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Webhook, ArrowDownLeft, ArrowUpRight, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { WebhookInfo } from '@shared/types';

interface CreateWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  onCreated: (webhook: WebhookInfo) => void;
}

export default function CreateWebhookModal({
  isOpen,
  onClose,
  chatId,
  onCreated,
}: CreateWebhookModalProps) {
  const [name, setName] = useState('');
  const [direction, setDirection] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');
  const [targetUrl, setTargetUrl] = useState('');
  const [events, setEvents] = useState('message:created');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state with generated secret display
  const [createdWebhook, setCreatedWebhook] = useState<WebhookInfo | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const resetForm = () => {
    setName('');
    setDirection('INBOUND');
    setTargetUrl('');
    setEvents('message:created');
    setError(null);
    setCreatedWebhook(null);
    setCopiedUrl(false);
    setCopiedSecret(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a descriptive name for this webhook');
      return;
    }

    if (direction === 'OUTBOUND' && !targetUrl.trim()) {
      setError('Please provide a target HTTPS URL for outbound delivery');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/chats/${chatId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          direction,
          targetUrl: direction === 'OUTBOUND' ? targetUrl.trim() : null,
          events: events.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create webhook');
      }

      setCreatedWebhook(data.webhook);
      onCreated(data.webhook);
    } catch (err: any) {
      setError(err?.message || 'Error creating webhook');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, type: 'url' | 'secret') => {
    if (!text || typeof navigator === 'undefined') return;
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Webhook Integration" size="md">
      {createdWebhook ? (
        <div className="space-y-4 py-2">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs">
            🎉 Webhook <strong>{createdWebhook.name}</strong> created successfully!
          </div>

          {createdWebhook.direction === 'INBOUND' && createdWebhook.incomingUrl && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
                Incoming Webhook URL
              </label>
              <div className="flex items-center gap-1.5 p-2 bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg rounded-md border border-wa-light-border dark:border-wa-dark-border text-xs break-all">
                <span className="flex-1 font-mono">{createdWebhook.incomingUrl}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdWebhook.incomingUrl!, 'url')}
                  className="p-1.5 rounded hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover text-wa-light-text-secondary dark:text-wa-dark-text-secondary"
                  title="Copy URL"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted mt-1">
                Post JSON with <code>&#123; &quot;text&quot;: &quot;Your message&quot; &#125;</code> to this endpoint.
              </p>
            </div>
          )}

          {createdWebhook.secret && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
                HMAC SHA-256 Secret Key
              </label>
              <div className="flex items-center gap-1.5 p-2 bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg rounded-md border border-wa-light-border dark:border-wa-dark-border text-xs">
                <span className="flex-1 font-mono text-[11px] truncate">{createdWebhook.secret}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdWebhook.secret!, 'secret')}
                  className="p-1.5 rounded hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover text-wa-light-text-secondary dark:text-wa-dark-text-secondary"
                  title="Copy Secret"
                >
                  {copiedSecret ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold bg-wa-green text-white rounded-md hover:bg-wa-green-hover"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-md text-rose-700 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary mb-1">
              Webhook Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GitHub Actions, Jira Notifications, Sentry"
              className="w-full px-3 py-2 text-xs bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg border border-wa-light-border dark:border-wa-dark-border rounded-md focus:outline-hidden focus:border-wa-green"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary mb-1">
              Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection('INBOUND')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-medium transition-colors ${
                  direction === 'INBOUND'
                    ? 'border-wa-green bg-wa-green/10 text-wa-green font-semibold'
                    : 'border-wa-light-border dark:border-wa-dark-border hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Inbound (Receive)</span>
              </button>
              <button
                type="button"
                onClick={() => setDirection('OUTBOUND')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-medium transition-colors ${
                  direction === 'OUTBOUND'
                    ? 'border-wa-green bg-wa-green/10 text-wa-green font-semibold'
                    : 'border-wa-light-border dark:border-wa-dark-border hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Outbound (Push)</span>
              </button>
            </div>
          </div>

          {direction === 'OUTBOUND' && (
            <div>
              <label className="block text-xs font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary mb-1">
                Target URL *
              </label>
              <input
                type="url"
                required
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com/api/webchat-events"
                className="w-full px-3 py-2 text-xs bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg border border-wa-light-border dark:border-wa-dark-border rounded-md focus:outline-hidden focus:border-wa-green"
              />
              <p className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted mt-1">
                WebChat will POST JSON events with HMAC SHA-256 header <code>X-WebChat-Signature</code>.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-wa-light-border dark:border-wa-dark-border">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-medium rounded-md text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-wa-green text-white rounded-md hover:bg-wa-green-hover disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Webhook</span>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
