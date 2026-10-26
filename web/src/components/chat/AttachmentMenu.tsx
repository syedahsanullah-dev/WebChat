'use client';

import React, { useRef, useEffect } from 'react';
import { Image, FileText, Camera, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AttachmentMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhoto: () => void;
  onSelectDocument?: () => void;
  onSelectLocation?: () => void;
  className?: string;
}

export default function AttachmentMenu({
  isOpen,
  onClose,
  onSelectPhoto,
  onSelectDocument,
  onSelectLocation,
  className,
}: AttachmentMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        'absolute bottom-16 left-4 z-50 flex flex-col gap-2 p-3 bg-wa-light-header dark:bg-wa-dark-header rounded-2xl shadow-xl border border-wa-light-border dark:border-wa-dark-border animate-in fade-in zoom-in-95 duration-150',
        className
      )}
    >
      {/* Photos & Videos option */}
      <button
        type="button"
        onClick={() => {
          onSelectPhoto();
          onClose();
        }}
        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover transition-colors text-left group"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
          <Image className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Photos & Videos
          </p>
          <p className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
            Compressed WebP images
          </p>
        </div>
      </button>

      {/* Document option */}
      {onSelectDocument && (
        <button
          type="button"
          onClick={() => {
            onSelectDocument();
            onClose();
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover transition-colors text-left group"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Document
            </p>
            <p className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
              Share PDF or files
            </p>
          </div>
        </button>
      )}

      {/* Location option */}
      {onSelectLocation && (
        <button
          type="button"
          onClick={() => {
            onSelectLocation();
            onClose();
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover transition-colors text-left group"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
              Location
            </p>
            <p className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
              Share current location
            </p>
          </div>
        </button>
      )}
    </div>
  );
}
