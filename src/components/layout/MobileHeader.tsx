import { ChevronLeft, Menu } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { SwiftifyLogoMark } from '../ui/SwiftifyLogoMark';

interface Props {
  onMenuClick: () => void;
  /** Режим личного кабинета: слева «назад», заголовок другой */
  accountMode?: boolean;
  onBackFromAccount?: () => void;
}

export function MobileHeader({ onMenuClick, accountMode, onBackFromAccount }: Props) {
  const theme = useChatStore((s) => s.settings.theme);
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
      <div className="mobile-header__brand">
        {!accountMode ? (
          <SwiftifyLogoMark size={26} tone={theme === 'dark' ? 'dark' : 'light'} />
        ) : null}
        <strong>{accountMode ? 'Личный кабинет' : 'SwiftifyAI'}</strong>
      </div>
      <span className="mobile-header__spacer" aria-hidden />
    </header>
  );
}
