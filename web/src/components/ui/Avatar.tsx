'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
  onClick?: () => void;
}

export function getInitials(name: string): string {
  const clean = name.trim().replace(/^@/, '');
  if (!clean) return '?';
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-2xl',
};

const indicatorSizes = {
  sm: 'w-2.5 h-2.5 bottom-0 right-0 ring-1.5',
  md: 'w-3 h-3 bottom-0 right-0 ring-2',
  lg: 'w-3.5 h-3.5 bottom-0 right-0 ring-2',
  xl: 'w-5 h-5 bottom-0.5 right-0.5 ring-3',
};

export default function Avatar({
  src,
  alt,
  name,
  size = 'md',
  isOnline = false,
  className,
  onClick,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name);

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center justify-center flex-shrink-0 rounded-full select-none',
        sizeClasses[size],
        onClick && 'cursor-pointer hover:opacity-90 transition-opacity',
        className
      )}
    >
      {src && !imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div
          className="w-full h-full rounded-full bg-wa-dark-input text-wa-light-text-secondary dark:text-wa-dark-text-secondary flex items-center justify-center font-medium border border-wa-light-border dark:border-wa-dark-border"
          aria-label={alt || name}
        >
          {initials}
        </div>
      )}

      {isOnline && (
        <span
          className={cn(
            'absolute rounded-full bg-wa-green ring-white dark:ring-wa-dark-header',
            indicatorSizes[size]
          )}
          aria-label="Online"
        />
      )}
    </div>
  );
}
