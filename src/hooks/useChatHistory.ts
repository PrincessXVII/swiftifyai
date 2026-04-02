import { useMemo } from 'react';
import type { Chat } from '../types';
import { useChatStore } from '../store/chatStore';

export function useChatHistory() {
  const chats = useChatStore((state) => state.chats);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const createChatStore = useChatStore((state) => state.createChat);
  const setActiveChatId = useChatStore((state) => state.setActiveChatId);
  const deleteChatStore = useChatStore((state) => state.deleteChat);
  const togglePinChatStore = useChatStore((state) => state.togglePinChat);
  const updateChatStore = useChatStore((state) => state.updateChat);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats],
  );

  const createChat = (modelId: string) => createChatStore(modelId);

  const loadChat = (chatId: string) => setActiveChatId(chatId);

  const updateChat = (chatId: string, updates: Partial<Chat>) =>
    updateChatStore(chatId, updates);

  const deleteChat = (chatId: string) => deleteChatStore(chatId);

  const togglePinChat = (chatId: string) => togglePinChatStore(chatId);

  return {
    chats,
    activeChatId,
    activeChat,
    createChat,
    loadChat,
    updateChat,
    deleteChat,
    togglePinChat,
  };
}
