interface Props {
  onPickPrompt: (text: string) => void;
}

const EXAMPLES = [
  'Составь план',
  'Реши задачу',
  'Напиши письмо',
  'Сделай краткий конспект',
];

export function EmptyState({ onPickPrompt }: Props) {
  return (
    <div className="empty-state">
      <h2>SwiftifyAI</h2>
      <p>Ваш умный ассистент в одном удобном чате.</p>
      <div className="prompt-grid">
        {EXAMPLES.map((item) => (
          <button key={item} className="prompt-card" onClick={() => onPickPrompt(item)}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
