/**
 * styles.mjs — стилевые пресеты генеративного монтажа.
 *
 * Это НЕ наши CSS-темы оформления (`reels/montage/overlay.mjs`, 18 наборов, стоят ноль).
 * Здесь — формулы для ГЕНЕРАТИВНОЙ ветки: что уходит словами в промпт борда и в промпт
 * Omni, когда мы пересобираем живой дубль в новом мире. Два слоя не конкурируют:
 * тема рисует плашки поверх снятого, пресет меняет сам кадр.
 *
 * Источник — рабочий скилл автора метода (пак от 30.07.2026,
 * `AI-Cube-Denis-Final-Avgust-2026/01-мои-скиллы/рилс-автомонтаж-омни/SKILL.md`),
 * сверено с его же девятью демо-роликами покадрово 02.08.2026.
 *
 * ЖЁСТКОЕ ПРАВИЛО: в промпт уходит `formula` и `background` — СЛОВАМИ. Поле `palette`
 * держим для наших плашек и приёмки; hex в промпт не вставлять никогда — модель
 * печатает их текстом прямо в кадр.
 *
 * Поле `theme` — наш бесплатный оверлей-эквивалент, если он есть. Где стоит null,
 * стиль существует только генерацией.
 *
 * ── Расширение 03.08.2026 (покадровый разбор десяти демо, `plans/video-style-factory/`) ──
 *
 * `mode` — что стиль делает с реальностью кадра. Это главное отличие, найденное
 * разбором, и оно меняет промпт сильнее палитры:
 *   A — реальность сохранена, стиль живёт в декоре и на панелях. Среду за спикером
 *       НЕ трогаем: у автора в кинетике спикер сидит в своей кухне, а чёрный войд
 *       существует только на полноэкранной панели-кульминации.
 *   B — фон заменён, мир минимален (стекло, обсидиан, гранж).
 *   C — агрессивный мир, спикер встроен в него элементом (HUD, терминал, мем-стикер).
 *
 * `tier` — во что обходится: тема (0) · тема плюс картинка-фон (центы) · генерация
 * (~37 кредитов за кусок). `axes` — маршрут по осям дизайна плюс видео-оси; вместе с
 * `mood`/`whenToUse` кормит retrieval (`styleProfile()` → `lib/corpus.js`).
 * `signature` — фирменный приём: каркас ролика у всех стилей общий, различает именно он.
 * `proof: null` означает «стиль заявлен, не доказан» — в клиентскую работу не брать.
 */

export const STYLES = {
  kinetik: {
    name: 'Кинетик',
    theme: 'kinetik',
    palette: ['#000000', '#F5A623'],
    formula: 'pure jet black background, orange accents, bold condensed sans, kinetic typography with overshoot',
    background: 'plain jet black void',
    note: 'Дефолт автора примерно семь роликов из десяти. Два раза подряд не ставить.',
    mode: 'A',
    tier: 'theme',
    axes: {
      napravlenie: 'нео-брутализм / кинетический плакат',
      medium: 'чистая типографика',
      faktura: 'плоская, дот-грид и лучи-спарки',
      kompoziciya: 'центр, крупный текст во весь кадр',
      tipografika: 'брутальный жирный condensed капс',
      cvet: 'монохром плюс один горячий оранжевый',
      nastroenie: 'динамика, напор, срочность',
      motion: 'резкие вайпы, overshoot-панчи на входе текста (back), лучи разлетаются',
      cutRhythm: 'частый, смена фазы каждые 1.2–1.5 сек, жёсткие каты',
      sound: 'whoosh на вайпах, impact-bass на панчах; музыка ритмичная электронная',
      shots: ['FULLSCREEN SPEAKER PUSH IN', 'FULLSCREEN CONTENT NO SPEAKER', 'CONTENT WITH CIRCLE'],
    },
    mood: 'динамичный, резкий, энергичный, напористый, техничный, молодой',
    whenToUse: 'быстрые технические разборы и анонсы, где нужен напор; дефолт, когда стиль не заказан',
    signature: 'панель-кульминация: чёрный войд, оранжевая звезда-спарк и лучи из-за текста',
    panelType: 'bold condensed uppercase, white plus orange second line',
    textAsObject: false,
    light: null,
    proof: {
      date: '2026-08-14',
      evidence: 'projects/AI-agenty/Video-fabrika/vitrina-stiley-0814/kinetik/part-1-final.mp4',
      verdict: 'принят',
      note: 'титры чистые, комната сохранена как задумано (режим A); титр местами ложится на грудь, хотя промпт это запрещает',
    },
    risk: 'приелся: у автора это семь роликов из десяти, узнаётся как чужой почерк. Два раза подряд не ставить',
  },
  'neon-tech': {
    name: 'Неон-тех',
    theme: 'neon-tech',
    palette: ['#0A0F1E', '#38E1FF'],
    formula: 'deep navy background, neon cyan glow accents, HUD frames, terminal aesthetics',
    background: 'dark server room with glowing cyan HUD panels',
    // Кадры демки дают целый монтажный HUD-мир: таймлайны, фильмстрипы, REC-рамка.
    extra: 'Any thumbnails inside the HUD are abstract colour blocks: never render faces or recognizable frames inside timeline strips.',
    mode: 'C',
    tier: 'generative',
    axes: {
      napravlenie: 'киберпанк-HUD / dark-UI',
      medium: '3D-рендер плюс интерфейсная графика',
      faktura: 'стекло-глоу, сканлайны, свечение кромок',
      kompoziciya: 'модульная сетка панелей, спикер в круге-врезке',
      tipografika: 'узкий техно-капс в свечении',
      cvet: 'тёмно-синяя база, циан-глоу, магента вторым',
      nastroenie: 'техно, будущее, контроль, экспертность',
      motion: 'панели HUD собираются по частям (ease-out), лёгкий глитч на стыке',
      cutRhythm: 'средний, смена панели 1.5–2 сек, переходы-морфы',
      sound: 'click и ping интерфейса, лёгкий riser; музыка синтетическая пульсирующая',
      shots: ['CONTENT WITH CIRCLE', 'TERMINAL INSERT', 'SPLIT-SCREEN L/R'],
    },
    mood: 'технологичный, футуристичный, точный, профессиональный, холодный',
    whenToUse: 'разборы инструментов, интерфейсов и автоматизаций; аудитория разработчиков и технических специалистов',
    signature: 'полный интерфейс монтажной программы вокруг спикера: таймлайны, волны, REC-рамка',
    panelType: 'narrow techno caps inside a glowing HUD plate',
    textAsObject: false,
    light: 'cold cyan edge light from the surrounding panels falls on the speaker',
    proof: {
      date: '2026-08-14',
      evidence: 'projects/AI-agenty/Video-fabrika/vitrina-stiley-0814/neon-tech/part-1-final.mp4',
      verdict: 'принят',
      note: 'дата-центр и HUD держатся, титры дословны; «код» на панелях — абракадабра, но это текстура',
    },
    risk: 'миниатюры внутри HUD модель заполняет чужими лицами; мелкие подписи интерфейса выходят абракадаброй',
  },
  'minimal-lux': {
    name: 'Минимал-люкс',
    theme: 'minimal-lux',
    palette: ['#FAFAF8', '#E0362C'],
    formula: 'clean white background, huge black serif-ish type, single red accent, generous whitespace, luxury minimal',
    background: 'bright empty gallery wall',
    mode: 'B',
    tier: 'generative',
    axes: {
      napravlenie: 'швейцарская типографика / галерейный минимал',
      medium: 'чистая типографика',
      faktura: 'матовая, почти без фактуры',
      kompoziciya: 'негативное пространство доминантой, текст крупным блоком',
      tipografika: 'дисплейный гротеск большого кегля',
      cvet: 'белое с чёрным, один алый акцент',
      nastroenie: 'спокойная уверенность, дорого, тихо',
      motion: 'мягкие фейды и медленный дрейф камеры, без панчей',
      cutRhythm: 'редкий, длинные планы по 2.5–3 сек',
      sound: 'тишина и мягкий chime на акценте; музыка минималистичная фортепианная',
      shots: ['FULLSCREEN SPEAKER', 'FULLSCREEN CONTENT NO SPEAKER', 'QUOTE-CARD'],
    },
    mood: 'тихий, дорогой, уверенный, чистый, галерейный, взрослый',
    whenToUse: 'премиальные услуги и заявления-манифесты, где важна пауза и вес каждого слова',
    signature: 'огромное пустое поле и одна алая деталь на весь кадр',
    panelType: 'huge black display type, single red word',
    textAsObject: false,
    light: 'even soft gallery light, no visible source',
    proof: {
      date: '2026-08-14',
      evidence: 'projects/AI-agenty/Video-fabrika/vitrina-stiley-0814/minimal-lux/part-1-final.mp4',
      verdict: 'принят',
      note: 'белая галерея, красный акцент, серифный титр чистый; фильтр пропустил только со смягчённой формулой спикера',
    },
    risk: 'на светлом фоне без фактуры слабее держит стоп-скролл; белая футболка спикера сливается с фоном',
  },
  editorial: {
    name: 'Editorial-бумага',
    theme: 'editorial',
    palette: ['#F7F2E8', '#BE4A24'],
    formula: 'warm cream paper texture, terracotta accents, elegant serif display type, editorial magazine look',
    background: 'warm cream paper wall with soft shadow',
    mode: 'B',
    tier: 'generative',
    axes: {
      napravlenie: 'крафт-editorial',
      medium: 'типографика на фотофактуре бумаги',
      faktura: 'бумажное зерно, мягкая тень',
      kompoziciya: 'колоночная сетка, много воздуха',
      tipografika: 'серифный редакторский дисплей',
      cvet: 'кремовая база, терракота акцентом, уголь текстом',
      nastroenie: 'человечность, доверие, редакционная серьёзность',
      motion: 'страницы и карточки въезжают мягко (ease-out), без отскоков',
      cutRhythm: 'спокойный, 2–2.5 сек на фазу',
      sound: 'шелест страницы, мягкий pop; музыка тёплая акустическая',
      shots: ['FULLSCREEN SPEAKER', 'QUOTE-CARD', 'TOP-SPLIT'],
    },
    mood: 'тёплый, вдумчивый, человечный, редакционный, доверительный',
    whenToUse: 'спокойные разборы и личные истории, лонгриды в видео-формате',
    signature: 'кремовая бумага с мягкой тенью и терракотовым подчёркиванием одного слова',
    panelType: 'elegant serif display with a terracotta rule under one word',
    textAsObject: false,
    light: 'warm diffused daylight, soft shadow on paper',
    proof: {
      date: '2026-08-14',
      evidence: 'projects/AI-agenty/Video-fabrika/vitrina-stiley-0814/editorial/part-1-final.mp4',
      verdict: 'принят',
      note: 'кремовая бумага и терракота, кружок-врезка, титры чистые',
    },
    risk: 'спокойный ритм проигрывает в ленте агрессивным стилям на первых секундах',
  },
  telegram: {
    name: 'Телеграм-синий',
    theme: 'telegram',
    palette: ['#0E1621', '#2AABEE'],
    formula: 'dark telegram-style UI, bright blue accents, chat bubble mockups',
    background: 'dark chat interface with floating message bubbles',
    mode: 'C',
    tier: 'generative',
    axes: {
      napravlenie: 'dark-UI / мессенджер',
      medium: 'интерфейсная графика',
      faktura: 'плоская с мягким свечением',
      kompoziciya: 'вертикальный поток пузырей, спикер снизу',
      tipografika: 'гуманистический гротеск интерфейса',
      cvet: 'тёмно-синяя база, телеграм-голубой акцентом',
      nastroenie: 'разговор, близость, актуальность',
      motion: 'пузыри всплывают по очереди снизу вверх (ease-out)',
      cutRhythm: 'средний, по одному пузырю на реплику',
      sound: 'notification и pop на каждом пузыре; музыка лёгкая',
      shots: ['PHONE MOCKUP', 'CONTENT WITH CIRCLE', 'FULLSCREEN SPEAKER'],
    },
    mood: 'разговорный, живой, актуальный, свойский',
    whenToUse: 'ответы на вопросы из личных сообщений, разбор переписок, анонсы канала',
    signature: 'мокап переписки, где реплики всплывают в такт речи',
    panelType: 'interface sans inside chat bubbles',
    textAsObject: false,
    light: 'cool screen glow from below on the speaker',
    proof: {
      date: '2026-08-14',
      evidence: 'projects/AI-agenty/Video-fabrika/vitrina-stiley-0814/telegram/part-1-final.mp4',
      verdict: 'принят с оговорками',
      note: 'главный титр чистый, но пузыри чата — псевдорусский, а в этом стиле они читаются как содержательные',
    },
    risk: 'текст внутри пузырей модель пишет с ошибками — настоящую переписку ставить вёрсткой (takeover.screen.kind phone)',
  },
  'gazeta-collage': {
    name: 'Коллаж-газета',
    theme: 'gazeta-collage',
    palette: ['#E8DEC8', '#D2302C'],
    formula: 'aged newspaper collage, halftone black and white cutouts, red rubber stamps and marker strokes, torn paper edges',
    background: 'a wall of aged newsprint pages',
    // Длинные русские слова из разнобойных букв Omni превращает в кашу. Заголовки
    // просить одним шрифтом крупными чистыми литерами.
    extra: 'Headlines as big clean cut-out block letters, one typeface, perfectly readable. Never ransom-note mismatched letters.',
    mode: 'B',
    tier: 'generative',
    axes: {
      napravlenie: 'типо-коллаж / панк-вырезка',
      medium: 'коллаж и фотомонтаж',
      faktura: 'газетное зерно, халфтон, рваная бумага',
      kompoziciya: 'коллаж-хаос с крупным заголовком',
      tipografika: 'брутальный жирный вырезанный капс',
      cvet: 'газетная бумага, чёрный набор, красный штамп',
      nastroenie: 'сенсация, срочность, документальность',
      motion: 'штампы шлёпаются с отскоком (back), вырезки въезжают рывками',
      cutRhythm: 'частый, рваный, как перелистывание',
      sound: 'штамп-удар, шелест бумаги; музыка ритмичная с лёгким винтажом',
      shots: ['FULLSCREEN CONTENT NO SPEAKER', 'FULLSCREEN SPEAKER PUSH IN', 'QUOTE-CARD'],
    },
    mood: 'громкий, сенсационный, документальный, дерзкий, ретро-газетный',
    whenToUse: 'разоблачения и заявления «так делать нельзя», новости индустрии, провокационные хуки',
    signature: 'заголовок как вырезанная из газеты полоса под красным штампом',
    panelType: 'big clean cut-out block letters, one typeface',
    textAsObject: true,
    light: 'flat daylight, no dramatic shadows',
    proof: {
      date: '2026-08-14',
      evidence: 'projects/AI-agenty/Video-fabrika/vitrina-stiley-0814/gazeta-collage/part-1-final.mp4',
      verdict: 'принят',
      note: 'вырезки, штампы, титр наборными буквами; слова на предметах чистые',
    },
    risk: 'подписи на обрывках модель обрезает краем бумаги; стена постеров перерисовывается между кусками — континьюити не держится',
  },
  premium: {
    name: 'Кинетик-премиум',
    theme: 'premium',
    palette: ['#0B0B0C', '#C9A227', '#F2E8D5'],
    formula: 'obsidian black, champagne gold and cream, refined serif display, luxury cinematic, film grain, shallow depth of field',
    background: 'dark luxury interior with warm golden rim light',
    // Компонент, потерянный при первом переносе: у автора пресет прямо включает
    // фотореалистичные b-roll врезки студии монтажа — именно они, а не палитра,
    // делают стиль «дорогим» (кадр premium-2.0: мониторы и клавиатура без единой надписи).
    extra: 'Include photoreal b-roll inserts of an editing suite: monitors, keyboard, warm desk light, shallow depth of field, no text anywhere in those shots.',
    mode: 'C',
    tier: 'generative',
    axes: {
      napravlenie: 'dark-luxury / кинематограф',
      medium: 'фото и кино-рендер',
      faktura: 'плёночное зерно, глянец золота, боке',
      kompoziciya: 'кино-кадр с малой ГРИП, спикер врезкой',
      tipografika: 'серифный дисплей с золотом',
      cvet: 'обсидиан, шампань-золото, крем',
      nastroenie: 'люкс, статус, спокойная сила',
      motion: 'медленный дрейф камеры по сцене, мягкое проявление текста',
      cutRhythm: 'редкий, кино-планы по 2.5–3 сек',
      sound: 'кинематографический whoosh, глубокий бас; музыка оркестровая сдержанная',
      shots: ['ZOOM-OUT REVEAL', 'FULLSCREEN SPEAKER PUSH IN WARM', 'CONTENT WITH CIRCLE'],
    },
    mood: 'премиальный, статусный, кинематографичный, дорогой, сдержанный',
    whenToUse: 'дорогие услуги, кейсы с крупными клиентами, имиджевые ролики',
    signature: 'фотореалистичные b-roll врезки студии монтажа без единой надписи',
    panelType: 'refined serif display, gold on obsidian',
    // 16.08.2026: снято с true. На витрине 14.08 титр выходил ДВАЖДЫ одновременно —
    // в карточке-цитате и внизу кадра, — а надписи на карточках были кашей. Разрешение
    // писать на предметах и панель QUOTE-CARD вместе давали модели два места под один
    // текст. С false в кадре остаётся ровно один текстовый блок, а «дорогое» этому стилю
    // делают b-roll врезки студии монтажа, где надписей нет по самой формуле.
    textAsObject: false,
    light: 'warm golden rim light wraps the speaker from behind',
    proof: {
      date: '2026-08-16',
      evidence: 'projects/AI-agenty/Video-fabrika/vitrina-0816/premium/part-1-final.mp4',
      verdict: 'принят',
      note: 'двойной титр 14.08 снят: в кадре ровно один текстовый блок внизу, карточка-цитата '
        + 'несёт только кавычки, предметы золотые и пустые. Мрамор, золото, малая ГРИП на месте',
    },
    risk: 'гравировка тёмным по золоту почти нечитаема на мелких плашках — текст просить светлым с сильной фаской',
  },
  meme: {
    name: 'Стикер-мем',
    theme: 'meme',
    palette: ['#1E9BE8', '#FF2D9B', '#FFE500'],
    formula: 'loud sticker-meme, electric blue halftone, die-cut stickers with thick white borders, cartoon emoji stickers, marker doodles, chunky rounded font',
    background: 'bright blue comic halftone burst',
    // Литеральные эмодзи срывают генерацию — только словами.
    // Второй приём взят с кадра meme-3.4: реальное видео обрамлено как наклейка.
    extra: 'Describe every emoji in words (a robot sticker, a fire sticker). Never place literal emoji characters. Frame the real video itself as a die-cut sticker with a thick white border and tape corners.',
    mode: 'C',
    tier: 'generative',
    axes: {
      napravlenie: 'поп-арт комикс / KidCore',
      medium: 'флэт-вектор и стикер-графика',
      faktura: 'халфтон-растр, толстые белые канты, дудлы',
      kompoziciya: 'коллаж-хаос из наклеек вокруг центра',
      tipografika: 'пузырный chunky rounded с обводкой',
      cvet: 'электрик-блю база, кислотные розовый и жёлтый',
      nastroenie: 'веселье, дерзость, молодость',
      motion: 'стикеры отскакивают при появлении (bounce), дудлы дорисовываются',
      cutRhythm: 'очень частый, до секунды на элемент',
      sound: 'pop и sparkle на каждом стикере; музыка задорная поп-электроника',
      shots: ['FULLSCREEN CONTENT NO SPEAKER', 'CONTENT WITH CIRCLE', 'MATCH-CUT'],
    },
    mood: 'весёлый, дерзкий, молодёжный, шумный, ироничный',
    whenToUse: 'мем-регистр, лёгкие темы, аудитория до тридцати, разбор смешных провалов',
    signature: 'сам кадр со спикером обрамлён как die-cut наклейка со скотчем по углам',
    panelType: 'chunky rounded bubble letters with thick outline',
    textAsObject: true,
    light: 'flat bright light, no shadows',
    proof: {
      date: '2026-08-16',
      evidence: 'projects/AI-agenty/Video-fabrika/proverka-0816/meme/final-meme.mp4',
      verdict: 'принят',
      note: 'два куска подряд, 17 кадров приёмки: все титры дословны (включая «у дизайнеров?», '
        + 'которое 15.08 вышло как «дизайтеров»), свитер и цвет волос держатся через стык. '
        + 'Слова на стикерах чистые: СЧЕТ, РАСХОД, АРХИВ, СУММА',
    },
    risk: 'литеральные эмодзи срывают генерацию борда; кислотная палитра неуместна в премиальных темах. '
      + 'На шоте SPLIT-SCREEN модель заливает свободную половину газетой с английской абракадаброй и '
      + 'отодвигает спикера за край кадра — для этого стиля газета чужеродна',
  },
  'warm-brand': {
    name: 'Claude / тёплый бренд',
    theme: 'warm-brand',
    palette: ['#F0EEE6', '#D97757', '#2B2A28'],
    formula: 'cream paper, coral accent, charcoal text, soft rounded UI, a coral twelve-point sparkle motif, chat interface mockup',
    background: 'warm cream paper wall',
    mode: 'A',
    tier: 'theme',
    axes: {
      napravlenie: 'крафт-editorial с мягким UI',
      medium: 'типографика на бумажной фактуре',
      faktura: 'мятая бумага, мягкие тени',
      kompoziciya: 'центр с воздухом, контурные иконки по краям',
      tipografika: 'серифный дисплей с брашевым подчёркиванием',
      cvet: 'кремовая бумага, коралл, уголь',
      nastroenie: 'человечность, тепло, спокойная экспертность',
      motion: 'панели выезжают мягко (ease-out), спарк-звёздочка проявляется',
      cutRhythm: 'спокойный, 2–2.5 сек на фазу',
      sound: 'мягкий chime и sparkle; музыка тёплая ненавязчивая',
      shots: ['FULLSCREEN SPEAKER', 'CONTENT WITH CIRCLE', 'PHONE MOCKUP'],
    },
    mood: 'тёплый, человечный, спокойный, дружелюбный, бренд-нативный',
    whenToUse: 'наши собственные анонсы и разборы в фирменной палитре, разговор с аудиторией от первого лица',
    signature: 'коралловая двенадцатилучевая звёздочка и брашевое подчёркивание одного слова',
    panelType: 'serif display with a coral brush underline',
    textAsObject: false,
    light: null,
    proof: {
      date: '2026-08-14',
      evidence: 'projects/AI-agenty/Video-fabrika/vitrina-stiley-0814/warm-brand/part-1-final.mp4',
      verdict: 'принят',
      note: 'коралловые карточки и sparkle, титр в пузыре чата, кириллица идеальна',
    },
    risk: 'близок к editorial: в одной серии их не смешивать, зритель не различит',
  },
  'terminal-pro': {
    name: 'Терминал-про',
    theme: 'terminal-pro',
    palette: ['#000000', '#39FF87', '#FFB020'],
    formula: 'pure black, translucent frosted glass panels, phosphor green monospace data text, amber alerts, blinking cursor, thin grid lines, premium trading-terminal look',
    background: 'a data centre with walls of monitors',
    // Декоративный латинский «код» модель всегда пишет абракадаброй. Это видно и в его
    // собственном ролике («imgert tlealire»). Смысл в него не вкладывать.
    // Номера строк модель тоже рвёт (в демке автора: 1, 2, 6, 8, 10, 10, 12…) — не просить.
    extra: 'Decorative code text is texture only: never put meaningful words or the brand name into the code block. Show the code block without line numbers.',
    mode: 'C',
    tier: 'generative',
    axes: {
      napravlenie: 'техно-нуар / трейдинг-терминал',
      medium: 'интерфейсная графика на фото-фоне',
      faktura: 'фосфорное свечение, тонкая сетка, матовое стекло',
      kompoziciya: 'окно терминала сверху, спикер снизу',
      tipografika: 'моноширинный код плюс жирный белый капс субтитра',
      cvet: 'чистый чёрный, фосфорно-зелёный, янтарные алерты',
      nastroenie: 'экспертность, контроль, инженерная точность',
      motion: 'строки печатаются посимвольно, счётчик крутится, курсор мигает',
      cutRhythm: 'средний, ритм задаёт печать строк',
      sound: 'typing и key-press, error на алерте; музыка минималистичная техно',
      shots: ['TERMINAL INSERT', 'DATA-COUNTER', 'FULLSCREEN SPEAKER'],
    },
    mood: 'технический, экспертный, серьёзный, инженерный, ночной',
    whenToUse: 'разборы кода и автоматизации, метрики и данные, аудитория разработчиков',
    signature: 'окно терминала с бегущими логами и семисегментный счётчик прогресса',
    panelType: 'phosphor green monospace plus bold white caps caption',
    textAsObject: false,
    light: 'green phosphor glow from the screens falls on the speaker',
    proof: {
      date: '2026-08-02',
      evidence: 'projects/plans/video-styles-denis/proofs/omni-terminal-v2.mp4',
      verdict: 'принят с оговорками',
    },
    risk: 'английские подписи с борда утекают в кадр — зелёный моноширинный текст неотличим от самого стиля; смысл в код-блок не вкладывать',
  },
  glass: {
    name: 'Liquid-glass',
    theme: null,
    palette: ['#FFFFFF', '#C0C6D0', '#BFD9F2'],
    formula: 'translucent frosted glass cards with real depth, soft refraction, glossy highlights, iridescent edges, white silver and pale blue, lots of air, light and premium',
    background: 'a bright studio with a soft iridescent gradient',
    // Прогон 02.08: подпись проступала на футболке ДО появления своей плашки —
    // модель печатает будущий титр как текстуру на одежде.
    extra: 'Never render caption text as a texture on clothing, skin or walls: text exists only inside its glass plate.',
    mode: 'B',
    tier: 'generative',
    axes: {
      napravlenie: 'liquid-glass / Apple-эстетика',
      medium: '3D-рендер стекла',
      faktura: 'матовое стекло, преломление, иридесцентные кромки',
      kompoziciya: 'центр с воздухом, парящие чипы',
      tipografika: 'чистый гротеск среднего веса',
      cvet: 'белый, серебро, бледно-голубой с радужным переливом',
      nastroenie: 'лёгкость, премиальность, чистота',
      motion: 'чипы всплывают и мягко масштабируются, блики скользят',
      cutRhythm: 'спокойный, 2–2.5 сек, переходы-растворения',
      sound: 'chime и sparkle, мягкий whoosh; музыка эмбиент',
      shots: ['FULLSCREEN SPEAKER', 'CONTENT WITH CIRCLE', 'DATA-COUNTER'],
    },
    mood: 'лёгкий, премиальный, чистый, воздушный, современный',
    whenToUse: 'продуктовые анонсы и интерфейсные разборы, где важна ощущаемая дороговизна без пафоса',
    signature: 'текст лежит НА стеклянной пластине с преломлением и бликом по кромке',
    panelType: 'clean sans, dark text on frosted glass plate',
    textAsObject: true,
    light: 'bright soft studio light with iridescent bounce on the speaker',
    proof: {
      date: '2026-08-02',
      evidence: 'projects/plans/video-styles-denis/proofs/omni-glass.mp4',
      verdict: 'принят',
    },
    risk: 'светлый мир сливается с белой одеждой спикера; подпись может проступить на футболке до своей плашки',
  },
  obsidian: {
    name: 'Кинематик-обсидиан',
    theme: null,
    palette: ['#0B0B0C', '#C9A227'],
    formula: 'cinematic 3D chrome and smoked glass objects with depth and reflections, dramatic rim light, warm gold accents on black, lens bloom, film grain',
    background: 'a dark cinematic void with volumetric light beams',
    // Гравировка тёмным по золоту нечитаема (видно и в демке автора, и в нашем прогоне).
    extra: 'Gold lettering must stay bright against the dark void with a strong bevel: never engrave dark text into a gold plate.',
    mode: 'B',
    tier: 'generative',
    axes: {
      napravlenie: 'dark-luxury / кинематограф',
      medium: '3D-рендер хрома и стекла',
      faktura: 'хром, дымчатое стекло, зерно, частицы пыли',
      kompoziciya: 'центральный объект в пустоте, лучи сверху',
      tipografika: 'объёмные золотые литеры с фаской',
      cvet: 'чёрный войд, тёплое золото',
      nastroenie: 'тайна, статус, драма',
      motion: 'лучи дышат, частицы плывут, объекты медленно вращаются',
      cutRhythm: 'редкий, кино-планы',
      sound: 'глубокий impact-bass, riser; музыка кинематографическая',
      shots: ['ZOOM-OUT REVEAL', 'FULLSCREEN CONTENT NO SPEAKER', 'CONTENT WITH CIRCLE'],
    },
    mood: 'драматичный, дорогой, таинственный, кинематографичный, тёмный',
    whenToUse: 'крупные заявления и имиджевые ролики, кейсы уровня «мы сделали невозможное»',
    signature: 'волюметрические лучи и золотые литеры-слитки, парящие в чёрной пустоте',
    panelType: 'volumetric gold letters with bevel, floating in the void',
    textAsObject: true,
    light: 'volumetric top beams plus warm gold rim light on the speaker',
    proof: {
      date: '2026-08-02',
      evidence: 'projects/plans/video-styles-denis/proofs/omni-obsidian-fixed.mp4',
      verdict: 'принят',
    },
    risk: 'модель задваивает речь на этом стиле (проверено) — звук возвращать обязательно; золото по тёмному съедает мелкий текст',
  },
  grunge: {
    name: 'Гранж-постер',
    theme: 'grunge',
    palette: ['#EFEAE0', '#111111', '#E01B12'],
    formula: 'heavy grain, torn paper edges, tape strips, scratches, halftone xerox, marker scrawl, off-white paper and ink black with one hot red accent, huge condensed stamped type, raw and loud',
    background: 'a concrete wall covered in torn posters',
    // Кадры демки: обрывок бумаги режет слова («ЗА ПАРУ М», «ПРОФЕССИОНАЛЬНЫ»).
    extra: 'Every caption strip must be wider than the text it carries: never crop letters at the torn edge. Keep the same set of wall posters across all segments.',
    mode: 'B',
    tier: 'generative',
    axes: {
      napravlenie: 'панк / уличный постер',
      medium: 'коллаж на фотофактуре',
      faktura: 'крупное зерно, рваная бумага, скотч, ксерокс-халфтон',
      kompoziciya: 'слоистый коллаж, крупный штампованный заголовок',
      tipografika: 'огромный condensed штампованный капс',
      cvet: 'бумажно-белый, чернильно-чёрный, один горячий красный',
      nastroenie: 'бунт, сырость, подлинность',
      motion: 'штампы шлёпаются, бумага рвётся рывком, лёгкий джиттер',
      cutRhythm: 'частый и рваный',
      sound: 'штамп-удар, скрежет, glitch; музыка гаражная гитарная',
      shots: ['FULLSCREEN SPEAKER PUSH IN', 'FULLSCREEN CONTENT NO SPEAKER', 'MATCH-CUT'],
    },
    mood: 'сырой, громкий, бунтарский, уличный, честный',
    whenToUse: 'резкие мнения против индустрии, анти-глянец, темы «хватит врать»',
    signature: 'подпись на обрывке бумаги под скотчем на бетонной стене с постерами',
    panelType: 'huge condensed stamped caps on torn paper',
    textAsObject: true,
    light: 'flat outdoor daylight',
    proof: {
      date: '2026-08-14',
      evidence: 'projects/AI-agenty/Video-fabrika/vitrina-stiley-0814/grunge/part-1-final.mp4',
      verdict: 'принят',
      note: 'стена постеров, скотч, halftone-переход по краю лица; титр на клочке бумаги чистый',
    },
    risk: 'обрывок режет слова; стена постеров перерисовывается между кусками — континьюити мира не держится',
  },
  'd3-motion': {
    name: '3D-моушн',
    theme: 'd3-motion',
    palette: ['#3A2FD8', '#8B3FE8'],
    formula: 'indigo to violet gradient with a perspective grid, glossy 3D extruded chrome letters, electric blue edge glow, floating 3D glass cards, parallax depth',
    background: 'an indigo perspective grid receding into violet haze',
    // Длинное слово в перспективе уходит за кадр и теряет последние литеры.
    extra: 'Keep extruded headlines to one or two short words, fully inside the frame: long words in perspective lose their last letters.',
    mode: 'A',
    tier: 'scene',
    axes: {
      napravlenie: 'ретро-футуризм / синтвейв',
      medium: '3D-рендер',
      faktura: 'глянец, хром, свечение кромок',
      kompoziciya: 'перспективная сетка с объектами на переднем плане',
      tipografika: 'экструдированный 3D-хром',
      cvet: 'индиго в фиолетовый, электрик-синий акцентом',
      nastroenie: 'тех-шоу, размах, зрелищность',
      motion: 'буквы наезжают в перспективе с параллаксом, объекты вращаются',
      cutRhythm: 'средний, с эффектными въездами',
      sound: 'synth-whoosh, riser; музыка синтвейв',
      shots: ['FULLSCREEN CONTENT NO SPEAKER', 'CONTENT WITH CIRCLE', 'ZOOM-OUT REVEAL'],
    },
    mood: 'зрелищный, технологичный, яркий, шоу, размашистый',
    whenToUse: 'анонсы событий и запусков, где нужен размах и эффект «вау»',
    signature: 'хром-буквы, вылетающие по перспективной сетке',
    panelType: 'glossy 3D extruded chrome letters',
    textAsObject: true,
    light: null,
    proof: {
      date: '2026-08-14',
      evidence: 'projects/AI-agenty/Video-fabrika/vitrina-stiley-0814/d3-motion/part-1-final.mp4',
      verdict: 'принят',
      note: 'хром и глянец, объёмный титр чистый; комната сохранена (режим A)',
    },
    risk: 'объёмные буквы вёрсткой не собрать — панель требует картинки-фона; при частом использовании выглядит шаблонно',
  },
  'sticker-painted': {
    name: 'Стикер-рисованный',
    theme: null,
    palette: ['#F2E7D5', '#1F6F6B', '#D97757'],
    formula: 'hand-painted die-cut stickers with thick white cut-out borders, soft gouache and airbrush shading, real volume, glossy edge highlight, soft shadow, corners peeling, semi-realistic painted art, not flat clipart and not cartoon emoji',
    background: 'a cream wall covered in hand-painted stickers',
    // Автор развёл этот стиль и мем специально: по слову «стикер» модель уходит
    // в мультяшные эмодзи.
    extra: 'Semi-realistic painted artwork with real volume: never flat clipart, never cartoon emoji faces.',
    mode: 'B',
    tier: 'generative',
    axes: {
      napravlenie: 'иллюстративный крафт / наивная живопись',
      medium: 'цифровая живопись гуашью',
      faktura: 'гуашь и аэрограф, глянцевый блик по кромке',
      kompoziciya: 'коллаж наклеек вокруг центра',
      tipografika: 'рукописные надписи на стикер-лентах',
      cvet: 'кремовая база, глубокий бирюзовый, коралл, горчица',
      nastroenie: 'тепло, рукотворность, доброжелательность',
      motion: 'наклейки прилипают с лёгким отскоком, углы подрагивают',
      cutRhythm: 'средний, по одной наклейке на мысль',
      sound: 'мягкий pop, шелест; музыка тёплая акустическая',
      shots: ['CONTENT WITH CIRCLE', 'FULLSCREEN CONTENT NO SPEAKER', 'TOP-SPLIT'],
    },
    mood: 'тёплый, рукотворный, добрый, иллюстративный, ламповый',
    whenToUse: 'объяснения для широкой аудитории, детские и образовательные темы, антипод AI-глянца',
    signature: 'каждый элемент — рисованная наклейка с подогнутым уголком и мягкой тенью',
    panelType: 'hand-lettered caption on a painted sticker ribbon',
    // 16.08.2026: снято с true. Единственный БРАК витрины 14.08 был здесь — на стикерах
    // вместо кириллицы выходила латиница (BAHNER, TEXT, VIDEO). Причина в самой фактуре:
    // рукописная и рисованная надпись у модели деградирует сильнее печатной, а этот стиль
    // просит именно рукописную. Печатные фактуры (газета, гранж, мем) слово держат, и им
    // флаг оставлен. Смысловую нагрузку тут несёт сам рисунок наклейки, не подпись на ней.
    textAsObject: false,
    light: 'soft even light with gentle drop shadows',
    proof: {
      date: '2026-08-16',
      evidence: 'projects/AI-agenty/Video-fabrika/vitrina-0816/sticker-painted/part-1-final.mp4',
      verdict: 'принят',
      note: 'брак 14.08 снят: латиницы нет, все подписи чистой кириллицей, «карусель» больше не '
        + 'ярмарочная — на панели стопка фотокарточек. Лечилось снятием textAsObject, а не промптом',
    },
    risk: 'по слову «стикер» модель сваливается в мультяшные эмодзи — держать формулировку про полуреалистичную живопись. '
      + 'Спикер уезжает в мелкий кружок среди наклеек, и на переходах два титра успевают пересечься',
  },
  notebook: {
    name: 'Рукописный блокнот',
    theme: null,
    palette: ['#FDFBF5', '#1B3A8C', '#4A4A4A'],
    formula: 'real handwriting in blue ballpoint and fineliner, uneven, with ink bleed, light pencil sketches with airy watercolour washes, hand-drawn frames and arrows, margin notes, visible paper grain, no digital fonts and no vector shapes',
    background: 'a desk by a window with an open notebook',
    // Рукописную кириллицу модель коверкает сильнее печатной — держим подписи короткими.
    extra: 'Handwritten Russian captions stay short, two or three words, written large and clearly: cursive Cyrillic degrades faster than print.',
    mode: 'B',
    tier: 'generative',
    axes: {
      napravlenie: 'скетчбук / аналоговый скрапбук',
      medium: 'линейная графика и акварель',
      faktura: 'бумажное зерно, растекание чернил',
      kompoziciya: 'разворот блокнота с пометками на полях',
      tipografika: 'рукописный почерк шариковой ручкой',
      cvet: 'тёплый белый, синие чернила, графит, охра',
      nastroenie: 'размышление, личное, черновик мысли',
      motion: 'линии дорисовываются на глазах, стрелки прочерчиваются',
      cutRhythm: 'спокойный, в темпе письма',
      sound: 'скрип ручки, шелест страницы; музыка тихая фортепианная',
      shots: ['TOP-SPLIT', 'FULLSCREEN CONTENT NO SPEAKER', 'QUOTE-CARD'],
    },
    mood: 'личный, вдумчивый, черновой, честный, тихий',
    whenToUse: 'разбор хода мысли, «как я к этому пришёл», планы и схемы от руки',
    signature: 'настоящий почерк с растеканием чернил и пометками на полях',
    panelType: 'real handwriting in blue ballpoint, no digital fonts',
    textAsObject: true,
    light: 'soft window daylight falling on paper',
    proof: {
      date: '2026-08-14',
      evidence: 'projects/AI-agenty/Video-fabrika/vitrina-stiley-0814/notebook/part-1-final.mp4',
      verdict: 'принят с оговорками',
      note: 'акварель и рукописный титр чистые; карточка в кадре даёт псевдорусский. Фильтр не пропускал вообще, пока в формуле стояло «ink bleed»',
    },
    risk: 'рукописную кириллицу модель коверкает сильнее печатной — подписи держать короткими',
  },
  // ── Стили, собранные генератором 03.08.2026 (первые не с чужого завода) ──
  // Заводились по рецепту `reels/knowledge/style-recipes.md` через
  // `node scripts/style-new.mjs`: по одному на каждый ценовой слой.

  'ma-minimal': {
    name: 'Японский минимал (ма)',
    theme: 'ma-minimal',
    palette: ['#F7F5F0', '#2B3A67', '#1A1A1A'],
    formula: 'washi rice-paper white, deep indigo accent, thin light sans and a hairline vertical rule, vast empty space with one small element off-centre, asymmetric balance, subtle paper grain, quiet and contemplative',
    background: 'a bare washi paper wall with one soft shadow',
    mode: 'A',
    tier: 'theme',
    axes: {
      napravlenie: 'японский минимализм, ваби-саби, ма',
      medium: 'чистая типографика на бумажной фактуре',
      faktura: 'рисовая бумага, едва заметное зерно',
      kompoziciya: 'негативное пространство доминантой, элемент смещён от центра, вертикальная линейка',
      tipografika: 'тонкий светлый гротеск малого кегля, широкий трекинг',
      cvet: 'белая бумага, глубокий индиго единственным акцентом, тушь текстом',
      nastroenie: 'тишина, созерцание, спокойная уверенность, воздух',
      motion: 'медленное проявление без сдвига (ease-out), линейка прочерчивается сверху вниз',
      cutRhythm: 'редкий, длинные планы по три секунды, паузы между фразами держатся',
      sound: 'тишина как приём, одиночный chime на смене мысли; музыка минималистичная, много воздуха',
      shots: ['FULLSCREEN SPEAKER', 'QUOTE-CARD', 'FULLSCREEN CONTENT NO SPEAKER'],
    },
    mood: 'тихий, созерцательный, сдержанный, дорогой без пафоса, взрослый, минималистичный, спокойный, медитативный',
    whenToUse: 'спокойные размышления и манифесты, темы про фокус и отказ от лишнего, премиальные услуги без крика, аудитория, уставшая от шума',
    // Сигнатура переписана по итогу прогона 03.08: вертикальной линейки вдоль края
    // шаблон оверлея не умеет, а обещать в записи то, чего в кадре нет, нельзя.
    // Реально стиль держат нулевые скругления, линейка под заголовком и воздух финала.
    signature: 'нулевые скругления, тонкая линейка индиго под заголовком и полноэкранный финал, где текста меньше, чем пустоты',
    panelType: 'thin light sans, small caps, wide tracking, one indigo hairline',
    textAsObject: false,
    light: null,
    proof: {
      date: '2026-08-03',
      evidence: 'carousel-engine/tmp/style-proofs/ma-minimal/proof-ma-minimal.mp4',
      verdict: 'принят',
    },
    risk: 'тихий стиль проигрывает в ленте на первых секундах: хук обязан держаться словом, а не картинкой. Вертикальной линейки вдоль края шаблон не даёт — если она нужна, это правка overlay-template.html, а не стиля',
  },
  blueprint: {
    name: 'Блюпринт-чертёж',
    theme: 'blueprint',
    palette: ['#0E3A5F', '#E8F1F8', '#4FC3F7'],
    formula: 'cyanotype blueprint, deep prussian blue paper with a fine white grid, white technical line drawings and exploded views, dimension arrows and callout leaders, monospaced annotations, drafting compass marks, faint paper fibre texture',
    background: 'a large blueprint sheet pinned to a drafting table',
    extra: 'Annotations are short and monospaced; leave the drawing schematic and never fill it with solid colour. Any numbers on dimension lines stay abstract tick marks, never real digits.',
    mode: 'A',
    tier: 'scene',
    axes: {
      napravlenie: 'техно-блюпринт, инженерный чертёж',
      medium: 'линейная графика, нативный вектор',
      faktura: 'чертёжная бумага, тонкая сетка, волокно',
      kompoziciya: 'модульная сетка с выносками и размерными линиями',
      tipografika: 'моноширинные подписи, узкий технический капс в заголовке',
      cvet: 'прусская синька база, белые линии, циан акцентом',
      nastroenie: 'инженерная точность, устройство вещей, доказательность',
      motion: 'линии прочерчиваются по контуру, выноски выезжают к деталям, детали разлетаются на взрыв-схему',
      cutRhythm: 'средний, узел за узлом, по одной выноске на мысль',
      sound: 'скрип грифеля, тонкий click на выноске; музыка сдержанная электронная',
      shots: ['TOP-SPLIT', 'FULLSCREEN CONTENT NO SPEAKER', 'SPLIT-SCREEN L/R'],
    },
    mood: 'инженерный, объясняющий, точный, доказательный, устройство изнутри, схемный',
    whenToUse: 'разбор устройства системы и процессов по шагам, «как это работает внутри», архитектура и планы, техническая аудитория',
    // Сигнатура переписана по итогу прогона 03.08: картинка-фон статична, «дочерчивание
    // во время речи» ею не даётся — это была бы анимация, то есть генерация или Remotion.
    // Реально стиль держат чертёжный лист под полноэкранными кадрами и живой терминал.
    signature: 'чертёжный лист под полноэкранными кадрами и терминал с настоящим текстом поверх него',
    panelType: 'narrow technical caps in white on blueprint blue, monospaced annotations',
    textAsObject: true,
    light: null,
    proof: {
      date: '2026-08-03',
      evidence: 'carousel-engine/tmp/style-proofs/blueprint/proof-blueprint.mp4',
      verdict: 'принят',
    },
    risk: 'модель заполняет чертёж выдуманными цифрами и подписями-абракадаброй: числа на размерных линиях просить абстрактными засечками, настоящие данные ставить вёрсткой. Тяжёлая картинка-фон замедляет рендер оверлея вчетверо (8 кадр/сек против 30)',
  },
  'arhiv-plenka': {
    name: 'Архивная плёнка 16 мм',
    theme: null,
    palette: ['#2A2018', '#D9B26A', '#E8DCC8'],
    formula: 'vintage sixteen millimetre film footage, heavy grain and dust, vertical scratches and hair in the gate, warm faded amber and sepia cast, halation around highlights, soft vignette, gentle gate weave and flicker, projector light haze, countdown leader marks',
    background: 'a dim room lit only by a film projector beam with dust floating in it',
    // Прогон 03.08: «captions printed on the film» модель понимает буквально и
    // перерисовывает подписи своим шрифтом — три русских титра из пяти поехали
    // («для контенти», «фабрьвкк отбочким»). Титры этому стилю ставит ОВЕРЛЕЙ.
    extra: 'The date stamp is burnt into the film emulsion in the lower corner, glowing warm amber. Keep any leader numerals large and simple. Do NOT draw any words or captions in the frame: all text is added afterwards as a separate layer.',
    mode: 'B',
    tier: 'generative',
    axes: {
      napravlenie: 'аналоговая кинохроника, found footage',
      medium: 'фото и киноплёнка',
      faktura: 'плёночное зерно, царапины, пыль, ореолы вокруг светов',
      kompoziciya: 'центральный кадр с виньеткой, ракорды и засветки по краям',
      tipografika: 'штампованный шрифт ракорда, дата-штамп в углу',
      cvet: 'выцветший тёплый: сепия, янтарь, кремовый',
      nastroenie: 'память, ностальгия, документальность, вес прожитого',
      motion: 'лёгкое дыхание кадра в грейфере, мерцание экспозиции, пылинки в луче',
      cutRhythm: 'средний, с засветкой на склейке вместо жёсткого ката',
      sound: 'стрёкот проектора, шипение оптической дорожки; музыка старая, будто с пластинки',
      shots: ['FULLSCREEN SPEAKER PUSH IN', 'QUOTE-CARD', 'ZOOM-OUT REVEAL'],
    },
    mood: 'ностальгический, тёплый, документальный, весомый, личный, архивный, с историей',
    whenToUse: 'истории про путь и опыт, «было — стало», годовые итоги, наследие бренда, разговор о том, что не устаревает',
    // Сигнатура уточнена прогоном: пылинки в луче есть, но первым в глаза бьёт
    // ракорд с обратным отсчётом — модель рисует его сама и очень убедительно.
    signature: 'ракорд с обратным отсчётом в начале куска, бобины проектора и перфорация плёнки по краям кадра',
    // Единственный текст, который модель тут рисует, — цифры ракорда. Слова ставит оверлей.
    panelType: 'large simple leader numerals only, no words anywhere in frame',
    textAsObject: false,
    light: 'warm projector beam from behind the camera falls on the speaker, haze and dust in the light',
    proof: {
      date: '2026-08-03',
      evidence: 'projects/plans/video-styles-denis/proofs/omni-plenka.mp4',
      verdict: 'принят с оговорками',
    },
    risk: 'ГЛАВНОЕ: русские титры от модели коверкаются (три из пяти на прогоне) — текст ставить только оверлеем, модель просить рисовать мир без единого слова. Ракорд съедает первую секунду, то есть хук: ставить стиль на второй кусок, а не на первый. Звук модель меняет даже при выключенной генерации звука — возврат дорожки обязателен',
  },

  chalk: {
    name: 'Мел на доске',
    theme: null,
    palette: ['#20262A', '#FFFFFF', '#F2C14E'],
    formula: 'white chalk handwriting with chalk grain and dust and smudges, coloured chalk drawings in yellow coral mint sky-blue and pink, loose cross-hatched strokes, chalk frames and arrows, no digital fonts and no glow',
    background: 'a slate wall in warm light',
    // Мел мелким кеглем осыпается в нечитаемое; свечение этому стилю противопоказано.
    extra: 'Chalk captions are written large and thick, never small: thin chalk strokes read as smudges. No glow anywhere.',
    mode: 'B',
    tier: 'generative',
    axes: {
      napravlenie: 'учебная доска / школьная графика',
      medium: 'рисунок мелом',
      faktura: 'меловое зерно, пыль, смазы',
      kompoziciya: 'доска с рамками и стрелками, схема по центру',
      tipografika: 'рукописный мел, неровный',
      cvet: 'грифельный тёмный, белый мел, цветные акценты',
      nastroenie: 'обучение, объяснение, доступность',
      motion: 'штрихи прорисовываются, пыль осыпается',
      cutRhythm: 'спокойный, в темпе объяснения',
      sound: 'скрип мела, хлопок тряпки; музыка лёгкая ненавязчивая',
      shots: ['TOP-SPLIT', 'FULLSCREEN CONTENT NO SPEAKER', 'SPLIT-SCREEN L/R'],
    },
    mood: 'учебный, объясняющий, доступный, дружелюбный, аналоговый',
    whenToUse: 'пошаговые объяснения и схемы, обучающие ролики, разбор формул и процессов',
    signature: 'схема, которую дорисовывают мелом прямо во время речи',
    panelType: 'uneven white chalk handwriting with dust',
    textAsObject: true,
    light: 'warm room light across the slate surface',
    proof: {
      date: '2026-08-16',
      evidence: 'projects/AI-agenty/Video-fabrika/vitrina-0816/chalk/part-1-final.mp4',
      verdict: 'принят',
      note: '«ДРАРЬ-КЕРЛА» не повторилось: подписи мелом чистые, предметы нарисованы мелом под смысл фразы',
    },
    risk: 'меловая кириллица разборчива только крупным кеглем; свечения в этом стиле быть не должно',
  },
};

/** Ключи всех пресетов — для батч-прогона «один дубль во все стили». */
export const STYLE_KEYS = Object.keys(STYLES);

/**
 * Формула стиля одной строкой для промпта. Без hex и без имён файлов.
 * @param {string} key
 * @returns {string}
 */
export function styleLine(key) {
  const s = STYLES[key];
  if (!s) throw new Error(`нет стиля «${key}». Есть: ${STYLE_KEYS.join(', ')}`);
  return [s.formula, s.extra].filter(Boolean).join(' ');
}

/**
 * Профиль стиля текстом — для retrieval и для показа человеку.
 *
 * Формат повторяет карточку статического STYLE TOKEN (`reference/_STYLES/STYLES.md`),
 * потому что ранжирует их один и тот же механизм (`lib/corpus.js` → rank). Урок оттуда:
 * скорить надо по ВСЕМУ профилю, а не по паре полей — сравнение токенов буквальное,
 * без стемминга, и на русской морфологии двух полей мало.
 *
 * Второго источника истины не заводим: профиль собирается из этой же записи в рантайме.
 *
 * @param {string} key
 * @returns {string} markdown-профиль одной секцией
 */
export function styleProfile(key) {
  const s = STYLES[key];
  if (!s) throw new Error(`нет стиля «${key}». Есть: ${STYLE_KEYS.join(', ')}`);
  const a = s.axes || {};
  const tierWord = { theme: 'тема, ноль кредитов', scene: 'тема плюс картинка-фон, центы', generative: 'генерация, около 37 кредитов за кусок' };
  const modeWord = { A: 'A — реальность сохранена, стиль в декоре', B: 'B — фон заменён, мир минимален', C: 'C — агрессивный мир, спикер встроен элементом' };

  return [
    `## ${s.name} (${key})`,
    `- **Настроение:** ${s.mood || '—'}`,
    `- **Когда брать:** ${s.whenToUse || '—'}`,
    `- **Режим:** ${modeWord[s.mode] || s.mode || '—'} · **Цена:** ${tierWord[s.tier] || s.tier || '—'}`,
    `- **Ключевой приём:** ${s.signature || '—'}`,
    `- **Оси:** направление ${a.napravlenie || '—'} · медиум ${a.medium || '—'} · фактура ${a.faktura || '—'} · композиция ${a.kompoziciya || '—'} · типографика ${a.tipografika || '—'} · цвет ${a.cvet || '—'}`,
    `- **Движение:** ${a.motion || '—'} · **Ритм монтажа:** ${a.cutRhythm || '—'}`,
    `- **Звук:** ${a.sound || '—'}`,
    `- **Сильные шоты:** ${(a.shots || []).join(' · ') || '—'}`,
    `- **Тема оверлея:** ${s.theme ? `\`${s.theme}\` (бесплатный эквивалент есть)` : 'нет — только генерацией'}`,
    `- **Доказательство:** ${s.proof ? `прогон ${s.proof.date}, ${s.proof.verdict} — ${s.proof.evidence}` : 'НЕ ПРОГНАН — стиль заявлен, не доказан'}`,
    `- **Риск:** ${s.risk || '—'}`,
    `- **Формула:** ${s.formula}`,
  ].join('\n');
}

/**
 * Оглавление каталога: имя, режим, цена и «когда брать» одной строкой.
 * Ответ на вопрос «какие вообще есть стили», а не «какой взять под эту тему».
 * @returns {string}
 */
export function listStyles() {
  const rows = STYLE_KEYS.map((k, i) => {
    const s = STYLES[k];
    const paid = s.tier === 'theme' ? 'бесплатно' : s.tier === 'scene' ? 'центы' : 'кредиты';
    const flag = s.proof ? '✓ прогнан' : '· не прогнан';
    return `${String(i + 1).padStart(2, ' ')}. ${s.name} (${k}) — ${paid}, ${flag}\n     ${s.whenToUse || ''}`;
  });
  return [
    `# ВИДЕО-СТИЛИ — ${STYLE_KEYS.length} позиций`,
    '',
    'Один стиль на ролик, два раза подряд один и тот же не ставим.',
    '«Не прогнан» значит не проверен боем, а не «не работает».',
    '',
    ...rows,
  ].join('\n');
}

/**
 * Формула замены фона БЕЗ подмены человека.
 *
 * Слова «replace background» сами по себе заставляют модель нарисовать чужого.
 * Формулировка снята дословно с рабочего скилла автора метода — у него сработала
 * на всех двенадцати бордах батча 14.07.2026. Идёт в ОБА промпта: борда и монтажа.
 *
 * ── Внешность словами, 16.08.2026 ──
 *
 * Формула держит человека ВНУТРИ куска, но не между кусками: она ссылается на
 * «приложенные кадры», а кадры у каждого куска СВОИ. Общего якоря нет вообще, и на
 * полных роликах 15.08 это видно: в `meme` на стыке первого и второго куска тёмно-синий
 * свитер в рубчик стал серой футболкой, в `grunge` фиолетовый верх волос пропал в первом
 * куске и вернулся ядовитым в третьем.
 *
 * Единственное, что можно сделать одинаковым во всех кусках, — ТЕКСТ. Поэтому внешность
 * называется словами и приходит снаружи: это свойство ДУБЛЯ, а не стиля, — константа
 * стиля его знать не может. Живёт в файле дубля рядом с предметами (ключ `_внешность`).
 *
 * Предложение вставлено МЕЖДУ существующими и ни одну регулярку `softenForFilter()`
 * не разрывает — смягчение на втором заходе фильтра внешность сохраняет.
 *
 * @param {string} key - ключ стиля, из него берётся фон
 * @param {string} [appearance] - внешность спикера словами, одинаковая во всех кусках
 * @returns {string}
 */
export function keepSpeakerLine(key, appearance = '') {
  const s = STYLES[key];
  if (!s) throw new Error(`нет стиля «${key}»`);
  const named = String(appearance).trim();
  return 'Keep the man EXACTLY as in the attached frames: exact face, hair, beard, skin, clothes, body and pose, '
    + 'identical to the attachment. Do NOT redraw, restyle or replace him with another person, do NOT beautify. '
    + (named ? `He is ${named}, and he looks exactly the same in every segment. ` : '')
    + `The ONLY thing that changes is what is BEHIND him: cut him out from his room and place him in front of ${s.background}. `
    + 'Keep his cut-out edges natural. He stays a real photograph; only the background is new.';
}
