/**
 * storyboard-live.mjs — подготовка генеративного монтажа куска, целиком.
 *
 * Собирает в один прогон то, что раньше было библиотекой без вызова: нарезку по
 * границам фраз → реальные кадры → промпт борда → промпт монтажа → гейт → готовые
 * команды. Кредитов НЕ тратит: печатает две команды, тратит их человек осознанно.
 *
 * Монтирует Gemini Omni Flash по картинке-борду — так же, как автор метода, только
 * без Google Flow и Chrome CDP: у нас та же модель вызывается командой.
 * Правила, без которых это не работает — `reels/knowledge/omni-montage-rules.md`.
 *
 *   node reels/storyboard-live.mjs <видео> <words.json> [--segment=N]
 *                                    [--style=ключ] [--keep-background] [--out=путь]
 *
 * Стили: `reels/lib/styles.mjs` (17 пресетов).
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { segmentByPhrase } from './lib/segment.mjs';
import { grabPanelFrames, montagePrompt, storyboardPrompt } from './lib/storyboard.mjs';
import { montageParams, preflight } from './lib/montage.mjs';
import { runBin } from './lib/bin.mjs';
import { STYLES, STYLE_KEYS, styleLine, keepSpeakerLine } from './lib/styles.mjs';

// Дубль и транскрипт приходят аргументами: жёстко зашитые пути ломали переносимость
// (публикатор комплекта их и не пропускает — он останавливается на абсолютных путях).

// Шесть панелей на кусок — столько же, сколько в коллаже у конкурента. Набор
// намеренно разный: правило словаря «два одинаковых плана подряд не ставим».
const SHOTS = [
  { shot: 'FULLSCREEN SPEAKER PUSH IN', motion: 'slow push in on the speaker', role: 'открывает кусок' },
  { shot: 'CONTENT WITH CIRCLE', motion: 'speaker shrinks into a circle, content slides in from the right', role: 'вводит доказательство' },
  { shot: 'FULLSCREEN CONTENT NO SPEAKER', motion: 'content fills the frame, letters animate in with overshoot', role: 'кульминация фразы' },
  { shot: 'SPLIT-SCREEN L/R', motion: 'frame splits vertically, both halves drift slowly', role: 'сравнение' },
  { shot: 'ZOOM-OUT REVEAL', motion: 'camera pulls back revealing the whole scene', role: 'раскрытие масштаба' },
  { shot: 'FULLSCREEN SPEAKER PUSH IN WARM', motion: 'warm slow push in, light softens', role: 'закрывает кусок' },
];

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
// Стили режима A (кинетик, тёплый бренд, 3D-моушн) реальность НЕ заменяют: покадровый
// разбор десяти демо автора метода 03.08.2026 показал, что спикер там остаётся в своей
// комнате, а мир стиля живёт на панелях-кульминациях. До этого сборка честно подставляла
// им `background` и загнала бы спикера кинетика в «чёрный войд», которого у автора нет.
// Флаг --keep-background остаётся ручным рычагом для остальных режимов.
const keepBgFlag = args.includes('--keep-background');
const outDir = (args.find((a) => a.startsWith('--out=')) || `--out=./tmp/storyboard-live/${styleKey}`).split('=')[1];

if (!STYLES[styleKey]) {
  console.error(`Нет стиля «${styleKey}». Есть: ${STYLE_KEYS.join(', ')}`);
  process.exit(1);
}
const style = STYLES[styleKey];
const keepBg = keepBgFlag || style.mode === 'A';

const words = JSON.parse(await readFile(WORDS, 'utf8'));
const segments = segmentByPhrase(words, { target: 10, min: 4, max: 15 });

console.log('ШАГ 1 — segment.mjs: нарезка по границам фраз, а не по круглым секундам');
for (const s of segments) {
  console.log(`  кусок ${s.n}: ${s.start.toFixed(2)}–${s.end.toFixed(2)} (${s.duration.toFixed(2)} сек) — «${s.text}»`);
}

const seg = segments.find((s) => s.n === segNo);
if (!seg) throw new Error(`куска ${segNo} нет`);

await mkdir(outDir, { recursive: true });
const cut = path.join(outDir, `segment-${seg.n}.mp4`);
await runBin('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(seg.start), '-t', String(seg.duration), '-i', SRC, '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', cut]);
console.log(`\n  кусок вырезан: ${cut}`);

// Панели раскладываются по СЛОВАМ, а не по равным долям времени.
//
// Так было до 02.08.2026: время делилось на шесть, и в подпись попадало то, что
// случайно оказалось в окне — предлог «в», обрывок «очень». Модель на это отвечает
// пересинтезом речи под надпись (грабля автора метода: «Omni переписывает речь,
// если каптион ≠ сказанному»), и мы это воспроизвели — 45 кредитов в мусор.
// Теперь слова делятся на шесть непрерывных групп, подпись = реально произнесённая
// фраза, а таймкод панели берётся от первого слова группы.
// Панелей столько, на сколько хватает слов: минимум два слова на подпись, иначе
// в кадр уходит предлог. Медленная речь даёт меньше панелей — и это правильно,
// шесть панелей на десять слов означали бы шесть однословных титров.
const MIN_WORDS_PER_PANEL = 2;
const panelCount = Math.max(3, Math.min(SHOTS.length, Math.floor(seg.words.length / MIN_WORDS_PER_PANEL)));

const panels = splitWords(seg.words, panelCount).map((group, i) => ({
  ...SHOTS[i],
  t: Math.round(Math.max(0, group[0].s - seg.start) * 100) / 100,
  // Длинный русский текст модель коверкает — держим до четырёх слов подряд.
  words: group.slice(0, 4).map((w) => w.w).join(' '),
}));

/** Разбить слова на n непрерывных групп, остаток раскидать по первым — без пустых. */
function splitWords(words, n) {
  const base = Math.floor(words.length / n);
  const extra = words.length % n;
  const out = [];
  let i = 0;
  for (let g = 0; g < n; g += 1) {
    const size = base + (g < extra ? 1 : 0);
    out.push(words.slice(i, i + size));
    i += size;
  }
  return out;
}

console.log('\nШАГ 2 — панели раскадровки (таймкод + ТИП ШОТА + слова + роль)');
for (const [i, p] of panels.entries()) {
  console.log(`  панель ${i + 1} · ${p.t.toFixed(2)}с · ${p.shot} · «${p.words}» · ${p.role}`);
}

console.log('\nШАГ 3 — grabPanelFrames(): РЕАЛЬНЫЕ кадры куска, по одному на панель');
const frames = await grabPanelFrames(cut, panels, outDir);
frames.forEach((f, i) => console.log(`  панель ${i + 1} → ${path.basename(f)}`));

console.log(`\nШАГ 4 — промпт БОРДА (${style.name}): шесть панелей на реальных кадрах`);
const boardPrompt = [
  storyboardPrompt({ part: seg.n, total: segments.length, panels, preset: { palette: style.formula, type: style.name } }),
  '',
  keepBg ? '' : keepSpeakerLine(styleKey),
].filter(Boolean).join('\n');
const boardFile = path.join(outDir, 'board-prompt.txt');
await writeFile(boardFile, boardPrompt, 'utf8');
console.log(`  промпт борда: ${boardFile} (${boardPrompt.length} знаков)`);

console.log('\nШАГ 4б — montagePrompt(): раскадровка ТЕКСТОМ, тайминги словами');
const prompt = montagePrompt(panels, { style: styleLine(styleKey) + (keepBg ? '' : ` ${keepSpeakerLine(styleKey)}`) });
console.log('  ' + prompt.split('\n').join('\n  '));

// Борд — ОДНА картинка-коллаж, собранная на реальных кадрах. Именно она уходит в
// монтаж вместе с куском видео. У автора метода так, потому что Google Flow берёт два
// ингредиента; у нас модель приняла бы и пять кадров россыпью, но этот вариант НЕ
// проверен, а борд у него доказан девятью роликами. Начинаем с доказанного.
const board = path.join(outDir, `board-part-${seg.n}.png`);

console.log('\nШАГ 5 — montageParams(): сборка параметров вызова');
const params = montageParams({
  videoMediaId: cut,
  frameMediaIds: [board],
  prompt,
  duration: seg.duration,
});
console.log(`  модель ${params.model} · ${params.duration}с · ${params.aspect_ratio} · медиа ${params.medias.length}`);

console.log('\nШАГ 6 — preflight(): гейт перед тратой');
// Гейт сверяет собранное с ЗАКАЗАННЫМ, а не с самим собой. Раньше сюда уходили
// params.medias.length и params.duration — то есть уже обрезанные значения сравнивались
// сами с собой, и заказ «14 секунд, 7 кадров», молча ставший «10 секунд, 6 файлов»,
// проходил гейт зелёным. Ожидание считается от исходного заказа.
// Ожидание берётся из ЗАМЫСЛА, а не из собранных параметров:
//  · медиа ровно два — кусок видео и картинка-борд (кадры ушли в борд, не в монтаж);
//  · слот равен длине куска. Кусок длиннее модельного максимума → гейт скажет об этом,
//    и это честное предупреждение: модель обрежет хвост, мы это видели на прогоне.
const WANT_MEDIAS = 2;
const gate = preflight(params, { prompt, refs: WANT_MEDIAS, duration: Math.round(seg.duration) });
console.log(`  ${gate.summary}`);
console.log(`  ${gate.ok ? 'ГЕЙТ ПРОЙДЕН' : 'ГЕЙТ НЕ ПРОЙДЕН'}`);
gate.problems.forEach((p) => console.log(`   ✗ ${p}`));

const promptFile = path.join(outDir, 'montage-prompt.txt');
await writeFile(promptFile, prompt, 'utf8');

// Гейт, после которого всё равно печатаются платные команды, — не гейт, а надпись.
if (!gate.ok) {
  console.log('\nПлатные команды НЕ печатаю: сначала устраните замечания выше.');
  console.log(`Промпты сохранены: ${boardFile} и ${promptFile} — их можно посмотреть и поправить.`);
  process.exit(2);
}

console.log('\nШАГ 7 — две генерации, обе тратят кредиты. Путь зависит от того, как у вас подключён Higgsfield.');

console.log('\n  ПУТЬ А — КОННЕКТОР в приложении Claude (так у большинства).');
console.log('  Агент делает это сам инструментами коннектора, команды печатать не нужно:');
console.log(`    1. Загрузить файлы и получить media_id: ${frames.map((f) => path.basename(f)).join(', ')} и ${path.basename(cut)}.`);
console.log(`    2. generate_image · модель gpt_image_2 · промпт из ${boardFile}`);
console.log(`       медиа: ${frames.length} кадров ролью image_references · 9:16 · 2k`);
console.log('       → СКАЧАТЬ и ПОСМОТРЕТЬ ГЛАЗАМИ, только потом дальше');
console.log(`    3. generate_video · модель ${params.model} · промпт из ${promptFile}`);
console.log(`       медиа: ${path.basename(cut)} ролью video_references + борд ролью image_references`);
console.log(`       длительность ${params.duration} · ${params.aspect_ratio} · ${params.resolution}`);

console.log('\n  ПУТЬ Б — КОМАНДНАЯ СТРОКА higgsfield (если установлена отдельно).');
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

const bgWhy = style.mode === 'A' && !keepBgFlag ? ' (режим A — стиль живёт на панелях, среду не трогаем)' : '';
console.log(`\nСтиль: ${style.name} (${styleKey}). Фон за спикером: ${keepBg ? 'оставляем как снят' : style.background}${bgWhy}.`);
console.log('Звук модели не берём: оригинальную дорожку возвращаем сами при склейке.');
console.log('Порядок жёсткий: первый кусок → приёмка глазами → остальные.');
