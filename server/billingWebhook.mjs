import { getSupabaseAdmin } from './supabaseAdmin.mjs';
import { fetchPayment } from './yookassa.mjs';

function plusPeriodMs() {
  const days = Number(process.env.PLUS_PERIOD_DAYS || 30);
  return (Number.isFinite(days) && days > 0 ? days : 30) * 24 * 60 * 60 * 1000;
}

/**
 * Express handler: raw body в req.body (Buffer).
 */
export async function handleYookassaWebhook(req, res) {
  let payload;
  try {
    const raw = req.body;
    const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw ?? '');
    payload = text ? JSON.parse(text) : {};
  } catch {
    res.status(400).send('invalid json');
    return;
  }

  const obj = payload.object;
  const paymentId = obj?.id;
  if (!paymentId) {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  let payment;
  try {
    payment = await fetchPayment(paymentId);
  } catch (e) {
    console.error('[yookassa] fetchPayment', e);
    res.status(500).json({ error: 'verify failed' });
    return;
  }

  if (payment.status !== 'succeeded') {
    res.status(200).json({ ok: true, ignored: true, status: payment.status });
    return;
  }

  const userId = payment.metadata?.user_id;
  const kind = payment.metadata?.kind;
  if (!userId || kind !== 'swiftify_plus_30d') {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error('[billing] SUPABASE_SERVICE_ROLE_KEY is not set');
    res.status(500).json({ error: 'server misconfigured' });
    return;
  }

  const { data: userData, error: getErr } = await admin.auth.admin.getUserById(userId);
  if (getErr || !userData?.user) {
    console.error('[billing] getUserById', getErr);
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  const u = userData.user;
  const app = { ...(u.app_metadata ?? {}) };

  let base = Date.now();
  const existing = app.plus_expires_at;
  if (typeof existing === 'string' && existing.length > 0) {
    const t = Date.parse(existing);
    if (!Number.isNaN(t) && t > base) base = t;
  }
  const newExpires = new Date(base + plusPeriodMs()).toISOString();

  const { error: upErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...app,
      swiftify_plus: true,
      plus_expires_at: newExpires,
      plus_last_yookassa_payment_id: payment.id,
    },
  });

  if (upErr) {
    console.error('[billing] updateUser', upErr);
    res.status(500).json({ error: upErr.message });
    return;
  }

  res.status(200).json({ ok: true });
}
