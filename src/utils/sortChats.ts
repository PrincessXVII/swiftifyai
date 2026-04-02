import type { Chat } from '../types';

/** Закреплённые сверху, далее по дате обновления (новые выше). */
export function sortChatsForDisplay(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => {
    const ap = a.pinned ? 1 : 0;
    const bp = b.pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return b.updatedAt - a.updatedAt;
  });
}
