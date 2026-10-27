'use client';

import React from 'react';
import Avatar from '@/components/ui/Avatar';
import { usePresence } from '@/hooks/usePresence';
import { MessageSquare, Pencil, Trash2, ShieldAlert } from 'lucide-react';

export interface ContactData {
  id: string;
  userId: string;
  contactUserId: string;
  aliasName?: string | null;
  createdAt?: string;
  contactUser: {
    id: string;
    username: string;
    displayName: string;
    email?: string;
    avatarUrl?: string | null;
    about?: string | null;
    isOnline?: boolean;
    lastSeen?: string;
  };
}

export interface ContactCardProps {
  contact: ContactData;
  onStartChat: (userId: string) => void;
  onEditAlias?: (contact: ContactData) => void;
  onRemove?: (contactId: string) => void;
  onReport?: (contact: ContactData) => void;
}

export default function ContactCard({
  contact,
  onStartChat,
  onEditAlias,
  onRemove,
  onReport,
}: ContactCardProps) {
  const { isUserOnline } = usePresence();
  const { contactUser, aliasName } = contact;
  const displayName = aliasName || contactUser.displayName;
  const hasAlias = !!aliasName && aliasName !== contactUser.displayName;
  const isOnline = isUserOnline(contactUser.id) || isUserOnline(contactUser.username) || contactUser.isOnline;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover transition-colors group cursor-pointer border border-transparent hover:border-wa-light-border dark:hover:border-wa-dark-border">
      {/* Avatar */}
      <div onClick={() => onStartChat(contactUser.id)}>
        <Avatar
          src={contactUser.avatarUrl}
          name={displayName}
          size="md"
          isOnline={isOnline}
        />
      </div>

      {/* Details */}
      <div
        className="min-w-0 flex-1"
        onClick={() => onStartChat(contactUser.id)}
      >
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
            {displayName}
          </h4>
          {hasAlias && (
            <span className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted truncate">
              ({contactUser.displayName})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-wa-green truncate">
            @{contactUser.username}
          </span>
          {contactUser.about && (
            <>
              <span className="text-wa-light-text-muted dark:text-wa-dark-text-muted">•</span>
              <span className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate">
                {contactUser.about}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStartChat(contactUser.id);
          }}
          className="p-1.5 rounded-full text-wa-green hover:bg-wa-green/10 transition-colors"
          title="Start Chat"
          aria-label="Start Chat"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        {onEditAlias && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditAlias(contact);
            }}
            className="p-1.5 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Edit Nickname"
            aria-label="Edit Nickname"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}

        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(contact.id);
            }}
            className="p-1.5 rounded-full text-red-500 hover:bg-red-500/10 transition-colors"
            title="Remove Contact"
            aria-label="Remove Contact"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {onReport && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReport(contact);
            }}
            className="p-1.5 rounded-full text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Report Contact"
            aria-label="Report Contact"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
