import { lazy, Suspense } from 'react';
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
      </div>
    </div>
  );
}
