/**
 * run.mjs — сквозной прогон монтажа: исходное видео + транскрипт → готовый Reels.
 *
 * Ноль кредитов и ноль обращений к моделям: работают ffmpeg, Playwright и арифметика.
 *
 * Порядок такой и не другой:
 *   1. align   — где в файле речь, а где тишина (правда о таймкодах лежит в звуке)
 *   2. edl     — что вырезаем, где режем, какой крупностью снят каждый кусок
 *   3. base    — смонтированное видео со звуком
 *   4. audio   — музыка и озвучка, если заданы (до оверлея: композит нормализует микс)
 *   5. overlay — титры, караоке, пруфы, финал (поверх базы, отдельным слоем)
 *
 * Запуск: node reels/montage/run.mjs reels/montage/example.config.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { alignToAudio } from './align.mjs';
import { buildEdl, SHOTS } from './edl.mjs';
import { renderBase, BOX, FRAMING } from './base.mjs';
import { mixAudio } from './audio.mjs';
import { buildOverlayHtml, renderOverlayFrames, compositeOverlay } from './overlay.mjs';
import { spliceScenes } from './splice.mjs';
import { readRegistry, recordRelease, sameness } from './registry.mjs';
import { measureLoudness, TARGET } from './loudness.mjs';
import { runBin } from '../lib/bin.mjs';

const FPS = 30;

/**
 * @param {string} configPath - путь к .mjs с default-экспортом конфига ролика
 */
export async function run(configPath) {
  const cfgPath = path.resolve(configPath);
  const cfg = (await import(pathToFileURL(cfgPath).href)).default;
  // Относительные пути внутри конфига считаются ОТ САМОГО КОНФИГА, а не от папки
  // запуска: конфиг лежит рядом со своим видео, и человек пишет в нём `./my-video.mp4`,
  // не задумываясь, откуда потом будет запускать команду.
  const near = (p) => (path.isAbsolute(p) ? p : path.resolve(path.dirname(cfgPath), p));

  const workDir = near(cfg.outDir);
  await mkdir(workDir, { recursive: true });

  const src = near(cfg.src);
  const words = JSON.parse(readFileSync(near(cfg.wordsPath), 'utf8'));
  const duration = await probeDuration(src);
  const { w: srcW, h: srcH } = await probeSize(src);
  log(`вход: ${srcW}×${srcH}, ${duration.toFixed(2)} сек`);

  await warnIfStyleNameCollides(cfg.theme);

  // ── 1. Транскрипт на реальный звук ──
  const { runs, words: aligned } = await alignToAudio(src, words, duration);
  log(`речевых прогонов: ${runs.length}`);

  // ── 2. Монтажный лист ──
  // Биты (пруфы и титры) назначаются на фразы, а не на секунды: смысл устойчивее времени.
  const beatPhrases = (cfg.beats || []).map((b) => b.phrase);
  // Композиция, назначенная руками в бите: `{ phrase: 5, shot: 'circle' }`.
  // Рычаг отката на весь приём — `compositions: 'off'` в конфиге: тогда ролик
  // собирается ровно так же, как до появления новых типов кадра.
  const shotByPhrase = cfg.compositions === 'off'
    ? {}
    : Object.fromEntries((cfg.beats || []).filter((b) => b.shot).map((b) => [b.phrase, b.shot]));
  const edl = buildEdl({
    words: aligned, runs, duration,
    opts: { keywords: cfg.keywords || [], boxedPhrases: beatPhrases, shotByPhrase },
  });
  log(`вырезано тишины: ${edl.cut.toFixed(2)} сек → ролик ${edl.outDuration.toFixed(2)} сек`);
  log(`катов: ${edl.clips.length}  (${edl.clips.map((c) => c.shot).join(' → ')})`);
  edl.phrases.forEach((p, i) => {
    const beat = (cfg.beats || []).find((b) => b.phrase === i);
    // Приёмов три, а подписи было две: перекрытие печаталось как «пруф», и по логу
    // нельзя было понять, что режиссёрски стоит на фразе.
    const mark = beat && (beat.card ? 'титр' : beat.takeover ? 'перекрытие' : 'пруф');
    log(`  #${String(i).padStart(2)} ${p.t0.toFixed(2)}–${p.t1.toFixed(2)}  ${p.text}`
      + (mark ? `   ← ${mark}` : ''));
  });

  await writeFile(path.join(workDir, 'edl.json'), JSON.stringify(edl, null, 1), 'utf8');

  // ── 3. База ──
  const basePath = path.join(workDir, 'base.mp4');
  const { planned } = await renderBase({ src, srcW, srcH, clips: edl.clips, outPath: basePath, fps: FPS, workDir, framing: cfg.framing });
  const fr = { ...FRAMING, ...(cfg.framing || {}) };
  log(`база собрана (кадрирование: srcCropY=${fr.srcCropY}, boxCropY=${fr.boxCropY})`);

  // Замер дрейфа. Оверлей рисуется по ФАКТИЧЕСКОЙ длительности базы, иначе титры
  // едут относительно картинки — и тем сильнее, чем длиннее ролик.
  const baseDuration = await probeDuration(basePath);
  const driftFrames = Math.abs(baseDuration - planned) * FPS;
  log(`длительность базы: ${baseDuration.toFixed(3)} сек, план ${planned.toFixed(3)} — дрейф ${driftFrames.toFixed(2)} кадра`);
  if (driftFrames > 1) log(`⚠ дрейф больше кадра: субтитры на длинном ролике уедут`);

  // ── 3.5. Генеративные вставки (необязательно) ──
  // Сгенерированные сцены кладутся в базу ДО звука и оверлея: тогда субтитры,
  // титры и бренд ложатся на них так же, как на снятое. Ролик целиком моделью
  // не собирается — заменяются одна-две сцены, живое лицо остаётся нашим.
  let stagePath = basePath;
  if (cfg.inserts?.length) {
    const windows = [];
    for (const ins of cfg.inserts) {
      const p = edl.phrases[ins.phrase];
      if (!p) { log(`⚠ вставка на фразу #${ins.phrase} пропущена: такой фразы нет`); continue; }
      windows.push({ t0: p.t0, t1: p.t1, video: near(ins.video) });
    }
    if (windows.length) {
      const splicedPath = path.join(workDir, 'base-spliced.mp4');
      const r = await spliceScenes({
        basePath, inserts: windows, outPath: splicedPath,
        workDir: path.join(workDir, 'splice'), fps: FPS,
      });
      stagePath = splicedPath;
      log(`вставок сцен: ${windows.length}, дрейф после склейки ${r.driftFrames.toFixed(2)} кадра`);
      if (r.driftFrames > 1) log(`⚠ вставка увела длительность больше чем на кадр — субтитры после неё уедут`);
    }
  }

  // ── 4. Звук ──
  // Ставится до оверлея, чтобы loudnorm в композите выравнивал уже готовый микс,
  // а не одну речь. Приглушение музыки считается по фразам монтажного листа —
  // это и есть точные интервалы речи в шкале смонтированного ролика.
  const mixPath = path.join(workDir, 'base-mixed.mp4');
  const { outPath: soundPath, applied } = await mixAudio({
    videoPath: stagePath,
    outPath: mixPath,
    speechRanges: edl.phrases.map((p) => ({ t0: p.t0, t1: p.t1 })),
    music: cfg.music?.path ? { ...cfg.music, path: near(cfg.music.path) } : undefined,
    voice: cfg.voice?.path ? { ...cfg.voice, path: near(cfg.voice.path) } : undefined,
    duration: baseDuration,
    workDir,
  });
  if (applied.length) applied.forEach((a) => log(`звук: ${a}`));
  else log('звук: только дорожка исходника (музыка и озвучка не заданы)');

  // ── 5. Оверлей ──
  // Окна композиций со спикером в рамке. Геометрия берётся из того же словаря, что
  // и у базы: два независимых определения прямоугольника разъехались бы, и рамка
  // поехала бы относительно картинки — это видно сразу.
  const boxes = edl.clips
    .filter((c) => (SHOTS[c.shot] || {}).layout === 'boxed')
    .map((c) => ({
      t0: c.out.start, t1: c.out.end,
      box: SHOTS[c.shot].box || BOX,
      plate: SHOTS[c.shot].plate || null,
    }));

  const proofs = [];
  const cards = [];
  const takeovers = [];
  for (const beat of cfg.beats || []) {
    const p = edl.phrases[beat.phrase];
    if (!p) { log(`⚠ бит на фразу #${beat.phrase} пропущен: такой фразы нет`); continue; }
    // Бит живёт чуть дольше фразы: глазу нужно время дочитать после последнего слова.
    const win = { t0: Math.max(0, p.t0 - 0.08), t1: Math.min(edl.outDuration, p.t1 + 0.45) };
    if (beat.card) cards.push({ ...win, ...beat.card });
    if (beat.proof) proofs.push({ ...win, images: beat.proof.images.map((p) => fileUrl(near(p))), caption: beat.proof.caption });
    if (beat.takeover) takeovers.push({ ...win, ...beat.takeover });
  }
  if (takeovers.length) log(`титров-перекрытий: ${takeovers.length}`);

  // ── Защита от клиповой каши ──
  // Живое лицо держит доверие: это наш контент, а не чужой сток. Считаем, сколько
  // ролика идёт без спикера — перекрытия и сгенерированные вставки — и предупреждаем.
  // Не роняем: у человека может быть причина, но узнать он должен до публикации.
  const faceless = [
    ...takeovers.map((o) => ({ t0: o.t0, t1: o.t1 })),
    ...(cfg.inserts || []).map((ins) => edl.phrases[ins.phrase]).filter(Boolean)
      .map((p) => ({ t0: p.t0, t1: p.t1 })),
  ].sort((a, b) => a.t0 - b.t0);
  const facelessSec = faceless.reduce((sum, w) => sum + (w.t1 - w.t0), 0);
  const share = facelessSec / edl.outDuration;
  const longest = faceless.reduce((m, w) => Math.max(m, w.t1 - w.t0), 0);
  if (faceless.length) {
    log(`без лица в кадре: ${facelessSec.toFixed(1)} сек (${Math.round(share * 100)}%), самый долгий кусок ${longest.toFixed(1)} сек`);
  }
  if (share > 0.35) log(`⚠ больше трети ролика без спикера — ролик перестаёт быть вашим`);
  if (longest > 3.0) log(`⚠ лицо пропадает дольше трёх секунд подряд — зритель теряет автора`);

  const cta = cfg.cta
    ? { t0: Math.max(0, edl.outDuration - (cfg.cta.hold || 2.0)), title: cfg.cta.title, sub: cfg.cta.sub }
    : null;

  // Картинка фона полноэкранных кадров лежит рядом с конфигом, а в CSS должна
  // попасть готовым url(file:///…). Человек пишет путь, движок делает из него ссылку.
  const theme = typeof cfg.theme === 'object' && cfg.theme?.sceneImage
    ? { ...cfg.theme, sceneImage: `url("${fileUrl(near(cfg.theme.sceneImage))}")` }
    : cfg.theme || null;
  if (typeof theme === 'object' && theme?.sceneImage) log('фон полноэкранных кадров: картинка из темы');

  const htmlPath = await buildOverlayHtml({
    phrases: edl.phrases,
    duration: edl.outDuration,
    box: BOX,
    boxes, proofs, cards, takeovers, cta,
    hook: cfg.hook || null,
    brand: cfg.brand || 'IKIGAI PROMOTION',
    accent: cfg.accent || '#E5231B',
    theme,
    fps: FPS,
    outDir: workDir,
  });

  const frames = Math.round(baseDuration * FPS);
  const t0 = process.hrtime.bigint();
  const framesDir = await renderOverlayFrames(htmlPath, {
    frames, fps: FPS, outDir: workDir, workers: cfg.workers ?? 4,
  });
  const sec = Number(process.hrtime.bigint() - t0) / 1e9;
  log(`кадров оверлея: ${frames} за ${sec.toFixed(1)} сек (${(frames / sec).toFixed(0)} кадр/сек)`);

  // Замер громкости до композита: второй проход применит ровно нужную поправку,
  // а не будет подгонять её на ходу. Не получилось — идём в один проход, как раньше.
  const lufs = cfg.lufs ?? -14;
  let measured = null;
  if (lufs !== null) {
    measured = await measureLoudness(soundPath, { ...TARGET, I: lufs });
    log(measured
      ? `громкость: замер ${Number(measured.input_i).toFixed(1)} LUFS → приводим к ${lufs}`
      : `⚠ громкость: замер не удался — нормализация в один проход`);
  }

  const finalPath = path.join(workDir, cfg.name ? `${cfg.name}.mp4` : 'final.mp4');
  await compositeOverlay(soundPath, framesDir, finalPath, FPS, lufs, measured);
  log(`готово: ${finalPath}`);

  // Контрольные кадры: приёмка глазами обязательна, гейт по метрикам её не заменяет.
  const lookDir = path.join(workDir, 'look');
  await mkdir(lookDir, { recursive: true });
  const marks = cfg.look || [0.8, edl.outDuration * 0.25, edl.outDuration * 0.5, edl.outDuration * 0.75, edl.outDuration - 1.0];
  for (const t of marks) {
    // -pix_fmt обязателен: кадры с картинкой-фоном приходят в full-range YUV, и
    // mjpeg-энкодер на них падает «Error while opening encoder» — приёмка стиля
    // «блюпринт» 03.08.2026 споткнулась ровно об это на финальном кадре. Та же
    // грабля уже вылечена в lib/assemble.mjs → grabFrame(), здесь её забыли.
    await runBin('ffmpeg', ['-y', '-ss', t.toFixed(2), '-i', finalPath, '-frames:v', '1',
      '-pix_fmt', 'yuvj420p', '-q:v', '4', '-update', '1', path.join(lookDir, `t-${t.toFixed(1)}.jpg`)]);
  }
  log(`контрольные кадры: ${lookDir}`);

  // ── Реестр разнообразия ──
  // Пишем ПОСЛЕ успешной сборки: упавший прогон в историю попадать не должен.
  const shots = edl.clips.map((c) => c.shot);
  const themeName = typeof cfg.theme === 'string' ? cfg.theme : (cfg.theme?.preset || 'ikigai');
  const history = await readRegistry();
  const warns = sameness({ theme: themeName, shots }, history);
  warns.forEach((w) => log(`⚠ похоже на прошлый выпуск: ${w}`));
  await recordRelease({ name: cfg.name || 'reel', theme: themeName, shots, takeovers: takeovers.length });

  return { finalPath, edl };
}

/** Размеры кадра. Нужны, чтобы кадрирование не было зашито под один дубль. */
async function probeSize(src) {
  const r = await runBin('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', src]);
  const [w, h] = r.stdout.trim().split('x').map(Number);
  if (!w || !h) throw new Error(`ffprobe не отдал размеры кадра для ${src}`);
  return { w, h };
}

async function probeDuration(src) {
  const r = await runBin('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', src]);
  return Number(r.stdout.trim());
}

/**
 * Предупредить, что тема оверлея тёзка генеративного стиля.
 *
 * Двенадцать имён живут в обоих слоях (`kinetik`, `premium`, `grunge`, …), и
 * совпадение имени маскирует подмену ветки: человек просит «в газетном стиле»,
 * получает плашки поверх своей комнаты и решает, что фабрика не умеет иначе.
 * Ровно этот сценарий воспроизвёлся трижды на двух машинах, 04.08.2026.
 *
 * Прогон не останавливаем — бесплатная ветка остаётся законным выбором.
 * Каталог генеративных стилей может отсутствовать (комплект собирают по-разному),
 * поэтому импорт мягкий: нет файла — нет предупреждения.
 */
async function warnIfStyleNameCollides(theme) {
  const name = typeof theme === 'string' ? theme : theme?.preset;
  if (!name) return;
  let STYLES;
  try {
    ({ STYLES } = await import('../lib/styles.mjs'));
  } catch {
    return;
  }
  // Точное совпадение имени либо газетная пара `gazeta` ↔ `gazeta-collage`.
  const twin = STYLES[name] ? name : Object.keys(STYLES).find((k) => k.startsWith(`${name}-`));
  if (!twin) return;
  log(`ВНИМАНИЕ: «${name}» есть и в генеративной ветке (стиль «${twin}»).`);
  log('  Здесь — плашки ПОВЕРХ снятого, ваша комната остаётся как есть, цена ноль.');
  log(`  Там — мир заменяется целиком: node reels/generative-run.mjs <видео> <words.json> --style=${twin}`);
  log('  Если ждали второе — остановите прогон, это не та ветка.');
}

/** Локальный файл для <img src>: Chromium в headless открывает страницу по file://. */
function fileUrl(p) {
  return 'file:///' + path.resolve(p).replace(/\\/g, '/');
}

function log(msg) { console.log(`[монтаж] ${msg}`); }

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cfg = process.argv[2];
  if (!cfg) {
    console.error('Использование: node reels/montage/run.mjs <путь-к-конфигу.mjs>');
    process.exit(1);
  }
  run(cfg).catch((e) => { console.error('ОШИБКА:', e.message); process.exit(1); });
}
