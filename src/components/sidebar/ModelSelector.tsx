import { AI_MODELS } from '../../constants/models';
import { useChatStore } from '../../store/chatStore';

export function ModelSelector() {
  const selected = useChatStore((state) => state.settings.selectedModelId);
  const setSelected = useChatStore((state) => state.setSelectedModelId);

  return (
    <div className="model-selector">
      {AI_MODELS.map((model) => (
        <button
          key={model.id}
          className={`model-item ${selected === model.id ? 'active' : ''}`}
          disabled={!model.available}
          onClick={() => setSelected(model.id)}
        >
          <span>{model.name}</span>
          {!model.available && <small>Скоро</small>}
        </button>
      ))}
    </div>
  );
}
