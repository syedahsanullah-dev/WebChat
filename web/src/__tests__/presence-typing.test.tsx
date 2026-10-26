import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { formatLastSeen, usePresence } from '../hooks/usePresence';
import { useTyping, TYPING_THROTTLE_MS, TYPING_INACTIVITY_TIMEOUT_MS } from '../hooks/useTyping';
import ChatHeader from '../components/chat/ChatHeader';
import TypingDots from '../components/chat/TypingDots';
import ConversationSnippet from '../components/sidebar/ConversationSnippet';
import * as WebSocketContextModule from '../context/WebSocketContext';
import * as AuthContextModule from '../context/AuthContext';

describe('Phase 05: Real-Time Presence & Status Engine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('1. formatLastSeen helper', () => {
    it('returns empty string for null or undefined', () => {
      expect(formatLastSeen(null)).toBe('');
      expect(formatLastSeen(undefined)).toBe('');
      expect(formatLastSeen('')).toBe('');
    });

    it('returns "last seen just now" for timestamps within past 60 seconds', () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
      expect(formatLastSeen(thirtySecondsAgo)).toBe('last seen just now');
    });

    it('returns "last seen today at..." for earlier today', () => {
      const now = new Date(2026, 9, 26, 14, 30); // 2:30 PM
      vi.setSystemTime(now);

      const twoHoursAgo = new Date(2026, 9, 26, 12, 15); // 12:15 PM
      const formatted = formatLastSeen(twoHoursAgo);
      expect(formatted).toBe('last seen today at 12:15 PM');
    });

    it('returns "last seen yesterday at..." for yesterday', () => {
      const now = new Date(2026, 9, 26, 14, 30);
      vi.setSystemTime(now);

      const yesterday = new Date(2026, 9, 25, 20, 20); // 8:20 PM
      const formatted = formatLastSeen(yesterday);
      expect(formatted).toBe('last seen yesterday at 8:20 PM');
    });
  });

  describe('2. usePresence Hook', () => {
    it('subscribes to user:online and user:offline events and updates presence state', () => {
      const subscribers: Record<string, (payload: any) => void> = {};

      vi.spyOn(WebSocketContextModule, 'useWebSocket').mockReturnValue({
        status: 'connected',
        isConnected: true,
        send: vi.fn(),
        subscribe: vi.fn((type: string, cb: (payload: any) => void) => {
          subscribers[type] = cb;
          return () => {
            delete subscribers[type];
          };
        }),
      });

      const { result } = renderHook(() => usePresence());

      expect(result.current.isUserOnline('user-1')).toBe(false);

      // Simulate incoming user:online
      act(() => {
        subscribers['user:online']?.({ userId: 'user-1', username: 'ahsan' });
      });

      expect(result.current.isUserOnline('user-1')).toBe(true);
      expect(result.current.getPresenceStatusText('user-1')).toBe('online');

      // Simulate incoming user:offline
      const offlineDate = new Date(Date.now() - 10 * 1000).toISOString();
      act(() => {
        subscribers['user:offline']?.({ userId: 'user-1', lastSeen: offlineDate });
      });

      expect(result.current.isUserOnline('user-1')).toBe(false);
      expect(result.current.getUserLastSeen('user-1')).toBe(offlineDate);
      expect(result.current.getPresenceStatusText('user-1')).toBe('last seen just now');
    });
  });

  describe('3. useTyping Hook', () => {
    it('throttles outgoing typing:start envelopes to 2.5 seconds', () => {
      const sendMock = vi.fn();
      const subscribers: Record<string, (payload: any) => void> = {};

      vi.spyOn(WebSocketContextModule, 'useWebSocket').mockReturnValue({
        status: 'connected',
        isConnected: true,
        send: sendMock,
        subscribe: vi.fn((type: string, cb: (payload: any) => void) => {
          subscribers[type] = cb;
          return () => {};
        }),
      });

      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { id: 'me', username: 'me_user', displayName: 'Me', email: 'me@test.com', about: '', isOnline: true },
        isLoading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        updateProfile: vi.fn(),
        updateAvatar: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTyping({ chatId: 'chat-100', recipientId: 'user-2' })
      );

      // 1st keystroke: sends typing:start
      act(() => {
        result.current.emitTyping();
      });

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock).toHaveBeenLastCalledWith({
        type: 'typing:start',
        payload: { chatId: 'chat-100', recipientId: 'user-2' },
      });

      // Rapid 2nd keystroke (after 500ms): should be throttled (NOT sent)
      act(() => {
        vi.advanceTimersByTime(500);
        result.current.emitTyping();
      });

      expect(sendMock).toHaveBeenCalledTimes(1);

      // 3rd keystroke after 2500ms total: should send typing:start again
      act(() => {
        vi.advanceTimersByTime(2100); // 500 + 2100 = 2600ms > 2500ms
        result.current.emitTyping();
      });

      expect(sendMock).toHaveBeenCalledTimes(2);

      // Inactivity for 3 seconds: should auto-send typing:stop
      act(() => {
        vi.advanceTimersByTime(TYPING_INACTIVITY_TIMEOUT_MS);
      });

      expect(sendMock).toHaveBeenCalledTimes(3);
      expect(sendMock).toHaveBeenLastCalledWith({
        type: 'typing:stop',
        payload: { chatId: 'chat-100', recipientId: 'user-2' },
      });
    });

    it('listens for incoming typing:start and typing:stop events', () => {
      const subscribers: Record<string, (payload: any) => void> = {};

      vi.spyOn(WebSocketContextModule, 'useWebSocket').mockReturnValue({
        status: 'connected',
        isConnected: true,
        send: vi.fn(),
        subscribe: vi.fn((type: string, cb: (payload: any) => void) => {
          subscribers[type] = cb;
          return () => {};
        }),
      });

      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: { id: 'me', username: 'me_user', displayName: 'Me', email: 'me@test.com', about: '', isOnline: true },
        isLoading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        updateProfile: vi.fn(),
        updateAvatar: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTyping({ chatId: 'chat-42', recipientId: 'user-2' })
      );

      expect(result.current.isTyping).toBe(false);

      // Incoming typing:start from another user in this chat
      act(() => {
        subscribers['typing:start']?.({
          chatId: 'chat-42',
          userId: 'user-2',
          username: 'sarah',
          isTyping: true,
        });
      });

      expect(result.current.isTyping).toBe(true);
      expect(result.current.typingUsername).toBe('sarah');

      // Incoming typing:stop
      act(() => {
        subscribers['typing:stop']?.({
          chatId: 'chat-42',
          userId: 'user-2',
          username: 'sarah',
          isTyping: false,
        });
      });

      expect(result.current.isTyping).toBe(false);
      expect(result.current.typingUsername).toBeNull();
    });
  });

  describe('4. UI Components', () => {
    it('TypingDots renders animated dots', () => {
      const { container } = render(<TypingDots />);
      expect(container.querySelectorAll('.animate-bounce').length).toBe(3);
    });

    it('ChatHeader renders online status and typing indicator', () => {
      const { rerender } = render(
        <ChatHeader
          name="Sarah Connor"
          isOnline={true}
          isTyping={false}
          onBack={() => {}}
          onStartCall={() => {}}
          menuItems={[]}
        />
      );

      expect(screen.getByText('online')).toBeDefined();
      expect(screen.getByText('Sarah Connor')).toBeDefined();

      // Rerender when contact is typing
      rerender(
        <ChatHeader
          name="Sarah Connor"
          isOnline={true}
          isTyping={true}
          onBack={() => {}}
          onStartCall={() => {}}
          menuItems={[]}
        />
      );

      expect(screen.getByText('typing')).toBeDefined();
      expect(screen.queryByText('online')).toBeNull();
    });

    it('ConversationSnippet renders green typing preview when active', () => {
      const { rerender } = render(
        <ConversationSnippet
          lastMessage="See you at the server deployment"
          isTyping={false}
        />
      );

      expect(screen.getByText('See you at the server deployment')).toBeDefined();

      rerender(
        <ConversationSnippet
          lastMessage="See you at the server deployment"
          isTyping={true}
        />
      );

      expect(screen.getByText('typing...')).toBeDefined();
      expect(screen.queryByText('See you at the server deployment')).toBeNull();
    });
  });
});
