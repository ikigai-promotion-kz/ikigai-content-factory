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
 * Структура из метода: панели в рамках телефонов, число панелей задаётся вызывающим,
 * и тип шота, стрелки движения между панелями.
 *
 * @param {Object} args
 * @param {number} args.part - номер куска
 * @param {number} args.total - всего кусков
 * @param {Array<{t:number, shot:string, words:string, role:string}>} args.panels
 * @param {{name:string, palette:string, type:string}} args.preset - стилевой пресет
 * @returns {string}
 */
export function storyboardPrompt({ part, total, panels, preset, textAsObject = false }) {
  // Слова из транскрипта ОБЯЗАНЫ быть на борде: именно их модель потом рисует в кадре.
  // До 02.08.2026 сюда уходила только драматургическая роль, а подписи не попадали
  // на борд вообще — модель придумывала текст сама.
  // В промпт уходит ПРЕДМЕТ (`object`), а не драматургическая роль. Роль по-русски
  // («вводит доказательство») сюда попадала по недосмотру: она и русская в английском
  // тексте, и не говорит модели, что рисовать. `role` остаётся для человека в консоли.
  const rows = panels
    .map((p, i) => `panel ${i + 1} — attachment ${i + 1} as the photo inside the phone frame; ` +
      `big Russian caption drawn OVER the photo, exactly these words and nothing else: "${p.words}"; ` +
      `graphic overlay inside the panel: ${p.object || p.role}`)
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
    // Блок «спикер виден всегда» и геометрия титра. Оба взяты из ручного прогона 03.08.2026,
    // в опубликованных промптах автора их нет. Без первого Omni превращает говорящую голову
    // в b-roll (проверено дважды: без блока спикер исчез на 2/3 ролика, с блоком присутствовал
    // во всех 31 секунде). Без второго титр печатается на футболке и стекает по ней.
    // У надписей отрицания работают — в отличие от предметов, где «no new objects» душит генерацию.
    'MOST IMPORTANT RULE: the speaker is VISIBLE IN EVERY panel. No panel is objects only,',
    'no panel is graphics only, no panel is an empty background. Cards, strips and overlays always',
    'sit BEHIND him or BESIDE him, they never cover him and never take his place.',
    '',
    'Captions sit in the LOWER THIRD of their panel inside a safe margin: never over his face,',
    'never printed on his chest or t-shirt, never touching the panel edge, never cropped.',
    '',
    // Текст на предметах — по стилю, та же развилка, что и в промпте монтажа.
    textAsObject
      ? 'Objects may carry text, but only ONE short word each, set large in clean block letters:\n'
        + 'a real, correctly spelled Russian word that fits the phrase. Never a sentence, never invented words.\n'
        + 'Background newsprint, posters and pages stay SMALL and soft: texture only, never large readable type.'
      : 'No text on the objects: cards, papers, panels and screens stay blank, only icons and symbols.\n'
        + 'The panel caption is the only text inside the panel.',
    '',
    // Английские подписи типа «SPLIT-SCREEN L/R» и таймкоды под панелями с борда УБРАНЫ.
    // Прогон 02.08.2026: в стиле «терминал-про» они утекли прямо в кадр видео и висели
    // там как часть картинки — зелёный моноширинный текст неотличим от самого стиля,
    // и строка-предохранитель в промпте монтажа его не спасла. В газете и обсидиане
    // не утекло, то есть протечка зависит от стиля, а не от заклинания. Тип шота и
    // таймкод человеку печатает консоль; на борде им делать нечего.
    // Бейджи движения «SLOW PUSH IN / ZOOM OUT» с борда УБРАНЫ 03.08.2026. Строкой выше
    // мы запрещали английские подписи и тут же сами их заказывали — модель выполняла
    // второе. В газетном стиле бейдж нарисован красным штампом, неотличимым от газетного
    // декора, и Omni растиражировала его по кадру четырьмя штампами «SLOW PUSW PUSH IN».
    // Движение задаётся текстом промпта монтажа; на борде ему делать нечего.
    'No English labels, no shot-type names, no motion badges, no timecodes and no panel numbers anywhere on the sheet.',
    'Accent arrows between panels showing the reading order left to right, top to bottom.',
    '',
    `Style: ${preset.type}. Russian captions must be spelled correctly, no invented words.`,
    // Тот же набор титра, что и в промпте монтажа: правило про текст обязано стоять
    // в обоих (§10 правил Omni), иначе чистый борд не спасает — проверено дважды.
    'Each caption is set as ONE clean line in a single consistent typeface: never assembled from',
    'mismatched or double-struck letters, never a ransom-note mix, never a stray half letter inside a word.',
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
  const { style = null, textAsObject = false } = opts;

  const intro = 'Edit this video following the attached storyboard reference exactly. '
    + 'Smooth elegant transitions throughout, no hard cuts, everything morphs fluidly. '
    + 'Something is ALWAYS moving inside every segment - nothing ever freezes or holds static, '
    + 'and the very first second is already full of motion.';

  // Тайминги СЛОВАМИ, а не числами. Числовой таймкод «At 6.44s» Omni печатает прямо
  // в кадр как текст (спалено автором метода 11.07.2026, воспроизведено у нас 02.08.2026).
  // Свою нарезку мы всё равно делаем по words.json — числа нужны нам, не модели.
  // Предмет панели идёт и сюда, а не только на борд. Прогон 15.08.2026: борд был
  // осмысленный (самолётик из чат-пузыря, часы над конвертами), а в видео модель
  // вернула дежурную обвязку стиля — эмодзи и пустые карточки. Потому что монтажный
  // промпт знал только движение и подпись: борд для Omni — референс, а не приказ.
  const beats = panels
    .map((p, i) => `${beatWord(i, panels.length)} - ${p.motion}`
      + (p.object ? `, ${p.object} drifts in beside him` : '')
      + (p.words ? `, caption "${p.words}"` : '') + '.')
    .join('\n');

  // «All text animates in» заменено на «The headline animates in» 04.08.2026: общая
  // формулировка про «весь текст» подсказывала модели, что текста в кадре может быть
  // много, и она дописывала его на карточках.
  const outro = 'All transitions smooth and fluid. Camera drifts slow and gentle on first and last moment. '
    + 'The headline animates in with overshot - never static. Premium cinematic motion.';

  // Три предохранителя. Без них Omni утаскивает в кадр служебное с борда, рисует два
  // заголовка разом и переозвучивает речь под надпись. Гейт preflight() их наличие проверяет.
  // Четвёртая и пятая строки добавлены 04.08.2026 — те же два лекарства, что и в промпте
  // борда: спикер не уходит из кадра, титр не печатается на нём.
  const guards = [
    'Output ONE full-screen composition always: never show storyboard panels, numbers, grids or labels.',
    // «never merge two of them» дописано 16.08.2026: на прогоне 15.08 модель не наложила
    // два титра друг на друга, а СКЛЕИЛА соседние в один блок из двух строк
    // («Посчитай сам сколько» + «тебе это обходило.»). Запрет наложения этого не покрывал.
    'Only ONE headline on screen at a time: it fully disappears before the next appears, never overlapping.'
      + ' Never show two captions together and never merge two of them into one stacked block.',
    'Keep my original audio exactly as it is: do NOT re-voice, re-time or shorten the speech.',
    // Дословность титра, 16.08.2026. Правило жило ТОЛЬКО в промпте борда («exactly these
    // words and nothing else»), а §10 правил требует держать правило про текст в обоих
    // текстах: «чистый борд не гарантирует чистое видео». Дыру видно замером: монтажные
    // промпты grunge и meme на куске 1 были ОДИНАКОВОЙ длины (3112 знаков) с одной и той
    // же подписью, и на ней grunge напечатал «у дизайнеров?» чисто, а meme — «у дизайтеров?».
    // То есть дело не в длине промпта, а в том, что монтажу никто не запрещал переписать
    // подпись по-своему.
    'Every caption is quoted for you already written: reproduce it letter for letter,'
      + ' never re-spell it, never shorten it and never invent a word.',
    // Набор титра, 16.08.2026. Дефект не в словах, а в ОТДЕЛЬНЫХ буквах: «з⊦аказывал»
    // вместо «заказывал», «обход⊦илось» вместо «обходилось» — лишний обломок литеры
    // внутри верного слова. Плашка при этом полностью села, то есть это не кадр анимации.
    //
    // Контроль нашёлся в собственном каталоге: у `gazeta-collage` в `extra` с 04.08 стоит
    // «one typeface, perfectly readable, never ransom-note mismatched letters» — и он
    // единственный из трёх коллажных стилей печатает без обломков. У `grunge` и `meme`
    // такой строки нет, и оба дали по букве-призраку. Поэтому правило поднято из записи
    // одного стиля в общий промпт: набор титра — забота каркаса, а не каждого стиля.
    'The caption is set as ONE clean line in a single consistent typeface: never assembled from'
      + ' mismatched or double-struck letters, never a ransom-note mix, never a stray half letter'
      + ' inside a word.',
    'The speaker stays VISIBLE on screen in every second of the clip: never cut away to graphics only,'
      + ' graphics always sit behind him or beside him.',
    'Every headline sits in the lower third inside a safe margin: never over his face, never printed'
      + ' on his chest, never touching the frame edge, never cropped.',
    // Шестая строка, 04.08.2026, и она ЗАВИСИТ ОТ СТИЛЯ.
    //
    // Ломается не количество текстовых блоков, а длина и определённость. Замер на двух
    // роликах: editorial просил в карточке целую фразу — модель выдала псевдорусский
    // («Чззенито чаотуват деслежия»); газета просила ОДНО короткое слово капсом на
    // вырезке — «ВАРИАНТЫ», «РЕКЛАМА», «ВАЖНО», «ПРОБУЙТЕ» напечатаны чисто, все до одного.
    //
    // Поэтому стилям, где текст на предмете и есть приём (`textAsObject: true` —
    // газета, гранж, мем, блокнот, мел, 3D), запрет не ставится: им задаётся рамка
    // «одно короткое слово, крупно, дословно». Остальным текст на предметах запрещён.
    // Уточнено после прогона газеты 04.08.2026. Первая версия говорила «слово ИЗ СЛОВ
    // ПОДПИСИ» — и отобрала у стиля смысловые штампы: вчерашний ролик держался на
    // «ВАРИАНТЫ», «ТРЕНДЫ», «РЕКЛАМА», а с той формулировкой их не осталось вовсе.
    // Теперь слово берётся по смыслу сказанного. Вторая строка — про фон: крупные
    // газетные заголовки на заднем плане модель заполняет псевдорусским («Проодак»,
    // «Павие оредокел»), а мелкие читаются как фактура и никому не мешают.
    textAsObject
      ? 'Objects may carry text, but only ONE short word each, set large in clean block letters -'
        + ' a real, correctly spelled Russian word that fits what is being said. Never a phrase,'
        + ' never a sentence, never invented words. The headline in the lower third stays the main text.\n'
        + 'Any printed matter in the background - newspaper columns, posters, pages, headlines -'
        + ' stays SMALL, soft and out of focus: pure texture, never large readable type.'
      : 'Exactly ONE piece of text exists in the frame at any moment: the headline in the lower third.'
        + ' Cards, papers, panels, screens and every other object stay BLANK - no letters, no words,'
        + ' no handwriting, no fake text on them, only icons, symbols and empty surfaces.',
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
