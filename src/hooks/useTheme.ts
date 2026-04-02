import { useChatStore } from '../store/chatStore';

/** Синхронизация класса `dark` на `<html>` — в `AppLayout` через `useEffect` по `settings.theme`. */
export function useTheme() {
  const theme = useChatStore((state) => state.settings.theme);
  const setTheme = useChatStore((state) => state.setTheme);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, toggleTheme };
}
