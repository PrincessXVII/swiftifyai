import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
/** Сумма символов пользовательского ввода за UTC-день (пробный тариф). */
const USAGE_PATH = path.join(DATA_DIR, 'trial-daily-chars.json');

function todayKeyUtc() {
  return new Date().toISOString().slice(0, 10);
}

function pruneOldDates(store) {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 4);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  for (const userId of Object.keys(store)) {
    const days = store[userId];
    if (!days || typeof days !== 'object') {
      delete store[userId];
      continue;
    }
    for (const d of Object.keys(days)) {
      if (d < cutoffStr) delete days[d];
    }
    if (Object.keys(days).length === 0) delete store[userId];
  }
}

async function loadStore() {
  try {
    const raw = await fs.readFile(USAGE_PATH, 'utf8');
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

async function saveStore(store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(USAGE_PATH, JSON.stringify(store), 'utf8');
}

/**
 * @param {string} userId
 * @param {number} dailyLimitChars
 */
export async function getDailyCharUsage(userId, dailyLimitChars) {
  const store = await loadStore();
  const day = todayKeyUtc();
  const used = store[userId]?.[day] ?? 0;
  const remaining = Math.max(0, dailyLimitChars - used);
  return {
    used,
    remaining,
    limit: dailyLimitChars,
    allowed: used < dailyLimitChars,
  };
}

/**
 * @param {string} userId
 * @param {number} charCount
 */
export async function recordTrialChars(userId, charCount) {
  if (charCount <= 0) return;
  const store = await loadStore();
  const day = todayKeyUtc();
  if (!store[userId]) store[userId] = {};
  store[userId][day] = (store[userId][day] ?? 0) + charCount;
  pruneOldDates(store);
  await saveStore(store);
}
