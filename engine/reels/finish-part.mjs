/**
 * finish-part.mjs — довести кусок, вернувшийся от модели, до готового.
 *
 * Три вещи, которые после КАЖДОГО монтажа приходится делать руками, собраны в один шаг:
 *
 *   1. Вернуть оригинальную дорожку. Omni всегда отдаёт свой звук — переозвученный,
 *      с задвоенными словами. Правило «звук всегда наш» (omni-montage-rules §7).
 *   2. Выровнять длину. Модель отдаёт КОРОЧЕ заказа, и это воспроизводится стабильно:
 *      8,00 при куске 8,73 · 5,01 при 5,77 · 3,01 при 3,67. Недостача добивается
 *      стоп-кадром (`tpad=stop_mode=clone`), иначе на склейке пропадает конец фразы.
 *   3. Размыть верхнюю полосу — ТОЛЬКО ПО ЯВНОЙ ПРОСЬБЕ, флагом `--blur-top`.
 *      По умолчанию выключено, причина — в комментарии к BLUR_TOP_DEFAULT ниже.
 *
 * Первые два шага делаются всегда, третьего в обычной сборке нет.
 *
 *   node reels/finish-part.mjs <видео-от-модели> <исходный-кусок> [--out=путь]
 *                              [--blur-top=0.18] [--blur-strength=20]
 *
 * --blur-top — доля высоты кадра сверху, 0 отключает размытие целиком.
 */

import path from 'node:path';
import { access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { runBin } from './lib/bin.mjs';
import { probe } from './lib/assemble.mjs';

/**
 * Размытие верхней полосы ВЫКЛЮЧЕНО по умолчанию.
 *
 * Приём отвергнут владельцем 04.08.2026 в тот же день, когда был введён. Причина видна
 * в кадре: спикер в вертикальном ролике стоит по-разному, и на большинстве кадров полоса
 * в 18% попадает на голову — лоб и волосы уходят в муть, лицо остаётся резким ниже.
 * Выглядит как брак съёмки, и это хуже той псевдорусской «шапки», ради которой затевалось.
 *
 * Моя ошибка приёмки: приём проверялся на ОДНОМ кадре, где спикер оказался ниже полосы.
 * Урок общий — проверять новый приём на всей раскадровке, а не на удачном кадре.
 *
 * Включать только явным `--blur-top=0.18`, когда об этом попросили. Псевдорусский фон
 * лечится не здесь, а выбором гладкого фона в записи стиля (см. omni-montage-rules §11).
 */
const BLUR_TOP_DEFAULT = 0;
const BLUR_STRENGTH_DEFAULT = 20;
/** Запас добивки стоп-кадром: берём с избытком, лишнее срежет -t по длине оригинала. */
const PAD_SECONDS = 2;

/**
 * Собрать готовый кусок из ответа модели и исходного куска.
 *
 * @param {Object} args
 * @param {string} args.model - файл, вернувшийся от Omni (картинка, звук выбрасываем)
 * @param {string} args.source - исходный кусок дубля (у него берём дорожку и длину)
 * @param {string} args.out
 * @param {number} [args.blurTop=0.18] - доля высоты сверху под размытие; 0 — не размывать
 * @param {number} [args.blurStrength=20]
 * @returns {Promise<{out:string, duration:number, padded:number}>}
 */
export async function finishPart({ model, source, out, blurTop = BLUR_TOP_DEFAULT, blurStrength = BLUR_STRENGTH_DEFAULT }) {
  await access(model);
  await access(source);

  const src = await probe(source);
  const gen = await probe(model);
  const padded = Math.max(0, src.duration - gen.duration);

  // Картинка: добить стоп-кадром → привести к 30 fps и 720×1280 → размыть верх.
  // Размытие делается split + crop + boxblur + overlay: полоса берётся из самого кадра,
  // поэтому движение под ней сохраняется, а буквы перестают читаться.
  const base = `[0:v]tpad=stop_mode=clone:stop_duration=${PAD_SECONDS},fps=30,scale=720:1280`;
  const filter = blurTop > 0
    ? `${base}[b];[b]split[b1][b2];`
      + `[b1]crop=iw:ih*${blurTop}:0:0,boxblur=${blurStrength}:2[top];`
      + `[b2][top]overlay=0:0[v]`
    : `${base}[v]`;

  await runBin('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', model,
    '-i', source,
    '-filter_complex', filter,
    '-map', '[v]',
    '-map', '1:a',            // дорожка ТОЛЬКО из исходного куска
    '-t', String(src.duration),
    '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    out,
  ]);

  const done = await probe(out);
  return { out, duration: done.duration, padded };
}

/* ────────────────────────── запуск из командной строки ────────────────────────── */

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith('--'));
  const flag = (name, dflt) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.split('=')[1] : dflt;
  };

  const [model, source] = positional;
  if (!model || !source) {
    console.error('Использование: node reels/finish-part.mjs <видео-от-модели> <исходный-кусок> [--out=путь] [--blur-top=0.18] [--blur-strength=20]');
    console.error('Что делает: возвращает оригинальный звук, добивает длину стоп-кадром, размывает верхнюю полосу.');
    process.exit(1);
  }

  const out = flag('out', path.join(path.dirname(model), `${path.basename(model, path.extname(model))}-final.mp4`));
  const blurTop = Number(flag('blur-top', BLUR_TOP_DEFAULT));
  const blurStrength = Number(flag('blur-strength', BLUR_STRENGTH_DEFAULT));

  finishPart({ model, source, out, blurTop, blurStrength })
    .then((r) => {
      console.log(`готово: ${r.out} · ${r.duration.toFixed(3)} с`);
      console.log(`  звук — из исходного куска, дорожка модели выброшена`);
      console.log(r.padded > 0.01
        ? `  добито стоп-кадром: ${r.padded.toFixed(3)} с (модель вернула короче куска)`
        : '  добивка не понадобилась: модель вернула кусок нужной длины');
      console.log(blurTop > 0
        ? `  верхняя полоса размыта: ${Math.round(blurTop * 100)}% высоты, сила ${blurStrength}`
          + ' — проверьте ВСЕ кадры: на части раскадровки полоса попадает на голову'
        : '  размытие полосы не применялось (по умолчанию выключено)');
    })
    .catch((e) => { console.error('ОШИБКА:', e.message); process.exit(1); });
}
