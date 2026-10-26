'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { useAuth } from '@/context/AuthContext';
import { useSound } from '@/hooks/useSound';
import { getOrDeriveSharedKey } from '@/lib/crypto/keyExchange';
import { encryptMessage, decryptMessage } from '@/lib/crypto/e2eeCipher';
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
  isE2EE?: boolean;
  e2eeIv?: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | string;
  createdAt: string;
}

export interface SendMessageOptions {
  content?: string;
  plaintextContent?: string;
  messageType?: 'text' | 'image' | 'voice' | 'system' | string;
  mediaUrl?: string | null;
  mediaSize?: number | null;
  mediaDuration?: number | null;
  replyToId?: string | null;
  isE2EE?: boolean;
  e2eeIv?: string | null;
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

  // Join chat room over WebSocket so live broadcasts are received
  useEffect(() => {
    if (!chatId) return;
    send({ type: 'chat:join', payload: { chatId } });

    return () => {
      send({ type: 'chat:leave', payload: { chatId } });
    };
  }, [chatId, send]);

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
          const items: MessageItem[] = await Promise.all(
            (data.messages || []).map(async (m: any) => {
              let textContent = m.content || '';
              const isE2EE = Boolean(m.isE2EE);
              const e2eeIv = m.e2eeIv || null;

              if (isE2EE && e2eeIv && !m.isDeleted && textContent && user?.id) {
                try {
                  const targetPeerId = m.senderId === user.id ? recipientId : m.senderId;
                  if (targetPeerId) {
                    const sharedKey = await getOrDeriveSharedKey(user.id, targetPeerId);
                    if (sharedKey) {
                      textContent = await decryptMessage(textContent, e2eeIv, sharedKey);
                    }
                  }
                } catch (decErr) {
                  console.debug('[useMessages] Could not decrypt message:', decErr);
                }
              }

              return {
                id: m.id,
                senderId: m.senderId,
                senderName: m.sender?.displayName || m.sender?.username || undefined,
                content: textContent,
                messageType: m.messageType || 'text',
                mediaUrl: m.mediaUrl || null,
                mediaSize: m.mediaSize || null,
                mediaDuration: m.mediaDuration || null,
                replyToId: m.replyToMessageId || m.replyToId || null,
                isDeleted: Boolean(m.isDeleted),
                isE2EE,
                e2eeIv,
                status: m.status || 'sent',
                createdAt: m.createdAt,
              };
            })
          );

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
        const olderItems: MessageItem[] = await Promise.all(
          (data.messages || []).map(async (m: any) => {
            let textContent = m.content || '';
            const isE2EE = Boolean(m.isE2EE);
            const e2eeIv = m.e2eeIv || null;

            if (isE2EE && e2eeIv && !m.isDeleted && textContent && user?.id) {
              try {
                const targetPeerId = m.senderId === user.id ? recipientId : m.senderId;
                if (targetPeerId) {
                  const sharedKey = await getOrDeriveSharedKey(user.id, targetPeerId);
                  if (sharedKey) {
                    textContent = await decryptMessage(textContent, e2eeIv, sharedKey);
                  }
                }
              } catch (decErr) {
                console.debug('[useMessages] Could not decrypt older message:', decErr);
              }
            }

            return {
              id: m.id,
              senderId: m.senderId,
              senderName: m.sender?.displayName || m.sender?.username || undefined,
              content: textContent,
              messageType: m.messageType || 'text',
              mediaUrl: m.mediaUrl || null,
              mediaSize: m.mediaSize || null,
              mediaDuration: m.mediaDuration || null,
              replyToId: m.replyToMessageId || m.replyToId || null,
              isDeleted: Boolean(m.isDeleted),
              isE2EE,
              e2eeIv,
              status: m.status || 'sent',
              createdAt: m.createdAt,
            };
          })
        );

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
      const plaintextContent = isOptions && input.plaintextContent ? input.plaintextContent : content;
      const mediaUrl = isOptions ? (input.mediaUrl || null) : null;
      const mediaSize = isOptions ? (input.mediaSize || null) : null;
      const mediaDuration = isOptions ? (input.mediaDuration || null) : null;
      const replyToId = isOptions ? (input.replyToId || null) : null;
      const isE2EE = isOptions ? Boolean(input.isE2EE) : false;
      const e2eeIv = isOptions ? input.e2eeIv || null : null;
      const messageType = isOptions
        ? input.messageType || (mediaUrl ? 'image' : 'text')
        : 'text';

      if (!content.trim() && !mediaUrl) return;

      const tempId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const nowIso = new Date().toISOString();

      // Synchronous optimistic message item with pending clock (displays readable plaintext immediately)
      const optimisticMessage: MessageItem = {
        id: tempId,
        tempId,
        senderId: user.id,
        senderName: user.displayName || `@${user.username}`,
        content: plaintextContent.trim(),
        messageType,
        mediaUrl,
        mediaSize,
        mediaDuration,
        replyToId,
        isDeleted: false,
        isE2EE,
        e2eeIv,
        status: 'pending',
        createdAt: nowIso,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Play sent sound immediately
      playSent();

      // Dispatch synchronously over WebSocket
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
          isE2EE,
          e2eeIv: e2eeIv || undefined,
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
              isE2EE: payload.isE2EE ?? msg.isE2EE,
              e2eeIv: payload.e2eeIv ?? msg.e2eeIv,
              createdAt: payload.createdAt || msg.createdAt,
            };
          }
          return msg;
        })
      );
    });

    // 2. message:new — incoming message
    const unsubNew = subscribe<MessageNewPayload>('message:new', async (payload) => {
      if (!payload || payload.chatId !== currentChatIdRef.current) return;

      let displayContent = payload.content || '';
      const isE2EE = Boolean(payload.isE2EE);
      const e2eeIv = payload.e2eeIv || null;

      // Decrypt incoming E2EE message
      if (isE2EE && e2eeIv && user?.id && payload.senderId !== user.id) {
        try {
          const peerId = payload.senderId;
          const sharedKey = await getOrDeriveSharedKey(user.id, peerId);
          if (sharedKey) {
            displayContent = await decryptMessage(displayContent, e2eeIv, sharedKey);
          }
        } catch (decErr) {
          console.debug('[useMessages] Error decrypting incoming live message:', decErr);
        }
      }

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
                  isE2EE,
                  e2eeIv,
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
          content: displayContent,
          messageType: (payload as any).messageType || payload.type || 'text',
          mediaUrl: (payload as any).mediaUrl || (payload as any).fileUrl || null,
          mediaSize: (payload as any).mediaSize || (payload as any).fileSize || null,
          mediaDuration: (payload as any).mediaDuration || (payload as any).duration || null,
          replyToId: (payload as any).replyToId || (payload as any).replyToMessageId || null,
          isDeleted: Boolean((payload as any).isDeleted),
          isE2EE,
          e2eeIv,
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
