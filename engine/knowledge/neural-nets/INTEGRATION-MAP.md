<!-- синтез neural-nets-research 2026-07-11 из N01–N09 (8 файлов); ground-truth: _SEED-mcp-catalog.md -->
# neural-nets — INTEGRATION-MAP (что и куда встраивать)

> **Назначение:** сквозной чек-лист «находка → файл-цель → секция → что добавить» по всей базе `knowledge/neural-nets/`. Единая точка, из которой видно, какие выводы research-слоя во что вливаются, и в каком порядке подключать. Это план интеграции, а не сам код.
> **Как использует движок:** сейчас **никак — reference-слой.** `lib/corpus.js` в runtime читает только `knowledge/video-craft.md`, `knowledge/creo-formats.md` (второй system-блок арт-директора/сценариста) и системный промпт `prompts/art-director.md`. Поэтому находки, влитые в эти **три ⭐-файла, меняют поведение движка БЕЗ правки кода** — их и делаем первыми. Всё остальное (`lib/*.js`, `model-router`) — правки кода, отложенный слой.
> **Дата:** 2026-07-11 · **Источник:** higgsfield.ai + офиц. доки + _SEED-mcp-catalog.md

---

## Легенда

- **⭐ Файл-цель** — читается движком в runtime через `lib/corpus.js`-цепочку; влитая находка работает сразу, без кода.
- **Источник** — модуль-донор: N01 image · N02 video · N03 audio · N04+05 tools · N06 supercomputer · N07 skills · N08 prompting · N09 frontier.
- Метки надёжности сохранены: `⚠ проверить в MCP`, `⚠ LOW-CONFIDENCE`.
- Ground-truth `id`/параметров — всегда `../research/neural-nets/_SEED-mcp-catalog.md`, не веб.

---

## ⭐ БЛОК A — читаемое движком в runtime (правим первым, кода не трогаем)

### ⭐ `prompts/art-director.md` (системный промпт арт-директора)

| Находка | Файл-цель | Секция | Что добавить |
|---|---|---|---|
| Полный id-роутинг статики: text-hero→`gpt_image_2`; инфографика→`nano_banana_pro`; вектор→`recraft_v4_1`(vector); character-lock→`soul_2`/`seedream_v4_5`; тренд→`seedream_v5_pro`; HEX-баннер→`flux_2`; spot-edit→`flux_kontext`; дефолт батча→`nano_banana_2` (N01) | `prompts/art-director.md` | §«Выбор engine — ОСОЗНАННО под стиль» | Расширить обойму за пределы 4 слугов (`gpt-image`/`nano-banana-pro`/`cinema`/`nano-banana`): добавить vector/character/trend/HEX-ветки с точными `id`. Держать как «WOW-обойму», не экономию. |
| Кириллица прямо подтверждена ТОЛЬКО у `gpt_image_2`; у Nano/Seedream/FLUX.2/Recraft мультиязычность заявлена, но ru не проверен `⚠ проверить в MCP` (N01, N08) | `prompts/art-director.md` | §«Текст на слайде» | Усилить правило: критичный русский текст → `gpt_image_2` (`text_baked`), крупным кеглем и одним блоком на кадр. Перед продакшн-баннером — тест-строка на ru на выбранной модели. |
| Soul ID = обучаемая идентичность (1 тренировка, ≥20 фото), НЕ per-call референс — иной механизм, чем `image_references` (N01, N04) | `prompts/art-director.md` | §«Continuity (один мир / один герой)» | Дополнить `continuity: lock`: для «одного лица бренда» на серии — Soul ID (обучил раз → держит без реф в каждом промпте), а не переописание лица per-слайд. |
| Промпт-скелеты по классам: текст→точная цитата в кавычках+шрифт/вес/цвет/позиция; фотореализм→`Subject+Action+Scene`+фото-параметр; персонаж→identity anchor раз; вектор→геометрия не декор (N08) | `prompts/art-director.md` | §«Выбор engine» / §«Формат вывода» (`scene_prompt`) | Прошить, что структура `scene_prompt` зависит от класса модели; дать 4 мини-скелета как ориентир для сборки `scene_prompt`. |
| Image-модели БЕЗ `negative_prompt` — нежелательное режется позитивным языком Lock/Change/Amount/Constraints (N08) | `prompts/art-director.md` | §«Анти-паттерны» / §«Текст на слайде» | Правило: не полагаться на негатив у статики; «no text/no watermark» — внутри позитивного промпта; правки — язык Lock/Change. |
| Single-shot: 1 слайд = 1 вызов; не помещается в промпт → делить на 2 слайда, не на 2 прохода (N08) | `prompts/art-director.md` | §«Визуальные якоря 10/10» | Добавить якорь-guard: один слайд — один самодостаточный промпт; расширение AR — `outpaint`/`reframe`, не регенерация. |
| Внешние эталоны для брифинга: Runway Gen-4.5 (#1 AA, физика/temporal), Ideogram 3.0 (текст-рендер), кросс-принцип «референс описывает внешность → в промпте только сцена»; честные лимиты AI-видео (causal/permanence/success bias) (N09) | `prompts/art-director.md` | §«Главный закон: КОНТЕКСТ КОРОЛЬ» (врезка-брифинг) | Блок «внешние эталоны/границы» для ответа клиенту, что умеет лучший инструмент рынка и где предел AI-видео вообще. |
| Cinema Studio Elements (`@tag`: Character+Location+Prop) держат character-drift на уровне ВСЕЙ сцены, не только лица — но `⚠` web-UI, не MCP-runtime (N07) | `prompts/art-director.md` | §«Continuity» | Пометка: консистентность «лицо+локация+реквизит» — через Elements (пока браузерный шаг), Soul ID покрывает только лицо. |
| Паттерны промптинга AI Employees: Ai Cinematographer → структура cinema-промпта; Script Writer → 3 формата скрипта (N06) | `prompts/art-director.md` | §«КОРПУС ЗНАНИЙ» (кросс-ссылка) | Кросс-ссылка на референс-структуры, без дублирования 6-слойного промпта. |

### ⭐ `knowledge/video-craft.md` (справочник видео-ремесла)

| Находка | Файл-цель | Секция | Что добавить |
|---|---|---|---|
| Шпаргалка «Роутинг за 30 сек»: черновик→`minimax_hailuo`/`grok_video`/`kling3_0`, финал→`seedance_2_0`/`veo3_1`; кредит-вилка ~6→~90 (N02) | `knowledge/video-craft.md` | §«Роутер видео-моделей (M10)» → «Таблица: уникальная функция vs наш стек» | Внести таблицу-источник выбора `params.model` + кредитную вилку как cost-эвристику. |
| Модель-специфика поверх 6-слойного: Kling негатив 3-5; Veo блоки `Dialogue:`/`SFX:`/`Ambient noise:`; Seedance 1-2 субъекта+тайм-код бит; camera-preset вместо слоя 1 (N08) | `knowledge/video-craft.md` | §M10 → «6-слойная структура» / «Negative prompts» / «Словарь движения камеры» | Дополнить per-модель нюансами; 64 именованных camera-пресета `preset_id` сверх свободного текста. `⚠ negative_prompt` как API-поле — проверить в MCP. |
| Kling O1 Edit — флоу `/video-edit` (вход 3–10 с, вывод 720p): relight/object-swap/reframe/recolor целиком по клипу вместо перегенерации; `⚠` отдельного video-`id` в дампе нет (N02) | `knowledge/video-craft.md` | §«Relight и постобработка (M11)» | Добавить как альтернативу перегенерации клипа. |
| Нативное аудио видео-моделей (Seedance/Veo/Wan/Kling/Gemini/Grok): `sound:on`/`generate_audio:true` дешевле и синхроннее, чем отдельный TTS+lipsync; но native ≠ гарантированно хороший звук — критичный бренд-звук отдельно (N03, N02) | `knowledge/video-craft.md` | §«Звук (M04)» / §M10 | Правило «нативный аудио > TTS+lipsync», таблица §6 audio-стека; исключение — джингл/конкретный голос через N03. |
| Runway **Gen-4.5** (1247 Elo) и Luma **Ray3.14** (HDR/EXR-дефолт) новее описанных Gen-4/Ray3; Luma = позитив-онли (негатив-правило M10 на неё НЕ распространяется) (N09) | `knowledge/video-craft.md` | §M10 (апдейт версий) | Обновить эталоны; явно зафиксировать, что «позитив-онли» — специфика Luma, не универсальное правило нашего роутера. |
| Пост-обработка, которой НЕТ в M11: `video_deflicker` (мерцание на стыках AI-генераций), `sam_3_video`/`video_background_remover` (bg-remove видео) (N04+05) | `knowledge/video-craft.md` | §M11 | Добавить deflicker (обязателен при склейке разных моделей — риск мерцания, §M03) и video-bg-remove. |
| `cinematic_studio_2_5` — image-часть той же оптической системы, что видео Cinema Studio (N01) | `knowledge/video-craft.md` | §M10 (кросс-ссылка) | Пометка связи image↔video Cinema Studio; словарь `id` — в `higgsfield-*-models.md`. |

### ⭐ `knowledge/creo-formats.md` (справочник форматов креативов)

| Находка | Файл-цель | Секция | Что добавить |
|---|---|---|---|
| `seedance_2_0` — дефолт «карусель→видео с озвучкой» (до 12 рефов, аудио+видео одним проходом); `marketing_studio_video` — массовые UGC @ваш_аккаунт; `higgsfield_preset` — тренды без брифинга (N02) | `knowledge/creo-formats.md` | §«4. Форматы вне статики (Reels / Stories, на будущее)» | Дописать движки под карусель→видео: дефолт + массовый UGC + трендовый пресет. |
| Карусель = БЕЗ звука; при экспорте в Reels активировать audio-ветку: RU-закадр с эмоцией → `text2speech_v2:elevenlabs`; персонаж с голосом → нативный аудио видео-модели (N03) | `knowledge/creo-formats.md` | §4 | Флаг «статика без звука»; ru-TTS-ветку только на видео-переходе. |
| Финальная доводка карусели/баннера в Figma/Photoshop-плагинах (Remove BG/Expand/Relight/Angles прямо в файле) экономит round-trip «MCP→скачал→импортировал» (N07) | `knowledge/creo-formats.md` | §«Редактирование баннера (урок 9)» | Дописать плагин-путь доводки как альтернативу MCP round-trip (онлайн, те же кредиты). |
| `product-photoshoot social_carousel` (CLI-скилл, бэкенд `gpt_image_2`) — готовая связная серия 3–10 слайдов «из коробки» как альтернатива fal-first (N07) | `knowledge/creo-formats.md` | §«1. Быстрая таблица выбора» / §2 | Опция-ветка рендера серии с авто-визуальной связностью (тему/текст задаём вручную). |
| Пробел рынка: real-time streaming avatar — единственный функциональный gap (нет в seed вообще → HeyGen LiveAvatar/D-ID); Genie 3 (world models) — «следить, не внедрять» (N09) | `knowledge/creo-formats.md` | §«3. Пробелы извлечения» / §4 | Пометить gap в роадмапе форматов, чтоб не обещать клиенту живого аватара из нашего стека. |
| Social Connectors Supercomputer (`publish_instagram_carousel`, `publish_threads_video`…) — потенциальный автопостинг минуя Upload-Post; `⚠` ни один не в нашем SEED — не считать доступными (N06) | `knowledge/creo-formats.md` | §4 | Пометка «⚠ проверить в MCP» — путь автопостинга, недоступный в текущем коннекторе. |

---

## БЛОК B — код-слой и роутеры (отложенный, требует правки кода)

> Не читается `lib/corpus.js` в runtime. Это заготовка под Higgsfield-ветку рендера; движок остаётся fal-first + прямые `mcp__higgsfield__*`.

### `lib/art-director.js` (роутер модели/пост-обработки под арт-спек)

| Находка | Файл-цель | Секция | Что добавить |
|---|---|---|---|
| Правила выбора `id` по интенту слайда (см. блок A → art-director.md, тот же роутинг) (N01) | `lib/art-director.js` | функция выбора модели | Кодировать роутер интент→`id`; дефолт быстрого батча — `nano_banana_2`. |
| Роутер пост-обработки/студии «задача→инструмент»: character-lock→Soul ID; оживить слайд→`animation_actions`; URL→ad→`marketing_studio_video`; вебинар→клипы→`personal_clipper_create`; горизонт→вертикаль→`shorts_studio_create`; точечный фикс→`nano_banana_pro_inpaint`; AR картинки→`outpaint_image` (НЕ `reframe`); explainer→`explainer_video` (N04+05) | `lib/art-director.js` | роутер пост-обработки | Кодировать развилку инструментов; `reframe` — только видео, не для картинок. |
| Роутер промпт-скелета по классу выбранной модели (текст/фотореализм/персонаж/вектор) (N08) | `lib/art-director.js` | генерация промпта | Скелет промпта выбирать по классу модели, не единый шаблон. |

### `lib/genimage.js` (вызов `generate_image`)

| Находка | Файл-цель | Секция | Что добавить |
|---|---|---|---|
| Higgsfield-ветка рядом с fal: `params.model` из роутера + маппинг resolution/quality/AR по seed (N01) | `lib/genimage.js` | ветка провайдера | Добавить Higgsfield-путь; параметры строго из `_SEED-mcp-catalog.md`. |
| Fallback AR: 4:5 НЕТ у Soul/`gpt_image_2`/`flux_2` — проверять доступность, иначе fallback (N01) | `lib/genimage.js` | сборка params | Guard на AR перед вызовом. |
| Критичный ru-текст → `gpt_image_2` или overlay; язык правок i2i — Lock/Change/Amount; НЕ передавать `negative_prompt` image-моделям (нет в API) (N01, N08) | `lib/genimage.js` | сборка промпта | Прошить ru-кастинг и запрет `negative_prompt` для статики. |

### `lib/genvideo.js` (будущий — файла ещё нет)

| Находка | Файл-цель | Секция | Что добавить |
|---|---|---|---|
| Модель-специфика поверх 6-слойного промпта video-craft §M10 (Kling негатив 3-5; Veo блоки Dialogue/SFX/Ambient; Seedance 1-2 субъекта+тайм-код; camera-preset вместо слоя 1) (N08, N02) | `lib/genvideo.js` | сборка video-промпта | Создать при появлении video-ветки; база — §M10, здесь только надстройка per-модель. |

### `model-router` (будущий, выбор `generate_video.model` / TTS)

| Находка | Файл-цель | Секция | Что добавить |
|---|---|---|---|
| Правила-грабли видео: Wan только с референсом (не t2v); MiniMax не для мульти-субъекта (anatomy breakdown); Cinema Studio multi-shot ⊥ Start/End при персонажах; Sora — не роутить (нет `id` в MCP `⚠`) (N02) | `model-router` | правила видео | Кодировать как hard-guards до отправки. |
| Рендер по умолчанию — прямой `mcp__higgsfield__*`, НЕ Supercomputer (там текстовые шаги оркестратора тоже жгут кредиты; backend и кредит-пул общие) (N06) | `model-router` | политика рендера | Дефолт «прямой MCP»; Supercomputer точечно (демо-апп/референс/connectors). |
| Выбор TTS: RU-эмоция→`text2speech_v2:elevenlabs`; RU-бюджет/клон→`cozy_voice`; RU-realtime→`inworld_text_to_speech` (Svetlana/Elena/Dmitry/Nikolai); EN/ZH sound-design→`seed_audio`; НЕ давать `seed_audio` русский текст (EN/ZH only) (N03) | `model-router` | правила TTS | Кодировать RU-first выбор движка озвучки. |
| Real-time streaming avatar → вне стека (HeyGen LiveAvatar/D-ID), не роутить внутрь Higgsfield (N09) | `model-router` | развилка «вне стека» | Явный отказ-роут на внешний инструмент. |

### `/carousel-day` (ШАГ рендера / ШАГ 2.5 / ветка «оживить»)

| Находка | Файл-цель | Секция | Что добавить |
|---|---|---|---|
| Развилка провайдера fal↔Higgsfield по типу слайда: vector/character/HEX-locked → Higgsfield (N01, N07) | `/carousel-day` | ШАГ рендера / ШАГ 2.5 | Маршрутизация провайдера; `social_carousel` как альтернатива fal-first. |
| Ветка «оживить/доработать»: статика остаётся в image-домене (Angles/Shots/Inpaint/Expand); i2v-мост (Camera Controls/Animate) — только когда нужен Reels-клип (видео-стоимость); web-only студии — «ручной браузерный шаг» (N04+05) | `/carousel-day` | ШАГ «оживить/доработать» | Развилка image-доводка vs i2v-мост; пометка web-only шагов. |
| Single-shot guard перед вызовом рендера: 1 слайд = 1 промпт; расширение AR — `outpaint`/`reframe`, не регенерация (N08) | `/carousel-day` | ШАГ рендера (guard) | Внедрить чек-лист single-shot как предохранитель. |

### Себестоимость (cost-модель прогона)

| Находка | Файл-цель | Секция | Что добавить |
|---|---|---|---|
| Через MCP/CLI всё идёт **по кредитам, не по unlimited** (безлимит — только на higgsfield.ai, не в MCP/CLI/Canvas/Supercomputer); e2e картинка+анимация ≈ 200 кредитов (~$10) (N01, N06) | Себестоимость | расчёт карусели | Заложить кредит-математику; web-only студии = ручной шаг/сборка цепочкой `generate_*`. |
| Кредитный курс: Seedance 2.0 22кр/5с@720p→110/5с@4K; Kling 3.0 7/5с@720p; Nano Banana Pro 2кр/изобр (4@4K); GPT Image 1кр/изобр (сверять `show_plans_and_credits`) (N06) | Себестоимость | cost/шаг | Таблица курса как эвристика оценки прогона. |

### `client-safety` / КП-канон

| Находка | Файл-цель | Секция | Что добавить |
|---|---|---|---|
| Consent обязателен для `create_voice` — Higgsfield запрещает клонировать реальных людей без разрешения (юр-риск для клиентских КП) (N03) | client-safety / КП-канон | правило голоса | Запрет клонировать голос конкурента/публичной персоны без consent. |

---

## Приоритет подключения (порядок работ)

1. **⭐ Блок A — три runtime-файла** (`prompts/art-director.md`, `video-craft.md`, `creo-formats.md`). Меняют поведение движка без кода, читаются `lib/corpus.js` уже сегодня. **Начинать отсюда.**
2. **Верификация в MCP** — до продакшна прогнать `models_explore`/`show_plans_and_credits`/`presets_show`: снять метки `⚠ проверить в MCP` (ru-кириллица у выбранных моделей, Sora-`id`, `wan2_7`-лимиты, Cinema Studio 3.5/Elements, `sync_so`-движки, ToS `sonilo`/`mirelo`, версия ElevenLabs в `text2speech_v2`).
3. **Блок B — код** (`lib/art-director.js` → `lib/genimage.js` → `/carousel-day` ветки → `model-router`/`lib/genvideo.js`). Только когда движку понадобится Higgsfield-ветка рендера / видео-контур.

---

## Связь с движком

- **Эта карта — не runtime-артефакт, а план.** Сам движок её не читает; читает три ⭐-файла блока A. Максимальный рычаг без кода — вливать находки туда.
- **Sora 2 — системный риск:** OpenAI сворачивает Sora (API off 24.09.2026), отдельного `id` в MCP-дампе 2026-07-11 нет. Промпты держать model-agnostic (shot/motion/lighting) → переносимы на `seedance_2_0`/`veo3_1`.
- **Не дублировать** `higgsfield-image-models.md` / `higgsfield-video-models.md` (словари `id`) и `video-craft.md` §M10/M11 (6-слойный промпт, negative-стратегия, правило 25-30% outpaint) — здесь только адреса встройки, детали по кросс-ссылкам.
- **Оглавление и ответы на 3 вопроса основателя** (Supercomputer/подключение · дизайн-скиллы · промптинг) — в `INDEX.md`.
