'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Smile, Loader2, Sparkles } from 'lucide-react';
import { CompressionResult } from '@/lib/imageCompression';
import { cn } from '@/lib/utils';

export interface ImagePreviewModalProps {
  isOpen: boolean;
  compressionResult: CompressionResult | null;
  isUploading?: boolean;
  onClose: () => void;
  onSend: (caption: string) => void;
}

export default function ImagePreviewModal({
  isOpen,
  compressionResult,
  isUploading = false,
  onClose,
  onSend,
}: ImagePreviewModalProps) {
  const [caption, setCaption] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCaption('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen || !compressionResult) return null;

  const originalKb = Math.round(compressionResult.originalSize / 1024);
  const compressedKb = Math.round(compressionResult.compressedSize / 1024);
  const savedPercent = Math.max(
    0,
    Math.round((1 - compressionResult.compressedSize / compressionResult.originalSize) * 100)
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isUploading) {
      e.preventDefault();
      onSend(caption.trim());
    } else if (e.key === 'Escape' && !isUploading) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-wa-dark-bg/95 backdrop-blur-md text-white select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/10 z-10">
        <button
          type="button"
          onClick={onClose}
          disabled={isUploading}
          className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors focus:outline-none"
          aria-label="Cancel image upload"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Compression stats badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-wa-green/20 text-wa-green text-xs font-medium border border-wa-green/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            WebP {compressedKb} KB ({savedPercent}% smaller than {originalKb} KB)
          </span>
        </div>

        <div className="w-8" />
      </div>

      {/* Image Preview Center */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden relative">
        <img
          src={compressionResult.previewUrl}
          alt="Preview"
          className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-transform"
        />

        {isUploading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-wa-green" />
            <p className="text-sm font-medium">Uploading compressed image...</p>
          </div>
        )}
      </div>

      {/* Bottom Caption Bar */}
      <div className="p-4 bg-black/50 border-t border-white/10 flex items-center gap-3 max-w-3xl mx-auto w-full">
        <button
          type="button"
          className="p-2 text-white/70 hover:text-white transition-colors focus:outline-none"
          aria-label="Add emoji"
        >
          <Smile className="w-6 h-6" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isUploading}
          placeholder="Add a caption..."
          className="flex-1 bg-white/10 hover:bg-white/15 text-white placeholder:text-white/50 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-wa-green transition-all"
        />

        <button
          type="button"
          onClick={() => onSend(caption.trim())}
          disabled={isUploading}
          className="p-3 rounded-full bg-wa-green hover:bg-wa-green-dark text-white transition-colors shadow-lg focus:outline-none flex-shrink-0 disabled:opacity-50"
          aria-label="Send image message"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
