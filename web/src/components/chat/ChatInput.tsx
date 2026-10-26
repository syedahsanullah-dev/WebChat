'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Send, Mic } from 'lucide-react';
import AttachmentMenu from './AttachmentMenu';
import AudioRecorder from './AudioRecorder';
import QuotedReplyPreview, { QuotedMessageData } from './QuotedReplyPreview';
import { useAudioRecorder, RecordedAudioResult } from '@/hooks/useAudioRecorder';
import { cn } from '@/lib/utils';

export interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onImageSelect?: (file: File) => void;
  onSendVoice?: (result: RecordedAudioResult) => void;
  onTyping?: () => void;
  replyingToMessage?: QuotedMessageData | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function ChatInput({
  onSendMessage,
  onImageSelect,
  onSendVoice,
  onTyping,
  replyingToMessage,
  onCancelReply,
  disabled = false,
  placeholder = 'Type a message',
  className,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isRecording,
    isLocked,
    recordingTime,
    liveVolume,
    startRecording,
    lockRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  // Auto-resize textarea height up to 120px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
    setText('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping?.();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect?.(file);
      // Reset input value so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const handleStartMic = async () => {
    if (disabled) return;
    try {
      await startRecording();
    } catch (err) {
      console.error('[ChatInput] Microphone permission denied or failed:', err);
      alert('Microphone access is required to record voice messages.');
    }
  };

  const handleSendVoice = async () => {
    setIsProcessingAudio(true);
    try {
      const result = await stopRecording();
      onSendVoice?.(result);
    } catch (err) {
      console.error('[ChatInput] Failed to finalize audio recording:', err);
    } finally {
      setIsProcessingAudio(false);
    }
  };

  return (
    <div className="flex flex-col w-full z-10">
      {/* Quoted Message Reply Banner */}
      <QuotedReplyPreview
        replyMessage={replyingToMessage || null}
        onCancel={() => onCancelReply?.()}
      />

      <footer
        className={cn(
          'px-4 py-2 bg-wa-light-header dark:bg-wa-dark-header border-t border-wa-light-border dark:border-wa-dark-border flex items-end gap-2 transition-colors relative min-h-[58px]',
          className
        )}
      >
      {/* Hidden image file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {isRecording ? (
        /* Active Audio Recorder Bar */
        <AudioRecorder
          isRecording={isRecording}
          isLocked={isLocked}
          recordingTime={recordingTime}
          liveVolume={liveVolume}
          isProcessing={isProcessingAudio}
          onCancel={cancelRecording}
          onLock={lockRecording}
          onSend={handleSendVoice}
        />
      ) : (
        <>
          {/* Attachment Menu Popup */}
          <AttachmentMenu
            isOpen={isAttachmentOpen}
            onClose={() => setIsAttachmentOpen(false)}
            onSelectPhoto={() => fileInputRef.current?.click()}
          />

          {/* Emoji Button */}
          <button
            type="button"
            disabled={disabled}
            className="p-2 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none flex-shrink-0"
            aria-label="Add emoji"
            title="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Attachment Button */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsAttachmentOpen((prev) => !prev)}
            className={cn(
              'p-2 rounded-full transition-colors focus:outline-none flex-shrink-0',
              isAttachmentOpen
                ? 'text-wa-green bg-wa-green/10'
                : 'text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5'
            )}
            aria-label="Attach file"
            title="Attach"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Message Textarea */}
          <div className="flex-1 min-h-[38px] flex items-center">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full resize-none max-h-[120px] bg-wa-light-input dark:bg-wa-dark-input text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted dark:placeholder:text-wa-dark-text-muted text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-wa-green transition-all overflow-y-auto"
            />
          </div>

          {/* Send or Mic Button */}
          {text.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled}
              className="p-2 rounded-full bg-wa-green text-white hover:bg-wa-green-dark transition-colors focus:outline-none shadow-xs flex-shrink-0"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartMic}
              disabled={disabled}
              className="p-2 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none flex-shrink-0"
              aria-label="Voice note"
              title="Voice message"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </>
      )}
    </footer>
    </div>
  );
}
