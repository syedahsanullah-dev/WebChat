'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Avatar from '@/components/ui/Avatar';
import SearchInput from '@/components/ui/SearchInput';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import Modal from '@/components/ui/Modal';
import ProfileDrawer from '@/components/profile/ProfileDrawer';
import LinkedDevicesDrawer from '@/components/settings/LinkedDevicesDrawer';
import InstallAppBanner from '@/components/pwa/InstallAppBanner';
import PushPermissionBanner from '@/components/ui/PushPermissionBanner';
import NotificationSettings from '@/components/settings/NotificationSettings';
import NewChatModal from '@/components/contacts/NewChatModal';
import ContactDrawer from '@/components/contacts/ContactDrawer';
import CreateGroupModal from '@/components/groups/CreateGroupModal';
import ConversationItem, { ConversationItemData } from '@/components/sidebar/ConversationItem';
import { usePresence } from '@/hooks/usePresence';
import { useWebSocket } from '@/context/WebSocketContext';
import { UserTypingStatusPayload, MessageNewPayload, MessageAckPayload } from '@shared/events';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  Sun,
  Moon,
  MessageSquare,
  MessageSquarePlus,
  Megaphone,
  Users,
  Settings,
  LogOut,
  User,
  ShieldCheck,
  BookUser,
  Laptop,
  Bell,
  Star,
} from 'lucide-react';
import ChannelsSidebarTab from '@/components/channels/ChannelsSidebarTab';
import StarredMessagesDrawer from '@/components/starred/StarredMessagesDrawer';

export interface ChatItemData {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  lastMessage: string;
  time: string;
  lastMessageAt?: string;
  lastSeen?: string;
  unreadCount?: number;
  isOnline: boolean;
  isGroup?: boolean;
  isChannel?: boolean;
  isChannelAdmin?: boolean;
  channelMetadata?: any;
  groupDescription?: string | null;
  otherUser?: any;
}

export const MOCK_CHATS: ChatItemData[] = [];

export interface SidebarProps {
  onSelectChat: (chatId: string, chatData?: any) => void;
  activeChatId?: string | null;
  className?: string;
  initialChats?: ConversationItemData[];
}

export default function Sidebar({
  onSelectChat,
  activeChatId,
  className,
  initialChats = [],
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { isUserOnline } = usePresence();
  const { subscribe } = useWebSocket();

  const [chats, setChats] = useState<ConversationItemData[]>(initialChats);
  const [typingChats, setTypingChats] = useState<Record<string, { isTyping: boolean; username?: string }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'groups'>('all');
  const [activeModal, setActiveModal] = useState<'settings' | 'new-group' | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLinkedDevicesOpen, setIsLinkedDevicesOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isContactDrawerOpen, setIsContactDrawerOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'channels'>('chats');
  const [isStarredOpen, setIsStarredOpen] = useState(false);

  // Fetch chats from REST API
  const refreshChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chats', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.chats)) {
          setChats(data.chats);
        }
      }
    } catch {
      // Swallowed safely in dev
    }
  }, []);

  useEffect(() => {
    refreshChats();
  }, [refreshChats, user]);

  // Subscribe to typing indicators
  useEffect(() => {
    const unsubStart = subscribe<UserTypingStatusPayload>('typing:start', (payload) => {
      if (!payload?.chatId) return;
      if (user && payload.userId === user.id) return;
      setTypingChats((prev) => ({
        ...prev,
        [payload.chatId]: { isTyping: true, username: payload.username },
      }));
    });

    const unsubStop = subscribe<UserTypingStatusPayload>('typing:stop', (payload) => {
      if (!payload?.chatId) return;
      if (user && payload.userId === user.id) return;
      setTypingChats((prev) => {
        const next = { ...prev };
        delete next[payload.chatId];
        return next;
      });
    });

    return () => {
      unsubStart();
      unsubStop();
    };
  }, [subscribe, user]);

  // Subscribe to real-time message updates to re-order conversations to top
  useEffect(() => {
    const unsubNew = subscribe<MessageNewPayload>('message:new', (payload) => {
      if (!payload?.chatId) return;

      setChats((prev) => {
        const targetIndex = prev.findIndex((c) => c.id === payload.chatId);
        if (targetIndex !== -1) {
          const target = prev[targetIndex];
          const isNotActive = payload.chatId !== activeChatId;
          const updatedChat: ConversationItemData = {
            ...target,
            lastMessage: payload.content || (payload.type === 'image' ? 'Photo' : 'Audio'),
            lastMessageAt:
              payload.createdAt instanceof Date
                ? payload.createdAt.toISOString()
                : String(payload.createdAt || new Date().toISOString()),
            unreadCount: isNotActive ? (target.unreadCount || 0) + 1 : 0,
          };

          const remaining = prev.filter((_, idx) => idx !== targetIndex);
          return [updatedChat, ...remaining];
        }

        // Chat not currently in list: refresh conversation list from server
        refreshChats();
        return prev;
      });
    });

    const unsubAck = subscribe<MessageAckPayload>('message:ack', (payload) => {
      if (!payload?.chatId) return;

      setChats((prev) => {
        const targetIndex = prev.findIndex((c) => c.id === payload.chatId);
        if (targetIndex !== -1) {
          const target = prev[targetIndex];
          const updatedChat: ConversationItemData = {
            ...target,
            lastMessageAt: payload.createdAt || new Date().toISOString(),
          };
          const remaining = prev.filter((_, idx) => idx !== targetIndex);
          return [updatedChat, ...remaining];
        }
        return prev;
      });
    });

    return () => {
      unsubNew();
      unsubAck();
    };
  }, [subscribe, activeChatId, refreshChats]);

  // Handle open direct 1-on-1 chat
  const handleOpenDirectChat = async (targetUserId: string, existingChatId?: string | null) => {
    if (existingChatId) {
      const existing = chats.find((c) => c.id === existingChatId);
      onSelectChat(existingChatId, existing || null);
      return;
    }

    try {
      const res = await fetch('/api/chats/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      });

      if (res.ok) {
        const data = await res.json();
        const chat = data.chat;
        const otherParticipant = chat.participants?.find((p: any) => p.userId !== user?.id);
        const otherUser = otherParticipant?.user;

        const chatItem: ConversationItemData = {
          id: chat.id,
          name: otherUser?.displayName || 'Direct Chat',
          username: otherUser ? `@${otherUser.username}` : '',
          avatar: otherUser?.avatarUrl,
          otherUser: otherUser,
          lastMessage: '',
          lastMessageAt: chat.lastMessageAt || new Date().toISOString(),
          unreadCount: 0,
          isOnline: Boolean(otherUser?.isOnline),
          isGroup: false,
        };

        setChats((prev) => {
          if (prev.some((c) => c.id === chat.id)) return prev;
          return [chatItem, ...prev];
        });

        onSelectChat(chat.id, chatItem);
      } else {
        onSelectChat('chat-' + targetUserId);
      }
    } catch {
      onSelectChat('chat-' + targetUserId);
    }
  };

  const menuItems: DropdownMenuItem[] = [
    {
      id: 'new-chat',
      label: 'New Chat',
      icon: <MessageSquarePlus className="w-4 h-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary" />,
      onClick: () => setIsNewChatModalOpen(true),
    },
    {
      id: 'contacts',
      label: 'Contacts',
      icon: <BookUser className="w-4 h-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary" />,
      onClick: () => setIsContactDrawerOpen(true),
    },
    {
      id: 'new-group',
      label: 'New Group',
      icon: <Users className="w-4 h-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary" />,
      onClick: () => setActiveModal('new-group'),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="w-4 h-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary" />,
      onClick: () => setIsProfileOpen(true),
    },
    {
      id: 'linked-devices',
      label: 'Linked devices',
      icon: <Laptop className="w-4 h-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary" />,
      onClick: () => setIsLinkedDevicesOpen(true),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <Bell className="w-4 h-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary" />,
      onClick: () => setIsNotificationsOpen(true),
    },
    {
      id: 'starred',
      label: 'Starred messages',
      icon: <Star className="w-4 h-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary" />,
      onClick: () => setIsStarredOpen(true),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4 text-wa-light-text-secondary dark:text-wa-dark-text-secondary" />,
      onClick: () => setActiveModal('settings'),
    },
    {
      id: 'logout',
      label: 'Log out',
      icon: <LogOut className="w-4 h-4" />,
      danger: true,
      divider: true,
      onClick: () => logout(),
    },
  ];

  const filteredChats = useMemo(() => {
    return chats.filter((chat) => {
      // Search filter
      const matchesSearch =
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.username && chat.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
        chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Category tab filter
      if (filterType === 'unread') return (chat.unreadCount ?? 0) > 0;
      if (filterType === 'groups') return chat.isGroup;
      return true;
    });
  }, [chats, searchQuery, filterType]);

  return (
    <aside
      className={cn(
        'relative h-full flex flex-col bg-wa-light-sidebar dark:bg-wa-dark-sidebar border-r border-wa-light-border dark:border-wa-dark-border select-none overflow-hidden transition-colors',
        className
      )}
    >
      {/* Slide-over WhatsApp Profile Drawer */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Slide-over WhatsApp Linked Devices Drawer */}
      <LinkedDevicesDrawer
        isOpen={isLinkedDevicesOpen}
        onClose={() => setIsLinkedDevicesOpen(false)}
      />

      {/* Slide-over WhatsApp Notification Settings Drawer */}
      <NotificationSettings
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Slide-over WhatsApp Contact Drawer */}
      <ContactDrawer
        isOpen={isContactDrawerOpen}
        onClose={() => setIsContactDrawerOpen(false)}
        onStartChat={(targetUserId) => {
          handleOpenDirectChat(targetUserId);
        }}
        onOpenNewChatModal={() => setIsNewChatModalOpen(true)}
      />

      {/* Slide-over WhatsApp Starred Messages Drawer */}
      <StarredMessagesDrawer
        isOpen={isStarredOpen}
        onClose={() => setIsStarredOpen(false)}
        onSelectMessage={(chatId, messageId) => {
          const chatData = chats.find((c) => c.id === chatId);
          onSelectChat(chatId, chatData);
        }}
      />

      {/* Sidebar Top Header */}
      <Header
        leftContent={
          <div className="flex items-center gap-2">
            <Avatar
              src={user?.avatarUrl}
              name={user?.displayName || 'My Profile'}
              size="md"
              isOnline={true}
              onClick={() => setIsProfileOpen(true)}
            />
            {/* Chats vs Channels Tab Switcher */}
            <div className="flex items-center bg-black/5 dark:bg-white/5 p-0.5 rounded-xl border border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setSidebarTab('chats')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all',
                  sidebarTab === 'chats'
                    ? 'bg-white dark:bg-[#202c33] text-[#00a884] shadow-xs'
                    : 'text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary'
                )}
                title="Chats"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chats</span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('channels')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all',
                  sidebarTab === 'channels'
                    ? 'bg-white dark:bg-[#202c33] text-[#00a884] shadow-xs'
                    : 'text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary'
                )}
                title="Channels"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Channels</span>
              </button>
            </div>
          </div>
        }
        rightContent={
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* New Chat Button */}
            <button
              type="button"
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-2 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
              aria-label="New chat or find contacts"
              title="New chat"
            >
              <MessageSquarePlus className="w-5 h-5" />
            </button>

            {/* Three-dots Menu */}
            <DropdownMenu items={menuItems} align="right" />
          </div>
        }
      />

      {sidebarTab === 'channels' ? (
        <ChannelsSidebarTab
          activeChannelId={activeChatId}
          onSelectChannel={(channelId) => {
            const existing = chats.find((c) => c.id === channelId);
            if (existing) {
              onSelectChat(channelId, existing);
            } else {
              onSelectChat(channelId, { id: channelId, isGroup: true, isChannel: true });
            }
          }}
        />
      ) : (
        <>
          {/* PWA Install Promotion Banner */}
          <InstallAppBanner />

          {/* Web Push Notifications Permission Banner */}
          <PushPermissionBanner />

          {/* Search Input Box */}
          <div className="px-3 py-2 border-b border-wa-light-border dark:border-wa-dark-border">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search or start new chat"
            />
          </div>

          {/* Filter Tabs (All / Unread / Groups) */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-wa-light-border dark:border-wa-dark-border text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={cn(
                'px-3 py-1 rounded-full font-medium transition-colors focus:outline-none',
                filterType === 'all'
                  ? 'bg-wa-green/15 text-wa-green dark:bg-wa-green/20'
                  : 'bg-wa-light-hover dark:bg-wa-dark-hover text-wa-light-text-secondary dark:text-wa-dark-text-secondary'
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType('unread')}
              className={cn(
                'px-3 py-1 rounded-full font-medium transition-colors focus:outline-none',
                filterType === 'unread'
                  ? 'bg-wa-green/15 text-wa-green dark:bg-wa-green/20'
                  : 'bg-wa-light-hover dark:bg-wa-dark-hover text-wa-light-text-secondary dark:text-wa-dark-text-secondary'
              )}
            >
              Unread
            </button>
            <button
              type="button"
              onClick={() => setFilterType('groups')}
              className={cn(
                'px-3 py-1 rounded-full font-medium transition-colors focus:outline-none',
                filterType === 'groups'
                  ? 'bg-wa-green/15 text-wa-green dark:bg-wa-green/20'
                  : 'bg-wa-light-hover dark:bg-wa-dark-hover text-wa-light-text-secondary dark:text-wa-dark-text-secondary'
              )}
            >
              Groups
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-wa-light-border/40 dark:divide-wa-dark-border/40">
            {filteredChats.length === 0 ? (
              <div className="p-6 text-center text-sm text-wa-light-text-muted dark:text-wa-dark-text-muted">
                No chats found
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = activeChatId === chat.id;
                const isChatOnline = chat.isGroup
                  ? false
                  : Boolean(
                      (chat.otherUser?.id && isUserOnline(chat.otherUser.id)) ||
                      isUserOnline(chat.username?.replace('@', '') || '')
                    );
                const isTyping = Boolean(typingChats[chat.id]?.isTyping);
                const typingUsername = typingChats[chat.id]?.username;

                return (
                  <ConversationItem
                    key={chat.id}
                    chat={{ ...chat, isOnline: isChatOnline }}
                    isSelected={isSelected}
                    isTyping={isTyping}
                    typingUsername={typingUsername}
                    onSelect={(id) => onSelectChat(id, chat)}
                  />
                );
              })
            )}
          </div>
        </>
      )}

      {/* Settings Modal */}
      <Modal
        isOpen={activeModal === 'settings'}
        onClose={() => setActiveModal(null)}
        title="Settings"
      >
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between p-3 rounded-lg bg-wa-light-input dark:bg-wa-dark-input">
            <span className="font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Dark Theme
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3 py-1 text-xs rounded-md bg-wa-green text-white font-medium hover:opacity-90 transition-opacity"
            >
              {theme === 'dark' ? 'Disable' : 'Enable'}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
            <ShieldCheck className="w-4 h-4 text-wa-green" />
            <span>End-to-end encrypted messaging via Fastify native WebSockets.</span>
          </div>
        </div>
      </Modal>

      {/* Multi-Step New Group Modal */}
      <CreateGroupModal
        isOpen={activeModal === 'new-group'}
        onClose={() => setActiveModal(null)}
        onGroupCreated={(newGroup) => {
          refreshChats();
          onSelectChat(newGroup.id, {
            id: newGroup.id,
            name: newGroup.groupTitle,
            avatar: newGroup.groupAvatarUrl,
            isGroup: true,
          });
        }}
      />

      {/* Find Users Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onStartChat={(targetUserId, existingChatId) => {
          handleOpenDirectChat(targetUserId, existingChatId);
        }}
      />
    </aside>
  );
}
