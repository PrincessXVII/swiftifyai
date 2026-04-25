import { createApiBaseMissingError, getApiBaseUrl } from '../lib/apiBase';
import { getSupabaseClient } from '../lib/supabase';

export async function createYookassaPlusPayment(returnUrl: string): Promise<{ confirmationUrl: string }> {
  const apiBase = getApiBaseUrl();
  if (!apiBase && typeof window === 'undefined') throw createApiBaseMissingError();
  const authToken = import.meta.env.VITE_BACKEND_AUTH_TOKEN;
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase не настроен');
  }
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error('Войдите в аккаунт');
  }

  const response = await fetch(`${apiBase}/api/billing/yookassa/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      'X-Supabase-Access-Token': accessToken,
    },
    body: JSON.stringify({ returnUrl }),
  });

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
