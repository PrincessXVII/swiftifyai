/**
 * Базовый URL бэкенда. Для страницы по HTTPS нельзя подставлять localhost:
 * браузер покажет запрос доступа к локальной сети (Chrome Local Network Access) и запрос всё равно не сработает.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  if (raw) {
    const normalized = raw.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      try {
        const url = new URL(normalized, window.location.origin);
        const host = url.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
          // На проде localhost-ноды недоступны из браузера — используем same-origin /api.
          return '';
        }
      } catch {
        // ignore invalid URL and keep as-is below
      }
    }
    return normalized;
  }

  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return '';
  }

  return 'http://localhost:8787';
}

export const API_BASE_MISSING_CODE = 'API_BASE_MISSING' as const;

export function createApiBaseMissingError(): Error & { code: typeof API_BASE_MISSING_CODE } {
  const err = new Error('API_BASE_MISSING') as Error & { code: typeof API_BASE_MISSING_CODE };
  err.code = API_BASE_MISSING_CODE;
  return err;
}
