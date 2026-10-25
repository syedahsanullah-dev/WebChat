'use client';

import React, { useState, useRef } from 'react';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Camera,
  Pencil,
  Check,
  X,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ABOUT_STATUSES = [
  'Available',
  'Busy',
  'At work',
  'In a meeting',
  'Battery about to die',
  'Can’t talk, WebChat only',
];

export default function ProfileDrawer({ isOpen, onClose }: ProfileDrawerProps) {
  const { user, updateProfile, updateAvatar } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Display Name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(user?.displayName || '');

  // Edit About state
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [aboutInput, setAboutInput] = useState(user?.about || '');

  // Status feedback
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Sync state when user profile changes
  React.useEffect(() => {
    if (user) {
      setDisplayNameInput(user.displayName);
      setAboutInput(user.about || 'Hey there! I am using WebChat.');
    }
  }, [user]);

  if (!isOpen) return null;

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 3500);
  };

  const handleSaveDisplayName = async () => {
    const trimmed = displayNameInput.trim();
    if (trimmed.length < 2) {
      showFeedback('error', 'Display name must be at least 2 characters');
      return;
    }
    if (trimmed.length > 50) {
      showFeedback('error', 'Display name must not exceed 50 characters');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({ displayName: trimmed });
      if (res.success) {
        setIsEditingName(false);
        showFeedback('success', 'Name updated successfully');
      } else {
        showFeedback('error', res.error || 'Failed to update name');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAbout = async (customAbout?: string) => {
    const textToSave = (customAbout !== undefined ? customAbout : aboutInput).trim();
    if (textToSave.length > 255) {
      showFeedback('error', 'About status must not exceed 255 characters');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({ about: textToSave });
      if (res.success) {
        setIsEditingAbout(false);
        setAboutInput(textToSave);
        showFeedback('success', 'About status updated');
      } else {
        showFeedback('error', res.error || 'Failed to update status');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showFeedback('error', 'Please select a JPG, PNG, or WebP image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showFeedback('error', 'Image size must be under 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const res = await updateAvatar(file);
      if (res.success) {
        showFeedback('success', 'Profile photo updated');
      } else {
        showFeedback('error', res.error || 'Failed to upload photo');
      }
    } finally {
      setIsUploadingAvatar(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div
      className="absolute inset-0 z-30 bg-wa-light-sidebar dark:bg-wa-dark-sidebar flex flex-col transition-all duration-300 ease-in-out select-none"
      data-testid="profile-drawer"
    >
      {/* Drawer Top Header (WhatsApp Dark Green on dark / Light grey on light) */}
      <div className="h-24 sm:h-28 bg-wa-green dark:bg-wa-dark-header border-b border-wa-light-border dark:border-wa-dark-border px-4 pb-3 flex items-end gap-5 text-white flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none"
          aria-label="Back to chats"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-medium leading-none mb-1">Profile</h2>
      </div>

      {/* Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {/* Feedback Alert Toast */}
        {feedback && (
          <div
            className={`p-3 rounded-lg flex items-center gap-2 text-xs transition-all ${
              feedback.type === 'success'
                ? 'bg-wa-green/10 text-wa-green border border-wa-green/30'
                : 'bg-red-500/10 text-red-500 border border-red-500/30'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Big Avatar with Camera Hover Overlay */}
        <div className="flex flex-col items-center">
          <div
            className="relative group cursor-pointer w-40 h-40 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            title="Click to change profile photo"
          >
            <Avatar
              src={user?.avatarUrl}
              name={user?.displayName || 'User'}
              className="w-40 h-40 text-4xl shadow-md border-2 border-wa-light-border dark:border-wa-dark-border"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200">
              {isUploadingAvatar ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <Camera className="w-8 h-8 mb-1" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-center px-2">
                    Change Profile Photo
                  </span>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarFileChange}
              disabled={isUploadingAvatar}
            />
          </div>
          <p className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted mt-2">
            Click photo to update (Max 5MB)
          </p>
        </div>

        {/* Display Name Section */}
        <div className="bg-wa-light-input dark:bg-wa-dark-header rounded-xl p-4 border border-wa-light-border dark:border-wa-dark-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-wa-green uppercase tracking-wide">
              Your Name
            </span>
            {!isEditingName && (
              <button
                type="button"
                onClick={() => {
                  setDisplayNameInput(user?.displayName || '');
                  setIsEditingName(true);
                }}
                className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-green transition-colors p-1"
                aria-label="Edit display name"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>

          {isEditingName ? (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                maxLength={50}
                className="flex-1 px-3 py-1.5 rounded-lg bg-wa-light-sidebar dark:bg-wa-dark-input border border-wa-green text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none"
                autoFocus
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={handleSaveDisplayName}
                disabled={isSaving}
                className="p-1.5 rounded-lg bg-wa-green text-white hover:bg-wa-green-dark transition-colors disabled:opacity-50"
                aria-label="Save name"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                disabled={isSaving}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-wa-light-text-secondary dark:text-wa-dark-text-secondary transition-colors"
                aria-label="Cancel editing"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-base font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {user?.displayName || 'User'}
            </p>
          )}

          <p className="text-[11px] text-wa-light-text-muted dark:text-wa-dark-text-muted pt-1">
            This name will be visible to your contacts in WebChat.
          </p>
        </div>

        {/* Read-Only Identity (Username & Email) */}
        <div className="bg-wa-light-input dark:bg-wa-dark-header rounded-xl p-4 border border-wa-light-border dark:border-wa-dark-border space-y-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
              <Lock className="w-3.5 h-3.5 text-wa-light-text-muted dark:text-wa-dark-text-muted" />
              <span>Username (@handle)</span>
            </div>
            <p className="text-sm font-mono text-wa-light-text-primary dark:text-wa-dark-text-primary font-medium">
              @{user?.username}
            </p>
          </div>

          <div className="pt-2 border-t border-wa-light-border/60 dark:border-wa-dark-border/60">
            <div className="flex items-center gap-1.5 text-xs font-medium text-wa-light-text-secondary dark:text-wa-dark-text-secondary mb-1">
              <Lock className="w-3.5 h-3.5 text-wa-light-text-muted dark:text-wa-dark-text-muted" />
              <span>Email Address</span>
            </div>
            <p className="text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {user?.email}
            </p>
          </div>
        </div>

        {/* About / Bio Section */}
        <div className="bg-wa-light-input dark:bg-wa-dark-header rounded-xl p-4 border border-wa-light-border dark:border-wa-dark-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-wa-green uppercase tracking-wide">
              About
            </span>
            {!isEditingAbout && (
              <button
                type="button"
                onClick={() => {
                  setAboutInput(user?.about || 'Hey there! I am using WebChat.');
                  setIsEditingAbout(true);
                }}
                className="text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-green transition-colors p-1"
                aria-label="Edit about status"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>

          {isEditingAbout ? (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={aboutInput}
                onChange={(e) => setAboutInput(e.target.value)}
                maxLength={255}
                className="flex-1 px-3 py-1.5 rounded-lg bg-wa-light-sidebar dark:bg-wa-dark-input border border-wa-green text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary focus:outline-none"
                autoFocus
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={() => handleSaveAbout()}
                disabled={isSaving}
                className="p-1.5 rounded-lg bg-wa-green text-white hover:bg-wa-green-dark transition-colors disabled:opacity-50"
                aria-label="Save status"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingAbout(false)}
                disabled={isSaving}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-wa-light-text-secondary dark:text-wa-dark-text-secondary transition-colors"
                aria-label="Cancel editing"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {user?.about || 'Hey there! I am using WebChat.'}
            </p>
          )}

          {/* Preset status chips */}
          <div className="pt-2">
            <span className="text-[11px] font-medium text-wa-light-text-muted dark:text-wa-dark-text-muted block mb-2">
              Select a preset status:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ABOUT_STATUSES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSaveAbout(preset)}
                  className="px-2.5 py-1 rounded-full text-xs bg-wa-light-sidebar dark:bg-wa-dark-input hover:bg-wa-green/10 hover:text-wa-green dark:hover:bg-wa-green/20 border border-wa-light-border dark:border-wa-dark-border text-wa-light-text-secondary dark:text-wa-dark-text-secondary transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
