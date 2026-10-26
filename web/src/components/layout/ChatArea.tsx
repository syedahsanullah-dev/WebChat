'use client';

import React, { useState, useRef, useEffect } from 'react';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList, { MessageItem } from '@/components/chat/MessageList';
import ChatInput from '@/components/chat/ChatInput';
import ImagePreviewModal from '@/components/chat/ImagePreviewModal';
import GroupInfoDrawer from '@/components/groups/GroupInfoDrawer';
import InChatSearchDrawer from '@/components/chat/InChatSearchDrawer';
import { QuotedMessageData } from '@/components/chat/QuotedReplyPreview';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { MOCK_CHATS } from '@/components/layout/Sidebar';
import { startRingtone } from '@/lib/audio';
import { compressImage, CompressionResult } from '@/lib/imageCompression';
import { RecordedAudioResult } from '@/hooks/useAudioRecorder';
import { usePresence } from '@/hooks/usePresence';
import { useTyping } from '@/hooks/useTyping';
import { useMessages } from '@/hooks/useMessages';
import { useReactions } from '@/hooks/useReactions';
import { useInChatSearch } from '@/hooks/useInChatSearch';
import { useAuth } from '@/context/AuthContext';
import { useCall } from '@/context/CallContext';
import { Lock, Laptop, Trash2 } from 'lucide-react';

export interface ActiveChatInfo {
  id: string;
  name: string;
  username?: string;
  avatar?: string | null;
  isOnline?: boolean;
  lastSeen?: string;
  isGroup?: boolean;
  groupDescription?: string | null;
  otherUser?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    isOnline?: boolean;
    lastSeen?: string;
  } | null;
}

export interface ChatAreaProps {
  activeChatId?: string | null;
  activeChatData?: ActiveChatInfo | null;
  onBack: () => void;
  children?: React.ReactNode;
}

export default function ChatArea({
  activeChatId,
  activeChatData,
  onBack,
  children,
}: ChatAreaProps) {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<QuotedMessageData | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<MessageItem | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Reset any unexpected scroll offset on main and window when switching chats
  useEffect(() => {
    if (activeChatId) {
      if (mainRef.current) mainRef.current.scrollTop = 0;
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        try {
          window.scrollTo(0, 0);
        } catch {
          // JSDOM safe fallback
        }
      }
    }
  }, [activeChatId]);

  // Active chat metadata
  const fallbackChat = MOCK_CHATS.find((c) => c.id === activeChatId) || null;
  const activeChat = activeChatData || fallbackChat;

  const recipientUserId = activeChat?.otherUser?.id || null;
  const recipientId = recipientUserId || activeChat?.username?.replace(/^@/, '') || null;

  // Real-time presence
  const { isUserOnline, getUserLastSeen } = usePresence();
  const isContactOnline =
    activeChat && !activeChat.isGroup
      ? Boolean(
          (recipientUserId && isUserOnline(recipientUserId)) ||
          isUserOnline(activeChat.username?.replace(/^@/, '') || '')
        )
      : false;

  const contactLastSeen =
    activeChat && !activeChat.isGroup
      ? (recipientUserId && getUserLastSeen(recipientUserId)) ||
        getUserLastSeen(activeChat.username?.replace(/^@/, '') || '') ||
        activeChat.otherUser?.lastSeen ||
        (activeChat as any).lastSeen
      : undefined;

  // Real-time typing
  const { isTyping, typingUsername, emitTyping, stopTyping } = useTyping({
    chatId: activeChatId,
    recipientId,
  });

  // Real-time messages & optimistic delivery
  const {
    messages,
    isLoadingOlder,
    hasMore,
    sendMessage,
    deleteMessage,
    fetchOlderMessages,
  } = useMessages({
    chatId: activeChatId,
    recipientId,
  });

  // Reactions hook
  const { reactionsByMessage, toggleReaction } = useReactions(activeChatId);

  // In-chat search hook
  const inChatSearch = useInChatSearch(messages);

  const handleStartCall = () => {
    if (!activeChat) return;
    if (activeChat.isGroup) {
      alert('Voice calling is only available for 1-on-1 private conversations.');
      return;
    }
    const targetUserId = activeChat.otherUser?.id || recipientId;
    if (!targetUserId) {
      alert('Cannot start call: Recipient could not be determined.');
      return;
    }

    startCall({
      chatId: activeChatId || activeChat.id,
      recipientId: targetUserId,
      recipientName: activeChat.name,
      recipientUsername: activeChat.username || activeChat.otherUser?.username,
      recipientAvatar: activeChat.avatar,
    });
  };

  const handleSendMessage = (text: string) => {
    stopTyping();
    sendMessage({
      content: text,
      replyToId: replyingToMessage?.id || null,
      messageType: 'text',
    });
    setReplyingToMessage(null);
  };

  const handleReplyMessage = (msg: MessageItem) => {
    setReplyingToMessage({
      id: msg.id,
      senderName: msg.senderName || (msg.senderId === user?.id ? 'You' : 'User'),
      content: msg.content,
      messageType: msg.messageType,
      mediaUrl: msg.mediaUrl,
    });
  };

  const handleConfirmDelete = (deleteType: 'everyone' | 'forMe') => {
    if (deletingMessage) {
      deleteMessage(deletingMessage.id, deleteType);
      setDeletingMessage(null);
    }
  };

  const handleImageSelect = async (file: File) => {
    try {
      const result = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.82,
      });
      setCompressionResult(result);
    } catch (err) {
      console.error('[ChatArea] Error compressing image:', err);
      alert('Failed to process image. Please try another file.');
    }
  };

  const handleSendImage = async (caption: string) => {
    if (!compressionResult || !activeChatId) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', compressionResult.file);
      if (caption) {
        formData.append('caption', caption);
      }

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to upload image');
      }

      const uploadData = await res.json();

      sendMessage({
        content: caption,
        mediaUrl: uploadData.mediaUrl,
        mediaSize: uploadData.mediaSize,
        messageType: 'image',
        replyToId: replyingToMessage?.id || null,
      });
      setReplyingToMessage(null);

      if (compressionResult.previewUrl) {
        URL.revokeObjectURL(compressionResult.previewUrl);
      }
      setCompressionResult(null);
    } catch (err: any) {
      console.error('[ChatArea] Error uploading image:', err);
      alert(`Image upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCloseImagePreview = () => {
    if (compressionResult?.previewUrl) {
      URL.revokeObjectURL(compressionResult.previewUrl);
    }
    setCompressionResult(null);
  };

  const handleSendVoice = async (result: RecordedAudioResult) => {
    if (!activeChatId) return;

    try {
      const formData = new FormData();
      const ext = result.mimeType?.includes('ogg') ? 'ogg' : 'webm';
      formData.append('file', result.blob, `voice_${Date.now()}.${ext}`);
      formData.append('duration', String(result.duration));
      formData.append('peaks', JSON.stringify(result.peaks));

      const res = await fetch('/api/upload/voice', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to upload voice note');
      }

      const uploadData = await res.json();

      sendMessage({
        messageType: 'voice',
        content: JSON.stringify(uploadData.waveform || result.peaks),
        mediaUrl: uploadData.mediaUrl,
        mediaSize: uploadData.mediaSize,
        mediaDuration: uploadData.mediaDuration || result.duration,
        replyToId: replyingToMessage?.id || null,
      });
      setReplyingToMessage(null);
    } catch (err: any) {
      console.error('[ChatArea] Error uploading voice note:', err);
      alert(`Voice message upload failed: ${err.message || 'Unknown error'}`);
    }
  };

  const menuItems: DropdownMenuItem[] = [
    {
      id: 'info',
      label: activeChat?.isGroup ? 'Group info' : 'Contact info',
      onClick: () => {
        if (activeChat?.isGroup) {
          setIsGroupInfoOpen((prev) => !prev);
        }
      },
    },
    {
      id: 'search',
      label: 'Search messages',
      onClick: () => setIsSearchOpen(true),
    },
    {
      id: 'close-chat',
      label: 'Close chat',
      onClick: onBack,
    },
  ];

  // 1. Empty State View (When no conversation is selected)
  if (!activeChatId || !activeChat) {
    return (
      <main className="h-full w-full flex flex-col items-center justify-center p-6 bg-wa-light-bg dark:bg-wa-dark-bg border-b-6 border-wa-green text-center select-none transition-colors relative">
        <div className="max-w-md flex flex-col items-center">
          <div className="w-64 h-48 sm:w-80 sm:h-56 mb-8 flex items-center justify-center text-wa-light-text-muted dark:text-wa-dark-text-muted">
            <div className="relative">
              <Laptop className="w-32 h-32 sm:w-40 sm:h-40 stroke-[1.2] text-wa-light-text-secondary/60 dark:text-wa-dark-text-secondary/60" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-10 h-10 text-wa-green stroke-2" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-light text-wa-light-text-primary dark:text-wa-dark-text-primary mb-3">
            WebChat for Web
          </h1>

          <p className="text-sm text-wa-light-text-secondary dark:text-wa-dark-text-secondary leading-relaxed mb-8">
            Send and receive messages with audio-only WebRTC calling.
            Experience lightning-fast communication powered by Next.js and Fastify native WebSockets.
          </p>

          <div className="inline-flex items-center gap-1.5 text-xs text-wa-light-text-muted dark:text-wa-dark-text-muted">
            <Lock className="w-3.5 h-3.5" />
            <span>End-to-end encrypted identity (@username)</span>
          </div>
        </div>

        {children}
      </main>
    );
  }

  // 2. Active Chat View
  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative min-h-0 min-w-0">
      <main
        ref={mainRef}
        className="flex-1 min-h-0 min-w-0 flex flex-col bg-wa-light-bg dark:bg-wa-dark-bg overflow-hidden relative transition-colors h-full"
      >
        {/* Top Header */}
        <ChatHeader
          name={activeChat.name}
          avatar={activeChat.avatar}
          isOnline={activeChat.isGroup ? false : isContactOnline}
          lastSeen={activeChat.isGroup ? undefined : contactLastSeen}
          subtitle={
            activeChat.isGroup
              ? ('groupDescription' in activeChat && activeChat.groupDescription
                  ? activeChat.groupDescription
                  : 'Group conversation')
              : undefined
          }
          isTyping={isTyping}
          typingUsername={typingUsername}
          onBack={onBack}
          onStartCall={handleStartCall}
          onSearch={() => setIsSearchOpen(true)}
          onHeaderClick={() => {
            if (activeChat.isGroup) {
              setIsGroupInfoOpen((prev) => !prev);
            }
          }}
          menuItems={menuItems}
        />

        {/* Messages Scroll Area with WhatsApp Doodle Wallpaper */}
        <MessageList
          messages={messages}
          currentUserId={user?.id || 'me'}
          isGroup={Boolean(activeChat.isGroup)}
          searchQuery={inChatSearch.query}
          reactionsByMessage={reactionsByMessage}
          isLoadingOlder={isLoadingOlder}
          hasMore={hasMore}
          onLoadMore={fetchOlderMessages}
          onReply={handleReplyMessage}
          onReact={toggleReaction}
          onDelete={(msg) => setDeletingMessage(msg)}
        />

        {/* Bottom Message Input Bar */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onImageSelect={handleImageSelect}
          onSendVoice={handleSendVoice}
          onTyping={emitTyping}
          replyingToMessage={replyingToMessage}
          onCancelReply={() => setReplyingToMessage(null)}
          disabled={!activeChatId}
        />

        {/* Image Preview & Caption Modal */}
        <ImagePreviewModal
          isOpen={Boolean(compressionResult)}
          compressionResult={compressionResult}
          isUploading={isUploadingImage}
          onClose={handleCloseImagePreview}
          onSend={handleSendImage}
        />

        {/* Delete Message Confirmation Modal */}
        <Modal
          isOpen={Boolean(deletingMessage)}
          onClose={() => setDeletingMessage(null)}
          title="Delete message?"
          maxWidth="sm"
        >
          <div className="space-y-4 py-2">
            <p className="text-sm text-wa-light-text-secondary dark:text-wa-dark-text-secondary">
              Are you sure you want to delete this message?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              {deletingMessage?.senderId === user?.id && (
                <button
                  type="button"
                  onClick={() => handleConfirmDelete('everyone')}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors focus:outline-none"
                >
                  Delete for everyone
                </button>
              )}
              <button
                type="button"
                onClick={() => handleConfirmDelete('forMe')}
                className="w-full py-2.5 px-4 rounded-xl bg-wa-light-input dark:bg-wa-dark-input hover:bg-wa-light-hover dark:hover:bg-wa-dark-hover text-wa-light-text-primary dark:text-wa-dark-text-primary font-medium text-sm transition-colors focus:outline-none"
              >
                Delete for me
              </button>
              <button
                type="button"
                onClick={() => setDeletingMessage(null)}
                className="w-full py-2 px-4 rounded-xl text-wa-light-text-muted dark:text-wa-dark-text-muted hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary text-sm focus:outline-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>

        {children}
      </main>

      {/* Pinned Group Info Drawer */}
      {isGroupInfoOpen && activeChat.isGroup && (
        <GroupInfoDrawer
          isOpen={isGroupInfoOpen}
          groupId={activeChat.id}
          onClose={() => setIsGroupInfoOpen(false)}
          onExitGroup={onBack}
        />
      )}

      {/* Pinned In-Chat Search Drawer */}
      {isSearchOpen && (
        <InChatSearchDrawer
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          query={inChatSearch.query}
          onQueryChange={inChatSearch.setQuery}
          currentMatchNumber={inChatSearch.currentMatchNumber}
          totalMatches={inChatSearch.totalMatches}
          onNextMatch={inChatSearch.nextMatch}
          onPrevMatch={inChatSearch.prevMatch}
        />
      )}
    </div>
  );
}
