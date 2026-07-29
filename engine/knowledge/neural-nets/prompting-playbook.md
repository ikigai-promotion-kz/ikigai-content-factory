<!-- синтез neural-nets-research 2026-07-11 из N08 (prompting); ground-truth: _SEED-mcp-catalog.md -->
# Промпт-инжиниринг по моделям — engine-facing playbook

> **Назначение:** словарь промпт-скелетов под каждый класс моделей нашего Higgsfield-MCP — как писать промпт под текст-в-кадре, фотореализм/hero, кино-персонажа, вектор-логотип и видео t2v/i2v, чтобы получить нужный слайд/кадр с первого-второго прохода. Отвечает на вопрос основателя «как правильно промптить каждую нейронку».
> **Как использует движок:** питает арт-директорский слой рендера — `lib/art-director.js` (генерация промпта под выбранную модель) и `lib/genimage.js`/`lib/genvideo.js` (сборка финального промпта перед вызовом generate_image/generate_video). Сейчас **reference-слой, не runtime**: `lib/corpus.js` этот файл пока НЕ читает, движок остаётся fal-first. Заготовка под промпт-сборку в ШАГ рендера `/carousel-day`.
> **Дата:** 2026-07-11 · **Источник:** higgsfield.ai + офиц. доки + _SEED-mcp-catalog.md

---

## TL;DR — решения одной строкой

- **Единого шаблона нет** — каждый класс моделей хочет свою структуру промпта: текст-в-кадре → точная цитата в кавычках + дизайн-контроль; фотореализм → формула `Subject + Action + Scene` + фото-параметр; кино-персонаж → identity anchor раз, не переописание лица; вектор → геометрия, не декоративность.
- **Текст в кадре** (`gpt_image_2` / `openai_hazel`): точная цитата в двойных кавычках + прописать сложные слова по буквам + явный шрифт/вес/цвет/позиция. Текст = **дизайн-требование, а не декорация**.
- **Фотореализм/hero** (`nano_banana_pro` / `seedream_v5_*`): официальная формула Google `Subject + Action + Scene` + **минимум один фото-параметр** (объектив 35/50/85mm, свет, realism-триггер). Промпт как арт-директорский бриф работает лучше тег-листа.
- **Кино-персонаж** (`soul_2` / `soul_cinematic` / `cinematic_studio_*`): описать лицо **один раз** при обучении Soul ID → дальше только сцена/настроение/кадр, лицо не переописывать.
- **Вектор/лого** (`recraft_v4_1`, `model_type=vector`): геометрическая структура, «lock» формулировки стиля дословно между генерациями сета иконок.
- **Правки image (i2i)**: язык **Lock / Change / Amount / Constraints** — image-модели НЕ имеют отдельного `negative_prompt` в seed, нежелательное режется позитивным языком.
- **Видео**: база — [video-craft.md §M10](../video-craft.md) (6-слойный промпт), здесь только модель-специфика поверх. Kling → негатив 3-5 терминов; Veo → блоки `Dialogue:`/`SFX:`/`Ambient noise:`; Seedance → 1-2 субъекта/2-4 предложения, тайм-код по бит.
- **Camera-controls**: 64 именованных пресета (`Dolly In`, `360 Orbit`, `Crane Up`…) — передавать имя пресета вместо описания камеры текстом (экономит промпт).
- **Single-shot (наш вывод)**: один слайд карусели = **один вызов** с полным промптом, а не сборка из наложенных генераций (иначе рассинхрон света/стиля).

---

## Класс (а) — Текст-в-кадре: `gpt_image_2`, `openai_hazel`, `recraft_v4_1`

**Назначение:** baked-текст внутри картинки — заголовки слайдов, инфографика, упаковка, UI-мокапы, баннер с оффером.

**Скелет промпта:**
```
[Сцена/фон], [объект/макет как дизайн-требование],
точная надпись: "ТОЧНЫЙ ТЕКСТ ЗАГЛАВНЫМИ",
шрифт [гарнитура/вес], цвет [HEX/название], позиция [top-center / bottom-third],
[стиль: photoreal / flat design / editorial],
[назначение: ad / infographic / UI mock — задаёт уровень полировки]
```

| Правило | Деталь |
|---|---|
| Кавычки обязательны | Точную цитату — в двойных кавычках; сложные слова/бренды прописывать по буквам, если модель «плывёт» |
| Текст = дизайн-требование | GPT Image 2 / Hazel заявлены с 95%+ точностью текста, вкл. не-латиницу (кириллица/японский/корейский/хинди) — трактовать текст как макет, а не декор |
| Порядок промпта | фон/сцена → субъект → ключевые детали → ограничения; указать intended use (ad/UI mock/infographic) — задаёт уровень полировки |
| Quality-градация | Мелкий/плотный текст, инфографика, close-up портреты — сравнивать `quality: medium` vs `high` перед финалом, не сразу `high` |
| Recraft (вектор) | Задавать **геометрическую структуру**, не декоративность: «Geometric fox head, minimal vector logo, clean lines, contained in a circular badge, no text, flat design, two-color» ≫ «cool fox logo». Для сетов иконок — «lock» формулировку стиля дословно между генерациями (24×24/16×16 grid, consistent stroke width) |

**When-to-use под наши задачи:** слайд карусели с заголовком/цифрой в кадре, баннер с оффером «IKIGAI PROMOTION», инфографика/схема, лого/иконка (только Recraft — настоящий SVG в каталоге). Точные `id`/params — см. [higgsfield-image-models.md](higgsfield-image-models.md).

> ⚠ **LOW-CONFIDENCE по кириллице:** гайды заявляют высокую точность не-латиницы, но явного теста именно кириллицы в найденных источниках нет (акцент на японском/корейском/китайском/хинди). Проверять на практике (пересекается с N01).

---

## Класс (б) — Фотореализм / hero: `nano_banana_pro`, `seedream_v5_pro/lite`

**Назначение:** hero-баннеры, портретные/лайфстайл-карусели, e-commerce фото продукта в реалистичной сцене.

**Скелет (официальная формула Google):** `Subject + Action + Scene` + **обязательно ≥1 фото-параметр:**
```
[кто в кадре] [что делает] [где/окружение],
объектив [35 / 50 / 85mm], свет [natural window light / golden hour / Rembrandt],
realism-триггер [photorealistic / cinematic realism],
[кадрирование, глубина резкости, палитра]
```

| Правило | Деталь |
|---|---|
| Промпт как арт-директорский бриф | Nano Banana Pro «рассуждает о сцене до рендера» — читаемый бриф (кто / что делает / где / какой свет / как закадрирован / точный текст) работает лучше короткого тег-листа |
| Продакшн-формула | «editorial cover quality, impeccable lighting, lifelike skin texture, micro-details of hair/pores/fabric fibers; 8k, shallow depth of field, soft natural fill + strong golden rim light» |
| Правки (i2i) | Явный язык **Lock / Change / Amount / Constraints**: что не трогать (обычно лицо + layout), что именно меняем, насколько сильно, что нельзя сломать |
| Seedream | Visual reasoning + instruction-edit по seed — тот же принцип «инструкция как редактура», не только генерация с нуля; сильна в 2K/4K и точных трансформациях (см. N01) |

**When-to-use под наши задачи:** hero-баннер поста, лайфстайл-слайды с людьми, продуктовое фото в сцене. Точные `id`/params (resolution 1k/2k/4k, AR) — [higgsfield-image-models.md](higgsfield-image-models.md).

---

## Класс (в) — Кино-персонаж: `soul_2`/`soul_cinematic`, `cinematic_studio_2_5`/`_3_0`

**Назначение:** серийный персонаж бренда через десятки слайдов/Reels (один Soul ID → много сцен), premium editorial/cinematic hero.

**Скелет:** `identity anchor (Soul ID, задаётся ОДИН раз при обучении) + сцена/настроение/кадр` — **без переописания лица в каждом промпте.**

| Модель | Промпт-специфика |
|---|---|
| `soul_2` / Soul Cinema | «Soul»-теги фиксируют лицо/тело/экспрессию: персонаж описывается один раз («input a descriptive prompt once → persistent identity, referenced forever»), обучение ~3-5 мин. Дальше промпт = только сцена + свет + кадр |
| `soul_cinematic` | Дополнительно **Soul HEX** — точный контроль цвета поверх Soul ID; сильна в close-up, mood-driven, кинематографической глубине |
| `cinematic_studio_2_5`/`_3_0` | Камера + жанр (action/horror/noir/drama/epic) + свет с Kelvin + композиция. «MCSLA»-формула (Movement/Camera/Subject/Light/Ambience) соответствует духу 6-слойного промпта [video-craft §M10](../video-craft.md) |

**When-to-use под наши задачи:** «одно лицо бренда» на всех слайдах карусели, серийный герой Reels, premium cinematic hero-кадр. Точные `id`/params — [higgsfield-image-models.md](higgsfield-image-models.md) (Soul нет 4:5) и [higgsfield-video-models.md](higgsfield-video-models.md).

> ⚠ **LOW-CONFIDENCE:** «MCSLA»-формула и «DISCIPLINE framework» встречаются в стороннем (не-Higgsfield) GitHub-каталоге промпт-скиллов — это чужая систематизация поверх Higgsfield, не официальная терминология. Полезна как мнемоника, но не как «официальный термин».

---

## Класс (г) — Вектор/лого: `recraft_v4_1` (`model_type=vector`)

См. класс (а): структурные промпты, geometric/flat-design язык, «lock» стиля между генерациями сета. Единственная модель каталога с настоящим SVG-выводом. Кириллица слабее latin (см. N01).

---

## Класс (д) — Видео t2v/i2v: Kling / Veo / Seedance / (Sora)

**База — [video-craft.md §M10](../video-craft.md)** (6-слойный промпт, camera + subject motion раздельно, негатив 3-5 терминов, i2v-vs-t2v gate). Здесь — **только модель-специфика поверх M10, без дублирования.**

| Модель (seed id) | Специфика поверх 6-слойного промпта |
|---|---|
| **Kling 3.0** (`kling3_0`) | Негатив явно рекомендован против sliding feet / extra fingers / morphing, но **не более 3-5 терминов** (иначе анимация «стифф», over-constraining). Люди: «deformed hands, incorrect finger count, asymmetrical facial features». Продукт: «logo distortion, text warping, brand color shifts» |
| **Veo 3.1** (`veo3_1`) | Аудио — три явных блока: `Dialogue:` (речь строго в кавычках — `A woman says, "We have to leave now."`), `SFX:` (конкретные звуки), `Ambient noise:` (фон). Негатив — через естественный язык внутри промпта («Negative: no motion blur, no face distortion…»); позитив делает 90% работы, негатив — только для повторяющихся deal-breakers |
| **Seedance 2.0** (`seedance_2_0`) | **1-2 субъекта, 2-4 предложения на промпт** — 3 субъекта в 3 локациях = 3 отдельные генерации, склеенные в посте, НЕ один промпт. Multi-shot — явная нумерация бит с тайм-кодом («0-3s: extreme close-up eyes widening; 3-7s: dolly out to medium…») с аркой calm→threat→transformation→aftermath. Референсы называть явно: «use composition from Image 1», «follow action from Video 2». Персонаж в multi-shot — 1-3 референс-фото |
| **Sora 2** ⚠ | Сценарный (storyboard) стиль: camera framing/angle → depth of field/focus → action beats → lighting/palette. Диалог — **отдельным блоком под описанием сцены**, реплики короткие, спикеры подписаны последовательно. Cameo — явное revocable-разрешение на чужой likeness |

> ⚠ **Sora 2 в MCP не подтверждён отдельным `id`** (есть в UI-меню, но в `models_explore list` дампа 2026-07-11 отдельного id нет — см. N02/seed). Промпт-гайд OpenAI актуален для случая, если/когда появится доступ через MCP.

> ⚠ **`negative_prompt` per video-модель — проверить в MCP.** Seed НЕ фиксирует поле `negative_prompt`/`negative` ни для одной video-модели явно. Kling — поддержка негатив-списка подтверждена веб-гайдами провайдера; Veo — негатив как часть натурального языка, не факт что отдельный API-параметр в нашем MCP. Не передавать `negative_prompt` как API-параметр без проверки.

### Словарь camera-controls (Cinematic Cameras, живой каталог higgsfield.ai/camera-controls, 2026-07-11)

64 именованных пресета — передавать **имя пресета** (`preset_id`) вместо word-by-word описания движения (экономит промпт, снижает bloat). Заменяет слой 1 (камера) 6-слойного промпта:

`General · Static · Handheld · Dolly In/Out/Left/Right · Super Dolly In/Out · Double Dolly · Dolly Zoom In/Out · Crash Zoom In/Out · Rapid Zoom In/Out · Zoom In/Out · YoYo Zoom · Pan Left/Right · Tilt Up/Down · Arc Left/Right · 360 Orbit · 3D Rotation · Lazy Susan · Crane Up/Down · Crane Over The Head · Jib Up/Down · Overhead · Aerial Pullback · FPV Drone · Hyperlapse · Timelapse (Glam/Human/Landscape) · Whip Pan · Dutch Angle · Fisheye · Snorricam · Car Grip · Car Chasing · Road Rush · Object POV · Head Tracking · Eyes In · Mouth In · Eating Zoom · Through Object In/Out · Flying Cam Transition · Focus Change · Bullet Time · Low Shutter · Wiggle · Incline · Buckle Up · Robo Arm · Hero Cam · Glam · BTS`

- **Для продуктовых/предметных карусельных видео** предпочтительны `Dolly*` / `Zoom*` / `360 Orbit` / `Static` / `Overhead`. Пресеты, завязанные на людей-в-кадре (`Eyes In` / `Mouth In` / `Head Tracking` / `Snorricam` / `Buckle Up`) — только когда в кадре есть человек.
- Соответствует словарю движения камеры [video-craft §M10](../video-craft.md) (dolly/pan/tilt/orbit/push-in/crane/zoom/handheld) — Higgsfield добавляет именованные пресеты **сверх** свободного текста.
- ⚠ Число пресетов расходится по источникам (страница camera-controls «50+», сторонний блог «100+»); зафиксировано **64** из живого дампа страницы на дату — приоритет счётному факту.

---

## Чек-лист «single-shot» (карусель — наш вывод, День 6, WARMUP-IKIGAIPROMOTION.md)

- [ ] Один слайд карусели = **один вызов** генерации с полным промптом (layout + текст + композиция + стиль), не сборка из наложенных генераций/слоёв.
- [ ] Весь baked-текст слайда (заголовок, цифры, подпись) — в одном промпте с точным плейсментом («subject occupies left 60%, right 40% empty for text block, top-aligned»), а не отдельным проходом.
- [ ] Стиль/свет/цвет — одна референс-пачка на слайд; не смешивать i2i-референсы разных генераций в одном кадре (риск style bleed, см. [video-craft §M11](../video-craft.md)).
- [ ] Слайд не помещается в один промпт (слишком много независимых объектов/сцен) → сигнал разбить на **два слайда**, а не на два прохода генерации одного слайда.
- [ ] Расширение формата (9:16→4:5→1:1) — через `outpaint`/`reframe` уже сгенерированного слайда, не повторная генерация с нуля (см. [video-craft §M11](../video-craft.md), правило 25-30% за проход).

---

## Особенности и грабли

- **Image-модели без `negative_prompt`.** У `gpt_image_2` / `nano_banana_pro` / `seedream_*` / `recraft_v4_1` / `openai_hazel` в seed-каталоге **нет отдельного `negative_prompt`-параметра** — контроль нежелательного через позитивный язык редактирования (Lock/Change/Amount/Constraints) или явное «no text» / «no watermark» внутри основного промпта. Не пытаться передавать `negative_prompt` как API-параметр image-моделям без проверки в MCP.
- **Video-модели расходятся по негативу** — см. ⚠-блок выше (Kling да; Veo — натуральный язык; отдельный API-параметр проверить в MCP).
- **Кириллица** — ⚠ LOW-CONFIDENCE, проверять на практике (см. класс (а) и N01).
- **«MCSLA» / «DISCIPLINE»** — ⚠ LOW-CONFIDENCE как «официальный термин» (стороннее, не Higgsfield), полезно как мнемоника.
- **Sora 2** — cameo и доступ через MCP не подтверждён (см. N02/seed).

## Свежесть (2025-2026)

- **GPT Image 2** (ChatGPT Images 2.0) — релиз 2026-04-21: 95%+ точность текста, thinking mode, до 16 референс-изображений, native 4K.
- **Nano Banana Pro** — официальный prompting-гайд Google (blog.google, cloud.google.com): «reasoning перед рисованием» как ключевое новое поведение vs прошлых версий.
- **Camera Controls** — живой каталог, **64 пресета** на дату снятия (2026-07-11); маркетинг заявляет «50+»/«100+» — приоритет счётному факту из дампа.

---

## Связь с движком

| Куда встроить | Что конкретно добавить |
|---|---|
| **`lib/art-director.js`** (генерация промпта) | Роутер промпт-скелета по классу выбранной модели: text-в-кадре → скелет (а) с кавычками; фотореализм → формула `Subject+Action+Scene`+фото-параметр (б); персонаж → Soul-anchor (в); вектор → geometric-скелет (г) |
| **`lib/genimage.js`** | Перед вызовом `generate_image` — НЕ добавлять `negative_prompt` для image-моделей (его нет в API); нежелательное сворачивать в позитивный Lock/Change-язык |
| **`lib/genvideo.js`** + [video-craft §M10](../video-craft.md) | Модель-специфика поверх 6-слойного промпта: Kling негатив 3-5; Veo блоки `Dialogue:`/`SFX:`/`Ambient noise:`; Seedance 1-2 субъекта + тайм-код бит; camera-preset вместо слоя 1 |
| **model-router** ([higgsfield-image-models.md](higgsfield-image-models.md) / [higgsfield-video-models.md](higgsfield-video-models.md)) | Кросс-ссылка: выбор модели по задаче — там; выбор структуры промпта под выбранную модель — здесь |
| **`/carousel-day` ШАГ рендера** | Внедрить чек-лист «single-shot» как guard перед вызовом рендера: один слайд = один промпт; расширение AR — через `outpaint`/`reframe`, не регенерация |

**НЕ дублирует** [video-craft.md §M10/§M11](../video-craft.md) — 6-слойный промпт, negative-стратегия базовая и правило 25-30% outpaint живут там, здесь только модель-специфика поверх и кросс-ссылки.
