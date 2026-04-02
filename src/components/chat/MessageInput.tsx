import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MAX_MESSAGE_INPUT_CHARS } from '../../constants/limits';

interface Props {
  isLoading: boolean;
  onSubmit: (value: string) => Promise<void>;
  initialValue?: string;
}

export function MessageInput({ isLoading, onSubmit, initialValue = '' }: Props) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const handleSend = async () => {
    const payload = value.trim().slice(0, MAX_MESSAGE_INPUT_CHARS);
    if (!payload) return;
    await onSubmit(payload);
    setValue('');
    textareaRef.current?.focus();
  };

  return (
    <div className="message-input-wrap">
      <div className="message-input-inner">
        <textarea
          ref={textareaRef}
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
          placeholder="Сообщение"
        />
        <button disabled={isLoading || !value.trim()} onClick={() => void handleSend()}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
