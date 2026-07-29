<!-- синтез neural-nets-research 2026-07-11 из N01 (image-models); ground-truth: _SEED-mcp-catalog.md -->
# Higgsfield IMAGE-модели — engine-facing

> **Назначение:** карта всех image-моделей нашего Higgsfield-MCP (аккаунт `ikigai_promotion`, план ultimate) — что каждая умеет, точные `id`/параметры и **когда её брать под задачи карусели/баннера/hero/схемы**. Это словарь для рендер-роутера статики: hero с точным русским текстом, слайд-инфографика, вектор-логотип, character-lock «одно лицо на всех слайдах».
> **Как использует движок:** питает роутер рендера — `lib/art-director.js` (выбор модели под арт-спек) и `lib/genimage.js` (вызов generate_image). Сейчас **reference-слой, не runtime**: `lib/corpus.js` этот файл пока НЕ читает, движок остаётся fal-first. Заготовка под Higgsfield-ветку рендера в `/carousel-day` ШАГ рендера.
> **Дата:** 2026-07-11 · **Источник:** higgsfield.ai + офиц. доки + _SEED-mcp-catalog.md

---

## TL;DR — решения одной строкой

- **Hero/баннер с точным русским текстом** → `gpt_image_2` (единственная модель с прямо подтверждённой кириллицей, >95% точность, native 4K).
- **Слайд-инфографика / схема / диаграмма** (лейбл точно на месте) → `nano_banana_pro` (reasoning-движок: понимает layout до рендера).
- **Быстрый батч вариаций слайдов** → `nano_banana_2` (2–3× быстрее Pro, близкое качество), для дешёвого перебора — `nano_banana_2_lite` / `z_image`.
- **Логотип / иконка / вектор-схема** → `recraft_v4_1` с `model_type: vector` — единственный настоящий SVG в каталоге.
- **Одно «лицо бренда» на всех слайдах** → `soul_2` (`soul_id`, тренировка 1 раз) либо `seedream_v4_5` (14 референсов за вызов).
- **Слайд на актуальный тренд / стилевой трансфер по примеру** → `seedream_v5_pro` (web-retrieval + example-based editing).
- **Brand-locked баннер с точным HEX** → `flux_2` (JSON-промпт + точный HEX).
- **Точечная правка готового слайда** (сменить слово/цвет без регенерации) → `flux_kontext`.
- **E-commerce батч в едином бренд-стиле** → `marketing_studio_image` / `ms_image` (нужен `style_id`/`brand_kit_id`).

---

## Топ-модели (hero / баннер / премиум-статика)

| id | провайдер | params (seed) | AR | Сильное | Слабое | When-to-use |
|---|---|---|---|---|---|---|
| `gpt_image_2` | OpenAI | resolution 1k/2k/**4k**; quality low/med/**high** | 1:1,4:3,3:4,16:9,9:16,3:2,2:3 | Фотореализм без «AI-каста»; **>95% текст, вкл. кириллицу** (curved surfaces, мелкий кегль); native 4K; single-pass (~2× быстрее GPT 1.5); надёжный upload+edit | Медленнее Nano Banana 2 на батчах ⚠ проверить в MCP; нет 4:5 | **Баннер/hero с русским текстом**, packaging-мокапы, product shots, посты с точным брендовым текстом |
| `nano_banana_pro` | Google (Gemini 3 Pro Image) | resolution 1k/2k/**4k** | 11 шт (вкл. 4:5,5:4,21:9) | «Reasoning-инженер сцены» — понимает spatial logic/hierarchy/charts до рендера; native 2K→intelligent 4K (16-bit, меньше банддинга); flawless typography; Hex/RGB brand-color; consistency до 5 персонажей/14 объектов | Медленнее Nano Banana 2 (доп. thinking-pass) | **Инфографика/схема/диаграмма на слайде** (charts+labels точно), сложные многоэлементные сцены, hero с точной типографикой |
| `nano_banana_2` | Google (Gemini 3.1 Flash Image) | resolution 1k/2k/4k | 11 шт (вкл. 4:5) | Тот же движок, Flash-скорость: **2–3× быстрее Pro** при близком качестве; 512px–4K; consistency 5/14; Image Search Grounding | Уступает Pro на плотной типографике и strict spatial logic | **Быстрые батчи слайдов** (много вариаций), соц-контент, черновой проход перед финалом на Pro |
| `nano_banana_2_lite` | Google | resolution 1k; **thinking MINIMAL/HIGH**; image_references; auto AR | +auto | Лёгкая/быстрая, переключатель thinking | Ниже потолок качества ⚠ проверить в MCP | Массовые дешёвые варианты, быстрый A/B перебор композиций |
| `seedream_v5_pro` | ByteDance | resolution 1k/1.5k/2k | 8 шт | «Думает перед рисованием»: real-time **web-retrieval** (актуальные тренды без ручного тумблера), multi-step reasoning (физика/spatial), **example-based editing** (пара до/после → трансформация к новому фото); native 2K→4K | Native-разрешение ниже (2K vs 4K нативно у Pro/GPT2) | Слайды на **актуальные темы/тренды**, стилевой transfer через пример без словесного описания стиля |
| `seedream_v5_lite` | ByteDance | quality basic/high | 1:1,16:9,9:16,4:3,3:4 | Reasoning + instruction-edit дешевле Pro | Меньше AR, ниже потолок | Бюджетный reasoning-проход, инструкционная правка |
| `seedream_v4_5` | ByteDance | quality basic(→4K)/high(→~6K) | 8 шт | 94% точность сложной типографики; до 90% консистентности персонажа; **14 референсов за вызов** (макс. в каталоге); unified ген+edit; native 4K | Нет web-retrieval и example-editing (это дала 5.0) | Мульти-слайд карусель с **одним лицом/продуктом на всех кадрах** (14 refs) |

**Практическая развилка топ-3:** русский текст на hero → `gpt_image_2`; точный лейаут инфографики → `nano_banana_pro`; тренд/стилевой трансфер по примеру → `seedream_v5_pro`.

---

## Character / cinematic

| id | провайдер | params (seed) | AR | Сильное | Слабое | When-to-use |
|---|---|---|---|---|---|---|
| `soul_2` / `soul_v2` | Higgsfield | quality 1.5k/2k; **soul_id** | 1:1,16:9,9:16,4:3,3:4,3:2,2:3 (**нет 4:5**) | `soul_id` — персонаж тренируется 1 раз (мин. 20 фото, ~3 мин) → держит identity across style/pose/lighting **без референса в каждом промпте**; 20+ кураторских пресетов; Soul HEX + Soul Moodboard | Нет 4:5 AR | **UGC/лайфстайл-карусели с одним «лицом бренда» на всех слайдах**, editorial/campaign-серии |
| `soul_cinematic` | Higgsfield | quality 1.5k/2k; **soul_id** | +21:9 (**нет 4:5**) | Кино-свет, concept-art, film-эстетика; тот же `soul_id` | Нет 4:5 | Кинематографичный hero/обложка карусели, драматичный кадр |
| `cinematic_studio_2_5` | Higgsfield | resolution 1k/2k/4k | 11 шт (вкл. 4:5,21:9) | Cinema-стили, до 4K; та же оптическая система, что видео Cinema Studio | — | Широкоформатный hero (21:9), кино-обложка · камера-стек см. `video-craft.md` §M10 |

> **soul_id — не референс, а тренировка.** Принципиально иной механизм, чем `image_references` у Seedream/Kling: один раз обучил (`show_characters` → train Soul), дальше character держится без загрузки фото на каждый вызов. Точка входа под «один персонаж на всех слайдах» без per-call референса.

---

## Vector / typography / JSON-control

| id | провайдер | params (seed) | AR | Сильное | Слабое | When-to-use |
|---|---|---|---|---|---|---|
| `recraft_v4_1` | Recraft | resolution 1k/2k; **model_type** standard/**vector**/utility/utility_vector; **colors[]**; **background_color** | 9 шт (вкл. 4:5) | Единственный **настоящий SVG/вектор** (реальные слои, не растр-трейс); лучший native SVG для лого/иконок; точный контроль палитры; V4.1 улучшил текст (короткие/средние фразы), мягкие градиенты, short-prompt adherence | Не для фотореализма — про геометрию/дизайн | **Логотипы, иконки, векторные схемы/диаграммы** карусели, где нужен editable SVG, а не растр |
| `flux_2` | BFL | resolution 1k/2k; **variant pro/flex/max** | 1:1,4:3,3:4,16:9,9:16 | **Нативный JSON-структурированный промпт** (camera angle/lens/shot type/style — код-уровень); **точный HEX** для градиентов; native multi-language без prompt-upsampling; сильная physics-модель | max дороже/медленнее ⚠ проверить в MCP; нет 4:5 | **Brand-locked баннеры с точным HEX** по гайдлайну, инфографика на нескольких языках, точная camera-геометрия через JSON |
| `flux_kontext` | BFL | — (i2i-edit) | 5 шт | Прицельная правка по слову: «замени текст на вывеске на "X"» — **кавычки = точная замена** без затрагивания макета; явное называние стиля + explicit-preservation даёт предсказуемый style-transfer | Требует референс-изображение (не чистый t2i) | **Точечная правка готового баннера/слайда** без полной регенерации (смена цвета продукта, замена слова) |

---

## Прочие модели каталога

| id | провайдер | params / особенности | When-to-use |
|---|---|---|---|
| `grok_image` | xAI | resolution 1k/2k; mode std/quality. Expressive/high-contrast; prompt-структура «Subject+Scene+Style+Lighting+Mood+AR»; thread-continuity держит единый стиль по серии; editing до 3 refs | Серия слайдов с единым «настроением», высокий контраст/экспрессия, не глянцевый фотореализм |
| `kling_omni_image` | Kling O1 (Kuaishou) | resolution 1k/2k. До **10 референсов** в мульти-reference (2-е место после Seedream 4.5); sketch-guided; локальные правки с сохранением контекста | Фотореалистичные широкоформатные кадры с множеством референсов идентичности/продукта |
| `z_image` | Tongyi-MAI (Alibaba) | Turbo: фотореализм <1 сек на 8 steps; Base: 30–50 шагов, богаче деталь; сильный EN+CN текст, 6B, Apache 2.0. ru-текст в источниках не упомянут ⚠ проверить в MCP | Массовые дешёвые/быстрые draft-варианты слайдов, где бюджет важнее пиксель-перфекта |
| `openai_hazel` | OpenAI | quality low/med/high. UI-мокапы, подписанные диаграммы, плотные текстовые layout. **⚠ LOW-CONFIDENCE:** вероятно GPT Image 1.5, официальной страницы Higgsfield с этим слагом не найдено | Диаграммы/инфографика как fallback к `gpt_image_2`; для актуальной работы предпочитать `gpt_image_2` |
| `marketing_studio_image` | Higgsfield | resolution 1k/2k/4k. Product-ads с brand kit | E-commerce баннеры продукта в фирменном стиле |
| `ms_image` | Higgsfield (DTC Ads) | **style_id REQUIRED** (`show_marketing_studio`); brand_kit_id; batch_size 1–20; product_ids | Батч A/B рекламных креативов одного продукта в едином бренд-стиле |
| `nano_banana` | Google | budget-тир первого поколения ⚠ проверить в MCP | Черновики, где Pro/2 избыточны по цене |
| `image_auto` | Higgsfield | авто-роутер по интенту | Быстрый прогон, когда конкретная модель не важна (непрозрачен выбор) |

**Edit-утилиты (тулзы, не модели):** `upscale_image`→2K/4K, `outpaint_image` (расширение/uncrop), `remove_background`, `topaz`/`bytedance_image_upscale`, `soul_cast`/`soul_location`, `autosprite`. Relight/upscale-слой пересекается с `video-craft.md` §M11 — кросс-ссылка, не дублируем.

---

## Грабли и ограничения

- **Кириллица подтверждена только у `gpt_image_2`** («particularly strong for Russian»). У Nano Banana Pro/2, Seedream, FLUX.2, Recraft заявлена мультиязычность (CJK/Korean/Thai/French), но **ru не проверен** ⚠ проверить в MCP — перед продакшн-баннером прогнать тест-строку на русском на выбранной модели. Дефолт: критичный русский текст класть на `gpt_image_2` либо **template-overlay поверх** генерации (как в video-стеке).
- **Recraft — единственный настоящий вектор.** Остальные дают растр; для editable SVG альтернативы нет, кроме `model_type: vector/utility_vector`.
- **FLUX Kontext требует референс** (i2i-edit, не t2i); кавычки в промпте — обязательный приём точной замены текста.
- **`openai_hazel`** — вероятно устаревшее имя (LOW-CONFIDENCE); предпочитать `gpt_image_2`.
- **Marketing Studio / ms_image** требуют предварительной настройки `style_id`/`brand_kit_id` через `show_marketing_studio` — не «голый» t2i.
- **Unlimited-тарифы недоступны через MCP/CLI.** Прямо на сайте: «Unlimited models and Free Generations are accessible only via higgsfield.ai… not on MCP/CLI, Canvas or Supercomputer». Значит через наш MCP генерации идут **по кредитам, не по безлимиту** — учитывать в себестоимости карусели.

## Свежесть (2025–2026)

- `gpt_image_2` — релиз 21 апр 2026 (single-pass ×2 скорость, native 4K, >95% текст); GPT Image 1.5 был 16 дек 2025.
- `recraft_v4_1` Pro — 14 мая 2026, 2048² native, Utility Pro — «highest-ranked t2i outside Google/OpenAI».
- `z_image` — Turbo ноя 2025, Base 28 янв 2026 (Apache 2.0, 6B).
- Seedream 5.0 — новее 4.5; обе доступны параллельно (разные тарифные тиры).
- Grok Imagine 1.0 — 3 фев 2026 (Flux-based).
- ⚠ LOW-CONFIDENCE: точный релиз/AR `kling_omni_image` на Higgsfield — по сторонним агрегаторам (WaveSpeed/fal/MindStudio), не по офиц. странице.

---

## Связь с движком

| Куда встроить | Что конкретно добавить |
|---|---|
| **`lib/art-director.js`** (роутер модели под арт-спек) | Правила выбора id по интенту слайда: `text-heavy hero` → `gpt_image_2`; `infographic/diagram` → `nano_banana_pro`; `vector/logo/icon` → `recraft_v4_1` (vector); `character-lock` → `soul_2`/`seedream_v4_5`; `trend/example-edit` → `seedream_v5_pro`; `brand-HEX banner` → `flux_2`; `spot-edit` → `flux_kontext`. Дефолт быстрого батча — `nano_banana_2`. |
| **`lib/genimage.js`** (вызов generate_image) | Higgsfield-ветка рендера рядом с fal: `params.model` из роутера + маппинг resolution/quality/AR по seed. Прошить KZ-кастинг и «критичный ru-текст → `gpt_image_2` или overlay». Проверять доступность 4:5 (нет у Soul/GPT2/FLUX.2 → fallback AR). |
| **`/carousel-day` (ШАГ рендера)** | Развилка провайдера рендера (fal ↔ Higgsfield) по типу слайда; для vector/character/HEX-locked задач маршрутизировать в Higgsfield. |
| **`video-craft.md` §M10/M11** | Кросс-ссылка: `cinematic_studio_2_5` — image-часть той же оптической системы, что видео Cinema Studio (§M10); relight/upscale/outpaint-утилиты — §M11. Не дублировать. |
| **Себестоимость** | В расчёт карусели заложить, что через MCP генерации идут по кредитам (не по unlimited-тарифу). |

> ⚠ **Reference-слой.** До интеграции в `lib/corpus.js` — это справочник для человека и заготовка под Higgsfield-роутер. Перед клиентским продакшном верифицировать `id`/параметры вызовом `models_explore` в MCP (метки `⚠ проверить в MCP` выше).
