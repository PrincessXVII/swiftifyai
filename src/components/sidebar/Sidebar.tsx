import { CircleUser } from 'lucide-react';
import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getProfilePrimaryLabel, getSubscriptionBadge } from '../../lib/userProfile';
import { useChatStore } from '../../store/chatStore';
import { ChatList } from './ChatList';
import { NewChatButton } from './NewChatButton';

interface Props {
  onClose?: () => void;
  onOpenAccount?: () => void;
}

const STAR4_A = 'polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%)';
const STAR4_B = 'polygon(50% 6%, 60% 40%, 94% 50%, 60% 60%, 50% 94%, 40% 60%, 6% 50%, 40% 40%)';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Эталон сайдбара для генерации (совпадает с типичной шириной колонки и высотой окна). */
const REF_SIDEBAR_W = 320;
const REF_SIDEBAR_H = 900;

/**
 * Зоны UI в px (от верхнего левого угла сайдбара), куда нельзя класть центры звёзд.
 * Верх: «Новый чат». Низ: плашка профиля (иконка + имя + статус).
 * Список чатов отдельно не режем — иначе не останется места для звёзд.
 */
function buildUiSafeZonesPx(): Array<{ l: number; t: number; r: number; b: number; clearancePx: number }> {
  const padX = 12;
  const padTop = 14;
  const padBottom = 14;
  const innerL = padX;
  const innerR = REF_SIDEBAR_W - padX;

  const newChatH = 48;
  const sidebarTopPb = 4;

  let y = padTop;
  const newChatT = y;
  const newChatB = y + newChatH + sidebarTopPb;

  const footerTopPad = 10;
  /** Аватар ~48px + две строки текста + padding кнопки профиля */
  const profileBlockH = 96;

  const profileT = REF_SIDEBAR_H - padBottom - footerTopPad - profileBlockH;
  const profileB = REF_SIDEBAR_H;

  return [
    { l: innerL, t: newChatT, r: innerR, b: newChatB, clearancePx: 16 },
    { l: innerL, t: profileT, r: innerR, b: profileB, clearancePx: 3 },
  ];
}

const UI_SAFE_ZONES_PX = buildUiSafeZonesPx();

/** Расстояние от точки до границы прямоугольника: снаружи ≥0, внутри — отрицательное (глубина от ближайшего края). */
function signedDistToRectPx(px: number, py: number, z: { l: number; t: number; r: number; b: number }): number {
  const { l, t, r, b } = z;
  const dx = px < l ? l - px : px > r ? px - r : 0;
  const dy = py < t ? t - py : py > b ? py - b : 0;
  if (dx === 0 && dy === 0) {
    return -Math.min(px - l, r - px, py - t, b - py);
  }
  return Math.hypot(dx, dy);
}

/**
 * Запрет: центр звезды ближе, чем R + clearance зоны, к которой она ближе всего
 * (clearance задаётся у этой зоны).
 */
function violatesNearestUiZone(px: number, py: number, starRadiusPx: number): boolean {
  let worst = Infinity;
  for (const z of UI_SAFE_ZONES_PX) {
    const sd = signedDistToRectPx(px, py, z);
    const limit = starRadiusPx + z.clearancePx;
    const slack = sd - limit;
    if (slack < worst) worst = slack;
  }
  return worst < 0;
}

function generateIceChunks(count: number) {
  const rand = seededRandom(26042026);
  const chunks: Array<{
    x: number;
    y: number;
    size: number;
    shape: string;
    driftX: number;
    driftY: number;
    duration: number;
    delay: number;
    opacity: number;
  }> = [];

  /** Зазор между «коробками» звёзд + запас под keyframes ice-drift (иначе при анимации наезжают) */
  const gapPx = 8;
  /** Совпадает с макс. амплитудой drift в keyframes (чтобы slack не расходился с реальным движением) */
  const driftAmpMaxPx = 12;
  const animationSlackPx = driftAmpMaxPx * 2;

  function effectiveRadiusPx(size: number): number {
    return (size / 2) * 1.18;
  }

  function circlesOverlap(
    ax: number,
    ay: number,
    ar: number,
    bx: number,
    by: number,
    br: number,
  ): boolean {
    const axPx = (ax / 100) * REF_SIDEBAR_W;
    const ayPx = (ay / 100) * REF_SIDEBAR_H;
    const bxPx = (bx / 100) * REF_SIDEBAR_W;
    const byPx = (by / 100) * REF_SIDEBAR_H;
    const minCenter = ar + br + gapPx + animationSlackPx;
    return Math.hypot(axPx - bxPx, ayPx - byPx) < minCenter;
  }

  let guard = 0;

  while (chunks.length < count && guard < count * 1200) {
    guard += 1;
    const size = 24 + rand() * 22;
    const radius = effectiveRadiusPx(size);
    const candidate = {
      x: 6 + rand() * 88,
      y: 6 + rand() * 88,
      size,
      shape: rand() > 0.5 ? STAR4_A : STAR4_B,
      driftX: (rand() > 0.5 ? 1 : -1) * (4 + rand() * 8),
      driftY: (rand() > 0.5 ? 1 : -1) * (4 + rand() * 8),
      duration: 6 + rand() * 4.8,
      delay: rand() * 2.6,
      opacity: 0.84 + rand() * 0.2,
    };

    const px = (candidate.x / 100) * REF_SIDEBAR_W;
    const py = (candidate.y / 100) * REF_SIDEBAR_H;
    if (violatesNearestUiZone(px, py, radius)) {
      continue;
    }

    const overlaps = chunks.some((item) =>
      circlesOverlap(candidate.x, candidate.y, radius, item.x, item.y, effectiveRadiusPx(item.size)),
    );

    if (!overlaps) {
      chunks.push(candidate);
    }
  }

  return chunks;
}

const ICE_CHUNKS = generateIceChunks(72);

const SCATTER_LERP = 0.09;
const REPEL_RADIUS_PX = 158;
const MAX_PUSH_PX = 32;
const SCATTER_CAP = 112;

export function Sidebar({ onClose, onOpenAccount }: Props) {
  const { user, isConfigured } = useAuth();
  const primaryLabel = user ? getProfilePrimaryLabel(user) : '';
  const subBadge = user ? getSubscriptionBadge(user) : { isPro: false, label: '' };
  const selectedModel = useChatStore((state) => state.settings.selectedModelId);
  const createChat = useChatStore((state) => state.createChat);
  const iceRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const pointerLocalRef = useRef<{ x: number; y: number } | null>(null);
  const scatterRef = useRef(ICE_CHUNKS.map(() => ({ x: 0, y: 0 })));
  const scatterRunningRef = useRef(false);
  const scatterUnmountRef = useRef(false);

  const kickScatterLoop = useCallback(() => {
    if (scatterRunningRef.current) return;
    scatterRunningRef.current = true;

    const tick = () => {
      if (scatterUnmountRef.current) {
        scatterRunningRef.current = false;
        return;
      }

      const root = sidebarRef.current;
      if (!root) {
        scatterRunningRef.current = false;
        return;
      }

      const rect = root.getBoundingClientRect();
      const pointer = pointerLocalRef.current;
      let anyMotion = false;

      for (let i = 0; i < ICE_CHUNKS.length; i += 1) {
        const node = iceRefs.current[i];
        const chunk = ICE_CHUNKS[i];
        if (!node || !chunk) continue;

        const cx = (chunk.x / 100) * rect.width;
        const cy = (chunk.y / 100) * rect.height;

        let tx = 0;
        let ty = 0;
        if (pointer) {
          const dx = pointer.x - cx;
          const dy = pointer.y - cy;
          const dist = Math.hypot(dx, dy);
          if (dist < REPEL_RADIUS_PX && dist > 1e-4) {
            const t = (REPEL_RADIUS_PX - dist) / REPEL_RADIUS_PX;
            const falloff = t * t;
            const push = falloff * MAX_PUSH_PX;
            tx = (-dx / dist) * push;
            ty = (-dy / dist) * push;
          }
        }

        const s = scatterRef.current[i];
        s.x += (tx - s.x) * SCATTER_LERP;
        s.y += (ty - s.y) * SCATTER_LERP;
        s.x = Math.max(-SCATTER_CAP, Math.min(SCATTER_CAP, s.x));
        s.y = Math.max(-SCATTER_CAP, Math.min(SCATTER_CAP, s.y));

        if (Math.abs(s.x) > 0.06 || Math.abs(s.y) > 0.06) {
          anyMotion = true;
        }

        node.style.setProperty('--scatter-x', `${s.x.toFixed(2)}px`);
        node.style.setProperty('--scatter-y', `${s.y.toFixed(2)}px`);
      }

      const continueAnim = pointer !== null || anyMotion;
      if (continueAnim) {
        requestAnimationFrame(tick);
      } else {
        scatterRunningRef.current = false;
      }
    };

    requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    scatterUnmountRef.current = false;
    return () => {
      scatterUnmountRef.current = true;
    };
  }, []);

  return (
    <aside
      ref={sidebarRef}
      className="sidebar"
      onMouseMove={(event) => {
        const el = event.currentTarget;
        const rect = el.getBoundingClientRect();
        pointerLocalRef.current = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
        const x = (pointerLocalRef.current.x / rect.width) * 100;
        const y = (pointerLocalRef.current.y / rect.height) * 100;
        el.style.setProperty('--mx', `${x}%`);
        el.style.setProperty('--my', `${y}%`);
        kickScatterLoop();
      }}
      onMouseLeave={(event) => {
        pointerLocalRef.current = null;
        event.currentTarget.style.setProperty('--mx', '50%');
        event.currentTarget.style.setProperty('--my', '50%');
        kickScatterLoop();
      }}
    >
      <div className="icefield" aria-hidden="true">
        {ICE_CHUNKS.map((chunk, index) => (
          <span
            key={`${chunk.x}-${chunk.y}-${chunk.size}`}
            ref={(node) => {
              iceRefs.current[index] = node;
            }}
            className="ice-chunk"
            style={
              {
                '--x': `${chunk.x}%`,
                '--y': `${chunk.y}%`,
                '--size': `${chunk.size}px`,
                '--shape': chunk.shape,
                '--drift-x': `${chunk.driftX}px`,
                '--drift-y': `${chunk.driftY}px`,
                '--duration': `${chunk.duration}s`,
                '--delay': `${chunk.delay}s`,
                '--opacity': chunk.opacity,
                '--scatter-x': '0px',
                '--scatter-y': '0px',
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="sidebar-content">
        <div className="sidebar-top">
          <NewChatButton
            onClick={() => {
              createChat(selectedModel);
              onClose?.();
            }}
          />
        </div>
        <ChatList />
        {isConfigured && user ? (
          <div className="sidebar-footer">
            <button
              type="button"
              className="sidebar-profile-row"
              onClick={() => {
                onOpenAccount?.();
                onClose?.();
              }}
              aria-label="Личный кабинет"
              title="Личный кабинет"
            >
              <span className="sidebar-profile-avatar" aria-hidden>
                <CircleUser size={24} strokeWidth={1.6} />
              </span>
              <span className="sidebar-profile-meta">
                <span className="sidebar-profile-name">{primaryLabel}</span>
                <span
                  className={
                    subBadge.isPro ? 'sidebar-profile-plan sidebar-profile-plan--pro' : 'sidebar-profile-plan sidebar-profile-plan--trial'
                  }
                >
                  {subBadge.label}
                </span>
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
