/** Плейсхолдер до первых токенов ответа ассистента */
export function AssistantSkeleton() {
  return (
    <div className="assistant-skeleton" aria-hidden>
      <div className="assistant-skeleton__top">
        <span className="assistant-skeleton__dot" />
        <span className="assistant-skeleton__name">Swiftify отвечает</span>
      </div>
      <div className="assistant-skeleton__line assistant-skeleton__line--long" />
      <div className="assistant-skeleton__line assistant-skeleton__line--mid" />
      <div className="assistant-skeleton__line assistant-skeleton__line--short" />
      <div className="assistant-skeleton__typing">
        <span className="assistant-skeleton__typing-dot" />
        <span className="assistant-skeleton__typing-dot" />
        <span className="assistant-skeleton__typing-dot" />
      </div>
    </div>
  );
}
