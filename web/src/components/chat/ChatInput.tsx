'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Send, Mic } from 'lucide-react';
import AttachmentMenu from './AttachmentMenu';
import AudioRecorder from './AudioRecorder';
import QuotedReplyPreview, { QuotedMessageData } from './QuotedReplyPreview';
import SlashCommandPopover from './SlashCommandPopover';
import CreatePollModal from '@/components/polls/CreatePollModal';
import FileUploadProgressBar from './FileUploadProgressBar';
import { validateDocumentFile } from '@/lib/fileValidation';
import { useAudioRecorder, RecordedAudioResult } from '@/hooks/useAudioRecorder';
import { AVAILABLE_COMMANDS } from '@/lib/slashCommandParser';
import { SlashCommandDefinition } from '@shared/types';
import { cn } from '@/lib/utils';

export interface ChatInputProps {
  chatId?: string;
  onSendMessage: (text: string) => void;
  onImageSelect?: (file: File) => void;
  onSendDocument?: (doc: { url: string; name: string; size: number; mime: string }) => void;
  onSendVoice?: (result: RecordedAudioResult) => void;
  onSelectLocation?: () => void;
  onCommandFeedback?: (feedback: string, isError?: boolean) => void;
  onTyping?: () => void;
  replyingToMessage?: QuotedMessageData | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function ChatInput({
  chatId,
  onSendMessage,
  onImageSelect,
  onSendVoice,
  onSelectLocation,
  onCommandFeedback,
  onTyping,
  replyingToMessage,
  onCancelReply,
  disabled = false,
  placeholder = 'Type a message',
  className,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [popoverSelectedIndex, setPopoverSelectedIndex] = useState(0);
  const [isPopoverDismissed, setIsPopoverDismissed] = useState(false);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadingDocName, setUploadingDocName] = useState('');

  // Check if current text is starting a slash command
  const isSlashCommand = text.startsWith('/') && !text.includes(' ') && !isPopoverDismissed;

  const filteredCommands = AVAILABLE_COMMANDS.filter((c) =>
    c.command.toLowerCase().includes(text.slice(1).toLowerCase())
  );

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

  const handleSelectCommand = (cmd: SlashCommandDefinition) => {
    setText(`${cmd.command} `);
    setIsPopoverDismissed(true);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    // Check if user is submitting a slash command
    if (trimmed.startsWith('/') && chatId) {
      setIsExecutingCommand(true);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      try {
        const res = await fetch('/api/commands/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, text: trimmed }),
        });
        const data = await res.json();
        if (res.ok) {
          onCommandFeedback?.(data.feedback || 'Command executed successfully', false);
        } else {
          onCommandFeedback?.(data.error || 'Failed to execute command', true);
        }
      } catch (err: any) {
        onCommandFeedback?.(err?.message || 'Error executing command', true);
      } finally {
        setIsExecutingCommand(false);
      }
      return;
    }

    onSendMessage(trimmed);
    setText('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isSlashCommand && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPopoverSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPopoverSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        handleSelectCommand(filteredCommands[popoverSelectedIndex % filteredCommands.length]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsPopoverDismissed(true);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    if (val.startsWith('/')) {
      setIsPopoverDismissed(false);
    }
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

  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateDocumentFile(file.size, file.name, file.type);
    if (!validation.isValid) {
      onCommandFeedback?.(validation.error || 'Invalid file', true);
      e.target.value = '';
      return;
    }

    try {
      setIsUploadingDoc(true);
      setUploadingDocName(file.name);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/uploads/document', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to upload document');
      }

      const data = await res.json();
      onSendDocument?.(data);
    } catch (err: any) {
      console.error('Document upload error:', err);
      onCommandFeedback?.(err.message || 'Upload failed', true);
    } finally {
      setIsUploadingDoc(false);
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

      {/* Document Uploading Progress Bar */}
      {isUploadingDoc && (
        <FileUploadProgressBar
          filename={uploadingDocName}
          progressPercent={70}
          onCancel={() => setIsUploadingDoc(false)}
        />
      )}

      <footer
        className={cn(
          'px-2.5 sm:px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] bg-wa-light-header dark:bg-wa-dark-header border-t border-wa-light-border dark:border-wa-dark-border flex items-end gap-1.5 sm:gap-2 transition-colors relative min-h-[58px]',
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

      {/* Hidden document file input */}
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.csv"
        onChange={handleDocFileChange}
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
          {/* Slash Command Autocomplete Popover */}
          {isSlashCommand && (
            <SlashCommandPopover
              query={text}
              selectedIndex={popoverSelectedIndex}
              onSelectCommand={handleSelectCommand}
              onClose={() => setIsPopoverDismissed(true)}
            />
          )}

          {/* Attachment Menu Popup */}
          <AttachmentMenu
            isOpen={isAttachmentOpen}
            onClose={() => setIsAttachmentOpen(false)}
            onSelectPhoto={() => fileInputRef.current?.click()}
            onSelectDocument={() => docInputRef.current?.click()}
            onSelectLocation={onSelectLocation}
            onSelectPoll={() => setIsCreatePollOpen(true)}
          />

          {/* Interactive Create Poll Modal */}
          {chatId && (
            <CreatePollModal
              isOpen={isCreatePollOpen}
              chatId={chatId}
              onClose={() => setIsCreatePollOpen(false)}
            />
          )}

          {/* Emoji Button */}
          <button
            type="button"
            disabled={disabled}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none flex-shrink-0 cursor-pointer"
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
              'w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer',
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
              className="w-full resize-none max-h-[120px] bg-wa-light-input dark:bg-wa-dark-input text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted dark:placeholder:text-wa-dark-text-muted text-[15px] sm:text-sm rounded-lg px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-wa-green transition-all overflow-y-auto leading-relaxed"
            />
          </div>

          {/* Send or Mic Button */}
          {text.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-wa-green text-white hover:bg-wa-green-dark transition-colors focus:outline-none shadow-xs flex-shrink-0 cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartMic}
              disabled={disabled}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none flex-shrink-0 cursor-pointer"
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
