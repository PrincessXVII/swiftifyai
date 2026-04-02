interface Props {
  onClick: () => void;
}

export function NewChatButton({ onClick }: Props) {
  return (
    <button className="new-chat-button" onClick={onClick}>
      + Новый чат
    </button>
  );
}
