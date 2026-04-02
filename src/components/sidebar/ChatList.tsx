import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useChatHistory } from '../../hooks/useChatHistory';
import { chatMatchesSearchQuery } from '../../utils/chatSearch';
import { ChatListItem } from './ChatListItem';

export function ChatList() {
  const [query, setQuery] = useState('');
  const { chats, activeChatId, loadChat, deleteChat, togglePinChat } = useChatHistory();

  const visible = useMemo(
    () => chats.filter((c) => chatMatchesSearchQuery(c, query)),
    [chats, query],
  );

  return (
    <div className="chat-list-section">
      <div className="sidebar-search-wrap">
        <Search className="sidebar-search-icon" size={17} strokeWidth={1.8} aria-hidden />
        <input
          type="search"
          className="sidebar-search-input"
          placeholder="Поиск по чатам…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          enterKeyHint="search"
          autoComplete="off"
        />
      </div>
      <div className="chat-list">
        {visible.length === 0 ? (
          <p className="chat-list-empty">{chats.length === 0 ? 'Нет чатов' : 'Ничего не найдено'}</p>
        ) : (
          visible.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isActive={activeChatId === chat.id}
              onOpen={() => loadChat(chat.id)}
              onDelete={() => deleteChat(chat.id)}
              onTogglePin={() => togglePinChat(chat.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
