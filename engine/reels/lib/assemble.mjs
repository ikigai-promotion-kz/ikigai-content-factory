/**
 * assemble.mjs — сборка смонтированного ролика.
 *
 * Главный приём метода AI Cube — ФИКС ЗВУКА НАЛОЖЕНИЕМ. Любая video-to-video модель
 * портит исходную дорожку (дубли, подмены, выпадения слов), даже когда в промпте
 * написано «keep original audio». Лечится не перегенерацией — она стоит кредитов и
 * portит заново, — а подменой: видео берём от модели, звук от исходника. Липсинк
 * сохраняется, потому что модель монтировала из того же клипа и тайминг совпадает.
 *
 * Все внешние вызовы идут через resolveBin: на Windows PATH к ffmpeg протухает молча
 * (см. reels/lib/bin.mjs).
 */

import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { runBin } from './bin.mjs';

/**
 * Заменить звуковую дорожку клипа на оригинальную.
 * @param {string} videoFrom - клип от модели (берём видео)
 * @param {string} audioFrom - исходный кусок (берём звук)
 * @param {string} outPath
 */
export async function restoreOriginalAudio(videoFrom, audioFrom, outPath) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await runBin('ffmpeg', [
    '-y',
    '-i', videoFrom,
    '-i', audioFrom,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '160k',
    // Длины после монтажа расходятся на доли секунды — режем по короткой,
    // иначе в хвосте повисает чёрный кадр или тишина.
    '-shortest',
    outPath,
  ]);
  return outPath;
}

/**
 * Склеить куски в финальный ролик 1080×1920@30 со звуком.
 * Апскейл нужен всегда: video-модели отдают 720p.
 * @param {string[]} parts - клипы по порядку
 * @param {string} outPath
 */
export async function concatParts(parts, outPath) {
  if (!parts.length) throw new Error('concatParts: нечего склеивать');
  await mkdir(path.dirname(outPath), { recursive: true });

  const inputs = parts.flatMap((p) => ['-i', p]);
  const chains = parts
    .map((_, i) =>
      `[${i}:v]scale=1080:1920:force_original_aspect_ratio=increase,` +
      `crop=1080:1920,fps=30,setsar=1[v${i}]`)
    .join(';');
  const streams = parts.map((_, i) => `[v${i}][${i}:a]`).join('');

  await runBin('ffmpeg', [
    '-y',
    ...inputs,
    '-filter_complex', `${chains};${streams}concat=n=${parts.length}:v=1:a=1[v][a]`,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart',
    outPath,
  ]);
  return outPath;
}

/**
 * Вырезать кусок по таймкодам (границы даёт segment.mjs — они попадают в паузы).
 */
export async function cutSegment(source, start, end, outPath) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await runBin('ffmpeg', [
    '-y',
    '-i', source,
    '-ss', String(start),
    '-to', String(end),
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium',
    '-c:a', 'aac', '-b:a', '160k',
    outPath,
  ]);
  return outPath;
}

/**
 * Кадр в заданной секунде — для референсов сториборда и для видео-QA.
 */
export async function grabFrame(source, atSec, outPath) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await runBin('ffmpeg', [
    '-y',
    '-ss', String(atSec),
    '-i', source,
    '-frames:v', '1',
    // JPEG не принимает 4:4:4 и full-range, которые прилетают из некоторых источников:
    // без явного формата mjpeg-энкодер падает «Error while opening encoder».
    '-pix_fmt', 'yuvj420p',
    '-q:v', '2',
    outPath,
  ]);
  return outPath;
}

/** Длительность, ширина, высота, наличие аудиодорожки. */
export async function probe(source) {
  const { stdout } = await runBin('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=codec_type,width,height:format=duration',
    '-of', 'json',
    source,
  ]);
  const data = JSON.parse(stdout);
  const video = (data.streams || []).find((s) => s.codec_type === 'video') || {};
  return {
    duration: Number(data.format?.duration || 0),
    width: video.width || 0,
    height: video.height || 0,
    hasAudio: (data.streams || []).some((s) => s.codec_type === 'audio'),
  };
}
