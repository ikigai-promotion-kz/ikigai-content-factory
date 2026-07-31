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

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
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
 * @param {{t0:number,title:string,sub?:string}|null} [args.cta]
 * @param {string} [args.brand='IKIGAI PROMOTION']
 * @param {number} [args.fps=30]
 * @param {string} [args.accent='#E5231B']
 * @param {string} args.outDir
 * @returns {Promise<string>} путь к overlay.html
 */
export async function buildOverlayHtml({
  phrases = [], duration, box, boxes = [], hook = null, proofs = [], cards = [], cta = null,
  brand = 'IKIGAI PROMOTION', fps = 30, accent = '#E5231B', theme = null, outDir,
}) {
  await mkdir(outDir, { recursive: true });
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
const PRESETS = {
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
};

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
 * loudnorm в один проход: двухпроходный точнее, но требует прогона ради замера,
 * а на голосовом дубле разница слышна только приборам.
 *
 * @param {string} basePath - видео (уже приведённое к 1080×1920)
 * @param {string} framesDir
 * @param {string} outPath
 * @param {number} [fps=30]
 * @param {number|null} [lufs=-14] - целевая громкость; null — не трогать звук
 */
export async function compositeOverlay(basePath, framesDir, outPath, fps = 30, lufs = -14) {
  await mkdir(path.dirname(outPath), { recursive: true });
  // Звуковая ветка идёт через filter_complex вместе с видео: отдельный -af рядом с
  // -filter_complex ffmpeg не принимает.
  const graph = '[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]'
    + (lufs === null ? '' : `;[0:a]loudnorm=I=${lufs}:TP=-1.5:LRA=11[a]`);
  await runBin('ffmpeg', [
    '-y',
    '-i', basePath,
    '-framerate', String(fps),
    '-i', path.join(framesDir, 'f-%05d.png'),
    '-filter_complex', graph,
    '-map', '[v]',
    // ? — источник может быть без звука, не падаем. С нормализацией ветка [a]
    // существует только когда звук есть, поэтому подстраховка остаётся нужной.
    ...(lufs === null ? ['-map', '0:a?'] : ['-map', '[a]?']),
    '-c:v', 'libx264', '-crf', '19', '-preset', 'medium',
    '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart',
    outPath,
  ]);
  return outPath;
}

// Группировка слов во фразы переехала в edl.mjs: фразы нужны и монтажу (границы катов),
// и субтитрам, а два независимых расчёта разъехались бы по таймкодам.
