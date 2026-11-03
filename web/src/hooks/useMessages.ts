'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { useAuth } from '@/context/AuthContext';
import { useSound } from '@/hooks/useSound';
import { getOrDeriveSharedKey } from '@/lib/crypto/keyExchange';
import { encryptMessage, decryptMessage } from '@/lib/crypto/e2eeCipher';
import {
  cacheMessages,
  cacheSingleMessage,
  getCachedMessages,
  updateCachedMessageStatus,
} from '@/lib/db/messageStore';
import { enqueueOutbox, dequeueOutbox } from '@/lib/db/outboxStore';
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
  latitude?: number | null;
  longitude?: number | null;
  heading?: number | null;
  locationAddress?: string | null;
  liveLocationId?: string | null;
  senderAvatarUrl?: string | null;
  documentName?: string | null;
  documentSize?: number | null;
  documentMime?: string | null;
  isCodeBlock?: boolean;
  codeLanguage?: string | null;
  expiresAt?: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | string;
  createdAt: string;
}

export interface SendMessageOptions {
  content?: string;
  plaintextContent?: string;
  messageType?: 'text' | 'image' | 'voice' | 'system' | 'location' | 'document' | string;
  mediaUrl?: string | null;
  mediaSize?: number | null;
  mediaDuration?: number | null;
  documentName?: string | null;
  documentSize?: number | null;
  documentMime?: string | null;
  isCodeBlock?: boolean;
  codeLanguage?: string | null;
  replyToId?: string | null;
  isE2EE?: boolean;
  e2eeIv?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAddress?: string | null;
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
  const [dlpBlockedError, setDlpBlockedError] = useState<string | null>(null);
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

    // Instant 0ms cache rendering from IndexedDB
    getCachedMessages(chatId)
      .then((cached) => {
        if (isSubscribed && cached && cached.length > 0) {
          setMessages((prev) => (prev.length === 0 ? (cached as MessageItem[]) : prev));
        }
      })
      .catch(() => {});

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

              if (isE2EE && !m.isDeleted && textContent && user?.id) {
                if (e2eeIv) {
                  try {
                    const targetPeerId = m.senderId === user.id ? recipientId : m.senderId;
                    let decrypted = false;
                    if (targetPeerId) {
                      const sharedKey = await getOrDeriveSharedKey(user.id, targetPeerId);
                      if (sharedKey) {
                        textContent = await decryptMessage(textContent, e2eeIv, sharedKey);
                        decrypted = true;
                      }
                    }
                    if (!decrypted) {
                      textContent = '[Encrypted message - key unavailable on this device]';
                    }
                  } catch (decErr) {
                    console.debug('[useMessages] Could not decrypt message:', decErr);
                    textContent = '[Encrypted message - key unavailable on this device]';
                  }
                } else {
                  textContent = '[Encrypted message - key unavailable on this device]';
                }
              }

              return {
                id: m.id,
                senderId: m.senderId,
                senderName: m.sender?.displayName || m.sender?.username || undefined,
                senderAvatarUrl: m.senderAvatarUrl || m.sender?.avatarUrl || null,
                content: textContent,
                messageType: m.messageType || 'text',
                mediaUrl: m.mediaUrl || null,
                mediaSize: m.mediaSize || null,
                mediaDuration: m.mediaDuration || null,
                replyToId: m.replyToMessageId || m.replyToId || null,
                isDeleted: Boolean(m.isDeleted),
                isE2EE,
                e2eeIv,
                latitude: m.latitude ?? null,
                longitude: m.longitude ?? null,
                heading: m.heading ?? null,
                locationAddress: m.locationAddress ?? null,
                liveLocationId: m.liveLocationId ?? null,
                expiresAt: m.expiresAt ?? null,
                status: m.status || 'sent',
                createdAt: m.createdAt,
              };
            })
          );

          // Reverse from DESC to chronological ASC
          const chronologicalItems = items.reverse();
          setMessages(chronologicalItems);
          cacheMessages(chronologicalItems as any).catch(() => {});
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

            if (isE2EE && !m.isDeleted && textContent && user?.id) {
              if (e2eeIv) {
                try {
                  const targetPeerId = m.senderId === user.id ? recipientId : m.senderId;
                  let decrypted = false;
                  if (targetPeerId) {
                    const sharedKey = await getOrDeriveSharedKey(user.id, targetPeerId);
                    if (sharedKey) {
                      textContent = await decryptMessage(textContent, e2eeIv, sharedKey);
                      decrypted = true;
                    }
                  }
                  if (!decrypted) {
                    textContent = '[Encrypted message - key unavailable on this device]';
                  }
                } catch (decErr) {
                  console.debug('[useMessages] Could not decrypt older message:', decErr);
                  textContent = '[Encrypted message - key unavailable on this device]';
                }
              } else {
                textContent = '[Encrypted message - key unavailable on this device]';
              }
            }

            return {
              id: m.id,
              senderId: m.senderId,
              senderName: m.sender?.displayName || m.sender?.username || undefined,
              senderAvatarUrl: m.senderAvatarUrl || m.sender?.avatarUrl || null,
              content: textContent,
              messageType: m.messageType || 'text',
              mediaUrl: m.mediaUrl || null,
              mediaSize: m.mediaSize || null,
              mediaDuration: m.mediaDuration || null,
              replyToId: m.replyToMessageId || m.replyToId || null,
              isDeleted: Boolean(m.isDeleted),
              isE2EE,
              e2eeIv,
              latitude: m.latitude ?? null,
              longitude: m.longitude ?? null,
              heading: m.heading ?? null,
              locationAddress: m.locationAddress ?? null,
              liveLocationId: m.liveLocationId ?? null,
              expiresAt: m.expiresAt ?? null,
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
      const latitude = isOptions && input.latitude !== undefined && input.latitude !== null ? Number(input.latitude) : null;
      const longitude = isOptions && input.longitude !== undefined && input.longitude !== null ? Number(input.longitude) : null;
      const locationAddress = isOptions && input.locationAddress ? input.locationAddress : null;
      const documentName = isOptions ? (input.documentName || null) : null;
      const documentSize = isOptions ? (input.documentSize || null) : null;
      const documentMime = isOptions ? (input.documentMime || null) : null;
      const isCodeBlock = isOptions ? Boolean(input.isCodeBlock) : false;
      const codeLanguage = isOptions ? (input.codeLanguage || null) : null;
      const hasCoordinates = latitude !== null && longitude !== null;
      const messageType = isOptions
        ? (input.messageType || (hasCoordinates ? 'location' : documentName ? 'document' : mediaUrl ? 'image' : 'text'))
        : 'text';
      const isLocation = messageType === 'location' || hasCoordinates;

      if (!content.trim() && !mediaUrl && !isLocation && !documentName) return;

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
        documentName,
        documentSize,
        documentMime,
        isCodeBlock,
        codeLanguage,
        replyToId,
        isDeleted: false,
        isE2EE,
        e2eeIv,
        latitude,
        longitude,
        locationAddress,
        status: 'pending',
        createdAt: nowIso,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      // Cache locally in IndexedDB and enqueue in outbox for offline sync
      cacheSingleMessage(optimisticMessage as any).catch(() => {});
      enqueueOutbox({
        tempId,
        chatId,
        senderId: user.id,
        content: content.trim(),
        messageType,
        mediaUrl: mediaUrl || undefined,
        mediaSize: mediaSize || undefined,
        mediaDuration: mediaDuration || undefined,
        replyToMessageId: replyToId || undefined,
        isE2EE,
        e2eeIv: e2eeIv || undefined,
        queuedAt: Date.now(),
      }).catch(() => {});

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
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          locationAddress: locationAddress || undefined,
          documentName: documentName || undefined,
          documentSize: documentSize || undefined,
          documentMime: documentMime || undefined,
          isCodeBlock: isCodeBlock || undefined,
          codeLanguage: codeLanguage || undefined,
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

      // Dequeue from offline outbox and update local cache
      if (payload.tempId) {
        dequeueOutbox(payload.tempId).catch(() => {});
        updateCachedMessageStatus(payload.tempId, payload.status || 'sent', payload.messageId).catch(() => {});
      }

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.tempId === payload.tempId || msg.id === payload.tempId) {
            return {
              ...msg,
              id: payload.messageId,
              status: payload.status || 'sent',
              isE2EE: payload.isE2EE ?? msg.isE2EE,
              e2eeIv: payload.e2eeIv ?? msg.e2eeIv,
              latitude: (payload as any).latitude !== undefined ? (payload as any).latitude : msg.latitude,
              longitude: (payload as any).longitude !== undefined ? (payload as any).longitude : msg.longitude,
              locationAddress: (payload as any).locationAddress !== undefined ? (payload as any).locationAddress : msg.locationAddress,
              documentName: (payload as any).documentName !== undefined ? (payload as any).documentName : msg.documentName,
              documentSize: (payload as any).documentSize !== undefined ? (payload as any).documentSize : msg.documentSize,
              documentMime: (payload as any).documentMime !== undefined ? (payload as any).documentMime : msg.documentMime,
              isCodeBlock: (payload as any).isCodeBlock !== undefined ? (payload as any).isCodeBlock : msg.isCodeBlock,
              codeLanguage: (payload as any).codeLanguage !== undefined ? (payload as any).codeLanguage : msg.codeLanguage,
              expiresAt: (payload as any).expiresAt !== undefined ? (payload as any).expiresAt : msg.expiresAt,
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
      if (isE2EE && user?.id && payload.senderId !== user.id) {
        if (e2eeIv) {
          try {
            const peerId = payload.senderId;
            const sharedKey = await getOrDeriveSharedKey(user.id, peerId);
            if (sharedKey) {
              displayContent = await decryptMessage(displayContent, e2eeIv, sharedKey);
            } else {
              displayContent = '[Encrypted message - key unavailable on this device]';
            }
          } catch (decErr) {
            console.debug('[useMessages] Error decrypting incoming live message:', decErr);
            displayContent = '[Encrypted message - key unavailable on this device]';
          }
        } else {
          displayContent = '[Encrypted message - key unavailable on this device]';
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
          latitude: (payload as any).latitude ?? null,
          longitude: (payload as any).longitude ?? null,
          heading: (payload as any).heading ?? null,
          locationAddress: (payload as any).locationAddress ?? null,
          liveLocationId: (payload as any).liveLocationId ?? null,
          documentName: (payload as any).documentName ?? null,
          documentSize: (payload as any).documentSize ?? null,
          documentMime: (payload as any).documentMime ?? null,
          isCodeBlock: Boolean((payload as any).isCodeBlock),
          codeLanguage: (payload as any).codeLanguage ?? null,
          expiresAt: (payload as any).expiresAt ?? null,
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

        // Cache incoming message in local IndexedDB
        cacheSingleMessage(newMsgItem as any).catch(() => {});

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

    // 5. error — e.g. DLP_BLOCKED interception
    const unsubError = subscribe<any>('error', (payload) => {
      if (payload?.code === 'DLP_BLOCKED') {
        setDlpBlockedError(payload.message || 'Message blocked: Contains sensitive credential or financial data.');
        // Remove pending optimistic messages that triggered violation
        setMessages((prev) => prev.filter((m) => m.status !== 'pending'));
      }
    });

    // 6. location:live_started — live location session started
    const unsubLiveStarted = subscribe<any>('location:live_started', (payload) => {
      if (!payload?.message || payload.message.chatId !== currentChatIdRef.current) return;
      const m = payload.message;
      const liveLoc = payload.liveLocation;

      const newMsgItem: MessageItem = {
        id: m.id,
        senderId: m.senderId,
        senderName:
          m.sender?.displayName ||
          m.sender?.username ||
          (user && m.senderId === user.id ? 'You' : 'User'),
        senderAvatarUrl: m.sender?.avatarUrl || liveLoc?.userAvatarUrl || null,
        content: m.content || 'Live Location',
        messageType: 'live_location',
        mediaUrl: null,
        latitude: m.latitude ?? liveLoc?.latitude ?? null,
        longitude: m.longitude ?? liveLoc?.longitude ?? null,
        heading: liveLoc?.heading ?? null,
        locationAddress: m.locationAddress || 'Live Location Sharing',
        liveLocationId: m.liveLocationId || liveLoc?.id || null,
        expiresAt: liveLoc?.expiresAt || m.expiresAt || null,
        status: 'sent',
        createdAt:
          m.createdAt instanceof Date
            ? m.createdAt.toISOString()
            : String(m.createdAt || new Date().toISOString()),
      };

      if (user && m.senderId !== user.id) {
        playReceive();
        markAsRead(m.chatId);
      }

      setMessages((prev) => {
        if (
          prev.some(
            (item) =>
              item.id === newMsgItem.id ||
              (newMsgItem.liveLocationId && item.liveLocationId === newMsgItem.liveLocationId)
          )
        ) {
          return prev;
        }
        return [...prev, newMsgItem];
      });
    });

    return () => {
      unsubAck();
      unsubNew();
      unsubStatus();
      unsubDelete();
      unsubError();
      unsubLiveStarted();
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
    dlpBlockedError,
    dismissDlpError: () => setDlpBlockedError(null),
    sendMessage,
    deleteMessage,
    fetchOlderMessages,
    markAsRead: () => chatId && markAsRead(chatId),
  };
}
