interface Props {
  onClick: () => void;
}

export function NewChatButton({ onClick }: Props) {
  return (
    <button className="gradient-button" onClick={onClick}>
      <span className="gradient-text">Новый чат</span>
    </button>
  );
}
