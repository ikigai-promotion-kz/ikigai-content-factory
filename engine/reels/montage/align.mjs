/**
 * align.mjs — привязка транскрипта к реальному звуку.
 *
 * Зачем: пословные таймкоды whisper-1 плывут на ±0.5 сек, а караоке-субтитры такой
 * рассинхрон показывают в лицо. Прогон 28.07 это подтвердил: whisper держал слово
 * «Идут» с 0.00 по 2.02, тогда как речь в файле начинается только на 1.45 —
 * первая пилюля висела две секунды над молчанием.
 *
 * Правда о том, где речь, а где тишина, лежит в самом звуке. Берём её через
 * ffmpeg silencedetect и раскладываем слова внутри найденных речевых прогонов
 * пропорционально длине слова. Порядок и группировку слов даёт транскрипт,
 * границы — звук. Ноль обращений к API, детерминированно.
 */

import { runBin } from '../lib/bin.mjs';

/**
 * Интервалы тишины по данным ffmpeg.
 * @param {string} src - путь к видео/аудио
 * @param {Object} [opts] - { noiseDb=-32, minDur=0.28 }
 * @returns {Promise<Array<{start:number,end:number}>>}
 */
export async function detectSilence(src, opts = {}) {
  const { noiseDb = -32, minDur = 0.28 } = opts;
  let stderr = '';
  try {
    const r = await runBin('ffmpeg', [
      '-hide_banner', '-i', src,
      '-af', `silencedetect=noise=${noiseDb}dB:d=${minDur}`,
      '-f', 'null', '-',
    ]);
    stderr = r.stderr;
  } catch (e) {
    // ffmpeg на анализе завершается ненулевым кодом не всегда, но stderr нам нужен в любом случае.
    stderr = e.stderr || '';
    if (!stderr) throw e;
  }

  const out = [];
  let open = null;
  for (const line of stderr.split('\n')) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    if (s) { open = Math.max(0, Number(s[1])); continue; }
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (e && open !== null) { out.push({ start: open, end: Number(e[1]) }); open = null; }
  }
  return out;
}

/**
 * Речевые прогоны — то, что осталось между тишинами.
 * @param {Array<{start:number,end:number}>} silences
 * @param {number} duration - полная длительность
 * @returns {Array<{start:number,end:number}>}
 */
export function speechRuns(silences, duration) {
  const runs = [];
  let cursor = 0;
  for (const s of [...silences].sort((a, b) => a.start - b.start)) {
    if (s.start > cursor + 0.05) runs.push({ start: cursor, end: s.start });
    cursor = Math.max(cursor, s.end);
  }
  if (duration - cursor > 0.05) runs.push({ start: cursor, end: duration });
  return runs;
}

/**
 * Разложить слова транскрипта по речевым прогонам.
 *
 * Слово попадает в тот прогон, с которым сильнее всего пересекается по времени
 * транскрипта; если пересечений нет вообще (транскрипт уехал) — в ближайший.
 * Внутри прогона время делится пропорционально длине слова: длинное слово
 * произносится дольше короткого, и это заметно точнее равных долей.
 *
 * @param {Array<{w:string,s:number,e:number}>} words
 * @param {Array<{start:number,end:number}>} runs
 * @returns {Array<{w:string,s:number,e:number}>} слова во времени исходника
 */
export function alignWords(words, runs) {
  if (!runs.length) return words;

  const buckets = runs.map(() => []);
  for (const w of words) {
    let best = 0;
    let bestScore = -Infinity;
    runs.forEach((r, i) => {
      const overlap = Math.min(w.e, r.end) - Math.max(w.s, r.start);
      // Пересечение всегда лучше близости: близость идёт в минус, пересечение в плюс.
      const score = overlap > 0 ? overlap : -Math.min(Math.abs(w.s - r.end), Math.abs(r.start - w.e));
      if (score > bestScore) { bestScore = score; best = i; }
    });
    buckets[best].push(w);
  }

  const out = [];
  buckets.forEach((bucket, i) => {
    if (!bucket.length) return;
    const r = runs[i];
    const span = r.end - r.start;
    // +1 на пробел: пауза между словами тоже занимает время.
    const weights = bucket.map((w) => w.w.length + 1);
    const total = weights.reduce((a, b) => a + b, 0);
    let t = r.start;
    bucket.forEach((w, k) => {
      const d = (span * weights[k]) / total;
      out.push({ w: w.w, s: round3(t), e: round3(t + d) });
      t += d;
    });
  });

  return out.sort((a, b) => a.s - b.s);
}

function round3(x) { return Math.round(x * 1000) / 1000; }

/**
 * Всё вместе: снять тишину, получить прогоны, выровнять слова.
 * @param {string} src
 * @param {Array<{w:string,s:number,e:number}>} words
 * @param {number} duration
 * @param {Object} [opts] - проброс в detectSilence
 */
export async function alignToAudio(src, words, duration, opts = {}) {
  const silences = await detectSilence(src, opts);
  const runs = speechRuns(silences, duration);
  return { silences, runs, words: alignWords(words, runs) };
}
