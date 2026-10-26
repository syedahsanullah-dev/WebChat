'use client';

import { useState, useMemo, useCallback } from 'react';

export interface SearchableMessage {
  id: string;
  content: string;
  messageType?: string;
}

export function useInChatSearch(messages: SearchableMessage[]) {
  const [query, setQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const trimmedQuery = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!trimmedQuery) return [];
    const results: { id: string; index: number }[] = [];
    messages.forEach((msg, idx) => {
      if (msg.content && msg.content.toLowerCase().includes(trimmedQuery)) {
        results.push({ id: msg.id, index: idx });
      }
    });
    return results;
  }, [messages, trimmedQuery]);

  const scrollToMatch = useCallback(
    (targetId: string) => {
      if (typeof window === 'undefined') return;
      const el = document.getElementById(`msg-${targetId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('wa-search-highlight-flash');
        setTimeout(() => {
          el.classList.remove('wa-search-highlight-flash');
        }, 1200);
      }
    },
    []
  );

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return;
    const nextIdx = (activeMatchIndex + 1) % matches.length;
    setActiveMatchIndex(nextIdx);
    scrollToMatch(matches[nextIdx].id);
  }, [matches, activeMatchIndex, scrollToMatch]);

  const prevMatch = useCallback(() => {
    if (matches.length === 0) return;
    const prevIdx = (activeMatchIndex - 1 + matches.length) % matches.length;
    setActiveMatchIndex(prevIdx);
    scrollToMatch(matches[prevIdx].id);
  }, [matches, activeMatchIndex, scrollToMatch]);

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      setActiveMatchIndex(0);
      const lower = newQuery.trim().toLowerCase();
      if (lower) {
        const first = messages.find((m) => m.content && m.content.toLowerCase().includes(lower));
        if (first) {
          scrollToMatch(first.id);
        }
      }
    },
    [messages, scrollToMatch]
  );

  return {
    query,
    setQuery: handleQueryChange,
    matches,
    activeMatchIndex,
    totalMatches: matches.length,
    currentMatchNumber: matches.length > 0 ? activeMatchIndex + 1 : 0,
    nextMatch,
    prevMatch,
    clearSearch: () => setQuery(''),
  };
}
