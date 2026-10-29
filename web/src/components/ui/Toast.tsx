'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Info, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'info' | 'error' | 'success' | 'warning';

export interface ToastOptions {
  type?: ToastType;
  message: string;
  durationMs?: number;
}

export interface ToastItem extends ToastOptions {
  id: string;
}

/**
 * Global helper to dispatch accessible non-blocking toasts across the application
 * without coupling to specific React context tree depth.
 */
export function showToast(options: ToastOptions | string): void {
  if (typeof window === 'undefined') return;
  const detail: ToastOptions =
    typeof options === 'string'
      ? { type: 'info', message: options }
      : {
          type: options.type || 'info',
          message: options.message,
          durationMs: options.durationMs ?? 4000,
        };
  window.dispatchEvent(new CustomEvent<ToastOptions>('webchat:toast', { detail }));
}

export interface ToastProps {
  type?: ToastType;
  message: string;
  onClose?: () => void;
  className?: string;
}

/**
 * Standalone Toast primitive component
 */
export default function Toast({
  type = 'info',
  message,
  onClose,
  className,
}: ToastProps) {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-wa-green flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'error':
        return 'border-red-500/30 bg-[#202c33]/95 text-red-200';
      case 'warning':
        return 'border-amber-500/30 bg-[#202c33]/95 text-amber-200';
      case 'success':
        return 'border-wa-green/30 bg-[#202c33]/95 text-wa-green';
      case 'info':
      default:
        return 'border-wa-dark-border bg-[#202c33]/95 text-wa-dark-text-primary';
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl border backdrop-blur-md text-xs sm:text-sm font-medium transition-all select-none animate-in fade-in slide-in-from-top-2 duration-200 max-w-md pointer-events-auto',
        getBorderColor(),
        className
      )}
    >
      {getIcon()}
      <span className="flex-1 text-wa-dark-text-primary leading-snug">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-wa-dark-text-secondary hover:text-white hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
          aria-label="Dismiss toast"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * ToastContainer: Listens for `webchat:toast` custom events and renders active toasts.
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastOptions>;
      if (!customEvent.detail || !customEvent.detail.message) return;

      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = {
        id,
        type: customEvent.detail.type || 'info',
        message: customEvent.detail.message,
        durationMs: customEvent.detail.durationMs ?? 4000,
      };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep at most 5 toasts visible

      if (newToast.durationMs && newToast.durationMs > 0) {
        setTimeout(() => {
          removeToast(id);
        }, newToast.durationMs);
      }
    };

    window.addEventListener('webchat:toast', handleToastEvent);
    return () => {
      window.removeEventListener('webchat:toast', handleToastEvent);
    };
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none px-4 w-full max-w-lg"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
