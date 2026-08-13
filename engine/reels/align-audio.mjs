/**
 * align-audio.mjs — вернуть на смонтированный Omni кусок ОРИГИНАЛЬНУЮ дорожку,
 * не потеряв липсинк.
 *
 * Правило «звук всегда наш» (`reels/knowledge/omni-montage-rules.md`, п.7) до сих пор
 * жило только словами, а наивное наложение его не выполняет: Omni отдаёт кусок примерно
 * на секунду короче заказанного и сжимает речь НЕРАВНОМЕРНО. Прогон 03.08.2026: слово
 * «контент фабрики» у модели на 3.95с, в оригинале на 5.02с — простое наложение
 * разъезжается по губам больше чем на секунду к середине куска.
 *
 * Как чинится: картинка растягивается до длины родной речи, дорожка режется по словам,
 * которые нашлись и в оригинале, и в обратной расшифровке результата, и каждый отрезок
 * подгоняется своим темпом. Темп зажат в человеческие пределы — где подгонка упёрлась
 * в предел, звук становится короче слота и лишний хвост картинки отрезается.
 *
 *   node reels/align-audio.mjs <видео-от-модели> <words-модели.json> \
 *                              <оригинал.mp4> <words-оригинала.json> \
 *                              <начало-куска> <конец-куска> <выход.mp4>
 *
 * Оба words.json делает бесплатная расшифровка: `node reels/transcribe-local.mjs <файл>`.
 * Границы куска печатает `scripts/storyboard-live.mjs` на шаге 1.
 */

import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const [MODEL_VIDEO, MODEL_WORDS, SRC_VIDEO, SRC_WORDS, SEG_START, SEG_END, OUT] = process.argv.slice(2);

if (!OUT) {
  console.error('Использование: node reels/align-audio.mjs <видео-модели> <words-модели.json> <оригинал> <words-оригинала.json> <начало> <конец> <выход.mp4>');
  process.exit(1);
}

// Темп речи держим в человеческих пределах: быстрее — тараторит, медленнее — тянет.
const TEMPO_MAX = 1.6;
const TEMPO_MIN = 0.75;
// Якоря ближе секунды друг к другу дают рваную подгонку на коротких словах: «стали»
// после ускорения в два с половиной раза слышится как «остались».
const MIN_GAP = 1.0;

const run = (bin, args) => new Promise((res, rej) => {
  const p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => { err += d; });
  p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${bin} ${c}: ${err.slice(-600)}`))));
});

const norm = (w) => w.toLowerCase().replace(/[^а-яёa-z0-9]/g, '');

const start = Number(SEG_START);
const end = Number(SEG_END);

const model = JSON.parse(await readFile(MODEL_WORDS, 'utf8'));
const src = JSON.parse(await readFile(SRC_WORDS, 'utf8'))
  .filter((w) => w.s >= start - 0.01 && w.s < end)
  .map((w) => ({ ...w, s: w.s - start, e: w.e - start }));

// Якоря — слова, которые нашлись в обеих дорожках в одном порядке. Составные вроде
// «контент фабрики» модель отдаёт одним токеном, поэтому сравниваем по вхождению.
const anchors = [];
let mi = 0;
for (const s of src) {
  const key = norm(s.w);
  if (!key) continue;
  for (let j = mi; j < model.length; j += 1) {
    const mk = norm(model[j].w);
    if (mk === key || mk.startsWith(key) || key.startsWith(mk)) {
      anchors.push({ o: s.s, m: model[j].s });
      mi = j + 1;
      break;
    }
  }
}

const srcEnd = end - start;
const rawEnd = Number(await probeDuration(MODEL_VIDEO));

// Сначала растягиваем КАРТИНКУ до длины родной речи. Без этого подгонка требует темпа
// 2.3 на хвосте и рвёт последние слова; замедление картинки на десять процентов на
// коллаже не читается.
const stretch = srcEnd / rawEnd;
const stage = path.join(path.dirname(OUT), `.stretched-${path.basename(OUT)}`);
await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', MODEL_VIDEO,
  '-filter:v', `setpts=${stretch.toFixed(6)}*PTS`, '-an', '-c:v', 'libx264', '-crf', '18', stage]);
const modelEnd = Number(await probeDuration(stage));
for (const w of model) { w.s *= stretch; w.e *= stretch; }
console.log(`картинка растянута ×${stretch.toFixed(3)}: ${rawEnd.toFixed(2)}с → ${modelEnd.toFixed(2)}с`);

const points = [{ o: 0, m: 0 }, ...anchors.filter((a) => a.m > 0.05), { o: srcEnd, m: modelEnd }];
const marks = [points[0]];
for (const p of points.slice(1, -1)) {
  const prev = marks[marks.length - 1];
  if (p.m > prev.m + MIN_GAP && p.o > prev.o + MIN_GAP) marks.push(p);
}
marks.push(points[points.length - 1]);

console.log(`якорей: ${anchors.length}, отрезков: ${marks.length - 1}, картинка ${modelEnd.toFixed(2)}с, речь ${srcEnd.toFixed(2)}с`);

const work = await mkdtemp(path.join(tmpdir(), 'align-'));
const parts = [];
for (let i = 0; i < marks.length - 1; i += 1) {
  const a = marks[i];
  const b = marks[i + 1];
  const oLen = b.o - a.o;
  const mLen = b.m - a.m;
  const raw = oLen / mLen;               // >1 — оригинал длиннее, ускоряем
  const tempo = Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, raw));
  const file = path.join(work, `p${i}.wav`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(start + a.o), '-t', String(oLen),
    '-i', SRC_VIDEO, '-filter:a', tempoChain(tempo), '-ar', '48000', '-ac', '2', file]);
  parts.push(file);
  const capped = Math.abs(tempo - raw) > 0.01 ? ` (подгонка ${raw.toFixed(2)} упёрлась в предел)` : '';
  console.log(`  отрезок ${i + 1}: ${oLen.toFixed(2)}с → ${mLen.toFixed(2)}с, темп ${tempo.toFixed(3)}${capped}`);
}

/** atempo держит 0.5–2 за проход, растяжку сильнее собираем цепочкой. */
function tempoChain(t) {
  const out = [];
  let rest = t;
  while (rest > 2) { out.push('atempo=2'); rest /= 2; }
  while (rest < 0.5) { out.push('atempo=0.5'); rest /= 0.5; }
  out.push(`atempo=${rest.toFixed(6)}`);
  return out.join(',');
}

const listFile = path.join(work, 'list.txt');
await writeFile(listFile, parts.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'), 'utf8');
const merged = path.join(work, 'merged.wav');
await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', merged]);

// -shortest: если звук вышел короче картинки, хвост картинки без речи отрезается.
await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', stage, '-i', merged,
  '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', OUT]);

await rm(work, { recursive: true, force: true });
await rm(stage, { force: true });
console.log(`готово: ${OUT} — голос ваш, картинка от модели.`);

function probeDuration(file) {
  return new Promise((res, rej) => {
    const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', (c) => (c === 0 ? res(out.trim()) : rej(new Error('ffprobe не смог прочитать длительность'))));
  });
}
