import type { Chat } from '../types';

export function chatMatchesSearchQuery(chat: Chat, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (chat.title.toLowerCase().includes(q)) return true;
  const blob = chat.messages.map((m) => m.content).join('\n').toLowerCase();
  return blob.includes(q);
}
