import { useId } from 'react';

export type SwiftifyLogoTone = 'light' | 'dark';

interface Props {
  /** Визуальный вес марки */
  size?: number;
  /** На светлом фоне — тёмная луна; на тёмном — мягкий крем */
  tone?: SwiftifyLogoTone;
  className?: string;
}

const FG_LIGHT = '#1c2840';
const FG_DARK = '#e8dcc8';

/** Ромб (четырёхлучевая «звёздочка»), хорошо читается в малом размере */
function diamond(cx: number, cy: number, halfW: number, halfH: number): string {
  return `M ${cx} ${cy - halfH} L ${cx + halfW} ${cy} L ${cx} ${cy + halfH} L ${cx - halfW} ${cy} Z`;
}

/**
 * Фирменная луна и звёзды — только заливки, без обводок (нет «швов» и лишних линий на тёмном фоне).
 */
export function SwiftifyLogoMark({
  size = 40,
  tone = 'light',
  className,
}: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const maskId = `swiftify-moon-mask-${uid}`;
  const fg = tone === 'light' ? FG_LIGHT : FG_DARK;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      shapeRendering="geometricPrecision"
    >
      <defs>
        <mask id={maskId}>
          <rect width="100" height="100" fill="white" />
          {/* Чуть больше радиус «вычитания», чтобы не было субпиксельного ореола на стыке */}
          <circle cx="52" cy="46" r="26.62" fill="black" />
        </mask>
      </defs>
      <circle cx="33" cy="54" r="31" fill={fg} mask={`url(#${maskId})`} />
      <path d={diamond(71, 45, 5.2, 5.2)} fill={fg} />
      <path d={diamond(86, 29, 3.1, 3.1)} fill={fg} opacity={0.92} />
    </svg>
  );
}
