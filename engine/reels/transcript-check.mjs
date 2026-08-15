/**
 * transcript-check.mjs — проверить расшифровку и подписать её. Бесплатно.
 *
 * Обязательный шаг перед первым платным вызовом: без подписи `reels/generative-run.mjs`
 * не тратит кредиты. Причина в §13 правил Omni — два дефекта готовых роликов за два дня
 * оказались ошибками расшифровки, а не генерации, и каждый стоил от 31 до 121 кредита.
 *
 *   node reels/transcript-check.mjs <видео.words.json>            — отчёт на экран и в файл
 *   node reels/transcript-check.mjs <видео.words.json> --sign     — поставить подпись
 *   node reels/transcript-check.mjs <видео.words.json> --sign --note="что правил"
 *
 * Подпись пишется В САМ words.json полем `reviewed`. Формат остаётся совместимым:
 * загрузчики читают и голый массив, и обёртку `{reviewed, words}`.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { report, suspicious, wordsOf, reviewMark, signed } from './lib/transcript.mjs';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const flag = (name, dflt = null) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : dflt;
  };

  if (!file) {
    console.error('Использование: node reels/transcript-check.mjs <видео.words.json> [--sign] [--note="..."]');
    process.exit(1);
  }

  const raw = JSON.parse(await readFile(file, 'utf8'));
  const words = wordsOf(raw);
  if (!words.length) {
    console.error(`[расшифровка] в файле нет слов: ${file}`);
    process.exit(1);
  }

  const mark = reviewMark(raw);
  const susp = suspicious(words);

  if (args.includes('--sign')) {
    await writeFile(file, JSON.stringify(signed(raw, { note: flag('note', '') }), null, 1), 'utf8');
    console.log(`[расшифровка] подписано: ${file}`);
    console.log('[расшифровка] раннер теперь пропустит этот дубль к платным вызовам.');
    process.exit(0);
  }

  const out = file.replace(/\.words\.json$/, '.transcript-review.md');
  await writeFile(out, report(words), 'utf8');

  console.log(`[расшифровка] слов: ${words.length} · подозрительных: ${susp.length}`);
  for (const s of susp) console.log(`  ⚠ ${s.word} — ${s.why}`);
  console.log(`[расшифровка] отчёт для чтения: ${out}`);
  console.log(mark.ok
    ? `[расшифровка] подпись уже стоит (${mark.at})`
    : '[расшифровка] ПОДПИСИ НЕТ — раннер не станет тратить кредиты. Прочитать отчёт, поправить, затем --sign');

  // Ненулевой код — только когда подписи нет: скрипт годится и как предполётная проверка.
  process.exit(mark.ok ? 0 : 2);
}
