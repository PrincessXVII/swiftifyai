import type { Chat } from '../../types';

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
  void isActive;
  void isLastInList;
  void onDelete;
  void onTogglePin;

  return (
    <div
      className="chat-list-item group"
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
      <svg
        y="0"
        xmlns="http://www.w3.org/2000/svg"
        x="0"
        width="100"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        height="100"
        className="w-8 h-8 absolute right-0 -rotate-45 stroke-pink-300 top-1.5 group-hover:rotate-0 duration-300"
      >
        <path
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          d="M60.7,53.6,50,64.3m0,0L39.3,53.6M50,64.3V35.7m0,46.4A32.1,32.1,0,1,1,82.1,50,32.1,32.1,0,0,1,50,82.1Z"
          className="chat-list-item__arrow-stroke"
        ></path>
      </svg>
      <button
        type="button"
        className="chat-list-item__button"
        onClick={onOpen}
      >
        {chat.title}
      </button>
    </div>
  );
}
