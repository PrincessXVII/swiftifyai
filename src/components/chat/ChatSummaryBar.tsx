import { useCallback, useEffect, useState } from 'react';
import { streamChatSummary } from '../../api/summarizeChat';
import { mapOpenAIError } from '../../api/openai';
import { useChatStore } from '../../store/chatStore';
import type { Message } from '../../types';

interface Props {
  messages: Message[];
  isLoading: boolean;
}

export function ChatSummaryBar({ messages, isLoading }: Props) {
  const modelId = useChatStore((state) => state.settings.selectedModelId);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSummarize = messages.some((m) => m.role === 'user' || m.role === 'assistant') && !isLoading;

  const runSummary = useCallback(async () => {
    if (!canSummarize || busy) return;
    setOpen(true);
    setText('');
    setError(null);
    setBusy(true);
    try {
      await streamChatSummary(messages, modelId, (chunk) => {
        setText((prev) => prev + chunk);
      });
    } catch (err) {
      setError(mapOpenAIError(err));
    } finally {
      setBusy(false);
    }
  }, [busy, canSummarize, messages, modelId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div className="chat-window-toolbar">
        <button
          type="button"
          className="button-secondary chat-summary-button"
          disabled={!canSummarize || busy}
          onClick={() => void runSummary()}
        >
          {busy ? 'Резюме…' : 'Резюме чата'}
        </button>
      </div>

      {open ? (
        <div
          className="summary-modal-overlay"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="summary-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="summary-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="summary-modal__header">
              <h2 id="summary-modal-title">Краткое резюме</h2>
              <button type="button" className="summary-modal__close" onClick={() => setOpen(false)}>
                Закрыть
              </button>
            </div>
            <div className="summary-modal__body">
              {error ? (
                <p className="summary-modal__error">{error}</p>
              ) : (
                <div className="summary-modal__text">
                  {text || (busy ? 'Генерация…' : 'Нет текста.')}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
