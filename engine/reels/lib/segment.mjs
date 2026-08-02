/**
 * segment.mjs — нарезка ролика на куски по ГРАНИЦАМ ФРАЗ, а не по круглым секундам.
 *
 * Приём из метода AI Cube: резать «ближайшую к кратной N границу фразы», а не
 * ровно каждые N.000 сек — иначе кусок обрывается на середине слова, и смонтированный
 * стык слышно. Границей считается пауза между словами больше PAUSE_MIN.
 *
 * Длина окна выбрана под seedance_2_0 (4–15 сек по config/models.json): ~10 сек —
 * середина диапазона, туда же попадает раскадровка из 6 панелей по 1.5–2 сек.
 */

/** Минимальная пауза между словами, которая считается концом фразы (сек). */
const PAUSE_MIN = 0.35;

/**
 * @param {Array<{w:string,s:number,e:number}>} words - пословный транскрипт
 * @param {Object} [opts]
 * @param {number} [opts.target=10] - желаемая длина куска, сек
 * @param {number} [opts.min=4] - минимум (ниже модель не примет)
 * @param {number} [opts.max=15] - максимум
 * @returns {Array<{n:number,start:number,end:number,text:string,words:Array}>}
 */
export function segmentByPhrase(words, opts = {}) {
  const { target = 10, min = 4, max = 15 } = opts;
  if (!words?.length) return [];

  const boundaries = phraseBoundaries(words);
  const total = words[words.length - 1].e;
  const segments = [];
  let start = words[0].s;
  let n = 1;

  while (start < total - 0.1) {
    const idealEnd = start + target;
    const remaining = total - start;

    // Хвост короче максимума — забираем целиком, не плодим огрызок.
    if (remaining <= max) {
      segments.push(makeSegment(n, start, total, words));
      break;
    }

    const end = nearestBoundary(boundaries, idealEnd, start + min, start + max) ?? idealEnd;
    segments.push(makeSegment(n, start, end, words));
    start = end;
    n += 1;
  }

  return segments;
}

/** Концы фраз: слово, после которого пауза >= PAUSE_MIN. Плюс самый конец записи. */
function phraseBoundaries(words) {
  const out = [];
  for (let i = 0; i < words.length - 1; i += 1) {
    if (words[i + 1].s - words[i].e >= PAUSE_MIN) out.push(words[i].e);
  }
  out.push(words[words.length - 1].e);
  return out;
}

/** Ближайшая к ideal граница внутри [lo, hi]; null — если в окне границ нет. */
function nearestBoundary(boundaries, ideal, lo, hi) {
  let best = null;
  let bestDist = Infinity;
  for (const b of boundaries) {
    if (b < lo || b > hi) continue;
    const d = Math.abs(b - ideal);
    if (d < bestDist) { best = b; bestDist = d; }
  }
  return best;
}

function makeSegment(n, start, end, words) {
  const inside = words.filter((w) => w.s >= start - 0.01 && w.e <= end + 0.01);
  return {
    n,
    start: round(start),
    end: round(end),
    duration: round(end - start),
    text: inside.map((w) => w.w).join(' '),
    words: inside,
  };
}

function round(v) {
  return Math.round(v * 1000) / 1000;
}
