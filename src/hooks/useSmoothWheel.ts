import { useEffect } from 'react';

type ScrollState = {
  current: number;
  target: number;
  rafId: number | null;
};

const SCROLLABLE_OVERFLOW_RE = /(auto|scroll|overlay)/;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const editable = target.closest('input, textarea, select, [contenteditable="true"]');
  return Boolean(editable);
}

function normalizeDeltaY(event: WheelEvent): number {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

function canScrollInDirection(el: HTMLElement, deltaY: number): boolean {
  const style = window.getComputedStyle(el);
  if (!SCROLLABLE_OVERFLOW_RE.test(style.overflowY)) return false;
  if (el.scrollHeight <= el.clientHeight + 1) return false;
  const atTop = el.scrollTop <= 0;
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
  if (deltaY < 0) return !atTop;
  if (deltaY > 0) return !atBottom;
  return false;
}

/** Основной чат и список чатов в сайдбаре — явный поиск, без обхода по overflow. */
function resolveScrollRoot(target: Element | null, deltaY: number): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const chat = target.closest('.chat-scroll');
  if (chat instanceof HTMLElement && canScrollInDirection(chat, deltaY)) return chat;
  const list = target.closest('.chat-list');
  if (list instanceof HTMLElement && canScrollInDirection(list, deltaY)) return list;
  return null;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isMobileWidth(): boolean {
  return window.matchMedia('(max-width: 767px)').matches;
}

export function useSmoothWheel() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const states = new WeakMap<HTMLElement, ScrollState>();

    const ensureState = (el: HTMLElement): ScrollState => {
      const existing = states.get(el);
      if (existing) return existing;

      const state: ScrollState = {
        current: el.scrollTop,
        target: el.scrollTop,
        rafId: null,
      };
      states.set(el, state);
      return state;
    };

    const animate = (el: HTMLElement, state: ScrollState) => {
      const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
      state.target = clamp(state.target, 0, maxTop);
      state.current += (state.target - state.current) * 0.12;

      if (Math.abs(state.target - state.current) < 0.35) {
        state.current = state.target;
      }

      el.scrollTop = state.current;

      if (Math.abs(state.target - state.current) < 0.35) {
        state.rafId = null;
        return;
      }

      state.rafId = window.requestAnimationFrame(() => animate(el, state));
    };

    const onWheel = (event: WheelEvent) => {
      if (isMobileWidth()) return;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (Math.abs(event.deltaY) < 0.1 || event.shiftKey) return;
      if (isEditableTarget(event.target)) return;

      const target = event.target instanceof Element ? event.target : null;
      const scrollable = resolveScrollRoot(target, event.deltaY);
      if (!scrollable || scrollable.dataset.smoothWheel === 'off') return;

      const delta = normalizeDeltaY(event);
      const speed = Math.abs(delta) > 40 ? 0.95 : 0.78;

      event.preventDefault();

      const state = ensureState(scrollable);
      if (state.rafId === null) {
        state.current = scrollable.scrollTop;
        state.target = scrollable.scrollTop;
      }

      const maxTop = Math.max(0, scrollable.scrollHeight - scrollable.clientHeight);
      state.target = clamp(state.target + delta * speed, 0, maxTop);

      if (state.rafId === null) {
        state.rafId = window.requestAnimationFrame(() => animate(scrollable, state));
      }
    };

    const opts: AddEventListenerOptions = { passive: false, capture: true };
    window.addEventListener('wheel', onWheel, opts);
    return () => window.removeEventListener('wheel', onWheel, opts);
  }, []);
}
