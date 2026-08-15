/**
 * debrief.mjs — разбор прогонов пачкой, отдельной сессией.
 *
 * Смысл всей затеи с журналом: во время прогона мы НЕ чиним, а записываем. Правка в
 * моменте смешивает причины (что сработало — новая формулировка или другой стиль?),
 * ломает начатый прогон и не даёт увидеть, повторяется дефект или случился однажды.
 *
 * Здесь наблюдения со всех прогонов сводятся вместе и группируются по СМЫСЛУ, а не по
 * времени. Повторяющееся всплывает наверх — а именно повторяемость отличает правило,
 * которое стоит зашить в промпт, от единичной выходки модели.
 *
 *   node reels/debrief.mjs                     — все прогоны, что нашлись рядом
 *   node reels/debrief.mjs <папка> [<папка>…]  — только эти
 *   node reels/debrief.mjs --since=2026-08-16  — с этой даты
 *
 * Подтверждённые пункты уходят в петлю СУЩЕСТВУЮЩИМ механизмом — `recordLesson()` из
 * `lib/lessons.js`, тем же, которым живут уроки каруселей. Второго хранилища знаний
 * не заводим: разошлись бы на первой же правке.
 */

import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { read } from './lib/journal.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_ROOT = path.dirname(__dirname);

/**
 * Найти папки прогонов: те, где лежит journal.jsonl.
 * Ищем не глубже двух уровней — витрина кладёт журнал в корень прогона, раннер тоже.
 */
async function findRuns(roots) {
  const found = [];
  for (const root of roots) {
    try {
      const entries = await readdir(root, { withFileTypes: true });
      if (entries.some((e) => e.isFile() && e.name === 'journal.jsonl')) found.push(root);
      for (const e of entries.filter((x) => x.isDirectory())) {
        const sub = path.join(root, e.name);
        const inner = await readdir(sub).catch(() => []);
        if (inner.includes('journal.jsonl')) found.push(sub);
      }
    } catch { /* нет папки — нечего разбирать */ }
  }
  return [...new Set(found)];
}

/**
 * Схлопнуть похожие наблюдения. Ключ — тип плюс первые значимые слова: точное совпадение
 * строк не годится, «панель 3» и «панель 6» это один и тот же дефект.
 */
function groupKey(rec) {
  const norm = String(rec.what)
    .toLowerCase()
    .replace(/\d+/g, 'N')
    .replace(/«[^»]*»/g, '«…»')
    .replace(/\s+/g, ' ')
    .trim();
  return `${rec.kind}::${norm.slice(0, 80)}`;
}

export async function debrief({ roots = [], since = null } = {}) {
  const runs = await findRuns(roots.length ? roots : [
    path.join(path.dirname(path.dirname(ENGINE_ROOT)), 'AI-agenty', 'Video-fabrika'),
    path.join(ENGINE_ROOT, 'out'),
  ]);

  const rows = [];
  for (const dir of runs) {
    for (const r of await read(dir)) {
      if (since && r.at < since) continue;
      rows.push({ ...r, run: path.basename(dir) });
    }
  }

  const groups = new Map();
  for (const r of rows) {
    const k = groupKey(r);
    if (!groups.has(k)) groups.set(k, { kind: r.kind, sample: r, hits: [] });
    groups.get(k).hits.push(r);
  }

  const problems = [...groups.values()]
    .filter((g) => g.kind === 'дефект' || g.kind === 'подозрение')
    .sort((a, b) => b.hits.length - a.hits.length);

  const wins = [...groups.values()].filter((g) => g.kind === 'удача');
  const spent = rows.reduce((s, r) => s + (typeof r.cost === 'number' ? r.cost : 0), 0);

  return { runs, rows, problems, wins, spent };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const roots = args.filter((a) => !a.startsWith('--'));
  const since = (args.find((a) => a.startsWith('--since=')) || '').slice(8) || null;

  const { runs, rows, problems, wins, spent } = await debrief({ roots, since });

  if (!runs.length) {
    console.log('[дебриф] журналов не нашлось. Прогоны до 16.08.2026 их не вели.');
    process.exit(0);
  }

  console.log(`[дебриф] прогонов: ${runs.length} · записей: ${rows.length} · списано: ${Math.round(spent * 100) / 100} кредитов`);
  runs.forEach((r) => console.log(`  · ${r}`));

  if (problems.length) {
    console.log(`\n── ЧТО ЧИНИТЬ (${problems.length} тем) ──`);
    console.log('   Сверху то, что повторялось чаще: повторяемость отличает правило от случайности.\n');
    problems.forEach((g, i) => {
      console.log(`${i + 1}. [${g.hits.length}×] ${g.sample.what}`);
      const where = g.hits.map((h) => h.where).filter(Boolean).slice(0, 3);
      if (where.length) console.log(`   где: ${where.join(' · ')}`);
      console.log(`   прогоны: ${[...new Set(g.hits.map((h) => h.run))].join(', ')}`);
    });
  } else {
    console.log('\n── дефектов и подозрений не записано ──');
  }

  if (wins.length) {
    console.log(`\n── ЧТО ПОВТОРИТЬ (${wins.length}) ──`);
    wins.forEach((g) => console.log(`  · [${g.hits.length}×] ${g.sample.what}`));
  }

  console.log('\n── дальше ──');
  console.log('  Разобрать пункты сверху вниз, починить, и то, что подтвердилось, — в петлю:');
  console.log('  node scripts/record-lesson.mjs --tags="видео,omni" --wrong="..." --fix="..."');
}
