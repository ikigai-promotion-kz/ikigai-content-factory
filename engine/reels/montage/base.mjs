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
 *  - Источник апскейлится до 1080×1920, поэтому в конце один unsharp: без него
 *    кадр после кропа выглядит мыльным.
 *
 * Нормализация входа (30.07.2026). До этой правки размеры источника были зашиты
 * числами: `crop=720:...` и деление на 1280. На любом другом файле — 1080×1920,
 * 1920×1080 — бокс отрезал голову или кадр растягивался. Теперь первым шагом графа
 * ЛЮБОЙ вход приводится к 1080×1920 с сохранением пропорций (cover + кроп), и вся
 * дальнейшая арифметика работает в одной известной системе координат.
 * Что именно попадёт в кадр по вертикали, решают два параметра из конфига ролика,
 * потому что автоматически это не определить: детектора лица у нас нет.
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
 * Кадрирование по умолчанию. Обе величины — доли по вертикали (0 = верх, 1 = низ),
 * а не «центр»: у селфи-крупняка голова стоит выше геометрического центра, и
 * центрированный кроп в первом прогоне отрезал макушку с подбородком.
 *
 * `srcCropY` — какую часть исходного кадра оставить, когда пропорции не 9:16.
 *   0.5 (центр) годится для большинства; для видео, где человек стоит в нижней
 *   половине кадра, ставить больше.
 * `boxCropY` — что попадёт в бокс спикера. 0.35 подогнано под селфи-крупняк;
 *   на общем плане (человек по пояс и мельче) голова ниже — ставить 0.45–0.55.
 *
 * Если голова обрезана — крутится именно эта пара, перегенерация бесплатна.
 */
export const FRAMING = { srcCropY: 0.5, boxCropY: 0.35 };

/**
 * Отрендерить базовое видео.
 * @param {Object} args
 * @param {string} args.src - исходное видео
 * @param {Array<{src:{start:number,end:number},shot:string}>} args.clips - из buildEdl
 * @param {string} args.outPath
 * @param {number} [args.fps=30]
 * @param {string} args.workDir - куда положить граф фильтров
 * @param {number} args.srcW - ширина исходника (из ffprobe)
 * @param {number} args.srcH - высота исходника
 * @param {{srcCropY?:number, boxCropY?:number}} [args.framing] - см. FRAMING
 * @returns {Promise<string>} outPath
 */
export async function renderBase({ src, srcW, srcH, clips, outPath, fps = 30, workDir, framing = {} }) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await mkdir(workDir, { recursive: true });

  const srcCropY = framing.srcCropY ?? FRAMING.srcCropY;
  const boxCropY = framing.boxCropY ?? FRAMING.boxCropY;

  const parts = [];
  const labels = [];
  let planned = 0;                                    // сумма квантованных длительностей

  // Нормализация ПРОПОРЦИИ, а не размера: вход кропается до 9:16 в своём родном
  // разрешении, без масштабирования. Масштаб один — в geometry(); привести сюда
  // второй scale значило бы апскейлить дважды и размягчить уже принятый ролик.
  //
  // Числа считаются здесь, а не выражениями от iw/ih внутри фильтра: при выражениях
  // ffmpeg не может согласовать размеры входов concat на этапе конфигурации графа и
  // падает с «Failed to configure output pad on Parsed_concat» (-22). Проверено 30.07.
  const nw = even(Math.min(srcW, (srcH * W) / H));
  const nh = even(Math.min(srcH, (srcW * H) / W));
  // fps здесь, а не в конце графа: телефонный дубль почти всегда VFR, и trim по
  // времени отдаёт от такого потока разное число кадров. Пока поток был VFR, каты
  // копили ошибку (7 кадров на 13 клипах), сколько бы точно мы ни считали секунды.
  // Приводим к CFR ДО нарезки — дальше секунда честно равна fps кадрам.
  parts.push(
    `[0:v]crop=${nw}:${nh}:${Math.round((srcW - nw) / 2)}:${Math.round((srcH - nh) * srcCropY)},` +
    `fps=${fps}[norm]`
  );
  // Клипов много, а промежуточный поток читается один раз — размножаем явным split.
  parts.push(`[norm]split=${clips.length}${clips.map((_, i) => `[n${i}]`).join('')}`);

  clips.forEach((c, i) => {
    // Длительность задаётся кадрами, а не парой start/end: ffmpeg квантует границы
    // trim по ближайшему кадру, и на 13 клипах ошибка копилась в +3 кадра (база
    // выходила 24.00 при расчётных 23.91). На 24 секундах терпимо, на минутном
    // ролике субтитры уехали бы заметно. Теперь каждый клип — целое число кадров.
    const dur = quantize(c.src.end - c.src.start, fps);
    planned += dur;
    const shot = SHOTS[c.shot] || SHOTS.mid;
    const cut = `[n${i}]trim=start=${f(c.src.start)}:duration=${f(dur)},setpts=PTS-STARTPTS`;

    if (shot.layout === 'boxed') {
      parts.push(`${cut},split=2[bg${i}][fg${i}]`);
      // Фон — свой же кадр: увеличен, размыт и притушен. Никаких сторонних картинок,
      // поэтому сцена всегда попадает в свет и цвет исходника.
      parts.push(
        `[bg${i}]scale=${even(W * 1.45)}:${even(H * 1.45)}:flags=lanczos,crop=${W}:${H}:` +
        `${Math.round((even(W * 1.45) - W) / 2)}:${Math.round((even(H * 1.45) - H) * 0.35)},` +
        `boxblur=28:2,eq=brightness=-0.20:saturation=0.55[bgo${i}]`
      );
      // Прямоугольник спикера берётся из самого шота: `boxed` держит прежние числа,
      // а `circle` и `split` приносят свои. Раньше он был константой, и вся разница
      // между композициями сводилась к проценту зума.
      const box = shot.box || BOX;
      // Спикер: кроп под пропорции бокса из зоны лица. Окно считается от размеров
      // нормализованного кадра, поэтому на источнике 9:16 любого разрешения доля
      // кадра одна и та же — на 720×1280 выходит ровно то окно, что было до правки.
      // Для квадратного и широкого окна кроп может оказаться выше кадра — тогда
      // берём максимум, что есть, иначе ffmpeg падает на отрицательном смещении.
      const cropH = even(Math.min(nh, nw * (box.h / box.w)));
      parts.push(`[fg${i}]crop=${nw}:${cropH}:0:${Math.round(Math.max(0, nh - cropH) * boxCropY)},scale=${box.w}:${box.h}:flags=lanczos[fgo${i}]`);
      parts.push(`[bgo${i}][fgo${i}]overlay=${box.x}:${box.y},setsar=1[v${i}]`);
    } else {
      const geo = geometry(shot, dur, c.phase);
      parts.push(`${cut},scale=${geo.sw}:${geo.sh}:flags=lanczos,crop=${W}:${H}:${geo.x}:${geo.y},setsar=1[v${i}]`);
    }
    // setsar в КОНЦЕ каждой ветки, а не один раз в начале графа: scale округляет
    // размеры до чётных и компенсирует пропорцию через SAR (получалось 1071:1072).
    // concat сверяет SAR входов и отказывается собирать клипы с разным — падал с
    // «Input link parameters do not match» (-22). Поймано регрессией 30.07.

    parts.push(
      `[0:a]atrim=start=${f(c.src.start)}:duration=${f(dur)},asetpts=PTS-STARTPTS,` +
      `afade=t=in:st=0:d=0.02,afade=t=out:st=${f(Math.max(0, dur - 0.02))}:d=0.02[a${i}]`
    );
    labels.push(`[v${i}][a${i}]`);
  });

  parts.push(`${labels.join('')}concat=n=${clips.length}:v=1:a=1[vc][ac]`);
  parts.push(`[vc]unsharp=5:5:0.5:5:5:0.0,format=yuv420p[vout]`);   // fps уже задан в [norm]

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

  // planned — то, чего мы ждём от файла с точностью до кадра. run.mjs сверяет
  // его с фактической длительностью и печатает дрейф: молча расходиться нельзя.
  return { outPath, planned };
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
/** Округлить длительность до целого числа кадров: не меньше одного. */
function quantize(sec, fps) { return Math.max(1, Math.round(sec * fps)) / fps; }
