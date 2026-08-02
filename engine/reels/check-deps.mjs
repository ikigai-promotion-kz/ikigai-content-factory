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
import { resolveBin, runBin } from './lib/bin.mjs';

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

/**
 * Для монтажа своего видео не нужны, но нужны для соседних шагов.
 *
 * Формулировка «нужен для скачивания чужих роликов» была неверной и стоила бы
 * человеку сорванного шага: поиск виралок (reels/scout/ig-scout.mjs) зовёт yt-dlp
 * для САМОГО поиска, а не только для скачивания. Тот, кто доверился зелёной
 * проверке, упирался бы в ошибку прямо посреди занятия.
 */
const OPTIONAL = {
  'yt-dlp': {
    install: WIN ? 'winget install yt-dlp.yt-dlp' : 'brew install yt-dlp',
    why: 'поиск виралок и скачивание чужих роликов. Без него блок «виралки» не запустится',
  },
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

// ── Фильтр whisper внутри ffmpeg ──
// Проверка «ffmpeg отвечает на запрос версии» ничего не говорит о том, умеет ли он
// расшифровывать речь: фильтр whisper появился в ffmpeg 8 и есть не во всех сборках.
// Студент с ffmpeg 6 или 7, поставленным когда-то для другого софта, получал зелёную
// проверку и падение «No such filter: whisper» на первом же шаге любого сценария.
console.log('\nРасшифровка речи (фильтр whisper внутри ffmpeg):');
try {
  const res = await runBin('ffmpeg', ['-hide_banner', '-filters']);
  const out = typeof res === 'string' ? res : `${res?.stdout ?? ''}${res?.stderr ?? ''}`;
  if (/(^|\s)whisper(\s|$)/m.test(out)) {
    console.log('  ✓ фильтр whisper на месте — расшифровка будет бесплатной');
  } else {
    console.log('  ✗ фильтра whisper нет в этой сборке ffmpeg');
    console.log('     Бесплатная расшифровка (reels/transcribe-local.mjs) не запустится.');
    console.log(`     Нужен ffmpeg 8 или новее. Ставится так: ${REQUIRED.ffmpeg}`);
    missing.push('фильтр whisper в ffmpeg');
  }
} catch {
  console.log('  · не смог опросить фильтры ffmpeg — проверьте его установку выше');
}

// ── Чем дотягиваемся до Higgsfield ──
// Ветка стилей (скилл reels-styles) печатает два пути. Через коннектор работает всегда,
// через командную строку — только если она установлена отдельно. Раньше проверка про
// это молчала, и студент узнавал о нехватке в момент, когда уже готов тратить кредиты.
console.log('\nHiggsfield (нужен только для платных веток — стили, озвучка, картинки):');
{
  const cli = await resolveBin('higgsfield');
  if (cli) {
    console.log('  ✓ командная строка higgsfield установлена — доступны оба пути');
  } else {
    console.log('  · командной строки higgsfield нет — это нормально');
    console.log('     Работайте через коннектор в приложении Claude:');
    console.log('     Customize → Connectors → https://mcp.higgsfield.ai/mcp');
    console.log('     Скрипты печатают оба пути, коннекторный идёт первым.');
  }
}

// ── Необязательные ──
console.log('\nПрограммы (нужны не для монтажа, а для соседних шагов):');
for (const [tool, { install, why }] of Object.entries(OPTIONAL)) {
  const bin = await resolveBin(tool);
  if (bin) console.log(`  ✓ ${tool}`);
  else console.log(`  · ${tool} — нет. ${why}. Ставится так: ${install}`);
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
console.log('\nКлючи (для монтажа НЕ нужны, нужны для картинок, музыки и транскрипта):');
const KEYS = {
  OPENAI_API_KEY: 'платная расшифровка речи (~$0.006 за минуту). Не обязателен — есть бесплатная: node reels/transcribe-local.mjs',
  // Тот же ключ отвечает и за музыку в ролике (fal-ai/elevenlabs/music). Раньше здесь
  // было только про картинки — и человек на шаге «звук» узнавал о нужном ключе
  // в тот момент, когда уже поздно.
  FAL_KEY: 'генерация картинок топ-моделями И музыки для ролика (fal-ai/elevenlabs/music)',
  // Отдельная строка, потому что человек, заведший аккаунт Apify, иначе не знает,
  // куда девать токен: код читает его фолбэком из ~/.claude/.env, и это нигде
  // не было написано. YouTube при этом ищется вообще без ключей.
  APIFY_TOKEN: 'поиск доноров ТОЛЬКО в Instagram. YouTube и Shorts ищутся бесплатно и без него',
  // Публикация — необязательный шаг: пакет к выпуску заливается и руками.
  // Ключ нужен только тем, кто выкладывает командой в несколько каналов сразу.
  UPLOAD_POST_API_KEY: 'публикация в несколько каналов командой (node publish/publish.mjs). Руками — не нужен',
};
for (const [key, what] of Object.entries(KEYS)) {
  console.log(process.env[key] ? `  ✓ ${key}` : `  · ${key} — не задан. Нужен для: ${what}`);
}

// Половина настройки хуже, чем её отсутствие: с ключом, но без профиля публикатор
// падает уже после того, как человек решил, что всё готово.
if (process.env.UPLOAD_POST_API_KEY && !process.env.UPLOAD_POST_USER) {
  console.log('  ✗ UPLOAD_POST_USER не задан, хотя ключ есть — публикатор не поймёт, в чей профиль слать');
  warnings.push('UPLOAD_POST_USER');
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
