'use client';

import React, { createContext, useContext, useState } from 'react';

interface ChatContextType {
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
}

const ChatContext = createContext<ChatContextType>({
  activeChatId: null,
  setActiveChatId: () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  return (
    <ChatContext.Provider value={{ activeChatId, setActiveChatId }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  return useContext(ChatContext);
}
