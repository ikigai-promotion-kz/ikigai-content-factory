/**
 * overlay.mjs — МОНТАЖНЫЙ слой: титры, караоке-пилюли и врезки поверх снятого видео.
 *
 * ЭТО НЕ ГЕНЕРАЦИЯ. Здесь ни одного обращения к модели и ни одного кредита:
 * HTML с прозрачным фоном → Playwright снимает каждый кадр с omitBackground →
 * ffmpeg накладывает PNG-последовательность на исходное видео.
 *
 * Почему так, а не генеративной моделью: прогон 28.07 показал, что seedance_2_0
 * игнорирует посекундную раскадровку — ни один титр из промпта в кадр не попал.
 * Модель стилизует, но текст в заданную секунду не ставит. Тот же вывод у автора
 * метода: в его reels-twitter субтитры сделаны ASS-слоем, а не моделью.
 *
 * Детерминизм — через window._seekFrame(n): страница не анимируется сама по себе,
 * кадр целиком определяется номером. Тот же приём, что в рендере наших слайдов.
 */

import { mkdir, readFile, writeFile, rm, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { loudnormFilter, TARGET } from './loudness.mjs';
import { runBin } from '../lib/bin.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(HERE, 'overlay-template.html');
const W = 1080;
const H = 1920;

/**
 * Собрать overlay.html из шаблона.
 *
 * Всё время — в шкале СМОНТИРОВАННОГО видео (`out` из edl.mjs), не исходника.
 *
 * @param {Object} args
 * @param {Array<{t0:number,t1:number,words:Array}>} args.phrases - фразы с пословными таймкодами
 * @param {number} args.duration - длительность смонтированного ролика (для прогресс-бара)
 * @param {{x:number,y:number,w:number,h:number}} args.box - геометрия бокса спикера (BOX из base.mjs)
 * @param {Array<{t0:number,t1:number}>} [args.boxes] - окна боксовых сцен (под ними рисуется рамка)
 * @param {{text:string,t1:number}|null} [args.hook]
 * @param {Array<{t0:number,t1:number,images:string[],caption?:string}>} [args.proofs]
 * @param {Array<{t0:number,t1:number,title:string,sub?:string}>} [args.cards]
 * @param {Array<{t0:number,t1:number,title:string,sub?:string,screen?:Object}>} [args.takeovers]
 * @param {{t0:number,title:string,sub?:string}|null} [args.cta]
 * @param {string} [args.brand='IKIGAI PROMOTION']
 * @param {number} [args.fps=30]
 * @param {string} [args.accent='#E5231B']
 * @param {string} args.outDir
 * @returns {Promise<string>} путь к overlay.html
 */
export async function buildOverlayHtml({
  phrases = [], duration, box, boxes = [], hook = null, proofs = [], cards = [],
  takeovers = [], cta = null,
  brand = 'IKIGAI PROMOTION', fps = 30, accent = '#E5231B', theme = null, outDir,
}) {
  await mkdir(outDir, { recursive: true });
  validateTakeovers(takeovers);
  const tpl = await readFile(TEMPLATE, 'utf8');
  // Акцент считается один раз здесь: скрипт шаблона ставит его инлайн-стилем,
  // а инлайн выигрывает у :root — theme.accent иначе молча не применялся.
  const resolved = resolveTheme(theme, accent);
  const values = {
    FPS: String(fps),
    ACCENT: resolved.accent,
    THEME_VARS: resolved.vars,
    DURATION: String(duration),
    BOX: JSON.stringify(box),
    PHRASES: JSON.stringify(phrases),
    HOOK: JSON.stringify(hook),
    BOXES: JSON.stringify(boxes),
    PROOFS: JSON.stringify(proofs),
    CARDS: JSON.stringify(cards),
    TAKEOVERS: JSON.stringify(takeovers),
    CTA: JSON.stringify(cta),
    BRAND: brand,
  };
  // Бренд встречается в шаблоне дважды (штамп и финальный кадр) — заменяем все вхождения.
  const html = Object.entries(values).reduce(
    (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v),
    tpl
  );
  const out = path.join(outDir, 'overlay.html');
  await writeFile(out, html, 'utf8');
  return out;
}

/**
 * Готовые наборы оформления. Человек пишет `theme: 'gazeta'` вместо десяти
 * строк цветов. Любое поле поверх пресета переопределяется точечно:
 * `theme: { preset: 'gazeta', accent: '#0A5C36' }`.
 */
export const PRESETS = {
  // Фирменный: тёплая бумага, красный акцент, крупный гротеск. По умолчанию.
  ikigai: {},
  // Газетный: чёрно-белая полиграфия, акцент только в подсветке слова.
  gazeta: {
    cardBg: '#FFFFFF', cardText: '#0B0B0B', cardSub: '#6B6B6B',
    capBg: '#FFFFFF', capText: '#0B0B0B',
    radiusCard: '4px', radiusCap: '4px', radiusHook: '0px',
    frameColor: '#FFFFFF', frameWidth: '5px',
  },
  // Ночной: тёмные плашки, светлый текст. Для съёмки в тёмном интерьере.
  noch: {
    cardBg: '#141210', cardText: '#F5F1E8', cardSub: '#9A948B',
    capBg: '#141210', capText: '#F5F1E8',
    frameColor: '#141210',
  },
  // Спокойный: без капса, мягкие скругления, приглушённый контраст.
  spokoyny: {
    caseHead: 'none',
    cardBg: '#FBFAF7', cardText: '#1C1A17', cardSub: '#787268',
    radiusCard: '28px', radiusCap: '26px', radiusHook: '18px',
  },

  // ── Шесть наборов, снятых с чужого завода (разведка 31.07.2026) ──
  // Там это «стилевые пресеты рилса», и по составу они ровно то же, что наши темы:
  // палитра плюс типографика. Генерации не требуют — берутся бесплатно.

  // Кинетик: чёрный с оранжевым, у автора это дефолт примерно семи роликов из десяти.
  kinetik: {
    accent: '#F5A623',
    cardBg: '#000000', cardText: '#FFFFFF', cardSub: '#9A9A9A',
    capBg: '#000000', capText: '#FFFFFF',
    sceneBg: 'rgba(0,0,0,.94)', frameColor: '#000000', plateBg: '#000000',
    radiusCard: '6px', radiusCap: '6px', radiusHook: '2px',
  },
  // Неон-тех: тёмно-синяя база, циановый акцент. Под технические темы.
  'neon-tech': {
    accent: '#38E1FF',
    cardBg: '#0A0F1E', cardText: '#EAF6FF', cardSub: '#7E94AD',
    capBg: '#0A0F1E', capText: '#EAF6FF',
    sceneBg: 'rgba(10,15,30,.94)', sceneSub: '#7E94AD', frameColor: '#0A0F1E', plateBg: '#0A0F1E',
  },
  // Минимал-люкс: много воздуха, чёрная типографика, один алый акцент.
  'minimal-lux': {
    accent: '#E0362C',
    cardBg: '#FAFAF8', cardText: '#111111', cardSub: '#6E6E6E',
    capBg: '#FAFAF8', capText: '#111111',
    sceneBg: 'rgba(250,250,248,.95)', sceneText: '#111111', sceneSub: '#6E6E6E',
    frameColor: '#FAFAF8', plateBg: '#FAFAF8', radiusCard: '2px', radiusCap: '2px', radiusHook: '0px',
  },
  // Editorial-бумага: кремовая бумага и терракота. Родня нашим гайдам.
  editorial: {
    accent: '#BE4A24', caseHead: 'none',
    cardBg: '#F7F2E8', cardText: '#231C16', cardSub: '#7A6A5A',
    capBg: '#F7F2E8', capText: '#231C16',
    sceneBg: 'rgba(247,242,232,.95)', sceneText: '#231C16', sceneSub: '#7A6A5A',
    frameColor: '#F7F2E8', plateBg: '#F7F2E8', radiusCard: '10px', radiusCap: '10px', radiusHook: '4px',
  },
  // Телеграм-синий: под скриншоты переписок и чат-мокапы.
  telegram: {
    accent: '#2AABEE',
    cardBg: '#0E1621', cardText: '#F0F4F8', cardSub: '#7E8B99',
    capBg: '#0E1621', capText: '#F0F4F8',
    sceneBg: 'rgba(14,22,33,.94)', sceneSub: '#7E8B99', frameColor: '#0E1621',
    radiusCard: '18px', radiusCap: '18px', radiusHook: '12px',
  },
  // Коллаж-газета: газетная бумага, красные штампы, чёрно-белый строгий набор.
  // Единственная из шести, у кого в рабочем скилле автора нет hex — цвета уточнены
  // по витрине стилей (там `collage` = #E8DEC8 бумага + #D2302C красный).
  'gazeta-collage': {
    accent: '#D2302C',
    cardBg: '#E8DEC8', cardText: '#1A1A1A', cardSub: '#5F594F',
    capBg: '#E8DEC8', capText: '#1A1A1A',
    sceneBg: 'rgba(232,222,200,.95)', sceneText: '#1A1A1A', sceneSub: '#5F594F',
    frameColor: '#E8DEC8', plateBg: '#E8DEC8', radiusCard: '0px', radiusCap: '0px', radiusHook: '0px',
  },

  // ── Восемь наборов из полной библиотеки стилей автора (31.07.2026) ──
  // Палитры взяты из витрины `konveyer` (поле pal: фон · акцент · третий цвет).
  // Там, где стиль есть и в рабочем скилле, и на витрине, hex берутся ИЗ СКИЛЛА:
  // витрина сделана для показа, скилл — рабочий инструмент, и они расходятся.

  // Кинетик-премиум: обсидиан, шампань-золото, крем. Дорогой и тихий.
  premium: {
    accent: '#C9A227', caseHead: 'none',
    cardBg: '#0B0B0C', cardText: '#F2E8D5', cardSub: '#9A9184',
    capBg: '#0B0B0C', capText: '#F2E8D5',
    sceneBg: 'rgba(11,11,12,.94)', sceneSub: '#9A9184', frameColor: '#0B0B0C', plateBg: '#0B0B0C',
    radiusCard: '4px', radiusCap: '4px', radiusHook: '0px',
  },
  // 3D-моушн: индиго-фиолетовый градиент, глянец. Объёмные буквы даёт только
  // картинка-фон — вёрсткой их не собрать, поэтому тема идёт в паре с sceneImage.
  'd3-motion': {
    accent: '#38BDF8',
    cardBg: '#3B1E8F', cardText: '#F5F3FF', cardSub: '#C4B5FD',
    capBg: '#3B1E8F', capText: '#F5F3FF',
    sceneBg: 'rgba(59,30,143,.88)', sceneSub: '#C4B5FD', frameColor: '#7C3AED', plateBg: '#3B1E8F',
    radiusCard: '20px', radiusCap: '20px', radiusHook: '14px',
  },
  // Стикер-мем: электрик-блю растр, кислотные цвета, толстые белые канты.
  meme: {
    accent: '#FF2D9B',
    cardBg: '#1E9BE8', cardText: '#FFFFFF', cardSub: '#FFE500',
    capBg: '#FFE500', capText: '#101010',
    sceneBg: 'rgba(30,155,232,.92)', sceneText: '#FFFFFF', sceneSub: '#FFE500',
    frameColor: '#FFFFFF', frameWidth: '10px', plateBg: '#1E9BE8',
    radiusCard: '26px', radiusCap: '26px', radiusHook: '18px',
  },
  // Тёплый бренд: кремовая бумага, коралл, мягкие скругления. Человечный разговор.
  'warm-brand': {
    accent: '#D97757', caseHead: 'none',
    cardBg: '#F0EEE6', cardText: '#2B2A28', cardSub: '#6F6B63',
    capBg: '#F0EEE6', capText: '#2B2A28',
    sceneBg: 'rgba(240,238,230,.95)', sceneText: '#2B2A28', sceneSub: '#6F6B63',
    frameColor: '#F0EEE6', plateBg: '#F0EEE6',
    radiusCard: '24px', radiusCap: '24px', radiusHook: '16px',
  },
  // Терминал-про: чёрный, фосфорно-зелёный моноширинный, янтарные алерты.
  // Ложится на наш экран-терминал внутри перекрытия.
  'terminal-pro': {
    accent: '#39FF87',
    cardBg: '#000000', cardText: '#E6FFEF', cardSub: '#FFB020',
    capBg: '#000000', capText: '#E6FFEF',
    sceneBg: 'rgba(0,0,0,.94)', sceneSub: '#FFB020', frameColor: '#000000', plateBg: '#000000',
    radiusCard: '2px', radiusCap: '2px', radiusHook: '0px',
  },
  // Гранж-постер: крупное зерно, рваная бумага, один горячий красный.
  grunge: {
    accent: '#E01B12',
    cardBg: '#EFEAE0', cardText: '#111111', cardSub: '#4A453D',
    capBg: '#EFEAE0', capText: '#111111',
    sceneBg: 'rgba(239,234,224,.93)', sceneText: '#111111', sceneSub: '#4A453D',
    frameColor: '#111111', frameWidth: '9px', plateBg: '#EFEAE0',
    radiusCard: '0px', radiusCap: '0px', radiusHook: '0px',
  },
  // Голо-интерфейс: чёрно-бирюзовая база, полосы развёртки, радиальные кольца.
  holo: {
    accent: '#2FE6E0',
    cardBg: '#04161A', cardText: '#FFFFFF', cardSub: '#7FCFCB',
    capBg: '#04161A', capText: '#FFFFFF',
    sceneBg: 'rgba(4,22,26,.90)', sceneSub: '#7FCFCB', frameColor: '#2FE6E0', frameWidth: '4px',
    plateBg: '#04161A', radiusCard: '14px', radiusCap: '14px', radiusHook: '8px',
  },
  // ── Стили, заведённые генератором 03.08.2026 (reels/knowledge/style-recipes.md) ──

  // Японский минимал: рисовая бумага, индиго единственным акцентом, острая геометрия.
  // Скругления нулевые намеренно: «ма» — это пауза и прямая линия, а не мягкость.
  // Капс выключен: тихий стиль не кричит.
  'ma-minimal': {
    accent: '#2B3A67', caseHead: 'none',
    cardBg: '#F7F5F0', cardText: '#1A1A1A', cardSub: '#8A8578',
    capBg: '#F7F5F0', capText: '#1A1A1A',
    sceneBg: 'rgba(247,245,240,.96)', sceneText: '#1A1A1A', sceneSub: '#8A8578',
    frameColor: '#F7F5F0', plateBg: '#F7F5F0',
    radiusCard: '0px', radiusCap: '0px', radiusHook: '0px',
  },
  // Блюпринт-чертёж: синька, белые линии, моноширинные подписи. Фактуру сетки даёт
  // картинка-фон (sceneImage) — вёрсткой чертёжную сетку не собрать.
  blueprint: {
    accent: '#4FC3F7',
    cardBg: '#0E3A5F', cardText: '#E8F1F8', cardSub: '#8FB4CC',
    capBg: '#0E3A5F', capText: '#E8F1F8',
    sceneBg: 'rgba(14,58,95,.90)', sceneSub: '#8FB4CC',
    frameColor: '#4FC3F7', frameWidth: '3px', plateBg: '#0E3A5F',
    radiusCard: '2px', radiusCap: '2px', radiusHook: '0px',
  },

  // Матрица-логи: зелёный код по всему кадру. Работает в паре с экраном-терминалом.
  'matrix-logs': {
    accent: '#2BFF6A',
    cardBg: '#03110A', cardText: '#D8FFE6', cardSub: '#4E8F66',
    capBg: '#03110A', capText: '#D8FFE6',
    sceneBg: 'rgba(3,17,10,.94)', sceneSub: '#4E8F66', frameColor: '#0E3D22', plateBg: '#03110A',
    radiusCard: '2px', radiusCap: '2px', radiusHook: '0px',
  },
};

/** Имя поля в конфиге → имя CSS-переменной шаблона. */
const THEME_KEYS = {
  font: '--font',
  accent: '--accent',
  cardBg: '--card-bg',
  cardText: '--card-text',
  cardSub: '--card-sub',
  capBg: '--cap-bg',
  capText: '--cap-text',
  hookText: '--hook-text',
  frameColor: '--frame-color',
  frameWidth: '--frame-width',
  radiusCard: '--radius-card',
  radiusCap: '--radius-cap',
  radiusHook: '--radius-hook',
  caseHead: '--case-head',
  shadow: '--shadow',
  sceneBg: '--scene-bg',
  sceneText: '--scene-text',
  sceneSub: '--scene-sub',
  sceneImage: '--scene-image',
  plateBg: '--plate-bg',
};

/** Экраны, которые умеет рисовать перекрытие. Список один и здесь, и в шаблоне. */
const SCREEN_KINDS = ['terminal', 'phone'];

/**
 * Проверить экраны перекрытий до рендера.
 *
 * Молчаливый пропуск здесь дороже, чем где-либо ещё: человек ставит терминал на
 * кульминацию, ждёт двадцать минут рендера и получает пустой титр. Роняем сразу.
 *
 * @param {Array<{title?:string,screen?:Object}>} takeovers
 */
function validateTakeovers(takeovers) {
  takeovers.forEach((o, i) => {
    const scr = o.screen;
    if (!scr) return;
    if (!SCREEN_KINDS.includes(scr.kind)) {
      throw new Error(
        `takeover #${i}: screen.kind «${scr.kind}» не существует. Есть: ${SCREEN_KINDS.join(', ')}`
      );
    }
    if (scr.kind === 'terminal' && !(Array.isArray(scr.lines) && scr.lines.length)) {
      throw new Error(`takeover #${i}: у экрана terminal обязателен непустой массив lines`);
    }
    if (scr.kind === 'phone' && !(Array.isArray(scr.bubbles) && scr.bubbles.length)) {
      throw new Error(`takeover #${i}: у экрана phone обязателен непустой массив bubbles`);
    }
  });
}

/**
 * theme из конфига → CSS-переменные для :root и итоговый акцент.
 *
 * Молча игнорировать опечатку в имени поля нельзя: человек поменяет `cardBG`
 * вместо `cardBg`, прогонит рендер и решит, что настройка не работает вообще.
 *
 * @param {string|Object|null} theme - имя пресета, объект настроек или null
 * @param {string} accent - акцент из конфига верхнего уровня (обратная совместимость)
 * @returns {{vars:string, accent:string}}
 */
function resolveTheme(theme, accent) {
  const asObject = typeof theme === 'string' ? { preset: theme } : (theme || {});
  const presetName = asObject.preset || 'ikigai';
  const preset = PRESETS[presetName];
  if (!preset) {
    throw new Error(
      `theme.preset «${presetName}» не существует. Есть: ${Object.keys(PRESETS).join(', ')}`
    );
  }

  const { preset: _skip, ...overrides } = asObject;
  const unknown = Object.keys(overrides).filter((k) => !(k in THEME_KEYS));
  if (unknown.length) {
    throw new Error(
      `в theme нет полей: ${unknown.join(', ')}. Доступны: ${Object.keys(THEME_KEYS).join(', ')}`
    );
  }

  // accent верхнего уровня остаётся рабочим: конфиги, написанные до появления
  // темы, ничего не должны менять у себя.
  const merged = { accent, ...preset, ...overrides };
  const vars = Object.entries(merged)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${THEME_KEYS[k]}: ${v};`)
    .join('\n    ');
  return { vars, accent: merged.accent };
}

/**
 * Отрендерить прозрачные кадры оверлея.
 *
 * Кадры снимаются несколькими страницами разом: узкое место — сам скриншот,
 * а не браузер, и одна страница простаивает между снимками. Диапазон кадров
 * делится на равные куски, каждая страница снимает свой.
 *
 * Почему НЕ «пропускать неизменившиеся кадры» (первая идея): прогресс-бар и
 * подсветка активного слова двигаются каждый кадр, слепок состояния отличается
 * почти всегда — экономии не будет, а логика усложнится. Замерено на принятом
 * ролике: 718 кадров, ни одного повтора состояния.
 *
 * @param {string} htmlPath
 * @param {Object} args - { frames, fps, outDir, workers }
 * @returns {Promise<string>} папка с кадрами
 */
export async function renderOverlayFrames(htmlPath, { frames, fps = 30, outDir, workers = 4 }) {
  const framesDir = path.join(outDir, 'frames');
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--force-device-scale-factor=1', '--allow-file-access-from-files'],
  });
  try {
    const lanes = Math.max(1, Math.min(workers, frames));
    const size = Math.ceil(frames / lanes);
    const url = 'file:///' + htmlPath.replace(/\\/g, '/');

    await Promise.all(
      Array.from({ length: lanes }, async (_, lane) => {
        const from = lane * size;
        const to = Math.min(frames, from + size);
        if (from >= to) return;

        const page = await browser.newPage();
        await page.setViewportSize({ width: W, height: H });
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForFunction(() => typeof window._seekFrame === 'function', { timeout: 10_000 });

        for (let f = from; f < to; f += 1) {
          await page.evaluate((n) => window._seekFrame(n), f);
          await page.screenshot({
            path: path.join(framesDir, `f-${String(f).padStart(5, '0')}.png`),
            omitBackground: true,        // альфа сохраняется — иначе фон зальёт видео
            clip: { x: 0, y: 0, width: W, height: H },
          });
        }
        await page.close();
      })
    );
  } finally {
    await browser.close();
  }
  return framesDir;
}

/**
 * Наложить кадры оверлея на видео и выровнять громкость.
 *
 * Громкость: соцсети приводят звук к своему уровню сами, и ролик, снятый тише
 * ленты, после их нормализации звучит глухо. Приводим к −14 LUFS (общий ориентир
 * Instagram / TikTok / YouTube) сами — тогда площадке нечего исправлять.
 * Проходов два, если замер передан: сначала громкость меряется по всему файлу
 * (`loudness.mjs`), потом применяется ровно нужная поправка. Замер не удался —
 * работаем в один проход, как раньше: точность важна, собранный ролик важнее.
 *
 * @param {string} basePath - видео (уже приведённое к 1080×1920)
 * @param {string} framesDir
 * @param {string} outPath
 * @param {number} [fps=30]
 * @param {number|null} [lufs=-14] - целевая громкость; null — не трогать звук
 * @param {Object|null} [measured=null] - выход measureLoudness для второго прохода
 */
export async function compositeOverlay(basePath, framesDir, outPath, fps = 30, lufs = -14, measured = null) {
  await mkdir(path.dirname(outPath), { recursive: true });
  // Звук нормализуется ОТДЕЛЬНЫМ проходом, а не в одном графе с картинкой.
  //
  // Причина найдена приёмкой стиля «блюпринт» 03.08.2026. loudnorm почти всегда
  // уходит в динамический режим (замер печатает normalization_type: dynamic — линейно
  // уложиться в true peak с нашего тихого дубля нельзя), а динамический loudnorm в
  // общем filter_complex обрывает мукс раньше, чем видео-ветка дочитает секвенцию
  // тяжёлых PNG: в ролик попало 500 кадров из 717 — минус семь секунд вместе с финалом.
  // Команда при этом завершалась успешно, и по логу всё выглядело правильно.
  // Второй проход перекодирует только звук (-c:v copy) и стоит доли секунды.
  // Приведение PNG к единому rgba обязательно, и это не косметика.
  //
  // Playwright снимает кадры с omitBackground, но PNG-энкодер выбрасывает альфа-канал
  // у кадров, где картинка-фон закрывает экран целиком: часть секвенции приходит rgba,
  // часть rgb24. На каждой смене формата ffmpeg переконфигурирует фильтр-граф и теряет
  // кадры — приёмка стиля «блюпринт» 03.08.2026 получила 500 кадров из 717, то есть
  // минус семь секунд хвоста вместе с финальным CTA. Молча: команда завершалась успешно.
  // С явным format=rgba секвенция доезжает целиком.
  const graph = '[1:v]format=rgba[ov];[0:v][ov]overlay=0:0:format=auto,format=yuv420p[v]';
  await runBin('ffmpeg', [
    '-y',
    '-i', basePath,
    '-framerate', String(fps),
    '-i', path.join(framesDir, 'f-%05d.png'),
    '-filter_complex', graph,
    '-map', '[v]',
    // Звук берётся из базы как есть; ? — источник может быть без звука, не падаем.
    '-map', '0:a?',
    '-c:v', 'libx264', '-crf', '19', '-preset', 'medium',
    '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart',
    outPath,
  ]);

  if (lufs === null) return outPath;

  // Второй проход: только звук. Картинка копируется потоком, поэтому ни один кадр
  // потеряться уже не может, а качество видео не трогается повторным кодированием.
  const tmpPath = `${outPath}.norm.mp4`;
  await runBin('ffmpeg', [
    '-y',
    '-i', outPath,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-c:v', 'copy',
    '-af', loudnormFilter(measured, { ...TARGET, I: lufs }),
    '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart',
    tmpPath,
  ]);
  await rm(outPath, { force: true });
  await rename(tmpPath, outPath);
  return outPath;
}

// Группировка слов во фразы переехала в edl.mjs: фразы нужны и монтажу (границы катов),
// и субтитрам, а два независимых расчёта разъехались бы по таймкодам.
