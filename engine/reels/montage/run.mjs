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
import { buildEdl } from './edl.mjs';
import { renderBase, BOX, FRAMING } from './base.mjs';
import { mixAudio } from './audio.mjs';
import { buildOverlayHtml, renderOverlayFrames, compositeOverlay } from './overlay.mjs';
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

  // ── 1. Транскрипт на реальный звук ──
  const { runs, words: aligned } = await alignToAudio(src, words, duration);
  log(`речевых прогонов: ${runs.length}`);

  // ── 2. Монтажный лист ──
  // Биты (пруфы и титры) назначаются на фразы, а не на секунды: смысл устойчивее времени.
  const beatPhrases = (cfg.beats || []).map((b) => b.phrase);
  const edl = buildEdl({
    words: aligned, runs, duration,
    opts: { keywords: cfg.keywords || [], boxedPhrases: beatPhrases },
  });
  log(`вырезано тишины: ${edl.cut.toFixed(2)} сек → ролик ${edl.outDuration.toFixed(2)} сек`);
  log(`катов: ${edl.clips.length}  (${edl.clips.map((c) => c.shot).join(' → ')})`);
  edl.phrases.forEach((p, i) => {
    const beat = (cfg.beats || []).find((b) => b.phrase === i);
    log(`  #${String(i).padStart(2)} ${p.t0.toFixed(2)}–${p.t1.toFixed(2)}  ${p.text}`
      + (beat ? `   ← ${beat.card ? 'титр' : 'пруф'}` : ''));
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

  // ── 4. Звук ──
  // Ставится до оверлея, чтобы loudnorm в композите выравнивал уже готовый микс,
  // а не одну речь. Приглушение музыки считается по фразам монтажного листа —
  // это и есть точные интервалы речи в шкале смонтированного ролика.
  const mixPath = path.join(workDir, 'base-mixed.mp4');
  const { outPath: soundPath, applied } = await mixAudio({
    videoPath: basePath,
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
  const boxes = edl.clips
    .filter((c) => c.shot === 'boxed')
    .map((c) => ({ t0: c.out.start, t1: c.out.end }));

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

  const cta = cfg.cta
    ? { t0: Math.max(0, edl.outDuration - (cfg.cta.hold || 2.0)), title: cfg.cta.title, sub: cfg.cta.sub }
    : null;

  const htmlPath = await buildOverlayHtml({
    phrases: edl.phrases,
    duration: edl.outDuration,
    box: BOX,
    boxes, proofs, cards, takeovers, cta,
    hook: cfg.hook || null,
    brand: cfg.brand || 'IKIGAI PROMOTION',
    accent: cfg.accent || '#E5231B',
    theme: cfg.theme || null,
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
    await runBin('ffmpeg', ['-y', '-ss', t.toFixed(2), '-i', finalPath, '-frames:v', '1',
      '-q:v', '4', '-update', '1', path.join(lookDir, `t-${t.toFixed(1)}.jpg`)]);
  }
  log(`контрольные кадры: ${lookDir}`);

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
