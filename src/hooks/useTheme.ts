import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';

export function useTheme() {
  const theme = useChatStore((state) => state.settings.theme);
  const setTheme = useChatStore((state) => state.setTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, toggleTheme };
}
