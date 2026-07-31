/**
 * splice.mjs — вставка сгенерированной сцены в СМОНТИРОВАННУЮ базу.
 *
 * Это недостающее звено генеративной ветви. Кирпичи уже были: нарезка по границам
 * фраз (lib/segment.mjs), раскадровка на реальных кадрах (lib/storyboard.mjs),
 * параметры вызова модели (lib/montage.mjs) — а положить результат обратно в ролик
 * было нечем.
 *
 * Режим только «вставки»: заменяется ОДНА-ДВЕ сцены, а не весь ролик. Живая речь и
 * лицо остаются нашими, генерация закрывает кульминацию или вау-момент.
 *
 * Два правила, без которых приём разваливается:
 *
 *   1. ЗВУК ВСЕГДА ИЗ БАЗЫ. Любая video-to-video модель портит дорожку — дубли,
 *      подмены, выпадения слов, даже когда в промпте написано «keep original audio».
 *      Берём от модели только картинку.
 *   2. ДЛИТЕЛЬНОСТЬ ДО КАДРА. Вставка обязана занять ровно окно, которое заменяет,
 *      иначе весь оверлей после неё уедет: субтитры считаются по шкале базы.
 *      Модель отдаёт свою длительность — подрезаем и добиваем последним кадром.
 *
 * Порядок в конвейере: база → ВСТАВКА → звук → оверлей. Оверлей рисуется последним
 * и поэтому ложится на сгенерированную сцену так же, как на снятую.
 */

import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { runBin } from '../lib/bin.mjs';
import { probe } from '../lib/assemble.mjs';

const W = 1080;
const H = 1920;

/**
 * Заменить окна базы сгенерированными сценами.
 *
 * @param {Object} args
 * @param {string} args.basePath - смонтированная база (уже 1080×1920)
 * @param {Array<{t0:number,t1:number,video:string}>} args.inserts - окна в шкале базы
 * @param {string} args.outPath
 * @param {string} args.workDir
 * @param {number} [args.fps=30]
 * @returns {Promise<{outPath:string, driftFrames:number, parts:number}>}
 */
export async function spliceScenes({ basePath, inserts, outPath, workDir, fps = 30 }) {
  if (!inserts?.length) throw new Error('spliceScenes: список вставок пуст');
  await mkdir(workDir, { recursive: true });

  const base = await probe(basePath);
  // Границы окон кладём на сетку кадров: ffmpeg всё равно режет по кадрам, и без
  // квантования каждая вставка приносит свои доли кадра, которые складываются.
  const snap = (t) => Math.round(t * fps) / fps;
  const windows = inserts
    .map((w) => ({ ...w, t0: snap(w.t0), t1: snap(w.t1) }))
    .sort((a, b) => a.t0 - b.t0);
  assertWindows(windows, base.duration);

  const parts = [];
  let cursor = 0;
  for (const [i, win] of windows.entries()) {
    // Кусок базы до вставки. Нулевой длины не бывает — окно не начинается в 0
    // (первая сцена всегда со спикером, это правило ролика, а не техники).
    if (win.t0 - cursor > 0.04) {
      parts.push(await cutBase(basePath, cursor, win.t0, path.join(workDir, `keep-${i}.mp4`), fps));
    }
    const need = win.t1 - win.t0;
    // Звук вставки — из базы: под сгенерированной картинкой продолжает идти
    // живая речь ровно того же куска.
    const sound = await cutBase(basePath, win.t0, win.t1, path.join(workDir, `snd-${i}.mp4`), fps);
    parts.push(await fitGenerated(win.video, sound, need, path.join(workDir, `gen-${i}.mp4`), fps));
    cursor = win.t1;
  }
  if (base.duration - cursor > 0.04) {
    parts.push(await cutBase(basePath, cursor, base.duration, path.join(workDir, 'keep-tail.mp4'), fps));
  }

  // Итог подрезается ровно по длительности базы: каждая перекодированная часть
  // округляется вверх до целого кадра, и на пяти частях набегает больше кадра.
  await concat(parts, outPath, fps, base.duration);

  // Дрейф проверяем сразу: уехавшая на кадр вставка ломает все субтитры после неё,
  // и обнаружить это на готовом ролике дороже, чем здесь.
  //
  // Считаем ИМЕННО КАДРЫ, а не длительность контейнера. Длительность врёт: после
  // склейки звук добивается тишиной до ровной секунды и mp4 показывает +0.03 сек
  // при том, что видеокадров ровно столько же. Субтитры едут за картинкой, а не
  // за длиной звуковой дорожки, — мерить надо то, что едет.
  const driftFrames = Math.abs((await countFrames(outPath)) - (await countFrames(basePath)));
  return { outPath, driftFrames, parts: parts.length };
}

/** Сколько видеокадров в файле. Считается по пакетам — сведения контейнера врут. */
async function countFrames(src) {
  const { stdout } = await runBin('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-count_packets',
    '-show_entries', 'stream=nb_read_packets', '-of', 'default=nw=1:nk=1', src,
  ]);
  return Number(stdout.trim());
}

/** Кусок базы как есть: та же геометрия, тот же звук. */
async function cutBase(src, from, to, outPath, fps) {
  await runBin('ffmpeg', [
    '-y', '-i', src, '-ss', from.toFixed(3), '-to', to.toFixed(3),
    '-vf', `fps=${fps},setsar=1`,
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k',
    outPath,
  ]);
  return outPath;
}

/**
 * Привести клип модели к окну: геометрия базы, ровная длительность, звук из базы.
 *
 * Короткий клип добивается замиранием последнего кадра, длинный подрезается.
 * Растягивать по времени нельзя: движение поедет, и разница с живым куском будет
 * читаться сразу.
 */
async function fitGenerated(genVideo, soundFrom, need, outPath, fps) {
  const g = await probe(genVideo);
  if (!g.duration) throw new Error(`spliceScenes: не читается клип ${genVideo}`);

  const pad = need - g.duration;
  const vf = [
    `scale=${W}:${H}:force_original_aspect_ratio=increase`,
    `crop=${W}:${H}`,
    `fps=${fps}`,
    'setsar=1',
    // tpad добивает хвост замиранием; отрицательный pad просто отсечётся через -t.
    ...(pad > 0.02 ? [`tpad=stop_mode=clone:stop_duration=${(pad + 0.1).toFixed(3)}`] : []),
  ].join(',');

  await runBin('ffmpeg', [
    '-y',
    '-i', genVideo,
    '-i', soundFrom,
    '-filter_complex', `[0:v]${vf}[v]`,
    '-map', '[v]', '-map', '1:a:0',
    '-t', need.toFixed(3),
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k',
    outPath,
  ]);
  return outPath;
}

async function concat(parts, outPath, fps, duration) {
  await mkdir(path.dirname(outPath), { recursive: true });
  const inputs = parts.flatMap((p) => ['-i', p]);
  const chains = parts.map((_, i) => `[${i}:v]fps=${fps},setsar=1[v${i}]`).join(';');
  const streams = parts.map((_, i) => `[v${i}][${i}:a]`).join('');
  // Каждая перекодированная часть теряет или добирает доли кадра на границе, и на
  // склейке набегает до кадра в обе стороны. Поэтому хвост сначала добивается
  // (замиранием кадра и тишиной), а потом подрезается ровно по длительности базы —
  // так итог совпадает с базой при любом числе частей.
  const tail = duration ? ';[v]tpad=stop_mode=clone:stop_duration=1[vo];[a]apad[ao]' : '';
  await runBin('ffmpeg', [
    '-y', ...inputs,
    '-filter_complex', `${chains};${streams}concat=n=${parts.length}:v=1:a=1[v][a]${tail}`,
    '-map', duration ? '[vo]' : '[v]', '-map', duration ? '[ao]' : '[a]',
    ...(duration ? ['-t', duration.toFixed(3)] : []),
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart',
    outPath,
  ]);
  return outPath;
}

/**
 * Окна обязаны лежать внутри ролика и не пересекаться: пересечение означает, что
 * два куска претендуют на одно время, и склейка молча съест один из них.
 */
function assertWindows(windows, duration) {
  let prevEnd = 0;
  for (const [i, w] of windows.entries()) {
    if (!(w.t1 > w.t0)) throw new Error(`вставка #${i}: t1 (${w.t1}) должно быть больше t0 (${w.t0})`);
    if (w.t0 < prevEnd) throw new Error(`вставка #${i}: пересекается с предыдущей (t0=${w.t0} < ${prevEnd})`);
    if (w.t1 > duration + 0.01) throw new Error(`вставка #${i}: t1 (${w.t1}) за пределами ролика (${duration.toFixed(2)} сек)`);
    if (!w.video) throw new Error(`вставка #${i}: не указан video`);
    prevEnd = w.t1;
  }
}
