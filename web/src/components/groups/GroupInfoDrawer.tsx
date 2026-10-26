'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Avatar from '@/components/ui/Avatar';
import MemberRow, { GroupParticipantItem } from './MemberRow';
import ContactPicker from './ContactPicker';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { X, Edit2, Check, UserPlus, LogOut, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GroupInfoDrawerProps {
  isOpen: boolean;
  groupId: string;
  onClose: () => void;
  onGroupUpdated?: () => void;
  onExitGroup?: () => void;
  className?: string;
}

export default function GroupInfoDrawer({
  isOpen,
  groupId,
  onClose,
  onGroupUpdated,
  onExitGroup,
  className,
}: GroupInfoDrawerProps) {
  const { user } = useAuth();
  const [group, setGroup] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState('');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedNewMemberIds, setSelectedNewMemberIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setGroup(data.group);
        setTitleInput(data.group.groupTitle || '');
        setDescInput(data.group.groupDescription || '');
      }
    } catch (err) {
      console.error('[GroupInfoDrawer] Error fetching group:', err);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (isOpen) {
      fetchGroupDetails();
    }
  }, [isOpen, fetchGroupDetails]);

  if (!isOpen) return null;

  const currentUserId = user?.id || '';
  const participants: GroupParticipantItem[] = group?.participants || [];
  const currentParticipant = participants.find((p) => p.userId === currentUserId);
  const isAdmin = currentParticipant?.role === 'admin';

  // Update Title
  const handleSaveTitle = async () => {
    if (!titleInput.trim() || titleInput === group.groupTitle) {
      setIsEditingTitle(false);
      return;
    }

    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleInput.trim() }),
      });
      if (res.ok) {
        setGroup((prev: any) => ({ ...prev, groupTitle: titleInput.trim() }));
        setIsEditingTitle(false);
        onGroupUpdated?.();
      }
    } catch (err) {
      console.error('[GroupInfoDrawer] Failed to update title:', err);
    }
  };

  // Update Description
  const handleSaveDesc = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: descInput.trim() }),
      });
      if (res.ok) {
        setGroup((prev: any) => ({ ...prev, groupDescription: descInput.trim() }));
        setIsEditingDesc(false);
        onGroupUpdated?.();
      }
    } catch (err) {
      console.error('[GroupInfoDrawer] Failed to update description:', err);
    }
  };

  // Participant actions: promote, demote, remove, leave
  const handleParticipantAction = async (action: string, targetUserId: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUserId }),
      });

      if (res.ok) {
        await fetchGroupDetails();
        onGroupUpdated?.();
        if (action === 'leave') {
          onClose();
          onExitGroup?.();
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.error || 'Failed to update participant');
      }
    } catch (err) {
      console.error('[GroupInfoDrawer] Participant action failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Add new members
  const handleAddMembers = async () => {
    if (selectedNewMemberIds.length === 0) return;
    setIsSaving(true);
    try {
      for (const targetUserId of selectedNewMemberIds) {
        await fetch(`/api/groups/${groupId}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', targetUserId }),
        });
      }
      setSelectedNewMemberIds([]);
      setIsAddMemberOpen(false);
      await fetchGroupDetails();
      onGroupUpdated?.();
    } catch (err) {
      console.error('[GroupInfoDrawer] Error adding members:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'absolute inset-0 md:inset-y-0 md:left-auto md:right-0 w-full md:w-[360px] lg:w-[380px] h-full flex flex-col bg-wa-light-sidebar dark:bg-wa-dark-sidebar md:border-l border-wa-light-border dark:border-wa-dark-border shadow-2xl z-30 transition-all select-none animate-in slide-in-from-right-4 duration-150',
          className
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center gap-4 px-4 py-3 bg-wa-light-header dark:bg-wa-dark-header border-b border-wa-light-border dark:border-wa-dark-border flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary focus:outline-none"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
            Group info
          </h2>
        </div>

        {/* Drawer Body */}
        {isLoading || !group ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-wa-green" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-wa-light-border/40 dark:divide-wa-dark-border/40">
            {/* Group Header Card */}
            <div className="p-6 flex flex-col items-center text-center bg-wa-light-sidebar dark:bg-wa-dark-sidebar">
              <Avatar
                name={group.groupTitle || 'Group'}
                src={group.groupAvatarUrl}
                size="xl"
                className="w-32 h-32 text-4xl mb-4 shadow-sm"
              />

              {/* Group Title */}
              {isEditingTitle && isAdmin ? (
                <div className="flex items-center gap-1.5 w-full max-w-[280px]">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="flex-1 px-2 py-1 bg-wa-light-input dark:bg-wa-dark-input text-wa-light-text-primary dark:text-wa-dark-text-primary border-b-2 border-wa-green text-lg font-medium focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveTitle}
                    className="p-1 text-wa-green hover:bg-wa-green/10 rounded-full"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <h3 className="text-xl font-medium text-wa-light-text-primary dark:text-wa-dark-text-primary">
                    {group.groupTitle}
                  </h3>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-wa-light-text-muted hover:text-wa-green transition-opacity"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              <p className="text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted mt-1">
                Group · {participants.length} participants
              </p>
            </div>

            {/* Description Section */}
            <div className="p-4 bg-wa-light-sidebar dark:bg-wa-dark-sidebar">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary uppercase">
                  Description
                </span>
                {isAdmin && !isEditingDesc && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDesc(true)}
                    className="text-wa-light-text-muted hover:text-wa-green text-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isEditingDesc && isAdmin ? (
                <div className="space-y-2 mt-2">
                  <textarea
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    rows={3}
                    className="w-full p-2 text-sm bg-wa-light-input dark:bg-wa-dark-input text-wa-light-text-primary dark:text-wa-dark-text-primary rounded border border-wa-light-border dark:border-wa-dark-border focus:border-wa-green focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDesc(false)}
                      className="px-2 py-1 text-xs text-wa-light-text-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDesc}
                      className="px-3 py-1 bg-wa-green text-white text-xs rounded font-medium"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary leading-relaxed whitespace-pre-wrap">
                  {group.groupDescription || 'No group description provided.'}
                </p>
              )}
            </div>

            {/* Participants Section */}
            <div className="p-4 bg-wa-light-sidebar dark:bg-wa-dark-sidebar">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-wa-light-text-secondary dark:text-wa-dark-text-secondary uppercase">
                  {participants.length} Participants
                </span>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsAddMemberOpen(true)}
                    className="flex items-center gap-1 text-xs font-medium text-wa-green hover:underline focus:outline-none"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add participant</span>
                  </button>
                )}
              </div>

              {/* Participant List */}
              <div className="divide-y divide-wa-light-border/30 dark:divide-wa-dark-border/30 mt-2">
                {participants.map((p) => (
                  <MemberRow
                    key={p.userId}
                    participant={p}
                    isCurrentUserAdmin={isAdmin}
                    currentUserId={currentUserId}
                    onPromote={(uId) => handleParticipantAction('promote', uId)}
                    onDemote={(uId) => handleParticipantAction('demote', uId)}
                    onRemove={(uId) => handleParticipantAction('remove', uId)}
                  />
                ))}
              </div>
            </div>

            {/* Exit Group Button */}
            <div className="p-4 bg-wa-light-sidebar dark:bg-wa-dark-sidebar">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to exit this group?')) {
                    handleParticipantAction('leave', currentUserId);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors font-medium text-sm focus:outline-none"
              >
                <LogOut className="w-5 h-5" />
                <span>Exit group</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Participant Modal */}
      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title="Add participants"
        maxWidth="md"
      >
        <div className="flex flex-col h-[400px]">
          <ContactPicker
            selectedIds={selectedNewMemberIds}
            onChange={setSelectedNewMemberIds}
            className="flex-1"
          />

          <div className="p-3 border-t border-wa-light-border dark:border-wa-dark-border flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddMemberOpen(false)}
              className="px-4 py-2 text-sm text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddMembers}
              disabled={selectedNewMemberIds.length === 0 || isSaving}
              className="px-4 py-2 bg-wa-green hover:bg-wa-green-dark text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {isSaving ? 'Adding...' : `Add (${selectedNewMemberIds.length})`}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
