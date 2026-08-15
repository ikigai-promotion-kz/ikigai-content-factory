/**
 * montage.mjs — монтаж куска через Higgsfield.
 *
 * Отличие от исходного метода AI Cube: у автора монтаж шёл в Google Flow через
 * браузер — два «чипа» (борд + видео), Chrome CDP, слетающий режим Ingredients,
 * баны аккаунтов и переписывание порядка файлов вручную. Половина его инструкции —
 * обход этих граблей.
 *
 * Схема у нас та же, что у него, но без браузера: `gemini_omni` принимает ровно один
 * video_references и до пяти image_references, поэтому в монтаж уходит кусок видео плюс
 * ОДНА картинка-борд, собранная на реальных кадрах. Борд обязателен — 02.08.2026
 * проверили обратное (кадры россыпью в seedance_2_0, без борда) и получили стёртое
 * лицо и титры кракозяброй за 45 кредитов.
 *
 * Здесь до 02.08.2026 было записано ровно наоборот: «картинка-сториборд не нужна,
 * раскадровка живёт текстом, до 12 медиа». Это относилось к отвергнутой схеме
 * на seedance_2_0 и осталось висеть после смены модели.
 *
 * Модуль готовит параметры и промпт, сам вызов делает агент — у него есть оба пути,
 * коннектор и командная строка. Тащить сюда HTTP-клиент ради одного запроса лишнее.
 */

import { videoModel } from '../../lib/models.mjs';

/**
 * Параметры вызова generate_video для одного куска.
 *
 * @param {Object} args
 * @param {string} args.videoMediaId - media_id загруженного куска
 * @param {string[]} args.frameMediaIds - media_id реальных кадров куска
 * @param {string} args.prompt - трёхчастный промпт (storyboard.mjs → montagePrompt)
 * @param {number} args.duration - длительность куска, сек
 * @param {string} [args.intent='seedance']
 * @returns {Object} params для mcp__claude_ai_higgsfield__generate_video
 */
export function montageParams({ videoMediaId, frameMediaIds = [], prompt, duration, intent = 'omni' }) {
  const cfg = videoModel(intent);
  const [min, max] = cfg.duration || [4, 15];
  const dur = Math.max(min, Math.min(max, Math.round(duration)));

  // Кадров не больше, чем модель принимает изображениями.
  const maxImages = cfg.refs?.image ?? 9;
  const frames = frameMediaIds.slice(0, maxImages);

  return {
    model: cfg.model,
    aspect_ratio: '9:16',
    duration: dur,
    resolution: '720p',
    mode: 'std',
    // Звук модели не нужен: оригинальную дорожку возвращаем сами в assemble.mjs —
    // так липсинк остаётся живым, а речь не переписывается моделью.
    generate_audio: false,
    medias: [
      { role: 'video_references', value: videoMediaId },
      ...frames.map((id) => ({ role: 'image_references', value: id })),
    ],
    prompt,
  };
}

/**
 * Служебное, которое модель печатает прямо в кадр как текст.
 *
 * Дыра, найденная 02.08.2026 разбором пака автора метода: здесь ловился только
 * формат «12:34», а наш же montagePrompt() печатал «At 6.44s» — регулярка его не
 * видела. То есть движок сам генерировал запрещённое и сам это пропускал, а Omni
 * печатал таймкод текстом в кадр. Добавлены секундные таймкоды и hex без решётки.
 *
 * Вынесено из preflight() 03.08.2026: те же запреты обязан проверять валидатор
 * записи стиля (`reels/lib/style-new.mjs`) — формула и фон уходят в те же промпты,
 * и второй список регулярок разошёлся бы с этим на первой же правке.
 */
export const LEAK_PATTERNS = [
  /#[0-9a-f]{6}\b/i,
  /\b[0-9a-f]{6}\b(?=\s*(?:hex|цвет))/i,
  /\b\d{1,2}:\d{2}\b/,
  /\bat\s+\d+([.,]\d+)?\s*s\b/i,
  /\b\d+[.,]\d+\s*s\b/i,
  /\.(mp4|png|jpg|jsonl?)\b/i,
];

/**
 * Кредит-дисциплина: сначала один кусок, проверка глазами, потом остальные.
 * Возвращает порядок обработки — первый кусок отдельно, хвост пачкой.
 * @param {Array} segments
 */
export function creditPlan(segments) {
  if (!segments.length) return { probe: null, rest: [] };
  return { probe: segments[0], rest: segments.slice(1) };
}

/**
 * Гейт перед платным вызовом. Сверка идёт по СОБРАННЫМ параметрам, а не «на глаз».
 *
 * Формулировка взята из курса AI Cube (вторая выгрузка, `lessons/03/notes.md:439-442`),
 * где агент проговаривает сверку вслух перед каждой тратой: промпт вставлен целиком,
 * текст не поехал, правило звука на месте, ровно столько референсов и в том порядке,
 * конфиг тот. Там это стоило автору отдельных денег на каждой ошибке.
 *
 * Ключевое — длину промпта сравниваем числом. Обрезанный промпт выглядит правдоподобно
 * и тратит кредиты полностью: модель отработает по огрызку и вернёт «нормальный» клип,
 * в котором нет половины задания.
 *
 * @param {Object} params - выход montageParams
 * @param {Object} expect
 * @param {string} expect.prompt - промпт, который СОБИРАЛИ (сверяем длину с отправляемым)
 * @param {number} [expect.refs] - сколько референсов должно уйти
 * @param {number} [expect.duration] - какой слот заказывали
 * @returns {{ok:boolean, problems:string[], summary:string}}
 */
export function preflight(params, expect = {}) {
  const problems = [];

  const sent = String(params.prompt || '');
  const want = String(expect.prompt ?? sent);
  if (!sent.trim()) problems.push('промпт пустой');
  else if (sent.length !== want.length) {
    problems.push(`промпт уехал: отправляем ${sent.length} знаков вместо ${want.length} — вставлен не целиком`);
  }

  // Служебные строки, которые модель печатает прямо в кадр как текст (см. LEAK_PATTERNS).
  const leaked = LEAK_PATTERNS.filter((re) => re.test(sent));
  if (leaked.length) {
    problems.push('в промпте остались цветовой код, таймкод или имя файла — движок напечатает их в кадре');
  }

  // Три строки-предохранителя от протечки сториборда в кадр. Автор метода спалил это
  // 29.07.2026: Omni утаскивает с борда номера панелей и английские подписи типа
  // «FULLSCREEN SPEAKER» прямо в видео и держит их по 1,5–2,5 секунды, а соседние
  // заголовки рисует одновременно и коверкает верхний. Лечится только текстом промпта.
  const GUARDS = [
    { re: /never show storyboard panels/i, what: 'запрет показывать панели/номера/сетку борда' },
    { re: /only one headline on screen/i, what: 'запрет двух заголовков одновременно' },
    { re: /do not re-voice/i, what: 'запрет переозвучивать и укорачивать речь' },
    // Четвёртая, 16.08.2026: требование воспроизвести подпись дословно. До неё правило
    // стояло только в промпте борда, и монтаж был волен переписать титр по-своему —
    // так вышло «у дизайтеров?» в мем-ролике при чистом борде.
    { re: /letter for letter/i, what: 'запрет перевирать титр — дословное воспроизведение' },
    // Пятая, 16.08.2026: набор титра одной гарнитурой. Дефект живёт не в словах, а в
    // отдельных литерах («з⊦аказывал»), и от дословности не лечится — модель считает,
    // что слово написала верно, а испортила его на уровне набора.
    { re: /single consistent typeface/i, what: 'запрет разнобойных и двоящихся литер в титре' },
  ];
  for (const g of GUARDS) {
    if (!g.re.test(sent)) problems.push(`в промпте нет строки-предохранителя: ${g.what}`);
  }

  if (params.generate_audio !== false) {
    problems.push('generate_audio не выключен — модель перепишет речь, а дорожку мы возвращаем сами');
  }

  const refs = (params.medias || []).length;
  if (expect.refs != null && refs !== expect.refs) {
    problems.push(`референсов ${refs}, а должно быть ${expect.refs}`);
  }
  if (refs && params.medias[0].role !== 'video_references') {
    problems.push('первым референсом идёт не кусок видео — порядок референсов часть задания');
  }

  if (expect.duration != null && params.duration !== expect.duration) {
    problems.push(`слот ${params.duration} сек вместо ${expect.duration} — модель обрежет или дотянет сцену`);
  }
  if (params.duration > 10) {
    problems.push(`слот ${params.duration} сек: длиннее восьми-десяти секунд часть обрезается`);
  }

  const summary = `${params.model} · ${params.duration}s · ${params.aspect_ratio} · `
    + `референсов ${refs} · звук модели ${params.generate_audio === false ? 'выключен' : 'ВКЛЮЧЁН'} · `
    + `промпт ${sent.length} знаков`;

  return { ok: problems.length === 0, problems, summary };
}
