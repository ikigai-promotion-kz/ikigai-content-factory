/**
 * corpus.mjs — выдача знаний под задачу.
 *
 * У фабрики сотни килобайт накопленных знаний: стили, форматы, разбор чужих
 * каруселей, теория видео. Целиком это в голову модели не влезает и не нужно.
 * Модуль достаёт из корпуса ровно те куски, которые относятся к теме, и
 * собирает из них готовый markdown-блок.
 *
 * Поиск — по совпадению слов, без эмбеддингов и без обращений к моделям:
 * работает мгновенно, ничего не стоит и не требует ключей.
 *
 * Как этим пользуется Claude Code (главный способ):
 *
 *   node lib/corpus.mjs art   "запуск онлайн-курса по бухучёту"
 *   node lib/corpus.mjs story "почему клиенты уходят после первого месяца"
 *   node lib/corpus.mjs video "разбор ошибки в рекламе"
 *
 * Команда печатает блок знаний — Claude читает его и на нём принимает
 * решения: стиль, формат, палитру, структуру. Думает Claude, а модуль
 * только подаёт ему нужную часть корпуса.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(__dirname);
const KNOW_DIR = process.env.CAROUSEL_KNOWLEDGE_DIR || path.join(ROOT, 'knowledge');

const FORMATS_PATH = path.join(ROOT, 'knowledge', 'creo-formats.md');
const STYLES_PATH = path.join(ROOT, 'reference', '_STYLES', 'STYLES.md');
const GUIDEBOOK_PATH = path.join(ROOT, 'reference', '_KNOWLEDGE', 'GUIDEBOOK.md');
const ANALYSIS_PATH = path.join(ROOT, 'reference', '_ANALYSIS.md');
const PLAYBOOK_PATH = path.join(KNOW_DIR, 'playbook.md');
const AXES_PATH = path.join(KNOW_DIR, 'axes-cheatsheet.md');
// Видео-ремесло: 409 строк теории (движение, монтаж, свет, звук, платформенные механики).
// До 28.07.2026 лежало reference-слоем — corpus.js его не читал, и видео-часть фабрики
// работала на ручных вызовах («видео-роутер не построен» в BACKLOG).
const VIDEO_CRAFT_PATH = path.join(KNOW_DIR, 'video-craft.md');
// Словарь типов шотов и правила драматургии для Reels (заводится Этапом 2).
const SHOTS_PATH = path.join(ROOT, 'reels', 'knowledge', 'shot-vocabulary.md');

// Капы, чтобы корпус-блок не раздувал контекст (карточки форматов несут промпт-скелеты — им больше).
const CAP_FORMAT_CARD = 2600;
const CAP_STYLE_PROFILE = 3000;
const CAP_GUIDEBOOK_SECTION = 1400;

let _formats;
let _styles;
let _guidebook;
let _design;
let _videoCraft;

/* ────────────────────────── публичный API ────────────────────────── */

/**
 * Корпус-блок для арт-директора: дизайн-система (вкус) + форматы (метод) + стили-кандидаты.
 * @param {string|Object} query - тема или { niche?, keywords?, emotion?, awareness? }.
 * @returns {Promise<string>} markdown для второго system-блока.
 */
export async function buildArtCorpus(query) {
  const q = normalizeQuery(query);
  const [design, formats, styles, playbook, axes] = await Promise.all([
    getDesignSystem(),
    getFormats(q, 4),
    getStyles(q, 3),
    getPlaybook(),
    getAxes(),
  ]);

  const parts = [
    '# ЗНАНИЯ ФАБРИКИ ПОД ЭТУ ТЕМУ (выбирай отсюда и называй, что выбрал)',
    '',
    '## ДИЗАЙН-СИСТЕМА (свод разбора 1404 референсов — планка и границы)',
    design.gapsb,
    design.styleSystem,
    design.anchors,
    design.antiPatterns,
    design.typography,
    design.color,
    '',
    ...(axes ? ['## ОСИ ДИЗАЙНА (собери визуал по 9 осям; следи за перекосом медиум/композиция)', axes, ''] : []),
    '## ФОРМАТЫ СЛАЙДОВ (роль слайда в карусели — выбирай под задачу, не под красоту)',
    formats.table,
    ...formats.cards,
    '',
    '## СТИЛЕВЫЕ ПРОФИЛИ-КАНДИДАТЫ (под тему; держи ОДИН на серию)',
    ...styles,
  ];
  if (playbook) parts.push('', '## PLAYBOOK (выводы из метрик наших постов — приоритетнее общих правил)', playbook);
  return parts.filter(Boolean).join('\n\n');
}

/**
 * Корпус-блок для сценариста: формула охвата + структура + контент-паттерны по теме.
 * @param {string|Object} query
 * @returns {Promise<string>}
 */
export async function buildStoryCorpus(query) {
  const q = normalizeQuery(query);
  const [design, patterns, playbook] = await Promise.all([
    getDesignSystem(),
    getContentPatterns(q, 3),
    getPlaybook(),
  ]);

  const parts = [
    '# ЗНАНИЯ ФАБРИКИ ПОД СМЫСЛ (проектируй под сохранения, репосты и комментарии)',
    '',
    design.gapsb,
    design.structure,
    '',
    '## КОНТЕНТ-ПАТТЕРНЫ ПО ТЕМЕ (из 183 разобранных чужих каруселей — что реально работает)',
    ...patterns,
  ];
  if (playbook) parts.push('', '## PLAYBOOK (выводы из метрик наших постов — приоритетнее общих правил)', playbook);
  return parts.filter(Boolean).join('\n\n');
}

/**
 * Корпус-блок для ВИДЕО-задач (Reels-монтаж, композит): ремесло движения и монтажа
 * + словарь шотов + дизайн-якоря. Собирается тем же retrieval-механизмом, что и
 * карусельный корпус, — знания одни на фабрику, различается только выборка.
 * @param {string|Object} query - тема/задача ролика.
 * @returns {Promise<string>} markdown для system-блока видео-агента.
 */
export async function buildVideoCorpus(query) {
  const q = normalizeQuery(query);
  const [design, craft, shots] = await Promise.all([
    getDesignSystem(),
    getVideoCraft(q, 5),
    getShotVocabulary(),
  ]);

  const parts = [
    '# ЗНАНИЯ ФАБРИКИ ПОД ВИДЕО (выбирай отсюда и называй, что выбрал)',
    '',
    '## ДИЗАЙН-ЯКОРЯ (планка и границы — общие с карусельными)',
    design.gapsb,
    design.antiPatterns,
    '',
    '## ВИДЕО-РЕМЕСЛО (движение · монтаж · свет · звук · платформенные механики)',
    ...craft,
  ];
  if (shots) parts.push('', '## СЛОВАРЬ ШОТОВ И ДРАМАТУРГИЯ (набор и порядок НЕ повторять с прошлого ролика)', shots);
  return parts.filter(Boolean).join('\n\n');
}

/**
 * knowledge/video-craft.md — topN подразделов под запрос (движение/монтаж/свет/звук/платформы).
 */
export async function getVideoCraft(query, topN = 5) {
  const q = normalizeQuery(query);
  let blocks;
  try {
    blocks = await loadVideoCraft();
  } catch {
    return [];
  }
  return rank(blocks, q, topN).map((b) => cap(b.text, CAP_GUIDEBOOK_SECTION));
}

/**
 * reels/knowledge/shot-vocabulary.md — типы шотов + правила драматургии. Нет файла — null.
 */
export async function getShotVocabulary() {
  try {
    const md = await readFile(SHOTS_PATH, 'utf8');
    return md.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Форматы слайдов из knowledge/creo-formats.md: быстрая таблица + topN карточек под запрос.
 */
export async function getFormats(query, topN = 4) {
  const q = normalizeQuery(query);
  const { table, cards } = await loadFormats();
  const picked = rank(cards, q, topN).map((c) => cap(c.text, CAP_FORMAT_CARD));
  return { table, cards: picked };
}

/**
 * Стилевые профили из reference/_STYLES/STYLES.md: topN «когда брать»-совпадений.
 */
export async function getStyles(query, topN = 3) {
  const q = normalizeQuery(query);
  const styles = await loadStyles();
  return rank(styles, q, topN).map((s) => cap(s.text, CAP_STYLE_PROFILE));
}

/**
 * Контент-паттерны из GUIDEBOOK.md: topN подразделов под тему.
 */
export async function getContentPatterns(query, topN = 3) {
  const q = normalizeQuery(query);
  const sections = await loadGuidebook();
  return rank(sections, q, topN).map((s) => cap(s.text, CAP_GUIDEBOOK_SECTION));
}

/**
 * Дизайн-система из _ANALYSIS.md: G-A-P-S-B, система стилей A–F, якоря, анти-паттерны,
 * типографика, структура-инвариант. Статична — кешируется целиком.
 */
export async function getDesignSystem() {
  if (_design) return _design;
  const md = await readFile(ANALYSIS_PATH, 'utf8');
  _design = {
    gapsb: extractSection(md, '## ФОРМУЛА G-A-P-S-B'),
    styleSystem: extractSection(md, '## СИСТЕМА СТИЛЕЙ'),
    structure: extractSection(md, '## СТРУКТУРА-ИНВАРИАНТ'),
    typography: extractSection(md, '## ТИПОГРАФИКА'),
    color: extractSection(md, '## ЦВЕТ В СТАТИКЕ'),
    anchors: extractSection(md, '### Приём-якоря 10/10'),
    antiPatterns: extractSection(md, '### Анти-паттерны'),
  };
  return _design;
}

/**
 * knowledge/playbook.md — выводы синтеза метрик (Фаза 5). Пока файла нет — null.
 */
export async function getPlaybook() {
  try {
    const md = await readFile(PLAYBOOK_PATH, 'utf8');
    return md.trim() || null;
  } catch {
    return null;
  }
}

/**
 * knowledge/axes-cheatsheet.md — оперативная памятка 9 осей дизайна (собери стиль по осям,
 * следи за перекосом базы). Полный словарь — ikigai-design-system/taxonomy/AXES.md. Нет файла — null.
 */
export async function getAxes() {
  try {
    const md = await readFile(AXES_PATH, 'utf8');
    return md.trim() || null;
  } catch {
    return null;
  }
}

/* ────────────────────────── загрузка/парсинг ────────────────────────── */

async function loadFormats() {
  if (_formats) return _formats;
  let md;
  try {
    md = await readFile(FORMATS_PATH, 'utf8');
  } catch {
    // Справочник форматов необязателен: без него корпус собирается из стилей
    // и дизайн-системы. Падать из-за одного файла нельзя — фабрика встанет вся.
    _formats = { table: '', cards: [] };
    return _formats;
  }
  const table = extractSection(md, '## 1. Быстрая таблица выбора');
  // Карточки: "### <Название> (урок N)" внутри "## 2. Карточки форматов".
  const cardsBlock = extractSection(md, '## 2. Карточки форматов');
  const cards = splitByHeading(cardsBlock, 3).map((b) => ({
    text: b.text,
    searchText: `${b.heading} ${firstBullet(b.text, 'Когда')} ${firstBullet(b.text, 'Пример под IKIGAI')}`.toLowerCase(),
  }));
  _formats = { table, cards };
  return _formats;
}

async function loadStyles() {
  if (_styles) return _styles;
  const md = await readFile(STYLES_PATH, 'utf8');
  // Скоринг идёт по всему профилю, а не только по «Настроение»/«Когда брать»: сравнение
  // токенов буквальное (includes, без стемминга), и на русской морфологии двух полей мало —
  // запрос «тишина/минимализм» промахивался мимо стиля, где написано «тихий, созерцательный».
  // Тело профиля добавляет доменную лексику (палитра, декор, платформы, форматы, приём).
  _styles = splitByHeading(md, 2).map((b) => ({
    text: b.text,
    searchText: b.text.toLowerCase(),
  }));
  return _styles;
}

async function loadVideoCraft() {
  if (_videoCraft) return _videoCraft;
  const md = await readFile(VIDEO_CRAFT_PATH, 'utf8');
  // Структура файла: "## Модуль (M0N)" → "### подраздел". Матчим по паре заголовков + телу,
  // как в гайдбуке: запрос «монтаж ритм склейки» должен доставать §M02, а не весь файл.
  const out = [];
  for (const section of splitByHeading(md, 2)) {
    const subs = splitByHeading(section.text, 3);
    if (!subs.length) {
      out.push({ text: section.text, searchText: `${section.heading} ${section.text.slice(0, 800)}`.toLowerCase() });
      continue;
    }
    for (const sub of subs) {
      out.push({
        text: `### ${section.heading} → ${sub.heading}\n${sub.body}`,
        searchText: `${section.heading} ${sub.heading} ${sub.body.slice(0, 600)}`.toLowerCase(),
      });
    }
  }
  _videoCraft = out;
  return _videoCraft;
}

async function loadGuidebook() {
  if (_guidebook) return _guidebook;
  const md = await readFile(GUIDEBOOK_PATH, 'utf8');
  // Подразделы "### ..." внутри разделов "## ..." — матчим по заголовкам раздела+подраздела и телу.
  const out = [];
  for (const section of splitByHeading(md, 2)) {
    const subs = splitByHeading(section.text, 3);
    if (!subs.length) {
      out.push({ text: section.text, searchText: `${section.heading} ${section.text.slice(0, 800)}`.toLowerCase() });
      continue;
    }
    for (const sub of subs) {
      out.push({
        text: `### ${section.heading} → ${sub.heading}\n${sub.body}`,
        searchText: `${section.heading} ${sub.heading} ${sub.body.slice(0, 800)}`.toLowerCase(),
      });
    }
  }
  _guidebook = out;
  return out;
}

/* ────────────────────────── утилиты ────────────────────────── */

function normalizeQuery(query) {
  if (typeof query === 'string') {
    return { keywords: tokenize(query), niche: query, emotion: '', awareness: '' };
  }
  const obj = query || {};
  const kw = new Set([
    ...tokenize(obj.niche || ''),
    ...(Array.isArray(obj.keywords) ? obj.keywords.flatMap(tokenize) : tokenize(obj.keywords || '')),
    ...tokenize(obj.emotion || ''),
  ]);
  return {
    keywords: [...kw],
    niche: obj.niche || '',
    emotion: (obj.emotion || '').toLowerCase(),
    awareness: (obj.awareness || '').toLowerCase(),
  };
}

function rank(items, q, topN) {
  const scored = items
    .map((item) => ({ item, score: scoreItem(item, q) }))
    .sort((a, b) => b.score - a.score);
  const hit = scored.filter((x) => x.score > 0).map((x) => x.item);
  // Совпадений меньше topN — добираем несовпавшими по порядку («общая насмотренность»).
  const rest = scored.filter((x) => x.score === 0).map((x) => x.item);
  return [...hit, ...rest].slice(0, topN);
}

function scoreItem(item, q) {
  let score = 0;
  for (const kw of q.keywords) {
    if (!kw || kw.length < 3) continue;
    if (item.searchText.includes(kw)) score += 1;
  }
  if (q.awareness && item.searchText.includes(q.awareness)) score += 2;
  return score;
}

/**
 * Секция markdown от заголовка-префикса до следующего заголовка того же/выше уровня.
 */
function extractSection(md, headingPrefix) {
  const level = (headingPrefix.match(/^#+/) || ['##'])[0].length;
  const esc = headingPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const stop = Array.from({ length: level }, (_, i) => `\\n#{${i + 1}}\\s`).join('|');
  const re = new RegExp(`(${esc}[^\\n]*\\n[\\s\\S]*?)(?=${stop}|$)`);
  const m = md.match(re);
  return m ? m[1].trim() : '';
}

/**
 * Разбивка блока на подблоки по заголовкам уровня level. Возвращает {heading, body, text}.
 */
function splitByHeading(md, level) {
  const h = '#'.repeat(level);
  const re = new RegExp(`^${h}\\s+(.+)$`, 'gm');
  const out = [];
  const matches = [...md.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : md.length;
    const chunk = md.slice(start, end).trim();
    // Отрезаем хвост, если внутрь попал заголовок ВЫШЕ уровнем (конец родительской секции).
    const higher = chunk.search(new RegExp(`\\n#{1,${level - 1}}\\s`));
    const text = higher > 0 ? chunk.slice(0, higher).trim() : chunk;
    out.push({ heading: matches[i][1].trim(), body: text.replace(/^#+\s+.+\n?/, '').trim(), text });
  }
  return out;
}

function firstBullet(text, label) {
  const re = new RegExp(`\\*\\*${label}[:：]?\\*\\*\\s*(.+)`);
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function cap(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}\n…(усечено — полная карточка в файле-источнике)`;
}

function tokenize(s) {
  return String(s)
    .toLowerCase()
    .split(/[^a-zа-яё0-9-]+/i)
    .filter((t) => t.length >= 3);
}

/* ────────────────────────── запуск из командной строки ────────────────────────── */

const BUILDERS = {
  art: buildArtCorpus,     // визуал: стиль, палитра, формат слайда
  story: buildStoryCorpus, // смысл: структура, хуки, контент-паттерны
  video: buildVideoCorpus, // ролик: движение, монтаж, шоты
};

/**
 * Оглавление каталога стилей — ВСЕ, а не topN под тему.
 *
 * Заведено 01.08.2026 по вопросу студента «сколько у меня стилей». Ответ вышел
 * «десять»: команда `art` по построению отдаёт три кандидата (getStyles topN=3),
 * полного списка не показывал НИКТО, и агент посчитал стили по тегам эталонов —
 * то есть те, что уже обкатаны, а не те, что доступны. Каталог всё это время
 * лежал на диске целиком.
 *
 * Здесь намеренно только заголовок и строка «когда брать»: цель — чтобы человек
 * увидел ассортимент и заказал стиль по имени. Полный профиль со всеми токенами
 * по-прежнему подтягивает `art` под конкретную тему.
 */
async function listStyles() {
  const styles = await loadStyles();
  const rows = styles.map((s) => ({
    heading: (s.text.match(/^##\s+(.+)$/m) || [, '—'])[1].trim(),
    when: (firstBullet(s.text, 'Когда брать') || firstBullet(s.text, 'Когда') || '')
      .replace(/\s+/g, ' ').trim(),
  }));
  const lines = rows.map((r, i) => {
    const num = String(i + 1).padStart(2, ' ');
    return r.when ? `${num}. ${r.heading}\n     ${r.when}` : `${num}. ${r.heading}`;
  });
  return [
    `# КАТАЛОГ СТИЛЕЙ — ${rows.length} позиций`,
    '',
    'Это ВЕСЬ ассортимент фабрики. Заказывать можно по имени: «сделай в стиле …».',
    'Команда `art "<тема>"` показывает не весь каталог, а три кандидата под конкретную',
    'тему — это разные вопросы, не путайте их между собой.',
    '',
    ...lines,
    '',
    'Источник: reference/_STYLES/STYLES.md — там у каждого стиля полный профиль:',
    'палитра, типографика, layout, модель-исполнитель, ключевой приём и риск.',
  ].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , mode, ...rest] = process.argv;
  const query = rest.join(' ').trim();

  // styles — единственный режим без темы: он про ассортимент, а не про задачу.
  if (mode === 'styles') {
    listStyles()
      .then((block) => { console.log(block); })
      .catch((e) => {
        console.error('ОШИБКА:', e.message);
        console.error('Проверьте, что файл engine/reference/_STYLES/STYLES.md на месте.');
        process.exit(1);
      });
  } else if (!BUILDERS[mode] || !query) {
    console.error('Использование: node lib/corpus.mjs <styles|art|story|video> ["<тема>"]');
    console.error('');
    console.error('  styles — ВЕСЬ каталог стилей списком. Темы не требует');
    console.error('  art    — знания под ВИЗУАЛ под ТЕМУ: три стиля-кандидата, форматы, палитра');
    console.error('  story  — знания под СМЫСЛ: структура карусели, хуки, что даёт сохранения');
    console.error('  video  — знания под РОЛИК: движение, монтаж, свет, звук, словарь шотов');
    console.error('');
    console.error('Хотите увидеть, ЧТО вообще есть — это styles.');
    console.error('Хотите подобрать под конкретную тему — это art.');
    console.error('');
    console.error('Пример: node lib/corpus.mjs styles');
    console.error('Пример: node lib/corpus.mjs art "запуск курса по бухучёту для малого бизнеса"');
    process.exit(1);
  } else BUILDERS[mode](query)
    .then((block) => { console.log(block); })
    .catch((e) => {
      console.error('ОШИБКА:', e.message);
      console.error('Проверьте, что папки engine/reference и engine/knowledge на месте.');
      process.exit(1);
    });
}
