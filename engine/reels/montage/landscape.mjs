/**
 * landscape.mjs — ЧУЖОЕ горизонтальное видео → наш вертикальный Reels 1080×1920.
 *
 * Отдельный сценарий от base.mjs, и вот почему. base.mjs кропает вход до 9:16 в
 * родном разрешении: для селфи-дубля это правильно (лишние поля по бокам не несут
 * смысла), но у горизонтального источника кроп до 9:16 выбрасывает 68% кадра по
 * ширине. На экскурсии по цеху или на записи экрана в этих 68% и лежит весь смысл.
 * Поэтому здесь кадр НЕ кропается: он целиком ложится в бокс во всю ширину, а
 * свободное место сверху и снизу занимают наши титры.
 *
 * Композит портирован с reels-twitter (движок Дениса, build.py): бренд-хедер сверху →
 * кликбейт-заголовок → видео в боксе (у автора 1080×560) → субтитры → градиентный фон.
 * Взята идея раскладки; реализация наша, потому что у автора всё нарисовано libass
 * (`ass=`) и `drawtext`, а у нас титры рисует HTML+Playwright — тот же слой, что в
 * overlay.mjs, с нормальной типографикой, анимацией и кириллицей без бубна.
 *
 * Что переиспользовано и не переписано:
 *   lib/bin.mjs   — ffmpeg/ffprobe мимо протухшего PATH
 *   align.mjs     — где в файле речь (правда о таймкодах лежит в звуке, не в транскрипте)
 *   edl.mjs       — вырезка мёртвого воздуха + группировка слов во фразы, srcToOut/outToSrc
 *   overlay.mjs   — renderOverlayFrames (Playwright, альфа, параллельные полосы) и
 *                   compositeOverlay (наложение кадров + loudnorm −14 LUFS)
 * Своё здесь только два: граф ffmpeg (бокс вместо кропа) и HTML-шаблон раскладки.
 *
 * Грабли, за которые уже заплачено. Держим их в комментариях, чтобы никто не
 * наступил второй раз:
 *
 *  1. Пути Windows с двоеточием ломают парсер описания фильтров: `C:` съедается как
 *     разделитель опций. Поэтому в графе ниже НЕТ НИ ОДНОГО пути — ни `ass=`, ни
 *     `movie=`. Если такой фильтр когда-нибудь понадобится, ffmpeg запускать из
 *     папки с файлами (`{ cwd }` у runBin) и передавать короткие имена — образец в
 *     reels/transcribe-local.mjs (там так скормлен путь к модели whisper).
 *  2. То же про `ass=`: только относительный путь, только прямые слэши и правильный
 *     cwd. Мы этот путь обошли целиком — субтитры рисует Playwright.
 *  3. Если у источника нет звуковой дорожки, `[0:a]atrim` роняет весь прогон.
 *     Подставляем anullsrc отдельным входом (см. audioIn ниже).
 *  4. Выражения от `iw`/`ih` внутри `crop` не дают ffmpeg согласовать размеры входов
 *     `concat` на этапе конфигурации графа — падает с -22 «Failed to configure output
 *     pad». Все числа считаются в JS от реальных размеров из ffprobe.
 *  5. `scale` округляет размеры до чётных и компенсирует пропорцию через SAR
 *     (вылезало 1071:1072), а `concat` и `overlay` сверяют SAR входов. Поэтому
 *     `setsar=1` стоит в КОНЦЕ каждой ветки графа, а не один раз в начале.
 *  6. Граф на десятке склеек не влезает в командную строку Windows (лимит 8191
 *     символа) — пишем его в файл и передаём через `-filter_complex_script`.
 *
 * Запуск: node reels/montage/landscape.mjs reels/montage/landscape.example.config.mjs
 *
 * Долгий источник (лекция на 96 минут) сначала режем ffmpeg'ом на нужный отрезок
 * (`-ss` / `-t`) и расшифровываем уже отрезок: транскрипт обязан совпадать с файлом,
 * который идёт в монтаж, иначе субтитры поедут на всю величину сдвига.
 *
 * Чего этот модуль НЕ умеет и не должен: снимать вклеенные в источник чёрные поля.
 * Если «горизонтальный» файл — это вертикальное видео, залитое полями до 16:9, поля
 * попадут в бокс как часть кадра. Такой файл либо чистится заранее (`cropdetect`),
 * либо идёт в run.mjs — он по сути 9:16, и кроп там уместен.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runBin } from '../lib/bin.mjs';
import { alignToAudio } from './align.mjs';
import { buildEdl, srcToOut, outToSrc } from './edl.mjs';
import { renderOverlayFrames, compositeOverlay } from './overlay.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(HERE, 'landscape-template.html');

const W = 1080;
const H = 1920;
const FPS = 30;

/**
 * Вертикальная раскладка. Все числа — в пикселях кадра 1080×1920.
 *
 * Safe-zone площадок: сверху ~120 px под UI, снизу ~250 px под подписи и кнопки —
 * то есть смысловое содержимое живёт между y=120 и y=1670.
 *
 * Позиция бокса считается ЗДЕСЬ, в Node, а не браузером по факту вёрстки: по этим же
 * координатам ffmpeg кладёт видео, и рамка из оверлея обязана лечь ровно на него.
 * Поэтому высота заголовка не измеряется, а резервируется (headChars/headLine).
 */
export const LAYOUT = {
  headTop: 216,        // верх заголовка
  headLine: 70,        // высота строки заголовка
  headChars: 24,       // сколько заглавных букв влезает в строку при 62px на ширине 960
  headBottomPad: 34,   // воздух под последней строкой заголовка
  gapHead: 90,         // воздух между заголовком и видео
  capCenterY: 1490,    // резерв под плашку субтитров при расчёте места для видео
  capHalf: 130,        // полвысоты самой высокой плашки — её нельзя накрыть видео
  gapCap: 56,          // воздух между видео и субтитрами
  safeBottomY: 1670,   // ниже этой линии площадки кладут свои подписи и кнопки
};

/**
 * Фактический центр плашки субтитров: ровно посередине между низом видео и нижней
 * safe-линией. Фиксированные 1490 в первом прогоне оставили две отдельные пустые
 * полосы — над плашкой и под ней; от центрирования пустота становится одним ровным
 * воздухом, и кадр читается как композиция, а не как недоделка.
 */
function capCenter(geo) {
  return Math.round((geo.boxY + geo.boxH + LAYOUT.safeBottomY) / 2);
}

/**
 * Геометрия кадра: куда лёг бокс с видео и из чего сделан фон.
 *
 * Бокс — во всю ширину кадра, высота по пропорции источника: горизонтальный кадр
 * ничего не теряет. Если источник близок к квадрату (или вообще вертикальный) и по
 * высоте в свободную полосу не влезает — бокс уменьшается по ширине. Вертикальному
 * источнику здесь всё равно не место: для него есть base.mjs с честным кропом.
 *
 * @param {{srcW:number, srcH:number, headline?:string, boxY?:number, bgCropY?:number}} args
 */
export function computeLayout({ srcW, srcH, headline = '', boxY, bgCropY = 0.5 }) {
  const headLines = countHeadLines(headline);
  const headBottom = LAYOUT.headTop + headLines * LAYOUT.headLine + LAYOUT.headBottomPad;
  const bandTop = headBottom + LAYOUT.gapHead;
  const bandBottom = LAYOUT.capCenterY - LAYOUT.capHalf - LAYOUT.gapCap;
  const band = bandBottom - bandTop;

  let boxW = W;
  let boxH = even((W * srcH) / srcW);
  if (boxH > band) {
    boxH = even(band);
    boxW = even((boxH * srcW) / srcH);
  }

  // Фон — свой же кадр, увеличенный до заполнения 9:16, размытый и притушенный.
  // Никаких сторонних картинок и никакой анимированной lavfi-подложки (у автора там
  // фильтр `gradients`): фон из самого кадра всегда попадает в свет и цвет источника,
  // а градиент как атмосферу рисует оверлей — там его видно и легко править.
  // ceilEven, а не even: округление вниз дало бы crop больше входа и падение фильтра.
  const k = Math.max(W / srcW, H / srcH);
  const bgW = ceilEven(srcW * k);
  const bgH = ceilEven(srcH * k);

  return {
    boxW, boxH, headLines,
    boxX: even((W - boxW) / 2),
    boxY: boxY != null ? even(boxY) : even(bandTop + (band - boxH) / 2),
    bgW, bgH,
    bgX: Math.round((bgW - W) / 2),
    bgY: Math.round((bgH - H) * bgCropY),
  };
}

/**
 * Сборка вертикальной базы: мёртвый воздух вырезан, кадр целиком лёг в бокс.
 *
 * Крупности (SHOTS из edl.mjs) здесь сознательно НЕ применяются. У вертикального
 * дубля смена крупности — это кроп внутри кадра, а у горизонтального источника любой
 * кроп режет содержимое: на записи экрана он съедает половину интерфейса, на общем
 * плане — людей по краям. Ритм здесь держат каты по границам фраз и живые титры.
 *
 * @param {Object} args
 * @param {string} args.src
 * @param {Array<{start:number,end:number}>} args.keeps - куски исходника (уже по кадрам)
 * @param {ReturnType<typeof computeLayout>} args.geo
 * @param {boolean} args.hasAudio
 * @param {number} args.duration - длительность исходника (нужна anullsrc)
 * @param {string} args.outPath
 * @param {string} args.workDir
 * @returns {Promise<{outPath:string, planned:number}>}
 */
export async function renderLandscapeBase({ src, keeps, geo, hasAudio, duration, outPath, workDir, fps = FPS }) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await mkdir(workDir, { recursive: true });

  // Грабля 3: без звуковой дорожки [0:a] не существует и граф падает целиком.
  const audioIn = hasAudio ? '0:a' : '1:a';
  const parts = [];
  const n = keeps.length;
  let planned = 0;

  // fps в самом начале, до нарезки: телефонный или экранный поток почти всегда VFR,
  // и trim по времени отдаёт от такого потока разное число кадров. Приводим к CFR
  // сразу — дальше секунда честно равна fps кадрам.
  parts.push(`[0:v]fps=${fps}[norm]`);
  // [norm] — промежуточная метка, её нельзя прочитать дважды: размножаем split'ом.
  // (Входные метки вида [0:a] ffmpeg размножает сам, поэтому звук ниже без asplit.)
  if (n > 1) parts.push(`[norm]split=${n}${keeps.map((_, i) => `[n${i}]`).join('')}`);

  const labels = [];
  keeps.forEach((k, i) => {
    const dur = k.end - k.start;
    planned += dur;
    const from = n > 1 ? `[n${i}]` : '[norm]';
    const vOut = n > 1 ? `[v${i}]` : '[vc]';
    const aOut = n > 1 ? `[a${i}]` : '[ac]';
    parts.push(`${from}trim=start=${f(k.start)}:duration=${f(dur)},setpts=PTS-STARTPTS${vOut}`);
    // На стыках склеек звук щёлкает — микро-afade по 20 мс на каждом куске.
    parts.push(
      `[${audioIn}]atrim=start=${f(k.start)}:duration=${f(dur)},asetpts=PTS-STARTPTS,` +
      `afade=t=in:st=0:d=0.02,afade=t=out:st=${f(Math.max(0, dur - 0.02))}:d=0.02${aOut}`
    );
    labels.push(`${vOut}${aOut}`);
  });
  if (n > 1) parts.push(`${labels.join('')}concat=n=${n}:v=1:a=1[vc][ac]`);

  // Композит вертикального кадра — один раз, уже на коротком смонтированном потоке,
  // а не на 96-минутном исходнике.
  parts.push('[vc]split=2[bg][fg]');
  // Фон притушен вдвое слабее, чем в боксовой сцене base.mjs (там -0.20 / 0.55).
  // Причина: у вертикального дубля фон занимает узкие поля, а здесь — две трети кадра.
  // На первом прогоне (запись экрана с тёмным интерфейсом) сильное затемнение
  // превращало эти две трети в чёрную дыру. Читаемость титров держит не затемнение
  // фона, а градиентные шторки в оверлее — они работают на любом источнике.
  parts.push(
    `[bg]scale=${geo.bgW}:${geo.bgH}:flags=lanczos,crop=${W}:${H}:${geo.bgX}:${geo.bgY},` +
    `boxblur=34:2,eq=brightness=-0.14:saturation=0.75,setsar=1[bgo]`
  );
  // Здесь только downscale (1920 → 1080), поэтому unsharp из base.mjs не нужен:
  // он лечил мыло от апскейла, а на уменьшении дал бы звон по контурам.
  parts.push(`[fg]scale=${geo.boxW}:${geo.boxH}:flags=lanczos,setsar=1[fgo]`);
  parts.push(`[bgo][fgo]overlay=${geo.boxX}:${geo.boxY},format=yuv420p[vout]`);

  // Грабля 6: граф в файл, иначе на десятке склеек командная строка Windows кончается.
  const graphPath = path.join(workDir, 'landscape-filter.txt');
  await writeFile(graphPath, parts.join(';\n'), 'utf8');

  await runBin('ffmpeg', [
    '-y', '-i', src,
    // anullsrc держим полную длительность исходника: atrim ниже режет его теми же
    // таймкодами, что и видео.
    ...(hasAudio ? [] : ['-f', 'lavfi', '-t', String(Math.ceil(duration) + 1), '-i', 'anullsrc=r=48000:cl=stereo']),
    '-filter_complex_script', graphPath,
    '-map', '[vout]', '-map', '[ac]',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
    '-movflags', '+faststart',
    outPath,
  ]);

  return { outPath, planned };
}

/**
 * Сквозной прогон: горизонтальный файл + транскрипт → готовый вертикальный ролик.
 * @param {string} configPath - .mjs с default-экспортом (образец: landscape.example.config.mjs)
 */
export async function runLandscape(configPath) {
  const cfg = (await import(pathToFileURL(path.resolve(configPath)).href)).default;
  const workDir = path.resolve(cfg.outDir);
  await mkdir(workDir, { recursive: true });

  const src = path.resolve(cfg.src);
  const words = JSON.parse(readFileSync(path.resolve(cfg.wordsPath), 'utf8'));
  const { w: srcW, h: srcH, duration, hasAudio } = await probe(src);
  log(`вход: ${srcW}×${srcH}, ${duration.toFixed(2)} сек, звук ${hasAudio ? 'есть' : 'отсутствует — подставим тишину'}`);
  if (srcH > srcW) {
    log('⚠ источник вертикальный: бокс уменьшится по ширине. Для 9:16 честнее reels/montage/run.mjs');
  }

  // ── 1. Транскрипт на реальный звук ──
  const { runs, words: aligned } = await alignToAudio(src, words, duration);
  log(`речевых прогонов: ${runs.length}`);

  // ── 2. Что вырезаем и что читает зритель ──
  // Крупности из edl нам не нужны (кроп горизонтального кадра режет смысл), но
  // вырезка мёртвого воздуха и группировка слов во фразы — нужны обе.
  const edl = buildEdl({ words: aligned, runs, duration, opts: { keywords: cfg.keywords || [] } });
  log(`вырезано тишины: ${edl.cut.toFixed(2)} сек → ролик ${edl.outDuration.toFixed(2)} сек, склеек ${edl.keeps.length}`);

  // Границы склеек — по целым кадрам. ffmpeg всё равно квантует trim по ближайшему
  // кадру, и на 20+ склейках ошибка накапливается: субтитры уезжают от картинки тем
  // сильнее, чем длиннее ролик. Поэтому квантуем сами и ПЕРЕСЧИТЫВАЕМ время титров
  // под квантованные склейки — тогда дрейф равен нулю, а не «меньше кадра на склейку».
  const qKeeps = edl.keeps.map((k) => ({
    start: k.start,
    end: k.start + Math.max(1, Math.round((k.end - k.start) * FPS)) / FPS,
  }));
  const remap = (t, side) => srcToOut(outToSrc(t, edl.keeps, side), qKeeps);
  const phrases = edl.phrases.map((p) => ({
    t0: remap(p.t0, 'start'),
    t1: remap(p.t1, 'end'),
    words: p.words.map((w) => ({ w: w.w, key: w.key, s: remap(w.s, 'start'), e: remap(w.e, 'end') })),
  }));
  const outDuration = qKeeps.reduce((a, k) => a + (k.end - k.start), 0);

  phrases.forEach((p, i) => log(`  #${String(i).padStart(2)} ${p.t0.toFixed(2)}–${p.t1.toFixed(2)}  ${p.words.map((w) => w.w).join(' ')}`));
  await writeFile(path.join(workDir, 'edl.json'), JSON.stringify({ ...edl, qKeeps, phrases }, null, 1), 'utf8');

  // ── 3. База ──
  const geo = computeLayout({ srcW, srcH, headline: cfg.headline || '', boxY: cfg.boxY, bgCropY: cfg.bgCropY });
  log(`бокс видео: ${geo.boxW}×${geo.boxH} на y=${geo.boxY} (заголовок в ${geo.headLines} стр.)`);

  const basePath = path.join(workDir, 'base.mp4');
  const { planned } = await renderLandscapeBase({
    src, keeps: qKeeps, geo, hasAudio, duration, outPath: basePath, workDir,
  });

  const baseDuration = (await probe(basePath)).duration;
  const drift = Math.abs(baseDuration - planned) * FPS;
  log(`база: ${baseDuration.toFixed(3)} сек, план ${planned.toFixed(3)} — дрейф ${drift.toFixed(2)} кадра`);
  if (drift > 1) log('⚠ дрейф больше кадра: субтитры на длинном ролике уедут');

  // ── 4. Оверлей: хедер, заголовок, субтитры, градиент ──
  const cta = cfg.cta
    ? { t0: Math.max(0, outDuration - (cfg.cta.hold || 2.0)), title: cfg.cta.title, sub: cfg.cta.sub }
    : null;

  const htmlPath = await buildLandscapeOverlayHtml({
    phrases, duration: outDuration,
    box: { x: geo.boxX, y: geo.boxY, w: geo.boxW, h: geo.boxH },
    headline: cfg.headline || '',
    brand: cfg.brand || 'IKIGAI PROMOTION',
    source: cfg.source || '',
    accent: cfg.accent || '#E5231B',
    capCenterY: capCenter(geo),
    cta, fps: FPS, outDir: workDir,
  });

  const frames = Math.round(baseDuration * FPS);
  const t0 = process.hrtime.bigint();
  const framesDir = await renderOverlayFrames(htmlPath, {
    frames, fps: FPS, outDir: workDir, workers: cfg.workers ?? 4,
  });
  const sec = Number(process.hrtime.bigint() - t0) / 1e9;
  log(`кадров оверлея: ${frames} за ${sec.toFixed(1)} сек (${(frames / sec).toFixed(0)} кадр/сек)`);

  const finalPath = path.join(workDir, cfg.name ? `${cfg.name}.mp4` : 'final.mp4');
  await compositeOverlay(basePath, framesDir, finalPath, FPS, cfg.lufs ?? -14);
  log(`готово: ${finalPath}`);

  // Контрольные кадры: приёмка глазами обязательна, метрики её не заменяют.
  const lookDir = path.join(workDir, 'look');
  await mkdir(lookDir, { recursive: true });
  const marks = cfg.look || [0.8, outDuration * 0.3, outDuration * 0.6, Math.max(0, outDuration - 1.0)];
  for (const t of marks) {
    await runBin('ffmpeg', ['-y', '-ss', t.toFixed(2), '-i', finalPath, '-frames:v', '1',
      '-q:v', '4', '-update', '1', path.join(lookDir, `t-${t.toFixed(1)}.jpg`)]);
  }
  log(`контрольные кадры: ${lookDir}`);

  return { finalPath, basePath, lookDir, geo, phrases, outDuration };
}

/**
 * Собрать overlay.html из landscape-template.html.
 *
 * Шаблон свой, а не overlay-template.html, по одной причине: там заголовок (`hook`)
 * по замыслу гаснет на первой секунде и НА ВРЕМЯ ЖИЗНИ гасит субтитры, а бренд-штамп
 * исчезает в боксовой сцене. Раскладке Дениса нужно обратное — хедер, заголовок,
 * бокс и субтитры одновременно и весь ролик. Дублировать логику кадра не стали:
 * съёмку кадров (renderOverlayFrames) и наложение (compositeOverlay) делает тот же
 * overlay.mjs, здесь отличается только вёрстка.
 */
export async function buildLandscapeOverlayHtml({
  phrases = [], duration, box, headline = '', brand, source = '', accent, capCenterY, cta = null, fps = FPS, outDir,
}) {
  await mkdir(outDir, { recursive: true });
  const tpl = await readFile(TEMPLATE, 'utf8');
  const values = {
    FPS: String(fps),
    ACCENT: accent,
    DURATION: String(duration),
    BOX: JSON.stringify(box),
    PHRASES: JSON.stringify(phrases),
    HEADLINE: JSON.stringify(headline),
    CAP_CENTER: String(capCenterY),
    CTA: JSON.stringify(cta),
    BRAND: brand,
    SOURCE: source,
  };
  const html = Object.entries(values).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v), tpl);
  const out = path.join(outDir, 'overlay.html');
  await writeFile(out, html, 'utf8');
  return out;
}

/**
 * Сколько строк займёт заголовок. Считаем в Node, потому что от этого зависит
 * позиция бокса, а её обязан знать ffmpeg — измерить в браузере поздно.
 * Явные переводы строки уважаем, остальное делим по вместимости строки.
 * Звёздочки — разметка акцента (`*слово*`), в длину не идут.
 */
function countHeadLines(headline) {
  const clean = String(headline).replace(/\*/g, '');
  if (!clean.trim()) return 0;
  return clean.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.trim().length / LAYOUT.headChars)), 0);
}

/** Размеры, длительность и наличие звука — одним обращением к ffprobe. */
async function probe(src) {
  const r = await runBin('ffprobe', ['-v', 'error', '-show_entries',
    'stream=codec_type,width,height:format=duration', '-of', 'json', src]);
  const j = JSON.parse(r.stdout);
  const v = (j.streams || []).find((s) => s.codec_type === 'video');
  if (!v) throw new Error(`ffprobe не нашёл видеодорожку в ${src}`);
  return {
    w: v.width, h: v.height,
    duration: Number(j.format?.duration),
    hasAudio: (j.streams || []).some((s) => s.codec_type === 'audio'),
  };
}

function even(x) { return Math.round(x / 2) * 2; }
function ceilEven(x) { return Math.ceil(x / 2) * 2; }
function f(x) { return Number(x).toFixed(3); }
function log(msg) { console.log(`[горизонт] ${msg}`); }

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cfg = process.argv[2];
  if (!cfg) {
    console.error('Использование: node reels/montage/landscape.mjs <путь-к-конфигу.mjs>');
    console.error('Образец:       reels/montage/landscape.example.config.mjs');
    process.exit(1);
  }
  runLandscape(cfg).catch((e) => { console.error('ОШИБКА:', e.message); process.exit(1); });
}
