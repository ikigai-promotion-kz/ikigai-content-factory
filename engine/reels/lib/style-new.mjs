/**
 * style-new.mjs — сборка и проверка НОВОГО видео-стиля.
 *
 * Зачем: до 03.08.2026 стиль добавлялся руками в двух файлах (`lib/styles.mjs` и
 * `montage/overlay.mjs`), без обязательных полей и без единой проверки. Половина
 * знания при этом терялась: анти-правила стиля выяснялись прогоном и оставались
 * в голове, а не в записи.
 *
 * Здесь: валидатор записи (что нельзя пропустить в промпт и чего нельзя забыть)
 * плюс сборка черновиков — темы оверлея, промпта картинки-фона и чек-листа приёмки.
 * Сам стиль придумывает человек или агент по рецепту `reels/knowledge/style-recipes.md`;
 * этот модуль ничего не выдумывает, он проверяет и раскладывает.
 *
 * Запреты берутся из ОДНОГО места — LEAK_PATTERNS в `lib/montage.mjs`: формула и фон
 * уходят в те же промпты, что и текст монтажа, и второй список регулярок разошёлся бы
 * с первым на первой же правке.
 */

import { STYLES, STYLE_KEYS } from './styles.mjs';
import { LEAK_PATTERNS } from './montage.mjs';
import { PRESETS } from '../montage/overlay.mjs';

/** Поля записи, которые уходят В ПРОМПТ и потому проверяются на утечки. */
const PROMPT_FIELDS = ['formula', 'background', 'extra', 'light', 'panelType'];

/** Обязательные русские поля: без них стиль не найдёт retrieval и не поймёт человек. */
const RU_FIELDS = ['name', 'mood', 'whenToUse', 'signature', 'risk'];

/** Оси: девять дизайнерских плюс четыре видео-оси. */
const AXIS_KEYS = [
  'napravlenie', 'medium', 'faktura', 'kompoziciya', 'tipografika', 'cvet', 'nastroenie',
  'motion', 'cutRhythm', 'sound', 'shots',
];

const MODES = ['A', 'B', 'C'];
const TIERS = ['theme', 'scene', 'generative'];

/** Литеральные эмодзи срывают генерацию борда — в промпт они попадать не должны. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
/** Кавычки и гильеметы модель печатает в кадр как символы. */
const QUOTES = /[«»""'']/;

/**
 * Проверить запись стиля.
 *
 * @param {string} key - ключ стиля (kebab-case, латиница)
 * @param {Object} style - запись
 * @param {Object} [opts]
 * @param {boolean} [opts.isNew=true] - новый стиль (проверять занятость ключа)
 * @returns {{ok:boolean, problems:string[], warnings:string[]}}
 */
export function validateStyle(key, style, opts = {}) {
  const { isNew = true } = opts;
  const problems = [];
  const warnings = [];
  const s = style || {};

  // ── ключ ──
  if (!/^[a-z][a-z0-9-]*$/.test(String(key || ''))) {
    problems.push(`ключ «${key}»: только строчная латиница, цифры и дефис — он идёт в --style= и в имена файлов`);
  }
  if (isNew && STYLE_KEYS.includes(key)) {
    problems.push(`ключ «${key}» уже занят стилем «${STYLES[key].name}»`);
  }

  // ── утечки в полях, уходящих в промпт ──
  for (const f of PROMPT_FIELDS) {
    const v = s[f];
    if (v == null || v === '') continue;
    if (typeof v !== 'string') { problems.push(`${f}: должно быть строкой`); continue; }
    const leaked = LEAK_PATTERNS.filter((re) => re.test(v));
    if (leaked.length) {
      problems.push(`${f}: остался цветовой код, таймкод или имя файла — модель напечатает это текстом в кадре`);
    }
    if (EMOJI.test(v)) problems.push(`${f}: литеральный эмодзи — описывать словами, иначе срывается генерация борда`);
    if (QUOTES.test(v)) problems.push(`${f}: кавычки или гильеметы — модель печатает их в кадр`);
    if (/[а-яё]/i.test(v)) problems.push(`${f}: русские буквы в поле, которое уходит в англоязычный промпт`);
  }

  // ── обязательные русские поля ──
  for (const f of RU_FIELDS) {
    if (!String(s[f] || '').trim()) {
      problems.push(`${f}: пустое (${f === 'risk' ? 'нет риска — значит про него не думали' : 'обязательное поле'})`);
    }
  }
  if (!String(s.formula || '').trim()) problems.push('formula: пустая — без неё стиль не попадёт ни в один промпт');
  if (!String(s.background || '').trim()) problems.push('background: пустой — нечего подставить в замену среды');
  if (!String(s.panelType || '').trim()) problems.push('panelType: пустой — типографика панели-кульминации теряется');

  // ── палитра ──
  if (!Array.isArray(s.palette) || !s.palette.length) {
    problems.push('palette: нужен непустой массив hex (для наших плашек и приёмки, в промпт он не идёт)');
  } else {
    const bad = s.palette.filter((c) => !/^#[0-9a-fA-F]{6}$/.test(String(c)));
    if (bad.length) problems.push(`palette: не hex — ${bad.join(', ')}`);
  }

  // ── режим, цена, согласованность ──
  if (!MODES.includes(s.mode)) problems.push(`mode: «${s.mode}» — должно быть A, B или C`);
  if (!TIERS.includes(s.tier)) problems.push(`tier: «${s.tier}» — должно быть theme, scene или generative`);

  if ((s.tier === 'theme' || s.tier === 'scene')) {
    if (!s.theme) {
      problems.push(`tier «${s.tier}» обещает бесплатный слой, но theme = null — либо заводите тему, либо tier generative`);
    } else if (!(s.theme in PRESETS)) {
      problems.push(`theme «${s.theme}» нет в PRESETS (montage/overlay.mjs). Есть: ${Object.keys(PRESETS).join(', ')}`);
    }
  }
  if (s.mode === 'C' && s.tier !== 'generative') {
    problems.push('mode C — это агрессивный сгенерированный мир, вёрсткой он не собирается: tier обязан быть generative');
  }
  if (s.mode === 'A' && s.light) {
    problems.push('mode A сохраняет реальную среду — свет мира на спикера не ложится, light должен быть null');
  }
  if (s.mode !== 'A' && !String(s.light || '').trim()) {
    problems.push(`mode ${s.mode} заменяет мир — заполните light: как этот мир освещает спикера (иначе стиль читается как наклейка)`);
  }
  if (s.textAsObject === true && !String(s.extra || '').trim()) {
    problems.push('textAsObject: текст-объект всегда ломается по-своему — анти-правило в extra обязательно');
  }
  if (typeof s.textAsObject !== 'boolean') problems.push('textAsObject: нужно true или false');

  // ── оси ──
  const axes = s.axes || {};
  for (const a of AXIS_KEYS) {
    const v = axes[a];
    if (a === 'shots') {
      if (!Array.isArray(v) || !v.length) problems.push('axes.shots: нужен непустой массив типов шотов из shot-vocabulary.md');
      continue;
    }
    if (!String(v || '').trim()) problems.push(`axes.${a}: пустая ось`);
  }

  // ── уникальность приёма ──
  if (s.signature) {
    const clash = STYLE_KEYS.find((k) => k !== key && STYLES[k].signature === s.signature);
    if (clash) problems.push(`signature дословно совпадает со стилем «${STYLES[clash].name}» — приём обязан различать стили`);
  }

  // ── предупреждения ──
  if (!s.proof) warnings.push('proof не заполнен: стиль ЗАЯВЛЕН, не доказан — в клиентскую работу не брать');
  if (s.tier === 'scene') warnings.push('tier scene: нужна картинка-фон в reels/knowledge/scene-backdrops/ — промпт ниже');
  if (!String(axes.sound || '').trim()) warnings.push('axes.sound пуст: звуковой характер не описан (движок его пока не применяет, но поле кормит подбор)');
  if (String(s.formula || '').length > 400) warnings.push(`formula ${s.formula.length} знаков: длинные формулы модель размывает, держите до 400`);

  return { ok: problems.length === 0, problems, warnings };
}

/**
 * Черновик темы оверлея из палитры стиля.
 *
 * Именно ЧЕРНОВИК: цвета плашек подбираются глазами на контрольных кадрах. Здесь
 * раскладка «база / акцент / текст» по палитре и радиусы по характеру стиля —
 * чтобы человек начинал не с пустого места.
 *
 * @param {Object} style - запись стиля
 * @returns {Object|null} объект для PRESETS или null, если стиль только генеративный
 */
export function themeDraft(style) {
  if (!style.theme) return null;
  const [base, accent, third] = style.palette;
  const dark = isDark(base);
  const text = dark ? (third && !isDark(third) ? third : '#FFFFFF') : '#111111';
  const sub = dark ? '#9A9A9A' : '#6E6E6E';
  // Острые углы — для брутального и печатного, мягкие — для тёплого и разговорного.
  const sharp = /брутал|штампован|condensed|моно|газет|гранж|швейцар/i.test(
    `${style.axes?.tipografika || ''} ${style.axes?.napravlenie || ''}`
  );
  const r = sharp ? ['2px', '2px', '0px'] : ['20px', '20px', '14px'];

  return {
    accent,
    cardBg: base, cardText: text, cardSub: sub,
    capBg: base, capText: text,
    sceneBg: rgba(base, dark ? 0.94 : 0.95),
    ...(dark ? { sceneSub: sub } : { sceneText: text, sceneSub: sub }),
    frameColor: base, plateBg: base,
    radiusCard: r[0], radiusCap: r[1], radiusHook: r[2],
  };
}

/**
 * Промпт картинки-фона под полноэкранные кадры (tier scene).
 * Требования — из reels/knowledge/scene-backdrops/README.md: они выведены на первой
 * партии, где два фона пришлось переделать.
 *
 * @param {Object} style
 * @returns {string}
 */
export function backdropPrompt(style) {
  return [
    `${style.formula}.`,
    'A full-frame texture filling the entire vertical frame, not an object lying on a surface.',
    'Empty centre and empty bottom third: the headline, the rule and the caption go there.',
    'NO text, NO letters, NO handwriting, NO stamps with writing, NO numbers.',
    'No people, no faces, no hands.',
    'Vertical 9:16.',
  ].join(' ');
}

/**
 * Чек-лист приёмки конкретного стиля: общий регламент плюс то, что ломается именно тут.
 * @param {string} key
 * @param {Object} style
 * @returns {string[]}
 */
export function acceptanceChecklist(key, style) {
  const list = [
    'Борд посмотрен ГЛАЗАМИ до оплаты монтажа: русский без ошибок, панелей ровно столько, лицо узнаваемо, служебных подписей нет.',
    'Результат разложен на кадры ПОДРЯД (не одиночный -ss): лицо не подменено ни в одном кадре.',
    'Русские титры совпадают с речью пословно; звук возвращён через reels/align-audio.mjs.',
  ];
  if (style.mode !== 'A') {
    list.push(`Свет мира ложится на спикера (${style.light}) — иначе стиль читается как наклейка поверх кадра.`);
  }
  if (style.textAsObject) {
    list.push('Текст-объекты читаемы: подписи не обрезаны краем материала, контраст держит на мелком кегле.');
  }
  if (style.mode === 'B' || style.mode === 'C') {
    list.push('Континьюити мира между кусками: опорные объекты среды не перерисовались.');
  }
  list.push(`Записать итог в поле proof стиля «${key}» и урок — в knowledge/lessons.jsonl.`);
  return list;
}

/** Тёмная ли база — по яркости, чтобы выбрать цвет текста плашек. */
function isDark(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
  if (!m) return true;
  const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16));
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
}

function rgba(hex, a) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
  if (!m) return `rgba(0,0,0,${a})`;
  const [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16));
  return `rgba(${r},${g},${b},${a})`;
}
