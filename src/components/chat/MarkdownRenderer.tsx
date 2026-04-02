import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useChatStore } from '../../store/chatStore';

interface Props {
  content: string;
}

export function MarkdownRenderer({ content }: Props) {
  const theme = useChatStore((state) => state.settings.theme);
  const codeTheme = theme === 'dark' ? oneDark : oneLight;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code(props) {
          const { children, className, ...rest } = props;
          const match = /language-(\w+)/.exec(className || '');
          const text = String(children).replace(/\n$/, '');

          if (!match) return <code {...rest}>{children}</code>;

          return (
            <div className="code-block">
              <button
                className="copy-button"
                onClick={() => navigator.clipboard.writeText(text)}
              >
                Копировать
              </button>
              <SyntaxHighlighter
                style={codeTheme}
                language={match[1]}
                PreTag="div"
                customStyle={{ margin: 0, borderRadius: 12 }}
              >
                {text}
              </SyntaxHighlighter>
            </div>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
