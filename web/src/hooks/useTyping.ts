'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';
import { useAuth } from '@/context/AuthContext';
import { UserTypingStatusPayload, TypingStartPayload, TypingStopPayload } from '@shared/events';

export const TYPING_THROTTLE_MS = 2500;
export const TYPING_INACTIVITY_TIMEOUT_MS = 3000;
export const TYPING_FALLBACK_RESET_MS = 4000;

export interface UseTypingOptions {
  chatId?: string | null;
  recipientId?: string | null;
}

export function useTyping({ chatId, recipientId }: UseTypingOptions = {}) {
  const { send, subscribe } = useWebSocket();
  const { user } = useAuth();

  const [isTyping, setIsTyping] = useState(false);
  const [typingUsername, setTypingUsername] = useState<string | null>(null);

  const lastSentAtRef = useRef<number>(0);
  const isCurrentlyTypingRef = useRef<boolean>(false);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incomingFallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Send typing:stop to server
  const stopTyping = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }

    if (isCurrentlyTypingRef.current && chatId) {
      const payload: TypingStopPayload = {
        chatId,
        recipientId: recipientId || undefined,
      };
      send({
        type: 'typing:stop',
        payload,
      });
      isCurrentlyTypingRef.current = false;
      lastSentAtRef.current = 0;
    }
  }, [chatId, recipientId, send]);

  // Send typing:start with 2.5s throttling and 3s auto-stop
  const emitTyping = useCallback(() => {
    if (!chatId) return;

    const now = Date.now();
    const shouldSendStart =
      !isCurrentlyTypingRef.current || now - lastSentAtRef.current >= TYPING_THROTTLE_MS;

    if (shouldSendStart) {
      const payload: TypingStartPayload = {
        chatId,
        recipientId: recipientId || undefined,
      };
      send({
        type: 'typing:start',
        payload,
      });
      lastSentAtRef.current = now;
      isCurrentlyTypingRef.current = true;
    }

    // Reset inactivity timer
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    inactivityTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, TYPING_INACTIVITY_TIMEOUT_MS);
  }, [chatId, recipientId, send, stopTyping]);

  // Listen for incoming typing events for active chat
  useEffect(() => {
    if (!chatId) {
      setIsTyping(false);
      setTypingUsername(null);
      return;
    }

    const unsubStart = subscribe<UserTypingStatusPayload>('typing:start', (payload) => {
      if (!payload || payload.chatId !== chatId) return;
      if (user && payload.userId === user.id) return; // Ignore own typing events

      setIsTyping(true);
      setTypingUsername(payload.username || null);

      // Reset fallback timeout
      if (incomingFallbackTimeoutRef.current) {
        clearTimeout(incomingFallbackTimeoutRef.current);
      }
      incomingFallbackTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTypingUsername(null);
      }, TYPING_FALLBACK_RESET_MS);
    });

    const unsubStop = subscribe<UserTypingStatusPayload>('typing:stop', (payload) => {
      if (!payload || payload.chatId !== chatId) return;
      if (user && payload.userId === user.id) return;

      if (incomingFallbackTimeoutRef.current) {
        clearTimeout(incomingFallbackTimeoutRef.current);
      }
      setIsTyping(false);
      setTypingUsername(null);
    });

    return () => {
      unsubStart();
      unsubStop();
      if (incomingFallbackTimeoutRef.current) {
        clearTimeout(incomingFallbackTimeoutRef.current);
      }
    };
  }, [chatId, subscribe, user]);

  // Cleanup on unmount or chat switch
  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [chatId, stopTyping]);

  return {
    isTyping,
    typingUsername,
    emitTyping,
    stopTyping,
  };
}
