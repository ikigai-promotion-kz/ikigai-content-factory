/**
 * edl.mjs — монтажный лист: что вырезаем, где режем, какой крупностью снят каждый кусок.
 *
 * Это ответ на приёмку 28.07 «более менее норм». Первая версия монтажа наклеивала
 * текст на нетронутое видео: 28 секунд одного статичного плана говорящей головы.
 * По M02 (knowledge/video-craft.md) стимул обязан меняться каждые 3–6 секунд, а всё,
 * что не двигает к пэйоффу, вырезается. Оверлей такого не лечит — лечит монтаж.
 *
 * Два инструмента, оба из одного статичного дубля:
 *  1. Вырезка мёртвого воздуха. В тестовом файле его 6.4 сек из 28 — четверть ролика.
 *  2. Смена крупности на каждой фразе. Кат по границе фразы + другой кроп читается
 *     как намеренный jump cut (норма TikTok), а не как склейка-ошибка.
 *
 * Время живёт в двух шкалах: `src` — исходник, `out` — уже смонтированное.
 * Всё, что уходит в оверлей, пересчитано в `out`.
 */

/** Крупности. z=1 — исходный кадр целиком; cx/cy — куда смещён центр кропа (0..1). */
export const SHOTS = {
  wide:  { z: 1.00, cx: 0.50, cy: 0.50 },
  mid:   { z: 1.10, cx: 0.50, cy: 0.42 },
  tight: { z: 1.24, cx: 0.52, cy: 0.32 },
  // Ещё два крупных плана — чтобы акцентные фразы не выглядели одним и тем же
  // кадром. Отличаются и зумом, и точкой кадрирования: разница должна читаться.
  tightUp: { z: 1.32, cx: 0.50, cy: 0.24 },
  tightSide: { z: 1.28, cx: 0.64, cy: 0.30 },
  // Лицо уходит влево — справа освобождается место под карточку/врезку.
  offL:  { z: 1.16, cx: 0.72, cy: 0.38 },
  offR:  { z: 1.16, cx: 0.28, cy: 0.38 },
  // Медленный проезд внутри кадра: живое дыхание в длинной фразе без зума.
  drift: { z: 1.14, cx: 0.38, cy: 0.42, pan: { cx: 0.62 } },
  driftUp: { z: 1.18, cx: 0.50, cy: 0.50, pan: { cy: 0.30 } },
  /**
   * Спикер в боксе на размытом фоне из своего же кадра. Ставится там, где по смыслу
   * нужен пруф или титр: под боксом освобождается полкадра под контент.
   * Исходник — селфи-крупняк, кропом из него разнообразия не выжать; смена
   * композиции кадра работает сильнее, чем ещё один процент зума.
   */
  boxed: { layout: 'boxed' },
};

/** Порядок чередования крупностей. Соседние никогда не совпадают. */
const CYCLE = ['tight', 'wide', 'offL', 'mid', 'drift', 'offR', 'driftUp', 'mid'];

/** Крупные планы под акцентные фразы — перебираются по кругу, не повторяя подряд. */
const ACCENTS = ['tight', 'tightUp', 'tightSide'];

/**
 * Собрать монтажный лист.
 *
 * @param {Object} args
 * @param {Array<{w:string,s:number,e:number}>} args.words - слова во времени ИСХОДНИКА (уже выровненные по звуку)
 * @param {Array<{start:number,end:number}>} args.runs - речевые прогоны во времени исходника
 * @param {number} args.duration - длительность исходника
 * @param {Object} [args.opts]
 * @param {number} [args.opts.air=0.12] - сколько тишины оставить по краям фразы
 * @param {number} [args.opts.maxChars=26] - длина строки субтитра
 * @param {number} [args.opts.maxShot=3.2] - длиннее этого шот делится пополам
 * @param {string[]} [args.opts.keywords] - слова-акценты (подсвечиваются в субтитрах)
 * @param {number[]} [args.opts.boxedPhrases] - индексы фраз, на которых спикер уходит в бокс
 *   (там оверлей показывает пруф или титр — им нужно место в кадре)
 * @returns {{keeps:Array,clips:Array,phrases:Array,words:Array,outDuration:number,cut:number}}
 */
export function buildEdl({ words, runs, duration, opts = {} }) {
  const { air = 0.12, maxChars = 26, maxShot = 3.2, keywords = [], boxedPhrases = [] } = opts;

  // ── 1. Что оставляем от исходника ──
  const keeps = mergeKeeps(runs.map((r) => ({
    start: Math.max(0, r.start - air),
    end: Math.min(duration, r.end + air),
  })));

  const cut = duration - keeps.reduce((a, k) => a + (k.end - k.start), 0);
  const outDuration = duration - cut;

  // ── 2. Слова в новом времени ──
  const outWords = words
    .map((w) => ({ w: w.w, s: srcToOut(w.s, keeps), e: srcToOut(w.e, keeps), key: isKey(w.w, keywords) }))
    .filter((w) => w.s !== null && w.e !== null);

  // ── 3. Фразы: то, что зритель читает одним взглядом ──
  const phrases = groupPhrases(outWords, { maxChars })
    .map((p) => ({ ...p, t1: Math.min(p.t1, outDuration) }));

  // ── 4. Шоты: по фразе, длинные делим, крупности не повторяются подряд ──
  const shots = [];
  let accentIdx = 0;
  phrases.forEach((p, pi) => {
    const span = p.t1 - p.t0;
    const boxed = boxedPhrases.includes(pi);
    const hasKey = p.words.some((w) => w.key);
    // Боксовая сцена не дробится: композиция кадра не должна дёргаться под пруфом.
    const parts = !boxed && span > maxShot ? Math.ceil(span / maxShot) : 1;
    for (let i = 0; i < parts; i += 1) {
      shots.push({
        t0: p.t0 + (span * i) / parts,
        t1: p.t0 + (span * (i + 1)) / parts,
        name: boxed ? 'boxed' : pickShot(shots.length, shots.at(-1)?.name, hasKey, accentIdx),
        phrase: pi,
      });
      if (hasKey && !boxed) accentIdx += 1;
    }
  });
  // Первый кадр — всегда лицо крупно: правило «панель 1 = спикер-хук».
  if (shots.length && shots[0].name !== 'boxed') shots[0].name = 'tight';
  // Хвост не должен обрываться на проезде — финал статичный, под CTA-титр.
  if (shots.length > 1 && shots.at(-1).name !== 'boxed') {
    shots.at(-1).name = shots.at(-2).name === 'mid' ? 'wide' : 'mid';
  }

  // Шоты обязаны идти вплотную: клипы склеиваются concat'ом, и дырка между ними
  // укоротила бы ролик и увела бы весь оверлей из синхрона. Границу ставим по
  // середине паузы — каждому шоту достаётся немного воздуха на вдох.
  for (let i = 0; i < shots.length - 1; i += 1) {
    const mid = (shots[i].t1 + shots[i + 1].t0) / 2;
    shots[i].t1 = mid;
    shots[i + 1].t0 = mid;
  }
  if (shots.length) {
    shots[0].t0 = 0;
    shots.at(-1).t1 = outDuration;
  }

  // ── 5. Клипы для ffmpeg ──
  // Резать надо не только по границам шотов, но и по стыкам keeps: вырезанная тишина
  // в шкале монтажа имеет нулевую длину, и клип, «переехавший» через такой стык,
  // втянул бы вырезанную паузу обратно. Первый прогон споткнулся ровно здесь —
  // база вышла 26.5 сек вместо 23.9. Поэтому границы клипов = шоты ∪ стыки.
  const junctions = [];
  let acc = 0;
  for (const k of keeps) { acc += k.end - k.start; junctions.push(acc); }

  // Границы шотов и стыки почти совпадают (и те и другие живут в паузах), но совпадают
  // не до миллисекунды. Близкие границы сливаем в одну, и приоритет всегда у стыка:
  // потерянный стык = вырезанная пауза, вернувшаяся в кадр.
  const marks = [
    ...junctions.map((t) => ({ t, junction: true })),
    ...shots.slice(0, -1).map((s) => ({ t: s.t1, junction: false })),
  ]
    .filter((m) => m.t > 0.05 && m.t < outDuration - 0.05)
    .sort((a, b) => a.t - b.t);

  const edges = [0];
  let group = [];
  const flush = () => {
    if (!group.length) return;
    const j = group.find((m) => m.junction);
    edges.push(j ? j.t : group[0].t);
    group = [];
  };
  for (const m of marks) {
    if (group.length && m.t - group[0].t > 0.12) flush();
    group.push(m);
  }
  flush();
  edges.push(outDuration);

  const clips = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    const [a, b] = [edges[i], edges[i + 1]];
    if (b - a < 0.06) continue;                                  // огрызок не клип
    const mid = (a + b) / 2;
    const s = shots.find((sh) => mid >= sh.t0 && mid <= sh.t1) || shots.at(-1);
    const span = s.t1 - s.t0 || 1;
    clips.push({
      out: { start: round3(a), end: round3(b) },
      src: { start: outToSrc(a, keeps, 'start'), end: outToSrc(b, keeps, 'end') },
      shot: s.name,
      // Доля шота, которую занимает клип: проезд не сбрасывается на стыке.
      phase: { a: clamp01((a - s.t0) / span), b: clamp01((b - s.t0) / span) },
    });
  }

  return { keeps, clips, phrases, words: outWords, outDuration, cut };
}

/** Склеить пересекающиеся/соседние интервалы. */
function mergeKeeps(list) {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const out = [];
  for (const k of sorted) {
    const last = out.at(-1);
    if (last && k.start <= last.end) last.end = Math.max(last.end, k.end);
    else out.push({ ...k });
  }
  return out;
}

/**
 * Время исходника → время монтажа. null, если момент вырезан.
 */
export function srcToOut(t, keeps) {
  let acc = 0;
  for (const k of keeps) {
    if (t < k.start) return acc;              // попал в вырезанную тишину — прижимаем к стыку
    if (t <= k.end) return round3(acc + (t - k.start));
    acc += k.end - k.start;
  }
  return round3(acc);
}

/**
 * Время монтажа → время исходника.
 * @param {'start'|'end'} [side] - ровно на стыке двух keeps ответ двоякий: для конца
 *   клипа это конец предыдущего куска, для начала следующего — начало нового.
 */
export function outToSrc(t, keeps, side = 'end') {
  let acc = 0;
  for (const k of keeps) {
    const len = k.end - k.start;
    const inside = side === 'start' ? t < acc + len - 1e-6 : t <= acc + len + 1e-6;
    if (inside) return round3(k.start + (t - acc));
    acc += len;
  }
  return round3(keeps.at(-1).end);
}

/** Слова во фразы: по паузе и по длине строки. */
function groupPhrases(words, { maxChars }) {
  const out = [];
  let cur = null;
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const gap = prev ? w.s - prev.e : 0;
    const tooLong = cur && cur.text.length + w.w.length + 1 > maxChars;
    if (!cur || gap >= 0.22 || tooLong) {
      if (cur) out.push(cur);
      cur = { t0: w.s, t1: w.e, text: w.w, words: [w] };
    } else {
      cur.text += ' ' + w.w;
      cur.t1 = w.e;
      cur.words.push(w);
    }
  });
  if (cur) out.push(cur);
  // Фраза не должна гаснуть раньше, чем её прочитали.
  return out.map((p) => ({ ...p, t1: Math.max(p.t1, p.t0 + 0.6) }));
}

/**
 * Крупность для шота: акцентная фраза — крупно, соседние не повторяются.
 *
 * `accentIdx` считает акценты отдельно от общего счётчика: иначе все акцентные
 * фразы получали один и тот же `tight` (в принятом ролике — 5 одинаковых планов
 * из 13, и монтаж выглядел ленивым). Теперь крупные планы чередуются между собой.
 */
function pickShot(index, prevName, hasKey, accentIdx = 0) {
  if (hasKey) {
    for (let i = 0; i < ACCENTS.length; i += 1) {
      const name = ACCENTS[(accentIdx + i) % ACCENTS.length];
      if (name !== prevName) return name;
    }
  }
  for (let i = 0; i < CYCLE.length; i += 1) {
    const name = CYCLE[(index + i) % CYCLE.length];
    if (name !== prevName) return name;
  }
  return 'mid';
}

function isKey(word, keywords) {
  const w = word.toLowerCase().replace(/[«»",.!?—-]/g, '');
  return keywords.some((k) => w.startsWith(k.toLowerCase()));
}

function round3(x) { return Math.round(x * 1000) / 1000; }
function clamp01(x) { return Math.min(1, Math.max(0, x)); }
