import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import MessageStatusTick from '../components/chat/MessageStatusTick';
import DateDivider, { formatDateDivider } from '../components/chat/DateDivider';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';
import ConversationItem, { formatChatTimestamp } from '../components/sidebar/ConversationItem';
import { useMessages } from '../hooks/useMessages';
import * as WebSocketContextModule from '../context/WebSocketContext';
import * as AuthContextModule from '../context/AuthContext';
import * as AudioModule from '../lib/audio';

describe('Phase 06: 1-on-1 Direct Real-Time Messaging Engine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('1. MessageStatusTick Primitive', () => {
    it('renders clock icon for pending status', () => {
      render(<MessageStatusTick status="pending" />);
      expect(screen.getByLabelText('Pending (sending)')).toBeDefined();
    });

    it('renders single tick for sent status', () => {
      render(<MessageStatusTick status="sent" />);
      expect(screen.getByLabelText('Sent (single tick)')).toBeDefined();
    });

    it('renders double grey tick for delivered status', () => {
      render(<MessageStatusTick status="delivered" />);
      expect(screen.getByLabelText('Delivered (double grey tick)')).toBeDefined();
    });

    it('renders double blue tick for read status', () => {
      const { container } = render(<MessageStatusTick status="read" />);
      const tick = screen.getByLabelText('Read (double blue tick)');
      expect(tick).toBeDefined();
      expect(container.querySelector('.text-wa-blue-tick')).not.toBeNull();
    });
  });

  describe('2. DateDivider and Timestamp Formatting', () => {
    it('formats today as "Today"', () => {
      const now = new Date();
      expect(formatDateDivider(now)).toBe('Today');
    });

    it('formats yesterday as "Yesterday"', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(formatDateDivider(yesterday)).toBe('Yesterday');
    });

    it('formats older date as full date string', () => {
      const oldDate = new Date(2026, 0, 15);
      expect(formatDateDivider(oldDate)).toBe('January 15, 2026');
    });

    it('formatChatTimestamp returns hour:minute for today', () => {
      const now = new Date(2026, 9, 26, 15, 45);
      vi.setSystemTime(now);
      expect(formatChatTimestamp(now.toISOString())).toBe('3:45 PM');
    });
  });

  describe('3. MessageBubble Component', () => {
    it('renders outgoing message on the right with status tick', () => {
      const { container } = render(
        <MessageBubble
          id="msg-1"
          content="Hello from User A!"
          isMe={true}
          status="sent"
          createdAt={new Date().toISOString()}
        />
      );

      expect(screen.getByText('Hello from User A!')).toBeDefined();
      expect(container.querySelector('.justify-end')).not.toBeNull();
      expect(screen.getByLabelText('Sent (single tick)')).toBeDefined();
    });

    it('renders incoming message on the left without status tick', () => {
      const { container } = render(
        <MessageBubble
          id="msg-2"
          content="Reply from User B!"
          isMe={false}
          status="sent"
          createdAt={new Date().toISOString()}
        />
      );

      expect(screen.getByText('Reply from User B!')).toBeDefined();
      expect(container.querySelector('.justify-start')).not.toBeNull();
      expect(screen.queryByLabelText('Sent (single tick)')).toBeNull();
    });
  });

  describe('4. ChatInput Component', () => {
    it('triggers onTyping on change and onSendMessage on Enter or Send click', () => {
      const onSendMock = vi.fn();
      const onTypingMock = vi.fn();

      render(
        <ChatInput onSendMessage={onSendMock} onTyping={onTypingMock} />
      );

      const textarea = screen.getByPlaceholderText('Type a message');
      fireEvent.change(textarea, { target: { value: 'Testing direct message' } });

      expect(onTypingMock).toHaveBeenCalled();

      // Enter key sends
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      expect(onSendMock).toHaveBeenCalledWith('Testing direct message');
      expect((textarea as HTMLTextAreaElement).value).toBe('');
    });
  });

  describe('5. ConversationItem Component', () => {
    it('renders chat item with name, last message, and unread badge', () => {
      const onSelectMock = vi.fn();
      render(
        <ConversationItem
          chat={{
            id: 'c1',
            name: 'Sarah Connor',
            lastMessage: 'Let us coordinate tonight.',
            lastMessageAt: new Date().toISOString(),
            unreadCount: 3,
            isOnline: true,
          }}
          isSelected={false}
          onSelect={onSelectMock}
        />
      );

      expect(screen.getByText('Sarah Connor')).toBeDefined();
      expect(screen.getByText('Let us coordinate tonight.')).toBeDefined();
      expect(screen.getByText('3')).toBeDefined();

      fireEvent.click(screen.getByRole('button'));
      expect(onSelectMock).toHaveBeenCalledWith('c1');
    });
  });

  describe('6. useMessages Hook Optimistic UI & Tick Receipts', () => {
    it('sends message optimistically, reconciles ack, and handles status updates', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [], nextCursor: null }),
      }));

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
        user: { id: 'user-a', username: 'user_a', displayName: 'User A', email: 'a@test.com', about: '', isOnline: true },
        isLoading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        updateProfile: vi.fn(),
        updateAvatar: vi.fn(),
      });

      const playSentMock = vi.spyOn(AudioModule, 'playSentSound').mockImplementation(() => null);
      const playReceiveMock = vi.spyOn(AudioModule, 'playReceiveSound').mockImplementation(() => null);

      const { result } = renderHook(() =>
        useMessages({ chatId: 'chat-99', recipientId: 'user-b' })
      );

      // 1. User sends message
      act(() => {
        result.current.sendMessage('Hello User B!');
      });

      expect(result.current.messages.length).toBe(1);
      const optimisticMsg = result.current.messages[0];
      expect(optimisticMsg.content).toBe('Hello User B!');
      expect(optimisticMsg.status).toBe('pending');
      expect(playSentMock).toHaveBeenCalled();
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'message:send',
          payload: expect.objectContaining({
            chatId: 'chat-99',
            content: 'Hello User B!',
          }),
        })
      );

      const tempId = optimisticMsg.tempId!;

      // 2. Server acks message:ack (persisted to DB, single tick 'sent')
      act(() => {
        subscribers['message:ack']?.({
          tempId,
          messageId: 'real-db-id-123',
          chatId: 'chat-99',
          status: 'sent',
          createdAt: new Date().toISOString(),
        });
      });

      expect(result.current.messages[0].id).toBe('real-db-id-123');
      expect(result.current.messages[0].status).toBe('sent');

      // 3. Recipient receives message:status (delivered -> double grey tick)
      act(() => {
        subscribers['message:status']?.({
          chatId: 'chat-99',
          messageId: 'real-db-id-123',
          status: 'delivered',
          userId: 'user-b',
        });
      });

      expect(result.current.messages[0].status).toBe('delivered');

      // 4. Recipient focuses chat -> message:status (read -> double blue tick)
      act(() => {
        subscribers['message:status']?.({
          chatId: 'chat-99',
          messageId: 'real-db-id-123',
          status: 'read',
          userId: 'user-b',
        });
      });

      expect(result.current.messages[0].status).toBe('read');

      // 5. Incoming message:new from User B
      act(() => {
        subscribers['message:new']?.({
          id: 'msg-from-b',
          chatId: 'chat-99',
          senderId: 'user-b',
          content: 'Got your message loud and clear!',
          status: 'sent',
          createdAt: new Date().toISOString(),
        });
      });

      expect(result.current.messages.length).toBe(2);
      expect(result.current.messages[1].content).toBe('Got your message loud and clear!');
      expect(playReceiveMock).toHaveBeenCalled();
    });
  });
});
