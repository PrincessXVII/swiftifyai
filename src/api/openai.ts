import { API_BASE_MISSING_CODE, createApiBaseMissingError, getApiBaseUrl } from '../lib/apiBase';
import { getSupabaseClient } from '../lib/supabase';

export type OpenAIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type ChatRequestKind = 'chat' | 'summary';

export type BackendErrorPayload = {
  error?: string;
  code?: string;
  limit?: number;
  used?: number;
  remaining?: number;
};

async function getSupabaseAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) return data.session.access_token;

  // Подхватываем случай, когда локально сессия есть, но access token уже истек.
  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error || !refreshed.session?.access_token) return null;
  return refreshed.session.access_token;
}

export function mapOpenAIError(error: unknown): string {
  const err = error as Error & { status?: number; code?: string; meta?: BackendErrorPayload };
  const status = err?.status;
  const msg = typeof err?.message === 'string' ? err.message.trim() : '';

  if (!navigator.onLine) return 'Нет подключения к интернету. Проверьте соединение.';
  if (err?.code === API_BASE_MISSING_CODE) {
    return 'Сервер чата не подключён: для продакшена в сборке нужен VITE_API_BASE_URL (HTTPS-адрес API).';
  }
  if (/networkerror|failed to fetch|load failed/i.test(msg)) {
    return 'Сервер чата недоступен. Убедитесь, что API с HTTPS указан в VITE_API_BASE_URL и бэкенд запущен (CORS для swiftify.ru).';
  }
  if (status === 401) return msg || 'Войдите в аккаунт.';
  if (status === 400) return msg || 'Запрос отклонён. Проверьте длину сообщения.';
  if (status === 429) return msg || 'Слишком много запросов. Попробуйте позже.';
  if (status && [500, 502, 503].includes(status))
    return msg || 'Сервис временно недоступен. Попробуйте позже.';
  if (msg && !/^HTTP \d+$/.test(msg)) return msg;

  return 'Произошла неизвестная ошибка. Попробуйте ещё раз.';
}

export async function streamChatCompletion(
  messages: OpenAIMessage[],
  modelId: string,
  onChunk: (chunk: string) => void,
  options?: { kind?: ChatRequestKind },
): Promise<void> {
  const apiBase = getApiBaseUrl();
  if (!apiBase) {
    throw createApiBaseMissingError();
  }

  const authToken = import.meta.env.VITE_BACKEND_AUTH_TOKEN;
  const accessToken = await getSupabaseAccessToken();

  if (!accessToken) {
    const err = new Error('Войдите в аккаунт, чтобы отправлять сообщения.') as Error & {
      status?: number;
    };
    err.status = 401;
    throw err;
  }

  const kind = options?.kind ?? 'chat';

  const response = await fetch(`${apiBase}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      'X-Supabase-Access-Token': accessToken,
    },
    body: JSON.stringify({ messages, modelId, kind }),
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    let meta: BackendErrorPayload | undefined;
    try {
      const j = (await response.json()) as BackendErrorPayload;
      meta = j;
      if (typeof j.error === 'string' && j.error.length > 0) message = j.error;
    } catch {
      /* ignore */
    }
    const error = new Error(message) as Error & { status?: number; code?: string; meta?: BackendErrorPayload };
    error.status = response.status;
    if (meta?.code) error.code = meta.code;
    if (meta) error.meta = meta;
    throw error;
  }

  if (!response.body) {
    const error = new Error('No response body') as Error & { status?: number };
    error.status = 500;
    throw error;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      const line = event
        .split('\n')
        .find((row) => row.startsWith('data: '))
        ?.slice(6);
      if (!line) continue;
      if (line === '[DONE]') return;
      const parsed = JSON.parse(line) as { content?: string; error?: string; status?: number };
      if (parsed.error) {
        const err = new Error(parsed.error) as Error & { status?: number };
        err.status = parsed.status ?? 500;
        throw err;
      }
      if (parsed.content) onChunk(parsed.content);
    }
  }
}
