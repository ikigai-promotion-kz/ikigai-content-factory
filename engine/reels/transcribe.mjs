/**
 * transcribe.mjs — расшифровка речи с таймкодами КАЖДОГО СЛОВА.
 *
 * Запуск из папки engine:
 *   node reels/transcribe.mjs ./my-video.mp4
 *
 * Рядом с исходником появится my-video.words.json — ровно тот формат, который
 * ждёт монтаж в поле `wordsPath` конфига:
 *   [{ "w": "Идут", "s": 0, "e": 2.02 }, { "w": "продажи", "s": 2.02, "e": 2.58 }]
 *
 * Зачем пословные таймкоды, а не обычные субтитры: по ним движок режет видео
 * по границам фраз и собирает караоке-подсветку. Из .srt этого не достать.
 *
 * Нужен ключ OPENAI_API_KEY в engine/.env. Расход ~$0.006 за минуту видео.
 *
 * Перед отправкой звук выжимается в моно 16 кГц 32 кбит/с. Это не про качество
 * распознавания (Whisper всё равно работает на 16 кГц), а про две вещи сразу:
 * лимит загрузки 25 МБ перестаёт мешать (часовой ролик весит ~14 МБ) и заливка
 * идёт секунды, а не минуты.
 */

import { readFile, writeFile, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { runBin } from './lib/bin.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));   // папка engine/
const API_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_UPLOAD_MB = 24;   // у OpenAI лимит 25 МБ, оставляем запас

// Ключ лежит в engine/.env. Путь от самого скрипта, а не от папки запуска.
dotenv.config({ path: path.join(ROOT, '.env') });

/**
 * Снять расшифровку с видео или аудио.
 *
 * @param {string} srcPath - путь к видео/аудио
 * @param {Object} [opts]
 * @param {string} [opts.language='ru'] - язык записи, ISO 639-1
 * @param {string} [opts.prompt] - подсказка модели: имена, термины, названия брендов.
 *   Сильно повышает точность на редких словах — «IKIGAI PROMOTION», «Higgsfield».
 * @returns {Promise<{words: Array<{w:string,s:number,e:number}>, text: string}>}
 */
export async function transcribe(srcPath, opts = {}) {
  const { language = 'ru', prompt } = opts;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY не задан. Впишите ключ в файл engine/.env — строка OPENAI_API_KEY=...\n'
      + 'Где взять: platform.openai.com → API keys. Не забудьте пополнить баланс, без этого ключ не работает.'
    );
  }

  const src = path.resolve(srcPath);
  await stat(src);   // упадёт понятной ошибкой, если файла нет

  // ── Звук отдельно и сразу лёгкий ──
  const audioPath = path.join(os.tmpdir(), `factory-${Date.now()}.mp3`);
  log('выжимаю звук из видео…');
  await runBin('ffmpeg', [
    '-y', '-i', src,
    '-vn',                    // видео не нужно
    '-ac', '1',               // моно
    '-ar', '16000',           // 16 кГц — рабочая частота распознавания
    '-b:a', '32k',
    audioPath,
  ]);

  try {
    const audio = await readFile(audioPath);
    const sizeMB = audio.length / 1024 / 1024;
    if (sizeMB > MAX_UPLOAD_MB) {
      throw new Error(
        `Даже после сжатия звук весит ${sizeMB.toFixed(1)} МБ — это больше лимита ${MAX_UPLOAD_MB} МБ.\n`
        + 'Ролик слишком длинный. Разрежьте его на части и расшифруйте по очереди:\n'
        + '  ffmpeg -i исходник.mp4 -t 3600 -c copy часть-1.mp4\n'
        + 'Не забудьте потом сдвинуть таймкоды второй части на длительность первой.'
      );
    }

    log(`отправляю на расшифровку (${sizeMB.toFixed(1)} МБ)…`);
    const form = new FormData();
    form.append('file', new Blob([audio], { type: 'audio/mpeg' }), 'audio.mp3');
    form.append('model', 'whisper-1');
    form.append('language', language);
    form.append('response_format', 'verbose_json');
    // Пословные таймкоды API отдаёт только в verbose_json и только по явному запросу.
    // В multipart массив передаётся повторением ключа с квадратными скобками.
    form.append('timestamp_granularities[]', 'word');
    if (prompt) form.append('prompt', prompt);

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      // Ошибку показываем как есть: молча подставлять пустой транскрипт нельзя,
      // дальше по конвейеру это выглядело бы как «видео без речи».
      const detail = await res.text();
      throw new Error(`OpenAI ответил ${res.status}: ${detail.slice(0, 400)}`);
    }

    const data = await res.json();
    const words = (data.words || []).map((w) => ({
      w: String(w.word || '').trim(),
      s: round3(w.start),
      e: round3(w.end),
    })).filter((w) => w.w);

    if (!words.length) {
      throw new Error(
        'Расшифровка вернулась без слов. Проверьте, что в ролике действительно есть речь '
        + 'и что язык указан верно (сейчас: ' + language + ').'
      );
    }

    return { words, text: data.text || '' };
  } finally {
    // Временный файл убираем в любом случае, даже если запрос упал.
    await unlink(audioPath).catch(() => {});
  }
}

function round3(x) { return Math.round(Number(x) * 1000) / 1000; }
function log(msg) { console.log(`[расшифровка] ${msg}`); }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , srcArg, langArg] = process.argv;
  if (!srcArg) {
    console.error('Использование: node reels/transcribe.mjs <видео> [язык]');
    console.error('Пример:        node reels/transcribe.mjs ./my-video.mp4');
    process.exit(1);
  }

  transcribe(srcArg, langArg ? { language: langArg } : {})
    .then(async ({ words, text }) => {
      const src = path.resolve(srcArg);
      const out = path.join(path.dirname(src), `${path.basename(src, path.extname(src))}.words.json`);
      await writeFile(out, JSON.stringify(words), 'utf8');
      log(`слов: ${words.length}, длительность речи: ${words.at(-1).e.toFixed(1)} сек`);
      log(`готово: ${out}`);
      console.log(`\nТекст целиком:\n${text}\n`);
      console.log('Теперь подставьте этот путь в поле wordsPath своего конфига.');
    })
    .catch((e) => { console.error('ОШИБКА:', e.message); process.exit(1); });
}
