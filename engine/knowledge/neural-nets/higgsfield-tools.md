<!-- синтез neural-nets-research 2026-07-11 из N04 (image-tools) + N05 (video-tools); ground-truth: _SEED-mcp-catalog.md -->
# Higgsfield ФИЧИ/УТИЛИТЫ/СТУДИИ — engine-facing

> **Назначение:** карта не-модельного слоя Higgsfield — apps, студии-обёртки и edit-утилиты поверх `generate_image`/`generate_video`/`generate_audio`. Отвечает на два вопроса движка: (1) какой инструмент решает задачу «оживить слайд / вставить продукт / заменить лицо / перегнать URL в рекламу / нарезать вебинар»; (2) доступен ли он **прямым MCP-тулом**, или это web-only композиция, которую надо воспроизводить цепочкой вызовов. Словарь самих моделей — в `higgsfield-image-models.md` / `higgsfield-video-models.md` (не дублируем).
> **Как использует движок:** питает `lib/art-director.js` (выбор пост-обработки/студии под арт-спек) и ветку рендера в `/carousel-day` (ШАГ «оживить/доработать»). Сейчас **reference-слой, не runtime**: `lib/corpus.js` этот файл пока НЕ читает, движок остаётся fal-first. Заготовка под Higgsfield-ветку доработки статики и i2v-мостов.
> **Дата:** 2026-07-11 · **Источник:** higgsfield.ai + офиц. доки + _SEED-mcp-catalog.md

---

## TL;DR — решения одной строкой

- **Одно «лицо бренда» на всех слайдах/Reels** → обучить `Soul ID` один раз (20+ фото, 3–5 мин) → дальше все apps его подхватывают. Это фундамент всей персонаж-цепочки.
- **Синтетический инфлюенсер без реального прототипа** (юридически чище) → `AI Influencer Studio` (параметрическая сборка) → далее как Soul ID.
- **26 кадров одного персонажа за прогон** (фид/сторис на неделю) → `Photodump Studio`.
- **Фотосет из 1 товарного фото + персонаж** (e-comm лукбук/PDP) → `Fashion Factory` (товар БЕЗ модели на фото!).
- **Фирменный визуальный стиль на каждом слайде без пересказа словами** → `Moodboards` (20–30 своих референсов, БЕЗ лиц в батче).
- **Композитная правка слайда без промпта** (вставить продукт / сменить позу) → `Draw-to-Edit` (рисуешь + до 8 референсов).
- **Точечный фикс** (убрать провод/артефакт, сменить цвет продукта) → `Inpaint` (`nano_banana_pro_inpaint`, кисть-маска).
- **Адаптировать 1 hero под форматы** (9:16→1:1→4:5) → `Expand Image` = `outpaint_image` (prompt-free), **НЕ `reframe`** (это видео).
- **Чистый cutout под брендовый фон** → `Background Remover` = `remove_background`.
- **Заменить лицо в готовом кадре** → `Face Swap`; **перенести весь персонаж в новую сцену** → `Character Swap`.
- **URL клиента → готовый видео-ad за ~2 мин** → `marketing_studio_video` (Click-to-Ad, движок Seedance 2.0).
- **Оживить статичного персонажа в говорящий тизер** → `Lipsync Studio` (`sync_so`, TTS встроен).
- **Длинный вебинар → N вирусных клипов** → `Personal Clipper` (`clipify`) — прямой MCP-тул.
- **Горизонт → вертикаль с готовым стилем** → `Shorts Studio` (`shorts_studio_create`, Gemini Omni Flash).
- **Детерминированная motion-графика/инфографика** (тот же промпт = тот же ролик) → `Vibe Motion` (Remotion-кодоген, ⚠ web-only).
- **Faceless explainer для EdTech** → `explainer_video` (прямой MCP-тул).

---

## 1. Экосистема персонажа (Soul-цепочка) — «обучил лицо один раз → генерируешь бесконечно»

Ядро всего продукта под наш кейс «UGC-персонаж/лицо бренда на серии слайдов и Reels». Всё строится вокруг **Soul ID** — обучаемого identity-слоя поверх `soul_2`.

| Инструмент | Что делает | Ключевые параметры (⚠ не MCP-схема — из блогов) | MCP-статус | When-to-use у нас |
|---|---|---|---|---|
| **Soul ID** | Тренируемая идентичность персонажа: держит лицо/пропорции/кожу across стиль/позу/свет **без референса в каждом промпте** | **20+ фото** одного человека (разные ракурсы, ровный свет, ≥1 в полный рост, без тёмных очков/резких теней), трейн **3–5 мин**; затем выбор во вкладке «Character» | ⚠ проверить в MCP: тренировка вероятно через `show_characters` (train Soul); точные поля не задокументированы | Спикер курса, «лицо IKIGAI PROMOTION», UGC-актёр карусели — любая повторяющаяся личность |
| **AI Influencer Studio** | Параметрическая сборка синтетического персонажа с нуля (вкл. нечеловеческих: Alien/Elf/Mantis…) | Character Type, Gender, Ethnicity, Skin/Eye Color, Skin Conditions (Vitiligo/Freckles — инклюзивность), Age; расширенные Face/Body | ⚠ web-app; в MCP отдельного тула не найдено | Маскот/вымышленный эксперт бренда без привязки к реальному лицу (юридически чище) |
| **Photodump Studio** | Из 1 Soul ID → **26 эстетичных кадров** за прогон | нужен Soul ID (≥25 фото, 3–4 фронтальных лицо-грудь); на старте 2 пресета ⚠ проверить актуальный список | ⚠ web-app; воспроизводится батчем `generate_image` с soul_id | Батч вариаций персонажа на неделю фида/сторис; замена дорогого кастинга |
| **Fashion Factory** | 1 товарное фото + Soul ID → связный кампейн-сет (6 шаблонов, 4 превью за ~1 мин) | **товар НЕ надет на человека** (изолированно/разложен, чистый фон, высокое разрешение) — жёсткое требование | ⚠ web-app | E-comm карусель/КП с товаром (одежда/аксессуары/косметика) — замена фотостудии |
| **Moodboards** | Обучаемый визуальный стиль на СВОИХ референсах (эволюция Soul-пресетов) | до **80 реф.** (рекоменд. 20–30, мин. ~10); высокое разрешение, однородная эстетика, **БЕЗ лиц в батче**; типы Personal/Curated; комбинируется с Soul ID | ⚠ web-app | Держать фид визуально консистентным под бренд-гайд IKIGAI без описания стиля словами |

**Промпт-совет:** для Soul ID — чем разнообразнее выражения/ракурсы в трейн-сете (и ≥1 фото в полный рост), тем стабильнее не только лицо, но и **пропорции тела**. Для Fashion Factory — держи освещение товарного фото близким к выбранному шаблону, иначе плейсмент выглядит «приклеенным».

> **Три разных пути к «своему лицу» — не перепутать:** `Soul ID` = обучение НА реальных фото (макс. консистентность, нужен трейн-сет); `AI Influencer Studio` = сборка синтетического с нуля (нет прототипа); `Character Swap` (см. §2) = разовый перенос с ОДНОГО фото без трейна (быстро, но плывёт на длинных сериях).

---

## 2. Свопы и перенос движения (character/motion transfer)

Замена лица/персонажа/движения в готовом кадре или клипе. Пересекается по назначению — колонка «отличие» критична при выборе.

| Инструмент | Вход → выход | Отличие / лимиты | MCP-тул (seed) | When-to-use |
|---|---|---|---|---|
| **Face Swap** | фото/видео + новое лицо → замена **только лица** | покадровый трекинг геометрии/тона/света; **1 лицо за проход** (мульти-лицо нет); 5 бесплатных image/день, video — платно | ⚠ web-app (`/apps/face-swap`); в MCP как отдельный тул не подтверждён | Быстрый point-фикс: лицо клиента/спикера в готовом шаблонном кадре |
| **Character Swap** | source-персонаж + target-сцена → перенос **всего тела/стиля** в позу и сеттинг таргета | i2i, вход = 2 изображения (не t2i); держит consistency персонажа; 5 бесплатных/день | ⚠ web-app (`/apps/character-swap`) | Концептинг «наш персонаж в разных сценах» без полной Soul ID тренировки |
| **Higgsfield Animate** | фото + референс-видео → оживление по мотиву (motion+мимика+камера) | движок **WAN 2.2-Animate**; режим **Replace** = вставка Soul ID в готовый клип с сохранением перформанса | `animation_actions` — ⚠ соответствие Animate/Replace-режимам проверить в MCP | Оживить статичного Soul-персонажа карусели в короткий тизер; замена «модели» в клипе на бренд-аватар |
| **Recast Studio / Kling Motion Control** | видео + фото персонажа → полная замена персонажа с сохранением моторики/света/физики | НЕ только лицо (в отличие от Face Swap); Voice&Dubbing (RU в списке); реф-клип 3–30 сек | `motion_control` — 3 режима: **recast** / **puppeteer** (⚠ детали в MCP) / **motion-transfer** | «Переиграть» вирусный клип со своим бренд-мэскотом без пересъёмки; трендовый жест-клип с аватаром |

> `animation_actions` (Animate = WAN 2.2) и `motion_control` (recast = Kling) — **разные тулы из разных продуктов**, не взаимозаменяемы по качеству/контролю. Не путать при выборе.

---

## 3. Edit-апы статики (доработка готового изображения)

Prompt-free (в основном) утилиты для доработки уже сгенерированного слайда — дешевле полной перегенерации. Общая методология outpaint/relight/upscale — в `video-craft.md` §M11 (не дублируем); здесь **Higgsfield-специфика** и точные `id`.

| Инструмент | Что делает | Prompt? | MCP-тул / id | When-to-use |
|---|---|---|---|---|
| **Draw-to-Edit** | Рисуешь стрелку/маску + заметка + до **8 референсов** → смена фона/одежды/позы, вставка объекта | prompt-free (Prompt Enhancer достраивает) | ⚠ web-app; движок Nano Banana | Композитная правка: «вставить продукт в готовый кадр», «сменить позу спикера» одним заходом |
| **Inpaint** | Кисть-маска: замена объекта/цвета/выражения, удаление лишнего, i2i-blending | natural-language brush («remove glare», «add sunglasses») | `nano_banana_pro_inpaint`; вход JPG/PNG/WebP до 4K | Точечный фикс слайда: убрать артефакт, сменить цвет продукта под бренд-палитру |
| **Relight** | Ручная перестановка света без перегенерации | слайдеры (не промпт): направление Top/Front/Left…, жёсткость soft↔hard, Brightness %, Color HEX | ⚠ web-app (`/apps/relight`) | «Одна съёмка → N настроений» для статичной карусели (сменить time-of-day/тон) |
| **Expand Image** | Достраивает сцену ЗА кадром под целевой AR, не трогая субъект | **prompt-free** (выбор только AR: 16:9/9:16/4:3/1:1) | `outpaint_image` | Адаптация 1 hero под плейсменты (9:16 сторис / 1:1 фид / 16:9 баннер) без потери лого/лица |
| **Background Remover** | Удаление фона → прозрачный PNG (люди/товары/текст/логотипы) | prompt-free, one-click | `remove_background` | Cutout под композитинг в Fashion Factory / Draw-to-Edit / брендовый фон |
| **Angles** (2.0) | Новый ракурс из 1 фото, **вывод остаётся статикой** | drag Rotation/Tilt/Zoom либо «12 best angles» | ⚠ web-app (`/apps/angles`), Pro-фича | Статичный набор ракурсов продукта/персонажа для каталога — дешевле i2v |
| **Shots** | «1 фото → 9 cinematic angles» + апскейл избранных до 4K | — | ⚠ web-app (`/apps/shots`) | Раскадровка/storyboard из одного кадра |
| **Image Upscale** | Апскейл до 2K/4K | — | `topaz` (Standard/CGI/HiFi/**Text Refine**), `topaz_image_generative` (Redefine/Recovery), `bytedance_image_upscale` | Topaz **Text Refine** — если апскейл рвёт текст-слои карусели; bytedance — быстрый батч |

**Грабли статики:**
- **`reframe` — это НЕ image-тул, а video-утилита** (смена AR готового видео, отдельный плагин для Premiere/AE). Для смены AR **картинки** — только `outpaint_image`/Expand Image. Не маппить image-reframe на `reframe`.
- **Draw-to-Edit vs Inpaint** — разные точки входа: композитная правка с референсами → Draw-to-Edit; точечное «убрать провод» → Inpaint.
- `soul_cast` / `soul_location` в seed-списке `generate_image` — по названию «поместить Soul-персонажа в сцену / привязать локацию», смежны с Character Swap/Fashion Factory, но точное назначение **⚠ проверить в MCP**.
- **`generate_3d` (MCP, image→GLB-меш) ≠ веб-эффект «3D Render»** (`/apps/3d-render` в UI показывает «Generate Video» — вращающийся ролик, не сырой GLB). Для 3D-hero на лендингах интересен GLB-выход — тестировать самим MCP-вызовом, не полагаться на лендинг. **⚠ проверить в MCP.**

---

## 4. Видео-студии (обёртки поверх моделей)

Студии комбинируют модель + пресет + UI-логику. **Ключевой факт для движка:** половина студий — web-only композиции без прямого MCP-тула; их надо воспроизводить цепочкой `generate_*`. Сами видео-модели (Seedance/Kling/Veo и пр.) — в `higgsfield-video-models.md`.

| Студия | Что делает | Движок под капотом | MCP-статус | When-to-use |
|---|---|---|---|---|
| **Marketing Studio / Click-to-Ad** | URL товара/сайта → готовый видео-ad за ~2 мин; авто-парсинг имени/картинок | **Seedance 2.0** (нативное аудио+речь+физика); картинки Nano Banana; аватары Soul 2.0 | ✅ `generate_video` `model:marketing_studio_video`; управление `show_marketing_studio` | **Прямой аналог «сайт клиента → рекламный ролик»** для e-comm/DTC клиентов IKIGAI |
| **Personal Clipper** | Длинное видео (YouTube-ссылка) → N вирусных клипов + субтитры + вертикаль | — | ✅ `personal_clipper_create`/`_status`/`_jobs` — **зовётся прямо из Claude/MCP** | Репёрпосинг вебинаров/выступлений IKIGAI в Reels/Shorts без ручного монтажа |
| **Shorts Studio** | Готовое видео → короткий формат: вертикаль + пейсинг + hook с первых секунд | **Gemini Omni Flash** | ✅ `shorts_studio_create`/`_status`/`_list_presets`/`_create_preset`; исходник max 2 мин | Горизонт (запись презентации/демо) → вертикаль с готовым стилем без ручного реframe |
| **Explainer** | Тема → faceless explainer (визуал + закадр, без ведущего) | Higgsfield Skill | ✅ `explainer_video` (`items[]`+`subtitles`), `resolve_explainer_preset`, `get_youtube_explainer_presets` | Объясняющие Reels/Shorts для EdTech IKIGAI («как работает AI-агент») |
| **Lipsync Studio** | Фото/клип + аудио → говорящее видео; TTS встроен в шаг 2 | InfinitiTalk/Higgsfield Speak/Veo3/Kling (мультимодельный хаб) | ✅ `sync_so` (Sync Lipsync 3); `sync_mode`: bounce/loop/cut_off/silence/remap ⚠ маппинг движков не задокументирован | Статичный аватар → говорящий тизер («отзыв клиента», «CEO представляет продукт») |
| **Cinema Studio 3.5** | «Съёмочная площадка»: Elements (Cast/Location) + AI co-director Mr. Higgs + genre-motion | `cinematic_studio_3_0` / `_video_v2` | ⚠ студия (Elements/Mr.Higgs/collab) — web-only; через MCP только сами модели | Премиум hero/тизер с консистентностью персонажа+локации между генерациями |
| **Sketch/Draw-to-Video** | Скетч → кинематографичное видео, без промпта (модель читает линии) | **Sora 2** | ⚠⚠ **Sora 2 НЕ подтверждён отдельным id в MCP** (см. §6) → fallback: i2v (Kling/Veo/Seedance) со скетчем как start-frame | Пре-визуализация раскадровки — только если подтверждён Sora2 в MCP |
| **UGC Factory** | Продукт + аватар → говорящий креатор; 4 кейфрейма продукта за прогон | **Nano Banana** (кейфреймы) + Veo3/Seedance/MiniMax (видео) | ⚠ оркестрированный конвейер — не 1 тул; вручную: `generate_image`(nano_banana) → `generate_video`(veo3/seedance) → `generate_audio` | Серийное производство UGC-креативов для e-comm без кастинга (70+ языков липсинк) |
| **Vibe Motion** | Текст → motion-графика (kinetic type, инфографика); **детерминированно** | реальный код на **Remotion** (партнёрство с Anthropic) | ⚠ web-only; ближе к Claude Code + Remotion напрямую, чем к generate_* | Брендированные интро/аутро, анимированная инфографика KPI, где нужен «тот же ролик 1:1» |
| **Canvas** | Node-граф пайплайн (промпт→картинка→видео→апскейл) как переиспользуемый шаблон | все модели платформы как ноды | ⚠ web-only (нет `canvas_*`); unlimited-режимы недоступны даже в Canvas | Повторяемый пайплайн карусели один раз → дублирование под новый бренд (вручную цепочкой) |
| **Mixed Media** | Стилизация клипа (30–40+ пресетов: Noir/Comic/Vintage…) — замена After Effects | пресет поверх video | ⚠ `preset_id` не подтверждён в seed | «Одна съёмка → N визуальных вариаций» для A/B карусели |
| **Edit Video** | Текстовый монтаж готового видео (транскрипт → editable-текст) | Kling 3.0 Omni Edit / Kling O1 / Grok Edit | ⚠ единого тула нет; собирается из `upscale_video`+`reframe`+`video_deflicker`+`remove_background`+`kling3_0` | Пост-обработка сырых UGC под карусель (реframe, чистка звука, кэпшены) |

**Форматы (`mode`) Marketing Studio:** TV Spot, UGC, Tutorial, Product Review, Unboxing, Virtual Try-On, Hyper Motion (CGI без людей), Pro Virtual Try-On, Wild Card (AI сам придумывает сценарий) + растущий список (Symphony, Giant Figure, Crush Test, Camera POV, Before/After, Mystery Box, Reboxing…). AR 9:16/16:9/1:1, длительность 12–15 сек. **⚠ слаги растут быстрее доков** — перед использованием сверять `show_marketing_studio`.

**Промпт-советы:** Wild Card — сценарий одним предложением с эмоцией (AI берёт персонажей/локации на себя); UGC-режимы — разговорные фразы («на камеру, естественно»); Explainer — явно задавать аудиторию («for a general audience» / «for B2B»); Cinema Studio — жанр в промпте («Action genre, orange-teal grade») ощутимо меняет ритм и цвет даже без UI Mr. Higgs.

---

## 5. Пост-обработка видео (финальный проход перед публикацией)

Три разных движка под разные задачи — не взаимозаменяемы. Общий принцип «нет единого лидера апскейла» — `video-craft.md` §M11; здесь Higgsfield-`id` + то, чего в M11 НЕТ (deflicker, video bg-remove).

| Задача | MCP-тул (seed) | Заметка |
|---|---|---|
| Апскейл видео до 2K/4K | `bytedance_video_upscale` | Батч реального отснятого материала |
| Детализация/восстановление | `topaz_video` | Standard/CGI/HiFi/**Text Refine**; восстановление без «выдумывания» |
| Универсальный апскейл-роутер | `video_upscale` | — |
| **Дефликер** (мерцание между кадрами) | `video_deflicker` | **Обязателен**, если ролик собран из нескольких AI-генераций разных моделей (риск мерцания на стыках — `video-craft.md` §M03) · **новое, в M11 нет** |
| BG-remove видео | `sam_3_video` / `video_background_remover` | Для наложения продукта/персонажа на брендовый фон · **новое, в M11 нет** |
| Смена AR готового видео | `reframe` | Video-first (не для картинок!); smart subject tracking; плагин Premiere/AE |

---

## 6. Грабли и MCP-статус (критично для планирования)

- **Sora 2 — системный риск.** Многократно в UI (Sketch-to-Video, Sora 2 Trends/Upscale), но **подтверждённого `id` в `models_explore` дампе НЕТ** (2026-07-11). Любая фича на Sora 2 → `⚠ проверить в MCP` до реального вызова; дефолт-fallback — i2v со seed-подтверждённым id (Kling/Veo/Seedance) + скетч как start-frame.
- **Половина студий — web-only композиции** (Cinema Studio, Canvas, Vibe Motion, Mixed Media, UGC Factory, AI Influencer/Photodump/Fashion/Moodboards, Draw-to-Edit, Relight, Face/Character Swap, Angles/Shots). Через MCP их надо либо собирать цепочкой `generate_*`, либо явно предупреждать пользователя «доступно только в браузере». ✅ прямые MCP-тулы: Marketing Studio, Personal Clipper, Shorts Studio, Explainer, Lipsync (`sync_so`), Animate (`animation_actions`), motion_control, все video/image edit-утилиты.
- **Unlimited-режимы моделей — ТОЛЬКО через higgsfield.ai.** Прямая цитата: *«Unlimited models and Free Generations are accessible only via higgsfield.ai and are not accessible on MCP/CLI, Canvas or Supercomputer»*. Через наш Claude Code + MCP всё идёт **по кредитам** — критично для себестоимости массовых прогонов.
- **`sync_so`** описан только по `sync_mode` — маппинг на UI-движки (InfinitiTalk/Speak/Veo3/Kling) не задокументирован, тестировать эмпирически.
- **Fashion Factory** проваливает плейсмент, если товар уже надет на человека — только изолированное фото.
- **Moodboards** — НЕ грузить лица в референс-батч (зона Soul ID); смешение бьёт по обоим направлениям.
- ⚠ LOW-CONFIDENCE: точное соответствие «Mixed Media» / «Vibe Motion» конкретным `preset_id`/тулам в MCP не подтверждено ни одним источником.

## Свежесть (2025–2026)

- **Moodboards** — выпущены «не прошло и недели» после Soul 2.0; одно из свежайших дополнений экосистемы.
- **Photodump Studio** + **Fashion Factory** — соседние релизы одного цикла первой половины 2026.
- **Draw-to-Edit** — развитие Draw-to-Video, распространено на фото (анонсы ~середина 2026).
- **Inpaint** переведён на движок Nano Banana Pro (`nano_banana_pro_inpaint`).
- **Cinema Studio 3.5** — актуальная версия (после 2.0/3.0): Virtual Camera Rack, Soul Cast, Hybrid 2D→3D, real-time co-direction.
- **Kling Motion Control 3.0** — вышла 2026-03-05 (Day-0 на Higgsfield), точнее лицевая консистентность vs 2.6.
- **Higgsfield Animate (WAN 2.2)** — Animate+Replace с бесплатным trial-бандлом на всех тарифах.
- **Shorts Studio на Gemini Omni Flash** — эволюция из «Reels Studio» (старые URL-пути `reels_preset_*`).
- **UGC Factory теперь на Nano Banana** — 4 авто-кейфрейма/прогон, надёжнее держит текст/лого/форму продукта.

---

## Связь с движком

| Куда встроить | Что конкретно добавить |
|---|---|
| **`lib/art-director.js`** (роутер пост-обработки/студии) | Правила «задача → инструмент»: `character-lock серия` → обучить Soul ID; `оживить слайд` → `animation_actions`/Camera Controls (i2v); `URL клиента → ad` → `marketing_studio_video`; `вебинар → клипы` → `personal_clipper_create`; `горизонт → вертикаль` → `shorts_studio_create`; `точечный фикс` → `nano_banana_pro_inpaint`; `адаптация AR картинки` → `outpaint_image` (НЕ `reframe`); `explainer` → `explainer_video`. |
| **`/carousel-day` (ШАГ «оживить/доработать»)** | Развилка: статичный слайд остаётся в image-домене (Angles/Shots/Inpaint/Expand); i2v-мост (Camera Controls/Animate) — только когда нужен Reels-клип (видео-стоимость). Пометка web-only студий как «ручной браузерный шаг». |
| **Marketing Studio ветка** | Прямой pipeline «сайт клиента → видео-ad»: `show_marketing_studio` (setup style/brand) → `generate_video`(`marketing_studio_video`, mode/avatar/product/hook). Слаги `mode` сверять в рантайме, не хардкодить. |
| **`higgsfield-image-models.md` / `higgsfield-video-models.md`** | Кросс-ссылка: этот файл — слой apps/студий/утилит; словари самих `id` моделей — там. Не дублировать параметры моделей. |
| **`video-craft.md` §M03/M10/M11** | Кросс-ссылка: методология camera/outpaint/relight/upscale/style-drift — там. Здесь только Higgsfield-`id` + дополнения (deflicker, video bg-remove, natural-language inpaint). |
| **Себестоимость** | Заложить: через MCP всё по кредитам (не по unlimited); web-only студии требуют ручного шага или сборки цепочкой `generate_*`. |

> ⚠ **Reference-слой.** До интеграции в `lib/corpus.js` — справочник для человека и заготовка под Higgsfield-ветку доработки. Перед клиентским продакшном верифицировать наличие/схемы тулов вызовом в MCP (метки `⚠ проверить в MCP` выше), в первую очередь — доступность Sora 2 и точные поля `show_characters`/`sync_so`/`animation_actions`.
