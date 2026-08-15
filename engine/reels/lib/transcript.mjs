/**
 * transcript.mjs — приёмка расшифровки ДО того, как заказан хоть один кадр.
 *
 * Заведено 15.08.2026. За два дня два дефекта в готовых роликах оказались вовсе не
 * дефектами генерации: титр честно повторял расшифровку, а врала она.
 *
 *   «тебе это обходило.»      вместо «обходилось»   — увидели на 121-кредитном ролике
 *   «однако Русель. Сейчас»   вместо «одна карусель» — увидели там же
 *
 * Между `transcribe-local.mjs` и первым платным вызовом не было ни одного шага. При этом
 * текст лежит на диске и стоит ноль — самое дешёвое место, где ошибку можно поймать.
 *
 * ДВЕ ПОЛОВИНЫ, потому что дефекты разной природы:
 *
 *   машинная  — ловит формальные признаки: заглавная буква в середине предложения
 *               (так вылезло «Русель»), латиница в русском тексте, повтор слова подряд,
 *               цифровой диапазон. Дёшево и надёжно, но узко.
 *   читателем — «обходило» валидное русское слово, машиной его не поймать никак.
 *               Нужен человек или Claude Code, который читает текст против темы ролика.
 *
 * Поэтому проверка не «умная», а ЧЕСТНАЯ: она размечает подозрительное и печатает текст
 * так, чтобы его было удобно прочесть целиком. Решение принимает читатель.
 */

/** Русские союзы и предлоги — на них титр заканчиваться не должен (правило линта). */
const RU_UPPER = /^[А-ЯЁ]/;
const HAS_LATIN = /[A-Za-z]/;
const HAS_CYR = /[А-Яа-яЁё]/;
const DIGIT_RANGE = /\d+\s*[-–—]\s*\d+/;

/**
 * Машинная разметка подозрительных слов.
 *
 * ВАЖНО про ложные срабатывания: имена, названия и аббревиатуры тоже пишутся с заглавной
 * и тоже попадут в список. Это осознанно — цена ложной тревоги здесь нулевая (прочитать
 * лишнюю строку), а цена пропуска измерена в кредитах.
 *
 * @param {Array<{w:string,s:number,e:number}>} words
 * @returns {Array<{i:number, word:string, at:number, why:string}>}
 */
export function suspicious(words) {
  const out = [];
  let sentenceStart = true;

  words.forEach((word, i) => {
    const w = String(word.w || '');
    const bare = w.replace(/[.,!?;:»«"]/g, '');

    if (!sentenceStart && RU_UPPER.test(bare) && bare.length > 1) {
      out.push({ i, word: w, at: word.s, why: 'заглавная буква в середине предложения — так вылезло «Русель»' });
    }
    if (HAS_LATIN.test(bare) && HAS_CYR.test(bare)) {
      out.push({ i, word: w, at: word.s, why: 'латиница вперемешку с кириллицей' });
    }
    if (DIGIT_RANGE.test(w)) {
      out.push({ i, word: w, at: word.s, why: 'цифровой диапазон — модель перерисовывает цифры по-своему' });
    }
    const prev = i > 0 ? String(words[i - 1].w || '').replace(/[.,!?;:]/g, '').toLowerCase() : '';
    if (prev && prev === bare.toLowerCase() && bare.length > 2) {
      out.push({ i, word: w, at: word.s, why: 'слово повторено подряд — обычно артефакт расшифровки' });
    }

    sentenceStart = /[.!?]$/.test(w);
  });

  return out;
}

/**
 * Разложить расшифровку на предложения с таймкодами — в таком виде её реально читают.
 *
 * Сплошной поток слов глазами не проверяется: сегодня «однако Русель» пролежало в файле
 * два дня и было замечено только в кадре готового ролика.
 *
 * @param {Array<{w:string,s:number,e:number}>} words
 * @returns {Array<{from:number, to:number, text:string}>}
 */
export function sentences(words) {
  const out = [];
  let buf = [];
  for (const word of words) {
    buf.push(word);
    if (/[.!?]$/.test(String(word.w || ''))) {
      out.push(makeSentence(buf));
      buf = [];
    }
  }
  if (buf.length) out.push(makeSentence(buf));
  return out;
}

function makeSentence(buf) {
  return {
    from: buf[0].s,
    to: buf[buf.length - 1].e,
    text: buf.map((w) => w.w).join(' '),
  };
}

/**
 * Есть ли подпись «проверено» на файле расшифровки.
 *
 * Подпись живёт В САМОМ ФАЙЛЕ, а не сбоку: сайдкар теряется при копировании дубля в
 * другую папку, а расшифровка без подписи молча снова становится непроверенной.
 * Загрузчики уже умеют обе формы — `Array.isArray(raw) ? raw : raw.words`.
 *
 * @param {Array|Object} raw - содержимое words.json
 * @returns {{ok: boolean, at?: string, note?: string}}
 */
export function reviewMark(raw) {
  if (Array.isArray(raw)) return { ok: false };
  const r = raw?.reviewed;
  if (!r) return { ok: false };
  return { ok: true, at: r.at || '', note: r.note || '' };
}

/** Достать слова из любой из двух форм файла. */
export function wordsOf(raw) {
  return Array.isArray(raw) ? raw : (raw?.words || []);
}

/** Обернуть слова в подписанную форму, сохранив уже имеющуюся обёртку. */
export function signed(raw, { note = '' } = {}) {
  const words = wordsOf(raw);
  const rest = Array.isArray(raw) ? {} : { ...raw };
  delete rest.words;
  return {
    ...rest,
    reviewed: { at: new Date().toISOString(), note },
    words,
  };
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(2).padStart(5, '0');
  return `${m}:${s}`;
}

/**
 * Отчёт для чтения человеком: подозрительное сверху, полный текст предложениями снизу.
 * @param {Array} words
 * @returns {string}
 */
export function report(words) {
  const susp = suspicious(words);
  const sents = sentences(words);
  const lines = [
    `# Расшифровка на проверку — ${words.length} слов, ${fmt(words[words.length - 1]?.e || 0)}`,
    '',
    '> Титр в кадре повторяет этот текст ДОСЛОВНО. Ошибка здесь станет ошибкой в видео,',
    '> и увидим мы её уже после того, как заплатили за монтаж.',
    '',
  ];

  if (susp.length) {
    lines.push(`## Машина отметила подозрительное (${susp.length})`, '');
    for (const s of susp) lines.push(`- \`${fmt(s.at)}\` **${s.word}** — ${s.why}`);
    lines.push('');
  } else {
    lines.push('## Машина подозрительного не нашла', '',
      'Это НЕ значит, что текст верный: «обходило» вместо «обходилось» — валидное русское',
      'слово, никакой машинный признак его не поймает. Читайте текст ниже целиком.', '');
  }

  lines.push('## Текст предложениями', '');
  for (const s of sents) lines.push(`- \`${fmt(s.from)}–${fmt(s.to)}\` ${s.text}`);
  lines.push('',
    '## Как подписать',
    '',
    'Прочитать текст против темы дубля, поправить что нужно прямо в words.json, затем:',
    '',
    '```',
    'node reels/transcript-check.mjs <видео.words.json> --sign',
    '```');

  return lines.join('\n');
}
