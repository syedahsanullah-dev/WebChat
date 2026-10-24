'use client';

import React, { useState, useRef, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Avatar from '@/components/ui/Avatar';
import DropdownMenu, { DropdownMenuItem } from '@/components/ui/DropdownMenu';
import Modal from '@/components/ui/Modal';
import { MOCK_CHATS } from '@/components/layout/Sidebar';
import { playSentSound, startRingtone } from '@/lib/audio';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Phone,
  Search,
  Paperclip,
  Smile,
  Send,
  Mic,
  Lock,
  Laptop,
  CheckCheck,
  PhoneOff,
  PhoneCall,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
}

export interface ChatAreaProps {
  activeChatId?: string | null;
  onBack: () => void;
  children?: React.ReactNode;
}

export default function ChatArea({
  activeChatId,
  onBack,
  children,
}: ChatAreaProps) {
  const [inputText, setInputText] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({
    'chat-1': [
      { id: 'm1', sender: 'them', text: 'Hey there! How is the WebChat architecture going?', time: '12:40 PM' },
      { id: 'm2', sender: 'me', text: 'Dual-server setup is complete. Next.js handles SSR and Fastify handles native WebSockets!', time: '12:42 PM' },
      { id: 'm3', sender: 'them', text: 'Let us coordinate the server deployment tonight.', time: '12:45 PM' },
    ],
    'chat-2': [
      { id: 'm4', sender: 'them', text: 'The Fastify WebSocket daemon runs smoothly at 28MB RAM!', time: '11:20 AM' },
    ],
  });

  const stopRingtoneRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = MOCK_CHATS.find((c) => c.id === activeChatId) || null;
  const currentMessages = activeChatId ? messages[activeChatId] || [] : [];

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, activeChatId]);

  // Clean up ringtone on unmount or when call ends
  useEffect(() => {
    return () => {
      if (stopRingtoneRef.current) {
        stopRingtoneRef.current();
        stopRingtoneRef.current = null;
      }
    };
  }, []);

  const handleStartCall = () => {
    setIsCalling(true);
    setCallStatus('ringing');
    stopRingtoneRef.current = startRingtone();
  };

  const handleEndCall = () => {
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }
    setCallStatus('ended');
    setTimeout(() => {
      setIsCalling(false);
    }, 600);
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeChatId) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'me',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMessage],
    }));

    setInputText('');
    playSentSound();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const menuItems: DropdownMenuItem[] = [
    {
      id: 'contact-info',
      label: 'Contact info',
      onClick: () => {},
    },
    {
      id: 'clear-messages',
      label: 'Clear messages',
      onClick: () => {
        if (activeChatId) {
          setMessages((prev) => ({ ...prev, [activeChatId]: [] }));
        }
      },
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
    <main className="h-full w-full flex flex-col bg-wa-light-bg dark:bg-wa-dark-bg overflow-hidden relative transition-colors">
      {/* Top Header */}
      <Header
        leftContent={
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Back Button (<-) */}
            <button
              type="button"
              onClick={onBack}
              className="inline-flex md:hidden p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-wa-light-text-secondary dark:text-wa-dark-text-secondary focus:outline-none"
              aria-label="Back to conversations list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <Avatar
              name={activeChat.name}
              src={activeChat.avatar}
              size="md"
              isOnline={activeChat.isOnline}
            />

            <div className="min-w-0">
              <h2 className="font-medium text-sm text-wa-light-text-primary dark:text-wa-dark-text-primary truncate">
                {activeChat.name}
              </h2>
              <p className="text-xs text-wa-green truncate font-normal">
                {activeChat.isOnline ? 'online' : 'offline'}
              </p>
            </div>
          </div>
        }
        rightContent={
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Audio Call Button */}
            <button
              type="button"
              onClick={handleStartCall}
              className="p-2 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
              aria-label="Start voice call"
              title="Voice call (WebRTC audio-only)"
            >
              <Phone className="w-5 h-5" />
            </button>

            {/* Search Button */}
            <button
              type="button"
              className="p-2 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
              aria-label="Search within conversation"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Menu */}
            <DropdownMenu items={menuItems} align="right" />
          </div>
        }
      />

      {/* Messages Scroll Area with WhatsApp Doodle Wallpaper */}
      <div className="flex-1 wa-chat-bg overflow-y-auto p-4 sm:p-6 space-y-3 z-0">
        {/* Encryption Banner */}
        <div className="flex justify-center my-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-wa-light-header/90 dark:bg-wa-dark-header/90 text-[11px] text-wa-light-text-secondary dark:text-wa-dark-text-secondary shadow-xs text-center max-w-sm">
            <Lock className="w-3 h-3 text-wa-green flex-shrink-0" />
            <span>Messages are end-to-end encrypted. No third parties can read them.</span>
          </div>
        </div>

        {/* Message bubbles */}
        {currentMessages.map((msg) => {
          const isMe = msg.sender === 'me';
          return (
            <div
              key={msg.id}
              className={cn('flex w-full', isMe ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] sm:max-w-[70%] px-3 py-1.5 rounded-lg shadow-xs text-sm relative break-words',
                  isMe
                    ? 'bg-wa-light-sent dark:bg-wa-dark-sent text-wa-light-text-primary dark:text-wa-dark-text-primary rounded-tr-none'
                    : 'bg-wa-light-received dark:bg-wa-dark-received text-wa-light-text-primary dark:text-wa-dark-text-primary rounded-tl-none'
                )}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-wa-light-text-muted dark:text-wa-dark-text-muted float-right ml-2 -mb-0.5">
                  <span>{msg.time}</span>
                  {isMe && <CheckCheck className="w-3.5 h-3.5 text-wa-blue-tick" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Message Input Bar */}
      <footer className="px-4 py-2 bg-wa-light-header dark:bg-wa-dark-header border-t border-wa-light-border dark:border-wa-dark-border flex items-center gap-2 z-10">
        <button
          type="button"
          className="p-2 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
          aria-label="Add emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        <button
          type="button"
          className="p-2 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
          aria-label="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          className="flex-1 bg-wa-light-input dark:bg-wa-dark-input text-wa-light-text-primary dark:text-wa-dark-text-primary placeholder:text-wa-light-text-muted dark:placeholder:text-wa-dark-text-muted text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-wa-green transition-all"
        />

        {inputText.trim() ? (
          <button
            type="button"
            onClick={handleSendMessage}
            className="p-2 rounded-full bg-wa-green text-white hover:bg-wa-green-dark transition-colors focus:outline-none shadow-xs"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            className="p-2 rounded-full text-wa-light-text-secondary dark:text-wa-dark-text-secondary hover:text-wa-light-text-primary dark:hover:text-wa-dark-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
            aria-label="Voice message"
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </footer>

      {/* WebRTC Audio Call Modal */}
      <Modal
        isOpen={isCalling}
        onClose={handleEndCall}
        title="WebChat Voice Call"
        maxWidth="sm"
        showCloseButton={false}
      >
        <div className="flex flex-col items-center text-center space-y-6 py-4">
          <div className="relative">
            <Avatar name={activeChat.name} src={activeChat.avatar} size="xl" isOnline={true} />
            <div className="absolute -bottom-1 -right-1 p-2 bg-wa-green text-white rounded-full ring-4 ring-wa-light-sidebar dark:ring-wa-dark-sidebar animate-pulse">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-xl text-wa-light-text-primary dark:text-wa-dark-text-primary">
              {activeChat.name}
            </h3>
            <p className="text-sm text-wa-light-text-secondary dark:text-wa-dark-text-secondary mt-1">
              {callStatus === 'ringing'
                ? 'Ringing... (Opus 32kbps)'
                : callStatus === 'connected'
                ? '00:15 Connected'
                : 'Call Ended'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={handleEndCall}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-transform hover:scale-105 focus:outline-none"
              aria-label="End call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      </Modal>

      {children}
    </main>
  );
}
