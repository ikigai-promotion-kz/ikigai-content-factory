/**
 * prepare-part.mjs — подготовка одного куска генеративного монтажа. Бесплатно.
 *
 * Вынесено из `scripts/storyboard-live.mjs` 14.08.2026, когда появился сквозной
 * раннер (`reels/generative-run.mjs`): двум вызывающим нужна ОДНА раскладка панелей,
 * а копия неминуемо разъехалась бы — ровно так уже разошлись движок и комплект.
 * Здесь только подготовка; ни одного платного вызова.
 *
 * Все правила ниже оплачены прогонами, не выведены из общих соображений.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { segmentByPhrase } from './segment.mjs';
import { grabPanelFrames, montagePrompt, storyboardPrompt } from './storyboard.mjs';
import { montageParams, preflight } from './montage.mjs';
import { runBin } from './bin.mjs';
import { STYLES, styleLine, keepSpeakerLine } from './styles.mjs';

/**
 * Обойма типов планов, из которой берутся первые N по числу панелей. Набор намеренно
 * разный: правило словаря «два одинаковых плана подряд не ставим».
 *
 * `role` — драматургия по-русски, её читает человек в консоли.
 * `object` — то, что уходит в АНГЛИЙСКИЙ промпт борда: предмет, а не абстракция.
 *
 * ВАЖНО про `object`: здесь он ДЕЖУРНЫЙ. Эти предметы одинаковы для любой фразы и
 * любого стиля, поэтому кадр получается заполненным, но не осмысленным — «две карточки
 * с иконками» одинаково подходят к разговору о деньгах и о дизайнерах, то есть не
 * подходят ни к чему. Замечено владельцем на витрине 14.08.2026: «обрамление не
 * дополняет сказанное, а просто заполняет видео». Настоящий предмет приходит снаружи
 * параметром `objects` — его придумывает Claude под смысл конкретной фразы, потому что
 * ни константа не знает фразы, ни модель не знает контекста. Дежурный остаётся
 * страховкой на случай, когда предметы не заданы.
 * До 04.08.2026 в промпт уезжало русское `role` («вводит доказательство») — модель не
 * умеет превратить это в картинку и рисовала наугад. Это и был главный разрыв с ручным
 * качеством: у автора на этом месте стоит предмет («клочок газеты со словом ОБНОВЛЕНИЕ»).
 *
 * `FULLSCREEN CONTENT NO SPEAKER` из обоймы УБРАН 04.08.2026: Omni читает его как
 * разрешение убрать человека — и убирает не в одной панели, а до конца ролика
 * (прогон Алии 03.08, 30,5 кредита в мусор). Кульминацию держит `QUOTE-CARD`: титр
 * такой же крупный, но спикер остаётся в кадре.
 *
 * Текст внутри предмета НЕ заказываем. Спалено 04.08.2026: `object` панели-кульминации
 * просил «the caption set big across it», модель нарисовала карточку и залила её
 * псевдорусским («Вне папо мной, чтищвить, забоке сче») — видео-модель кириллицу не
 * печатает. Правило: в панели ровно ОДИН текстовый блок — сам титр; предметы несут
 * форму, иконку или знак, но не буквы.
 * Про текст на предметах здесь НЕ пишем: это решает стиль (`textAsObject`), и правило
 * печатается одной строкой в обоих промптах.
 */
export const SHOTS = [
  { shot: 'FULLSCREEN SPEAKER PUSH IN', motion: 'slow push in on the speaker', role: 'открывает кусок',
    object: 'a single accent card with a simple icon floating just behind his shoulder' },
  { shot: 'CONTENT WITH CIRCLE', motion: 'speaker shrinks into a circle, content slides in from the right', role: 'вводит доказательство',
    object: 'two flat icon cards sliding in from the right behind him' },
  // «letters animate in» отсюда убрано 04.08.2026: борд выходил чистым, а в видео Omni
  // читал это как разрешение писать буквы и заполнял карточку псевдорусским.
  { shot: 'QUOTE-CARD', motion: 'a quote card with one big quotation mark slides in beside the speaker', role: 'кульминация фразы',
    object: 'a large card beside him carrying one big quotation mark' },
  { shot: 'SPLIT-SCREEN L/R', motion: 'frame splits vertically, both halves drift slowly', role: 'сравнение',
    object: 'two facing cards on the right half behind him, one with a cross and one with a tick' },
  { shot: 'ZOOM-OUT REVEAL', motion: 'camera pulls back revealing the whole scene', role: 'раскрытие масштаба',
    object: 'a wide grid of small icon cards spreading out on the wall behind him' },
  { shot: 'FULLSCREEN SPEAKER PUSH IN WARM', motion: 'warm slow push in, light softens', role: 'закрывает кусок',
    object: 'one closing card beside him with a thin accent underline and a simple icon' },
];

/**
 * Нарезка дубля на куски под модель.
 *
 * Целимся в 8 секунд, а не в 10. Три довода, сошедшиеся 03–04.08.2026: у самой модели
 * дефолт `duration` равен восьми; на восьми речь не жмётся и добивки нет; восемь секунд
 * дешевле десяти на 6 кредитов — 20% сметы монтажа. Потолок опущен с 15 до 10:
 * пятнадцать при жёстком максимуме модели в десять означали нарезку на выброс.
 *
 * @param {Array} words - пословный транскрипт
 * @returns {Array} куски {n, start, end, duration, text, words}
 */
export function planSegments(words) {
  return segmentByPhrase(words, { target: 8, min: 4, max: 10 });
}

const MIN_WORDS_PER_PANEL = 2;
const CAPTION_MAX_CHARS = 24;

/**
 * Подготовить кусок: вырезать видео, разложить панели, собрать оба промпта, прогнать гейт.
 *
 * @param {Object} o
 * @param {string} o.src - исходный дубль
 * @param {Array} o.segments - выход planSegments()
 * @param {number} o.segNo - номер куска
 * @param {string} o.styleKey - ключ из styles.mjs
 * @param {boolean} [o.keepBackground] - ручной рычаг «оставить комнату» для режимов B/C
 * @param {string} o.outDir - куда класть кусок, кадры и промпты
 * @param {string[]} [o.objects] - предметы панелей ПОД СМЫСЛ фраз, по одному на панель.
 *   Пусто — берутся дежурные из SHOTS (см. комментарий к массиву).
 * @returns {Promise<Object>} всё нужное для платных вызовов и для печати человеку
 */
export async function preparePart({ src, segments, segNo, styleKey, keepBackground = false, outDir, objects = [] }) {
  const style = STYLES[styleKey];
  if (!style) throw new Error(`нет стиля «${styleKey}»`);
  const seg = segments.find((s) => s.n === segNo);
  if (!seg) throw new Error(`куска ${segNo} нет`);

  // Стили режима A (кинетик, тёплый бренд, 3D-моушн) реальность НЕ заменяют: покадровый
  // разбор десяти демо автора 03.08.2026 показал, что спикер остаётся в своей комнате,
  // а мир стиля живёт на панелях-кульминациях.
  const keepBg = keepBackground || style.mode === 'A';

  await mkdir(outDir, { recursive: true });
  const cut = path.join(outDir, `segment-${seg.n}.mp4`);
  await runBin('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(seg.start),
    '-t', String(seg.duration), '-i', src, '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', cut]);

  // Панели раскладываются по СЛОВАМ, а не по равным долям времени.
  //
  // Так было до 02.08.2026: время делилось на шесть, и в подпись попадало то, что
  // случайно оказалось в окне — предлог «в», обрывок «очень». Модель на это отвечает
  // пересинтезом речи под надпись, и мы это воспроизвели — 45 кредитов в мусор.
  // Панелей столько, на сколько хватает слов: минимум два слова на подпись.
  const panelCount = Math.max(3, Math.min(SHOTS.length, Math.floor(seg.words.length / MIN_WORDS_PER_PANEL)));
  const panels = splitWords(seg.words, panelCount).map((group, i) => ({
    ...SHOTS[i],
    t: Math.round(Math.max(0, group[0].s - seg.start) * 100) / 100,
    // Длину подписи считаем в ЗНАКАХ, а не в словах: порог переноса у модели ~24–26,
    // а четыре слова — это от 20 до 35 знаков (замер Алии, восемь подписей).
    words: capChars(group.map((w) => w.w), CAPTION_MAX_CHARS),
    // Предмет под смысл фразы, если его придумали. Дежурный из SHOTS — запасной вариант:
    // он одинаков для любого текста, и именно поэтому кадр «просто заполняется», а не
    // дополняет сказанное (замечание владельца по витрине 14.08.2026).
    object: (objects[i] || '').trim() || SHOTS[i].object,
  }));

  const frames = await grabPanelFrames(cut, panels, outDir);

  const boardPrompt = [
    storyboardPrompt({
      part: seg.n, total: segments.length, panels,
      preset: { palette: style.formula, type: style.name },
      textAsObject: style.textAsObject === true,
    }),
    '',
    keepBg ? '' : keepSpeakerLine(styleKey),
  ].filter(Boolean).join('\n');

  const prompt = montagePrompt(panels, {
    style: styleLine(styleKey) + (keepBg ? '' : ` ${keepSpeakerLine(styleKey)}`),
    textAsObject: style.textAsObject === true,
  });

  // Борд — ОДНА картинка-коллаж, собранная на реальных кадрах. Именно она уходит в
  // монтаж вместе с куском видео: у автора метода так, и это доказано девятью роликами.
  const board = path.join(outDir, `board-part-${seg.n}.png`);

  const params = montageParams({
    videoMediaId: cut,
    frameMediaIds: [board],
    prompt,
    duration: seg.duration,
  });

  // Ожидание берётся из ЗАМЫСЛА, а не из собранных параметров: медиа ровно два (кусок
  // и борд), слот равен длине куска. Иначе обрезанные значения сравниваются сами с собой.
  const WANT_MEDIAS = 2;
  const gate = preflight(params, { prompt, refs: WANT_MEDIAS, duration: Math.round(seg.duration) });

  const boardFile = path.join(outDir, `board-prompt-${seg.n}.txt`);
  const promptFile = path.join(outDir, `montage-prompt-${seg.n}.txt`);
  await writeFile(boardFile, boardPrompt, 'utf8');
  await writeFile(promptFile, prompt, 'utf8');

  return { seg, style, keepBg, cut, panels, frames, board, boardPrompt, prompt, params, gate, boardFile, promptFile };
}

/** Подпись до limit знаков: набираем слова целиком, пока влезают. */
function capChars(list, limit) {
  const out = [];
  for (const w of list) {
    const next = out.length ? `${out.join(' ')} ${w}` : w;
    if (next.length > limit && out.length) break;
    out.push(w);
  }
  return out.join(' ');
}

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
