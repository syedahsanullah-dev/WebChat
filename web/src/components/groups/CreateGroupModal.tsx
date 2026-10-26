'use client';

import React, { useState, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import ContactPicker from './ContactPicker';
import { Camera, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import { cn } from '@/lib/utils';

export interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (newGroup: any) => void;
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onGroupCreated,
}: CreateGroupModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setStep(1);
    setSelectedParticipantIds([]);
    setTitle('');
    setDescription('');
    setAvatarUrl(null);
    setIsSubmitting(false);
    setIsUploadingAvatar(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      // Compress avatar to WebP
      const compressed = await compressImage(file, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.85,
      });

      const formData = new FormData();
      formData.append('file', compressed.file);

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(data.mediaUrl);
      } else {
        alert('Failed to upload group avatar');
      }
    } catch (err) {
      console.error('[CreateGroupModal] Avatar upload error:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          avatarUrl,
          participantIds: selectedParticipantIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onGroupCreated(data.group);
        handleClose();
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || 'Failed to create group');
      }
    } catch (err) {
      console.error('[CreateGroupModal] Error creating group:', err);
      alert('Error creating group chat');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 1 ? 'Add group participants' : 'New group'}
      maxWidth="md"
    >
      <div className="flex flex-col h-[460px]">
        {step === 1 ? (
          /* Step 1: Select Participants */
          <div className="flex-1 flex flex-col relative overflow-hidden">
            <ContactPicker
              selectedIds={selectedParticipantIds}
              onChange={setSelectedParticipantIds}
              className="flex-1"
            />

            {/* Next Step Forward Button */}
            {selectedParticipantIds.length > 0 && (
              <div className="absolute bottom-4 right-4 z-10 animate-in zoom-in duration-150">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-12 h-12 rounded-full bg-wa-green hover:bg-wa-green-dark text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 focus:outline-none"
                  aria-label="Continue to group info"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Group Info */
          <div className="flex-1 flex flex-col justify-between p-4 overflow-y-auto relative animate-in fade-in duration-150">
            <div className="space-y-6">
              {/* Avatar Selector */}
              <div className="flex items-center justify-center pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-full bg-wa-light-hover dark:bg-wa-dark-hover border-2 border-dashed border-wa-light-border dark:border-wa-dark-border flex flex-col items-center justify-center text-wa-light-text-muted dark:text-wa-dark-text-muted hover:border-wa-green cursor-pointer transition-colors overflow-hidden relative group"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Group icon"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <>
                      <Camera className="w-8 h-8 group-hover:scale-110 transition-transform text-wa-green" />
                      <span className="text-[10px] mt-1 font-medium">ADD GROUP ICON</span>
                    </>
                  )}

                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Group Title Input */}
              <div>
                <label className="block text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary uppercase mb-1">
                  Group Subject
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                    placeholder="Provide a group subject"
                    className="w-full px-3 py-2 bg-wa-light-input dark:bg-wa-dark-input text-wa-light-text-primary dark:text-wa-dark-text-primary border-b-2 border-wa-green focus:outline-none text-sm transition-colors"
                  />
                  <span className="absolute right-2 top-2.5 text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
                    {title.length}/100
                  </span>
                </div>
              </div>

              {/* Group Description Input */}
              <div>
                <label className="block text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary uppercase mb-1">
                  Group Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="What is this group about?"
                  rows={3}
                  className="w-full px-3 py-2 bg-wa-light-input dark:bg-wa-dark-input text-wa-light-text-primary dark:text-wa-dark-text-primary rounded-lg border border-wa-light-border dark:border-wa-dark-border focus:border-wa-green focus:outline-none text-sm resize-none"
                />
              </div>

              <div className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
                {selectedParticipantIds.length} participant{selectedParticipantIds.length === 1 ? '' : 's'} selected
              </div>
            </div>

            {/* Bottom Actions: Back and Submit */}
            <div className="flex items-center justify-between pt-4 border-t border-wa-light-border dark:border-wa-dark-border mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={!title.trim() || isSubmitting}
                className="w-12 h-12 rounded-full bg-wa-green hover:bg-wa-green-dark text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 disabled:opacity-50 disabled:scale-100 focus:outline-none"
                aria-label="Create group"
              >
                {isSubmitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Check className="w-6 h-6 stroke-[3]" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
