/**
 * check-deps.mjs — предполётная проверка: всё ли на месте, чтобы монтировать видео.
 *
 * Запуск:  node engine/reels/check-deps.mjs
 *
 * Скрипт ничего не устанавливает и никуда не отправляет. Он только смотрит, что есть
 * на машине, и честно говорит, чего не хватает. Если чего-то нет — покажет команду,
 * которой это ставится на вашей системе.
 */

import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { resolveBin } from './lib/bin.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));   // папка engine/
const WIN = process.platform === 'win32';

// Ключи лежат в engine/.env. Путь считаем от самого скрипта, а не от папки запуска:
// иначе один лишний `cd` — и проверка врёт, что ключей нет, хотя они на месте.
dotenv.config({ path: path.join(ROOT, '.env') });

/** Без этого монтаж не поедет. */
const REQUIRED = {
  ffmpeg: WIN ? 'winget install Gyan.FFmpeg' : 'brew install ffmpeg',
  ffprobe: 'идёт в одной поставке с ffmpeg',
};

/** Полезно, но монтаж своего видео работает и без этого. */
const OPTIONAL = {
  'yt-dlp': WIN ? 'winget install yt-dlp.yt-dlp' : 'brew install yt-dlp',
};

const FILES = {
  'reels/montage/run.mjs': 'сквозной прогон монтажа',
  'reels/knowledge/shot-vocabulary.md': 'словарь шотов и правила драматургии',
  'knowledge/video-craft.md': 'теория монтажа и ритма',
};

const missing = [];
const warnings = [];

console.log('=== Проверка окружения контент-фабрики ===\n');

// ── Node ──
const nodeMajor = Number(process.versions.node.split('.')[0]);
console.log('Node.js:');
if (nodeMajor >= 20) {
  console.log(`  ✓ ${process.versions.node}`);
} else {
  console.log(`  ✗ ${process.versions.node} — нужна версия 20 или новее`);
  missing.push('Node.js ≥ 20');
}

// ── Обязательные программы ──
console.log('\nПрограммы (обязательные):');
for (const [tool, hint] of Object.entries(REQUIRED)) {
  const bin = await resolveBin(tool);
  if (!bin) {
    console.log(`  ✗ ${tool}  →  ${hint}`);
    missing.push(tool);
  } else if (bin === tool) {
    console.log(`  ✓ ${tool}`);
  } else {
    // Нашли мимо PATH — работать будет. Так бывает сразу после установки:
    // окно уже открыто и не видит новый PATH. Перезапуск приложения это лечит.
    console.log(`  ⚠ ${tool} — найден мимо PATH: ${bin}`);
    warnings.push(`${tool} вне PATH (перезапустите приложение)`);
  }
}

// ── Необязательные ──
console.log('\nПрограммы (по желанию):');
for (const [tool, hint] of Object.entries(OPTIONAL)) {
  const bin = await resolveBin(tool);
  console.log(bin ? `  ✓ ${tool}` : `  · ${tool} — нет. Нужен для скачивания чужих роликов: ${hint}`);
}

// ── Браузер для титров ──
console.log('\nБраузер для рендера титров (Playwright):');
try {
  const { chromium } = await import('playwright');
  await access(chromium.executablePath());
  console.log('  ✓ Chromium на месте');
} catch {
  console.log('  ✗ Chromium не установлен  →  npx playwright install chromium');
  missing.push('Playwright Chromium');
}

// ── Файлы комплекта ──
console.log('\nФайлы комплекта:');
for (const [rel, hint] of Object.entries(FILES)) {
  try {
    await access(path.join(ROOT, rel));
    console.log(`  ✓ ${rel}`);
  } catch {
    console.log(`  ✗ ${rel} — ${hint}. Скачайте комплект заново.`);
    warnings.push(rel);
  }
}

// ── Ключи: для монтажа не нужны, для генерации нужны ──
console.log('\nКлючи (для монтажа НЕ нужны, нужны для картинок и транскрипта):');
const KEYS = {
  OPENAI_API_KEY: 'платная расшифровка речи (~$0.006 за минуту). Не обязателен — есть бесплатная: node reels/transcribe-local.mjs',
  FAL_KEY: 'генерация картинок топ-моделями',
};
for (const [key, what] of Object.entries(KEYS)) {
  console.log(process.env[key] ? `  ✓ ${key}` : `  · ${key} — не задан. Нужен для: ${what}`);
}

console.log('\nHiggsfield подключается не ключом, а коннектором в приложении Claude:');
console.log('  Customize → Connectors → https://mcp.higgsfield.ai/mcp');

console.log();
if (missing.length) {
  console.log(`СТОП: не хватает — ${missing.join(', ')}.`);
  console.log('Поставьте это и запустите проверку снова. Команды указаны выше.');
  process.exit(1);
}
if (warnings.length) {
  console.log(`Замечания (${warnings.length}): ${warnings.join('; ')}.`);
  console.log('Монтаж запустится, но лучше починить.');
} else {
  console.log('Всё на месте. Можно монтировать первое видео.');
}
