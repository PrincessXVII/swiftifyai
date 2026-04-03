import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { useChatStore } from '../store/chatStore';
import { isEditableElement } from '../utils/keyboard';

type Options = {
  isStarted: boolean;
  accountOpen: boolean;
  isSidebarOpen: boolean;
  setAccountOpen: (open: boolean) => void;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
  chatWindowRef: RefObject<{ focusComposer: () => void } | null>;
};

/**
 * Горячие клавиши (веб: где возможно, перехватываем конфликт с браузером через preventDefault):
 * — Ctrl/⌘+Shift+M: светлая/тёмная тема
 * — Ctrl/⌘+Alt+N: новый чат (после «Начать»)
 * — Ctrl/⌘+K: фокус в поле сообщения
 * — / : фокус в поле (если фокус не в поле ввода)
 * — Escape: закрыть личный кабинет или мобильный сайдбар
 * — Ctrl/⌘+\ : открыть/закрыть сайдбар (только узкая вёрстка)
 */
export function useAppHotkeys({
  isStarted,
  accountOpen,
  isSidebarOpen,
  setAccountOpen,
  setIsSidebarOpen,
  chatWindowRef,
}: Options) {
  const createChat = useChatStore((s) => s.createChat);
  const selectedModelId = useChatStore((s) => s.settings.selectedModelId);
  const setTheme = useChatStore((s) => s.setTheme);

  useEffect(() => {
    const focusComposer = () => {
      chatWindowRef.current?.focusComposer();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      if (isMobile) return;

      const mod = e.metaKey || e.ctrlKey;
      const alt = e.altKey;
      const key = e.key;
      const lower = key.length === 1 ? key.toLowerCase() : key;

      // Тема: Ctrl/⌘ + Shift + M
      if (mod && e.shiftKey && lower === 'm' && !alt) {
        e.preventDefault();
        const t = useChatStore.getState().settings.theme;
        setTheme(t === 'dark' ? 'light' : 'dark');
        return;
      }

      if (!isStarted) return;

      if (key === 'Escape') {
        if (accountOpen) {
          e.preventDefault();
          setAccountOpen(false);
          return;
        }
        if (isSidebarOpen) {
          e.preventDefault();
          setIsSidebarOpen(false);
        }
        return;
      }

      // Новый чат: Ctrl/⌘ + Alt + N
      if (mod && alt && lower === 'n' && !e.shiftKey) {
        e.preventDefault();
        if (accountOpen) setAccountOpen(false);
        setIsSidebarOpen(false);
        createChat(selectedModelId);
        requestAnimationFrame(() => focusComposer());
        return;
      }

      // Фокус в поле: Ctrl/⌘ + K
      if (mod && lower === 'k' && !e.shiftKey && !alt) {
        e.preventDefault();
        if (accountOpen) setAccountOpen(false);
        requestAnimationFrame(() => focusComposer());
        return;
      }

      // Слэш — фокус в поле, если не в инпуте
      if (key === '/' && !mod && !alt && !e.shiftKey) {
        if (isEditableElement(e.target)) return;
        e.preventDefault();
        if (accountOpen) setAccountOpen(false);
        requestAnimationFrame(() => focusComposer());
        return;
      }

      // Сайдбар (мобильная вёрстка): Ctrl/⌘ + \
      if (mod && (key === '\\' || key === 'IntlBackslash')) {
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
          e.preventDefault();
          setIsSidebarOpen((open) => !open);
        }
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isStarted,
    accountOpen,
    isSidebarOpen,
    createChat,
    selectedModelId,
    setTheme,
    setAccountOpen,
    setIsSidebarOpen,
    chatWindowRef,
  ]);
}
