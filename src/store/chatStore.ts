import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { AI_MODELS } from '../constants/models';
import type { AppSettings, Chat, Message, Theme } from '../types';
import { generateTitle } from '../utils/generateTitle';
import { sortChatsForDisplay } from '../utils/sortChats';

/** Префикс v1; суффикс — id пользователя Supabase или `guest`. */
const STORAGE_PREFIX = 'swiftify_v1';

const LEGACY_CHATS_KEY = 'ai_aggregator_chats';
const LEGACY_SETTINGS_KEY = 'ai_aggregator_settings';
const LEGACY_THEME_KEY = 'ai_aggregator_theme';

export function chatsStorageKey(userId: string | null): string {
  return `${STORAGE_PREFIX}_chats__${userId ?? 'guest'}`;
}

export function settingsStorageKey(userId: string | null): string {
  return `${STORAGE_PREFIX}_settings__${userId ?? 'guest'}`;
}

type ChatStore = {
  chats: Chat[];
  activeChatId: string | null;
  settings: AppSettings;
  createChat: (modelId?: string) => Chat;
  setActiveChatId: (chatId: string) => void;
  setSelectedModelId: (modelId: string) => void;
  updateChat: (chatId: string, updates: Partial<Chat>) => void;
  upsertMessage: (chatId: string, message: Message) => void;
  replaceMessageContent: (chatId: string, messageId: string, content: string) => void;
  finishStreamingMessage: (chatId: string, messageId: string) => void;
  deleteChat: (chatId: string) => void;
  togglePinChat: (chatId: string) => void;
  setTheme: (theme: Theme) => void;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function defaultTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function defaultSettings(): AppSettings {
  return { theme: defaultTheme(), selectedModelId: AI_MODELS[0].id };
}

/** `undefined` — регидрация ещё не выполнялась, в localStorage не пишем. */
let activeStorageUserId: string | null | undefined;
let persistenceReady = false;

function persistChats(chats: Chat[]): void {
  if (!persistenceReady || activeStorageUserId === undefined) return;
  localStorage.setItem(chatsStorageKey(activeStorageUserId), JSON.stringify(chats));
}

function persistSettings(settings: AppSettings): void {
  if (!persistenceReady || activeStorageUserId === undefined) return;
  localStorage.setItem(settingsStorageKey(activeStorageUserId), JSON.stringify(settings));
}

function persistAllSnapshot(state: { chats: Chat[]; settings: AppSettings }): void {
  if (activeStorageUserId === undefined) return;
  localStorage.setItem(chatsStorageKey(activeStorageUserId), JSON.stringify(state.chats));
  localStorage.setItem(settingsStorageKey(activeStorageUserId), JSON.stringify(state.settings));
}

function migrateLegacyIntoUserNamespace(userId: string | null): void {
  const ck = chatsStorageKey(userId);
  const sk = settingsStorageKey(userId);
  if (!localStorage.getItem(ck) && localStorage.getItem(LEGACY_CHATS_KEY)) {
    localStorage.setItem(ck, localStorage.getItem(LEGACY_CHATS_KEY)!);
    localStorage.removeItem(LEGACY_CHATS_KEY);
  }
  if (!localStorage.getItem(sk) && localStorage.getItem(LEGACY_SETTINGS_KEY)) {
    localStorage.setItem(sk, localStorage.getItem(LEGACY_SETTINGS_KEY)!);
    localStorage.removeItem(LEGACY_SETTINGS_KEY);
  }
}

function loadSettings(userId: string | null): AppSettings {
  const base = defaultSettings();
  migrateLegacyIntoUserNamespace(userId);
  const sk = settingsStorageKey(userId);
  const raw = localStorage.getItem(sk);
  let settings = safeParse<AppSettings>(raw, base);
  const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
  if (legacyTheme === 'light' || legacyTheme === 'dark') {
    settings = { ...settings, theme: legacyTheme };
    localStorage.removeItem(LEGACY_THEME_KEY);
    localStorage.setItem(sk, JSON.stringify(settings));
  }
  return settings;
}

function loadChats(userId: string | null): Chat[] {
  migrateLegacyIntoUserNamespace(userId);
  const raw = localStorage.getItem(chatsStorageKey(userId));
  return safeParse<Chat[]>(raw, []);
}

function createEmptyChat(modelId: string): Chat {
  const now = Date.now();
  return {
    id: uuid(),
    title: 'Новый чат',
    modelId,
    messages: [],
    createdAt: now,
    updatedAt: now,
    pinned: false,
  };
}

let lastRehydratedKey: string | null = null;

/**
 * Загружает чаты и настройки из localStorage для данного пользователя.
 * Вызывать после того, как известен результат auth (в т.ч. `guest` при отсутствии сессии).
 */
export function rehydrateChatStoreForUser(userId: string | null): void {
  const key = userId ?? 'guest';
  if (lastRehydratedKey === key) return;

  const prev = activeStorageUserId;
  if (persistenceReady && prev !== undefined) {
    const s = useChatStore.getState();
    persistAllSnapshot(s);
  }

  activeStorageUserId = userId;
  persistenceReady = true;

  const settings = loadSettings(userId);
  let chats = sortChatsForDisplay(loadChats(userId));
  const firstChat = chats[0] ?? createEmptyChat(settings.selectedModelId);
  if (chats.length === 0) {
    chats = [firstChat];
    localStorage.setItem(chatsStorageKey(userId), JSON.stringify(chats));
  }

  useChatStore.setState({
    chats,
    activeChatId: firstChat.id,
    settings,
  });

  lastRehydratedKey = key;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  activeChatId: null,
  settings: defaultSettings(),
  createChat: (modelId) => {
    const selected = modelId ?? get().settings.selectedModelId;
    const chat = createEmptyChat(selected);
    set((state) => {
      const next = sortChatsForDisplay([chat, ...state.chats]);
      persistChats(next);
      return { chats: next, activeChatId: chat.id };
    });
    return chat;
  },
  togglePinChat: (chatId) =>
    set((state) => {
      const chats = sortChatsForDisplay(
        state.chats.map((chat) =>
          chat.id === chatId ? { ...chat, pinned: !chat.pinned, updatedAt: Date.now() } : chat,
        ),
      );
      persistChats(chats);
      return { chats };
    }),
  setActiveChatId: (chatId) => set({ activeChatId: chatId }),
  setSelectedModelId: (modelId) =>
    set((state) => {
      const settings = { ...state.settings, selectedModelId: modelId };
      persistSettings(settings);
      return { settings };
    }),
  updateChat: (chatId, updates) =>
    set((state) => {
      const chats = sortChatsForDisplay(
        state.chats.map((chat) =>
          chat.id === chatId ? { ...chat, ...updates, updatedAt: Date.now() } : chat,
        ),
      );
      persistChats(chats);
      return { chats };
    }),
  upsertMessage: (chatId, message) =>
    set((state) => {
      const chats = state.chats.map((chat) => {
        if (chat.id !== chatId) return chat;
        const messages = [...chat.messages, message];
        const title =
          chat.messages.length === 0 && message.role === 'user'
            ? generateTitle(message.content)
            : chat.title;
        return { ...chat, messages, title, updatedAt: Date.now() };
      });
      const sorted = sortChatsForDisplay(chats);
      persistChats(sorted);
      return { chats: sorted };
    }),
  replaceMessageContent: (chatId, messageId, content) =>
    set((state) => {
      const chats = sortChatsForDisplay(
        state.chats.map((chat) => {
          if (chat.id !== chatId) return chat;
          return {
            ...chat,
            updatedAt: Date.now(),
            messages: chat.messages.map((message) =>
              message.id === messageId ? { ...message, content } : message,
            ),
          };
        }),
      );
      persistChats(chats);
      return { chats };
    }),
  finishStreamingMessage: (chatId, messageId) =>
    set((state) => {
      const chats = sortChatsForDisplay(
        state.chats.map((chat) => {
          if (chat.id !== chatId) return chat;
          return {
            ...chat,
            updatedAt: Date.now(),
            messages: chat.messages.map((message) =>
              message.id === messageId ? { ...message, isStreaming: false } : message,
            ),
          };
        }),
      );
      persistChats(chats);
      return { chats };
    }),
  deleteChat: (chatId) =>
    set((state) => {
      const chats = state.chats.filter((chat) => chat.id !== chatId);
      const activeChatId = state.activeChatId === chatId ? (chats[0]?.id ?? null) : state.activeChatId;
      persistChats(chats);
      return { chats, activeChatId };
    }),
  setTheme: (theme) =>
    set((state) => {
      const settings = { ...state.settings, theme };
      persistSettings(settings);
      return { settings };
    }),
}));
