<!-- синтез neural-nets-research 2026-07-11 из N01–N09 (8 файлов); ground-truth: _SEED-mcp-catalog.md -->
# neural-nets — INDEX (оглавление + карта интеграции)

> **Назначение:** входная точка в базу знаний по нейросетям генерации (image/video/audio + Supercomputer/скиллы/промптинг) для движка `carousel-engine`. Оглавление 9 файлов, карта «куда что встраивается» и ответы одной строкой на 3 вопроса основателя.
> **Как использует движок:** навигатор по reference-слою. Runtime-подключения нет — `lib/corpus.js` эти файлы пока НЕ читает, движок остаётся fal-first + прямые вызовы `mcp__higgsfield__*`. Порядок подключения к движку — в разделе «Карта интеграции».
> **Дата:** 2026-07-11 · **Источник:** higgsfield.ai + офиц. доки + _SEED-mcp-catalog.md

> **Если вы читаете это в своём комплекте — про пути.** Весь слой `neural-nets/` писался
> для нашего внутреннего движка, и имена файлов в нём — наши. У вас они называются иначе
> или их нет вовсе:
> `lib/corpus.js` → `lib/corpus.mjs` · `lib/genimage.js` → `lib/genimage.mjs` ·
> `lib/art-director.js` и `lib/genvideo.js` в комплект не входят — эту работу делает
> сам Claude Code по скиллу, а не отдельный модуль ·
> слэш-команд `/creative` и `/carousel-day` у вас нет, их заменяют скиллы из
> `plugins/content-factory/skills/`.
> Содержательная часть — какая модель что умеет, как её промптить, сколько стоит —
> верна и переносится один в один. Это справочник, а не рабочий код: движок его не
> читает, читаете вы.

---

## Ответы одной строкой на 3 вопроса основателя

1. **Supercomputer — можно подключиться из нашего Claude Code и гонять карусели через него?** — Мы **уже подключены**: Supercomputer и наш `mcp__higgsfield__*` бьют в один backend (`mcp.higgsfield.ai`), одна библиотека, один кредит-счётчик. Гонять `carousel-engine` через веб-Supercomputer **не нужно** — прямой MCP/CLI дешевле (там даже текстовые шаги оркестратора жгут кредиты). Безлимитные модели работают ТОЛЬКО на самом сайте higgsfield.ai, не в MCP/Supercomputer → экономика одинаковая. → **`supercomputer.md`**

2. **Дизайн-скиллы — что из экосистемы Higgsfield реально подключаемо к движку?** — Ставятся в наш Claude Code только **CLI-скиллы** `higgsfield-ai/skills` (MIT); прямое пересечение с нашим кейсом одно — `higgsfield-product-photoshoot` режим `social_carousel` (бэкенд `gpt_image_2`). Marketplace-Skills / AI Employees / Cinema Studio Elements живут ТОЛЬКО в чате Supercomputer — справочно, наружу не экспортируются. → **`skills-plugins.md`**

3. **Промптинг — как правильно промптить каждую нейронку?** — **Единого шаблона нет**, у каждого класса своя структура: текст-в-кадре (`gpt_image_2`/`openai_hazel`) → точная цитата в кавычках + шрифт/вес/цвет/позиция; фотореализм (`nano_banana_pro`/`seedream`) → формула `Subject+Action+Scene` + фото-параметр; кино-персонаж (`soul_*`) → лицо описать один раз при обучении Soul ID; вектор (`recraft` vector) → геометрия, не декор; видео → база `video-craft.md §M10` + модель-специфика. Наш инвариант: **1 слайд = 1 вызов (single-shot)**. → **`prompting-playbook.md`**

---

## Оглавление (9 файлов)

| Файл | Модуль | Что внутри | Слой движка |
|---|---|---|---|
| ⭐ **`higgsfield-image-models.md`** | N01 | 20+ image-моделей: `id`/params/AR, текст-рендер+кириллица, reference-режимы, when-to-use (hero/баннер/инфографика/вектор/character-lock) | `lib/art-director.js` + `lib/genimage.js` |
| **`higgsfield-video-models.md`** | N02 | video-модели (Kling/Veo/Seedance/Wan/Gemini/Hailuo/Grok/Cinema Studio): t2v/i2v/refs, длительности, 4K, нативное аудио, роутинг-шпаргалка | `video-craft.md §M10/M11` + `model-router` |
| **`higgsfield-audio-stack.md`** | N03 | `text2speech_v2` (5 движков), `seed_audio`, `inworld`, музыка/SFX, voice-тулзы (клон/дубляж), ru-озвучка; аудио видео-моделей | шаг озвучки карусель→видео (не для статики) |
| ⭐ **`higgsfield-tools.md`** | N04+N05 | не-модельный слой: Soul-цепочка, свопы/motion-transfer, edit-апы статики, видео-студии (Explainer/Click-to-Ad/Lipsync), пост-обработка; **MCP-статус каждой** | `lib/art-director.js` + ветка «оживить/доработать» в `/carousel-day` |
| ⭐ **`prompting-playbook.md`** | N08 | промпт-скелеты по классам моделей, i2i-язык Lock/Change/Amount, camera-пресеты, чек-лист single-shot | `lib/art-director.js` + `lib/genimage.js`/`genvideo.js` |
| **`supercomputer.md`** | N06 | карта Supercomputer (Orchestrator/Apps/Employees/Skills/Memory/Connectors), MCP&CLI vs наш коннектор, кредит-математика, $100K-контест | reference для `model-router` (где рендерить) |
| **`skills-plugins.md`** | N07 | CLI-скиллы `higgsfield-ai/skills`, Cinema Studio, desktop-плагины (Figma/PS/Premiere), Marketplace (Skills/Employees/Connectors); дисциплина терминов «Skill»/«Preset» | reference выбора инструмента ПЕРЕД рендером |
| **`frontier-landscape.md`** | N09 | вне Higgsfield (Midjourney/Ideogram/Firefly/Runway/Luma/Pika/ElevenLabs/Suno/HeyGen/Genie 3): где паритет, где пробел | reference для `art-director.md` (брифинг) + эталоны качества |
| **`higgsfield-presets-catalog.md`** | — | живой дамп 62 `preset_id` (готовые вирусные сценарии и эффекты, а НЕ движение камеры): что применимо деловому контенту, что нет | reference для ветки «оживить слайд в клип» |

Ground-truth `id`/параметров для всех — **`../research/neural-nets/_SEED-mcp-catalog.md`**. Веб = «как промптить / особенности / свежесть», не выдумывание API.

---

## Карта интеграции (куда что встраивается)

Сгруппировано по целевому слою движка; ⭐ — то, что первым читается рендер-цепочкой при подключении.

| Слой-цель | Из каких файлов | Что добавить |
|---|---|---|
| ⭐ **`lib/art-director.js`** (роутер модели под арт-спек) | image · video · tools · prompting · frontier | Правила выбора `id` по интенту слайда: text-hero→`gpt_image_2`, инфографика→`nano_banana_pro`, вектор→`recraft` vector, character-lock→`soul_2`/`seedream_v4_5`, trend-edit→`seedream_v5_pro`, HEX-баннер→`flux_2`, spot-edit→`flux_kontext`; дефолт батча→`nano_banana_2`. + промпт-скелеты по классам, camera-пресеты. |
| ⭐ **`lib/genimage.js`** (вызов generate_image) | image · prompting | Higgsfield-ветка рядом с fal: `params.model` из роутера + маппинг resolution/quality/AR по seed; критичный ru-текст→`gpt_image_2` или overlay; fallback AR (нет 4:5 у Soul/GPT2/FLUX.2). Язык правок i2i: Lock/Change/Amount. |
| ⭐ **`/carousel-day` ШАГ рендера** | image · tools · skills | Развилка провайдера fal↔Higgsfield по типу слайда; vector/character/HEX-locked→Higgsfield; ветка «оживить/доработать» статики; `social_carousel` как альтернатива fal-first. |
| **`video-craft.md §M10/M11`** | video · audio · frontier · image | Таблица «Роутинг за 30 сек» (черновик `hailuo`/`grok`/`kling3_0` → финал `seedance_2_0`/`veo3_1`), кредит-вилка ~6→~90; Kling O1 Edit как альтернатива перегенерации; нативное аудио видео-моделей; апдейт свежими версиями (Gen-4.5/Ray3). `cinematic_studio_2_5` — image-часть той же оптики. |
| **`model-router`** (будущий, выбор `generate_video.model`) | video · supercomputer · frontier | Правила-грабли: Wan только с референсом; MiniMax не для мульти-субъекта; Cinema Studio multi-shot ⊥ Start/End; Sora — не роутить (нет id в MCP). Решение «где рендерить»: прямой MCP, не Supercomputer. |
| **`creo-formats`** (карусель→видео) | video · audio | `seedance_2_0` — дефолт «карусель→видео с озвучкой»; `marketing_studio_video` — массовые UGC @ваш_аккаунт; `higgsfield_preset` — тренды без брифинга; ru-TTS из audio-стека. |
| **`art-director.md` (доки)** | frontier · skills · prompting | Брифинг клиентов «что умеет лучший инструмент рынка»; словарь терминов Skill/Preset; промпт-советы по моделям (держать model-agnostic: shot/motion/lighting). |
| **Себестоимость** | image · supercomputer | Заложить: через MCP генерации идут по кредитам (не unlimited-тариф); e2e картинка+анимация ≈ 200 кредитов (~$10). |

> ⚠ **Весь слой — reference, не runtime.** До интеграции в `lib/corpus.js` это справочник для человека и заготовка под Higgsfield-роутер. Перед клиентским продакшном верифицировать `id`/параметры вызовом `models_explore` в MCP (метки `⚠ проверить в MCP` в файлах). Sora/HappyHorse/Kling O1 Edit — в UI, отдельными MCP-`id` в дампе 2026-07-11 не пришли.
