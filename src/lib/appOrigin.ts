/**
 * Базовый URL приложения для OAuth (redirect после Google/GitHub и т.д.).
 * В проде задайте VITE_SITE_URL=https://ваш-домен.ru — тогда редирект всегда на домен,
 * даже если сборка открыта иначе. Локально не задавайте — будет window.location.origin.
 */
function isLocalhostOrigin(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function getAppOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const live = window.location.origin;
    // Не уводим прод-пользователя на localhost, если VITE_SITE_URL случайно от dev.
    if (fromEnv && isLocalhostOrigin(fromEnv) && !isLocalhostOrigin(live)) {
      return live;
    }
  }
  if (fromEnv) return fromEnv;
  return typeof window !== 'undefined' ? window.location.origin : '';
}
