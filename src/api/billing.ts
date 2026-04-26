import { createApiBaseMissingError, getApiBaseUrl } from '../lib/apiBase';
import { getSupabaseClient } from '../lib/supabase';

function getBillingApiBaseUrl(): string {
  const raw = import.meta.env.VITE_BILLING_API_BASE_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');

  // Платежные функции живут в Cloudflare Pages (`/functions/api/**`), поэтому
  // в браузере приоритетно используем same-origin, даже если общий API вынесен отдельно.
  if (typeof window !== 'undefined') return '';

  const apiBase = getApiBaseUrl();
  if (!apiBase) throw createApiBaseMissingError();
  return apiBase;
}

export async function createYookassaPlusPayment(returnUrl: string): Promise<{ confirmationUrl: string }> {
  const apiBase = getBillingApiBaseUrl();
  const authToken = import.meta.env.VITE_BACKEND_AUTH_TOKEN;
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase не настроен');
  }
  const { data } = await supabase.auth.getSession();
  let accessToken = data.session?.access_token ?? null;
  if (!accessToken) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (!error) accessToken = refreshed.session?.access_token ?? null;
  }
  if (!accessToken) {
    throw new Error('Войдите в аккаунт');
  }

  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch(`${apiBase}/api/billing/yookassa/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        'X-Supabase-Access-Token': accessToken,
      },
      body: JSON.stringify({ returnUrl }),
      signal: ctrl.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('Сервер оплаты не отвечает. Проверьте деплой Pages Functions и VITE_BILLING_API_BASE_URL.');
    }
    throw e;
  } finally {
    window.clearTimeout(timer);
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const j = (await response.json()) as { error?: string };
      if (typeof j.error === 'string' && j.error.length > 0) message = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return response.json() as Promise<{ confirmationUrl: string }>;
}
