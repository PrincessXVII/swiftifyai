import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import type { Message } from '../../types';
import { MessageBubble } from './MessageBubble';

interface Props {
  messages: Message[];
}

export function MessageList({ messages }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((message, index) => (
        <div
          key={message.id}
          style={{ '--message-index': index } as CSSProperties}
          className="message-row-wrap"
        >
          <MessageBubble message={message} />
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
