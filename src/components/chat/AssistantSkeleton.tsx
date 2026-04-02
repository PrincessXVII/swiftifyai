/** Плейсхолдер до первых токенов ответа ассистента */
export function AssistantSkeleton() {
  return (
    <div className="assistant-skeleton" aria-hidden>
      <div className="assistant-skeleton__line" />
      <div className="assistant-skeleton__line" />
      <div className="assistant-skeleton__line assistant-skeleton__line--short" />
    </div>
  );
}
