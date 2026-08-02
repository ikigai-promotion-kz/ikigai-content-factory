/**
 * styles.mjs — стилевые пресеты генеративного монтажа.
 *
 * Это НЕ наши CSS-темы оформления (`reels/montage/overlay.mjs`, 18 наборов, стоят ноль).
 * Здесь — формулы для ГЕНЕРАТИВНОЙ ветки: что уходит словами в промпт борда и в промпт
 * Omni, когда мы пересобираем живой дубль в новом мире. Два слоя не конкурируют:
 * тема рисует плашки поверх снятого, пресет меняет сам кадр.
 *
 * Источник — рабочий скилл автора метода (пак от 30.07.2026,
 * `AI-Cube-Denis-Final-Avgust-2026/01-мои-скиллы/рилс-автомонтаж-омни/SKILL.md`),
 * сверено с его же девятью демо-роликами покадрово 02.08.2026.
 *
 * ЖЁСТКОЕ ПРАВИЛО: в промпт уходит `formula` и `background` — СЛОВАМИ. Поле `palette`
 * держим для наших плашек и приёмки; hex в промпт не вставлять никогда — модель
 * печатает их текстом прямо в кадр.
 *
 * Поле `theme` — наш бесплатный оверлей-эквивалент, если он есть. Где стоит null,
 * стиль существует только генерацией.
 */

export const STYLES = {
  kinetik: {
    name: 'Кинетик',
    theme: 'kinetik',
    palette: ['#000000', '#F5A623'],
    formula: 'pure jet black background, orange accents, bold condensed sans, kinetic typography with overshoot',
    background: 'plain jet black void',
    note: 'Дефолт автора примерно семь роликов из десяти. Два раза подряд не ставить.',
  },
  'neon-tech': {
    name: 'Неон-тех',
    theme: 'neon-tech',
    palette: ['#0A0F1E', '#38E1FF'],
    formula: 'deep navy background, neon cyan glow accents, HUD frames, terminal aesthetics',
    background: 'dark server room with glowing cyan HUD panels',
  },
  'minimal-lux': {
    name: 'Минимал-люкс',
    theme: 'minimal-lux',
    palette: ['#FAFAF8', '#E0362C'],
    formula: 'clean white background, huge black serif-ish type, single red accent, generous whitespace, luxury minimal',
    background: 'bright empty gallery wall',
  },
  editorial: {
    name: 'Editorial-бумага',
    theme: 'editorial',
    palette: ['#F7F2E8', '#BE4A24'],
    formula: 'warm cream paper texture, terracotta accents, elegant serif display type, editorial magazine look',
    background: 'warm cream paper wall with soft shadow',
  },
  telegram: {
    name: 'Телеграм-синий',
    theme: 'telegram',
    palette: ['#0E1621', '#2AABEE'],
    formula: 'dark telegram-style UI, bright blue accents, chat bubble mockups',
    background: 'dark chat interface with floating message bubbles',
  },
  'gazeta-collage': {
    name: 'Коллаж-газета',
    theme: 'gazeta-collage',
    palette: ['#E8DEC8', '#D2302C'],
    formula: 'aged newspaper collage, halftone black and white cutouts, red rubber stamps and marker strokes, torn paper edges',
    background: 'a wall of aged newsprint pages',
    // Длинные русские слова из разнобойных букв Omni превращает в кашу. Заголовки
    // просить одним шрифтом крупными чистыми литерами.
    extra: 'Headlines as big clean cut-out block letters, one typeface, perfectly readable. Never ransom-note mismatched letters.',
  },
  premium: {
    name: 'Кинетик-премиум',
    theme: 'premium',
    palette: ['#0B0B0C', '#C9A227', '#F2E8D5'],
    formula: 'obsidian black, champagne gold and cream, refined serif display, luxury cinematic, film grain, shallow depth of field',
    background: 'dark luxury interior with warm golden rim light',
  },
  meme: {
    name: 'Стикер-мем',
    theme: 'meme',
    palette: ['#1E9BE8', '#FF2D9B', '#FFE500'],
    formula: 'loud sticker-meme, electric blue halftone, die-cut stickers with thick white borders, cartoon emoji stickers, marker doodles, chunky rounded font',
    background: 'bright blue comic halftone burst',
    // Литеральные эмодзи срывают генерацию — только словами.
    extra: 'Describe every emoji in words (a robot sticker, a fire sticker). Never place literal emoji characters.',
  },
  'warm-brand': {
    name: 'Claude / тёплый бренд',
    theme: 'warm-brand',
    palette: ['#F0EEE6', '#D97757', '#2B2A28'],
    formula: 'cream paper, coral accent, charcoal text, soft rounded UI, a coral twelve-point sparkle motif, chat interface mockup',
    background: 'warm cream paper wall',
  },
  'terminal-pro': {
    name: 'Терминал-про',
    theme: 'terminal-pro',
    palette: ['#000000', '#39FF87', '#FFB020'],
    formula: 'pure black, translucent frosted glass panels, phosphor green monospace data text, amber alerts, blinking cursor, thin grid lines, premium trading-terminal look',
    background: 'a data centre with walls of monitors',
    // Декоративный латинский «код» модель всегда пишет абракадаброй. Это видно и в его
    // собственном ролике («imgert tlealire»). Смысл в него не вкладывать.
    extra: 'Decorative code text is texture only: never put meaningful words or the brand name into the code block.',
  },
  glass: {
    name: 'Liquid-glass',
    theme: null,
    palette: ['#FFFFFF', '#C0C6D0', '#BFD9F2'],
    formula: 'translucent frosted glass cards with real depth, soft refraction, glossy highlights, iridescent edges, white silver and pale blue, lots of air, light and premium',
    background: 'a bright studio with a soft iridescent gradient',
  },
  obsidian: {
    name: 'Кинематик-обсидиан',
    theme: null,
    palette: ['#0B0B0C', '#C9A227'],
    formula: 'cinematic 3D chrome and smoked glass objects with depth and reflections, dramatic rim light, warm gold accents on black, lens bloom, film grain',
    background: 'a dark cinematic void with volumetric light beams',
  },
  grunge: {
    name: 'Гранж-постер',
    theme: 'grunge',
    palette: ['#EFEAE0', '#111111', '#E01B12'],
    formula: 'heavy grain, torn paper edges, tape strips, scratches, halftone xerox, marker scrawl, off-white paper and ink black with one hot red accent, huge condensed stamped type, raw and loud',
    background: 'a concrete wall covered in torn posters',
  },
  'd3-motion': {
    name: '3D-моушн',
    theme: 'd3-motion',
    palette: ['#3A2FD8', '#8B3FE8'],
    formula: 'indigo to violet gradient with a perspective grid, glossy 3D extruded chrome letters, electric blue edge glow, floating 3D glass cards, parallax depth',
    background: 'an indigo perspective grid receding into violet haze',
  },
  'sticker-painted': {
    name: 'Стикер-рисованный',
    theme: null,
    palette: ['#F2E7D5', '#1F6F6B', '#D97757'],
    formula: 'hand-painted die-cut stickers with thick white cut-out borders, soft gouache and airbrush shading, real volume, glossy edge highlight, soft shadow, corners peeling, semi-realistic painted art, not flat clipart and not cartoon emoji',
    background: 'a cream wall covered in hand-painted stickers',
  },
  notebook: {
    name: 'Рукописный блокнот',
    theme: null,
    palette: ['#FDFBF5', '#1B3A8C', '#4A4A4A'],
    formula: 'real handwriting in blue ballpoint and fineliner, uneven, with ink bleed, light pencil sketches with airy watercolour washes, hand-drawn frames and arrows, margin notes, visible paper grain, no digital fonts and no vector shapes',
    background: 'a desk by a window with an open notebook',
  },
  chalk: {
    name: 'Мел на доске',
    theme: null,
    palette: ['#20262A', '#FFFFFF', '#F2C14E'],
    formula: 'white chalk handwriting with chalk grain and dust and smudges, coloured chalk drawings in yellow coral mint sky-blue and pink, loose cross-hatched strokes, chalk frames and arrows, no digital fonts and no glow',
    background: 'a slate wall in warm light',
  },
};

/** Ключи всех пресетов — для батч-прогона «один дубль во все стили». */
export const STYLE_KEYS = Object.keys(STYLES);

/**
 * Формула стиля одной строкой для промпта. Без hex и без имён файлов.
 * @param {string} key
 * @returns {string}
 */
export function styleLine(key) {
  const s = STYLES[key];
  if (!s) throw new Error(`нет стиля «${key}». Есть: ${STYLE_KEYS.join(', ')}`);
  return [s.formula, s.extra].filter(Boolean).join(' ');
}

/**
 * Формула замены фона БЕЗ подмены человека.
 *
 * Слова «replace background» сами по себе заставляют модель нарисовать чужого.
 * Формулировка снята дословно с рабочего скилла автора метода — у него сработала
 * на всех двенадцати бордах батча 14.07.2026. Идёт в ОБА промпта: борда и монтажа.
 *
 * @param {string} key - ключ стиля, из него берётся фон
 * @returns {string}
 */
export function keepSpeakerLine(key) {
  const s = STYLES[key];
  if (!s) throw new Error(`нет стиля «${key}»`);
  return 'Keep the man EXACTLY as in the attached frames: exact face, hair, beard, skin, clothes, body and pose, '
    + 'identical to the attachment. Do NOT redraw, restyle or replace him with another person, do NOT beautify. '
    + `The ONLY thing that changes is what is BEHIND him: cut him out from his room and place him in front of ${s.background}. `
    + 'Keep his cut-out edges natural. He stays a real photograph; only the background is new.';
}
