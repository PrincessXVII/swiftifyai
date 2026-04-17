import { Search, Send } from 'lucide-react';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { MAX_MESSAGE_INPUT_CHARS } from '../../constants/limits';
import './MessageInput.css';

interface Props {
  isLoading: boolean;
  onSubmit: (value: string) => Promise<void>;
  initialValue?: string;
}

export const MessageInput = forwardRef<HTMLTextAreaElement, Props>(function MessageInput(
  { isLoading, onSubmit, initialValue = '' },
  forwardedRef,
) {
  const [value, setValue] = useState(initialValue);
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const setRefs = (el: HTMLTextAreaElement | null) => {
    innerRef.current = el;
    if (typeof forwardedRef === 'function') {
      forwardedRef(el);
    } else if (forwardedRef) {
      forwardedRef.current = el;
    }
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const handleSend = async () => {
    const payload = value.trim().slice(0, MAX_MESSAGE_INPUT_CHARS);
    if (!payload) return;
    setValue('');
    innerRef.current?.focus();
    await onSubmit(payload);
  };

  return (
    <div id="swiftify-composer-root">
      <div className="grid" aria-hidden />
      <div id="poda">
        <div className="glow" aria-hidden />
        <div className="darkBorderBg" aria-hidden />
        <div className="border" aria-hidden />
        <div className="white" aria-hidden />
        <div id="main">
          <div id="search-icon" aria-hidden>
            <Search size={20} strokeWidth={2} />
          </div>
          <textarea
            ref={setRefs}
            className="input"
            value={value}
            maxLength={MAX_MESSAGE_INPUT_CHARS}
            onChange={(e) => setValue(e.target.value.slice(0, MAX_MESSAGE_INPUT_CHARS))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            disabled={isLoading}
            placeholder="Поиск..."
            data-swiftify-composer
          />
          <div id="input-mask" />
          <div id="pink-mask" aria-hidden />
          <div className="filterBorder" aria-hidden />
          <button
            type="button"
            id="filter-icon"
            disabled={isLoading || !value.trim()}
            onClick={() => void handleSend()}
            aria-label="Отправить"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
});
