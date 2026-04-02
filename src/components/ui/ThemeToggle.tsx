import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { IconButton } from './IconButton';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <IconButton
      onClick={toggleTheme}
      icon={theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      label="Переключить тему"
    />
  );
}
