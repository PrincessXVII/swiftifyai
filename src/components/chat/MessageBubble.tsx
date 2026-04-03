import { Copy } from 'lucide-react';
import { lazy, Suspense, useCallback, useState } from 'react';
import type { Message } from '../../types';
import { AssistantSkeleton } from './AssistantSkeleton';

const MarkdownRenderer = lazy(() =>
  import('./MarkdownRenderer').then((m) => ({ default: m.MarkdownRenderer })),
);

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const showSkeleton =
    message.role === 'assistant' && Boolean(message.isStreaming) && !message.content.trim();
  const [copyLabel, setCopyLabel] = useState<'idle' | 'done' | 'err'>('idle');

  const copyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopyLabel('done');
      window.setTimeout(() => setCopyLabel('idle'), 1600);
    } catch {
      setCopyLabel('err');
      window.setTimeout(() => setCopyLabel('idle'), 2200);
    }
  }, [message.content]);

  return (
    <div className={`message-row ${message.role}`}>
      <div className="message-bubble-block">
        <div
          className={`message-bubble ${message.isStreaming && !showSkeleton ? 'streaming' : ''} ${
            showSkeleton ? 'message-bubble--skeleton' : ''
          }`}
        >
          {showSkeleton ? (
            <AssistantSkeleton />
          ) : (
            <>
              <Suspense
                fallback={
                  <div className="markdown-deferred-fallback">{message.content}</div>
                }
              >
                <MarkdownRenderer content={message.content} />
              </Suspense>
              <span className="timestamp">
                {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </>
          )}
        </div>
        {!showSkeleton ? (
          <div className="message-copy-row">
            <button
              type="button"
              className="message-copy-btn"
              onClick={() => void copyText()}
              aria-label="Скопировать текст сообщения"
            >
              <Copy className="message-copy-btn__icon" aria-hidden size={15} strokeWidth={2} />
              <span className="message-copy-btn__label">
                {copyLabel === 'done' ? 'Скопировано' : copyLabel === 'err' ? 'Не удалось скопировать' : 'Скопировать'}
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
