/**
 * note.mjs — записать наблюдение в бортжурнал прогона одной командой.
 *
 * Тонкий CLI поверх `reels/lib/journal.mjs`, по образцу `scripts/record-lesson.mjs`.
 * Нужен затем же, зачем тот: наблюдение появляется тогда, когда его увидели глазами,
 * а не когда до него дойдут руки. Между «увидел» и «записал» не должно быть работы,
 * иначе не запишется — проверено 15–16.08, когда весь разбор жил в переписке.
 *
 * Кто зовёт: Claude Code после просмотра кадров приёмки. Механику код пишет сам.
 *
 *   node reels/note.mjs <папка-прогона> --stage=приёмка --kind=дефект \
 *        --what="в карточке псевдорусский текст" --where="qa-final/qa-3.0.jpg"
 *
 * Типы: дефект · подозрение · удача · трата · механика · решение
 *
 * ЧИНИТЬ В МОМЕНТ ПРОГОНА НЕ НАДО. Записал — пошёл дальше. Разбор пачкой: reels/debrief.mjs
 */

import { pathToFileURL } from 'node:url';
import { note, digest, KINDS } from './lib/journal.mjs';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith('--'));
  const flag = (name, dflt = null) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : dflt;
  };

  const outDir = positional[0];
  const what = flag('what');
  if (!outDir || !what) {
    console.error('Использование: node reels/note.mjs <папка-прогона> --what="что видно"');
    console.error('               [--stage=приёмка] [--kind=дефект] [--where="файл и секунда"]');
    console.error(`Типы: ${KINDS.join(' · ')}`);
    process.exit(1);
  }

  const rec = await note(outDir, {
    stage: flag('stage', 'приёмка'),
    kind: flag('kind', 'дефект'),
    what,
    where: flag('where', ''),
  });
  const log = await digest(outDir);
  console.log(`[журнал] ${rec.kind} · ${rec.stage} — ${rec.what}`);
  if (rec.where) console.log(`[журнал] где: ${rec.where}`);
  console.log(`[журнал] сводка: ${log}`);
}
