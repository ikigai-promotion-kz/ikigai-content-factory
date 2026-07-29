<!-- синтез neural-nets-research 2026-07-11 из N02; ground-truth: _SEED-mcp-catalog.md -->
# Higgsfield VIDEO-модели — engine-facing каталог

> **Назначение:** авторитетный справочник по видео-моделям Higgsfield MCP (id, параметры, сильные/слабые стороны, when-to-use под наши задачи) для этапа «карусель → видео» и любых motion-ассетов IKIGAI PROMOTION.
> **Как использует движок:** питает M10 (multi-model routing) и M11 (post-edit/relight) из `knowledge/video-craft.md`, а также будущий `model-router` при выборе `generate_video.params.model`. Сейчас reference-слой, не runtime — пока не подключён в `lib/corpus.js`.
> **Дата:** 2026-07-11 · **Источник:** higgsfield.ai + офиц. доки + _SEED-mcp-catalog.md

> Не дублирует `knowledge/video-craft.md` §M10 (стратегия мультимодельного роутинга: черновик→финал) и §M11 (relight/пост-обработка) — здесь конкретика по моделям Higgsfield, там общая логика выбора и пайплайна. Кросс-ссылки в тексте.

---

## Роутинг за 30 секунд (шпаргалка движка)

| Задача | Модель (id) | Почему |
|---|---|---|
| Карусель→видео с синхро-озвучкой + рефы | `seedance_2_0` | до 12 референсов за проход, аудио+видео одним проходом, 4K, лидер по physics/cinematography |
| Дешёвый daily-driver, персонаж-сериал, диалог | `kling3_0` | ~6 кредитов/видео, 4K, multi-shot до 6 склеек, Voice Binding 5 языков |
| Быстрый черновой прогон (20–30 вариантов хука) | `minimax_hailuo` (fast) / `grok_video` | самые быстрые/дешёвые; НЕ для мульти-субъект-сцен |
| Широкие атмосферные/природные/городские сцены | `veo3_1` | global illumination, погода/туман/ветер; слабее на крупных планах лиц |
| «Одна съёмка → N рестайлей» по видео-референсу | `wan2_7` / `wan2_6` | reshoot существующего клипа; НЕ для чистого t2v |
| Явный контроль камеры (линза/фокусное/жанр) | `cinematic_studio_3_0` / `cinematic_studio_video_v2` | режиссёрский слой поверх Seedance-движка |
| Массовый UGC/product-ad без ручного промпта | `marketing_studio_video` | URL продукта → аватар+hook → ролик |
| Вирусный формат «как в тренде» без брифинга | `higgsfield_preset` | фото + `preset_id`, без настройки |
| Пост-правка готового клипа (relight/swap/reframe) | Kling O1 Edit (флоу `/video-edit`) | вместо полной перегенерации — см. §M11 |

**Кредитная вилка** — от ~6 кредитов (Kling 3.0) до ~90 за 15-сек 720p Seedance 2.0. Правило: черновики — Kling/MiniMax, публикуемые финалы — точечно Seedance/Veo.

---

## Kling-семейство

| id | назначение | ключевые params (seed) | сила | слабость / when-to-use |
|---|---|---|---|---|
| `kling3_0` | флагман «AI Director» | `duration 3-15`; `mode std/pro/4k`; `sound on/off`; AR 16:9/9:16/1:1; start+end_image | Omni Native Audio (диалог+SFX+ambience одним проходом), Voice Binding (голос на персонажа, 5 языков EN/ZH/JA/KO/ES), multi-shot storyboarding до 6 склеек, физика, Element Consistency по рефу | **Брать:** сериальность персонажа, диалоговые сцены, дешёвый daily-driver (~6 кредитов/видео, на Starter ~320 роликов 720p/5с/мес) |
| `kling3_0_turbo` | скоростной 3.0 | `resolution 720p/1080p`; `duration 3-15`; AR 16:9/9:16/1:1 | тот же multi-shot + native audio/lip-sync, заточен под скорость (релиз 17.06.2026) | нет 4K. **Брать:** быстрый черновой вариант, когда сторибординг/4K не нужен, но нужна скорость выше обычного 3.0 |
| `kling2_6` | предыдущее поколение | `duration 5/10`; `sound`; AR 16:9/9:16/1:1; start_image | одиночный шот, co-generation с lip-sync (менее точный, чем 3.0); нет vCoT | дрейф-артефакты на клипах >5 сек, 1080p max. **Брать:** бюджетные говорящие ролики без мультишота, где 3.0 избыточен |

**Kling O1 Edit** — отдельный флоу `/video-edit` (НЕ `generate_video` в seed; в MCP-дампе отдельного video-id нет ⚠ проверить в MCP). Natural-language видео-редактура: Relight & Atmosphere (3D-геометрия света/теней), Object Swap, Re-frame, Smart Clean-Up, Recolor/Restyle, Extend & Keyframing. Вход 3–10 сек, до 4 доп. изображений через `@`, вывод 720p. **When-to-use:** пост-правка готового клипа вместо перегенерации → см. `video-craft.md` §M11 (relight, но для видео целиком).

**Промпт-советы Kling:** опиши персонажа один раз с деталями + референс-фото/видео для Element Consistency; для multi-shot задавай shot size / perspective / движение камеры **по каждому сегменту** отдельно; диалог пиши явной репликой, иначе reasoning сгенерирует речь сам (риск не туда).

**Не апгрейдить бездумно 2.6→3.0:** 2.6 дешевле и достаточен для одиночных говорящих роликов; 3.0 нужен только при 4K / сторибординге / vCoT-рассуждении о сцене.

---

## Seedance-семейство

| id | назначение | ключевые params (seed) | сила / when-to-use |
|---|---|---|---|
| `seedance_2_0` | reference-driven лидер | `duration 4-15`; `resolution до 4k (std)`; `mode std/fast`; `bitrate`; `genre`; `generate_audio`; **image/video/audio_references**; 7 AR; start+end | до **12 референсов за проход** (9 img + 3 video ≤15с + 3 audio ≤15с + текст, модель сама читает роль каждого); аудио+видео одним проходом без пост-синка; frame-level консистентность лиц/одежды/стиля; лидер по aesthetics/physics/cinematography в тестах Higgsfield. **Лучший кандидат для карусель→видео с синхронным войсовером** |
| `seedance_2_0_mini` | budget-трим | `duration 4-15`; `480p/720p`; refs; 7 AR | дешевле, но **НЕТ 1080p+/2K** — только драфты с рефами и аудио |
| `seedance1_5` | предыдущее поколение | `duration 4/8/12`; `480/720/1080`; `generate_audio`; 7 AR | дешевле по цене за секунду (~$0.07/с @720p vs ~$0.38/с у 2.0), но проигрывает 2.0 по physics (+31.7) и cinematography (+21.5); video-to-video НЕ поддерживает |

⚠ **Тарифный нюанс (не из seed):** на higgsfield.ai полный Seedance 2.0 недоступен на Starter/Basic (там только «Seedance 2.0 Fast»), полный доступ — с Plus/Pro+. Наш MCP-аккаунт `ultimate` — доступ полный; при смене плана проверить первым делом.

**Промпт-совет:** скорми референс-персонажа + референс-продукт + референс-аудио **одновременно** — Seedance 2.0 «читает роль» каждого и выдаёт консистентную мульти-шот сцену без отдельного промпта под каждый вход.

---

## Google Veo-семейство

| id | режимы / params (seed) | сила | слабость |
|---|---|---|---|
| `veo3_1` | T2V + Multi-Image Reference (до 3 картинок, Subject Consistency — только Standard) + Start&End Frame; `duration 4/6/8`; `quality basic/high/ultra`; `variant preview/fast`; AR 16:9/9:16 | global illumination, погода/туман/ветер в крупных сценах, lip-sync (только Standard), хорошо читает длинные промпты | ~40–70 кредитов/видео (дорого), «мягче» на крупных планах лиц — для портретов Kling 3.0 сильнее и дешевле |
| `veo3_1_lite` (Fast) | Start&End + T2V, без Multi-Reference; `duration 4/6/8`; `generate_audio`; AR 16:9/9:16/auto | быстрее, идеал для контролируемого движения по 2 опорным кадрам | нет Subject Consistency |
| `veo3` | Veo 3 (предыдущее); `variant preview/fast`; AR 16:9/9:16 | надёжный кинематографичный базовый вариант с аудио | уступает 3.1 в связности и контроле |

**Промпт-совет:** для Standard с говорящим персонажем закладывай реплику прямо в промпт (lip-sync только там); для широких природных/городских сцен не экономь на деталях освещения — здесь Veo выигрывает у конкурентов на global illumination.

---

## Wan-семейство

| id | ключевая фича | params (seed) | нюанс |
|---|---|---|---|
| `wan2_6` | Video Reference & Style Transfer — «переснять» сцену, сохранив перформанс референс-клипа; native audio + phoneme-level lip-sync; long-context до 15 сек; multi-shot с авто-переходами; product-shots с физикой жидкостей | `quality 720/1080`; `duration 5/10/15`; image/video/audio refs; AR 16:9/9:16/1:1 | самый **input-dependent** — слабее всех в чистом t2v без референса |
| `wan2_7` | те же reshoot/рестайл, но appearance-референс + voice-референс в одном флоу; до **5 одновременных референсов**; точнее motion/character-consistency/audio-sync | `duration 2-15`; `720p/1080p`; **audio_references**; start+end; 5 AR | новее ⚠ проверить в MCP (квоты/лимиты не подтверждены вебом) |

**When-to-use:** «одна съёмка → N рестайлей» — реальный видео-референс (даже свой отснятый UGC) + смена фона/стиля/освещения без новой съёмки; product realism. **Не роутить на Wan чистый t2v** — Seedance/Veo надёжнее.

---

## Gemini Omni Flash (`gemini_omni`)

Google DeepMind, мультимодальный генератор/редактор: принимает **любую комбинацию** image+text+video+audio; аудио **всегда нативное** (модель «рассуждает», какой звук уместен, а не накладывает). Conversational multi-turn editing — уточняешь сцену правками в диалоге с сохранением consistency.
**Params (seed):** `duration 4-10`; `720p`; **image/video_references**; AR 16:9/9:16; t2v/i2v/v2v. ⚠ Клипы ограничены 10 сек @ 720p (совпадает с seed).
**When-to-use:** референс-driven генерация (image+video-референс сразу) с аудио «из коробки» + многоходовая правка сцены в разговоре.

---

## MiniMax Hailuo (`minimax_hailuo`)

**Params (seed):** `variant minimax/-fast/-2.3/-2.3-fast`; `duration 6/10`; `resolution 512/768/1080`; start+end.
По вебу: **768p — на 6 или 10 сек, 1080p — только на 6 сек** (10-сек в 1080p не поддержан — держать в уме). Fast — быстрая итерация с минимальным промптом; Standard — финальный точный рендер. Сильна одиночная физика/анимация, стабильность цвета, чёткий текст/логотипы в движении.
**Слабость:** мульти-субъект-сцены → «anatomy breakdown» (не входит в топ-5 Higgsfield из-за этого).
**When-to-use:** дешёвый черновой прогон 20–30 вариантов хука перед финалом на дорогой модели (см. `video-craft.md` §M10). **НЕ** использовать для сцен с несколькими людьми/объектами.

---

## Grok Video (`grok_video_v15` / `grok_video`)

xAI «Grok Imagine». Real-time multimodal synthesis — видео и звук за один проход, включая **spatial audio, следующий за движением** объекта (для динамичных экшн-сцен). Zero-shot identity preservation с одного фото. Рендер очень быстрый — стандарт за 5–20 сек, сложное до 30 сек.
**Params (seed):** `grok_video_v15` (preview) — `resolution 480/720`; `duration 2-15`; i2v + native audio + physics/camera-motion. `grok_video` — `duration 1-15`; AR 16:9/9:16/1:1; t2v+i2v+audio.
**When-to-use:** самый быстрый по времени рендера — «накидать 5 вариантов за минуту» и динамичный экшн со spatial-audio.

---

## Cinema Studio — режиссёрский слой (не «модель», а контрол-панель)

Не отдельная модель, а слой контроля камеры поверх видео-движков. Seed-движки внутри: `cinematic_studio_3_0` и `cinematic_studio_video_v2`.

| | Cinema Studio 2.0/2.5 | Cinema Studio 3.0/3.5 |
|---|---|---|
| Философия | «Hero Frame First»: сначала идеальный стоп-кадр, потом анимация | то же + физика/reasoning поверх Seedance 2.0 |
| Оптика | сенсор-профиль, линза (напр. Cooke), фокусное 8–50mm, диафрагма | то же |
| Жанры (seed) | `action/horror/comedy/noir/drama/epic` (веб добавляет Western/Suspense/Intimate/Spectacle — сверить в MCP) | + расширенный набор |
| Multi-shot | до 6 шотов, 1–12 с/шот, макс. 12 с общей, 1080p | ⚠ LOW-CONFIDENCE: веб заявляет 4K/до 30 с — **конфликтует с seed `cinematic_studio_3_0`: 4–15 с; приоритет у seed** |
| Персонажи | до 3, emotion control, диалог | физика: ткань/волосы/жидкости/столкновения |
| Start/End frame | есть в single/авто-multi; **недоступен при персонажах в multi-shot** | есть |
| 3D Scene Access | войти в картинку как в 3D-сцену | — |
| Grid exploration | 2×2/3×3/4×4 превью-сторибординг | — |

**Seed-параметры `cinematic_studio_3_0`:** `resolution 480p/720p/1080p/4k`; `genre(action/horror/comedy/noir/drama/epic)`; `generate_audio`; 7 AR; 4–15 с — SOTA cinema-grade.
**Seed-параметры `cinematic_studio_video_v2`:** `genre(8)`; `mode pro/std`; `sound on/off`; **`speedramp(slowmo/speedup/impact)`**; **`multi_shots`+`multi_shot_mode`**; `cfg_scale`; `preset_id`; 5 AR; 3–12 с.

**When-to-use:** явный контроль камеры (реально выбрать линзу/фокусное/диафрагму, не «текстом описать dolly») + когда карусель эволюционирует в мини-фильм с несколькими персонажами/сценами.
**Промпт-совет:** добей Hero Frame как отдельное изображение (можно другой image-моделью), потом корми его в Cinema Studio как start frame — экономит генерации.
⚠ **Грабли:** multi-shot и Start/End Frame несовместимы при персонажах — проверять конфликт до отправки.

---

## Workflow-обёртки (не «модели»)

### Marketing Studio Video (`marketing_studio_video`)
Workflow поверх Seedance 2.0: URL продукта → авто-извлечение названия/фото (или вручную до 5 фото) → выбор из 40+ AI-аватаров (Soul 2.0, переиспользуемые между кампаниями) → выбор hook → генерация. Форматы: talking-head, product review, tutorial, unboxing, virtual try-on.
**Params (seed):** `resolution 480/720/1080`; `generate_audio`; **`mode`(preset slug)**; `avatar_ids`; `product_ids`; `hook_id/setting_id` ИЛИ `ad_reference_id`; много AR; 12–15 с.
**When-to-use:** массовое производство UGC/product-ad вариаций под TikTok/Reels @ваш_аккаунт без ручной сборки промпта — когда важнее throughput, чем режиссёрский контроль.

### Higgsfield Preset (`higgsfield_preset`)
Готовые вирусные i2v-шаблоны («apps»): фото → `preset_id` (**REQUIRED**, смотреть через `presets_show`) → без промптинга. Категории: Luxury Ad, Gen-Z TikTok Edit, Dynamic Sport Ad + apps-эффекты (Rap God, Mukbang, Recast/character-swap, 3D Rotation, Bullet Time, Cloud Surf).
**When-to-use:** быстрый вирусный формат «как в тренде» без брифинга — платит скоростью за потерю контроля. Не для точного бренд-стиля IKIGAI PROMOTION (тогда Cinema/Marketing Studio с brand-kit).

---

## Особенности и грабли (сводка для роутера)

- **Sora 2 — не строить зависимости.** OpenAI сворачивает Sora: web/app закрыты 26.04.2026, API отключат 24.09.2026. В MCP-дампе seed (2026-07-11) отдельного id для Sora 2 в `generate_video` **нет** (в UI-меню есть, через MCP list не пришёл ⚠). **Действие:** промпты держать model-agnostic (структурированное shot/motion/lighting), чтобы переносились на Seedance 2.0 / Veo 3.1.
- **Unlimited-режимы (Kling 3.0 365-day unlimited, Nano Banana Pro и т.д.) работают ТОЛЬКО через higgsfield.ai, НЕ через MCP/CLI/Supercomputer** — через наш Claude Code + Higgsfield MCP расход идёт по обычным кредитам, не по «безлимиту». Критично для оценки стоимости прогонов.
- **Native audio ≠ гарантированно хороший звук.** У всех «нативных» (Kling/Seedance/Wan/Veo/Gemini/Grok) звук генерируется по смысловому чтению сцены — на абстрактных сценах может не совпасть с ожиданием. Для критичного брендового аудио (джингл, конкретный голос) — генерировать видео без звука и накладывать через N03-audio-стек (`text2speech_v2`, `sonilo_music`) отдельно.
- **Wan — самый input-dependent:** без референс-клипа t2v заметно хуже Seedance/Veo. Не роутить чистый t2v.
- **MiniMax слабеет на мульти-субъекте** — >1 человека/объекта в динамике = риск anatomy breakdown. Роутить только одиночные субъекты/UGC.
- **Cinema Studio multi-shot ⊥ Start/End Frame при персонажах** — проверять конфликт параметров до отправки.
- **HappyHorse (Alibaba)** — вышел в топ Video Arena (апрель 2026, joint audio+video, 7-язычный lip-sync), но интеграция с Higgsfield **НЕ подтверждена** ⚠ LOW-CONFIDENCE / проверить в MCP. Потенциальный будущий движок, не текущий.

---

## Свежесть (2025–2026)

- Kling 3.0 Turbo — релиз 17.06.2026 (за месяц до прогона).
- Sora 2 discontinuation — объявлено март 2026, web/app закрыты 26.04.2026, API — 24.09.2026 (на 11.07.2026 API ещё жив, но релевантность для роадмапа уже низкая).
- Cinema Studio 3.0/3.5 — заявляет 4K/до 30 с ⚠ LOW-CONFIDENCE относительно seed (`cinematic_studio_3_0`: 4–15 с) — вероятно UI-уровень/будущий кап, MCP API лимитирован 15 с. Приоритет — seed.
- Marketing Studio активно продвигается как «замена агентства» — следить за обновлениями avatar/hook библиотеки при апдейте промпт-гайдов.

---

## Связь с движком

| Куда встроить | Что конкретно добавить |
|---|---|
| **`knowledge/video-craft.md` §M10** (multi-model routing) | Внести таблицу «Роутинг за 30 секунд» как источник выбора `params.model`: черновик → `minimax_hailuo`/`grok_video`/`kling3_0`, финал → `seedance_2_0`/`veo3_1`. Зафиксировать кредитную вилку (~6 → ~90) как cost-эвристику. |
| **`knowledge/video-craft.md` §M11** (post-edit/relight) | Добавить Kling O1 Edit (флоу `/video-edit`, вход 3–10 с, вывод 720p) как альтернативу перегенерации: relight/object-swap/reframe/recolor целиком по клипу. |
| **`model-router`** (будущий, выбор `generate_video.model`) | Кодировать правила-грабли: Wan только с референсом; MiniMax не для мульти-субъекта; Cinema Studio multi-shot ⊥ Start/End при персонажах; Sora — не роутить (нет id). |
| **`art-director.md`** | Промпт-советы по моделям (Kling: персонаж+реф один раз; Seedance: 3 типа рефов одновременно; Veo: реплика в промпте для lip-sync; Cinema Studio: Hero Frame → start frame). Держать промпты model-agnostic (shot/motion/lighting). |
| **`creo-formats`** (карусель→видео) | `seedance_2_0` как дефолт для «карусель→видео с озвучкой»; `marketing_studio_video` для массовых UGC-вариаций @ваш_аккаунт; `higgsfield_preset` для трендовых форматов без брифинга. |

⚠ Перед подключением в runtime сверить в MCP: доступность Sora через коннектор, лимиты `wan2_7`, реальный жанр-набор Cinema Studio, интеграцию HappyHorse.
