import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { mapOpenAIError, streamChatCompletion } from '../api/openai';
import { useChatStore } from '../store/chatStore';

const ATTACHMENT_MARKER_OPEN = '[SWIFTIFY_ATTACHMENTS]';
const ATTACHMENT_MARKER_CLOSE = '[/SWIFTIFY_ATTACHMENTS]';

function stripAttachmentPayload(content: string): string {
  const start = content.indexOf(ATTACHMENT_MARKER_OPEN);
  if (start < 0) return content;
  const end = content.indexOf(ATTACHMENT_MARKER_CLOSE);
  if (end < 0 || end <= start) {
    return content.slice(0, start).trim();
  }
  return `${content.slice(0, start)}${content.slice(end + ATTACHMENT_MARKER_CLOSE.length)}`.trim();
}

function buildDailyLimitAssistantMessage(err: unknown): string | null {
  const e = err as { status?: number; code?: string; meta?: { remaining?: number; limit?: number } };
  if (e?.status !== 429) return null;
  if (e?.code !== 'DAILY_CHAR_LIMIT') return null;
  const remaining = typeof e.meta?.remaining === 'number' ? e.meta.remaining : null;
  const limit = typeof e.meta?.limit === 'number' ? e.meta.limit : 5000;
  const remLine = remaining === null ? '' : ` Осталось сегодня: ${remaining}.`;
  return `Вы превысили дневной лимит пробного периода — ${limit} символов в день.${remLine} Попробуйте завтра или оформите SwiftifyPlus.`;
}

export function useChat() {
  const activeChat = useChatStore((state) =>
    state.chats.find((chat) => chat.id === state.activeChatId) ?? null,
  );
  const modelId = useChatStore((state) => state.settings.selectedModelId);
  const upsertMessage = useChatStore((state) => state.upsertMessage);
  const replaceMessageContent = useChatStore((state) => state.replaceMessageContent);
  const finishStreamingMessage = useChatStore((state) => state.finishStreamingMessage);
  const createChat = useChatStore((state) => state.createChat);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const chat = activeChat ?? createChat(modelId);
    const backendContent = content;
    const displayContent = stripAttachmentPayload(content).trim();
    const userMessage = {
      id: uuid(),
      role: 'user' as const,
      content: displayContent || 'Сообщение с вложением',
      createdAt: Date.now(),
    };
    const assistantMessage = {
      id: uuid(),
      role: 'assistant' as const,
      content: '',
      createdAt: Date.now(),
      isStreaming: true,
    };

    upsertMessage(chat.id, userMessage);
    upsertMessage(chat.id, assistantMessage);
    setError(null);
    setIsLoading(true);

    try {
      const history = [...chat.messages, userMessage]
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => ({
          role: message.role,
          content: stripAttachmentPayload(message.content),
        }));
      history[history.length - 1] = { role: 'user', content: backendContent };

      let visibleText = '';
      let pendingText = '';
      let animationTimer: ReturnType<typeof setTimeout> | null = null;

      const typeNextChars = () => {
        if (!pendingText) {
          animationTimer = null;
          return;
        }

        const speedStep = pendingText.length > 120 ? 6 : pendingText.length > 40 ? 4 : 2;
        visibleText += pendingText.slice(0, speedStep);
        pendingText = pendingText.slice(speedStep);
        replaceMessageContent(chat.id, assistantMessage.id, visibleText);

        animationTimer = setTimeout(typeNextChars, 14);
      };

      const startTypingIfNeeded = () => {
        if (!animationTimer) {
          typeNextChars();
        }
      };

      await streamChatCompletion(history, modelId, (chunk) => {
        pendingText += chunk;
        startTypingIfNeeded();
      });

      await new Promise<void>((resolve) => {
        const waitUntilDone = () => {
          if (!pendingText && !animationTimer) {
            resolve();
            return;
          }
          setTimeout(waitUntilDone, 16);
        };
        waitUntilDone();
      });

      finishStreamingMessage(chat.id, assistantMessage.id);
    } catch (err) {
      const limitMsg = buildDailyLimitAssistantMessage(err);
      replaceMessageContent(
        chat.id,
        assistantMessage.id,
        limitMsg ?? 'Не удалось получить ответ. Попробуйте ещё раз.',
      );
      finishStreamingMessage(chat.id, assistantMessage.id);
      setError(limitMsg ? null : mapOpenAIError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages: activeChat?.messages ?? [],
    isLoading,
    error,
    sendMessage,
    clearError: () => setError(null),
  };
}
