'use client';

import React from 'react';
import { getDocumentCategory, getFileExtension, DocumentCategory } from '@/lib/fileValidation';
import {
  FileText,
  FileSpreadsheet,
  FileArchive,
  Presentation,
  FileCode,
  File,
} from 'lucide-react';

export interface FileTypeIconProps {
  filename: string;
  mimeType?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function FileTypeIcon({
  filename,
  mimeType,
  size = 'md',
  className = '',
}: FileTypeIconProps) {
  const category = getDocumentCategory(filename, mimeType);
  const ext = getFileExtension(filename).toUpperCase() || 'FILE';

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }[size];

  // WhatsApp-inspired color mapping
  const colorMap: Record<DocumentCategory, { bg: string; text: string; icon: React.ReactNode }> = {
    pdf: {
      bg: 'bg-red-500/15 text-red-500 dark:bg-red-500/20',
      text: 'text-red-500',
      icon: <FileText className={iconSizes} />,
    },
    excel: {
      bg: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
      text: 'text-emerald-600 dark:text-emerald-400',
      icon: <FileSpreadsheet className={iconSizes} />,
    },
    word: {
      bg: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      text: 'text-blue-600 dark:text-blue-400',
      icon: <FileText className={iconSizes} />,
    },
    ppt: {
      bg: 'bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
      text: 'text-orange-600 dark:text-orange-400',
      icon: <Presentation className={iconSizes} />,
    },
    zip: {
      bg: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      text: 'text-amber-600 dark:text-amber-400',
      icon: <FileArchive className={iconSizes} />,
    },
    text: {
      bg: 'bg-slate-500/15 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400',
      text: 'text-slate-600 dark:text-slate-400',
      icon: <FileCode className={iconSizes} />,
    },
    file: {
      bg: 'bg-gray-500/15 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
      text: 'text-gray-600 dark:text-gray-400',
      icon: <File className={iconSizes} />,
    },
  };

  const currentTheme = colorMap[category] || colorMap.file;

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center rounded-xl font-bold select-none shadow-xs ${currentTheme.bg} ${sizeClasses} ${className}`}
      title={`${ext} Document`}
    >
      {currentTheme.icon}
      <span className="absolute -bottom-1 -right-1 text-[8px] font-black uppercase px-1 py-0.2 rounded bg-black/60 text-white leading-none">
        {ext.slice(0, 4)}
      </span>
    </div>
  );
}
