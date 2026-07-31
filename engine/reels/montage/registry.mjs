/**
 * registry.mjs — реестр разнообразия выпусков.
 *
 * В правилах кадра (`reels/knowledge/shot-vocabulary.md`) реестр был объявлен давно,
 * а файла не существовало вовсе: запрет «не повторять набор и порядок кадров с
 * прошлого выпуска» проверять было нечем.
 *
 * Пишется после успешного рендера, читается перед следующим. Ничего не запрещает —
 * предупреждает: два похожих ролика подряд иногда осознанное решение (серия), а
 * иногда признак того, что конвейер выдаёт один и тот же кадр под любой смысл.
 */

import { readFile, appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(HERE, '..', 'knowledge', 'shots-registry.jsonl');

/**
 * Прочитать последние записи реестра.
 * @param {number} [limit=5]
 * @returns {Promise<Array<{name:string, at:string, theme:string, shots:string[]}>>}
 */
export async function readRegistry(limit = 5) {
  try {
    const text = await readFile(FILE, 'utf8');
    const rows = text.split('\n').filter(Boolean).map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
    return rows.slice(-limit);
  } catch {
    return [];   // реестра ещё нет — это первый выпуск, а не ошибка
  }
}

/**
 * Записать выпуск в реестр.
 * @param {{name:string, theme:string, shots:string[], takeovers:number}} entry
 * @param {string} [at] - метка времени; передаётся снаружи, чтобы функция оставалась
 *                        предсказуемой в тестах
 */
export async function recordRelease(entry, at = new Date().toISOString()) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await appendFile(FILE, JSON.stringify({ at, ...entry }) + '\n', 'utf8');
}

/**
 * Чем этот выпуск похож на предыдущие. Возвращает список предупреждений.
 *
 * Сравниваем три вещи, как в правилах: порядок кадров, набор кадров и стилевую тему.
 * Порядок важнее набора — повтор последовательности читается как «тот же ролик».
 *
 * @param {{theme:string, shots:string[]}} current
 * @param {Array} history - выход readRegistry
 * @returns {string[]}
 */
export function sameness(current, history) {
  if (!history.length) return [];
  const out = [];
  const last = history[history.length - 1];

  if (last.shots?.join('>') === current.shots.join('>')) {
    out.push('порядок кадров повторяет прошлый выпуск полностью — зритель увидит тот же ролик');
  } else {
    const setNow = new Set(current.shots);
    const setPrev = new Set(last.shots || []);
    const common = [...setNow].filter((s) => setPrev.has(s)).length;
    const union = new Set([...setNow, ...setPrev]).size;
    if (union && common / union >= 0.85) {
      out.push('набор кадров почти совпадает с прошлым выпуском — стоит взять другую композицию хотя бы на кульминацию');
    }
  }

  if (last.theme && last.theme === current.theme) {
    out.push(`тема оформления «${current.theme}» второй выпуск подряд`);
  }
  return out;
}
