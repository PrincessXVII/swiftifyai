import { Pin, Trash2 } from 'lucide-react';
import type { Chat } from '../../types';
import { formatDate } from '../../utils/formatDate';

interface Props {
  chat: Chat;
  isActive: boolean;
  /** Нижний чат в списке — постоянное свечение вниз. */
  isLastInList: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

export function ChatListItem({
  chat,
  isActive,
  isLastInList,
  onOpen,
  onDelete,
  onTogglePin,
}: Props) {
  const badge = (chat.title || 'S').trim().charAt(0).toUpperCase();
  const pinned = !!chat.pinned;

  return (
    <div
      className={`chat-list-item ${isActive ? 'active' : ''} ${isLastInList ? 'chat-list-item--last' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <span className="chat-avatar">{badge}</span>
      <div className="chat-list-main">
        <strong>{chat.title}</strong>
        <small>{formatDate(chat.updatedAt)}</small>
      </div>
      <button
        type="button"
        className={`chat-pin ${pinned ? 'chat-pin--pinned' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          onTogglePin();
        }}
        aria-label={pinned ? 'Открепить чат' : 'Закрепить чат'}
        aria-pressed={pinned}
      >
        <Pin size={16} strokeWidth={pinned ? 2.2 : 1.6} />
      </button>
      <span
        className="chat-delete"
        role="button"
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 size={16} />
      </span>
    </div>
  );
}
