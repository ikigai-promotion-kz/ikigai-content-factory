<!-- синтез neural-nets-research 2026-07-11 из N07 (skills-plugins); ground-truth: _SEED-mcp-catalog.md -->
# Higgsfield SKILLS / PLUGINS / MARKETPLACE — engine-facing

> **Назначение:** карта «обёрток» вокруг Higgsfield-моделей — CLI-скиллов, которые ставятся в НАШ Claude Code, режиссёрских надстроек (Cinema Studio), пресет-систем, desktop-плагинов (Photoshop/Figma/Premiere) и Marketplace (Skills/Employees/Connectors). Отвечает на вопрос основателя «дизайн-скиллы»: что из экосистемы Higgsfield реально подключаемо к нашему движку, а что живёт только внутри чата Supercomputer.
> **Как использует движок:** reference-слой выбора инструмента ПЕРЕД рендером — какой скилл/режим питает шаг рендера `/carousel-day` (в частности `product-photoshoot social_carousel` как альтернатива fal-first ветке) и цепочку `lib/art-director.js` → `lib/genimage.js`. Сейчас **reference-слой, не runtime**: `lib/corpus.js` этот файл не читает, движок остаётся fal-first + прямые Higgsfield-MCP вызовы.
> **Дата:** 2026-07-11 · **Источник:** higgsfield.ai + github.com/higgsfield-ai/skills + офиц. доки + _SEED-mcp-catalog.md

---

## ⚠ Дисциплина терминов (иначе ТЗ агенту разъедется)

Higgsfield переиспользует слова «Skill» и «Preset» для НЕСВЯЗАННЫХ систем. При постановке задачи агенту всегда уточняй, какая именно имеется в виду:

- **«Skill» — 2 разные системы:** (1) **CLI-скиллы** `higgsfield-ai/skills` (MIT, ставятся в НАШ Claude Code, работают через `hf` CLI) — **релевантны нам**; (2) **Supercomputer Marketplace Skills** (30+ воркфлоу, живут ТОЛЬКО в чате `higgsfield.ai/supercomputer`, наружу не экспортируются) — справочно.
- **«Preset» — 4 разные системы:** (а) `higgsfield_preset` MCP-модель (viral i2v, нужен `preset_id`); (б) Shorts Studio presets (v2v-рестайл готового клипа); (в) Mixed Media / Viral VFX presets (визуальный стиль-фильтр); (г) Marketing Studio `mode` (формат/сценарий ролика, НЕ визуальный стиль). Детали — в `higgsfield-video-models.md` §пресеты, здесь не дублируем.

---

## TL;DR — решения одной строкой

- **Готовая карусель 3–10 связанных слайдов из CLI** → CLI-скилл `higgsfield-product-photoshoot`, режим `social_carousel` (единственное прямое пересечение с нашим кейсом; бэкенд на `gpt_image_2`, промпт-энхансер зашит).
- **«Одно лицо бренда» на серии слайдов** → `higgsfield-soul-id` → `reference_id` → в `higgsfield-generate` (эквивалент нашего character-lock через `soul_id`, см. `higgsfield-image-models.md`).
- **Дёргать 30+ моделей из скрипта/CLI, а не из веб-UI** → `higgsfield-generate` (обёртка над теми же MCP-моделями).
- **Консистентность «лицо + локация + реквизит» между шотами Reels-серии** → Cinema Studio **Elements** (`@tag`) — ⚠ веб-UI слой, через MCP не подтверждён.
- **Финальная доводка карусели/баннера в Figma/Photoshop** → нативные плагины (Remove BG / Expand / Relight / Angles прямо в файле — экономят раунд «MCP→скачал→импортировал»).
- **Полный конвейер контента (тренды+сценарий+монтаж), а не один слайд** → нанять AI Employee из Marketplace — **избыточно** для узкого кейса карусели, проще прямой `generate_image`.

---

## 1. CLI-скиллы `higgsfield-ai/skills` — то, что реально ставится нам ⭐

Обычные markdown-скиллы (MIT), устанавливаются в наш Claude Code / Cursor / Codex; вызывают Higgsfield через `hf` CLI, кредиты те же, что на higgsfield.ai. Репозиторий версионирован в лок-степе (VERSION 0.12.0 на всех 5 скиллах разом).

| Skill | Вызов | Назначение | Релевантность carousel-engine |
|---|---|---|---|
| **`higgsfield-product-photoshoot`** | `/higgsfield:product-photoshoot` | 10 режимов брендовых фото на `gpt_image_2`, промпт-энхансер в бэкенде | **режим `social_carousel` = готовая карусель 3–10 связанных слайдов IG/LinkedIn/FB** — прямое пересечение; также `hero_banner`, `ad_creative_pack`, `moodboard_pin` (Pinterest 2:3) |
| `higgsfield-soul-id` | `/higgsfield:soul-id` | тренировка персонажа → `reference_id` | «лицо бренда» / спикер курса на серии слайдов |
| `higgsfield-generate` | `/higgsfield:generate` | image/video/3D/audio по 30+ моделям (Nano Banana 2, Soul V2, Veo 3.1, Kling 3.0, Seedance 2.0…) + Marketing Studio + Virality Predictor | базовый генератор, если дёргаем Higgsfield из CLI/скрипта, а не веб-UI |
| `higgsfield-marketplace-cards` | `/higgsfield:marketplace-cards` | карточки маркетплейсов (главное фото + A+ модули) | не наш кейс (e-commerce-листинги) |
| `higgsfield-websites` | `/higgsfield:websites` | full-stack сайт React 19 + TanStack Start на Cloudflare | вне скоупа |

**Установка** (любой вариант эквивалентен — ставит CLI + auth):
```
npx skills add higgsfield-ai/skills          # или: gh skill install higgsfield-ai/skills
# либо в Claude Code:
/plugin marketplace add higgsfield-ai/skills
/plugin install higgsfield@higgsfield
hf ... ; higgsfield auth login
```
**Цепочка:** `higgsfield-soul-id` → `reference_id` → передаётся в `higgsfield-generate` / Marketing Studio. `product-photoshoot` и `marketplace-cards` самодостаточны (бэкенд сам улучшает промпт перед сабмитом).

**When-to-use у нас:** `social_carousel` — как альтернативная ветка рендера серии слайдов IKIGAI PROMOTION, когда нужна «из коробки» визуальная связность кадров без ручного роутинга по моделям. **Промпт-совет:** для `social_carousel` явно задавать бренд-гайд и число слайдов — режим держит визуальную связность между кадрами сам, но **тему и текст на слайдах задаём вручную** (для точной кириллицы см. `gpt_image_2` в `higgsfield-image-models.md`).

> ⚠ Маркетинговый лендинг `higgsfield.ai/skills` заявляет «three skills», реальный репозиторий (коммиты по 2026-07-10) содержит **5** — при внедрении сверяться с README репозитория, не с лендингом.

---

## 2. Cinema Studio 3.5 — AI-«режиссёр»

Единая среда video/фото с ручным контролем камеры/линзы/света поверх video/image-моделей + AI-ассистент, расставляющий настройки по текстовому брифу.

**Ключевые механики:**
- **Genre** (Action/Horror/Comedy/Noir/Drama/Sci-Fi/Documentary/Commercial/Music Video) — задаёт темп, энергию движения, поведение камеры.
- **Elements** (Character/Location/Prop) — создаются 1 раз, переиспользуются между шотами через `@tag`, при смене света/цвета локация автоперегенерируется под новый стиль сохраняя консистентность.
- **Mr. Higgs** — встроенный со-режиссёр: разбивает сценарий на шоты, сам подбирает камеру/свет.
- **Virtual Camera Rack** (несуществующие комбо-объективы), **Soul Cast AI Actors** (кастомные актёры), **Hybrid Workflow** (фото → 3D-сцена, двигаешь камеру до рендера), real-time co-direction.

**Сильное:** не нужен опыт киносъёмки; **Elements решают «character drift» на уровне целой сцены** (лицо + локация + реквизит), а не только лица как Soul ID.
**Слабое / грабли:** 3.5-специфичные фичи (Elements/Mr. Higgs/real-time) — **веб-UI слой**. В SEED-каталоге MCP (2026-07-11) есть только `cinematic_studio_2_5` (image) и `cinematic_studio_3_0` / `cinematic_studio_video_v2` (video); **`cinematic_studio_3_5` как отдельный `id` в MCP отсутствует** — вероятно версионный сдвиг веб-UI поверх той же 3.0-модели. `⚠ проверить в MCP` (`models_explore`), доступны ли Elements/Mr. Higgs через `generate_video`, или это эксклюзив `higgsfield.ai/cinematic-studio`. Точное релиз-окно 3.5 — `⚠ LOW-CONFIDENCE`.

**When-to-use у нас:** серия карусели/Reels с одним «лицом бренда» + локацией — заводим Character+Location как Elements один раз, дальше меняем только shot per слайд, тон/цвет держится сам. **Промпт-совет:** Genre меняет и «читаемый» темп ролика — для рекламной карусели/Reels ближе `Commercial`, для сторителлинга — `Drama`/`Documentary`.

---

## 3. Плагины (New) — нативная интеграция в DCC / design-инструменты

Все Adobe/Figma-плагины: **только онлайн** (инференс на серверах Higgsfield, результат прилетает как новый слой/клип), обязателен логин Higgsfield, тратят те же кредиты, что MCP; результат лицензирован для коммерции на платных планах.

| Хост | Инструменты внутри | Установка |
|---|---|---|
| **Photoshop** | Generate AI Image, Realtime AI (правка в реальном времени), Mockup Studio, **Layer Decompose** (плоская картинка → слои одним кликом), Angles, Shots (кадр → раскадровка), Character/Face Swap, Remove BG, Upscale, Skin Enhancer, AI Stylist | `.ccx`/ZXP через ZXP Installer, PS 2024+ |
| **Premiere Pro / After Effects** | Generate AI Video/Image, **Reframe** (9:16/16:9/4:3/3:4/21:9/1:1 с трекингом субъекта), Remove BG (видео, без грин-скрина), Draw to Edit (инпеинтинг рисунком), Upscale до 4K/8K, + Cinema Studio в таймлайне | один инсталлер на оба, `.dmg`(mac)/ZXP(win), 2024+ |
| **DaVinci Resolve** | тот же набор, что Premiere/AE | аналогичный инсталлер |
| **Figma / FigJam** | Generate AI Video/Image, Remove BG, **Relight** (смена света постфактум), **Color Grading** (кино-LUT), **Expand** (аутпейнт/смена AR), Angles | Figma Community plugin, без инсталлера, браузер + десктоп |
| **Minecraft** | генерация построек/картинок/видео в игре | мод/аддон |
| **Cursor / Manus** | не desktop-плагин — агентская интеграция Higgsfield-тулов в IDE-чате / воркфлоу | коннектор в самом агенте |

**When-to-use у нас:** если финальную сборку карусели/баннера доводят в **Figma/Photoshop** — Remove BG / Expand / Relight / Angles прямо в файле экономят раунд «сгенерировал в MCP → скачал → импортировал». Premiere/DaVinci-плагины релевантны для видео-контура (Reels/YouTube), **не для статичных каруселей**.

---

## 4. Marketplace — 4 витрины (только внутри Supercomputer)

- **Skills** (`/supercomputer/marketplace/skills`) — 30+ воркфлоу-скиллов (`content-strategy`, `social-content`, `ugc-ad-production`, `montage`, `seedance-director`, `kling-3-prompt-director`, `brand-analyzer`, `trend-picker`, `create-skill`…). Вызываются слэш-командой ТОЛЬКО в чате Higgsfield, **это НЕ файлы GitHub-репозитория** из §1. When-to-use: только если мы уйдём работать через сам чат Supercomputer вместо MCP+Claude Code — для нашего стека это справочная информация.
- **Games** (`/marketplace/games`) — браузерные игры; не пересекается с движком.
- **Employees** (`/marketplace/employees`) — готовые AI-агенты «под найм»: системный промпт + связка Skills + (иногда) tools/connectors. Не отдельные модели.
- **Connectors** (`/marketplace/connectors`) — 30+ интеграций (Slack, Google Drive, Notion, Gmail, Figma, Salesforce…) — агент читает/пишет во внешние сервисы.

**AI Employees (примеры):** Cartoon Animator (24 скилла/3.4M), Motion Designer (43/1.3M), Product Photographer (24/5.2M), Podcast Producer (4/3.1M), Shorts Maker (рестайл 1 видео 4с–2мин под пресет 9:16), Personal Clipper (YouTube-URL → клипы с субтитрами), Tv Ad Director (бриф → 15-сек 16:9 ролик). Нанять готового из Marketplace или собрать своего на `/supercomputer/create-employees` (текстовое описание роли + выбор tools/skills).

**When-to-use у нас:** если процесс расширится до «полного конвейера контента» (тренды + сценарий + монтаж, а не только слайд) — нанять готовую связку вместо ручной оркестрации MCP-вызовов. Для узкого кейса карусель-слайдов — **избыточно**, проще прямой `generate_image`.

> **Higgsfield Earn** (`creators.higgsfield.ai/terms`) — монетизация: верификация соцсети → участие в кампаниях → оплата за просмотры. Модель выплат авторам Skills в открытых источниках не расписана — `⚠ проверить в MCP/аккаунте`, если понадобится монетизировать наши промпты.

---

## Особенности и грабли (сводка меток надёжности)

- **«Unlimited»-тариф не действует через MCP** — безлимитные модели (Soul V2, Seedream, Flux.2, GPT Image…) доступны ТОЛЬКО на higgsfield.ai; через MCP/CLI/Canvas/Supercomputer считаются обычные кредиты. Наш carousel-engine работает через MCP → безлимит НЕ применяется.
- **Все Adobe/Figma-плагины — только онлайн**, офлайн-инференса нет в принципе.
- **`cinematic_studio_3_5`** как MCP-`id` не существует — не подставлять в `model`. `⚠ проверить в MCP`.
- **`higgsfield_preset` требует `preset_id`**; UI-лейблы витрины `/viral-presets` (BASEBALL GAME и т.п.) ≠ подтверждённые MCP-id — узнавать через `presets_show`. `⚠ проверить в MCP`.
- **Mixed-media/viral VFX-presets** отдельным MCP-тулом в SEED не описаны — идут ли через `generate_video`/`reframe` неясно. `⚠ проверить в MCP`.

---

## Связь с движком

| Находка | Куда встроить | Что добавить |
|---|---|---|
| `product-photoshoot social_carousel` | `model-router` / `lib/art-director.js` + шаг рендера `/carousel-day` | Альтернативная Higgsfield-ветка рендера серии слайдов «из коробки» (визуальная связность кадров) — как опция к fal-first |
| CLI-скиллы `higgsfield-ai/skills` | dev-окружение (не runtime движка) | Опция ставить `higgsfield-generate`/`soul-id` в Claude Code для ручных прогонов; в код движка не тянуть |
| Cinema Studio Elements (`@tag`) | `art-director.md` (character-lock раздел) | Пометка: консистентность «лицо+локация+реквизит» на уровне сцены — но пока веб-UI, не MCP-runtime |
| Figma/Photoshop-плагины | `creo-formats` / пост-обработка | Финальная доводка карусели/баннера (Remove BG/Expand/Relight/Angles) в дизайн-файле вместо round-trip через MCP |
| AI Employees / Connectors | будущий «полный конвейер контента» (вне текущего скоупа) | Только если движок вырастет из «генератор слайда» в оркестрацию тренды→сценарий→монтаж |

> Не дублирует `knowledge/video-craft.md` §M10/M11 (video-пайплайн) и `higgsfield-image-models.md` (модели рендера статики) — по моделям и пресетам смотри туда, здесь только слой «скиллы/плагины/marketplace».
