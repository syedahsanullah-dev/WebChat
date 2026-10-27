'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import { Copy, Check, Shield } from 'lucide-react';

interface AuditDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: any | null;
}

export default function AuditDetailsModal({ isOpen, onClose, log }: AuditDetailsModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!log) return null;

  let parsedDetails: any = null;
  if (log.metadata) {
    try {
      parsedDetails = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
    } catch {
      parsedDetails = log.metadata;
    }
  }

  const handleCopyJson = () => {
    const jsonString = JSON.stringify(
      {
        id: log.id,
        action: log.action,
        resource: log.resource,
        actor: log.user ? `@${log.user.username}` : 'SYSTEM',
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
        metadata: parsedDetails,
      },
      null,
      2
    );
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Audit Event Metadata Inspector" size="lg">
      <div className="space-y-4 py-2">
        <div className="grid grid-cols-2 gap-3 p-3 bg-wa-light-chat-bg dark:bg-wa-dark-chat-bg rounded-lg border border-wa-light-border dark:border-wa-dark-border text-xs">
          <div>
            <span className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary block">
              Action
            </span>
            <span className="font-mono font-bold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {log.action}
            </span>
          </div>
          <div>
            <span className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary block">
              Resource
            </span>
            <span className="font-mono text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {log.resource}
            </span>
          </div>
          <div>
            <span className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary block">
              Actor
            </span>
            <span className="font-semibold text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {log.user ? `${log.user.displayName} (@${log.user.username})` : 'System Daemon'}
            </span>
          </div>
          <div>
            <span className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary block">
              IP Address
            </span>
            <span className="font-mono text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {log.ipAddress || '127.0.0.1'}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary block">
              User Agent
            </span>
            <span className="font-mono text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted truncate block">
              {log.userAgent || 'Unknown'}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary uppercase tracking-wider">
              Event Details (JSON)
            </span>
            <button
              type="button"
              onClick={handleCopyJson}
              className="flex items-center gap-1 text-xs text-wa-green hover:underline cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>
          <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto leading-relaxed border border-gray-800">
            {JSON.stringify(parsedDetails || { message: 'No additional metadata recorded' }, null, 2)}
          </pre>
        </div>

        <div className="flex justify-end pt-2 border-t border-wa-light-border dark:border-wa-dark-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-wa-light-hover dark:bg-wa-dark-hover hover:opacity-80 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
