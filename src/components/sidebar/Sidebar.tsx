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

/**
 * Визуальные safe zones для полосы звёзд (логика вёрстки, не отступы в px):
 * — Верхняя граница: сразу под нижним краем последнего блока в `.chat-list`
 *   (нижний чат в колонке — тот, что визуально последний в списке; при пустом списке — под «Нет чатов» / «Ничего не найдено»).
 * — Нижняя граница: сразу над верхним краем плашки профиля `.sidebar-footer`.
 * Реализация: `.chat-list` (контент + скролл) + `.sidebar-stars` с flex:1 в одной колонке `.chat-list-stack`,
 * футер снаружи — звёзды заполняют только промежуток между списком и профилем.
 */
const REF_STARS_W = 320;
const REF_STARS_H = 260;

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

  const gapPx = 8;
  const driftAmpMaxPx = 12;
  const animationSlackPx = driftAmpMaxPx * 2;
  const padPct = 6;

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
    const axPx = (ax / 100) * REF_STARS_W;
    const ayPx = (ay / 100) * REF_STARS_H;
    const bxPx = (bx / 100) * REF_STARS_W;
    const byPx = (by / 100) * REF_STARS_H;
    const minCenter = ar + br + gapPx + animationSlackPx;
    return Math.hypot(axPx - bxPx, ayPx - byPx) < minCenter;
  }

  let guard = 0;

  while (chunks.length < count && guard < count * 1200) {
    guard += 1;
    const size = 22 + rand() * 20;
    const radius = effectiveRadiusPx(size);
    const candidate = {
      x: padPct + rand() * (100 - 2 * padPct),
      y: padPct + rand() * (100 - 2 * padPct),
      size,
      shape: rand() > 0.5 ? STAR4_A : STAR4_B,
      driftX: (rand() > 0.5 ? 1 : -1) * (4 + rand() * 8),
      driftY: (rand() > 0.5 ? 1 : -1) * (4 + rand() * 8),
      duration: 6 + rand() * 4.8,
      delay: rand() * 2.6,
      opacity: 0.84 + rand() * 0.2,
    };

    const px = (candidate.x / 100) * REF_STARS_W;
    const py = (candidate.y / 100) * REF_STARS_H;
    const margin = padPct * 0.01 * Math.min(REF_STARS_W, REF_STARS_H);
    if (px < margin + radius || px > REF_STARS_W - margin - radius) continue;
    if (py < margin + radius || py > REF_STARS_H - margin - radius) continue;

    const overlaps = chunks.some((item) =>
      circlesOverlap(candidate.x, candidate.y, radius, item.x, item.y, effectiveRadiusPx(item.size)),
    );

    if (!overlaps) {
      chunks.push(candidate);
    }
  }

  return chunks;
}

const ICE_CHUNKS = generateIceChunks(52);

const SCATTER_LERP = 0.09;
const REPEL_RADIUS_PX = 120;
const MAX_PUSH_PX = 28;
const SCATTER_CAP = 112;

export function Sidebar({ onClose, onOpenAccount }: Props) {
  const { user, isConfigured } = useAuth();
  const primaryLabel = user ? getProfilePrimaryLabel(user) : '';
  const subBadge = user ? getSubscriptionBadge(user) : { isPlus: false, label: '' };
  const selectedModel = useChatStore((state) => state.settings.selectedModelId);
  const createChat = useChatStore((state) => state.createChat);
  const iceRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const icefieldRef = useRef<HTMLDivElement | null>(null);
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

      const sidebarEl = sidebarRef.current;
      const iceEl = icefieldRef.current;
      if (!sidebarEl || !iceEl) {
        scatterRunningRef.current = false;
        return;
      }

      const iceRect = iceEl.getBoundingClientRect();
      const sbRect = sidebarEl.getBoundingClientRect();
      const pointer = pointerLocalRef.current;
      let ptrX: number | null = null;
      let ptrY: number | null = null;
      if (pointer) {
        ptrX = pointer.x - (iceRect.left - sbRect.left);
        ptrY = pointer.y - (iceRect.top - sbRect.top);
      }

      let anyMotion = false;

      for (let i = 0; i < ICE_CHUNKS.length; i += 1) {
        const node = iceRefs.current[i];
        const chunk = ICE_CHUNKS[i];
        if (!node || !chunk) continue;

        const cx = (chunk.x / 100) * iceRect.width;
        const cy = (chunk.y / 100) * iceRect.height;

        let tx = 0;
        let ty = 0;
        if (ptrX !== null && ptrY !== null) {
          const dx = ptrX - cx;
          const dy = ptrY - cy;
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
      <div className="sidebar-content">
        <div className="sidebar-top">
          <NewChatButton
            onClick={() => {
              createChat(selectedModel);
              onClose?.();
            }}
          />
        </div>

        <ChatList
          bottomSlot={
            <div className="sidebar-stars" aria-hidden="true">
              <div className="icefield" ref={icefieldRef}>
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
            </div>
          }
        />

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
                    subBadge.isPlus
                      ? 'sidebar-profile-plan sidebar-profile-plan--plus'
                      : 'sidebar-profile-plan sidebar-profile-plan--trial'
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
