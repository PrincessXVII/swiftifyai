import { useEffect } from 'react';
import { WelcomeAuthPanel, consumeOAuthLoginIntent } from '../auth/WelcomeAuthPanel';
import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { ChatSummaryBar } from './ChatSummaryBar';
import { EmptyState } from './EmptyState';
import { MessageInput } from './MessageInput';
import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';
import { Toast } from '../ui/Toast';

interface Props {
  isStarted: boolean;
  onStart: () => void;
}

export function ChatWindow({ isStarted, onStart }: Props) {
  const { messages, isLoading, error, sendMessage, clearError } = useChat();
  const { user, loading: authLoading, isConfigured, signOut } = useAuth();

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
              <h1>Swiftify - место знаний</h1>
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
          <ChatSummaryBar messages={messages} isLoading={isLoading} />
          <div className="chat-scroll">
            {messages.length === 0 ? (
              <EmptyState
                onPickPrompt={(prompt) => {
                  void sendMessage(prompt);
                }}
              />
            ) : (
              <MessageList messages={messages} />
            )}
          </div>
          <div className="chat-input-footer">
            {isLoading && <TypingIndicator />}
            <MessageInput
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
}
