import { randomUUID } from 'node:crypto';

const API = 'https://api.yookassa.ru/v3';

function authHeader() {
  const shopId = process.env.YOOKASSA_SHOP_ID;
  const secret = process.env.YOOKASSA_SECRET_KEY;
  if (!shopId || !secret) return null;
  const token = Buffer.from(`${shopId}:${secret}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

export function isYookassaConfigured() {
  return Boolean(process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY);
}

/**
 * @param {string} method
 * @param {string} path
 * @param {object | null} body
 */
export async function yookassaRequest(method, path, body = null) {
  const auth = authHeader();
  if (!auth) throw new Error('YooKassa is not configured');

  const headers = { Authorization: auth };
  if (method !== 'GET' && method !== 'HEAD') {
    headers['Idempotence-Key'] = randomUUID();
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(json?.description || json?.error || text || `HTTP ${res.status}`);
    err.status = res.status;
    err.details = json;
    throw err;
  }
  return json;
}

/**
 * @param {{ userId: string, returnUrl: string }} opts
 */
export async function createPlusPayment({ userId, returnUrl }) {
  const priceRub = process.env.PLUS_PRICE_RUB || '99';
  const value = /^\d+([.,]\d{1,2})?$/.test(String(priceRub).trim())
    ? String(priceRub).trim().replace(',', '.')
    : '99.00';
  const hasDecimals = value.includes('.');
  const amountValue = hasDecimals ? value : `${value}.00`;

  const description = process.env.PLUS_PAYMENT_DESCRIPTION || 'Подписка SwiftifyPlus, 30 дней';

  const payment = await yookassaRequest('POST', '/payments', {
    amount: { value: amountValue, currency: 'RUB' },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: returnUrl,
    },
    description,
    metadata: {
      user_id: userId,
      kind: 'swiftify_plus_30d',
    },
  });

  const confirmationUrl = payment?.confirmation?.confirmation_url;
  if (!confirmationUrl) {
    const err = new Error('YooKassa: нет confirmation_url');
    err.details = payment;
    throw err;
  }

  return {
    paymentId: payment.id,
    confirmationUrl,
  };
}

/**
 * Подтверждение статуса платежа напрямую в API (защита от поддельных webhook).
 * @param {string} paymentId
 */
export async function fetchPayment(paymentId) {
  return yookassaRequest('GET', `/payments/${paymentId}`, null);
}
