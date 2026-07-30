/**
 * genimage.mjs — генерация слайдов и баннеров через fal.ai.
 *
 * Рисует ВЕСЬ слайд целиком одним промптом: сцена и текст сразу вместе.
 * Собирать «фон отдельно, надпись сверху» мы пробовали — коллаж видно сразу,
 * поэтому этот путь у нас закрыт.
 *
 * Держит единый мир в серии: сгенерируйте первый слайд, примите его и подавайте
 * якорем (`--ref`) в остальные. Без якоря в серии разъезжаются свет, палитра и лица.
 *
 * Модель выбирается под задачу — список в config/models.json, подсказка в справке.
 *
 * Командная строка:
 *   node lib/genimage.mjs "<промпт>" --out ./out/1.png --ratio 4:5 --model nano-banana-pro
 *   node lib/genimage.mjs "<промпт>" --out ./out/2.png --ref ./out/1.png
 *
 * Тратит деньги с баланса fal.ai. Нужен FAL_KEY в engine/.env.
 */

import { writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { imageModel } from './models.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));   // папка engine/

const FAL_QUEUE_BASE = 'https://queue.fal.run';
const FAL_UPLOAD_URL = 'https://rest.alpha.fal.ai/storage/upload';
// Дефолт больше не захардкожен здесь — единственный источник config/models.json
// (env GEN_MODEL / GEN_EDIT_MODEL продолжают работать через models-config).
const { model: DEFAULT_MODEL, edit: DEFAULT_EDIT_MODEL } = imageModel('nano-banana');
const POLL_INTERVAL_MS = 2_000;
const MAX_POLL_MS = 180_000;

// Кастинг — кто изображён на ваших картинках. Добавляется к каждому промпту
// (для сцен без людей модель это просто игнорирует).
//
// Раньше правило было вшито в код, и сменить рынок было нельзя без правки
// исходника. Теперь живёт в config/casting.json — правьте под свою аудиторию.
let _casting;
function casting() {
  if (_casting !== undefined) return _casting;
  try {
    const cfgPath = path.join(ROOT, 'config', 'casting.json');
    _casting = String(JSON.parse(readFileSync(cfgPath, 'utf8')).prompt || '').trim();
  } catch {
    _casting = '';
  }
  return _casting;
}

/**
 * Сгенерировать одно изображение слайда.
 * @param {string} prompt - полный промпт сцены/слайда.
 * @param {Object} opts
 * @param {string} opts.outPath - куда сохранить PNG (обязательно).
 * @param {string} [opts.model] - text2image model id (переопределяет GEN_MODEL).
 * @param {string} [opts.editModel] - reference/edit model id (переопределяет GEN_EDIT_MODEL).
 * @param {string} [opts.aspect_ratio='4:5'] - 4:5 IG carousel, 9:16 stories.
 * @param {string} [opts.referenceImageUrl] - публичный URL картинки-якоря (continuity).
 * @param {string} [opts.referencePath] - локальный PNG-якорь; будет загружен в fal-storage.
 * @returns {Promise<{path: string, image_url: string, model: string}>}
 */
export async function generateImage(prompt, opts) {
  if (!opts?.outPath) throw new Error('generateImage: opts.outPath обязателен');
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) throw new Error('FAL_KEY не задан в .env (получить на fal.ai/dashboard/keys)');

  // Континьюити: если задан локальный референс — поднимаем его в fal-storage,
  // чтобы получить публичный URL для edit-эндпоинта.
  let referenceImageUrl = opts.referenceImageUrl;
  if (!referenceImageUrl && opts.referencePath) {
    referenceImageUrl = await uploadToFal(opts.referencePath, apiKey);
  }

  const useReference = Boolean(referenceImageUrl);
  const model = useReference
    ? (opts.editModel || DEFAULT_EDIT_MODEL)
    : (opts.model || DEFAULT_MODEL);

  // nano-banana принимает строковый aspect_ratio (enum), НЕ объект image_size —
  // иначе размер игнорируется и выдаётся дефолтный 1:1 квадрат (см. probe-fal).
  const aspectRatio = opts.aspect_ratio || '4:5';
  const cast = casting();
  const castPrompt = cast ? `${prompt}\n\n${cast}` : prompt;
  const body = useReference
    ? { prompt: castPrompt, image_urls: [referenceImageUrl], aspect_ratio: aspectRatio, output_format: 'png' }
    : {
        prompt: castPrompt,
        aspect_ratio: aspectRatio,
        num_images: 1,
        output_format: 'png',
      };

  const submitRes = await fetch(`${FAL_QUEUE_BASE}/${model}`, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!submitRes.ok) {
    throw new Error(`fal submit (${model}) ${submitRes.status}: ${await submitRes.text()}`);
  }
  const job = await submitRes.json();

  const result = await pollUntilDone(job, apiKey, model);

  const imageUrl = pickImageUrl(result);
  if (!imageUrl) {
    throw new Error(`fal (${model}): нет image url в результате: ${JSON.stringify(result).slice(0, 200)}`);
  }

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Не скачать ${imageUrl}: ${imgRes.status}`);
  await writeFile(opts.outPath, Buffer.from(await imgRes.arrayBuffer()));
  await normalizeToAspect(opts.outPath, aspectRatio);

  return { path: opts.outPath, image_url: imageUrl, model };
}

// Точные размеры площадок. Модели отдают свой родной бакет: на «4:5» приходит
// 928×1160, и Instagram растягивает его сам — заголовок теряет резкость там, где
// он и должен быть острым. Приводим к точному размеру локально, это бесплатно.
const ASPECT_DIMS = {
  '4:5':  { w: 1080, h: 1350 },
  '9:16': { w: 1080, h: 1920 },
  '1:1':  { w: 1080, h: 1080 },
  '16:9': { w: 1920, h: 1080 },
};

async function normalizeToAspect(pngPath, aspect) {
  const dims = ASPECT_DIMS[aspect];
  if (!dims) return;
  const { runBin } = await import('../reels/lib/bin.mjs');
  const tmp = pngPath.replace(/\.png$/i, '.norm.png');
  const { rename, unlink } = await import('node:fs/promises');
  try {
    // scale+crop, а не растяжение: пропорция уже верная, меняется только плотность пикселей.
    await runBin('ffmpeg', [
      '-y', '-loglevel', 'error', '-i', pngPath,
      '-vf', `scale=${dims.w}:${dims.h}:force_original_aspect_ratio=increase,crop=${dims.w}:${dims.h}`,
      tmp,
    ]);
    await rename(tmp, pngPath);
  } catch {
    // ffmpeg не нашёлся — отдаём как есть, это не повод терять готовый кадр.
    try { await unlink(tmp); } catch { /* нечего убирать */ }
  }
}

async function uploadToFal(localPath, apiKey) {
  const { readFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const buf = await readFile(localPath);
  const name = path.basename(localPath);
  const res = await fetch(FAL_UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/octet-stream', 'X-Fal-File-Name': name },
    body: buf,
  });
  if (!res.ok) throw new Error(`fal upload ${res.status}: ${await res.text()}`);
  const j = await res.json();
  const url = j.access_url || j.url || j.file_url;
  if (!url) throw new Error(`fal upload: нет url в ответе: ${JSON.stringify(j).slice(0, 200)}`);
  return url;
}

async function pollUntilDone(job, apiKey, model) {
  const start = Date.now();
  const statusUrl = job.status_url || `${FAL_QUEUE_BASE}/${model}/requests/${job.request_id}/status`;
  const responseUrl = job.response_url || `${FAL_QUEUE_BASE}/${model}/requests/${job.request_id}`;

  while (Date.now() - start < MAX_POLL_MS) {
    const r = await fetch(statusUrl, { headers: { Authorization: `Key ${apiKey}` } });
    if (!r.ok) throw new Error(`fal status ${r.status}: ${await r.text()}`);
    const st = await r.json();
    if (st.status === 'COMPLETED') {
      const fr = await fetch(responseUrl, { headers: { Authorization: `Key ${apiKey}` } });
      if (!fr.ok) throw new Error(`fal response ${fr.status}: ${await fr.text()}`);
      return await fr.json();
    }
    if (st.status === 'FAILED') {
      throw new Error(`fal job failed (${model}): ${JSON.stringify(st).slice(0, 300)}`);
    }
    await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
  }
  throw new Error(`fal job timeout (${model}) after ${MAX_POLL_MS}ms`);
}

function pickImageUrl(result) {
  if (Array.isArray(result.images) && result.images[0]?.url) return result.images[0].url;
  if (result.image?.url) return result.image.url;
  if (typeof result.url === 'string') return result.url;
  return null;
}

/* ────────────────────────── запуск из командной строки ────────────────────────── */

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : fallback;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dotenv = await import('dotenv');
  dotenv.default.config({ path: path.join(ROOT, '.env') });

  const prompt = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !all[i - 1]?.startsWith('--')).join(' ').trim();
  const out = arg('--out');

  if (!prompt || !out) {
    console.error('Использование: node lib/genimage.mjs "<промпт сцены>" --out ./out/slide-1.png [опции]');
    console.error('');
    console.error('  --out <файл>        куда сохранить (обязательно)');
    console.error('  --ratio <4:5>       4:5 карусель · 9:16 сторис · 16:9 обложка · 1:1 квадрат');
    console.error('  --model <интент>    nano-banana (дёшево) · nano-banana-pro (кириллица, фотореализм)');
    console.error('                      recraft (вектор) · seedream (схемы) · flux (точный промпт)');
    console.error('  --ref <файл.png>    слайд-якорь: держит один мир и одно лицо во всей серии');
    console.error('');
    console.error('Тратит деньги с баланса fal.ai. Один слайд — центы, но серия из 8 уже заметна.');
    process.exit(1);
  }

  const intent = arg('--model', 'nano-banana');
  const { model, edit } = imageModel(intent);

  console.log(`[генерация] модель: ${intent} (${model})`);
  generateImage(prompt, {
    outPath: out,
    model,
    editModel: edit,
    aspect_ratio: arg('--ratio', '4:5'),
    referencePath: arg('--ref'),
  })
    .then((r) => {
      console.log(`[генерация] готово: ${r.path}`);
      console.log('Посмотрите файл глазами до того, как принимать. Гейт по метрикам приёмку не заменяет.');
    })
    .catch((e) => { console.error('ОШИБКА:', e.message); process.exit(1); });
}

