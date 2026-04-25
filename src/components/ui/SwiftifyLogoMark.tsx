import logoSvg from '../../../figma-export/logo.svg';

export type SwiftifyLogoTone = 'light' | 'dark';

interface Props {
  /** Визуальный вес марки */
  size?: number;
  /** На светлом фоне — тёмная луна; на тёмном — мягкий крем */
  tone?: SwiftifyLogoTone;
  className?: string;
}

export function SwiftifyLogoMark({
  size = 40,
  tone = 'light',
  className,
}: Props) {
  return (
    <img
      src={logoSvg}
      width={size}
      height={size}
      style={tone === 'dark' ? undefined : undefined}
      className={className}
      aria-hidden
      alt=""
      draggable={false}
    />
  );
}
