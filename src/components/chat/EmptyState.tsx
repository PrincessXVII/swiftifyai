import { useChatStore } from '../../store/chatStore';
import { SwiftifyLogoMark } from '../ui/SwiftifyLogoMark';

export function EmptyState() {
  const theme = useChatStore((s) => s.settings.theme);
  return (
    <div className="empty-state">
      <SwiftifyLogoMark
        className="empty-state__logo"
        size={44}
        tone={theme === 'dark' ? 'dark' : 'light'}
      />
      <h2 className="empty-state__title">SwiftifyAI</h2>
      <div className="empty-state__intro">
        <p>
          Умный ассистент в одном чате: планы и задачи, письма и тексты, конспекты и разбор вопросов — без
          переключения между сервисами.
        </p>
        <p>
          Напишите запрос в поле ниже. <kbd className="empty-state__kbd">Enter</kbd> — отправить,{' '}
          <kbd className="empty-state__kbd">Shift</kbd>+<kbd className="empty-state__kbd">Enter</kbd> — новая
          строка.
        </p>
        <p className="empty-state__shortcuts">
          <kbd className="empty-state__kbd">Ctrl/⌘+K</kbd> — поле ввода ·{' '}
          <kbd className="empty-state__kbd">Ctrl/⌘+Alt+N</kbd> — новый чат ·{' '}
          <kbd className="empty-state__kbd">Ctrl/⌘+Shift+M</kbd> — тема · <kbd className="empty-state__kbd">/</kbd> — поле
          (вне ввода) · <kbd className="empty-state__kbd">Esc</kbd> — закрыть панели
        </p>
      </div>
    </div>
  );
}
