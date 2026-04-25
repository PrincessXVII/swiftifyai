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

async function fetchYookassaPayment(env, paymentId) {
  const auth = getBasicAuth(env);
  if (!auth) throw new Error('YooKassa is not configured');
  const res = await fetch(`${YOOKASSA_API}/payments/${paymentId}`, {
    headers: { Authorization: auth },
  });
  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(payload?.description || payload?.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return payload;
}

function plusPeriodMs(env) {
  const days = Number(env.PLUS_PERIOD_DAYS || 30);
  return (Number.isFinite(days) && days > 0 ? days : 30) * 24 * 60 * 60 * 1000;
}

async function getSupabaseUserById(env, userId) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return { user: null, error: 'service role is missing' };

  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
    },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) return { user: null, error: payload?.msg || `HTTP ${res.status}` };
  return { user: payload, error: null };
}

async function updateSupabaseUserAppMetadata(env, userId, appMetadata) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return { error: 'service role is missing' };
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      apikey: service,
      Authorization: `Bearer ${service}`,
    },
    body: JSON.stringify({ app_metadata: appMetadata }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) return { error: payload?.msg || `HTTP ${res.status}` };
  return { error: null };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const bodyText = await request.text();
    let payload = {};
    try {
      payload = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      return new Response('invalid json', { status: 400 });
    }

    const paymentId = payload?.object?.id;
    if (!paymentId) return json({ ok: true, ignored: true });

    const payment = await fetchYookassaPayment(env, paymentId);
    if (payment.status !== 'succeeded') {
      return json({ ok: true, ignored: true, status: payment.status });
    }

    const userId = payment?.metadata?.user_id;
    const kind = payment?.metadata?.kind;
    if (!userId || kind !== 'swiftify_plus_30d') {
      return json({ ok: true, ignored: true });
    }

    const { user, error: userError } = await getSupabaseUserById(env, userId);
    if (userError || !user?.id) {
      return json({ ok: true, ignored: true, reason: 'user_not_found' });
    }

    const app = { ...(user.app_metadata || {}) };
    if (app.plus_last_yookassa_payment_id === payment.id) {
      return json({ ok: true, duplicate: true });
    }

    let base = Date.now();
    const existing = app.plus_expires_at;
    if (typeof existing === 'string' && existing.length > 0) {
      const t = Date.parse(existing);
      if (!Number.isNaN(t) && t > base) base = t;
    }
    const newExpires = new Date(base + plusPeriodMs(env)).toISOString();

    const { error: updateError } = await updateSupabaseUserAppMetadata(env, userId, {
      ...app,
      swiftify_plus: true,
      plus_expires_at: newExpires,
      plus_last_yookassa_payment_id: payment.id,
    });
    if (updateError) return json({ error: updateError }, 500);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e?.message || 'webhook failed' }, 500);
  }
}

