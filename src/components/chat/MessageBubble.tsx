import { lazy, Suspense } from 'react';
import type { Message } from '../../types';
import { AssistantSkeleton } from './AssistantSkeleton';

const MarkdownRenderer = lazy(() =>
  import('./MarkdownRenderer').then((m) => ({ default: m.MarkdownRenderer })),
);

interface Props {
  message: Message;
}

const ATTACHMENT_MARKER_OPEN = '[SWIFTIFY_ATTACHMENTS]';
const ATTACHMENT_MARKER_CLOSE = '[/SWIFTIFY_ATTACHMENTS]';

function sanitizeBubbleContent(message: Message): string {
  const raw = String(message.content || '');
  const start = raw.indexOf(ATTACHMENT_MARKER_OPEN);
  if (start >= 0) {
    const end = raw.indexOf(ATTACHMENT_MARKER_CLOSE);
    const clean = end > start ? `${raw.slice(0, start)}${raw.slice(end + ATTACHMENT_MARKER_CLOSE.length)}` : raw.slice(0, start);
    const trimmed = clean.trim();
    if (trimmed) return trimmed;
    return message.role === 'user' ? 'Сообщение с вложением' : '';
  }

  // Финальная защита: если в пользовательском пузыре оказался служебный JSON ошибки провайдера.
  if (message.role === 'user' && /^\s*\{"error"\s*:/.test(raw)) {
    return 'Сообщение с вложением';
  }

  return raw;
}

export function MessageBubble({ message }: Props) {
  const safeContent = sanitizeBubbleContent(message);
  const showSkeleton =
    message.role === 'assistant' && Boolean(message.isStreaming) && !safeContent.trim();

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
                  <div className="markdown-deferred-fallback">{safeContent}</div>
                }
              >
                <MarkdownRenderer content={safeContent} />
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
