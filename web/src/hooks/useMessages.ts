'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { useAuth } from '@/context/AuthContext';
import { useSound } from '@/hooks/useSound';
import {
  MessageAckPayload,
  MessageNewPayload,
  MessageStatusUpdatePayload,
} from '@shared/events';

export interface MessageItem {
  id: string;
  tempId?: string;
  senderId: string;
  senderName?: string;
  content: string;
  messageType?: string;
  mediaUrl?: string | null;
  mediaSize?: number | null;
  mediaDuration?: number | null;
  waveform?: number[] | null;
  replyToId?: string | null;
  isDeleted?: boolean;
  status: 'pending' | 'sent' | 'delivered' | 'read' | string;
  createdAt: string;
}

export interface SendMessageOptions {
  content?: string;
  messageType?: 'text' | 'image' | 'voice' | 'system' | string;
  mediaUrl?: string | null;
  mediaSize?: number | null;
  mediaDuration?: number | null;
  replyToId?: string | null;
}

export interface UseMessagesOptions {
  chatId?: string | null;
  recipientId?: string | null;
}

export function useMessages({ chatId, recipientId }: UseMessagesOptions) {
  const { user } = useAuth();
  const { send, subscribe } = useWebSocket();
  const { playSent, playReceive } = useSound();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const currentChatIdRef = useRef<string | null>(null);
  currentChatIdRef.current = chatId || null;

  // Mark chat messages as read
  const markAsRead = useCallback(async (activeChatId: string) => {
    try {
      const baseUrl = typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
        ? window.location.origin
        : '';
      fetch(`${baseUrl}/api/chats/${activeChatId}/read`, { method: 'POST' }).catch(() => {});
      send({
        type: 'message:read',
        payload: {
          chatId: activeChatId,
          userId: recipientId || undefined,
        },
      });
    } catch {
      // Swallowed safely
    }
  }, [recipientId, send]);

  // Initial message fetch for active chat
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);
      setIsLoading(false);
      return;
    }

    let isSubscribed = true;
    setIsLoading(true);

    const fetchMessages = async () => {
      try {
        const baseUrl = typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
          ? window.location.origin
          : '';
        const res = await fetch(`${baseUrl}/api/chats/${chatId}/messages?limit=40`, {
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (res.ok && isSubscribed) {
          const data = await res.json();
          const items: MessageItem[] = (data.messages || []).map((m: any) => ({
            id: m.id,
            senderId: m.senderId,
            senderName: m.sender?.displayName || m.sender?.username || undefined,
            content: m.content || '',
            messageType: m.messageType || 'text',
            mediaUrl: m.mediaUrl || null,
            mediaSize: m.mediaSize || null,
            mediaDuration: m.mediaDuration || null,
            replyToId: m.replyToMessageId || m.replyToId || null,
            isDeleted: Boolean(m.isDeleted),
            status: m.status || 'sent',
            createdAt: m.createdAt,
          }));

          // Reverse from DESC to chronological ASC
          setMessages(items.reverse());
          setNextCursor(data.nextCursor || null);
          setHasMore(Boolean(data.nextCursor));

          // Automatically mark incoming messages as read
          markAsRead(chatId);
        }
      } catch (err) {
        console.error('[useMessages] Error loading messages:', err);
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    fetchMessages();

    return () => {
      isSubscribed = false;
    };
  }, [chatId, markAsRead]);

  // Load older messages (pagination)
  const fetchOlderMessages = useCallback(async () => {
    if (!chatId || !hasMore || isLoadingOlder || !nextCursor) return;

    setIsOlderLoading(true);
    try {
      const baseUrl = typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
        ? window.location.origin
        : '';
      const res = await fetch(
        `${baseUrl}/api/chats/${chatId}/messages?limit=40&cursor=${encodeURIComponent(nextCursor)}`,
        { headers: { 'Cache-Control': 'no-cache' } }
      );

      if (res.ok) {
        const data = await res.json();
        const olderItems: MessageItem[] = (data.messages || []).map((m: any) => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.sender?.displayName || m.sender?.username || undefined,
          content: m.content || '',
          messageType: m.messageType || 'text',
          mediaUrl: m.mediaUrl || null,
          mediaSize: m.mediaSize || null,
          mediaDuration: m.mediaDuration || null,
          replyToId: m.replyToMessageId || m.replyToId || null,
          isDeleted: Boolean(m.isDeleted),
          status: m.status || 'sent',
          createdAt: m.createdAt,
        }));

        // Prepend older items
        setMessages((prev) => [...olderItems.reverse(), ...prev]);
        setNextCursor(data.nextCursor || null);
        setHasMore(Boolean(data.nextCursor));
      }
    } catch (err) {
      console.error('[useMessages] Error loading older messages:', err);
    } finally {
      setIsOlderLoading(false);
    }
  }, [chatId, hasMore, isLoadingOlder, nextCursor]);

  const setIsOlderLoading = setIsLoadingOlder;

  // Send an optimistic text or media message
  const sendMessage = useCallback(
    (input: string | SendMessageOptions) => {
      if (!chatId || !user) return;

      const isOptions = typeof input === 'object' && input !== null;
      const content = isOptions ? (input.content || '') : input;
      const mediaUrl = isOptions ? (input.mediaUrl || null) : null;
      const mediaSize = isOptions ? (input.mediaSize || null) : null;
      const mediaDuration = isOptions ? (input.mediaDuration || null) : null;
      const replyToId = isOptions ? (input.replyToId || null) : null;
      const messageType = isOptions
        ? input.messageType || (mediaUrl ? 'image' : 'text')
        : 'text';

      if (!content.trim() && !mediaUrl) return;

      const tempId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const nowIso = new Date().toISOString();

      // Optimistic message item with pending clock
      const optimisticMessage: MessageItem = {
        id: tempId,
        tempId,
        senderId: user.id,
        senderName: user.displayName || `@${user.username}`,
        content: content.trim(),
        messageType,
        mediaUrl,
        mediaSize,
        mediaDuration,
        replyToId,
        isDeleted: false,
        status: 'pending',
        createdAt: nowIso,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Play sent sound immediately
      playSent();

      // Dispatch over WebSocket
      send({
        type: 'message:send',
        payload: {
          tempId,
          chatId,
          recipientId: recipientId || undefined,
          content: content.trim(),
          messageType,
          mediaUrl: mediaUrl || undefined,
          fileUrl: mediaUrl || undefined,
          mediaSize: mediaSize || undefined,
          fileSize: mediaSize || undefined,
          mediaDuration: mediaDuration || undefined,
          duration: mediaDuration || undefined,
          replyToId: replyToId || undefined,
          replyToMessageId: replyToId || undefined,
        },
      });
    },
    [chatId, recipientId, user, playSent, send]
  );

  // WebSocket listeners: message:ack, message:new, message:status
  useEffect(() => {
    if (!chatId) return;

    // 1. message:ack — server confirmed message saved
    const unsubAck = subscribe<MessageAckPayload>('message:ack', (payload) => {
      if (!payload || payload.chatId !== currentChatIdRef.current) return;

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.tempId === payload.tempId || msg.id === payload.tempId) {
            return {
              ...msg,
              id: payload.messageId,
              status: payload.status || 'sent',
              createdAt: payload.createdAt || msg.createdAt,
            };
          }
          return msg;
        })
      );
    });

    // 2. message:new — incoming message
    const unsubNew = subscribe<MessageNewPayload>('message:new', (payload) => {
      if (!payload || payload.chatId !== currentChatIdRef.current) return;

      setMessages((prev) => {
        // Prevent duplicate appending
        const exists = prev.some(
          (m) =>
            m.id === payload.id ||
            (payload.tempId && m.tempId === payload.tempId)
        );
        if (exists) {
          return prev.map((m) =>
            m.tempId === payload.tempId
              ? {
                  ...m,
                  id: payload.id,
                  status: payload.status || m.status,
                  mediaUrl: (payload as any).mediaUrl || (payload as any).fileUrl || m.mediaUrl,
                  messageType: (payload as any).messageType || payload.type || m.messageType,
                }
              : m
          );
        }

        const newMsgItem: MessageItem = {
          id: payload.id,
          tempId: payload.tempId,
          senderId: payload.senderId,
          senderName:
            (payload as any).sender?.displayName ||
            (payload as any).sender?.username ||
            (payload as any).senderName,
          content: payload.content || '',
          messageType: (payload as any).messageType || payload.type || 'text',
          mediaUrl: (payload as any).mediaUrl || (payload as any).fileUrl || null,
          mediaSize: (payload as any).mediaSize || (payload as any).fileSize || null,
          mediaDuration: (payload as any).mediaDuration || (payload as any).duration || null,
          replyToId: (payload as any).replyToId || (payload as any).replyToMessageId || null,
          isDeleted: Boolean((payload as any).isDeleted),
          status: payload.status || 'sent',
          createdAt:
            payload.createdAt instanceof Date
              ? payload.createdAt.toISOString()
              : String(payload.createdAt || new Date().toISOString()),
        };

        // If from another user, play receive chime and mark as read
        if (user && payload.senderId !== user.id) {
          playReceive();
          markAsRead(payload.chatId);
        }

        return [...prev, newMsgItem];
      });
    });

    // 3. message:status — delivery and read receipts
    const unsubStatus = subscribe<MessageStatusUpdatePayload>('message:status', (payload) => {
      if (!payload || payload.chatId !== currentChatIdRef.current) return;

      setMessages((prev) =>
        prev.map((msg) => {
          // If specific messageId
          if (payload.messageId && msg.id === payload.messageId) {
            return { ...msg, status: payload.status };
          }

          // If chat-wide read status: update all outgoing messages
          if (payload.status === 'read' && user && msg.senderId === user.id) {
            return { ...msg, status: 'read' };
          }

          // If chat-wide delivered status: update sent messages
          if (payload.status === 'delivered' && user && msg.senderId === user.id && msg.status === 'sent') {
            return { ...msg, status: 'delivered' };
          }

          return msg;
        })
      );
    });

    // 4. message:delete — message deletion
    const unsubDelete = subscribe<any>('message:delete', (payload) => {
      if (!payload || payload.chatId !== currentChatIdRef.current) return;

      setMessages((prev) => {
        if (payload.deleteType === 'forMe') {
          return prev.filter((m) => m.id !== payload.messageId);
        }
        return prev.map((m) =>
          m.id === payload.messageId
            ? {
                ...m,
                isDeleted: true,
                content: '🚫 This message was deleted',
                mediaUrl: null,
              }
            : m
        );
      });
    });

    return () => {
      unsubAck();
      unsubNew();
      unsubStatus();
      unsubDelete();
    };
  }, [chatId, user, subscribe, playReceive, markAsRead]);

  // Delete message handler
  const deleteMessage = useCallback(
    (messageId: string, deleteType: 'everyone' | 'forMe') => {
      if (!chatId || !messageId) return;

      // Optimistic update
      setMessages((prev) => {
        if (deleteType === 'forMe') {
          return prev.filter((m) => m.id !== messageId);
        }
        return prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                isDeleted: true,
                content: '🚫 This message was deleted',
                mediaUrl: null,
              }
            : m
        );
      });

      send({
        type: 'message:delete',
        payload: {
          chatId,
          messageId,
          deleteType,
        },
      });
    },
    [chatId, send]
  );

  return {
    messages,
    isLoading,
    isLoadingOlder,
    hasMore,
    sendMessage,
    deleteMessage,
    fetchOlderMessages,
    markAsRead: () => chatId && markAsRead(chatId),
  };
}
