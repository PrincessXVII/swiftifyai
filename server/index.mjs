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
const ATTACHMENT_MARKER_OPEN = '[SWIFTIFY_ATTACHMENTS]';
const ATTACHMENT_MARKER_CLOSE = '[/SWIFTIFY_ATTACHMENTS]';

const yandexModelUris = {
  'yandex-auto': '',
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

function pickAutoModelId(messages, kind) {
  if (kind === 'summary') return 'yandex-pro';
  if (!Array.isArray(messages) || messages.length === 0) return 'yandex-balanced';

  const lastUser = [...messages].reverse().find((m) => m?.role === 'user');
  const text = String(lastUser?.content || '');
  const lower = text.toLowerCase();
  const len = text.length;

  const hasCodeSignals =
    /```|stack|trace|exception|error|bug|refactor|typescript|javascript|python|sql|regex|api|endpoint|json|\bclass\b|\bfunction\b/i.test(
      text,
    ) ||
    /код|ошибк|баг|рефактор|скрипт|запрос|эндпоинт|регекс|стек|трейс|компил|типизац|ts|js/.test(lower);

  const hasDeepAnalysisSignals =
    /сравни|проанализ|архитект|подроб|деталь|стратег|пошаг|объясни почему|trade[- ]?off|design|analysis|plan/i.test(
      lower,
    ) || len > 900;

  const hasQuickTaskSignals =
    /кратк|коротк|в 1-2|одной строк|быстро|quick|tl;dr|сжато|списком до|до 3 пункт/i.test(lower) ||
    len < 140;

  const hasCreativeSignals =
    /придумай|креатив|слоган|назван|иде[яй]|пост для|реклам|сценарий|tone of voice|brainstorm/i.test(
      lower,
    );

  const hasRewriteOrTranslateSignals =
    /перевед|rewrite|перепиш|улучши текст|исправь граммат|сделай вежлив/i.test(lower);

  if (hasCodeSignals || hasDeepAnalysisSignals) return 'yandex-pro';
  if (hasCreativeSignals) return 'yandex-pro';
  if (hasRewriteOrTranslateSignals && len < 700) return 'yandex-fast';
  if (hasQuickTaskSignals) return 'yandex-fast';
  return 'yandex-balanced';
}

function resolveRequestedModelId(modelId, messages, kind) {
  const requested = typeof modelId === 'string' ? modelId.trim() : '';
  if (!requested || requested === 'yandex-auto') return pickAutoModelId(messages, kind);
  if (requested in yandexModelUris) return requested;
  return pickAutoModelId(messages, kind);
}

function parseAttachmentsFromContent(content) {
  const raw = String(content || '');
  const start = raw.indexOf(ATTACHMENT_MARKER_OPEN);
  if (start < 0) return { clean: raw, images: [] };
  const end = raw.indexOf(ATTACHMENT_MARKER_CLOSE);
  if (end < 0 || end <= start) {
    return { clean: raw.slice(0, start).trim(), images: [] };
  }

  const jsonPart = raw.slice(start + ATTACHMENT_MARKER_OPEN.length, end).trim();
  let images = [];
  try {
    const parsed = JSON.parse(jsonPart);
    if (Array.isArray(parsed?.images)) {
      images = parsed.images
        .filter((i) => typeof i?.base64 === 'string' && typeof i?.name === 'string')
        .slice(0, 3);
    }
  } catch {
    /* ignore invalid attachment payload */
  }

  const clean = `${raw.slice(0, start)}${raw.slice(end + ATTACHMENT_MARKER_CLOSE.length)}`.trim();
  return { clean, images };
}

async function recognizeImageText(base64Content) {
  if (!yandexFolderId || !yandexApiKey) return '';
  const response = await fetch('https://vision.api.cloud.yandex.net/vision/v1/batchAnalyze', {
    method: 'POST',
    headers: {
      Authorization: `Api-Key ${yandexApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      folderId: yandexFolderId,
      analyze_specs: [
        {
          content: base64Content,
          features: [{ type: 'TEXT_DETECTION', text_detection_config: { language_codes: ['ru', 'en'] } }],
        },
      ],
    }),
  });

  if (!response.ok) {
    return '';
  }

  const payload = await response.json();
  const texts = [];
  const results = payload?.results ?? [];
  for (const result of results) {
    const inner = result?.results ?? [];
    for (const item of inner) {
      const pages = item?.textDetection?.pages ?? item?.text_detection?.pages ?? [];
      for (const page of pages) {
        const blocks = page?.blocks ?? [];
        for (const block of blocks) {
          const lines = block?.lines ?? [];
          for (const line of lines) {
            const words = line?.words ?? [];
            const lineText = words.map((w) => w?.text).filter(Boolean).join(' ').trim();
            if (lineText) texts.push(lineText);
          }
        }
      }
    }
  }
  return texts.join('\n').trim();
}

async function injectImageOcrIntoMessages(messages) {
  if (!Array.isArray(messages)) return [];
  const copy = messages.map((m) => ({ ...m, content: String(m?.content || '') }));
  const lastIdx = copy.map((m) => m.role).lastIndexOf('user');
  if (lastIdx < 0) return copy;

  const { clean, images } = parseAttachmentsFromContent(copy[lastIdx].content);
  copy[lastIdx].content = clean;
  if (images.length === 0) return copy;

  const ocrParts = [];
  for (const img of images) {
    try {
      const text = await recognizeImageText(img.base64);
      if (text) {
        ocrParts.push(`[Изображение: ${img.name}]\nРаспознанный текст:\n${text}`);
      } else {
        ocrParts.push(`[Изображение: ${img.name}]\nТекст не распознан.`);
      }
    } catch {
      ocrParts.push(`[Изображение: ${img.name}]\nОшибка распознавания.`);
    }
  }

  if (ocrParts.length > 0) {
    copy[lastIdx].content = `${copy[lastIdx].content}\n\n${ocrParts.join('\n\n')}`.trim();
  }
  return copy;
}

function completionOptionsForModel(modelId) {
  if (modelId === 'yandex-fast') {
    return { stream: false, temperature: 0.35, maxTokens: '1200' };
  }
  if (modelId === 'yandex-pro') {
    return { stream: false, temperature: 0.5, maxTokens: '2600' };
  }
  return { stream: false, temperature: 0.6, maxTokens: '2000' };
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
    return parseAttachmentsFromContent(last.content ?? '').clean.length;
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
  const normalizedMessages = await injectImageOcrIntoMessages(messages);
  const charCost = charCostForRequest(normalizedMessages);

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

  const sanitizedMessages = sanitizeMessages(normalizedMessages, kind);
  const selectedModelId = resolveRequestedModelId(modelId, messages, kind);
  const targetModelUri = resolveYandexModelUri(selectedModelId);
  const completionOptions = completionOptionsForModel(selectedModelId);

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Selected-Model-Id', selectedModelId);

  try {
    const yandexResponse = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        Authorization: `Api-Key ${yandexApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modelUri: targetModelUri,
        completionOptions,
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
