import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { handleYookassaWebhook } from './billingWebhook.mjs';
import { getDailyCharUsage, recordTrialChars } from './dailyUsage.mjs';
import { userHasPlusAccess } from './subscription.mjs';
import { createPlusPayment, isYookassaConfigured } from './yookassa.mjs';

const app = express();
const port = Number(process.env.PORT || 8787);
const yandexApiKey = process.env.YANDEX_API_KEY;
const yandexFolderId = process.env.YANDEX_FOLDER_ID;
const yandexModelUri =
  process.env.YANDEX_MODEL_URI || (yandexFolderId ? `gpt://${yandexFolderId}/yandexgpt-lite` : '');

const yandexModelUris = {
  'yandex-fast':
    process.env.YANDEX_MODEL_URI_FAST ||
    process.env.YANDEX_MODEL_URI_LITE ||
    (yandexFolderId ? `gpt://${yandexFolderId}/yandexgpt-lite` : ''),
  'yandex-balanced':
    process.env.YANDEX_MODEL_URI_BALANCED ||
    process.env.YANDEX_MODEL_URI_DEFAULT ||
    process.env.YANDEX_MODEL_URI ||
    (yandexFolderId ? `gpt://${yandexFolderId}/yandexgpt-lite` : ''),
  'yandex-pro':
    process.env.YANDEX_MODEL_URI_PRO ||
    process.env.YANDEX_MODEL_URI_ADVANCED ||
    (yandexFolderId ? `gpt://${yandexFolderId}/yandexgpt/latest` : ''),
};

function resolveYandexModelUri(modelId) {
  const fromMap = yandexModelUris[modelId];
  if (typeof fromMap === 'string' && fromMap.trim()) return fromMap.trim();
  return yandexModelUri;
}

/** Пробный тариф: суммарно не больше стольки символов пользовательского ввода за UTC-день. */
const TRIAL_DAILY_CHARS = Number(process.env.TRIAL_DAILY_CHARS || 5000);
/** Верхняя граница длины одного поля при отправке в Yandex (защита от перегрузки). */
const MAX_FIELD_CHARS = Number(process.env.MAX_FIELD_CHARS || 32000);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

let supabaseClient = null;
function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

const hasAnyYandexModelUri = Boolean(
  yandexModelUri ||
    yandexModelUris['yandex-fast'] ||
    yandexModelUris['yandex-balanced'] ||
    yandexModelUris['yandex-pro'],
);

if (!yandexApiKey || !hasAnyYandexModelUri) {
  console.error(
    'YANDEX_API_KEY and at least one Yandex model URI are required (YANDEX_FOLDER_ID or YANDEX_MODEL_URI_*).',
  );
  process.exit(1);
}

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Supabase-Access-Token'],
  }),
);

app.post(
  '/api/billing/yookassa/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    void handleYookassaWebhook(req, res).catch(next);
  },
);

app.use(express.json({ limit: '1mb' }));

app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_PER_HOUR || 300),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много запросов с этого адреса. Попробуйте позже.' },
  }),
);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

async function requireSupabaseUser(req) {
  const expectedToken = process.env.BACKEND_AUTH_TOKEN;
  const receivedToken = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (expectedToken && expectedToken !== receivedToken) {
    return { error: 'unauthorized', status: 401 };
  }
  const accessToken = req.header('x-supabase-access-token');
  const supabase = getSupabase();
  if (!supabase || !accessToken) {
    return { error: 'auth', status: 401 };
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    return { error: 'invalid', status: 401 };
  }
  return { user };
}

app.post('/api/billing/yookassa/create', async (req, res) => {
  try {
    if (!isYookassaConfigured()) {
      res.status(503).json({ error: 'Оплата временно недоступна.', code: 'BILLING_DISABLED' });
      return;
    }
    const auth = await requireSupabaseUser(req);
    if (auth.error) {
      res.status(auth.status).json({
        error: 'Войдите в аккаунт.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const base =
      typeof req.body?.returnUrl === 'string' && req.body.returnUrl.trim().length > 0
        ? req.body.returnUrl.trim()
        : (process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, '');
    const sep = base.includes('?') ? '&' : '?';
    const returnUrl = base.includes('payment=') ? base : `${base}${sep}payment=success`;

    const { confirmationUrl, paymentId } = await createPlusPayment({
      userId: auth.user.id,
      returnUrl,
    });
    res.json({ confirmationUrl, paymentId });
  } catch (e) {
    console.error('[billing] create', e);
    const status = e?.status && e.status < 500 ? e.status : 500;
    res.status(status).json({
      error: e?.message || 'Не удалось создать платёж.',
    });
  }
});

/**
 * Стоимость запроса в символах: длина последнего сообщения пользователя (новый ввод),
 * чтобы не учитывать всю историю при каждом вызове.
 */
function charCostForRequest(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return 0;
  const last = messages[messages.length - 1];
  if (last?.role === 'user') {
    return String(last.content ?? '').length;
  }
  return 0;
}

function sanitizeMessages(messages, kind) {
  const capUser = kind === 'chat' ? MAX_FIELD_CHARS : 16000;
  const capOther = 8000;
  return messages
    .filter((m) => ['user', 'assistant', 'system'].includes(m?.role))
    .map((m) => {
      const raw = String(m.content || '');
      const cap = m.role === 'user' ? capUser : capOther;
      return {
        role: m.role,
        content: raw.slice(0, cap),
      };
    });
}

app.post('/api/chat', async (req, res) => {
  const expectedToken = process.env.BACKEND_AUTH_TOKEN;
  const receivedToken = req.header('authorization')?.replace(/^Bearer\s+/i, '');

  if (expectedToken && expectedToken !== receivedToken) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const accessToken = req.header('x-supabase-access-token');
  const supabase = getSupabase();
  if (!supabase || !accessToken) {
    res.status(401).json({
      error: 'Войдите в аккаунт. Серверу нужен токен Supabase (настройте VITE_SUPABASE_URL в .env для прокси).',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    res.status(401).json({ error: 'Сессия недействительна. Войдите снова.', code: 'AUTH_INVALID' });
    return;
  }

  const { messages, modelId, kind = 'chat' } = req.body ?? {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'Некорректный запрос.' });
    return;
  }

  const isPlus = userHasPlusAccess(user);
  const charCost = charCostForRequest(messages);

  if (!isPlus) {
    if (charCost > TRIAL_DAILY_CHARS) {
      res.status(400).json({
        error: `Одно сообщение не длиннее ${TRIAL_DAILY_CHARS} символов на пробном тарифе. Разбейте текст на части.`,
        code: 'MESSAGE_TOO_LONG',
      });
      return;
    }

    const usage = await getDailyCharUsage(user.id, TRIAL_DAILY_CHARS);
    if (usage.used + charCost > TRIAL_DAILY_CHARS) {
      res.status(429).json({
        error: `Дневной лимит пробного периода: ${TRIAL_DAILY_CHARS} символов. Осталось сегодня: ${usage.remaining}.`,
        code: 'DAILY_CHAR_LIMIT',
        limit: TRIAL_DAILY_CHARS,
        used: usage.used,
        remaining: usage.remaining,
      });
      return;
    }
  }

  const sanitizedMessages = sanitizeMessages(messages, kind);
  const targetModelUri = resolveYandexModelUri(modelId);

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  try {
    const yandexResponse = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        Authorization: `Api-Key ${yandexApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modelUri: targetModelUri,
        completionOptions: {
          stream: false,
          temperature: 0.6,
          maxTokens: '2000',
        },
        messages: sanitizedMessages.map((m) => ({ role: m.role, text: m.content })),
      }),
    });

    if (!yandexResponse.ok) {
      const text = await yandexResponse.text();
      const message = text || `Provider error: HTTP ${yandexResponse.status}`;
      throw Object.assign(new Error(message), { status: yandexResponse.status || 500 });
    }

    const payload = await yandexResponse.json();
    if (!isPlus && charCost > 0) {
      await recordTrialChars(user.id, charCost);
    }
    const content = payload?.result?.alternatives?.[0]?.message?.text ?? '';
    if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    const status = error?.status || 500;
    const msg = error?.message || 'Provider proxy error';
    if (!res.headersSent) {
      res.status(status).json({ error: msg });
      return;
    }
    res.write(`data: ${JSON.stringify({ error: msg, status })}\n\n`);
    res.end();
  }
});

app.listen(port, () => {
  console.log(`SwiftifyAI proxy listening on http://localhost:${port}`);
  console.log(
    `Пробный тариф: до ${TRIAL_DAILY_CHARS} символов в день (по последнему пользовательскому сообщению); SwiftifyPlus — без лимита.`,
  );
});
