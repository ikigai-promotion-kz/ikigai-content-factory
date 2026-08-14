/**
 * storyboard-live.mjs — подготовка генеративного монтажа куска. Кредитов НЕ тратит.
 *
 * Печатает раскладку панелей, оба промпта и готовые команды — тратит их человек,
 * осознанно и руками. Это режим «посмотреть и решить».
 *
 * Нужен прогон целиком, с гейтами и сборкой, — это `reels/generative-run.mjs`.
 *
 * Вся подготовка (нарезка, панели, промпты, гейт) живёт в `reels/lib/prepare-part.mjs`
 * и общая с раннером: до 14.08.2026 логика была здесь, и копия у раннера неминуемо
 * разъехалась бы — так уже разошлись движок и комплект студентов.
 *
 *   node reels/storyboard-live.mjs <видео> <words.json> [--segment=N]
 *                                    [--style=ключ] [--keep-background] [--out=путь]
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { planSegments, preparePart } from './lib/prepare-part.mjs';
import { STYLES, STYLE_KEYS } from './lib/styles.mjs';

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const SRC = positional[0];
const WORDS = positional[1];

if (!SRC || !WORDS) {
  console.error('Использование: node reels/storyboard-live.mjs <видео> <words.json> [--segment=N] [--style=ключ] [--keep-background] [--out=путь]');
  console.error('Транскрипт делается бесплатно: node reels/transcribe-local.mjs <видео> --out=<words.json>');
  process.exit(1);
}

const segNo = Number((args.find((a) => a.startsWith('--segment=')) || '--segment=1').split('=')[1]);
const styleKey = (args.find((a) => a.startsWith('--style=')) || '--style=gazeta-collage').split('=')[1];
const keepBgFlag = args.includes('--keep-background');
const outDir = (args.find((a) => a.startsWith('--out=')) || `--out=./tmp/storyboard-live/${styleKey}`).split('=')[1];

if (!STYLES[styleKey]) {
  console.error(`Нет стиля «${styleKey}». Есть: ${STYLE_KEYS.join(', ')}`);
  process.exit(1);
}

const words = JSON.parse(await readFile(WORDS, 'utf8'));
const segments = planSegments(Array.isArray(words) ? words : words.words || []);

console.log('ШАГ 1 — нарезка по границам фраз, а не по круглым секундам');
for (const s of segments) {
  console.log(`  кусок ${s.n}: ${s.start.toFixed(2)}–${s.end.toFixed(2)} (${s.duration.toFixed(2)} сек) — «${s.text}»`);
}

const prep = await preparePart({
  src: SRC, segments, segNo, styleKey, keepBackground: keepBgFlag, outDir,
});
const { seg, style, keepBg, cut, panels, frames, board, prompt, params, gate, boardFile, promptFile } = prep;

console.log(`\n  кусок вырезан: ${cut}`);

console.log('\nШАГ 2 — панели раскадровки (таймкод + ТИП ШОТА + слова + роль)');
panels.forEach((p, i) => console.log(`  панель ${i + 1} · ${p.t.toFixed(2)}с · ${p.shot} · «${p.words}» · ${p.role}`));

console.log('\nШАГ 3 — РЕАЛЬНЫЕ кадры куска, по одному на панель');
frames.forEach((f, i) => console.log(`  панель ${i + 1} → ${path.basename(f)}`));

console.log(`\nШАГ 4 — промпт БОРДА (${style.name}): ${panels.length} панелей на реальных кадрах`);
console.log(`  ${boardFile}`);

console.log('\nШАГ 4б — промпт МОНТАЖА: раскадровка текстом, тайминги словами');
console.log('  ' + prompt.split('\n').join('\n  '));

console.log('\nШАГ 5 — параметры вызова');
console.log(`  модель ${params.model} · ${params.duration}с · ${params.aspect_ratio} · медиа ${params.medias.length}`);

console.log('\nШАГ 6 — гейт перед тратой');
console.log(`  ${gate.summary}`);
console.log(`  ${gate.ok ? 'ГЕЙТ ПРОЙДЕН' : 'ГЕЙТ НЕ ПРОЙДЕН'}`);
gate.problems.forEach((p) => console.log(`   ✗ ${p}`));

// Гейт, после которого всё равно печатаются платные команды, — не гейт, а надпись.
if (!gate.ok) {
  console.log('\nПлатные команды НЕ печатаю: сначала устраните замечания выше.');
  console.log(`Промпты сохранены: ${boardFile} и ${promptFile} — их можно посмотреть и поправить.`);
  process.exit(2);
}

console.log('\nШАГ 7 — две генерации, обе тратят кредиты.');
console.log('\n  ПРОЩЕ ВСЕГО — сквозной раннер, он сделает оба шага сам и остановится на приёмке:');
console.log(`    node reels/generative-run.mjs "${SRC}" "${WORDS}" --style=${styleKey} --segments=${seg.n}`);

console.log('\n  ПУТЬ А — КОННЕКТОР в приложении Claude.');
console.log('  Агент делает это сам инструментами коннектора, команды печатать не нужно:');
console.log(`    1. Загрузить файлы и получить media_id: ${frames.map((f) => path.basename(f)).join(', ')} и ${path.basename(cut)}.`);
console.log(`    2. generate_image · модель gpt_image_2 · промпт из ${boardFile}`);
console.log(`       медиа: ${frames.length} кадров ролью image_references · 9:16 · 2k`);
console.log('       → СКАЧАТЬ и ПОСМОТРЕТЬ ГЛАЗАМИ, только потом дальше');
console.log(`    3. generate_video · модель ${params.model} · промпт из ${promptFile}`);
console.log(`       медиа: ${path.basename(cut)} ролью video_references + борд ролью image_references`);
console.log(`       длительность ${params.duration} · ${params.aspect_ratio} · ${params.resolution}`);

console.log('\n  ПУТЬ Б — КОМАНДНАЯ СТРОКА higgsfield.');
console.log('  Проверить: higgsfield account status. Отвечает «command not found» — идите путём А.');
console.log('\n  1) собрать борд (≈7 кр) и ПОСМОТРЕТЬ ЕГО ГЛАЗАМИ до второго шага:');
console.log([
  `  higgsfield generate create gpt_image_2`,
  `    --prompt "$(cat ${boardFile})"`,
  ...frames.map((f) => `    --image "${f}"`),
  `    --aspect_ratio 9:16 --resolution 2k --wait`,
].join(' \\\n'));

console.log(`\n  2) смонтировать кусок по борду (≈30 кр), сохранив борд как ${path.basename(board)}:`);
console.log([
  `  higgsfield generate create ${params.model}`,
  `    --prompt "$(cat ${promptFile})"`,
  `    --video "${cut}"`,
  `    --image "${board}"`,
  `    --duration ${params.duration} --resolution ${params.resolution} --aspect_ratio ${params.aspect_ratio} --wait`,
].join(' \\\n'));

console.log('\nШАГ 8 — сборка куска после монтажа (бесплатно, штатный шаг):');
console.log(`  node reels/finish-part.mjs <ответ-модели.mp4> ${cut} --out=${path.join(outDir, `part-${seg.n}-final.mp4`)}`);
console.log('  вернёт вашу дорожку и добьёт длину стоп-кадром — модель отдаёт короче заказа.');
console.log('  Полосу сверху НЕ размывает: приём отвергнут 04.08.2026, он режет голову спикера.');

const bgWhy = style.mode === 'A' && !keepBgFlag ? ' (режим A — стиль живёт на панелях, среду не трогаем)' : '';
console.log(`\nСтиль: ${style.name} (${styleKey}). Фон за спикером: ${keepBg ? 'оставляем как снят' : style.background}${bgWhy}.`);
console.log(`Текст на предметах: ${style.textAsObject === true ? 'разрешён — по ОДНОМУ короткому слову, стиль на этом держится' : 'запрещён — в кадре только титр, предметы пустые'}.`);
console.log('Звук модели не берём: оригинальную дорожку возвращаем сами при склейке.');
console.log('Порядок жёсткий: первый кусок → приёмка глазами → остальные.');
