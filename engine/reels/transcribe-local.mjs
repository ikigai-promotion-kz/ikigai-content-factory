/**
 * transcribe-local.mjs — расшифровка речи БЕЗ ключей и без интернета.
 *
 * Запуск из папки engine:
 *   node reels/transcribe-local.mjs ./my-video.mp4
 *   node reels/transcribe-local.mjs ./my-video.mp4 --model medium
 *
 * Рядом с исходником появится my-video.words.json — тот же формат, что у платной
 * расшифровки, его ждёт монтаж в поле `wordsPath`:
 *   [{ "w": "Идут", "s": 0, "e": 2.02 }, { "w": "последние", "s": 2.02, "e": 3.14 }]
 *
 * Сколько это стоит по времени. Замер на 28-секундном ролике с живой русской
 * речью: small — 7,5 секунды, medium — 20 секунд, оба прохода вместе. На машине
 * без нормальной видеокарты считайте, что уйдёт примерно длительность ролика.
 *
 * Про точность. На том же ролике small слово в слово совпал с платной
 * расшифровкой, а medium, вопреки ожиданиям, разбил «протестировать» на два
 * слова — большая модель не обязательно точнее на короткой бытовой речи.
 * Поэтому по умолчанию small; medium стоит пробовать на плохом звуке.
 * Платная расшифровка (reels/transcribe.mjs, ~$0.006 за минуту) остаётся
 * страховкой, когда цена ошибки высокая.
 *
 * Как это работает. В ffmpeg 8.x встроен фильтр whisper — та же модель, что у
 * OpenAI, только считается на вашей машине. Он умеет отдавать либо фразы, либо
 * куски слов, но не слова с таймкодами: для русского токены рвут слово на части
 * («подготов» + «итель» + «ные») и теряют пробелы между ними. Поэтому мы делаем
 * два прохода — за текстом и за таймкодами — и склеиваем куски обратно в слова.
 *
 * Модель скачивается один раз в engine/.cache/whisper/ (small ~490 МБ,
 * medium ~1,5 ГБ) и дальше живёт локально.
 */

import { writeFile, readFile, mkdir, stat, unlink } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runBin } from './lib/bin.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));   // папка engine/
const MODELS_DIR = path.join(ROOT, '.cache', 'whisper');

const MODELS = {
  small:  { file: 'ggml-small.bin',  size: '490 МБ', speed: 'на 28 секундах речи у нас ушло 7,5 сек' },
  medium: { file: 'ggml-medium.bin', size: '1,5 ГБ', speed: 'на 28 секундах речи у нас ушло 20 сек' },
};
const MODEL_URL = (f) => `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${f}?download=true`;

/**
 * Расшифровать видео или аудио локально.
 *
 * @param {string} srcPath - путь к видео/аудио
 * @param {Object} [opts]
 * @param {'small'|'medium'} [opts.model='small']
 * @param {string} [opts.language='ru']
 * @returns {Promise<{words: Array<{w:string,s:number,e:number}>, text: string, exact: boolean}>}
 *   exact=false — склеить слова с таймкодами не удалось, время слов вычислено
 *   пропорционально внутри фразы (для караоке-подсветки чуть плывёт).
 */
export async function transcribeLocal(srcPath, opts = {}) {
  const { model = 'small', language = 'ru' } = opts;
  const spec = MODELS[model];
  if (!spec) throw new Error(`Неизвестная модель «${model}». Доступны: ${Object.keys(MODELS).join(', ')}`);

  const src = path.resolve(srcPath);
  await stat(src);

  const modelPath = await ensureModel(spec);

  // Фильтры ffmpeg разделяют опции двоеточием, а в путях Windows двоеточие стоит
  // сразу после буквы диска — описание фильтра ломается на ней же. Поэтому ffmpeg
  // запускается из папки моделей и все пути внутри фильтра остаются короткими
  // именами файлов без двоеточий.
  const stamp = `${process.pid}-${Math.round(process.uptime() * 1000)}`;
  const segFile = `segments-${stamp}.jsonl`;
  const tokFile = `tokens-${stamp}.jsonl`;

  log(`модель ${model}, язык ${language}. Идут два прохода, ${spec.speed}.`);

  try {
    log('проход 1 из 2 — распознаю речь…');
    await whisperPass(src, modelPath, language, segFile, 0);

    log('проход 2 из 2 — снимаю таймкоды…');
    await whisperPass(src, modelPath, language, tokFile, 1);

    const segments = await readJSONL(path.join(MODELS_DIR, segFile));
    const tokens = await readJSONL(path.join(MODELS_DIR, tokFile));

    if (!segments.length) {
      throw new Error(
        'В записи не нашлось речи. Проверьте, что звук на месте и язык указан верно '
        + `(сейчас: ${language}).`
      );
    }

    const text = segments.map((s) => String(s.text || '').trim()).filter(Boolean).join(' ');
    const stitched = stitchWords(segments, tokens);

    return { words: stitched.words, text, exact: stitched.exact };
  } finally {
    await unlink(path.join(MODELS_DIR, segFile)).catch(() => {});
    await unlink(path.join(MODELS_DIR, tokFile)).catch(() => {});
  }
}

/** Один проход фильтра. maxLen=0 — фразы целиком, maxLen=1 — по токену на строку. */
async function whisperPass(src, modelPath, language, outName, maxLen) {
  const filter = [
    `whisper=model=${path.basename(modelPath)}`,
    `language=${language}`,
    'format=json',
    `destination=${outName}`,
    `max_len=${maxLen}`,
    'queue=10',
  ].join(':');

  await runBin('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-vn', '-af', filter, '-f', 'null', '-'],
    { cwd: MODELS_DIR });
}

/**
 * Склеить куски слов обратно в слова с таймкодами.
 *
 * Фразы дают правильные слова и пробелы, токены — время. Идём по словам фразы и
 * набираем токены, пока их склейка не совпадёт со словом; начало первого токена и
 * конец последнего и есть время слова.
 *
 * Если тексты двух проходов разошлись (так бывает на шумной записи), честно
 * возвращаем exact:false и раскладываем слова внутри фразы по длине.
 */
function stitchWords(segments, tokens) {
  const words = [];
  let ti = 0;
  let exact = tokens.length > 0;

  for (const seg of segments) {
    const segWords = String(seg.text || '').trim().split(/\s+/).filter(Boolean);
    if (!segWords.length) continue;

    const segStart = ms(seg.start);
    const segEnd = ms(seg.end);
    const before = words.length;
    let ok = exact;

    for (const word of segWords) {
      const target = norm(word);
      if (!target) continue;                       // слово из одной пунктуации

      let acc = '';
      let s = null;
      let e = null;
      const from = ti;

      while (ti < tokens.length && acc !== target) {
        const piece = norm(tokens[ti].text);
        if (piece) {
          acc += piece;
          if (s === null) s = ms(tokens[ti].start);
          e = ms(tokens[ti].end);
        } else if (s !== null) {
          e = ms(tokens[ti].end);                  // пунктуация продлевает слово
        }
        ti++;
        if (acc && !target.startsWith(acc)) break; // разошлись — дальше не гадаем
      }

      if (acc !== target || s === null) { ti = from; ok = false; break; }
      words.push({ w: word, s: round3(s), e: round3(Math.max(e, s)) });
    }

    if (!ok) {
      // Фраза не сошлась: возвращаем её слова, разложенные по длине внутри фразы.
      words.length = before;
      exact = false;
      const chars = segWords.reduce((n, w) => n + w.length, 0) || 1;
      let cursor = segStart;
      for (const word of segWords) {
        const dur = (segEnd - segStart) * (word.length / chars);
        words.push({ w: word, s: round3(cursor), e: round3(cursor + dur) });
        cursor += dur;
      }
    }
  }

  return { words, exact };
}

async function ensureModel(spec) {
  const dest = path.join(MODELS_DIR, spec.file);
  try {
    await stat(dest);
    return dest;
  } catch { /* качаем ниже */ }

  await mkdir(MODELS_DIR, { recursive: true });
  log(`скачиваю модель ${spec.file} (${spec.size}) — один раз, дальше работает офлайн…`);
  const res = await fetch(MODEL_URL(spec.file));
  if (!res.ok || !res.body) throw new Error(`Не удалось скачать модель: ${res.status} ${res.statusText}`);
  const tmp = `${dest}.part`;
  // Молчаливая закачка полугигабайта неотличима от зависшей программы — особенно
  // когда её впервые запускают при людях. Поэтому считаем мегабайты вслух.
  const total = Number(res.headers.get('content-length')) || 0;
  let got = 0;
  let lastShown = 0;
  const counted = new ReadableStream({
    start(controller) {
      const reader = res.body.getReader();
      (async function pump() {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) { controller.close(); return; }
          got += value.byteLength;
          const mb = Math.floor(got / (1024 * 1024));
          if (mb >= lastShown + 25) {
            lastShown = mb;
            log(total ? `${mb} МБ из ${Math.round(total / (1024 * 1024))}` : `${mb} МБ`);
          }
          controller.enqueue(value);
        }
      })().catch((err) => controller.error(err));
    },
  });
  await pipeline(counted, createWriteStream(tmp));
  const { rename } = await import('node:fs/promises');
  await rename(tmp, dest);
  log('модель на месте.');
  return dest;
}

/**
 * Скачать модель заранее, без видео. Нужно ровно для одного случая: не качать
 * полгигабайта в прямом эфире или на занятии, где все ждут.
 * @param {'small'|'medium'} [model='small']
 */
export async function prefetchModel(model = 'small') {
  const spec = MODELS[model] || MODELS.small;
  return ensureModel(spec);
}

async function readJSONL(p) {
  let text;
  try { text = await readFile(p, 'utf8'); } catch { return []; }
  return text.split('\n').filter((l) => l.trim())
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

/** Только буквы и цифры в нижнем регистре — по ним сверяем куски со словом. */
function norm(s) {
  return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}
function ms(v) { return Number(v || 0) / 1000; }
function round3(x) { return Math.round(x * 1000) / 1000; }
function log(msg) { console.log(`[расшифровка] ${msg}`); }

/* ────────────────────────── запуск из командной строки ────────────────────────── */

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const srcArg = args.find((a) => !a.startsWith('--'));
  const flag = (name, def) => {
    const i = args.indexOf(`--${name}`);
    return i > -1 && args[i + 1] ? args[i + 1] : def;
  };

  // Прогрев: скачать модель заранее, чтобы на занятии или в эфире не ждать полгигабайта.
  if (args.includes('--prefetch')) {
    const model = flag('model', 'small');
    prefetchModel(model)
      .then((p) => { log(`модель готова: ${p}`); log('расшифровка теперь работает офлайн и мгновенно стартует.'); })
      .catch((e) => { console.error('ОШИБКА:', e.message); process.exit(1); });
  } else if (!srcArg) {
    console.error('Использование: node reels/transcribe-local.mjs <видео> [--model small|medium] [--lang ru]');
    console.error('Пример:        node reels/transcribe-local.mjs ./my-video.mp4');
    console.error('Прогрев:       node reels/transcribe-local.mjs --prefetch   (скачать модель заранее)');
    process.exit(1);
  } else

  transcribeLocal(srcArg, { model: flag('model', 'small'), language: flag('lang', 'ru') })
    .then(async ({ words, text, exact }) => {
      const src = path.resolve(srcArg);
      const out = path.join(path.dirname(src), `${path.basename(src, path.extname(src))}.words.json`);
      await writeFile(out, JSON.stringify(words), 'utf8');
      log(`слов: ${words.length}, речь до ${words.at(-1)?.e.toFixed(1) ?? 0} сек`);
      if (!exact) {
        log('внимание: точные таймкоды слов собрать не удалось, время внутри фраз посчитано на глаз.');
        log('на монтаж по фразам это не влияет, а караоке-подсветка может слегка плыть.');
      }
      log(`готово: ${out}`);
      console.log(`\nТекст целиком:\n${text}\n`);
      console.log('Подставьте этот путь в поле wordsPath своего конфига.');
    })
    .catch((e) => { console.error('ОШИБКА:', e.message); process.exit(1); });
}
