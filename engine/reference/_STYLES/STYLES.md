# Библиотека визуальных стилей IKIGAI PROMOTION

> **37 стилей** (16 канонических + 21 из исследования «Арсенал визуала», 21.07.2026). Каждый доказан либо разбором референсов (★-оценка в `_ANALYSIS.md`), либо боевым выпуском марафона «24 стиля» с реакцией аудитории.
> Пересобрано 21.07.2026 из трёх разрозненных реестров: 14 автопрофилей `extract-styles.mjs` + 8 брифов марафона + 6 кластеров A–F.
> Прежняя версия заявляла «1143 профиля» — это была статистика прогона (1456 слайдов → 1143 сырых профиля), а в файл попадало 14 записей, из них 9 — вариации техно-неона и 3 прямых анти-паттерна. Перекос устранён.
>
> **Как пользоваться:** взять STYLE TOKEN, вставить в промпт генерации, дополнить смыслом кадра. Один стиль на серию.
> **Дисциплина акцента — главное правило:** ровно ОДИН акцентный цвет на кадр, хайлайт на ОДНОМ слове. Множественный акцент = «всё кричит» = слоп.
>
> **Фасетная система (уровень 1):** каждый стиль ниже = комбинация значений по 9 осям. Словарь осей и разложение всех 37 стилей по осям — в памятке `knowledge/axes-cheatsheet.md`.

---

## Крафт-редакторский

```text
STYLE TOKEN — "Kraft Editorial"
palette: #EDE4D3 kraft base / #1A1714 charcoal text / #D97757 terracotta accent (ONE only)
type: heavy grotesk-black display (Archivo Black / Anton), clean sans body (Inter), serif italic on ONE word
layout: hero-stopper | split | numbered-list | grid
decor: paper grid, torn-paper texture, stamps, marker underline, handwritten arrows, bookmark flag top-left
mood: warm, human, editorial, trustworthy, premium-magazine
notes: text-on-image → gpt_image_2 (Cyrillic-safe)
```

- **Настроение:** тёплое, человечное, редакционное, доверительное. Читается как разворот качественного журнала, а не как инфобиз-пост — за счёт воздуха и одного точечного акцента.
- **Палитра:** крафт/кремовый `#EDE4D3`–`#F2ECDD` (база) · уголь `#1A1714` (текст) · терракота `#D97757` (единственный акцент)
- **Типографика:** тяжёлый гротеск-блэк (Archivo Black, Anton, Inter Black) для заголовка, чистый sans (Inter, Manrope) для тела, serif-italic на одном слове + маркер-подчёркивание
- **Layout-архетипы:** hero-stopper · split · numbered-list · cover · grid. Строгая сетка, максимум воздуха
- **Декор-приёмы:** сетка-бумага, torn-paper, штампы-печати, маркер-подчёркивания, рукописные стрелки, терракотовый флажок-закладка top-left на каждом слайде, нумерация серии
- **Платформы:** IG-лента · Stories · Telegram
- **Форматы:** лонгрид · схемы · listicle · боди-слайды под тёмной обложкой
- **Модель:** gpt_image_2
- **Когда брать:** how-to и личный бренд · listicle «N инструментов под нишу» · боди после кино-обложки · когда нужна человечность и отстройка от шаблонных AI-каруселей · серьёзность без пафоса
- **Ключевой приём:** воздух + один терракотовый акцент на ОДНОМ слове = премиум-журнал вместо инфобиза
- **Доказательство:** REF-01 ★9/10, REF-03 ★9.5/10 (эталон), REF-08 ★9/10
- **Риск:** на светлом без фото слабее держит стоп-скролл; избыток рукописного декора → визуальный шум

## Швейцарская типографика

```text
STYLE TOKEN — "Swiss International Typographic"
palette: warm off-white paper base / near-black ink text / ONE signal-red accent / faint thin grid
type: bold Helvetica-style grotesque, strong scale contrast, strict modular grid
layout: grid | chart | numbered-list | cover
decor: rigid modular grid, generous whitespace, thin bars, giant numeral as an object, red counter plate
mood: strict, airy, editorial, disciplined, factual
notes: zero textures, zero shadows — pure print. gpt_image_2
```

- **Настроение:** строгий, светлый, воздушный, дисциплинированный. Ощущение дорогого печатного разворота — тишина и порядок, каждый элемент на своём месте.
- **Палитра:** тёплая бумага off-white (база) · near-black ink (текст) · ОДИН сигнальный красный (единственный акцент; альтернатива — `#E82A47`) · едва заметная тонкая сетка
- **Типографика:** жирный гротеск в духе Helvetica, кириллица, сильный масштабный контраст. Гигантская цифра как самостоятельный типографический объект
- **Layout-архетипы:** grid (базовый) · chart · numbered-list · cover · split
- **Декор-приёмы:** жёсткая модульная сетка, много воздуха, тонкие столбики-бары, красная плашка-счётчик, гигантский числовой акцент. Ноль текстур, ноль теней
- **Платформы:** IG-лента · Telegram · презентации · YouTube-обложка (текстовая)
- **Форматы:** инфографика · схемы-калькуляторы · данные и статистика
- **Модель:** gpt_image_2
- **Когда брать:** цифры, статистика, дедлайны — всё, что нужно подать как факт · редакционный и экспертный контент · B2B и корпоративная аудитория · контраст-полюс после тёмного или шумного дня · когда нужен один сигнальный акцент, чтобы взгляд упал ровно в нужную точку
- **Ключевой приём:** один сигнальный красный на весь кадр + огромный масштабный контраст; стиль задаётся референсом, а не прилагательными
- **Доказательство:** День 2 марафона, выпущен

## Веер мокапов на светлом

```text
STYLE TOKEN — "3D Mockup Showcase"
palette: light editorial cream base / colored mockups as the color source / orange highlight
type: clean bold sans (Inter), sans body, serif niche labels
layout: cover | grid | split "mockup + prompt"
decor: 3D fan of premium mockups across niches, copy-paste prompt blocks, serif niche labels
mood: showcase, generous, catalog, ready-to-use
notes: breadth of niches = breadth of reach. gpt_image_2
```

- **Настроение:** витринное, щедрое, каталожное. Набор готовых премиум-артефактов, которые можно повторить прямо сейчас.
- **Палитра:** светлый editorial-фон (крем/бон) · цветные мокапы как источник цвета · оранжевый хайлайт
- **Типографика:** чистый bold sans, serif-лейблы ниш, цветной хайлайт
- **Layout-архетипы:** cover (веер-обложка) · grid · split «мокап + промпт»
- **Декор-приёмы:** 3D-веер премиум-мокапов по 5 нишам (tech / fitness / fintech / skincare / food), copy-paste промпт-блоки под каждым
- **Платформы:** IG-лента · Telegram
- **Форматы:** prompt-pack · swipe-file · showcase возможностей
- **Модель:** gpt_image_2 · nano_banana_pro (фотореалистичные мокапы)
- **Когда брать:** раздача шаблонов и промптов как лид-магнит · showcase «что умеет фабрика» в разных нишах · когда нужен двигатель сохранений · демонстрация широты применения
- **Ключевой приём:** веер готовых артефактов + точный промпт под каждым = двигатель сохранений
- **Доказательство:** REF-02 ★9/10

## Тёмный Swiss / техно-грид

```text
STYLE TOKEN — "Dark Swiss Techno-Grid"
palette: #0A0A0F charcoal base / #B6FF3C lime + orange (EXACTLY 2 accents) / white text
type: condensed grotesque (Archivo Narrow, Oswald), mono for slash-commands (JetBrains Mono)
layout: grid (value-map) | numbered-list | split | chart
decor: value-map grid, monospace slash-commands, terminal mockup, video thumbs, $-anchor, nav dots
mood: systemic, engineering, dense, confident
notes: dark WITHOUT neon-glow. Discipline of 2 colors is what saves it from infobiz-look
```

- **Настроение:** системное, инженерное, плотное, уверенное. Тёмное, но не крикливое: сетка и дисциплина вместо неон-шума.
- **Палитра:** графит `#0A0A0F`–`#141418` (база) · lime `#B6FF3C` + orange (ровно 2 акцента) · белый
- **Типографика:** condensed гротеск (Archivo Narrow, Oswald), моноширинный для слэш-команд (Space Mono, JetBrains Mono)
- **Layout-архетипы:** grid (value-map) · numbered-list · split · chart · главы с нав-точками
- **Декор-приёмы:** value-map-сетка (весь дедлайвери сразу), монопейс слэш-команд, терминал-мокап, видео-тумбы, $-якорь, нав-точки-каталог
- **Платформы:** IG-лента · Telegram · YouTube-обложка
- **Форматы:** каталог инструментов · «N скилов» · демонстрация стека
- **Модель:** gpt_image_2
- **Когда брать:** продукт, каталог, стек · «N скилов/инструментов» · демонстрация возможностей системы · тёмный премиум без глянца · когда нужно ощущение реального продукта, а не обещания
- **Ключевой приём:** value-map + слэш-команды + $-экономия = ощущение продукта, а не обещания
- **Доказательство:** REF-04 ★9.5/10 — «наш стек, тёмное правильно», прямой антипод провального test-3 ★5.6
- **Риск:** самый затёртый путь, граница с инфоцыган-клише. Спасает только дисциплина 2 цветов

## Фото-кинематограф

```text
STYLE TOKEN — "Cinematic Photo Cover"
palette: dark glossy base / low-key light / accent plate (orange or red) / white text
type: bold sans caps, no body layer, accent plate + big-number
layout: photo-bleed | hero-stopper | cover
decor: dark glossy cover with a face, cinematic low-key light, real UI screenshots overlaid, red callout outlines, overlay plates
mood: glossy, scroll-stopping, personal, evidential
notes: overlay > enlarge. Pairs as cover → Kraft Editorial / Letterpress body
```

- **Настроение:** глянцевое, стоп-скролльное, личное, доказательное. Лицо и кино-свет останавливают ленту там, где текст не справится.
- **Палитра:** тёмная глянец-база · low-key свет · плашка-акцент (оранж/красный) · белый текст
- **Типографика:** bold sans caps, плашка-акцент, big-number
- **Layout-архетипы:** photo-bleed · hero-stopper · cover
- **Декор-приёмы:** тёмная глянец-обложка с лицом, 3D-хром, реальные скрины UI поверх, красные обводки-коллауты, «SWIPE», плашка-оверлей поверх фото
- **Платформы:** IG-лента (обложка карусели) · **YouTube-обложка** · Stories
- **Форматы:** обложка серии · сторителлинг · пруф-слайды
- **Модель:** nano_banana_pro · soul_cinema
- **Когда брать:** обложка карусели (слайд 1) · сторителлинг с героем · пруф-слайды · аспирационный кадр эксперта · YouTube-превью, где нужен CTR
- **Ключевой приём:** дорогая обложка / честный простой боди — контраст сам по себе продаёт. Наложение сильнее увеличения
- **Доказательство:** REF-01 ★9/10, REF-03 ★9.5/10 (обложки), REF-09 ★8/10

## Крафт-леттерпресс

```text
STYLE TOKEN — "Kraft Letterpress"
palette: #ECE3CF aged kraft paper / charcoal-black ink / #E0561F burnt-orange (EXACTLY 3 colors)
type: heavy condensed woodtype (Anton, League Gothic) + riso texture, mono for terminal (JetBrains Mono)
layout: hero-stopper | numbered-list | split | dual dark↔cream rhythm within the series
decor: riso-grain, ink-sketch doodle icons, torn paper + tape labels, terminal card on every slide, ghost mega-numerals, rubber stamps, ticket forms, giant orange CTA
mood: expensive, unusual, tactile, hand-printed, anti-slop
notes: EXACTLY 3 colors = premium. nano_banana_pro or gpt_image_2
```

- **Настроение:** дорогое, необычное, тактильное, аналоговое. Ощущение напечатанного вручную спек-листа — максимально далеко от «AI-генёрки».
- **Палитра:** состаренный крафт `#ECE3CF` · charcoal-black · burnt-orange `#E0561F`. Ровно 3 цвета
- **Типографика:** тяжёлый condensed woodtype (Anton, Archivo Black, League Gothic) с ink/riso-фактурой, condensed sans для тела, моно для терминала, оранж-хайлайт на одном слове, giant CTA во весь кадр
- **Layout-архетипы:** hero-stopper · numbered-list · split · cover · дуальный ритм (тёмный ↔ кремовый чередуются внутри серии)
- **Декор-приёмы:** riso-зерно, рисованные дудл-иконки, рваная бумага и скотч-лейблы, терминал-карточка на каждом слайде, гост-мега-цифры 01–06, штамп-печать, билет/купон-формы, дэшед-стрелки, гигантский оранжевый финал-CTA
- **Платформы:** IG-лента · Telegram
- **Форматы:** how-to · пошаговые инструкции · callout · Claude-tips
- **Модель:** nano_banana_pro (крупный текст) · gpt_image_2
- **Когда брать:** tech и how-to — ровно наша ниша · когда нужен максимальный анти-слоп · серийный контент с узнаваемой фурнитурой · тёплое человеческое ощущение вместо глянца · аудитория, уставшая от лоска
- **Ключевой приём:** ровно 3 цвета + riso-фактура + оттиск woodtype = «сделано человеком-инженером», а не сгенерировано
- **Доказательство:** REF-05 ★9.5/10, REF-10 ★9.5/10; День 3 марафона

## Техно-блюпринт / HUD

```text
STYLE TOKEN — "Techno-Blueprint HUD"
palette: aged kraft/cream ↔ dark charcoal (dual rhythm) / #E0561F burnt-orange accent
type: heavy condensed woodtype headlines, MONO for ALL UI/labels/captions (JetBrains Mono)
layout: hero-stopper | numbered-list | flow-diagram with numbered HUD nodes | split
decor: corner brackets, target reticle, barcodes, >_ terminal marks, pixel dashes, [bracket tags], ghost numerals in cut-out boxes, before/after file stacks, 3D ticket/badge/lanyard CTA, pixel-art icons
mood: engineered, precise, technical-vintage, gold-standard anti-slop
notes: THE reference standard — only 10/10 in our teardowns. Rule: mono for every UI element
```

- **Настроение:** инженерное, точное, винтажно-техническое. Техническая документация, сделанная с любовью — эталон анти-слопа.
- **Палитра:** крафт/кремовый ↔ тёмный charcoal (дуальный ритм) · burnt-orange `#E0561F`
- **Типографика:** woodtype для заголовков, **моно для ВСЕХ UI-элементов, лейблов и подписей** — жёсткое правило стиля
- **Layout-архетипы:** hero-stopper · numbered-list · flow-диаграммы с нумерованными HUD-нодами · split
- **Декор-приёмы:** угловые скобки-брекеты, target-reticle, штрихкоды, `>_` терминал-марки, пиксельный пунктир, теги в квадратных скобках, гост-цифры в вырезанных боксах, before/after файл-стеки с реальными числами, 3D ticket/badge на шнурке для CTA, пиксель-арт иконки, сквозной слоган
- **Платформы:** IG-лента · Telegram
- **Форматы:** how-to · технический разбор · before/after · пошаговый конвейер
- **Модель:** gpt_image_2 · nano_banana_pro
- **Когда брать:** технический контент, где важна точность · серия с узнаваемой фурнитурой · когда нужен максимальный анти-слоп · демонстрация процесса и конвейера · темы про код и инструменты
- **Ключевой приём:** HUD-фурнитура (брекеты, reticle, штрихкод) + моно на всём UI = «инженер сделал», а не «нейросеть нарисовала»
- **Доказательство:** REF-07 ★**10/10** — единственная десятка во всём разборе, gold standard

## Dark UI / продуктовый дашборд

```text
STYLE TOKEN — "Dark UI Product Dashboard"
palette: #0A0B0A near-black / #B8F135 lime (ONE accent; alt: #FF1F6B magenta) / white
type: condensed caps (Archivo, Oswald), clean sans body (Inter), mono inside mockups
layout: grid | split | chart | numbered-list | hero-stopper
decor: glassmorphism cards with soft glow, unified thin-line icon system in round chips, realistic UI mockups with REAL metrics, glowing growth chart, brand pill, progress 03/07
mood: product-grade, evidential, clean, modern-expensive
notes: discipline of 2 colors + real numbers = S-class proof. Supports mixed-media video slides
```

- **Настроение:** продуктовое, доказательное, чистое, современно-дорогое. Тёмное, которое выглядит как настоящий SaaS-интерфейс, а не как неон-баннер.
- **Палитра:** near-black `#0A0B0A` · ОДИН акцент lime `#B8F135` (альтернатива — magenta `#FF1F6B`) · белый
- **Типографика:** condensed caps (Archivo, Oswald), чистый sans (Inter) для тела, моно в мокапах, один lime-хайлайт на слове
- **Layout-архетипы:** grid · split · chart · numbered-list · hero-stopper · photo-bleed
- **Декор-приёмы:** glassmorphism-карточки с мягким свечением, единая thin-line иконка-система в круглых чипах, реалистичные UI-мокапы с **реальными метриками**, свеченный growth-график, бренд-пилюля, прогресс `03/07`, summary-плашка, giant CTA, видео-слайды
- **Платформы:** IG-лента · Telegram · презентации
- **Форматы:** фаннел · кейс с цифрами · how-to с пруфом · mixed-media
- **Модель:** gpt_image_2 · nano_banana_pro
- **Когда брать:** фаннел, SaaS, how-to с пруфом · когда есть реальные цифры и скрины дашбордов · полный путь «идея → продукт → продажи» · mixed-media карусели с видео-хуком
- **Ключевой приём:** дисциплина 2 цветов + единая иконка-система + UI-мокап с реальными метриками = пруф S-класса
- **Доказательство:** REF-06 ★9.5/10, REF-11 ★9.5/10

## Dark Luxury / бизнес-нуар

```text
STYLE TOKEN — "Dark Luxury Business-Noir"
palette: deep black/charcoal + #1B2A38 cold slate-blue / #C0392B blood-red chapter index / white antiqua
type: THIN SERIF/antiqua headlines (NOT grotesque) + monospace code snippet as texture, large chapter numeral
layout: cover | split | bento cards | photo-bleed low-key
decor: low-key cinematic expert photo, large chapter numeral, bento cards, red chapter index, mono code as texture, generous air
mood: status, cinematic, restrained-expensive, adult
notes: THE premium tier — "Private Banking Luxe". Use INSTEAD of techno-neon for banks/corporate
```

- **Настроение:** статусное, кинематографичное, сдержанно-дорогое, взрослое. Деловое издание премиум-сегмента — самый дорогой по ощущению стиль каталога.
- **Палитра:** глубокий чёрный/уголь · холодный серо-синий `#1B2A38` · кроваво-красный индекс `#C0392B` · белая антиква
- **Типографика:** тонкая **serif/антиква** для заголовков — не гротеск, это принципиально · моноширинный код-сниппет как фактура · крупная цифра-глава
- **Layout-архетипы:** cover · split · bento-карточки · photo-bleed (low-key) · много воздуха
- **Декор-приёмы:** low-key кинематографичное фото эксперта, крупная цифра-глава, bento-карточки, красный индекс глав, моно-код как текстура
- **Платформы:** презентации · КП · IG-лента · LinkedIn
- **Форматы:** статусный тезис · экспертное заявление · корпоративный слайд
- **Модель:** soul_cinema · nano_banana_pro
- **Когда брать:** **премиальный B2B — банки, корпоративные клиенты, КП** · статусные и экспертные темы · честный жёсткий тезис · взрослая аудитория · когда нужен максимальный контраст с крикливым тёмным неоном
- **Ключевой приём:** тонкая антиква + кино-свет + красный индекс = статус вместо крика
- **⚠️ Важно:** это **замена техно-неону** для премиум-задач. Владелец забраковал платы, неон и сай-фай как штамп-банальщину — для «дорого» брать этот стиль

## Технический нуар с чертежом

```text
STYLE TOKEN — "Technical Noir Blueprint"
palette: dark indigo-graphite base / cyan blueprint grid / ONE amber accent / film grain
type: baked Russian headline, sharp perfectly legible Cyrillic, key word in amber, pill counter, bottom brand bar
layout: photo-bleed | split (photo right/lower, text left/top) | chart (blueprint schematics)
decor: film grain, cyan blueprint grid, schematic diagrams with agent icons, glowing screens as light source, one amber accent, bottom brand bar
mood: cinematic, dark, expensive, engineering, nocturnal
notes: model composes scene + text + schematic in ONE pass, no layers. gpt_image_2 4K
```

- **Настроение:** кинематографичный, тёмный, дорогой, инженерный. Кадр из премиального технотриллера, поверх которого лёг чертёж — драма человека плюс холодная логика системы.
- **Палитра:** тёмный индиго-графит (база) · циановая чертёжная сетка · ОДИН янтарный акцент · плёночное зерно
- **Типографика:** запечённый в кадр заголовок, ключевое слово янтарным, плашка-пилюля счётчика, нижний бренд-бар
- **Layout-архетипы:** photo-bleed · split (фото справа/снизу, текст слева/сверху) · chart · interface · terminal-window
- **Декор-приёмы:** плёночное зерно, циановая blueprint-сетка, схемы-чертежи конвейера с иконками агентов, свечение мониторов как источник света, один янтарный акцент
- **Платформы:** IG-лента · Telegram · YouTube-обложка
- **Форматы:** before/after · объяснение системы · трансформация с героем
- **Модель:** gpt_image_2 (4K)
- **Когда брать:** трансформационные истории «было → стало» с живым героем · объяснение сложной системы, где нужны схемы рядом с эмоцией · премиальный B2B-посыл · сквозной персонаж через серию · тёмный кино-контраст после светлых дней
- **Ключевой приём:** кино-кадр с героем и blueprint-чертёж в одной системе координат; модель верстает сцену, текст и схему за один заход
- **Доказательство:** День 6 марафона, выпущен

## Фото-натюрморт / флэт-лей ⭐

```text
STYLE TOKEN — "Photo Still-Life Flat-Lay"
palette: cream + honey + sage / warm wooden desk base / black print on cream paper
type: bold printed Russian headline PHYSICALLY ON the paper (not an overlay), handwritten sticky-note numbers
layout: photo-bleed | cover | grid (props arranged on desk) | terminal-window as prop
decor: top-down flat-lay, photorealistic 4K, real shadows and depth of field, paper texture, film aesthetic, proof-props (printed creatives, polaroids, sticky notes with real numbers, dark terminal with green code, coffee with latte art, marker, phone)
mood: warm, tactile, filmic, trustworthy, editorial-magazine
notes: THE WOW RECIPE. nano_banana_pro, native 4:5 without crop hacks
```

- **Настроение:** тёплый, тактильный, плёночный, доверительный. Реальный рабочий стол, снятый сверху при мягком свете — не реклама, а найденная сцена, которой веришь.
- **Палитра:** cream + honey + sage · тёплый деревянный стол (база) · кремовый лист бумаги (герой-плоскость) · чёрная печать на бумаге · тёмный терминал с зелёным кодом как контрастный акцент
- **Типографика:** жирный печатный заголовок, **физически напечатанный на бумаге**, а не наложенный поверх кадра. Вторая линия — рукописные стикеры с цифрами
- **Layout-архетипы:** photo-bleed (базовый) · cover · grid (раскладка предметов) · terminal-window · screenshot
- **Декор-приёмы:** вид сверху, фотореализм 4K, реальные тени и глубина резкости, фактура бумаги, плёночная эстетика; пруф-пропы — распечатки креативов, полароиды, стикеры с конкретными цифрами, тёмный терминал, кофе с латте-артом, маркер, телефон
- **Платформы:** IG-лента · Stories · Telegram · WhatsApp
- **Форматы:** текст-на-поверхности · отзыв · пруф-кейс
- **Модель:** **nano_banana_pro** (нативный 4:5 без кроп-костылей, сильнейший фотореализм с текстурами)
- **Когда брать:** когда нужно доверие и обход баннерной слепоты · есть конкретные цифры, которые можно «положить на стол» стикером · тёплый человеческий контраст после техничных стилей · показать рабочий стол как доказательство процесса · премиальная подача без крика
- **Ключевой приём:** заголовок физически напечатан на предмете внутри сцены — мозг читает его как **доказательство**, часть реальности, а не как рекламный оверлей. Это и обходит баннерную слепоту
- **Доказательство:** ⭐ День 4 марафона — принят заказчиком с восторгом, эталон планки. «Я перестал ОПИСЫВАТЬ картинку. Я начал СОБИРАТЬ сцену»

## Ботанический крафт

```text
STYLE TOKEN — "Botanical Craft"
palette: warm ivory cotton paper / sage green watercolor botanicals / terracotta accent (ONE) / graphite ink
type: large serif Russian headline, key word in terracotta, handwritten quote on card, generous margins
layout: cover | hero-stopper | photo-bleed | split | grid (herbarium arrangement)
decor: watercolor pressed botanicals (eucalyptus, wildflowers), torn deckle edges, cotton texture, kraft tag, sprig pinned like a herbarium specimen, wooden desk with pen and dried flowers
mood: quiet, organic, warm, trustworthy, magazine-tactile
notes: the exhale after loud styles. nano_banana_pro, native ratios
```

- **Настроение:** тихий, органичный, тёплый, доверительный. Гербарная страница ручной работы — намеренная тишина после громких дней.
- **Палитра:** тёплая хлопковая бумага ivory (база) · sage green (акварельные ботаники) · терракота (единственный акцент, держится через всю серию) · графитовые чернила
- **Типографика:** крупная антиква с ключевым словом терракотой, рукописная цитата на карточке как второй голос, щедрые поля
- **Layout-архетипы:** cover · hero-stopper · photo-bleed · split · grid (гербарная раскладка)
- **Декор-приёмы:** акварельные гербарные ботаники, прессованные растения, рваный деклевый край, хлопковая фактура, крафт-бирка, приколотая веточка как гербарный образец, рукописная цитата, деревянный стол с пером
- **Платформы:** IG-лента · Stories · Telegram
- **Форматы:** отзыв · testimonial · ценностный контент
- **Модель:** nano_banana_pro
- **Когда брать:** отзывы и социальные доказательства, где нужен максимум доверия · когда серия перегрета техничными стилями и нужен «выдох» · человеческие, ценностные, образовательные темы · премиальная тактильная подача · когда цитата или личное слово — главный контент кадра
- **Ключевой приём:** отзыв упакован как гербарный образец — приколотая веточка, крафт-бирка и рукописная цитата на рваной бумаге
- **Доказательство:** День 7 марафона — QA 8 из 8 кадров без глитчей

## Нео-брутализм

```text
STYLE TOKEN — "Neo-Brutalism"
palette: pure white background / pure black borders+text / #FFE500 acid-yellow highlighter / #2D5BFF electric-blue. STRICTLY 4 colors, NO gradients
type: ultra-bold condensed grotesque Cyrillic, massive black headline, key phrase inside an acid-yellow block
layout: hero-stopper | cover | grid (cards in thick borders) | numbered-list
decor: heavy thick black borders, hard solid black offset shadows (NO blur), block highlighter, zero gradients, zero halftones, flat fills
mood: loud, bold, poster-like, uncompromising, unscrollable
notes: gpt_image_2, one prompt per slide — the model composes headline + accent block itself
```

- **Настроение:** громкий, дерзкий, плакатный, бескомпромиссный. Уличное объявление-манифест: максимум контраста, ноль нюансов, всё сказано в лоб.
- **Палитра:** чистый белый (фон) · чистый чёрный (контур и текст) · кислотно-жёлтый `#FFE500` (блок-хайлайтер) · электрик-синий `#2D5BFF`. Строго 4 цвета, градиенты запрещены
- **Типографика:** ультра-жирный узкий гротеск, массивный чёрный заголовок, вторая часть фразы внутри кислотно-жёлтого блока, всё в безопасных полях
- **Layout-архетипы:** hero-stopper (основной) · cover · grid (карточки в толстых рамках) · numbered-list · interface
- **Декор-приёмы:** толстые чёрные рамки, жёсткая сплошная чёрная смещённая тень **без блюра**, блок-хайлайтер под фразу, ноль градиентов, ноль полутонов, плоские заливки
- **Платформы:** IG-лента · Stories · Telegram · **WhatsApp** (высокий контраст читается на любом экране)
- **Форматы:** X-but-for-Y · манифест · короткий ударный тезис
- **Модель:** gpt_image_2 (8 из 8 визуалов прошли QA с первого прохода)
- **Когда брать:** короткая ударная метафора или лозунг, который должен читаться за секунду · объяснение продукта новому человеку · максимальный стоп-скролл в белой ленте · громкий контраст после светлого и крафтового · заявления и провокации без полутонов
- **Ключевой приём:** массивная чёрная типографика в толстых рамках с несмазанной офсет-тенью и ключевой фразой в кислотно-жёлтом маркере
- **Доказательство:** День 8 марафона

## 3D-объём / инфлейт

```text
STYLE TOKEN — "3D Inflate Claymorphism"
palette: deep cobalt-indigo studio gradient / candy-glossy coral + cream + amber letters / glossy amber-orange 3D accent block
type: huge tactile extruded 3D Cyrillic headline, key word inside a separate glossy 3D block, razor-sharp legible Cyrillic
layout: hero-stopper | cover | split | numbered-list (3D pills)
decor: claymorphism inflate volume, studio lighting, soft shadows, rim light, reflections, glossy 3D props (dartboard with a dart in the bullseye, speech bubbles, number badges), pill counter plate
mood: tactile, glossy, expensive, playful, dimensional
notes: proves generation power — a template can't fake this. gpt_image_2 2k/high
```

- **Настроение:** тактильный, глянцевый, дорогой, игривый. Буквы можно потрогать — конфетная студийная 3D-сцена, которая сама доказывает, что это генерация, а не шаблон.
- **Палитра:** глубокий кобальт-индиго студийный градиент (фон) · коралловый глянец + кремовый + амбер (объёмные буквы) · глянцевый янтарно-оранжевый 3D-блок (акцентная подложка)
- **Типографика:** огромная тактильная экструдированная 3D-кириллица, ключевое слово внутри отдельного глянцевого блока, требование razor-sharp legible
- **Layout-архетипы:** hero-stopper (основной) · cover · split · numbered-list (объёмные пилюли-номера)
- **Декор-приёмы:** claymorphism-объём, студийный свет, мягкие тени, блики и отражения, rim light, глянцевые 3D-пропсы (мишень с дротиком, речевые пузыри, бейджи с цифрами), пилюля-плашка счётчика
- **Платформы:** IG-лента · Stories · **WhatsApp**
- **Форматы:** callout · прямое обращение к сегменту · метафора с пропсом
- **Модель:** gpt_image_2 (2k/high)
- **Когда брать:** прямое обращение к сегменту, где нужно мягко ткнуть пальцем · когда стиль сам должен доказывать мощь генерации · продуктовые темы без корпоративной серьёзности · слайды с метафорическими пропсами · контраст после тёмного и плоского
- **Ключевой приём:** надутая глянцевая экструдированная кириллица в студийном свете + ключевое слово, запечённое в отдельный 3D-блок
- **Доказательство:** День 3 марафона

## Неон-гранж / кислотный стритвир

```text
STYLE TOKEN — "Neon Grunge Acid-Streetwear"
palette: pure black textured concrete base / acid-magenta + lime-green grunge splashes / white knockout text
type: huge brutalist Cyrillic headline, poster-grade, sharp legible lettering, formula-style statement
layout: hero-stopper | cover | split (dark code window left, headline right) | terminal-window | interface
decor: grunge splashes and strokes, torn-paper tape labels, concrete texture, check-chips at the bottom, dark code-editor window, AI-agent card with green checkmarks
mood: bold, street, acid, loud, nocturnal
notes: show don't tell — bake live proof (code window, agent card) INTO the frame. gpt_image_2 2k
```

- **Настроение:** дерзкий, уличный, кислотный, громкий. Подпольный рейв-флаер на бетонной стене — агрессивная энергия, которую невозможно проигнорировать в ленте.
- **Палитра:** чистый чёрный текстурированный бетон (база) · кислотная маджента + лаймовый зелёный (гранж-брызги) · белая выворотка (текст)
- **Типографика:** огромный брутальный кириллический заголовок плакатного качества, заголовок ведёт себя как формула, служебные подписи в мелких чипах-плашках
- **Layout-архетипы:** hero-stopper (основной) · cover · split · terminal-window · interface · screenshot
- **Декор-приёмы:** гранж-мазки и брызги, рваная бумага-скотч как лейблы, текстура бетона, чипы-галочки внизу кадра, тёмное окно код-редактора внутри композиции, карточка AI-агента с зелёными галочками
- **Платформы:** IG-лента · Stories · Telegram
- **Форматы:** баннер-анонс · манифест с цифрой
- **Модель:** gpt_image_2 (2k)
- **Когда брать:** запуск и анонс события, где нужен максимальный стоп-скролл · заявление-манифест с цифрой или формулой · аудитория фаундеров и технарей, уставшая от корпоративной чистоты · когда нужно показать продукт-интерфейс внутри кадра · контраст-день после светлого стиля
- **Ключевой приём:** внутрь агрессивного гранж-кадра вшито живое доказательство (окно кода, карточка агента с галочками), а не описание словами
- **Доказательство:** День 1 марафона

## Зелёный монохром (сторителлинг)

```text
STYLE TOKEN — "Green Monochrome Storytelling"
palette: white / charcoal-black / #1a9d3f emerald. EXACTLY 3 colors, white↔black rhythm across slides
type: ~4x scale contrast headline/body, accent on ONE word
layout: photo-bleed | split | big-number | cover
decor: black-and-white photo with a SINGLE green circle mask, 3D emoji as an emotional anchor, big-number cases
mood: narrative, honest, documentary, warm
notes: least proven style in the catalog — no teardown score yet. Validate before scaling
```

- **Настроение:** повествовательное, честное, документальное, эмоционально-тёплое. Ритм чёрного и белого как монтаж истории, зелёный — единственная точка внимания.
- **Палитра:** белый · угольно-чёрный · изумруд `#1a9d3f`. Ровно 3 цвета, ритм white↔black по слайдам
- **Типографика:** кегль-контраст ~4×, акцент на одном слове
- **Layout-архетипы:** photo-bleed · split · big-number · cover
- **Декор-приёмы:** ч/б фото + единственный зелёный круг-маска, эмодзи-3D как эмоциональный якорь, кейсы с big-number
- **Платформы:** IG-лента · Telegram
- **Форматы:** сторителлинг · кейс клиента · личная история
- **Модель:** nano_banana_pro
- **Когда брать:** сторителлинг и личная история · кейсы клиентов с результатом · «до/после» с цифрой · когда нужен документальный, не рекламный тон
- **Ключевой приём:** ч/б фото + одна зелёная маска-круг = преаттентивный фокус без единого лишнего цвета
- **⚠️ Статус:** слабейшее звено каталога по доказательности — teardown-подтверждения нет. Проверить на одном выпуске до масштабирования

---

## Ризограф-крафт

```text
STYLE TOKEN — "Riso Craft"
palette: teal #008080 + orange #FF6B35 (alt: violet #7B2D8E + lime #C4D82E, mustard #D4A017 + black) on warm paper #F2E9D8
type: rough grotesque-black headline, halftone fill instead of solid color in photos
layout: poster | zine-spread | 2-layer portrait with offset
decor: halftone dots in shadows, single-source paper grain, 1-3px misregistration between ink layers
mood: zine culture, indie-publishing, tactile without gloss, made-by-hand
notes: 2-3 inks MAX — excess color kills the riso effect. gpt_image_2, spell out halftone + ink separation explicitly
```

- **Настроение:** зин/инди-издательская культура, тактильность без глянца. Ощущение малотиражной печати, а не файла из редактора.
- **Палитра:** teal `#008080` + orange `#FF6B35` · альтернативы: violet `#7B2D8E` + lime `#C4D82E`, mustard `#D4A017` + black — 2–3 «чернила» максимум на тёплой бумаге `#F2E9D8`–`#EDE4D3`
- **Типографика:** грубый гротеск-блэк для заголовков, halftone-заливка вместо сплошного цвета в фотографиях
- **Layout-архетипы:** постер · зин-разворот · 2-слойный портрет с offset · hero-stopper
- **Декор-приёмы:** halftone dots в тенях, paper grain из **одного** источника текстуры (не смешивать несколько зёрен), misregistration-сдвиг 1–3px между цветовыми слоями
- **Платформы:** IG-лента · обложки статей · zine-эстетика лид-магнитов
- **Форматы:** постер · обложка · карточка-цитата
- **Модель:** gpt_image_2 (halftone + ink separation прописывать в промпте явно)
- **Когда брать:** крафтовое/инди-позиционирование · противовес глянцевому AI-виду · комьюнити-контент · когда нужна печатная фактура, но леттерпресс уже был в серии
- **Ключевой приём:** ограничение до 2–3 «чернил» и намеренный сдвиг слоёв — риso читается как процесс печати, а не как фильтр поверх готовой картинки
- **Риск:** перетекстурирование — ассет «плывёт» на мобильном экране

## Y2K-футуризм

```text
STYLE TOKEN — "Y2K Futurism"
palette: chrome silver #C0C0C0 / icy blue #A8D8EA / glossy white / holographic shimmer (structural tones 70% of area)
type: bubble/inflated sans, chrome-metallic text effect
layout: floating glossy shapes | busy composition with 3D objects | cover
decor: lens flare, translucent plastic, low-poly 3D props (CD, flip-phone), no irony
mood: optimistic techno-futurism of the early 2000s, iMac G3, sincere not sarcastic
notes: hold ONE Y2K subgenre — never mix with McBling or Vaporwave. nano_banana_pro (chrome reflections)
```

- **Настроение:** оптимистичный техно-футуризм рубежа 2000-х, **без иронии** — это главное отличие от вапорвейва
- **Палитра:** chrome silver `#C0C0C0` · icy blue `#A8D8EA` · глянцевый белый · holographic-градиент. Структурные тона держать на 70% площади, loud-акценты — только моментами
- **Типографика:** bubble/inflated sans, хром-металлик-эффект на заголовке. Кириллицу на bubble-шрифтах обязательно тестировать
- **Layout-архетипы:** floating glossy elements · busy composition с 3D-объектами · cover
- **Декор-приёмы:** lens flare, translucent plastic, low-poly 3D (CD-диск, флип-телефон)
- **Платформы:** IG Stories · обложки Reels · gen-Z tech/fashion/beauty
- **Форматы:** cover-слайд · продуктовый тизер
- **Модель:** nano_banana_pro (точнее держит хром-рефлексы)
- **Когда брать:** аудитория до 25 лет в tech/gaming/beauty · когда нужен светлый футуризм без сарказма. **НЕ для B2B и финансов** — контраст chrome+pink проваливает WCAG
- **Ключевой приём:** держать ровно ОДИН поджанр Y2K на кадр — смешение поджанров читается как костюм, а не как стиль

## Frutiger Aero

```text
STYLE TOKEN — "Frutiger Aero"
palette: sky blue / water-droplet transparency / translucent plastic / green foliage / glossy white — NO dark background
type: clean humanist geometric sans (NOT bubble, NOT chrome-effect)
layout: light gradient panels | airy open space | hero-banner
decor: water droplets, glass/translucent surfaces, organic light bloom
mood: humanist optimism — "the internet will make the world better", zero cynicism
notes: the light, sincere cousin of Y2K. Absence of dark background + absence of irony = the whole difference from Vaporwave. nano_banana_pro
```

- **Настроение:** искренний светлый техно-оптимизм. Более блестящий и добрый «кузен» Y2K
- **Палитра:** небесно-голубой · капли воды/прозрачность · зелёная листва · глянцевый белый. Тёмного фона нет по определению
- **Типографика:** чистый гуманистический геометрик-санс — **не** bubble и **не** хром-эффект (этим отличается от Y2K-футуризма)
- **Layout-архетипы:** светлые градиентные панели · простор · hero-баннер · cover
- **Декор-приёмы:** водные капли, стеклянные/прозрачные поверхности, органичные светлые блики
- **Платформы:** wellness/eco-бренды · корпоративный tech-оптимизм · light-контент
- **Форматы:** hero-баннер · презентационный слайд
- **Модель:** nano_banana_pro
- **Когда брать:** нужен светлый техно-оптимизм без сарказма · контраст с перегретым «тёмным» трендом 2026 · экология, здоровье, «технологии для людей»
- **Ключевой приём:** свет и прозрачность вместо тёмного фона — это и есть водораздел с вапорвейвом

## Вапорвейв

```text
STYLE TOKEN — "Vaporwave"
palette: hot magenta #ff71ce / cyan #01cdfe / purple #b967ff / void-purple bg #1a0533 — STRICTLY these 5, no beige, no pastel, no brand-blue
type: VT323 (CRT terminal), Press Start 2P (arcade), Audiowide (display)
layout: vanishing-point neon grid | palm silhouettes foreground | 135° sunset gradient sky
decor: VHS scanlines 2-3% opacity, chromatic aberration (red-cyan split) on text, Roman bust silhouettes
mood: ironic, faintly melancholic nostalgia for a future that never happened
notes: diluting the palette destroys genre recognition. gpt_image_2 (holds CRT text effects)
```

- **Настроение:** ироничная, слегка меланхоличная ностальгия — критика консьюмеризма через эстетику
- **Палитра:** hot magenta `#ff71ce`/`#ff00ff` · cyan `#01cdfe`/`#00ffff` · purple `#b967ff` · void-purple фон `#1a0533`/`#0a0014`. Никаких бежевых, пастельных и brand-blue примесей
- **Типографика:** VT323 (терминал), Press Start 2P (аркада), Audiowide (display) — все свободные на Google Fonts. ⚠ Press Start 2P **провалена по кириллице** (мод. 03) — для русского текста подбирать замену
- **Layout-архетипы:** vanishing-point неоновая сетка к горизонту · 2–3 палм-силуэта на переднем плане · sunset-градиент 135° · cover
- **Декор-приёмы:** VHS scanlines 2–3% opacity, chromatic aberration (red-cyan split) на тексте, Roman bust и греческие буквы как декор
- **Платформы:** музыкальный/клубный контент · инди-бренды · IG Stories с ретро-темой
- **Форматы:** cover-арт · постер · тизер-карточка
- **Модель:** gpt_image_2 (лучше держит CRT-текстовые эффекты)
- **Когда брать:** нужна ироничная дистанция вместо прямого продающего тона. **Не работает** для B2B, финансов, healthcare
- **Ключевой приём:** строго 5-цветная палитра без исключений — размытие палитры убивает узнаваемость жанра

## Жидкий хром

```text
STYLE TOKEN — "Liquid Chrome"
palette: mercury silver base / optional iridescent rainbow reflections / matte black metallic variant
type: brutalist-heavy display, legibility deliberately traded for visual impact
layout: organic blob forms | spheroid metal objects frozen in impossible liquid physics | cover
decor: complex multi-layer environmental reflections, razor highlights, deep shadows
mood: synthetic luxury, hyper-real, "digital artifact as an aesthetic value, not a bug"
notes: needs 3D-render logic in the prompt (Cinema4D/Blender-referenced). nano_banana_pro
```

- **Настроение:** синтетический люкс, гипер-реальность. Цифровая артефактность как ценность, а не как баг
- **Палитра:** ртутное серебро (база) · опционально иридесцентные rainbow-рефлексы · вариант matte black metallic
- **Типографика:** brutalist-жирный дисплейный шрифт; читаемость сознательно уступает визуальному удару
- **Layout-архетипы:** органичные blob-формы · сфероидные металлические объекты в невозможной жидкой позе · cover · hero-stopper
- **Декор-приёмы:** сложные многослойные environmental reflections, резкие highlight, глубокие тени
- **Платформы:** обложки альбомов/музыка · fashion и streetwear · экспериментальный web
- **Форматы:** cover-арт · hero-визуал · логотип-кадр
- **Модель:** nano_banana_pro (сложные металлические рефлексы)
- **Когда брать:** нужен футуристично-люксовый удар без утилитарности. **Не брать** под длинные читаемые тексты
- **Ключевой приём:** физика жидкости, застывшая в металле — именно органичная деформация, а не «глянцевый 3D»

## Mid-Century Modern

```text
STYLE TOKEN — "Mid-Century Modern"
palette: mustard #D4A017 / burnt orange #CC5500 / olive #6B7A3A / teal #007070 / charcoal #3A3A3A — saturated but earthy
type: geometric sans (Futura-class) headline + playful script or clean serif accent
layout: strict modular grid broken by organic boomerang/amoeba shapes
decor: hand-drawn elements, starburst, arrow icons, flat abstract illustration instead of photo
mood: warm, confident, witty — "post-war American optimism"
notes: same modernist roots as Swiss, opposite tone — subjectivity and humor instead of neutrality. gpt_image_2
```

- **Настроение:** тёплый, уверенный, с юмором. Те же модернистские корни, что у швейцарской школы, но противоположный тон: субъективность и личность вместо нейтральности
- **Палитра:** mustard `#D4A017` · burnt orange `#CC5500` · olive `#6B7A3A` · teal `#007070` · charcoal `#3A3A3A` — насыщенные, но земляные
- **Типографика:** геометрик-санс класса Futura для заголовков + плейфул script или чистый serif как акцент
- **Layout-архетипы:** строгая модульная сетка, разбавленная органичными boomerang/амёба-формами · постер · cover · split
- **Декор-приёмы:** hand-drawn элементы, starburst, стрелки-иконки, плоская абстрактная иллюстрация вместо фото
- **Платформы:** lifestyle-бренды · hospitality · редакционный контент
- **Форматы:** постер · карточка-цитата · обложка лонгрида
- **Модель:** gpt_image_2
- **Когда брать:** нужна теплота и человечность вместо холодного модернизма · универсально узнаваемо, не читается нишево · когда Швейцарская типографика слишком безлична для темы
- **Ключевой приём:** рестрейн плюс теплота — одна яркая форма-акцент (boomerang/амёба) на сдержанной сетке

## Нео-деко

> **Сведено из двух модулей.** Модуль 01 нашёл его как Pinterest Predicts #1 тренд 2026 (холодные металлики), модуль 02 — как единственную растущую ретро-школу 2026 (приглушённое золото). Это один стиль; палитры ниже — две его ветки, обе законные. Общий и главный запрет у обоих источников совпадает дословно.

```text
STYLE TOKEN — "Neo Deco"
palette (cool branch): burgundy/oxblood #5C1A22 / deep teal / navy + charcoal / cool metallics — silver, platinum, NEVER warm gold
palette (warm branch): lacquer black #1A1A1A / muted gold #C9A959 (flat, NEVER a gradient) / ivory #F3F5EA / garnet #6E213B
type: geometric display with strong verticals (Cinzel Decorative) + thin neutral sans or Cormorant Garamond body + IBM Plex Mono labels
layout: vertical symmetry / near-symmetry | fan-arch or sunburst as THE single motif | double thin gold-inset frames | cover
decor: ONE geometric motif per composition — chevron OR scallop edge OR ziggurat step, never stacked; gloss-vs-matte contrast
mood: restrained, edited luxury — confident permanence without theatrics
notes: GOLD GRADIENTS ARE THE #1 CHEAP-TELL. Gold goes on structure and hierarchy, never as a fill. nano_banana_pro
```

- **Настроение:** сдержанная, «отредактированная» роскошь. Уверенность и постоянство вместо театральности — противоположность перегруженности оригинального ар-деко 1920-х
- **Палитра:** *холодная ветка* — burgundy/oxblood `#5C1A22` (сигнатурный), deep teal + matte bronze, navy + charcoal (безопасный вход), холодные металлики silver/platinum. *Тёплая ветка* — лаковый чёрный `#1A1A1A`, приглушённое золото `#C9A959` плоской заливкой, айвори `#F3F5EA`, гранатовый `#6E213B`. Ветки не смешивать в одной серии
- **Типографика:** геометрик-дисплей с чёткой вертикальной структурой (Cinzel Decorative, широкий трекинг) + тонкий нейтральный sans или Cormorant Garamond для тела + IBM Plex Mono для utility-лейблов. ⚠ Cinzel Decorative и Cormorant Garamond **официально не проверены на кириллицу** (мод. 03) — для русских заголовков подставлять **Playfair Display** (кириллица подтверждена на уровне репозитория Google Fonts)
- **Layout-архетипы:** вертикальная симметрия/почти-симметрия · fan-arch/sunburst как центральный мотив · двойные тонкие рамки с золотым инсетом · cover · hero-stopper
- **Декор-приёмы:** ОДИН геометрический мотив на композицию — chevron **или** scallop-край **или** ступенчатая ziggurat-форма, никогда вместе. Контраст глянец/матовость (лак vs штукатурка) вместо однородной поверхности
- **Платформы:** премиум-презентации · КП · luxury-хоспиталити · ювелирный/спиртной/недвижимость · high-end tech · perfume/skincare
- **Форматы:** обложка КП · hero премиум-лендинга · cover-слайд премиум-продукта · приглашение/анонс события
- **Модель:** nano_banana_pro (точнее держит металлик-градиенты и фактуру)
- **Когда брать:** нужен «дорогой» сигнал без избыточности классического деко · премиум B2B и luxury-клиенты · статус и постоянство вместо тренда · когда Dark Luxury уже был в серии, а держать премиум-регистр надо
- **Ключевой приём:** ОДНА яркая jewel-tone деталь на сдержанном фоне — «one statement piece + minimal surroundings». Золото работает на структуре и иерархии, не заливкой
- **⚠️ Жёсткий запрет:** градиентное золото. Оба независимых источника называют его сигналом дешёвки №1 — и это же правило распространяется на существующий **Dark Luxury / бизнес-нуар**

## Типо-коллаж

```text
STYLE TOKEN — "Type Collage"
palette: high-contrast black-and-white base + exactly ONE accent color (compose in grayscale FIRST, color after)
type: 2-4 faces max — one extreme (very condensed or very extended) + one readable anchor + optional disruptive accent
layout: canvas filled edge to edge, letters become form and texture, minimal-to-zero whitespace
decor: small doodles/lines/markers filling the gaps between letters, rotated and tilted text for motion
mood: loud, immediate visual impact — "typography IS the visual", no photo needed
notes: the ONE style in the catalog built on the absence of air. gpt_image_2 (Cyrillic precision in a dense composition)
```

- **Настроение:** громкий, требующий внимания. Работает через плотность и контраст, а не через изображение
- **Палитра:** высокий контраст как основа (композицию блокировать в grayscale), затем ровно один акцентный цвет
- **Типографика:** 2–4 гарнитуры максимум — один экстремальный шрифт (очень сжатый или очень растянутый) + один читаемый «рабочий» + опционально disruptive-акцент
- **Layout-архетипы:** канвас заполнен полностью · буквы как форма и текстура · минимальный или нулевой воздух (единственное исключение из общего правила каталога) · cover · hero-stopper
- **Декор-приёмы:** мелкие doodle/линии/маркеры для заполнения пауз между буквами, ротация и наклон текста для динамики
- **Платформы:** постеры и event-графика · обложки альбомов · IG-карусели и thumbnails · бренд-кампании с сильным голосом
- **Форматы:** cover-слайд · постер · thumbnail
- **Модель:** gpt_image_2 (важна точность кириллицы в плотной композиции)
- **Когда брать:** нужен немедленный стоп-скролл без фото · сильный типографический голос · манифест или лозунг. **Избегать** для длинных читаемых текстов
- **Ключевой приём:** контраст **до** цвета — блокировать размер/вес/интервалы в grayscale, красить только потом

## Баухаус-редукция

```text
STYLE TOKEN — "Bauhaus Reduction"
palette: #FF0000 primary red / #FFD500 primary yellow / #0047AB primary blue / #000000 / #FFFFFF — primaries + non-colors only, no pastels
type: Josefin Sans (Light/Bold) display, Roboto body, JetBrains Mono utility
layout: asymmetric composition on clean white field | hero-stopper | cover
decor: geometric shape as THE main visual actor, one thin architectural line; shadow/gradient/noise/blur are BANNED — the ban itself is the style
mood: serious, engineered, historically-grounded modernism
notes: yellow accent ONLY in large blocks or forms, never in body text (WCAG fail). gpt_image_2, nano_banana_pro for premium finish
```

- **Настроение:** серьёзный, инженерный, исторически подкреплённый модернизм. Форма, а не система (система — это Swiss)
- **Палитра:** `#FF0000` красный · `#FFD500` жёлтый · `#0047AB` синий · `#000000` · `#FFFFFF`. Только основные цвета Кандинского + не-цвета, без пастели
- **Типографика:** Josefin Sans (display, Light/Bold) + Roboto (body) + JetBrains Mono (utility)
- **Layout-архетипы:** асимметричная композиция на чистом белом поле · геометрическая форма как главный визуальный актор · одна тонкая архитектурная линия · hero-stopper · cover
- **Декор-приёмы:** тень, градиент, шум и блюр **запрещены** — дисциплина запрета и есть стиль
- **Платформы:** IG-лента · LinkedIn · обложки образовательного контента
- **Форматы:** статичный пост 1:1 или 4:5 · обложка курса/презентации
- **Модель:** gpt_image_2 (точная геометрия и текст) · nano_banana_pro (премиум-финиш)
- **Когда брать:** нужен исторически легитимный «серьёзный» модернизм — образование, B2B, архитектурно-дизайнерская тематика · когда Крафт-редакторский слишком тёплый, а Swiss слишком безличен
- **Ключевой приём:** жёлтый акцент живёт только в крупных блоках и формах, никогда в мелком тексте — иначе гарантированный провал контраста

## Конструктивистская динамика

```text
STYLE TOKEN — "Constructivist Dynamic"
palette: #D32222 red / #0A0A0A black / #F2F0E8 warm off-white / occasional #E8B800 yellow — no neon anywhere
type: bold geometric grotesque Cyrillic SET AT AN ANGLE as a compositional object (Rubik Bold, Golos Text Bold)
layout: diagonal hero-stopper | photomontage cover | split — ONE diagonal runs through the entire frame
decor: photomontage + geometric shape in one composition, scale-jump "scream" headline, face crop cut by the diagonal
mood: energetic, revolutionary, urgent, collective
notes: Cyrillic-as-form is a rare edge on CIS audiences — Western Higgsfield/nano_banana users barely touch it. nano_banana_pro / gpt_image_2
```

- **Настроение:** энергичный, революционный, срочный, коллективный. Манифест, а не сообщение
- **Палитра:** `#D32222` красный · `#0A0A0A` чёрный · `#F2F0E8` тёплый off-white · изредка `#E8B800` жёлтый. Исторические цвета без неона
- **Типографика:** жирный геометрический гротеск, **кириллица под углом как элемент композиции**, а не подпись поверх сцены — Rubik Bold, Golos Text Bold. Масштаб букв «под крик»
- **Layout-архетипы:** диагональный hero-stopper · фотомонтаж-cover · split. Диагональ — сквозной приём через все слайды серии
- **Декор-приёмы:** фотомонтаж плюс геометрическая фигура (треугольник/круг) в одной композиции как смысловой акцент, не орнамент; face crop, обрезанный диагональю
- **Платформы:** IG-лента · Telegram
- **Форматы:** карусель · сторис · анонс · манифест
- **Модель:** nano_banana_pro (фотомонтаж + текст) · gpt_image_2 (текстовая точность кириллицы)
- **Когда брать:** анонсы дедлайнов и запусков · срочные офферы · сильные заявления и манифесты · когда нужна энергия на CIS-аудиторию, а Неон-гранж уже примелькался
- **Ключевой приём:** одна диагональ через весь кадр, под которую подрезано лицо (диагональ проходит через взгляд или рот) — структурное решение, а не декоративное

## De Stijl / точность

```text
STYLE TOKEN — "De Stijl Precision"
palette: #FFFFFF / #0A0A0A / #D32F2F / #1565C0 / #FDD835 — exactly 3 primaries + 2 non-colors
type: blockish geometric grotesque (Archivo Black, IBM Plex Sans Bold)
layout: grid | numbered-list | cover — thick black bars split the frame into UNEQUAL rectangles, strictly 90°
decor: no decor — the grid IS the decor; asymmetry through mass and void, never through symmetry
mood: rational, calm, engineered precision
notes: a diagonal breaks the rule outright (that's Constructivism, not De Stijl). gpt_image_2
```

- **Настроение:** рациональный, спокойный, инженерно-выверенный. Сигнал «эта команда точно знает, что делает»
- **Палитра:** `#FFFFFF` · `#0A0A0A` · `#D32F2F` · `#1565C0` · `#FDD835` — ровно 3 основных цвета плюс 2 не-цвета
- **Типографика:** блочный геометрический гротеск (Archivo Black, IBM Plex Sans Bold) — толстые прямоугольные формы
- **Layout-архетипы:** grid · numbered-list · cover. Толстые чёрные горизонтали и вертикали делят поле на неравные прямоугольники; только 90°
- **Декор-приёмы:** декора нет — сама сетка есть декор. Асимметрия через плотность и пустоту
- **Платформы:** LinkedIn · презентации · дизайн-система и токены
- **Форматы:** обложка · инфографика-плитка · карусель с одним цветовым правилом на слайд
- **Модель:** gpt_image_2 (геометрическая точность)
- **Когда брать:** финтех, консалтинг, аналитика · когда нужна максимальная дисциплина, но модульная сетка Swiss слишком нейтральна, а Баухаус слишком декоративен
- **Ключевой приём:** один цветной блок в углу уравновешивает большое пустое белое поле — баланс через контраст массы, а не через симметрию
- **⚠️ Правило стиля:** диагональ запрещена категорически. Появилась диагональ — это уже Конструктивистская динамика

## Ма и ваби-саби

```text
STYLE TOKEN — "Ma & Wabi-Sabi"
palette: #FFFFFF / #F7F7F7 warm white / #333333 text (NEVER pure black) / #7F0019 single sparing maroon accent (MUJI reference)
type: neutral grotesque without expression (Helvetica Neue / Inter), small sizes allowed — not everything has to shout
layout: single object on a near-empty field | off-center asymmetry | photo-bleed
decor: visible grain and imperfection as an anti-AI-gloss signal; no shadows; 0-2px corners; hairline dividers, not shadows
mood: quiet, contemplative, human — a counter-signal to the AI glut
notes: the accent must appear so rarely that each use reads as a decision, not a fill. nano_banana_pro
```

- **Настроение:** тихий, созерцательный, человечный. Прямой контрсигнал против AI-глянца — «выдох» в перегруженной ленте
- **Палитра:** `#FFFFFF` · `#F7F7F7` тёплый белый · `#333333` текст (никогда чистый чёрный) · `#7F0019` единственный скупой бордовый акцент. Разделители `#DDDDDD` hairline, не тени
- **Типографика:** нейтральный гротеск без экспрессии (Helvetica Neue, Inter), мелкий кегль допустим
- **Layout-архетипы:** один объект на почти пустом поле · лёгкая асимметрия (не по центру) · photo-bleed · много «активного» воздуха
- **Декор-приёмы:** видимое зерно, текстура, несовершенство как признак подлинности; никаких теней; скругления 0–2px
- **Платформы:** IG-лента · обложки wellness и premium-lifestyle
- **Форматы:** одиночный пост 4:5 · карусель с одним героем на слайд
- **Модель:** nano_banana_pro (фотореализм + текстура)
- **Когда брать:** нужна пауза от визуального шума · премиальный спокойный «дышащий» контент · день-«выдох» после техничных и громких стилей марафона · клиенты wellness и premium-lifestyle
- **Ключевой приём:** ма — это **активная** пустота, а не «то, что осталось»; единственный цветной акцент используется настолько скупо, что каждое появление читается как намеренное решение
- **Важно:** клиент, просящий «чистый минимализм по-японски», почти всегда хочет ваби-саби — тепло и след времени, а не голую редукцию

## Редакционная гравюра-штриховка

```text
STYLE TOKEN — "Editorial Hatching Engraving"
palette: black + ONE muted spot color (terracotta / slate / forest) / off-white paper base — 2 colors max
type: contrast serif headline (editorial register), fully vector line work
layout: hero-stopper | split — one large hatched figure, text ALONGSIDE, never over it
decor: crosshatch of varying density (open = light, tight = shadow), outer contour 2.5px thicker than 0.75px interior hatching, zero gradients
mood: intellectual, authoritative, editorial-magazine, slightly conservative
notes: the LINE carries the form, not the fill. Vector only — raster hatching breaks on scaling. gpt_image_2
```

- **Настроение:** интеллектуально, авторитетно, «журнал/исследование», немного консервативно
- **Палитра:** чёрный + один приглушённый акцент (терракота, слейт, лесной зелёный) на off-white бумаге — максимум 2 цвета
- **Типографика:** контрастная серифная гарнитура издательского регистра
- **Layout-архетипы:** hero-stopper · split — одна крупная фигура или сцена в штриховке, текст рядом, не поверх
- **Декор-приёмы:** штриховка разной плотности (открытая = свет, плотная = тень), внешний контур 2.5px против внутренней штриховки от 0.75px, только вектор, ноль градиентов
- **Платформы:** карусели образовательного и экспертного контента · обложки лонгридов · PDF-гайды
- **Форматы:** статичный слайд · обложка документа
- **Модель:** gpt_image_2 (держит чистую векторную линию и текст)
- **Когда брать:** экспертный или академический тон, «мы исследовали» · разбор кейса · когда нужен монохром-регистр, которого в каталоге нет
- **Ключевой приём:** линия несёт форму вместо заливки — ни одного фото и ни одного градиента в кадре

## Геометрик-флэт с зерном

```text
STYLE TOKEN — "Geometric Flat Grain Texture"
palette: 3-6 colors, ONE dominant covering 40-60% of the area
type: mid-contrast grotesque, design-forward
layout: geometric shapes (circle/rectangle/polygon) as the scene base, grain overlay across the WHOLE composition
decor: halftone dots or film grain over flat fills; NO organic curves in the base construction
mood: trustworthy, considered, slightly artisan — not cold
notes: flat geometry reads "digital", grain reads "human" — the balance is what holds trust. nano_banana_pro
```

- **Настроение:** надёжно, продумано, чуть artisan. Не холодно — этим отличается от чистого модернизма
- **Палитра:** 3–6 цветов, один доминирующий на 40–60% площади
- **Типографика:** гротеск средней контрастности, дизайн-forward
- **Layout-архетипы:** геометрические фигуры (круг, прямоугольник, полигон) как основа сцены · grid · split · hero-иллюстрация
- **Декор-приёмы:** halftone-точки или film grain поверх плоских заливок; в базовой конструкции — никаких органических кривых
- **Платформы:** лендинги fintech и B2B · презентации · карточки продукта
- **Форматы:** hero-иллюстрация · feature-блок
- **Модель:** nano_banana_pro (точная геометрия плюс текстурный слой)
- **Когда брать:** B2B SaaS, финтех, sustainability-позиционирование · когда Тёмный Swiss слишком дожат в тёмное и техно, а Крафт-редакторский слишком тёплый и человечный
- **Ключевой приём:** плоская геометрия читается как цифровое, зерно — как человеческое; баланс этих двух и держит доверие

## Грейни-градиент / аура

```text
STYLE TOKEN — "Grainy Gradient Blur Aura"
palette: cream→sage #f5f0e8→#8aaa8a / slate→purple #334155→#7c3aed / navy→teal #0f172a→#0d9488 / pink→peach #f9a8d4→#fbbf24
type: large bold sans over the soft background — a deliberate "structure vs atmosphere" contrast
layout: gradient as background/section, NOT as hero illustration; typography carries all the meaning
decor: grain overlay opacity 0.1-0.4 over the gradient, optional blurred botanical/abstract shapes
mood: dreamy, atmospheric, emotional, contemporary
notes: grain is an ANTI-AI signal, not decoration — a perfectly smooth gradient reads as synthetic in 2026. nano_banana_pro / gpt_image_2
```

- **Настроение:** мечтательно, атмосферно, эмоционально, современно
- **Палитра:** cream→sage `#f5f0e8→#8aaa8a` · slate→purple `#334155→#7c3aed` · navy→teal `#0f172a→#0d9488` · pink→peach `#f9a8d4→#fbbf24`
- **Типографика:** крупный жирный sans поверх мягкого фона — контраст «структура vs атмосфера»
- **Layout-архетипы:** градиент как фон или раздел, а не иллюстрация-герой · cover · photo-bleed. Типографика — главный несущий слой
- **Декор-приёмы:** grain-оверлей opacity 0.1–0.4 поверх градиента, по желанию размытые ботанические или абстрактные формы
- **Платформы:** обложки каруселей · фоны Stories · обложки эпизодов и подкастов
- **Форматы:** 4:5 · 9:16 · квадрат
- **Модель:** nano_banana_pro / gpt_image_2 (когда нужен читаемый текст поверх)
- **Когда брать:** эмоциональный, не строго корпоративный месседж · альтернатива «скучному» плоскому фону · когда предметного героя в кадре нет и не нужно
- **Ключевой приём:** зерно — не косметика, а анти-AI-сигнал. Гладкий градиент в 2026 читается как синтетика
- **⚠️ Пересечение с трендом:** дефолтный жёлто-золотистый градиент — маркер «AI slop» 2026. Палитры выше специально уводят от него; в промпте золотистый по умолчанию гасить явно

## Аналоговый скрапбук-коллаж

```text
STYLE TOKEN — "Analog Scrapbook Collage"
palette: kraft paper base + 2-3 colors pulled from the photo content, no dominant digital accent
type: handwritten font (headline/annotation) mixed with clean digital body text — craft vs legibility contrast
layout: ONE compositional anchor (main photo/message) + 2-3 layered elements around it with overlap
decor: torn paper edges instead of a clean crop, 2-3 washi/scotch tape pieces, paperclips and pins, rotation ±3-7°, 3-4 texture families MAX
mood: personal, warm, made-by-hand
notes: the chaos is CONTROLLED — hierarchy and anchor survive the apparent disorder. nano_banana_pro
```

- **Настроение:** личное, тёплое, «сделано человеком». Плохо автоматизируется — поэтому читается человечно
- **Палитра:** крафт-бумага плюс 2–3 цвета, взятые из самого фото-контента, без доминирующего digital-акцента
- **Типографика:** микс рукописного шрифта (заголовок и аннотации) с чистым digital body-текстом
- **Layout-архетипы:** один композиционный якорь плюс 2–3 слоя вокруг с наложением · cover · photo-bleed
- **Декор-приёмы:** рваный край вместо прямого кропа, 2–3 элемента скотча/washi-tape (не больше), скрепки и булавки, поворот элементов ±3–7°, максимум 3–4 текстурных семейства на композицию
- **Платформы:** личный бренд · сторис-дневник · behind-the-scenes · приглашения и анонсы
- **Форматы:** 4:5 · 9:16 Stories · обложка карусели
- **Модель:** nano_banana_pro (текст и композиция слоёв за один проход)
- **Когда брать:** нужна дистанция от шаблонного AI и корпоративного глянца · контент про процесс, закулисье, личную историю · личный бренд основателя
- **Ключевой приём:** хаос управляемый, а не случайный — один эталонный элемент (одна лента скотча, один рваный край) сильнее десяти наложенных текстур
- **⚠️ Обязательная проверка:** контраст текста над текстурой по WCAG — коллаж чаще других стилей проваливает читаемость. Не брать для data-heavy кадров

## Hard-surface 3D / точная поверхность

```text
STYLE TOKEN — "Hard-Surface Precision 3D"
palette: neutral base (graphite / ivory / steel) + ONE brand accent color
type: narrow technical grotesque, generous whitespace
layout: object centered on a neutral background, three-quarter or isometric angle
decor: precise polygonal geometry, clean bevels, matte-to-satin materials, technical panel logic; NO organic curves; even light with NO hard highlights on panel seams
mood: technical, precise, premium-engineering, serious — the opposite pole of claymorphism
notes: the deliberate antipode of "3D Inflate" — sharp edges instead of soft rounding. Never mix the two 3D poles in one series. nano_banana_pro
```

- **Настроение:** технично, точно, премиум-инженерия, серьёзно. Полярная противоположность мягкому клэю
- **Палитра:** нейтральная база (графит, слоновая кость, сталь) плюс один акцентный цвет бренда
- **Типографика:** узкий технический гротеск, много воздуха
- **Layout-архетипы:** объект по центру на нейтральном фоне · три четверти или изометрический ракурс · hero · каталожная карточка
- **Декор-приёмы:** чёткие фаски и грани, панельная логика, матовые и сатиновые материалы, ровный свет **без** жёстких бликов на стыках граней (блик на стыке = «дешёвый рендер»)
- **Платформы:** продуктовая карточка · техно- и индустриальный бренд · презентация оборудования и инфраструктуры
- **Форматы:** hero-изображение · каталожная карточка
- **Модель:** nano_banana_pro
- **Когда брать:** нужно ощущение инженерной точности и премиальности без мультяшности клэя · оборудование, инфраструктура, серьёзный B2B-продукт
- **Ключевой приём:** острые грани и точная геометрия как осознанная оппозиция 3D-инфлейту. Два полюса 3D не смешивать в одной серии

## Каталог-фото / чистый предмет

```text
STYLE TOKEN — "Clean Catalog Product Shot"
palette: white / off-white neutral background only, zero color cast — the product's own colors are the ONLY accent
type: NONE. Zero text, zero watermark, zero logo overlay on the frame — all copy lives in the product description outside the image
layout: product-fill-frame (1:1) | close-up detail crop | in-context scale shot (worn / used / plated)
decor: even soft studio light, no props except to show scale, no busy background, no filters, photorealistic commercial product photography
mood: neutral, trustworthy, unbranded-honest, e-commerce-utilitarian
notes: the opposite constraint of every other style here — built to PASS Meta catalog moderation, not to stand out. Negative prompt: "no text, no watermark, no logo overlay"
```

- **Настроение:** нейтральное, товарное, без прикрас. Доверие через честность кадра, а не через эстетику
- **Палитра:** белый или светло-нейтральный фон без цветового оттенка; единственный цвет в кадре — сам товар
- **Типографика:** **отсутствует полностью.** Ни текста, ни лого-бейджа, ни водяного знака — единственный стиль каталога с таким ограничением
- **Layout-архетипы:** product-fill-frame (товар занимает кадр целиком, квадрат 1:1) · close-up детали и фактуры · in-context (масштаб — на руке, на теле, на столе)
- **Декор-приёмы:** ровный мягкий студийный свет, отсутствие пропов кроме подтверждающих масштаб, чистый однотонный фон, без цветокоррекции и эффектов
- **Платформы:** WhatsApp Business Catalog (основное назначение) · карточки маркетплейсов
- **Форматы:** карточка товара · серия из 3–5 кадров на позицию (анфас → деталь → в контексте)
- **Модель:** nano_banana_pro / gpt_image_2 с явным негативным промптом «no text, no watermark, no logo overlay»
- **Когда брать:** любая задача «фото для каталога или витрины товара», где площадка технически отклоняет наложенный текст. Это **не эстетический выбор, а требование модерации** — текст и водяные знаки более 20% площади дают гарантированный reject Meta
- **Ключевой приём:** единственный стиль каталога, построенный на **отсутствии** приёма — вся выразительность переносится в описание вне кадра

## Степное наследие / редакционное

```text
STYLE TOKEN — "Steppe Heritage Editorial"
palette: #F2EBDD sand-cream base / #3E7C82 muted turquoise (NON-flag) / #C9A24B warm gold accent / #232323 charcoal text
type: humanist grotesque with the FULL Kazakh glyph set (verify against GF Cyrillic Core) for body, angular carved-accent display for headers
layout: asymmetric grid | one large ornamental element as a STRUCTURAL detail | cover | one-pager
decor: koshkar-muiz fragment as a single graphic accent — NEVER a repeating background pattern; felt/textile texture base
mood: dignity, continuity — "modern Kazakh identity, not ethnography"
notes: ornament = structural detail, never a sticker or border. gpt_image_2 (bilingual text) / nano_banana_pro (premium photoreal finish)
```

- **Настроение:** достоинство, преемственность. Не этнография, а современная казахская идентичность
- **Палитра:** песочно-кремовый `#F2EBDD` · приглушённая бирюза `#3E7C82` (**не** флаговая `#00AFCA`) · тёплое золото `#C9A24B` · графитовый текст `#232323`
- **Типографика:** гуманистический гротеск с полным набором казахских глифов для тела + акцидентная гарнитура с угловатыми засечками для заголовков (отсылка к резьбе по дереву и кости). Гарнитуру проверять на 9 казахских букв (ә, ғ, қ, ң, ө, ұ, ү, һ, і) через глифсет `GF Cyrillic Core` **до** утверждения макета
- **Layout-архетипы:** асимметричная сетка с одним крупным орнаментальным элементом как структурной деталью · one-pager · cover · большие поля и воздух
- **Декор-приёмы:** фрагмент қошқар-мүйіз как единичный графический акцент (никогда сплошной паттерн-фон), войлочная или текстильная фактура-подложка
- **Платформы:** корпоративный сайт · КП · презентации B2B и госсектора · годовые отчёты
- **Форматы:** лендинг-hero · обложка PDF · титульный слайд презентации
- **Модель:** gpt_image_2 (точный текст на казахском и русском) · nano_banana_pro (премиальный фотореалистичный финиш)
- **Когда брать:** казахстанский B2B-клиент, где нужен сигнал «мы понимаем локальный контекст» без клише и без сувенирщины
- **Ключевой приём:** орнамент как структурная деталь макета (форма разделителя, акцент one-pager), а не декоративный бордюр
- **⚠️ Юридический запрет:** герб РК коммерческим организациям использовать **запрещено законом**; флаг РК нельзя как паттерн, принт или рекламный элемент. Допустима только референсная палитра — и то не прямой копией

## Нео-номад / казахо-футуризм

```text
STYLE TOKEN — "Neo-Nomad Futurism"
palette: #8C8579 felt-dust grey / #C9BFA8 steppe beige / ONE electric accent — #00E0D0 cyan OR #D6007A magenta, never both
type: geometric futuristic sans for headers, neutral body sans with the Kazakh glyph set
layout: panoramic wide steppe-horizon composition | circular/dome-echo accent (NOT a literal emblem copy) | cover
decor: abstract petroglyph-inspired linework, close-up felt texture, dome-sky light effect
mood: "our own post-nomadic futurism" — bold cultural confidence, neither ethnographic nor western
notes: metaphor instead of literal ornament — yurt-as-form, not ornament-as-print. nano_banana_pro (cinematic light and composition)
```

- **Настроение:** «наш пост-кочевой футуризм» — смелая культурная уверенность, ни этнография, ни западный шаблон
- **Палитра:** пыльно-серый войлок `#8C8579` · степной беж `#C9BFA8` · электрик-акцент — циан `#00E0D0` **или** маджента `#D6007A`, ровно один
- **Типографика:** геометрический sans с футуристическим характером для заголовков + нейтральный текстовый шрифт с казахскими глифами
- **Layout-архетипы:** широкоформатные панорамные композиции со степным горизонтом · круговые и купольные композиционные акценты (отсылка к куполу юрты без буквального копирования герба) · cover
- **Декор-приёмы:** абстрактная петроглифоподобная линия, войлочная фактура крупным планом, световой эффект «купол-небо»
- **Платформы:** обложки Instagram и YouTube для культурных и креативных проектов · имиджевые кампании · event-визуал
- **Форматы:** YouTube-обложка · карусель · motion-заставка
- **Модель:** nano_banana_pro (кинематографичный финиш, сложная композиция света)
- **Когда брать:** имиджевые и культурные задачи · продукты для молодой городской аудитории Алматы и Астаны · когда нужна смелость, а не этно-сувенир. **Не для рядового рекламного баннера**
- **Ключевой приём:** метафора вместо буквального орнамента — юрта как форма, а не орнамент как принт
- **Контекст:** направление легитимировано официальной линией павильона Казахстана на Венецианской биеннале 2024 (архаичная космология плюс футуристическая эстетика)

## Билингвальный корпоратив доверия

```text
STYLE TOKEN — "Trust Bilingual Corporate"
palette: #0F4C4B deep teal / #E7E3DA warm neutral grey / #B85C38 warm terracotta accent — deliberately no flag-color overlap
type: neutral grotesque, STRICTLY equal size and weight for the Kazakh and Russian blocks, laid out against the LONGEST text variant
layout: parallel bilingual columns/blocks of synchronized height | one-pager | landing-hero
decor: ZERO ornament — locality comes from casting and texture (Kazakhstan architecture and landscape as photography, not illustration)
mood: reliability, clarity, warm business tone — explicitly not a cold western tone of voice
notes: Kazakh and Russian are equal twins, not "primary + small-print translation". Kazakh text runs 15-25% longer. gpt_image_2
```

- **Настроение:** надёжность, ясность, тёплая деловая интонация. Не холодный западный tone of voice
- **Палитра:** глубокий тил `#0F4C4B` · тёплый нейтральный серый `#E7E3DA` · один акцент — тёплая терракота `#B85C38` (вместо государственного золота и бирюзы)
- **Типографика:** нейтральный гротеск, строго равный кегль и вес для казахского и русского блоков. Казахский текст в среднем на **15–25% длиннее** русского из-за агглютинации — вёрстка компонентная, без фиксированной ширины кнопок, бейджей и табов; тестировать на самом длинном варианте
- **Layout-архетипы:** параллельные двуязычные колонки и блоки синхронизированной высоты · one-pager · landing-hero. Ни один язык не сжимается под другой
- **Декор-приёмы:** без орнамента вообще — фокус на локальном кастинге (лица) и фактуре (архитектура и ландшафт Казахстана как фотография, не иллюстрация)
- **Платформы:** банковский, финтех и промышленный B2B-сайт · presentation deck · LinkedIn
- **Форматы:** статичный рекламный баннер · лендинг-hero · one-pager КП
- **Модель:** gpt_image_2 (точный билингвальный текст в кадре)
- **Когда брать:** финансы, промышленность, госсектор-B2B — где орнамент неуместен, а доверие строится через ясность и локальный кастинг
- **Ключевой приём:** казахский и русский — равноправные близнецы одного макета, а не «основной плюс перевод мелким шрифтом»
- **⚠️ Копирайт:** не переводить готовый русский слоган на казахский построчно. Концепт, построенный на русской игре слов, звучит чужеродно — при значимом бюджете казахская версия пишется с нуля носителем

---

# 🎨 ДЕКОР-СЛОИ (не самостоятельные стили)

## Стикер-лист

> Единственная запись, которую источник (мод. 01) сам квалифицирует как **слой поверх другого стиля**, а не как самостоятельный кадр. Держать в каталоге отдельно от 21 стиля выше.

```text
DECOR LAYER — "Sticker Sheet"
palette: driven by the host style; the finish layer is EITHER holographic/chrome OR matte kraft — never both
type: bold rounded sans for sticker labels
layout: die-cut silhouettes instead of rectangles, collection grid of small numbered elements
decor: holographic finish on accent elements, embossed contour, numbered "archive of objects"
mood: playful, collectible, nostalgically childlike (trinket revival)
notes: apply OVER a finished composition — weaker standalone. Pairs well with Photo Still-Life and Kraft Editorial. gpt_image_2
```

- **Настроение:** игривый, коллекционный — Gen Z-тяга к «милым мелочам»
- **Палитра:** зависит от базового стиля; финишный слой — голографик/хром **или** матовый крафт, два полюса тренда, не смешивать
- **Типографика:** bold rounded sans для подписей на «стикерах»
- **Layout-архетипы:** die-cut силуэт вместо прямоугольной рамки · сетка коллекционных мелких элементов
- **Декор-приёмы:** голографик-финиш на акцентах, тиснёный контур, нумерация объектов в сетке
- **Платформы:** merch и product-контент · Gen Z-бренды · packaging-детали
- **Форматы:** декор-слой на карусели · product-тизер
- **Модель:** gpt_image_2
- **Когда брать:** как акцентный слой поверх готовой композиции — например поверх **Фото-натюрморта** или **Крафт-редакторского**. Самостоятельно слабее
- **Ключевой приём:** die-cut силуэт вместо рамки — мгновенно читается как стикер, а не как «картинка в рамке»

---

---

# ⛔ DEPRECATED — выведено из каталога

Эти профили были в автогенерированной версии. Удалены как **анти-паттерны** — не использовать, даже если ранжирование подскажет.

| Стиль | Почему удалён |
|---|---|
| Неоновый Техно-Инфо | Ровно «неон-glow + мелкий текст → инфоцыган-лук». 4 акцента |
| Киберпанк Гранж | Мультиакцент + glitch + scanlines = «всё кричит» |
| Фантастический Техно-Драма | 4 акцента, warning-signs, sci-fi-декор — дешевит |
| Премиум / Минималистичный Техно-Глоу | Слиты в Dark UI с исправленной палитрой. Для «премиум» брать **Dark Luxury**, а не техно-глоу — владелец забраковал платы и сай-фай как штамп-банальщину |
| Техно-динамичный · Яркий Техно-Брутал | Слиты в Тёмный Swiss (лишний третий акцент нарушал дисциплину 2 цветов) |
| Инфо-практичный · Современный Техно-Минимал · Чистый Техно-Минимал · Винтажный Игривый | Дубли Крафт-редакторского и Швейцарского. Полезное сохранено: альтернативный красный `#E82A47` |
| Винтажный Техно-Крафт · Крафтовый Брутал | Дубли Крафт-леттерпресса (описан точнее, подтверждён ★9.5) |

### Сквозные анти-паттерны (для любого стиля)

- Стены мелкого текста на светлых листах → черновик-лук
- Перегруженные dark grid-«оглавления» 4×4 микрокарточек
- Сырые скриншоты UI без рамок и теней → технический шум
- Неон-glow + мелкий текст → инфоцыган-лук
- **Множественный акцент** = всё кричит, теряется семантика цвета
- Трэш-копирайтинг и мат → токсично для премиум RU/KZ
- Стоковые AI-лица «реакции» (шок, открытый рот) → дешевит
- Низковозбуждающий хук (грусть, спокойное одобрение) → не двигает шеринг

### Сквозные приём-якоря 10/10

1. Гигантский кегль-контраст заголовок/тело (~4×)
2. Один цветовой акцент-хайлайт на ОДНОМ ключевом слове
3. Крупная нумерация слайдов как навигация
4. Big-number proof (реальные цифры)
5. Шаблонная нижняя плашка / бренд-маркер
6. ч/б фото + единственный цветной акцент
7. Full-bleed цветная плашка-обложка = одна мысль
8. Continuity: единый визуальный якорь через всю серию
9. Comment-gate CTA («пиши СЛОВО в комменты»)
10. Один объект / одна идея на кадр
11. Наложение > увеличение: оверлей поверх фото сильнее, чем крупный кегль

---

### ⛔ КАНДИДАТЫ В DEPRECATED

Исследование показало эти приёмы как **перегретые или дешевящие** в 2026. Часть касается существующих 16 стилей — это не удаление, а ограничение применения.

| Кандидат | Что показало исследование | Решение |
|---|---|---|
| **Градиентное золото** | Оба независимых источника (мод. 01, 02) называют gold gradient **сигналом дешёвки №1** для премиум-регистра | **Запретить в любом стиле.** Золото — только плоской заливкой на структуре/иерархии. Касается Нео-деко и существующего Dark Luxury |
| **Дефолтный «AI-жёлтый» градиент** | Мод. 05: `gpt_image_2` и `nano_banana_pro` по умолчанию тяготеют к жёлто-золотистым градиентам; дизайн-сообщество уже маркирует это как AI slop (опрос, апрель 2026) | **Гасить явным промптом** во всех стилях, где он не предусмотрен осознанно |
| **Glassmorphism / Liquid Glass как стиль** | Мод. 01 и 02: в списке усталости 2026. Плюс важное разграничение — Glassmorphism 2.0 это CSS-приём (blur+saturate), Liquid Glass это нативный материал Apple (iOS 26), в браузере доступен только как приближение | **Не заводить стилем.** Только акцентный слой. Существующий Dark UI / дашборд использует glassmorphism-карточки — оставить, но не наращивать |
| **Bento-грид как стиль** | Мод. 01 и 04: в списке усталости; большинство AI-сгенерированного «бенто» — 6 одинаковых блоков icon-title-sentence, не проходящих deletion-test | **Не стиль, а layout-архетип** (см. ниже) со строгой анатомией и обязательным deletion-test |
| **«Ленивый минимализм» и максимализм без содержания, Canva/template-культура** | Мод. 02: кросс-школьный сигнал усталости 2026 | Держать в анти-паттернах `_ANALYSIS.md` |
| **«Sad beige» / quiet luxury** | Мод. 05: датированный сигнал усталости (апрель 2026) | Не строить новые премиум-решения вокруг бежевой тишины; для «дорого» брать Нео-деко или Dark Luxury |
| **Hyper-polished / overly-synthetic** | Мод. 12: **Instagram с начала 2026 понижает такой контент алгоритмически.** Плюс рынок: предпочтение AI-контента упало с 60% (2023) до 26% (2025); при заметном AI 31% доверяют бренду меньше против 7% больше | **Существующие глянцевые стили** (Фото-кинематограф на `soul_cinema`, Dark Luxury) не должны перегибать в «слишком чисто» — балансировать текстурой и несовершенством |
| **Текст на YouTube-обложке** | Мод. 10: 323K видео / 62,6 млрд просмотров — текст в среднем **−19% просмотров**; исключение только текст короче 10 символов на <7% площади | Для YouTube-формата у Фото-кинематографа ограничить текст до 0–3 слов |
| **Стоковые «шокированные лица»** | Мод. 10: искренняя микро-эмоция (закрытый рот, прямой взгляд) обыгрывает клишированное шок-лицо **на 15–20%** — у аудитории паттерн-слепота | Усиливает уже существующий анти-паттерн каталога конкретной цифрой |
| **Мемфис** | Мод. 02: перегрет для kids/DTC, управляем для SaaS/tech только при дисциплине 3–4 цветов | В каталог не заводить |
| **Первая волна Y2K-клише** (бабочки-заколки, блёстки на всё) | Мод. 01: Y2K/ретро-ностальгия официально в списке усталости 2026 | Три Y2K-стиля выше добавлены **точечно и с новым углом**, не как заезженный шаблон. Поджанры никогда не смешивать |
| **Press Start 2P, Pixelify Sans, Ruslan Display** | Мод. 03: провалены по кириллице экспертным обзором («непригодна к использованию», «низкого качества, с ошибками», «рыхлый набор») | Не использовать в кириллических кадрах, несмотря на пометку «supports Cyrillic» |

---

### ⚙️ ДОПОЛНЕНИЯ К КАТАЛОГУ (не стили)

Эти правки идут в тот же `STYLES.md`, но не как новые записи.

#### Новые layout-архетипы (мод. 04)

К существующим (`cover`, `hero-stopper`, `grid`, `split`, `numbered-list`, `chart`, `photo-bleed`, `terminal-window`, `screenshot`, `interface`) добавить:

- **`bento`** — 5–9 ячеек, явный якорь минимум в 1.5–2× больше следующей ячейки, внутренний паддинг 20–30% площади ячейки, гаттер ≈ половина паддинга. Брать **только** при реально разном весе контента (метрика + цитата + фото + текст). **Deletion-test обязателен:** если любую плитку можно вынуть без потери смысла — это декор, а не композиция. Не брать для последовательного чтения, построчного сравнения и пошаговых процессов.
- **`modular-grid` (тип Виньелли)** — 3–5 колонок × строки-модули для одиночной карточки или постера. Для серии важнее консистентный 8pt spacing grid между слайдами, чем идеальность одного кадра. ⚠ Типовая ошибка: перенос веб-стандарта 12 колонок на постер — для постера/баннера/карточки соцсети норма **3–5**.

#### Чек-лист 8 слоёв для любого нового STYLE TOKEN (мод. 14)

Каждый новый стиль обязан закрывать все восемь слоёв **конкретными терминами**, а не прилагательными. Абстракции («премиальный», «стильный», «современный») не заполняют ни один слой и уходят в дефолт модели; конкретные термины (`risograph`, `claymorphism`, `cel shading`, `halftone dots`, `Kodak Portra 400 emulation`) разворачиваются моделью в весь связанный визуальный кластер.

**Format → Medium → Linework → Shading → Color Palette → Texture → Lighting & Mood → Composition**

При смешении стилей доминантный термин ставить первым — модели весят более ранние термины сильнее.

#### Уточнения оси «Платформы» у всех стилей

- **Telegram** (мод. 08) — не требует «эстетики витрины» и сетки как IG: прощает более текстовый, карточный, утилитарный визуал с высокой типографической иерархией. Узнаваемость канала живёт в **повторяемости шаблона** от поста к посту, а не в разнообразии композиций.
- **WhatsApp-каталог** (мод. 09) — текст на фото **запрещён модерацией Meta** независимо от выбранного стиля серии. Для Status и Channels действуют обычные правила бренд-бейджа в кадре, как в Telegram.
- **Метрики оптимизации по формату** (мод. 07) — Reels: watch time / completion / DM-sends. Carousel: swipe-through / dwell-per-slide / completion. Feed static: likes + saves относительно охвата. Это должно влиять на бриф сценариста, а не только на визуал.
- **Фото-кинематограф → YouTube** (мод. 10) — нишевая логика лица: крупный план и прямой взгляд для бизнес/финанс/образовательного контента (**+36% CTR в Finance/Business**), акцент на объекте или экране, а не на лице, для геймдев- и технических демо (**−3% в Gaming**).
