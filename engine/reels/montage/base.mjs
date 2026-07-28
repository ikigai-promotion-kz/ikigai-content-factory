/**
 * base.mjs — сборка базового видео по монтажному листу (без титров, титры сверху отдельно).
 *
 * Один статичный дубль превращается в смонтированную дорожку: мёртвый воздух вырезан,
 * каждая фраза снята своей крупностью, длинные фразы едут медленным проездом.
 * Каты попадают на границы фраз — это читается как намеренный jump cut, а не как брак.
 *
 * Грабли, из-за которых код выглядит именно так:
 *  - Один filter_complex на 13 клипов не влезает в командную строку Windows (лимит 8191
 *    символа), поэтому граф пишется в файл и передаётся через -filter_complex_script.
 *  - libx264 требует чётных размеров: любой scale округляется до чётного.
 *  - На стыках клипов звук щёлкает — на каждом клипе микро-afade по 20 мс.
 *  - Источник 720×1280 апскейлится до 1080×1920, поэтому в конце один unsharp:
 *    без него кадр после кропа выглядит мыльным.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runBin } from '../lib/bin.mjs';
import { SHOTS } from './edl.mjs';

const W = 1080;
const H = 1920;

/**
 * Бокс спикера в боксовой сцене. Экспортируется, потому что оверлей рисует рамку
 * ровно по этим координатам — рассинхрон рамки и картинки видно сразу.
 */
export const BOX = { x: 60, y: 150, w: 960, h: 1000 };

/**
 * Окно кадра, попадающее в бокс. Доля по вертикали, а не «центр»: в первом прогоне
 * центрированный кроп отрезал макушку и подбородок — у селфи-крупняка голова стоит
 * выше геометрического центра.
 */
const BOX_CROP_Y = 0.35;

/**
 * Отрендерить базовое видео.
 * @param {Object} args
 * @param {string} args.src - исходное видео
 * @param {Array<{src:{start:number,end:number},shot:string}>} args.clips - из buildEdl
 * @param {string} args.outPath
 * @param {number} [args.fps=30]
 * @param {string} args.workDir - куда положить граф фильтров
 * @returns {Promise<string>} outPath
 */
export async function renderBase({ src, clips, outPath, fps = 30, workDir }) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await mkdir(workDir, { recursive: true });

  const parts = [];
  const labels = [];

  clips.forEach((c, i) => {
    const dur = c.src.end - c.src.start;
    const shot = SHOTS[c.shot] || SHOTS.mid;
    const cut = `[0:v]trim=start=${f(c.src.start)}:end=${f(c.src.end)},setpts=PTS-STARTPTS`;

    if (shot.layout === 'boxed') {
      parts.push(`${cut},split=2[bg${i}][fg${i}]`);
      // Фон — свой же кадр: увеличен, размыт и притушен. Никаких сторонних картинок,
      // поэтому сцена всегда попадает в свет и цвет исходника.
      parts.push(
        `[bg${i}]scale=${even(W * 1.45)}:${even(H * 1.45)}:flags=lanczos,crop=${W}:${H}:` +
        `${Math.round((even(W * 1.45) - W) / 2)}:${Math.round((even(H * 1.45) - H) * 0.35)},` +
        `boxblur=28:2,eq=brightness=-0.20:saturation=0.55[bgo${i}]`
      );
      // Спикер: кроп под пропорции бокса из зоны лица (верхняя часть кадра).
      const cropH = even(720 * (BOX.h / BOX.w));
      parts.push(`[fg${i}]crop=720:${cropH}:0:${Math.round((1280 - cropH) * BOX_CROP_Y)},scale=${BOX.w}:${BOX.h}:flags=lanczos[fgo${i}]`);
      parts.push(`[bgo${i}][fgo${i}]overlay=${BOX.x}:${BOX.y}[v${i}]`);
    } else {
      const geo = geometry(shot, dur, c.phase);
      parts.push(`${cut},scale=${geo.sw}:${geo.sh}:flags=lanczos,crop=${W}:${H}:${geo.x}:${geo.y}[v${i}]`);
    }

    parts.push(
      `[0:a]atrim=start=${f(c.src.start)}:end=${f(c.src.end)},asetpts=PTS-STARTPTS,` +
      `afade=t=in:st=0:d=0.02,afade=t=out:st=${f(Math.max(0, dur - 0.02))}:d=0.02[a${i}]`
    );
    labels.push(`[v${i}][a${i}]`);
  });

  parts.push(`${labels.join('')}concat=n=${clips.length}:v=1:a=1[vc][ac]`);
  parts.push(`[vc]unsharp=5:5:0.5:5:5:0.0,fps=${fps},format=yuv420p[vout]`);

  const graphPath = path.join(workDir, 'base-filter.txt');
  await writeFile(graphPath, parts.join(';\n'), 'utf8');

  await runBin('ffmpeg', [
    '-y', '-i', src,
    '-filter_complex_script', graphPath,
    '-map', '[vout]', '-map', '[ac]',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'medium',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
    '-movflags', '+faststart',
    outPath,
  ]);

  return outPath;
}

/**
 * Геометрия кропа под крупность. Возвращает готовые выражения для scale/crop.
 * Проезд (pan) описан выражением от t — crop умеет двигать окно во времени,
 * а вот менять масштаб во времени не умеет: зум-наезд пришлось бы делать через
 * zoompan, который на медленном движении заметно дрожит. Поэтому наезд у нас —
 * резкий punch-in на кате (профессиональный приём), а внутри кадра только проезд.
 */
function geometry(shot, dur, phase = { a: 0, b: 1 }) {
  const sw = even(W * shot.z);
  const sh = even(H * shot.z);
  const freeX = sw - W;
  const freeY = sh - H;

  // Клип может быть куском шота (шот разрезан вырезанной паузой) — тогда проезд
  // продолжается с того места, где остановился, а не начинается заново.
  const at = (from, to, p) => from + (to - from) * p;
  const x0 = at(shot.cx, shot.pan?.cx ?? shot.cx, phase.a);
  const x1 = at(shot.cx, shot.pan?.cx ?? shot.cx, phase.b);
  const y0 = at(shot.cy, shot.pan?.cy ?? shot.cy, phase.a);
  const y1 = at(shot.cy, shot.pan?.cy ?? shot.cy, phase.b);

  return {
    sw, sh,
    x: axis(freeX, x0, x1, dur),
    y: axis(freeY, y0, y1, dur),
  };
}

/** Выражение позиции кропа по одной оси: константа либо линейный проезд от t. */
function axis(free, a, b, dur) {
  if (free <= 0) return '0';
  if (Math.abs(a - b) < 0.001) return String(Math.round(free * a));
  const from = free * a;
  const delta = free * (b - a);
  return `'${f(from)}+(${f(delta)})*min(1\\,t/${f(dur)})'`;
}

function even(x) { return Math.round(x / 2) * 2; }
function f(x) { return Number(x).toFixed(3); }
