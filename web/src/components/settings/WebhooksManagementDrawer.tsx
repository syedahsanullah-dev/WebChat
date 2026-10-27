'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Webhook,
  Plus,
  Copy,
  Check,
  Play,
  Trash2,
  RefreshCw,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import { WebhookInfo } from '@shared/types';
import CreateWebhookModal from './CreateWebhookModal';

interface WebhooksManagementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatTitle?: string;
}

export default function WebhooksManagementDrawer({
  isOpen,
  onClose,
  chatId,
  chatTitle,
}: WebhooksManagementDrawerProps) {
  const [webhooks, setWebhooks] = useState<WebhookInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/chats/${chatId}/webhooks`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch webhooks');
      }
      setWebhooks(data.webhooks || []);
    } catch (err: any) {
      setError(err?.message || 'Error loading webhooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && chatId) {
      fetchWebhooks();
    }
  }, [isOpen, chatId]);

  const toggleWebhook = async (id: string, currentState: boolean) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentState }),
      });
      if (res.ok) {
        setWebhooks((prev) =>
          prev.map((w) => (w.id === id ? { ...w, isActive: !currentState } : w))
        );
      }
    } catch {
      // non-fatal
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    try {
      const res = await fetch(`/api/chats/${chatId}/webhooks/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
      }
    } catch {
      // non-fatal
    }
  };

  const handleCopy = (id: string, url?: string) => {
    if (!url || typeof navigator === 'undefined') return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleTest = async (webhook: WebhookInfo) => {
    try {
      setTestingId(webhook.id);
      setTestResult(null);
      const res = await fetch(`/api/chats/${chatId}/webhooks/${webhook.id}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      setTestResult({
        id: webhook.id,
        success: res.ok,
        message: data.message || data.error || (res.ok ? 'Test succeeded!' : 'Test failed'),
      });
    } catch (err: any) {
      setTestResult({
        id: webhook.id,
        success: false,
        message: err?.message || 'Failed to dispatch test',
      });
    } finally {
      setTestingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
        <div className="w-full max-w-md h-full bg-wa-light-sidebar-bg dark:bg-wa-dark-sidebar-bg border-l border-wa-light-border dark:border-wa-dark-border flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-wa-light-border dark:border-wa-dark-border bg-wa-light-header-bg dark:bg-wa-dark-header-bg">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-indigo-500/10 text-indigo-500">
                <Webhook className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                  Integrations & Webhooks
                </h2>
                <p className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate max-w-[220px]">
                  {chatTitle || 'Chat Integrations'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover text-wa-light-text-secondary dark:text-wa-dark-text-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary uppercase tracking-wider">
                Active Webhooks ({webhooks.length})
              </span>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-wa-green text-white rounded-md hover:bg-wa-green-hover shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Webhook</span>
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-md text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-wa-light-text-muted dark:text-wa-dark-text-muted">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-xs">Loading webhooks...</span>
              </div>
            ) : webhooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-wa-light-text-muted dark:text-wa-dark-text-muted">
                <div className="p-3 bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg rounded-full mb-3">
                  <Webhook className="w-8 h-8 opacity-40" />
                </div>
                <p className="text-xs font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
                  No webhooks configured
                </p>
                <p className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted mt-1 max-w-[250px]">
                  Connect external developer tools like GitHub, Jira, or custom APIs to this chat.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-4 px-3 py-1.5 text-xs font-medium bg-wa-green text-white rounded-md hover:bg-wa-green-hover"
                >
                  Create Your First Webhook
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((w) => (
                  <div
                    key={w.id}
                    className="p-3 bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg border border-wa-light-border dark:border-wa-dark-border rounded-lg space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            w.direction === 'INBOUND'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {w.direction === 'INBOUND' ? (
                            <ArrowDownLeft className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          <span>{w.direction}</span>
                        </span>
                        <h3 className="text-xs font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
                          {w.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Toggle active switch */}
                        <button
                          type="button"
                          onClick={() => toggleWebhook(w.id, w.isActive)}
                          className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                            w.isActive ? 'bg-wa-green justify-end' : 'bg-gray-300 dark:bg-gray-600 justify-start'
                          }`}
                          title={w.isActive ? 'Disable Webhook' : 'Enable Webhook'}
                        >
                          <div className="w-3 h-3 bg-white rounded-full shadow-xs" />
                        </button>
                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => deleteWebhook(w.id)}
                          className="p-1 text-wa-light-text-muted dark:text-wa-dark-text-muted hover:text-rose-500 rounded"
                          title="Delete Webhook"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {w.direction === 'INBOUND' && w.incomingUrl && (
                      <div className="flex items-center gap-1 bg-wa-light-sidebar-bg dark:bg-wa-dark-sidebar-bg p-1.5 rounded border border-wa-light-border dark:border-wa-dark-border text-[11px]">
                        <span className="flex-1 font-mono truncate text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
                          {w.incomingUrl}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(w.id, w.incomingUrl)}
                          className="p-1 rounded hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover text-wa-light-text-secondary dark:text-wa-dark-text-secondary shrink-0"
                          title="Copy URL"
                        >
                          {copiedId === w.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {w.direction === 'OUTBOUND' && w.targetUrl && (
                      <div className="text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary font-mono truncate">
                        Target: {w.targetUrl}
                      </div>
                    )}

                    {testResult && testResult.id === w.id && (
                      <div
                        className={`p-2 rounded text-[11px] ${
                          testResult.success
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {testResult.message}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-wa-light-border dark:border-wa-dark-border text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted">
                      <span>
                        {w.lastFiredAt
                          ? `Last fired: ${new Date(w.lastFiredAt).toLocaleTimeString()}`
                          : 'Never triggered'}
                      </span>
                      <button
                        type="button"
                        disabled={testingId === w.id}
                        onClick={() => handleTest(w)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover"
                      >
                        {testingId === w.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 text-wa-green" />
                        )}
                        <span>Test Ping</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateWebhookModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        chatId={chatId}
        onCreated={(newWebhook) => {
          setWebhooks((prev) => [newWebhook, ...prev]);
        }}
      />
    </>
  );
}
