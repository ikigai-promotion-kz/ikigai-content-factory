/**
 * run.mjs — сквозной прогон монтажа: исходное видео + транскрипт → готовый Reels.
 *
 * Ноль кредитов и ноль обращений к моделям: работают ffmpeg, Playwright и арифметика.
 *
 * Порядок такой и не другой:
 *   1. align   — где в файле речь, а где тишина (правда о таймкодах лежит в звуке)
 *   2. edl     — что вырезаем, где режем, какой крупностью снят каждый кусок
 *   3. base    — смонтированное видео со звуком
 *   4. overlay — титры, караоке, пруфы, финал (поверх базы, отдельным слоем)
 *
 * Запуск: node reels/montage/run.mjs reels/montage/example.config.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { alignToAudio } from './align.mjs';
import { buildEdl } from './edl.mjs';
import { renderBase, BOX } from './base.mjs';
import { buildOverlayHtml, renderOverlayFrames, compositeOverlay } from './overlay.mjs';
import { runBin } from '../lib/bin.mjs';

const FPS = 30;

/**
 * @param {string} configPath - путь к .mjs с default-экспортом конфига ролика
 */
export async function run(configPath) {
  const cfgPath = path.resolve(configPath);
  const cfg = (await import(pathToFileURL(cfgPath).href)).default;

  // Пути внутри конфига считаются ОТ САМОГО КОНФИГА, а не от того, из какой папки
  // запустили. Иначе конвейер ломается от одного лишнего `cd`, и человек, который
  // не программист, не понимает почему.
  const near = (p) => (path.isAbsolute(p) ? p : path.resolve(path.dirname(cfgPath), p));

  const workDir = near(cfg.outDir);
  await mkdir(workDir, { recursive: true });

  const src = near(cfg.src);
  const words = JSON.parse(readFileSync(near(cfg.wordsPath), 'utf8'));
  const duration = await probeDuration(src);

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
  await renderBase({ src, clips: edl.clips, outPath: basePath, fps: FPS, workDir });
  log('база собрана');

  // ── 4. Оверлей ──
  const boxes = edl.clips
    .filter((c) => c.shot === 'boxed')
    .map((c) => ({ t0: c.out.start, t1: c.out.end }));

  const proofs = [];
  const cards = [];
  for (const beat of cfg.beats || []) {
    const p = edl.phrases[beat.phrase];
    if (!p) { log(`⚠ бит на фразу #${beat.phrase} пропущен: такой фразы нет`); continue; }
    // Бит живёт чуть дольше фразы: глазу нужно время дочитать после последнего слова.
    const win = { t0: Math.max(0, p.t0 - 0.08), t1: Math.min(edl.outDuration, p.t1 + 0.45) };
    if (beat.card) cards.push({ ...win, ...beat.card });
    if (beat.proof) proofs.push({ ...win, images: beat.proof.images.map((p) => fileUrl(near(p))), caption: beat.proof.caption });
  }

  const cta = cfg.cta
    ? { t0: Math.max(0, edl.outDuration - (cfg.cta.hold || 2.0)), title: cfg.cta.title, sub: cfg.cta.sub }
    : null;

  const htmlPath = await buildOverlayHtml({
    phrases: edl.phrases,
    duration: edl.outDuration,
    box: BOX,
    boxes, proofs, cards, cta,
    hook: cfg.hook || null,
    brand: cfg.brand || 'IKIGAI PROMOTION',
    accent: cfg.accent || '#E5231B',
    fps: FPS,
    outDir: workDir,
  });

  const frames = Math.ceil(edl.outDuration * FPS);
  const framesDir = await renderOverlayFrames(htmlPath, { frames, fps: FPS, outDir: workDir });
  log(`кадров оверлея: ${frames}`);

  const finalPath = path.join(workDir, cfg.name ? `${cfg.name}.mp4` : 'final.mp4');
  await compositeOverlay(basePath, framesDir, finalPath, FPS);
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cfg = process.argv[2];
  if (!cfg) {
    console.error('Использование: node reels/montage/run.mjs <путь-к-конфигу.mjs>');
    process.exit(1);
  }
  run(cfg).catch((e) => { console.error('ОШИБКА:', e.message); process.exit(1); });
}
