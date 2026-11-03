'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import AddContactDialog, { TargetContactUser } from '@/components/contacts/AddContactDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { usePresence } from '@/hooks/usePresence';
import {
  Search,
  X,
  MessageSquare,
  UserPlus,
  Check,
  Loader2,
  Users,
} from 'lucide-react';

export interface SearchResultUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string | null;
  about?: string | null;
  isOnline?: boolean;
  isContact: boolean;
  aliasName?: string | null;
  contactId?: string | null;
  existingChatId?: string | null;
}

export interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (userId: string, existingChatId?: string | null) => void;
  onContactUpdated?: () => void;
}

export default function NewChatModal({
  isOpen,
  onClose,
  onStartChat,
  onContactUpdated,
}: NewChatModalProps) {
  const { isUserOnline } = usePresence();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  const [results, setResults] = useState<SearchResultUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [targetContactForDialog, setTargetContactForDialog] = useState<TargetContactUser | null>(null);

  // Clear search on modal close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults([]);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Execute search when debouncedQuery changes
  useEffect(() => {
    const query = debouncedQuery.trim();
    if (!query) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setResults(data.users || []);
        }
      })
      .catch((err) => {
        console.error('Search error:', err);
        if (isMounted) {
          setResults([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  const handleContactSaved = () => {
    // Refresh search results
    if (debouncedQuery.trim()) {
      fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => setResults(data.users || []));
    }
    if (onContactUpdated) {
      onContactUpdated();
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Find Users"
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Search Bar with live indicator */}
          <div className="relative">
            <Search className="w-4 h-4 text-wa-light-text-muted dark:text-wa-dark-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by @username or email..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-wa-light-input dark:bg-wa-dark-input border border-wa-light-border dark:border-wa-dark-border text-base sm:text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted focus:outline-none focus:ring-2 focus:ring-wa-green transition-all"
              autoFocus
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-wa-light-text-muted hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>



          {/* Results List */}
          <div className="min-h-[180px] sm:min-h-[220px] max-h-[calc(70dvh-120px)] sm:max-h-[380px] overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-wa-light-text-muted dark:text-wa-dark-text-muted gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-wa-green" />
                <span className="text-xs">Searching user directory...</span>
              </div>
            ) : searchQuery.trim() && results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-wa-light-text-muted dark:text-wa-dark-text-muted text-center px-4">
                <Users className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No users found</p>
                <p className="text-xs mt-1">
                  No registered accounts matched &ldquo;{searchQuery}&rdquo;.
                </p>
              </div>
            ) : !searchQuery.trim() ? (
              <div className="flex flex-col items-center justify-center py-12 text-wa-light-text-muted dark:text-wa-dark-text-muted text-center px-4">
                <Search className="w-8 h-8 mb-2 opacity-40 text-wa-green" />
                <p className="text-sm font-medium">Search</p>
                <p className="text-xs mt-1">
                  Find people by their @username or email address.
                </p>
              </div>
            ) : (
              results.map((user) => {
                const isOnline = isUserOnline(user.id) || isUserOnline(user.username) || user.isOnline;
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover border border-transparent hover:border-wa-light-border dark:hover:border-wa-dark-border transition-colors group"
                  >
                    <Avatar
                      src={user.avatarUrl}
                      name={user.displayName}
                      size="md"
                      isOnline={isOnline}
                    />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
                        {user.aliasName || user.displayName}
                      </h4>
                      {user.aliasName && (
                        <span className="text-[11px] text-wa-light-text-muted truncate">
                          ({user.displayName})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-wa-green truncate">
                        @{user.username}
                      </span>
                      {user.about && (
                        <>
                          <span className="text-wa-light-text-muted">•</span>
                          <span className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate">
                            {user.about}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {user.isContact ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-wa-green bg-wa-green/10 px-2 py-1 rounded-full border border-wa-green/20">
                        <Check className="w-3 h-3" />
                        <span>Added</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setTargetContactForDialog({
                            id: user.id,
                            username: user.username,
                            displayName: user.displayName,
                            avatarUrl: user.avatarUrl,
                            about: user.about,
                          })
                        }
                        className="p-1.5 rounded-lg text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-green hover:bg-wa-green/10 text-xs font-medium flex items-center gap-1 transition-colors border border-wa-light-border dark:border-wa-dark-border"
                        title="Add to Contacts"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Add</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onStartChat(user.id, user.existingChatId);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-wa-green hover:bg-wa-green-dark text-white text-xs font-medium flex items-center gap-1 shadow-sm transition-colors"
                      title="Start direct conversation"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Add / Edit Contact Nickname Dialog */}
      <AddContactDialog
        isOpen={!!targetContactForDialog}
        onClose={() => setTargetContactForDialog(null)}
        targetUser={targetContactForDialog}
        onContactSaved={handleContactSaved}
      />
    </>
  );
}
