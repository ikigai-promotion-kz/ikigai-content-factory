/**
 * lint.mjs — проверка задания ДО платного вызова: смысл, а не только механика.
 *
 * Гейт `preflight()` в `montage.mjs` проверяет, что промпт доехал целиком, что строки-
 * предохранители на месте и что референсов столько, сколько заказывали. Всё это про
 * механику. Он не поймал бы ни одной из наших смысловых ошибок:
 *
 *   · «a quote card with one big quotation mark» при действующем запрете кавычек
 *   · титр-огрызок «центов. и», кончающийся на союз
 *   · предмет длиной в двенадцать слов, который модель начинает иллюстрировать сам
 *
 * Здесь два разных инструмента, и они намеренно разной строгости:
 *
 *   ПРОТИВОРЕЧИЯ (жёстко, блокируют трату) — мы сами в одном тексте что-то запрещаем
 *   и тут же просим. Это всегда наша ошибка, не поведение модели, и она воспроизводима.
 *   Ловилась дважды вручную: бейджи движения 03.08 и карточка-цитата 16.08.
 *
 *   ПРЕДУПРЕЖДЕНИЯ (мягко, печатаются) — то, что подозрительно, но иногда осознанно.
 *   Жёстко блокировать нельзя: ложная тревога, которую нельзя обойти, приводит к тому,
 *   что проверку отключают целиком, и вместе с ней теряются настоящие находки.
 */

/**
 * Пары «запрет ↔ заказ». Если в одном тексте есть И запрет, И заказ того же предмета —
 * это противоречие, и модель выполнит заказ: проверено дважды на своих деньгах.
 *
 * Формулировки запретов взяты из наших же промптов дословно. Когда меняется промпт,
 * меняется и эта таблица — иначе проверка начнёт молчать, оставшись формально живой.
 */
const CONTRADICTIONS = [
  {
    what: 'кавычки',
    ban: /no quotation marks/i,
    ask: /\b(quote cards?|quotation marks?)\b/i,
    // Промпт борда запрещает кавычки, а обойма SHOTS их заказывала. Модель нарисовала
    // карточку-цитату и логично заполнила её цитатой — псевдорусским («НАЬ ВИТЬ ДУЧЬ»).
    why: 'запрещаем кавычки и тут же просим карточку-цитату с кавычкой',
  },
  {
    what: 'английские подписи',
    ban: /no english labels/i,
    // Множественное число обязательно: первая версия писала `motion badge\b` и
    // пропускала «motion badges» — ровно ту формулировку, что стояла у нас 03.08.
    ask: /\b(motion badges?|shot-type labels?|badges? (under|beside|on) each)\b/i,
    // 03.08: запрещали английские подписи и просили «Small motion badges (SLOW PUSH IN)».
    // В газетном стиле бейдж вышел красным штампом и растиражировался по кадру.
    why: 'запрещаем английские подписи и тут же просим бейджи',
  },
  {
    what: 'номера панелей',
    ban: /no panel numbers/i,
    ask: /\bnumber (each|every) panel\b|\bpanel numbers? (in|inside)\b/i,
    why: 'запрещаем номера панелей и тут же просим их проставить',
  },
  {
    what: 'таймкоды',
    ban: /no timecodes/i,
    ask: /\bat \d+([.,]\d+)?\s*s\b|\bshow the timecode\b/i,
    why: 'запрещаем таймкоды и тут же печатаем их в тексте',
  },
];

/** Предложение отрицающее, если в нём есть запрет. Такие при поиске ЗАКАЗА не считаются. */
const NEGATED = /\b(no|not|never|without)\b|\bdo not\b|\bdon't\b/i;

/**
 * Найти противоречия в готовом тексте промпта.
 *
 * Наивная проверка «есть запрет И есть слово» не работает — поймано первым же тестом:
 * сам запрет («no motion badges») содержит искомое слово и срабатывает на себя. Поэтому
 * предложения с отрицанием выбрасываются, и заказ ищется только в утвердительных.
 *
 * @param {string} prompt
 * @returns {string[]} пустой массив — чисто
 */
export function contradictions(prompt) {
  const text = String(prompt || '');
  // Режем и по строкам, и по точкам: запрет и заказ часто стоят в одной строке.
  const affirmative = text
    .split(/\n|(?<=\.)\s+/)
    .filter((s) => s.trim() && !NEGATED.test(s));

  return CONTRADICTIONS
    .filter((c) => c.ban.test(text) && affirmative.some((s) => c.ask.test(s)))
    .map((c) => `противоречие про ${c.what}: ${c.why}`);
}

/**
 * Слова, на которые титр заканчиваться не должен: подпись обрывается на полумысли.
 * Собрано по факту — «центов. и», «карусели, он» пришли из нашей же нарезки по словам.
 */
const DANGLING = new Set([
  'и', 'а', 'но', 'да', 'или', 'либо', 'то', 'что', 'как', 'же', 'бы', 'ли',
  'в', 'во', 'на', 'по', 'за', 'из', 'от', 'до', 'у', 'к', 'с', 'со', 'о', 'об',
  'для', 'при', 'про', 'над', 'под', 'без', 'через', 'он', 'она', 'оно', 'они',
]);

/** Слова, которыми предмет просить нельзя: они заказывают текст, а его несёт титр. */
const OBJECT_TEXT_WORDS = /\b(text|word|words|caption|letter|letters|title|headline|writing|inscription)\b/i;

const OBJECT_MAX_WORDS = 6;
const DIGIT_RANGE = /\d+\s*[-–—]\s*\d+/;

/**
 * Проверить панели куска: титры и предметы.
 *
 * @param {Array<{words:string, object:string, shot:string}>} panels
 * @param {Object} [seg] - кусок, нужен для проверки длительности
 * @returns {string[]} предупреждения; пустой массив — чисто
 */
export function lintPanels(panels, seg = null) {
  const out = [];

  panels.forEach((p, i) => {
    const caption = String(p.words || '').trim();
    const n = i + 1;

    if (!caption) {
      out.push(`панель ${n}: титр пустой`);
    } else {
      const last = caption.replace(/[.,!?;:]$/, '').split(/\s+/).pop().toLowerCase();
      if (DANGLING.has(last)) {
        out.push(`панель ${n}: титр «${caption}» кончается на «${last}» — обрыв на полумысли`);
      }
      if (caption.split(/\s+/).length === 1) {
        out.push(`панель ${n}: титр «${caption}» из одного слова — на экране читается как обрывок`);
      }
      if (DIGIT_RANGE.test(caption)) {
        out.push(`панель ${n}: титр «${caption}» с диапазоном цифр — модель перерисовывает их по-своему`);
      }
    }

    const obj = String(p.object || '').trim();
    if (!obj) {
      out.push(`панель ${n}: предмет не задан — уедет дежурный, одинаковый для любой фразы`);
    } else {
      if (obj.split(/\s+/).length > OBJECT_MAX_WORDS) {
        out.push(`панель ${n}: предмет из ${obj.split(/\s+/).length} слов — длинный предмет модель`
          + ' начинает иллюстрировать сам, вместо того чтобы дополнять фразу');
      }
      if (OBJECT_TEXT_WORDS.test(obj)) {
        out.push(`панель ${n}: предмет просит текст («${obj}») — текст в кадре несёт титр, не предмет`);
      }
    }
  });

  if (seg && seg.duration >= 9.9) {
    out.push(`кусок ${seg.n}: ${seg.duration.toFixed(2)} сек — упёрлись в потолок модели,`
      + ' речь внутри слота будет поджата');
  }

  return out;
}

/**
 * Всё вместе: жёсткие отказы и мягкие предупреждения.
 * @param {Object} o
 * @param {Array} o.panels
 * @param {Object} [o.seg]
 * @param {string} o.montagePrompt
 * @param {string} o.boardPrompt
 * @returns {{ok: boolean, blockers: string[], warnings: string[]}}
 */
export function lint({ panels = [], seg = null, montagePrompt = '', boardPrompt = '' }) {
  const blockers = [
    ...contradictions(montagePrompt).map((m) => `монтаж: ${m}`),
    ...contradictions(boardPrompt).map((m) => `борд: ${m}`),
  ];
  const warnings = lintPanels(panels, seg);
  return { ok: blockers.length === 0, blockers, warnings };
}
