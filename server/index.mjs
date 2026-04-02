import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import { getDailyCharUsage, recordTrialChars } from './dailyUsage.mjs';

const app = express();
const port = Number(process.env.PORT || 8787);
const yandexApiKey = process.env.YANDEX_API_KEY;
const yandexFolderId = process.env.YANDEX_FOLDER_ID;
const yandexModelUri =
  process.env.YANDEX_MODEL_URI || (yandexFolderId ? `gpt://${yandexFolderId}/yandexgpt-lite` : '');

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

/** Дублирует логику `src/lib/userProfile.ts` — Pro без дневного лимита символов. */
function hasSwiftifyPro(user) {
  const meta = user.user_metadata ?? {};
  const app = user.app_metadata ?? {};
  if (meta.swiftify_pro === true || app.swiftify_pro === true) return true;
  if (meta.plan === 'pro' || meta.subscription === 'pro') return true;
  if (app.plan === 'pro' || app.subscription === 'pro') return true;
  return false;
}

if (!yandexApiKey || !yandexModelUri) {
  console.error('YANDEX_API_KEY and YANDEX_FOLDER_ID (or YANDEX_MODEL_URI) are required');
  process.exit(1);
}

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Supabase-Access-Token'],
  }),
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

  const isPro = hasSwiftifyPro(user);
  const charCost = charCostForRequest(messages);

  if (!isPro) {
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
        modelUri: yandexModelUri,
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
    if (!isPro && charCost > 0) {
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
    `Пробный тариф: до ${TRIAL_DAILY_CHARS} символов в день (по последнему пользовательскому сообщению); SwiftifyPro — без лимита.`,
  );
});
