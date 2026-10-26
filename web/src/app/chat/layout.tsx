'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import ChatArea from '@/components/layout/ChatArea';
import GlobalBroadcastBanner from '@/components/layout/GlobalBroadcastBanner';
import { ChatProvider } from '@/context/ChatContext';
import { cn } from '@/lib/utils';

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
      <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-wa-light-bg dark:bg-wa-dark-bg text-wa-light-text-primary dark:text-wa-dark-text-primary overscroll-y-contain relative select-none">
        <GlobalBroadcastBanner />
        <div className="flex flex-1 w-full overflow-hidden relative">
          {/* Left Sidebar Panel */}
        <div
          className={`h-full w-full md:w-[40%] md:min-w-[300px] md:max-w-[380px] lg:w-[33%] lg:min-w-[340px] lg:max-w-[450px] xl:w-[30%] xl:max-w-[500px] flex-shrink-0 transition-transform duration-300 ease-in-out md:translate-x-0 ${
            activeChatId
              ? '-translate-x-full absolute top-0 left-0 md:relative md:top-auto md:left-auto'
              : 'translate-x-0 relative'
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
          className={`h-full flex-1 min-w-0 min-h-0 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
            activeChatId
              ? 'translate-x-0 relative w-full'
              : 'translate-x-full absolute top-0 left-0 md:relative md:top-auto md:left-auto w-full'
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
      </div>
    </ChatProvider>
  );
}
