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

function findScrollableParent(start: Element | null, deltaY: number): HTMLElement | null {
  let node: Element | null = start;

  while (node) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const canOverflow = SCROLLABLE_OVERFLOW_RE.test(style.overflowY);
      const canScroll = node.scrollHeight > node.clientHeight + 1;
      if (canOverflow && canScroll) {
        const atTop = node.scrollTop <= 0;
        const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
        if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) {
          return node;
        }
      }
    }
    node = node.parentElement;
  }

  return null;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useSmoothWheel() {
  useEffect(() => {
    /* Тач-скролл не шлёт wheel — плавность там нативная. Отключаем только при reduced motion. */
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
      state.current += (state.target - state.current) * 0.16;

      if (Math.abs(state.target - state.current) < 0.4) {
        state.current = state.target;
      }

      el.scrollTop = state.current;

      if (Math.abs(state.target - state.current) < 0.4) {
        state.rafId = null;
        return;
      }

      state.rafId = window.requestAnimationFrame(() => animate(el, state));
    };

    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (Math.abs(event.deltaY) < 0.1 || event.shiftKey) return;
      if (isEditableTarget(event.target)) return;

      const target = event.target instanceof Element ? event.target : null;
      const scrollable = findScrollableParent(target, event.deltaY);
      if (!scrollable || scrollable.dataset.smoothWheel === 'off') return;

      const delta = normalizeDeltaY(event);
      const speed = Math.abs(delta) > 40 ? 0.9 : 0.72;

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

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', onWheel, true);
  }, []);
}
