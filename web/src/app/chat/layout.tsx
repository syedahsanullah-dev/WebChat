'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import ChatArea from '@/components/layout/ChatArea';
import { ChatProvider } from '@/context/ChatContext';

export default function ChatLayout({
  children,
  initialChats,
}: {
  children: React.ReactNode;
  initialChats?: any[];
}) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChatData, setActiveChatData] = useState<any | null>(null);

  const handleSelectChat = (id: string, chatData?: any) => {
    setActiveChatId(id);
    setActiveChatData(chatData || null);
  };

  const handleBack = () => {
    setActiveChatId(null);
    setActiveChatData(null);
  };

  return (
    <ChatProvider>
      <div className="flex h-[100dvh] w-full overflow-hidden bg-wa-light-bg dark:bg-wa-dark-bg text-wa-light-text-primary dark:text-wa-dark-text-primary overscroll-y-contain relative select-none">
        {/* Left Sidebar Panel */}
        <div
          className={`h-full w-full md:w-[35%] lg:w-[30%] min-w-[320px] max-w-[500px] flex-shrink-0 transition-transform duration-300 ease-in-out md:translate-x-0 ${
            activeChatId ? '-translate-x-full absolute md:relative' : 'translate-x-0 relative'
          }`}
        >
          <Sidebar
            onSelectChat={handleSelectChat}
            activeChatId={activeChatId}
            initialChats={initialChats}
          />
        </div>

        {/* Right Chat Area Panel */}
        <div
          className={`h-full flex-1 min-w-0 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
            activeChatId ? 'translate-x-0 relative w-full' : 'translate-x-full absolute md:relative w-full'
          }`}
        >
          <ChatArea
            activeChatId={activeChatId}
            activeChatData={activeChatData}
            onBack={handleBack}
          >
            {children}
          </ChatArea>
        </div>
      </div>
    </ChatProvider>
  );
}
