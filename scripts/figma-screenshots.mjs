/**
 * Скриншоты UI для переноса в Figma.
 * Полный цикл: npm run figma:export (build + preview + снимки → figma-export/)
 * Только снимки при уже запущенном preview: PREVIEW_URL=http://127.0.0.1:4173 node scripts/figma-screenshots.mjs
 */
import { spawn } from 'child_process';
import { chromium } from 'playwright';
import { mkdir, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'figma-export');
const BASE = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForPreview(url, maxMs = 90_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) return;
    } catch {
      /* server not ready */
    }
    await delay(400);
  }
  throw new Error(`Не дождались preview: ${url}`);
}

/** @param {() => Promise<void>} fn */
async function withLocalPreview(fn) {
  if (process.env.PREVIEW_URL) {
    await fn();
    return;
  }
  const child = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  });
  try {
    await waitForPreview(BASE);
    await fn();
  } finally {
    child.kill('SIGTERM');
    await delay(300);
  }
}

async function clearStorage(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
}

async function captureAll() {
  await rm(OUT, { recursive: true }).catch(() => {});
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();

  async function shot(page, name, fullPage = false) {
    const path = join(OUT, name);
    await page.screenshot({ path, fullPage });
    return path;
  }

  // —— Desktop 1440 × 900 ——
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await clearStorage(page);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await delay(800);
    await shot(page, '01-desktop-welcome-1440.png');

    await page.getByRole('button', { name: 'Начать' }).click();
    await delay(600);
    await shot(page, '02-desktop-chat-empty-1440.png');

    const accountDesktop = page.getByRole('button', { name: 'Личный кабинет' });
    if (await accountDesktop.isVisible().catch(() => false)) {
      await accountDesktop.click();
      await delay(500);
      await shot(page, '03-desktop-account-1440.png', true);
    } else {
      console.warn(
        '[figma-screenshots] Нет кнопки «Личный кабинет» (нужен Supabase + вход). Экран 03 пропущен.',
      );
    }

    await context.close();
  }

  // —— Mobile 390 × 844 ——
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await clearStorage(page);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await delay(800);
    await shot(page, '04-mobile-welcome-390.png');

    await page.getByRole('button', { name: 'Начать' }).click();
    await delay(600);
    await shot(page, '05-mobile-chat-empty-390.png');

    await page.getByRole('button', { name: 'Открыть меню' }).click();
    await delay(400);
    await shot(page, '06-mobile-sidebar-open-390.png', true);

    const accountMobile = page.getByRole('button', { name: 'Личный кабинет' });
    if (await accountMobile.isVisible().catch(() => false)) {
      await accountMobile.click();
      await delay(400);
      await shot(page, '07-mobile-account-390.png', true);
    } else {
      console.warn(
        '[figma-screenshots] Экран 07 (моб. ЛК) пропущен — нет входа в Supabase.',
      );
    }

    await context.close();
  }

  await browser.close();
  console.log(`Готово: ${OUT}`);
}

async function main() {
  await withLocalPreview(captureAll);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
