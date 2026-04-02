import { Sparkles } from 'lucide-react';

interface Props {
  onClick: () => void;
}

export function PlusUpgradeBanner({ onClick }: Props) {
  return (
    <button type="button" className="plus-upgrade-banner__btn" onClick={onClick}>
      <Sparkles size={16} strokeWidth={2} aria-hidden className="plus-upgrade-banner__icon" />
      <span>Перейти на Plus</span>
    </button>
  );
}
