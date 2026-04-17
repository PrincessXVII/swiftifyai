import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { pickRandomWelcomeQuote } from '../../constants/welcomeQuotes';
import { WelcomeAuthPanel, consumeOAuthLoginIntent } from '../auth/WelcomeAuthPanel';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { useChatStore } from '../../store/chatStore';
import { SwiftifyLogoMark } from '../ui/SwiftifyLogoMark';
import { hasSwiftifyPlus } from '../../lib/userProfile';
import { ChatSummaryBar } from './ChatSummaryBar';
import { PlusUpgradeBanner } from './PlusUpgradeBanner';
import { EmptyState } from './EmptyState';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';
import { Toast } from '../ui/Toast';

interface Props {
  isStarted: boolean;
  onStart: () => void;
  /** Если нет VITE_PLUS_UPGRADE_URL — открыть ЛК (подписка). */
  onRequestPlus?: () => void;
}

export type ChatWindowHandle = {
  focusComposer: () => void;
};

export const ChatWindow = forwardRef<ChatWindowHandle, Props>(function ChatWindow(
  { isStarted, onStart, onRequestPlus },
  ref,
) {
  const { messages, isLoading, error, sendMessage, clearError } = useChat();
  const { user, loading: authLoading, isConfigured, signOut } = useAuth();
  const theme = useChatStore((s) => s.settings.theme);
  const composerRef = useRef<HTMLInputElement | null>(null);
  const [welcomeHeadline, setWelcomeHeadline] = useState(() => pickRandomWelcomeQuote());
  const hadStartedChatRef = useRef(false);

  useEffect(() => {
    if (isStarted) {
      hadStartedChatRef.current = true;
      return;
    }
    if (hadStartedChatRef.current) {
      setWelcomeHeadline(pickRandomWelcomeQuote());
      hadStartedChatRef.current = false;
    }
  }, [isStarted]);

  const showSkeletonInThread = messages.some(
    (m) => m.role === 'assistant' && m.isStreaming && !m.content.trim(),
  );

  useImperativeHandle(
    ref,
    () => ({
      focusComposer: () => {
        composerRef.current?.focus();
      },
    }),
    [],
  );

  useEffect(() => {
    if (!isConfigured || authLoading || !user) return;
    if (consumeOAuthLoginIntent()) {
      onStart();
    }
  }, [isConfigured, authLoading, user, onStart]);

  return (
    <section className="chat-window">
      {!isStarted ? (
        <div className="chat-scroll chat-scroll--welcome">
          <div className="welcome-layout">
            <div className="welcome-screen welcome-screen--with-auth welcome-screen--stacked">
              <div className="welcome-screen__brand" aria-hidden>
                <SwiftifyLogoMark size={56} tone={theme === 'dark' ? 'dark' : 'light'} />
              </div>
              <div className="welcome-screen__headline-wrap">
                <h1 className="welcome-screen__headline">{welcomeHeadline}</h1>
              </div>
              {authLoading ? (
                <p className="welcome-auth__loading">Загрузка…</p>
              ) : !isConfigured || user ? (
                <div className="welcome-actions">
                  <button type="button" className="welcome-start-button" onClick={onStart}>
                    Начать
                  </button>
                </div>
              ) : (
                <WelcomeAuthPanel onAuthenticated={onStart} />
              )}
            </div>
            {isConfigured && user && !authLoading ? (
              <div className="welcome-screen__signout-wrap">
                <button type="button" className="welcome-sign-out" onClick={() => void signOut()}>
                  Выйти из аккаунта
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="chat-window-topbar">
            <div className="chat-window-topbar__cell chat-window-topbar__cell--left" aria-hidden />
            <div className="chat-window-topbar__cell chat-window-topbar__cell--center">
              {user && !authLoading && !hasSwiftifyPlus(user) ? (
                <PlusUpgradeBanner
                  onClick={() => {
                    const url = import.meta.env.VITE_PLUS_UPGRADE_URL?.trim();
                    if (url) window.open(url, '_blank', 'noopener,noreferrer');
                    else onRequestPlus?.();
                  }}
                />
              ) : null}
            </div>
            <div className="chat-window-topbar__cell chat-window-topbar__cell--right">
              <ChatSummaryBar messages={messages} isLoading={isLoading} />
            </div>
          </div>
          <div className="chat-scroll">
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              <MessageList messages={messages} />
            )}
          </div>
          <div className="chat-input-footer">
            {isLoading && !showSkeletonInThread && <TypingIndicator />}
            <MessageInput
              ref={composerRef}
              isLoading={isLoading}
              onSubmit={async (value) => {
                await sendMessage(value);
              }}
            />
          </div>
        </>
      )}
      {error && <Toast type="error" message={error} onClose={clearError} />}
    </section>
  );
});
