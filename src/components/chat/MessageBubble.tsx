import type { Message } from '../../types';
import { AssistantSkeleton } from './AssistantSkeleton';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const showSkeleton =
    message.role === 'assistant' && Boolean(message.isStreaming) && !message.content.trim();

  return (
    <div className={`message-row ${message.role}`}>
      <div
        className={`message-bubble ${message.isStreaming && !showSkeleton ? 'streaming' : ''} ${
          showSkeleton ? 'message-bubble--skeleton' : ''
        }`}
      >
        {showSkeleton ? (
          <AssistantSkeleton />
        ) : (
          <>
            <MarkdownRenderer content={message.content} />
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
  );
}
