'use client';

import React, { useState, useEffect } from 'react';
import Avatar from '@/components/ui/Avatar';
import SearchInput from '@/components/ui/SearchInput';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PickableContact {
  id: string;
  contactUserId: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  alias?: string | null;
}

export interface ContactPickerProps {
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  className?: string;
}

export default function ContactPicker({
  selectedIds,
  onChange,
  className,
}: ContactPickerProps) {
  const [contacts, setContacts] = useState<PickableContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;
    const fetchContacts = async () => {
      try {
        const res = await fetch('/api/contacts');
        if (res.ok && isSubscribed) {
          const data = await res.json();
          const items: PickableContact[] = (data.contacts || []).map((c: any) => ({
            id: c.id,
            contactUserId: c.contactUserId || c.contactUser?.id,
            name: c.contactUser?.displayName || c.alias || c.contactUser?.username || 'User',
            username: c.contactUser?.username || '',
            avatarUrl: c.contactUser?.avatarUrl || null,
            alias: c.alias,
          }));
          setContacts(items);
        }
      } catch (err) {
        console.error('[ContactPicker] Error loading contacts:', err);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    fetchContacts();
    return () => {
      isSubscribed = false;
    };
  }, []);

  const toggleSelect = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  const removeSelected = (userId: string) => {
    onChange(selectedIds.filter((id) => id !== userId));
  };

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q) ||
      (c.alias && c.alias.toLowerCase().includes(q))
    );
  });

  const selectedContactObjects = contacts.filter((c) =>
    selectedIds.includes(c.contactUserId)
  );

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Selected contact chips banner */}
      {selectedContactObjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-3 max-h-32 overflow-y-auto border-b border-wa-light-border dark:border-wa-dark-border bg-wa-light-hover/30 dark:bg-wa-dark-hover/30">
          {selectedContactObjects.map((contact) => (
            <div
              key={contact.contactUserId}
              className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-wa-light-header dark:bg-wa-dark-header border border-wa-light-border dark:border-wa-dark-border text-xs text-wa-light-text-primary dark:text-wa-dark-text-primary shadow-xs animate-in zoom-in-95 duration-100"
            >
              <Avatar name={contact.name} src={contact.avatarUrl} size="sm" className="w-5 h-5 text-[10px]" />
              <span className="max-w-[100px] truncate">{contact.name}</span>
              <button
                type="button"
                onClick={() => removeSelected(contact.contactUserId)}
                className="text-wa-light-text-muted dark:text-wa-dark-text-muted hover:text-red-500 rounded-full p-0.5 transition-colors focus:outline-none"
                aria-label={`Remove ${contact.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Contact search bar */}
      <div className="p-3 border-b border-wa-light-border dark:border-wa-dark-border">
        <SearchInput
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto divide-y divide-wa-light-border/40 dark:divide-wa-dark-border/40">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-wa-light-text-muted dark:text-wa-dark-text-muted">
            Loading contacts...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-6 text-center text-sm text-wa-light-text-muted dark:text-wa-dark-text-muted">
            {searchQuery ? 'No matching contacts found' : 'No contacts in address book'}
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const isSelected = selectedIds.includes(contact.contactUserId);
            return (
              <div
                key={contact.contactUserId}
                onClick={() => toggleSelect(contact.contactUserId)}
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={contact.name} src={contact.avatarUrl} size="md" />
                  <div>
                    <h4 className="text-sm font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
                      {contact.name}
                    </h4>
                    <p className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
                      @{contact.username}
                    </p>
                  </div>
                </div>

                {/* Checkbox indicator */}
                <div
                  className={cn(
                    'w-5 h-5 rounded flex items-center justify-center transition-colors border',
                    isSelected
                      ? 'bg-wa-green border-wa-green text-white'
                      : 'border-wa-light-border dark:border-wa-dark-border bg-transparent'
                  )}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
