import type { Message } from '../../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  return (
    <div className={`message-row ${message.role}`}>
      <div className={`message-bubble ${message.isStreaming ? 'streaming' : ''}`}>
        <MarkdownRenderer content={message.content} />
        <span className="timestamp">
          {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}
