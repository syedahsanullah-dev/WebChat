'use client';

import React, { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import Avatar from '@/components/ui/Avatar';
import SearchInput from '@/components/ui/SearchInput';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import Modal from '@/components/ui/Modal';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import {
  Sun,
  Moon,
  MessageSquarePlus,
  CheckCheck,
  Users,
  Settings,
  LogOut,
  User,
  ShieldCheck,
} from 'lucide-react';

export interface ChatItemData {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  isOnline: boolean;
  isGroup?: boolean;
}

export const MOCK_CHATS: ChatItemData[] = [
  {
    id: 'chat-1',
    name: 'Sarah Connor',
    username: '@sarah',
    lastMessage: 'Let us coordinate the server deployment tonight.',
    time: '12:45 PM',
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: 'chat-2',
    name: 'Tech Lead Alex',
    username: '@alex_lead',
    lastMessage: 'The Fastify WebSocket daemon runs smoothly at 28MB RAM!',
    time: '11:20 AM',
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: 'chat-3',
    name: 'DevOps & Infrastructure',
    username: '@infra_team',
    lastMessage: 'GitHub Actions workflow deployed standalone server.',
    time: 'Yesterday',
    unreadCount: 0,
    isOnline: false,
    isGroup: true,
  },
  {
    id: 'chat-4',
    name: 'Elena Rostova',
    username: '@elena_r',
    lastMessage: 'Voice call quality with Opus codec is crystal clear.',
    time: 'Yesterday',
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: 'chat-5',
    name: 'Marcus Brody',
    username: '@brody_m',
    lastMessage: 'See you in the audio call shortly 👍',
    time: 'Wednesday',
    unreadCount: 0,
    isOnline: true,
  },
];

export interface SidebarProps {
  onSelectChat: (chatId: string) => void;
  activeChatId?: string | null;
  className?: string;
}

export default function Sidebar({
  onSelectChat,
  activeChatId,
  className,
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'groups'>('all');
  const [activeModal, setActiveModal] = useState<'profile' | 'settings' | 'new-group' | null>(null);

  const menuItems: DropdownMenuItem[] = [
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
      onClick: () => setActiveModal('profile'),
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
      onClick: () => alert('Logged out'),
    },
  ];

  const filteredChats = useMemo(() => {
    return MOCK_CHATS.filter((chat) => {
      // Search filter
      const matchesSearch =
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Category tab filter
      if (filterType === 'unread') return (chat.unreadCount ?? 0) > 0;
      if (filterType === 'groups') return chat.isGroup;
      return true;
    });
  }, [searchQuery, filterType]);

  return (
    <aside
      className={cn(
        'h-full flex flex-col bg-wa-light-sidebar dark:bg-wa-dark-sidebar border-r border-wa-light-border dark:border-wa-dark-border select-none overflow-hidden transition-colors',
        className
      )}
    >
      {/* Sidebar Top Header */}
      <Header
        leftContent={
          <div className="flex items-center gap-3">
            <Avatar
              name="My Profile"
              size="md"
              isOnline={true}
              onClick={() => setActiveModal('profile')}
            />
            <span className="font-semibold text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary hidden sm:inline-block">
              Chats
            </span>
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
              onClick={() => setActiveModal('new-group')}
              className="p-2 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
              aria-label="New chat or group"
              title="New group"
            >
              <MessageSquarePlus className="w-5 h-5" />
            </button>

            {/* Three-dots Menu */}
            <DropdownMenu items={menuItems} align="right" />
          </div>
        }
      />

      {/* Search Input Box */}
      <div className="px-3 py-2 border-b border-wa-light-border dark:border-wa-dark-border">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search or start new chat"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-wa-light-border/60 dark:border-wa-dark-border/60 overflow-x-auto scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={cn(
            'px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap',
            filterType === 'all'
              ? 'bg-wa-green text-white'
              : 'bg-wa-light-input dark:bg-wa-dark-input text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover'
          )}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilterType('unread')}
          className={cn(
            'px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap',
            filterType === 'unread'
              ? 'bg-wa-green text-white'
              : 'bg-wa-light-input dark:bg-wa-dark-input text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover'
          )}
        >
          Unread
        </button>
        <button
          type="button"
          onClick={() => setFilterType('groups')}
          className={cn(
            'px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap',
            filterType === 'groups'
              ? 'bg-wa-green text-white'
              : 'bg-wa-light-input dark:bg-wa-dark-input text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover'
          )}
        >
          Groups
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-wa-light-border/50 dark:divide-wa-dark-border/50">
        {filteredChats.length === 0 ? (
          <div className="p-6 text-center text-sm text-wa-light-text-muted dark:text-wa-dark-text-muted">
            No chats found
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = activeChatId === chat.id;
            return (
              <div
                key={chat.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectChat(chat.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectChat(chat.id);
                  }
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors outline-none',
                  isSelected
                    ? 'bg-wa-light-active dark:bg-wa-dark-active'
                    : 'hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover'
                )}
              >
                <Avatar
                  name={chat.name}
                  src={chat.avatar}
                  size="lg"
                  isOnline={chat.isOnline}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
                      {chat.name}
                    </span>
                    <span
                      className={cn(
                        'text-xs flex-shrink-0 ml-2',
                        chat.unreadCount && chat.unreadCount > 0
                          ? 'text-wa-green font-medium'
                          : 'text-wa-light-text-muted dark:text-wa-dark-text-muted'
                      )}
                    >
                      {chat.time}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <p className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary truncate flex items-center gap-1">
                      {!chat.isGroup && (
                        <CheckCheck className="w-3.5 h-3.5 text-wa-blue-tick flex-shrink-0" />
                      )}
                      <span className="truncate">{chat.lastMessage}</span>
                    </p>

                    {chat.unreadCount && chat.unreadCount > 0 ? (
                      <span className="flex-shrink-0 ml-2 min-w-5 h-5 px-1.5 rounded-full bg-wa-green text-white text-[11px] font-bold flex items-center justify-center">
                        {chat.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals for Sidebar Actions */}
      <Modal
        isOpen={activeModal === 'profile'}
        onClose={() => setActiveModal(null)}
        title="Profile"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <Avatar name="My User" size="xl" isOnline={true} />
          <div>
            <h3 className="font-semibold text-lg text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Demo User
            </h3>
            <p className="text-sm text-wa-green font-medium">@demouser</p>
          </div>
          <p className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
            This identity is based on your unique @username and email. Zero SMS or phone numbers required.
          </p>
        </div>
      </Modal>

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

      <Modal
        isOpen={activeModal === 'new-group'}
        onClose={() => setActiveModal(null)}
        title="Create New Group"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Group subject..."
            className="w-full px-3 py-2 rounded-lg bg-wa-light-input dark:bg-wa-dark-input border border-wa-light-border dark:border-wa-dark-border text-sm focus:outline-none focus:ring-1 focus:ring-wa-green text-wa-light-text-primary dark:text-wa-dark-text-primary"
          />
          <button
            type="button"
            onClick={() => setActiveModal(null)}
            className="w-full py-2 bg-wa-green hover:bg-wa-green-dark text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Create Group
          </button>
        </div>
      </Modal>
    </aside>
  );
}
