'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ContactCard, { ContactData } from '@/components/contacts/ContactCard';
import AddContactDialog, { TargetContactUser } from '@/components/contacts/AddContactDialog';
import {
  ArrowLeft,
  Search,
  UserPlus,
  Users,
  Loader2,
  X,
} from 'lucide-react';

export interface ContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (userId: string) => void;
  onOpenNewChatModal: () => void;
}

export default function ContactDrawer({
  isOpen,
  onClose,
  onStartChat,
  onOpenNewChatModal,
}: ContactDrawerProps) {
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [editingContact, setEditingContact] = useState<TargetContactUser | null>(null);

  const fetchContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/contacts', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchContacts();
      setFilterQuery('');
    }
  }, [isOpen, fetchContacts]);

  const handleRemoveContact = async (contactId: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
      }
    } catch (err) {
      console.error('Failed to remove contact:', err);
    }
  };

  const handleEditAlias = (contact: ContactData) => {
    setEditingContact({
      id: contact.contactUser.id,
      username: contact.contactUser.username,
      displayName: contact.contactUser.displayName,
      avatarUrl: contact.contactUser.avatarUrl,
      about: contact.contactUser.about,
      existingAlias: contact.aliasName,
    });
  };

  // Filter contacts by local search query
  const filteredContacts = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return contacts;

    return contacts.filter((c) => {
      const name = (c.aliasName || c.contactUser.displayName).toLowerCase();
      const rawName = c.contactUser.displayName.toLowerCase();
      const username = c.contactUser.username.toLowerCase();
      return name.includes(q) || rawName.includes(q) || username.includes(q);
    });
  }, [contacts, filterQuery]);

  // Group contacts alphabetically by the first letter of their effective display name
  const groupedContacts = useMemo(() => {
    const groups: Record<string, ContactData[]> = {};

    // Sort contacts alphabetically
    const sorted = [...filteredContacts].sort((a, b) => {
      const nameA = a.aliasName || a.contactUser.displayName;
      const nameB = b.aliasName || b.contactUser.displayName;
      return nameA.localeCompare(nameB);
    });

    for (const contact of sorted) {
      const name = contact.aliasName || contact.contactUser.displayName;
      const firstChar = name.trim().charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(firstChar) ? firstChar : '#';

      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(contact);
    }

    return groups;
  }, [filteredContacts]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-30 bg-wa-light-sidebar dark:bg-wa-dark-sidebar flex flex-col transition-all duration-300 ease-in-out select-none"
      data-testid="contact-drawer"
    >
      {/* Drawer Top Header (WhatsApp Style) */}
      <div className="h-24 sm:h-28 bg-wa-green dark:bg-wa-dark-header border-b border-wa-light-border dark:border-wa-dark-border px-4 pb-3 flex items-end gap-5 text-white flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none"
          aria-label="Back to chats"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-lg font-medium leading-none mb-1">Contacts</h2>
          <p className="text-xs text-white/80">
            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
          </p>
        </div>
      </div>

      {/* Action Row & Filter */}
      <div className="p-3 border-b border-wa-light-border dark:border-wa-dark-border space-y-2.5">
        {/* Quick Filter Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-wa-light-text-muted dark:text-wa-dark-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-wa-light-input dark:bg-wa-dark-input border border-wa-light-border dark:border-wa-dark-border text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted focus:outline-none focus:ring-1 focus:ring-wa-green transition-all"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-wa-light-text-muted hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary"
              aria-label="Clear filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Add Contact Button */}
        <button
          type="button"
          onClick={onOpenNewChatModal}
          className="w-full py-2.5 px-3 rounded-xl bg-wa-light-input dark:bg-wa-dark-input hover:bg-wa-green/10 hover:text-wa-green border border-wa-light-border dark:border-wa-dark-border flex items-center gap-3 text-sm font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-wa-green flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <UserPlus className="w-4 h-4" />
          </div>
          <span>Find Users / Add New Contact</span>
        </button>
      </div>

      {/* Alphabetical Contact List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-wa-light-text-muted dark:text-wa-dark-text-muted gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-wa-green" />
            <span className="text-xs">Loading contacts...</span>
          </div>
        ) : Object.keys(groupedContacts).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-wa-light-text-muted dark:text-wa-dark-text-muted px-4">
            <Users className="w-10 h-10 mb-2 opacity-40 text-wa-green" />
            <p className="text-sm font-medium">
              {filterQuery ? 'No contacts match search' : 'No contacts saved yet'}
            </p>
            <p className="text-xs mt-1">
              {filterQuery
                ? 'Try a different name or @username'
                : 'Use "Find Users" to discover contacts on WebChat.'}
            </p>
          </div>
        ) : (
          Object.keys(groupedContacts)
            .sort()
            .map((letter) => (
              <div key={letter} className="mb-3">
                {/* Section Header */}
                <div className="sticky top-0 z-10 px-3 py-1 bg-wa-light-sidebar/95 dark:bg-wa-dark-sidebar/95 backdrop-blur-sm text-xs font-semibold text-wa-green uppercase tracking-wider">
                  {letter}
                </div>

                {/* Contacts in this letter */}
                <div className="space-y-0.5 mt-1">
                  {groupedContacts[letter].map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onStartChat={(userId) => {
                        onStartChat(userId);
                        onClose();
                      }}
                      onEditAlias={handleEditAlias}
                      onRemove={handleRemoveContact}
                    />
                  ))}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Edit Nickname Dialog */}
      <AddContactDialog
        isOpen={!!editingContact}
        onClose={() => setEditingContact(null)}
        targetUser={editingContact}
        onContactSaved={() => {
          fetchContacts();
        }}
      />
    </div>
  );
}
