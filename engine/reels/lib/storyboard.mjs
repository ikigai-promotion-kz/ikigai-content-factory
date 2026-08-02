/**
 * storyboard.mjs — раскадровка куска в картинку-сториборд.
 *
 * КРИТИЧНЫЙ ПРИЁМ метода AI Cube: к запросу на генерацию сториборда прикладываются
 * 6 РЕАЛЬНЫХ КАДРОВ из этого же куска видео. Без них video-to-video модель не связывает
 * борд с исходником и уплывает — панели рисуются «вообще про что-то». С ними борд
 * ложится на конкретные кадры, и монтаж получается по нему, а не по фантазии.
 *
 * Сама картинка-сториборд генерится вне этого модуля (Higgsfield MCP, gpt_image_2 —
 * он держит кириллицу в подписях панелей). Здесь — подготовка: кадры и текст промпта.
 */

import path from 'node:path';
import { grabFrame, probe } from './assemble.mjs';

/**
 * Вырезать по кадру на каждую панель — точно в таймкод, указанный в раскадровке.
 * @param {string} source - файл куска
 * @param {Array<{t:number}>} panels - панели с таймкодами (сек от начала куска)
 * @param {string} outDir
 * @returns {Promise<string[]>} пути к кадрам по порядку панелей
 */
export async function grabPanelFrames(source, panels, outDir) {
  const { duration } = await probe(source);
  const out = [];
  for (const [i, p] of panels.entries()) {
    // Последняя панель часто указывает на самый конец фразы, а таймкод там совпадает
    // с длительностью — ffmpeg на этом отдаёт пустой файл. Отступаем на полкадра назад.
    const at = Math.min(p.t, Math.max(0, duration - 0.05));
    const file = path.join(outDir, `frame-${i + 1}.jpg`);
    await grabFrame(source, at, file);
    out.push(file);
  }
  return out;
}

/**
 * Промпт картинки-сториборда: сетка панелей поверх реальных кадров.
 * Структура из метода: заголовок части, 6 панелей в рамках, под каждой — таймкод
 * и тип шота, стрелки движения между панелями.
 *
 * @param {Object} args
 * @param {number} args.part - номер куска
 * @param {number} args.total - всего кусков
 * @param {Array<{t:number, shot:string, words:string, role:string}>} args.panels
 * @param {{name:string, palette:string, type:string}} args.preset - стилевой пресет
 * @returns {string}
 */
export function storyboardPrompt({ part, total, panels, preset }) {
  // Слова из транскрипта ОБЯЗАНЫ быть на борде: именно их модель потом рисует в кадре.
  // До 02.08.2026 сюда уходила только драматургическая роль, а подписи не попадали
  // на борд вообще — модель придумывала текст сама.
  const rows = panels
    .map((p, i) => `panel ${i + 1} — attachment ${i + 1} as the photo inside the phone frame; ` +
      `big Russian caption drawn OVER the photo, exactly these words and nothing else: "${p.words}"; ` +
      `graphic overlay inside the panel illustrates: ${p.role}`)
    .join('\n');

  // Сетка считается от числа панелей, а не зашита. Раньше здесь стояло «6 panels in a
  // 2x3 grid» жёстко — на пяти панелях модель дорисовывала шестую от себя.
  const cols = panels.length <= 4 ? 2 : 3;
  const rowsCount = Math.ceil(panels.length / cols);

  return [
    `A storyboard sheet, exactly ${panels.length} panels in a ${rowsCount}x${cols} grid, flat graphic design, ${preset.palette}.`,
    `Draw exactly ${panels.length} panels — no extra panels, no empty cells, do not invent additional frames.`,
    '',
    // Шапки на борде быть НЕ должно. Автор метода снял её 29.07.2026: Omni утаскивает
    // «MADE BY AI — PART N/M» прямо в кадр готового видео. Номер части живёт в имени файла.
    'No title, no header, no watermark and no caption anywhere on the image:',
    'the panels start right at the top edge.',
    '',
    'Each panel is a rounded phone frame. Inside each frame sits the ATTACHED PHOTO for that panel —',
    'use the attachments in order, attachment N goes into panel N. Graphics and captions are drawn OVER the photo,',
    'never replacing it.',
    '',
    // Формулировка снята дословно со второй выгрузки курса AI Cube (lessons/02/notes.md:369-372).
    // У нас записано как ограничение инструмента: «генератор не сохраняет реальный объект».
    // Здесь видно, что ограничение частично снимается СЛОВАМИ, а не сменой модели: нужен явный
    // запрет перерисовывать человека в иллюстрацию и явный запрет выдумывать интерфейсы.
    'CRITICAL: the attached photos show the REAL speaker and the REAL room. Keep the face',
    'photorealistic and recognizable, never redraw the person as an illustration, never change',
    'the face, the clothes or the interior. Where an attachment is a REAL screenshot, embed it as',
    'a slightly tilted floating panel with an accent border, keep it recognizable and readable,',
    'do not invent fake interfaces and do not rewrite the text inside it.',
    '',
    rows,
    '',
    // Английские подписи типа «SPLIT-SCREEN L/R» и таймкоды под панелями с борда УБРАНЫ.
    // Прогон 02.08.2026: в стиле «терминал-про» они утекли прямо в кадр видео и висели
    // там как часть картинки — зелёный моноширинный текст неотличим от самого стиля,
    // и строка-предохранитель в промпте монтажа его не спасла. В газете и обсидиане
    // не утекло, то есть протечка зависит от стиля, а не от заклинания. Тип шота и
    // таймкод человеку печатает консоль; на борде им делать нечего.
    'No English labels, no shot-type names, no timecodes and no panel numbers anywhere on the sheet.',
    'Small motion badges inside panels where relevant (SLOW PUSH IN, ZOOM OUT), accent arrows between panels',
    'showing the reading order left to right, top to bottom.',
    '',
    `Style: ${preset.type}. Russian captions must be spelled correctly, no invented words.`,
    'No quotation marks, no guillemets, no apostrophes anywhere. Check every letter.',
  ].join('\n');
}

/**
 * Трёхчастный промпт монтажа — структура, без которой video-модель не монтирует,
 * а просто «оживляет» кадр. Вводная и финал идут дословно (проверены методом),
 * посекундная часть собирается по панелям.
 *
 * @param {Array<{t:number, shot:string, words:string, motion:string}>} panels
 * @returns {string}
 */
export function montagePrompt(panels, opts = {}) {
  const { style = null } = opts;

  const intro = 'Edit this video following the attached storyboard reference exactly. '
    + 'Smooth elegant transitions throughout, no hard cuts, everything morphs fluidly. '
    + 'Something is ALWAYS moving inside every segment - nothing ever freezes or holds static, '
    + 'and the very first second is already full of motion.';

  // Тайминги СЛОВАМИ, а не числами. Числовой таймкод «At 6.44s» Omni печатает прямо
  // в кадр как текст (спалено автором метода 11.07.2026, воспроизведено у нас 02.08.2026).
  // Свою нарезку мы всё равно делаем по words.json — числа нужны нам, не модели.
  const beats = panels
    .map((p, i) => `${beatWord(i, panels.length)} - ${p.motion}${p.words ? `, caption "${p.words}"` : ''}.`)
    .join('\n');

  const outro = 'All transitions smooth and fluid. Camera drifts slow and gentle on first and last moment. '
    + 'All text animates in with overshot - never static. Premium cinematic motion.';

  // Три предохранителя. Без них Omni утаскивает в кадр служебное с борда, рисует два
  // заголовка разом и переозвучивает речь под надпись. Гейт preflight() их наличие проверяет.
  const guards = [
    'Output ONE full-screen composition always: never show storyboard panels, numbers, grids or labels.',
    'Only ONE headline on screen at a time: it fully disappears before the next appears, never overlapping.',
    'Keep my original audio exactly as it is: do NOT re-voice, re-time or shorten the speech.',
  ].join('\n');

  return [intro, style ? `\nSTYLE: ${style}` : '', '', beats, '', outro, '', guards]
    .filter((x) => x !== '')
    .join('\n');
}

/**
 * Порядковое слово вместо числового таймкода: модель понимает последовательность,
 * а числа в кадр не попадают.
 */
function beatWord(i, total) {
  if (i === 0) return 'At the very start';
  if (i === total - 1) return 'In the final moment';
  return ['Next', 'Then', 'After that', 'Then', 'Right after'][(i - 1) % 5];
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(2).padStart(5, '0');
  return `${m}:${s}`;
}
