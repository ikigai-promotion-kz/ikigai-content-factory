/**
 * loudness.mjs — двухпроходная нормализация громкости.
 *
 * Однопроходный `loudnorm` работает вслепую: он подгоняет громкость на ходу и
 * поэтому слегка «дышит» — тихие места подтягивает сильнее, чем нужно. Двухпроходный
 * сначала МЕРЯЕТ весь файл, потом применяет ровно ту поправку, которая требуется.
 * Разница слышна не всегда, но она бесплатная: замер идёт по звуку без картинки и
 * занимает секунду-две на ролике в полминуты.
 *
 * Цель −14 LUFS — общий ориентир Instagram, TikTok и YouTube. Ролик, снятый тише
 * ленты, после их собственной нормализации звучит глухо; приводим сами, и площадке
 * нечего исправлять.
 *
 * Замер может не получиться (нет звука, старый ffmpeg, неожиданный вывод). Тогда
 * возвращаем null, и вызывающий тихо откатывается на однопроходный режим: потерять
 * точность допустимо, уронить сборку ролика — нет.
 */

import { runBin } from '../lib/bin.mjs';

/** Целевые параметры. Меняются только вместе — это один согласованный профиль. */
export const TARGET = { I: -14, TP: -1.5, LRA: 11 };

/**
 * Первый проход: измерить громкость файла, ничего не записывая.
 *
 * @param {string} src - файл со звуком
 * @param {Object} [target]
 * @returns {Promise<Object|null>} измеренные значения или null, если замер не удался
 */
export async function measureLoudness(src, target = TARGET) {
  const filter = `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}:print_format=json`;
  let out;
  try {
    // -vn: картинка для замера не нужна и только тратит время.
    // Вывод уходит в stderr — там же, где идёт весь лог ffmpeg.
    out = await runBin('ffmpeg', ['-hide_banner', '-i', src, '-vn', '-af', filter, '-f', 'null', '-']);
  } catch {
    return null;
  }
  const text = `${out?.stderr || ''}${out?.stdout || ''}`;
  return parseMeasured(text);
}

/**
 * Строка фильтра для второго прохода.
 * measured === null → обычный однопроходный, как было до появления этого модуля.
 *
 * @param {Object|null} measured - выход measureLoudness
 * @param {Object} [target]
 * @returns {string}
 */
export function loudnormFilter(measured, target = TARGET) {
  const head = `loudnorm=I=${target.I}:TP=${target.TP}:LRA=${target.LRA}`;
  if (!measured) return head;
  return [
    head,
    `measured_I=${measured.input_i}`,
    `measured_TP=${measured.input_tp}`,
    `measured_LRA=${measured.input_lra}`,
    `measured_thresh=${measured.input_thresh}`,
    `offset=${measured.target_offset}`,
    // linear: ровная поправка на весь файл вместо покомпрессионной подгонки.
    // Если ffmpeg решит, что линейно уложиться в TP нельзя, он сам переключится
    // на динамический режим и напишет об этом в лог — поэтому лог не глушим.
    'linear=true',
    'print_format=summary',
  ].join(':');
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * JSON замера печатается в САМОМ КОНЦЕ вывода, после всего лога ffmpeg, поэтому
 * ищем последнюю фигурную скобку, а не первую. Все пять полей обязаны быть числами:
 * половина замера хуже отсутствия замера — второй проход применил бы поправку
 * от балды.
 */
function parseMeasured(text) {
  const start = text.lastIndexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let parsed;
  try { parsed = JSON.parse(text.slice(start, end + 1)); } catch { return null; }

  const keys = ['input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset'];
  const measured = {};
  for (const k of keys) {
    const v = Number(parsed[k]);
    if (!Number.isFinite(v)) return null;
    measured[k] = parsed[k];
  }
  return measured;
}
