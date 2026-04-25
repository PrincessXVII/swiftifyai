const YOOKASSA_API = 'https://api.yookassa.ru/v3';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function getBasicAuth(env) {
  const shopId = env.YOOKASSA_SHOP_ID;
  const secret = env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) return null;
  return `Basic ${btoa(`${shopId}:${secret}`)}`;
}

function parseBearer(authorization) {
  if (!authorization) return null;
  return authorization.replace(/^Bearer\s+/i, '').trim() || null;
}

async function getSupabaseUserByAccessToken(env, accessToken) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anon = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon || !accessToken) return null;

  const res = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function yookassaCreatePayment(env, body) {
  const auth = getBasicAuth(env);
  if (!auth) throw new Error('YooKassa is not configured');
  const idempotenceKey = crypto.randomUUID();
  const res = await fetch(`${YOOKASSA_API}/payments`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Idempotence-Key': idempotenceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!res.ok) {
    const message = payload?.description || payload?.error || `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return payload;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!getBasicAuth(env)) {
      return json({ error: 'Оплата временно недоступна.', code: 'BILLING_DISABLED' }, 503);
    }

    const expectedToken = env.BACKEND_AUTH_TOKEN;
    const gotToken = parseBearer(request.headers.get('authorization'));
    if (expectedToken && expectedToken !== gotToken) {
      return json({ error: 'Войдите в аккаунт.', code: 'AUTH_REQUIRED' }, 401);
    }

    const accessToken = request.headers.get('x-supabase-access-token');
    const user = await getSupabaseUserByAccessToken(env, accessToken);
    if (!user?.id) {
      return json({ error: 'Войдите в аккаунт.', code: 'AUTH_REQUIRED' }, 401);
    }

    const reqBody = await request.json().catch(() => ({}));
    const base =
      typeof reqBody?.returnUrl === 'string' && reqBody.returnUrl.trim().length > 0
        ? reqBody.returnUrl.trim()
        : (env.PUBLIC_APP_URL || 'https://swiftifyai.pages.dev').replace(/\/$/, '');
    const sep = base.includes('?') ? '&' : '?';
    const returnUrl = base.includes('payment=') ? base : `${base}${sep}payment=success`;

    const priceRaw = String(env.PLUS_PRICE_RUB || '99').trim().replace(',', '.');
    const amountValue = /^\d+(\.\d{1,2})?$/.test(priceRaw)
      ? (priceRaw.includes('.') ? priceRaw : `${priceRaw}.00`)
      : '99.00';

    const description = env.PLUS_PAYMENT_DESCRIPTION || 'Подписка SwiftifyPlus, 30 дней';
    const payment = await yookassaCreatePayment(env, {
      amount: { value: amountValue, currency: 'RUB' },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: returnUrl,
      },
      description,
      metadata: {
        user_id: user.id,
        kind: 'swiftify_plus_30d',
      },
    });

    const confirmationUrl = payment?.confirmation?.confirmation_url;
    if (!confirmationUrl) {
      return json({ error: 'YooKassa: нет confirmation_url' }, 500);
    }

    return json({ confirmationUrl, paymentId: payment.id });
  } catch (e) {
    const status = e?.status && e.status < 500 ? e.status : 500;
    return json({ error: e?.message || 'Не удалось создать платёж.' }, status);
  }
}

