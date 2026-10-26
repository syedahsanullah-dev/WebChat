'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { WsEnvelope, WsEventType } from '@shared/events';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketContextValue {
  status: WebSocketStatus;
  isConnected: boolean;
  send: <T = any>(envelope: WsEnvelope<T> | { type: string; payload: T }) => boolean;
  subscribe: <T = any>(type: WsEventType | string, callback: (payload: T) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

const MAX_RECONNECT_DELAY_MS = 10000;
const INITIAL_RECONNECT_DELAY_MS = 1000;

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const listenersRef = useRef<Map<string, Set<(payload: any) => void>>>(new Map());
  const isManuallyClosedRef = useRef(false);

  // Subscribe to incoming envelopes
  const subscribe = useCallback(<T = any>(type: WsEventType | string, callback: (payload: T) => void) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    const set = listenersRef.current.get(type)!;
    set.add(callback);

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        listenersRef.current.delete(type);
      }
    };
  }, []);

  // Send an envelope
  const send = useCallback(<T = any>(envelope: WsEnvelope<T> | { type: string; payload: T }): boolean => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(envelope));
        return true;
      } catch (err) {
        console.error('[WebSocket] Send failed:', err);
        return false;
      }
    }
    return false;
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!user) {
      if (wsRef.current) {
        isManuallyClosedRef.current = true;
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus('disconnected');
      return;
    }

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    isManuallyClosedRef.current = false;
    setStatus('connecting');

    // Fetch auth token or fallback to userId query params
    let tokenParam = '';
    try {
      const res = await fetch('/api/auth/token');
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          tokenParam = `?token=${encodeURIComponent(data.token)}`;
        }
      }
    } catch {
      // Ignore token fetch error, fall back to cookie/dev params
    }

    if (!tokenParam && user.id) {
      tokenParam = `?userId=${encodeURIComponent(user.id)}&username=${encodeURIComponent(user.username)}`;
    }

    // Determine target socket URL
    const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    let baseSocketUrl = envUrl || 'ws://localhost:4000';
    if (!envUrl && typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      // If deployed on chat.yourdomain.com -> ws.yourdomain.com
      if (hostname.startsWith('chat.')) {
        baseSocketUrl = `${protocol}//${hostname.replace(/^chat\./, 'ws.')}`;
      } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        baseSocketUrl = `${protocol}//${hostname}:4000`;
      } else {
        baseSocketUrl = `${protocol}//${window.location.host}`;
      }
    }

    const socketUrl = `${baseSocketUrl}${tokenParam}`;

    try {
      const ws = new WebSocket(socketUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
      };

      ws.onmessage = (event) => {
        try {
          const envelope: WsEnvelope = JSON.parse(event.data);
          if (!envelope || !envelope.type) return;

          // Respond to ping
          if (envelope.type === 'ping') {
            send({ type: 'pong', payload: { timestamp: Date.now() } });
          }

          // Handle remote session revocation
          if (envelope.type === 'session:revoked') {
            console.warn('[WebSocket] Session was remotely revoked.');
            isManuallyClosedRef.current = true;
            if (typeof window !== 'undefined') {
              window.location.href = '/login?reason=session_revoked';
            }
          }

          // Dispatch to type-specific subscribers
          const handlers = listenersRef.current.get(envelope.type);
          if (handlers) {
            handlers.forEach((handler) => {
              try {
                handler(envelope.payload);
              } catch (err) {
                console.error(`[WebSocket] Error in handler for ${envelope.type}:`, err);
              }
            });
          }

          // Also dispatch to catch-all '*' subscribers
          const allHandlers = listenersRef.current.get('*');
          if (allHandlers) {
            allHandlers.forEach((handler) => {
              try {
                handler(envelope);
              } catch (err) {
                console.error('[WebSocket] Error in catch-all handler:', err);
              }
            });
          }
        } catch {
          // Ignore non-JSON or heartbeat raw frames
        }
      };

      ws.onerror = () => {
        setStatus('error');
      };

      ws.onclose = () => {
        wsRef.current = null;
        setStatus('disconnected');

        // Reconnect with exponential backoff if not manually logged out
        if (!isManuallyClosedRef.current && user) {
          const delay = reconnectDelayRef.current;
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_RECONNECT_DELAY_MS);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (err) {
      console.error('[WebSocket] Connection creation error:', err);
      setStatus('error');
    }
  }, [user, send]);

  useEffect(() => {
    connect();

    return () => {
      isManuallyClosedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const value: WebSocketContextValue = {
    status,
    isConnected: status === 'connected',
    send,
    subscribe,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

const fallbackWebSocketContext: WebSocketContextValue = {
  status: 'disconnected',
  isConnected: false,
  send: () => false,
  subscribe: () => () => {},
};

export function useWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    return fallbackWebSocketContext;
  }
  return context;
}
