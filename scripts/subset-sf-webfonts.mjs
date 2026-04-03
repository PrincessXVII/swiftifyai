/**
 * Собирает WOFF2 из OTF в public/fonts/* (Latin-1 + кириллица для RU/EN UI).
 * Запуск: npm run fonts:subset  (нужны исходные .otf рядом со скриптом sync-sf-fonts)
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import subsetFont from 'subset-font';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

/** Диапазоны: ASCII печатные, Latin-1 доп., кириллица */
function buildSubsetText() {
  let s = '';
  for (let cp = 0x20; cp <= 0x7e; cp++) s += String.fromCodePoint(cp);
  for (let cp = 0xa0; cp <= 0xff; cp++) s += String.fromCodePoint(cp);
  for (let cp = 0x400; cp <= 0x4ff; cp++) s += String.fromCodePoint(cp);
  return s;
}

const SUBSET_TEXT = buildSubsetText();

async function convertFile(otfPath) {
  const buf = await fs.readFile(otfPath);
  const outPath = otfPath.replace(/\.otf$/i, '.woff2');
  const out = await subsetFont(buf, SUBSET_TEXT, { targetFormat: 'woff2' });
  await fs.writeFile(outPath, out);
  const inBytes = buf.length;
  const outBytes = out.length;
  console.log(
    `${path.basename(otfPath)} → ${path.basename(outPath)}  ${(inBytes / 1024 / 1024).toFixed(1)} MiB → ${(outBytes / 1024).toFixed(1)} KiB`,
  );
}

async function main() {
  const dirs = [path.join(ROOT, 'public/fonts/sf-compact'), path.join(ROOT, 'public/fonts/sf-pro')];
  let count = 0;
  for (const dir of dirs) {
    let entries;
    try {
      entries = await fs.readdir(dir);
    } catch (e) {
      console.warn(`Пропуск ${dir}: ${e.message}`);
      continue;
    }
    for (const name of entries) {
      if (!name.toLowerCase().endsWith('.otf')) continue;
      await convertFile(path.join(dir, name));
      count++;
    }
  }
  if (count === 0) {
    console.warn('Не найдено ни одного .otf в public/fonts/sf-compact и public/fonts/sf-pro');
    process.exitCode = 1;
    return;
  }
  console.log(`Готово: ${count} файлов`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
