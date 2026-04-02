/**
 * Базовый URL приложения для OAuth (redirect после Google/GitHub и т.д.).
 * В проде задайте VITE_SITE_URL=https://ваш-домен.ru — тогда редирект всегда на домен,
 * даже если сборка открыта иначе. Локально не задавайте — будет window.location.origin.
 */
export function getAppOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return typeof window !== 'undefined' ? window.location.origin : '';
}
