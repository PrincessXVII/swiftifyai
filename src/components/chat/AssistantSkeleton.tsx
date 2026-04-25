/** Плейсхолдер до первых токенов ответа ассистента */
export function AssistantSkeleton() {
  return (
    <div className="assistant-skeleton" aria-hidden>
      <div className="assistant-skeleton__spinner-scale">
        <div className="spinner">
          <div className="spinnerin" />
        </div>
      </div>
    </div>
  );
}
