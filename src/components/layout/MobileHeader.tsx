import { ChevronLeft, Menu } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

interface Props {
  onMenuClick: () => void;
  /** Режим личного кабинета: слева «назад», заголовок другой */
  accountMode?: boolean;
  onBackFromAccount?: () => void;
}

export function MobileHeader({ onMenuClick, accountMode, onBackFromAccount }: Props) {
  return (
    <header className="mobile-header">
      {accountMode ? (
        <button
          type="button"
          className="icon-button"
          onClick={onBackFromAccount}
          aria-label="К чатам"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
      ) : (
        <button type="button" className="icon-button" onClick={onMenuClick} aria-label="Открыть меню">
          <Menu size={18} />
        </button>
      )}
      <strong>{accountMode ? 'Личный кабинет' : 'SwiftifyAI'}</strong>
      <ThemeToggle />
    </header>
  );
}
