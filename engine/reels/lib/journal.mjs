/**
 * journal.mjs — бортжурнал прогона: наблюдения копятся, а чинятся отдельной сессией.
 *
 * Заведён 15.08.2026 после дня, в котором мы поймали шесть дефектов и НИ ОДНОГО до
 * генерации. Пять из шести были видны на бесплатных артефактах — в расшифровке, в тексте
 * промпта, на борде, — но замечались только на готовом ролике за 31–121 кредит.
 *
 * Вторая причина: наблюдения жили в переписке. Разбор кадров, найденная причина, вывод —
 * всё это проговаривалось голосом и терялось. У каруселей петля замкнута кодом
 * (`orchestrator.js` зовёт `recordLesson()` сам), у видео не звалась ниоткуда.
 *
 * ГЛАВНОЕ ПРАВИЛО ЖУРНАЛА: во время прогона мы ЗАПИСЫВАЕМ, а не чиним. Правка в моменте
 * ломает прогон, смешивает причины и мешает понять, что именно сработало. Разбор идёт
 * потом, пачкой — `reels/debrief.mjs`.
 *
 * Устройство скопировано с `lib/lessons.js` намеренно: append-only JSONL, без БД, тот же
 * вид записи. Второй механизм хранения знаний завёл бы второй источник правды.
 *
 * Журнал лежит РЯДОМ С ПРОГОНОМ (`<out>/journal.jsonl`), а не в общем хранилище: прогон
 * должен переживать закрытие терминала целиком, вместе со своими наблюдениями. В общий
 * `knowledge/video-runs.jsonl` уходит одна строка на прогон — чтобы можно было спросить
 * «что мы вообще гоняли и во что это обошлось».
 */

import { appendFile, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// reels/lib → reels → carousel-engine
const ENGINE_ROOT = path.dirname(path.dirname(__dirname));
const RUNS_PATH = path.join(ENGINE_ROOT, 'knowledge', 'video-runs.jsonl');

/**
 * Типы наблюдений. Список закрытый: свободные формулировки не группируются в дебрифе,
 * а именно группировка и делает журнал полезным.
 *
 * `дефект`      — видно в кадре или в артефакте, испортило результат.
 * `подозрение`  — заметил, но не уверен, что брак; проверять на следующем прогоне.
 * `удача`       — вышло хорошо, повторить (эталон планки, а не просто похвала).
 * `трата`       — деньги: смета, факт, возврат за отклонённое задание.
 * `механика`    — что сделал код: длины, отказ фильтра, смягчение, артефакты.
 * `решение`     — человек что-то решил по ходу; чтобы потом не гадать почему.
 */
export const KINDS = ['дефект', 'подозрение', 'удача', 'трата', 'механика', 'решение'];

/**
 * Записать наблюдение.
 *
 * @param {string} outDir - папка прогона
 * @param {Object} o
 * @param {string} o.stage - этап: расшифровка · подготовка · борд · монтаж · сборка · приёмка
 * @param {string} o.kind - из KINDS
 * @param {string} o.what - что именно наблюдаем, одной фразой по-русски
 * @param {string} [o.where] - ГДЕ смотреть: файл и секунда. Без этого наблюдение
 *   неповторяемо, а значит бесполезно — на разборе никто не найдёт, о чём речь.
 * @param {number} [o.cost] - кредитов ЗА ЭТОТ ШАГ, приращением, а не нарастающим итогом.
 *   Смешение двух видов даёт неверную сумму в сводке — поймано на первом же тесте:
 *   7 (борд) + 62 (итог прогона) дали «списано 69» при фактических 62.
 * @param {Object} [o.extra] - что угодно машинное: длины, параметры, коды
 */
export async function note(outDir, { stage, kind, what, where = '', cost = null, extra = null }) {
  if (!what) throw new Error('journal.note: what обязателен');
  if (kind && !KINDS.includes(kind)) {
    throw new Error(`journal.note: тип «${kind}» не из списка: ${KINDS.join(', ')}`);
  }
  await mkdir(outDir, { recursive: true });
  const rec = {
    at: new Date().toISOString(),
    stage: String(stage || '—'),
    kind: kind || 'механика',
    what: String(what),
    where: String(where || ''),
    ...(cost != null ? { cost } : {}),
    ...(extra ? { extra } : {}),
  };
  await appendFile(path.join(outDir, 'journal.jsonl'), JSON.stringify(rec) + '\n', 'utf8');
  return rec;
}

/** Прочитать журнал прогона. Нет файла — пустой список, а не ошибка. */
export async function read(outDir) {
  return readJSONL(path.join(outDir, 'journal.jsonl'));
}

/**
 * Открыть прогон: первая запись в журнал плюс строка в общем реестре.
 * @param {string} outDir
 * @param {Object} meta - {src, styleKey, segments, estimate, balance}
 */
export async function openRun(outDir, meta = {}) {
  await note(outDir, {
    stage: 'подготовка',
    kind: 'механика',
    what: `прогон открыт: стиль ${meta.styleKey || '—'}, кусков ${meta.segments ?? '—'}`,
    where: outDir,
    extra: meta,
  });
  await appendRun({ event: 'открыт', outDir, ...meta });
}

/**
 * Закрыть прогон: итог в журнал, строка в реестр, пересборка RUN-LOG.md.
 * @param {string} outDir
 * @param {Object} meta - {styleKey, spent, balance, final}
 */
export async function closeRun(outDir, meta = {}) {
  // cost НЕ проставляем: `meta.spent` — итог по балансу за весь прогон, а не приращение.
  // Он уходит в extra и служит СВЕРКОЙ: сводка сравнит его с суммой записей, и расхождение
  // будет означать, что что-то списалось мимо журнала.
  await note(outDir, {
    stage: 'сборка',
    kind: 'трата',
    what: `прогон закрыт: по балансу списано ${meta.spent ?? '—'} кредитов`,
    where: meta.final || outDir,
    extra: { ...meta, итогПоБалансу: meta.spent ?? null },
  });
  await appendRun({ event: 'закрыт', outDir, ...meta });
  return digest(outDir);
}

/**
 * Собрать читаемую сводку прогона. Пересобирается целиком из журнала — сводка это
 * ПРОИЗВОДНОЕ, править её руками нельзя, иначе она разойдётся с журналом.
 * @param {string} outDir
 * @returns {Promise<string>} путь к RUN-LOG.md
 */
export async function digest(outDir) {
  const rows = await read(outDir);
  const byStage = new Map();
  for (const r of rows) {
    if (!byStage.has(r.stage)) byStage.set(r.stage, []);
    byStage.get(r.stage).push(r);
  }

  const defects = rows.filter((r) => r.kind === 'дефект');
  const suspects = rows.filter((r) => r.kind === 'подозрение');
  const wins = rows.filter((r) => r.kind === 'удача');
  const spent = round2(rows.reduce((s, r) => s + (typeof r.cost === 'number' ? r.cost : 0), 0));
  // Сверка двух счётчиков: сумма приращений из журнала против дельты баланса. Расходятся —
  // значит что-то списалось мимо журнала, и это надо увидеть, а не усреднить.
  const byBalance = rows.map((r) => r.extra?.итогПоБалансу).filter((v) => typeof v === 'number').pop();
  const mismatch = byBalance != null && Math.abs(byBalance - spent) > 0.5;

  const lines = [
    `# Бортжурнал прогона — ${path.basename(outDir)}`,
    '',
    `Записей: ${rows.length} · дефектов: ${defects.length} · подозрений: ${suspects.length}`
      + ` · удач: ${wins.length} · списано по журналу: ${spent} кредитов`
      + (byBalance != null ? ` · по балансу: ${byBalance}` : ''),
    '',
    ...(mismatch
      ? [`> ⚠ Журнал и баланс расходятся на ${round2(Math.abs(byBalance - spent))} кредита —`
         + ' значит был платный вызов, которого журнал не видел. Разобраться до следующего прогона.', '']
      : []),
    '> Наблюдения записаны по ходу и НЕ чинились в моменте. Разбор — `node reels/debrief.mjs`.',
    '',
  ];

  if (defects.length || suspects.length) {
    lines.push('## Что чинить', '');
    for (const r of [...defects, ...suspects]) {
      lines.push(`- **${r.kind}** · ${r.stage} — ${r.what}${r.where ? `\n  где: \`${r.where}\`` : ''}`);
    }
    lines.push('');
  }

  if (wins.length) {
    lines.push('## Что повторить', '');
    for (const r of wins) lines.push(`- ${r.what}${r.where ? ` — \`${r.where}\`` : ''}`);
    lines.push('');
  }

  lines.push('## По этапам', '');
  for (const [stage, list] of byStage) {
    lines.push(`### ${stage}`, '');
    for (const r of list) {
      const cost = typeof r.cost === 'number' ? ` · ${r.cost} кр` : '';
      lines.push(`- ${r.at.slice(11, 19)} · ${r.kind}${cost} — ${r.what}`);
    }
    lines.push('');
  }

  const file = path.join(outDir, 'RUN-LOG.md');
  await writeFile(file, lines.join('\n'), 'utf8');
  return file;
}

/** Общий реестр прогонов: одна строка на событие, чтобы видеть картину поверх папок. */
async function appendRun(rec) {
  await mkdir(path.dirname(RUNS_PATH), { recursive: true });
  await appendFile(RUNS_PATH, JSON.stringify({ at: new Date().toISOString(), ...rec }) + '\n', 'utf8');
}

function round2(n) { return Math.round(n * 100) / 100; }

async function readJSONL(p) {
  try { await access(p); } catch { return []; }
  const text = await readFile(p, 'utf8');
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

export const _paths = { RUNS_PATH };
