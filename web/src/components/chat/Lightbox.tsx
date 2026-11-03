'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LightboxProps {
  isOpen: boolean;
  src: string;
  alt?: string;
  caption?: string | null;
  onClose: () => void;
}

export default function Lightbox({
  isOpen,
  src,
  alt = 'Image',
  caption,
  onClose,
}: LightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    resetZoom();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, zoomIn, zoomOut, resetZoom]);

  if (!isOpen || !mounted) return null;

  // Mouse drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = alt || 'image.webp';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Close when clicking backdrop outside the image
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (scale <= 1 && e.target === e.currentTarget) {
      onClose();
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/95 backdrop-blur-md select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={handleBackdropClick}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Dedicated Floating Close Icon Button (Always visible at top-right, immune to overflow) */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-[10000] p-2.5 rounded-full bg-black/75 hover:bg-black/95 text-white/90 hover:text-white border border-white/25 shadow-2xl cursor-pointer transition-all hover:scale-110 active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-[#00a884]"
        aria-label="Close image viewer"
        title="Close (Esc)"
      >
        <X className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-black/50 border-b border-white/10 z-10 pr-16">
        <div className="flex items-center gap-3 text-white min-w-0 flex-1 mr-4">
          <span className="text-sm font-medium opacity-85 truncate" title={alt}>
            {alt}
          </span>
          {scale > 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 text-white/80 shrink-0">
              {Math.round(scale * 100)}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-white shrink-0">
          <button
            type="button"
            onClick={zoomIn}
            className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors focus:outline-hidden cursor-pointer"
            aria-label="Zoom in"
            title="Zoom in (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={zoomOut}
            className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors focus:outline-hidden cursor-pointer"
            aria-label="Zoom out"
            title="Zoom out (-)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          {scale > 1 && (
            <button
              type="button"
              onClick={resetZoom}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors focus:outline-hidden cursor-pointer"
              aria-label="Reset zoom"
              title="Reset zoom (0)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors focus:outline-hidden cursor-pointer"
            aria-label="Download image"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>

          <div className="w-px h-5 bg-white/20 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors focus:outline-hidden cursor-pointer hidden sm:block"
            aria-label="Close viewer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Image Viewport */}
      <div
        className={cn(
          'flex-1 flex items-center justify-center p-4 overflow-hidden relative',
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
        )}
        onClick={handleBackdropClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-md shadow-2xl select-none pointer-events-auto cursor-default"
        />
      </div>

      {/* Bottom Caption (if any) */}
      {caption && (
        <div className="p-4 bg-black/60 text-center text-sm text-white/90 border-t border-white/10 z-10 max-w-2xl mx-auto w-full">
          {caption}
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
}
