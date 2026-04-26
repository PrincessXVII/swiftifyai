import { Paperclip, X } from 'lucide-react';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { MAX_MESSAGE_INPUT_CHARS } from '../../constants/limits';

const StyledWrapper = styled.div`
  /* Контейнер для absolute-слоёв uiverse */
  position: relative;
  width: 100%;
  overflow: visible;
  isolation: isolate;
  z-index: 0;

  & > div {
    position: relative;
    width: 100%;
    overflow: visible;
  }

  .white,
  .border,
  .darkBorderBg,
  .glow {
    max-height: 70px;
    max-width: none;
    height: 100%;
    width: 100%;
    position: absolute;
    overflow: hidden;
    z-index: -1;
    /* Border Radius */
    border-radius: 12px;
    filter: blur(3px);
  }
  .input {
    background-color: #010201;
    border: none;
    /* padding:7px; */
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    height: 56px;
    border-radius: 10px;
    color: white;
    padding-right: 59px;
    padding-left: 92px;
    font-size: 18px;
  }
  #poda {
    position: relative;
    width: 100%;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .input::placeholder {
    color: #c0b9c0;
  }

  .input:focus {
    outline: none;
  }

  #main:focus-within > #input-mask {
    display: none;
  }

  #input-mask {
    pointer-events: none;
    width: 100px;
    height: 20px;
    position: absolute;
    background: linear-gradient(90deg, transparent, black);
    top: 18px;
    left: 70px;
  }
  #pink-mask {
    pointer-events: none;
    width: 30px;
    height: 20px;
    position: absolute;
    background: #cf30aa;
    top: 10px;
    left: 5px;
    filter: blur(20px);
    opacity: 0.8;
    /* animation:leftright 4s ease-in infinite; */
    transition: opacity 0.35s ease;
  }
  #main:hover > #pink-mask {
    /* animation: rotate 4s linear infinite; */
    opacity: 0;
  }

  .white {
    max-height: 63px;
    max-width: none;
    border-radius: 10px;
    filter: blur(2px);
  }

  /* Узкая полоса: градиент по центру = «углы». На всю ширину — якорим к углам. */
  .white::before {
    content: '';
    z-index: -2;
    text-align: center;
    top: 0;
    left: 0;
    transform: translate(-50%, -50%) rotate(83deg);
    position: absolute;
    width: 600px;
    height: 600px;
    background-repeat: no-repeat;
    background-position: 0 0;
    filter: brightness(1.4);
    background-image: conic-gradient(
      rgba(0, 0, 0, 0) 0%,
      #a099d8,
      rgba(0, 0, 0, 0) 8%,
      rgba(0, 0, 0, 0) 50%,
      #dfa2da,
      rgba(0, 0, 0, 0) 58%
    );
    animation: conicSpinWhiteTl 4s linear infinite;
  }
  .white::after {
    content: '';
    z-index: -2;
    text-align: center;
    bottom: 0;
    right: 0;
    left: auto;
    top: auto;
    transform: translate(50%, 50%) rotate(263deg);
    position: absolute;
    width: 600px;
    height: 600px;
    background-repeat: no-repeat;
    background-position: 0 0;
    filter: brightness(1.4);
    background-image: conic-gradient(
      rgba(0, 0, 0, 0) 0%,
      #a099d8,
      rgba(0, 0, 0, 0) 8%,
      rgba(0, 0, 0, 0) 50%,
      #dfa2da,
      rgba(0, 0, 0, 0) 58%
    );
    animation: conicSpinWhiteBr 4s linear infinite;
  }
  .border {
    max-height: 59px;
    max-width: none;
    border-radius: 11px;
    filter: blur(0.5px);
  }
  .border::before {
    content: '';
    z-index: -2;
    text-align: center;
    top: 0;
    left: 0;
    transform: translate(-50%, -50%) rotate(70deg);
    position: absolute;
    width: 600px;
    height: 600px;
    filter: brightness(1.3);
    background-repeat: no-repeat;
    background-position: 0 0;
    background-image: conic-gradient(
      #1c191c,
      #402fb5 5%,
      #1c191c 14%,
      #1c191c 50%,
      #cf30aa 60%,
      #1c191c 64%
    );
    animation: conicSpinBorderTl 4s 0.1s linear infinite;
  }
  .border::after {
    content: '';
    z-index: -2;
    text-align: center;
    bottom: 0;
    right: 0;
    left: auto;
    top: auto;
    transform: translate(50%, 50%) rotate(250deg);
    position: absolute;
    width: 600px;
    height: 600px;
    filter: brightness(1.3);
    background-repeat: no-repeat;
    background-position: 0 0;
    background-image: conic-gradient(
      #1c191c,
      #402fb5 5%,
      #1c191c 14%,
      #1c191c 50%,
      #cf30aa 60%,
      #1c191c 64%
    );
    animation: conicSpinBorderBr 4s 0.1s linear infinite;
  }
  .darkBorderBg {
    max-height: 65px;
    max-width: none;
  }
  .darkBorderBg::before {
    content: '';
    z-index: -2;
    text-align: center;
    top: 0;
    left: 0;
    transform: translate(-50%, -50%) rotate(82deg);
    position: absolute;
    width: 600px;
    height: 600px;
    background-repeat: no-repeat;
    background-position: 0 0;
    background-image: conic-gradient(
      rgba(0, 0, 0, 0),
      #18116a,
      rgba(0, 0, 0, 0) 10%,
      rgba(0, 0, 0, 0) 50%,
      #6e1b60,
      rgba(0, 0, 0, 0) 60%
    );
    animation: conicSpinDarkTl 4s linear infinite;
  }
  .darkBorderBg::after {
    content: '';
    z-index: -2;
    text-align: center;
    bottom: 0;
    right: 0;
    left: auto;
    top: auto;
    transform: translate(50%, 50%) rotate(262deg);
    position: absolute;
    width: 600px;
    height: 600px;
    background-repeat: no-repeat;
    background-position: 0 0;
    background-image: conic-gradient(
      rgba(0, 0, 0, 0),
      #18116a,
      rgba(0, 0, 0, 0) 10%,
      rgba(0, 0, 0, 0) 50%,
      #6e1b60,
      rgba(0, 0, 0, 0) 60%
    );
    animation: conicSpinDarkBr 4s linear infinite;
  }

  .glow {
    overflow: hidden;
    filter: blur(30px);
    opacity: 0.4;
    max-height: 130px;
    max-width: none;
  }
  .glow::before {
    content: '';
    z-index: -2;
    text-align: center;
    top: 0;
    left: 0;
    transform: translate(-50%, -50%) rotate(60deg);
    position: absolute;
    width: 720px;
    height: 720px;
    background-repeat: no-repeat;
    background-position: 0 0;
    background-image: conic-gradient(
      #000,
      #402fb5 5%,
      #000 38%,
      #000 50%,
      #cf30aa 60%,
      #000 87%
    );
    animation: conicSpinGlowTl 4s 0.3s linear infinite;
  }
  .glow::after {
    content: '';
    z-index: -2;
    text-align: center;
    bottom: 0;
    right: 0;
    left: auto;
    top: auto;
    transform: translate(50%, 50%) rotate(240deg);
    position: absolute;
    width: 720px;
    height: 720px;
    background-repeat: no-repeat;
    background-position: 0 0;
    background-image: conic-gradient(
      #000,
      #402fb5 5%,
      #000 38%,
      #000 50%,
      #cf30aa 60%,
      #000 87%
    );
    animation: conicSpinGlowBr 4s 0.3s linear infinite;
  }

  /* Непрерывное вращение conic-gradient (как в оригинале); углы якоря — свой +360° на слой */
  @keyframes conicSpinWhiteTl {
    to {
      transform: translate(-50%, -50%) rotate(443deg);
    }
  }
  @keyframes conicSpinWhiteBr {
    to {
      transform: translate(50%, 50%) rotate(623deg);
    }
  }
  @keyframes conicSpinBorderTl {
    to {
      transform: translate(-50%, -50%) rotate(430deg);
    }
  }
  @keyframes conicSpinBorderBr {
    to {
      transform: translate(50%, 50%) rotate(610deg);
    }
  }
  @keyframes conicSpinDarkTl {
    to {
      transform: translate(-50%, -50%) rotate(442deg);
    }
  }
  @keyframes conicSpinDarkBr {
    to {
      transform: translate(50%, 50%) rotate(622deg);
    }
  }
  @keyframes conicSpinGlowTl {
    to {
      transform: translate(-50%, -50%) rotate(420deg);
    }
  }
  @keyframes conicSpinGlowBr {
    to {
      transform: translate(50%, 50%) rotate(600deg);
    }
  }

  @keyframes rotate {
    100% {
      transform: translate(-50%, -50%) rotate(450deg);
    }
  }
  @keyframes leftright {
    0% {
      transform: translate(0px, 0px);
      opacity: 1;
    }

    49% {
      transform: translate(250px, 0px);
      opacity: 0;
    }
    80% {
      transform: translate(-40px, 0px);
      opacity: 0;
    }

    100% {
      transform: translate(0px, 0px);
      opacity: 1;
    }
  }

  #filter-icon {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    max-height: 40px;
    max-width: 38px;
    height: 100%;
    width: 100%;

    isolation: isolate;
    overflow: hidden;
    /* Border Radius */
    border-radius: 10px;
    background: linear-gradient(180deg, #161329, black, #1d1b4b);
    border: 1px solid transparent;
  }
  .filterBorder {
    height: 42px;
    width: 40px;
    position: absolute;
    overflow: hidden;
    top: 7px;
    right: 7px;
    border-radius: 10px;
  }

  .filterBorder::before {
    content: '';

    text-align: center;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(90deg);
    position: absolute;
    width: 600px;
    height: 600px;
    background-repeat: no-repeat;
    background-position: 0 0;
    filter: brightness(1.35);
    background-image: conic-gradient(
      rgba(0, 0, 0, 0),
      #3d3a4f,
      rgba(0, 0, 0, 0) 50%,
      rgba(0, 0, 0, 0) 50%,
      #3d3a4f,
      rgba(0, 0, 0, 0) 100%
    );
    animation: rotate 4s linear infinite;
  }
  #main {
    position: relative;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }
  #search-icon {
    position: absolute;
    left: 50px;
    top: 15px;
  }

  .attach-icon-btn {
    position: absolute;
    left: 14px;
    top: 13px;
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #cbc2dc;
    cursor: pointer;
    transition: background 160ms ease, color 160ms ease, transform 140ms ease;
  }

  .attach-icon-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    color: #f2e9ff;
    transform: translateY(-1px);
  }

  .attach-icon-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .attachments-wrap {
    margin-top: 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .attachment-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid rgba(204, 150, 233, 0.35);
    background: rgba(20, 15, 34, 0.78);
    color: #ece4ff;
    font-size: 12px;
    max-width: min(320px, 90vw);
  }

  .attachment-chip__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .attachment-chip__remove {
    border: 0;
    background: transparent;
    color: inherit;
    width: 18px;
    height: 18px;
    padding: 0;
    border-radius: 50%;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0.86;
  }

  .attachment-chip__remove:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
  }
`;

interface Props {
  isLoading: boolean;
  onSubmit: (value: string) => Promise<void>;
  initialValue?: string;
}

type Attachment = {
  id: string;
  name: string;
  text: string;
  note?: string;
};

const MAX_FILE_SIZE = 512 * 1024; // 512 KB
const MAX_ATTACHMENTS = 4;

function ext(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function isTextLike(file: File): boolean {
  if (file.type.startsWith('text/')) return true;
  const e = ext(file.name);
  return ['md', 'txt', 'json', 'csv', 'ts', 'tsx', 'js', 'jsx', 'py', 'sql', 'xml', 'yaml', 'yml', 'html', 'css'].includes(e);
}

async function readFileText(file: File): Promise<Attachment> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      id: crypto.randomUUID(),
      name: file.name,
      text: '',
      note: 'Слишком большой файл (макс. 512 KB)',
    };
  }
  if (!isTextLike(file)) {
    return {
      id: crypto.randomUUID(),
      name: file.name,
      text: '',
      note: 'Формат не поддерживает чтение как текст',
    };
  }
  try {
    const text = (await file.text()).slice(0, 120_000);
    return { id: crypto.randomUUID(), name: file.name, text };
  } catch {
    return {
      id: crypto.randomUUID(),
      name: file.name,
      text: '',
      note: 'Не удалось прочитать файл',
    };
  }
}

export const MessageInput = forwardRef<HTMLInputElement, Props>(function MessageInput(
  { isLoading, onSubmit, initialValue = '' },
  forwardedRef,
) {
  const [value, setValue] = useState(initialValue);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasUsefulAttachments = useMemo(
    () => attachments.some((a) => a.text.trim().length > 0 || a.note),
    [attachments],
  );

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSend = async () => {
    const payload = value.trim().slice(0, MAX_MESSAGE_INPUT_CHARS);
    if (!payload && !hasUsefulAttachments) return;

    const attachmentBlock =
      attachments.length === 0
        ? ''
        : `\n\n[Вложения]\n${attachments
            .map((a) => {
              if (a.note) return `Файл: ${a.name}\nПримечание: ${a.note}`;
              return `Файл: ${a.name}\nСодержимое:\n\`\`\`\n${a.text}\n\`\`\``;
            })
            .join('\n\n')}`;

    const finalPayload = `${payload}${attachmentBlock}`.trim();
    setValue('');
    setAttachments([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (forwardedRef && typeof forwardedRef === 'object' && forwardedRef.current) {
      forwardedRef.current.focus();
    }
    await onSubmit(finalPayload);
  };

  const handlePickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const left = Math.max(0, MAX_ATTACHMENTS - attachments.length);
    const picked = Array.from(files).slice(0, left);
    const parsed = await Promise.all(picked.map((f) => readFileText(f)));
    setAttachments((prev) => [...prev, ...parsed]);
  };

  return (
    <StyledWrapper>
      <div>
        <div id="poda">
          <div className="glow" />
          <div className="darkBorderBg" />
          <div className="darkBorderBg" />
          <div className="darkBorderBg" />
          <div className="white" />
          <div className="border" />
          <div id="main">
            <input
              ref={forwardedRef}
              placeholder="Поиск..."
              type="text"
              name="text"
              className="input"
              value={value}
              maxLength={MAX_MESSAGE_INPUT_CHARS}
              disabled={isLoading}
              data-swiftify-composer
              onChange={(e) => setValue(e.target.value.slice(0, MAX_MESSAGE_INPUT_CHARS))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                void handlePickFiles(e.target.files);
              }}
            />
            <button
              type="button"
              className="attach-icon-btn"
              aria-label="Прикрепить файлы"
              title="Прикрепить файлы"
              disabled={isLoading || attachments.length >= MAX_ATTACHMENTS}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={16} strokeWidth={1.8} />
            </button>
            <div id="input-mask" />
            <div id="pink-mask" />
            <div className="filterBorder" />
            <div
              id="filter-icon"
              role="button"
              tabIndex={0}
              onClick={() => void handleSend()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            >
              <svg preserveAspectRatio="none" height={27} width={27} viewBox="4.8 4.56 14.832 15.408" fill="none">
                <path
                  d="M8.16 6.65002H15.83C16.47 6.65002 16.99 7.17002 16.99 7.81002V9.09002C16.99 9.56002 16.7 10.14 16.41 10.43L13.91 12.64C13.56 12.93 13.33 13.51 13.33 13.98V16.48C13.33 16.83 13.1 17.29 12.81 17.47L12 17.98C11.24 18.45 10.2 17.92 10.2 16.99V13.91C10.2 13.5 9.97 12.98 9.73 12.69L7.52 10.36C7.23 10.08 7 9.55002 7 9.20002V7.87002C7 7.17002 7.52 6.65002 8.16 6.65002Z"
                  stroke="#d6d6e6"
                  strokeWidth={1}
                  strokeMiterlimit={10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div id="search-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={24}
                viewBox="0 0 24 24"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                height={24}
                fill="none"
                className="feather feather-search"
              >
                <circle stroke="url(#search)" r={8} cy={11} cx={11} />
                <line stroke="url(#searchl)" y2="16.65" y1={22} x2="16.65" x1={22} />
                <defs>
                  <linearGradient gradientTransform="rotate(50)" id="search">
                    <stop stopColor="#f8e7f8" offset="0%" />
                    <stop stopColor="#b6a9b7" offset="50%" />
                  </linearGradient>
                  <linearGradient id="searchl">
                    <stop stopColor="#b6a9b7" offset="0%" />
                    <stop stopColor="#837484" offset="50%" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
        {attachments.length > 0 ? (
          <div className="attachments-wrap">
            {attachments.map((a) => (
              <div className="attachment-chip" key={a.id} title={a.note || a.name}>
                <span className="attachment-chip__name">{a.name}</span>
                <button
                  type="button"
                  className="attachment-chip__remove"
                  aria-label={`Удалить ${a.name}`}
                  onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </StyledWrapper>
  );
});
