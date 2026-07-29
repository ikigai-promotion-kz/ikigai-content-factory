<!-- синтез neural-nets-research 2026-07-11 из N06; ground-truth: _SEED-mcp-catalog.md -->
# Higgsfield Supercomputer — что это и нужно ли оно движку

> **Назначение:** ответ на вопрос основателя «можно ли подключить Higgsfield Supercomputer из нашего Claude Code и стоит ли гонять карусели через него». Карта продукта Supercomputer (Orchestrator / Apps / Employees / Skills / Memory / Connectors) и его отношение к нашему уже подключённому `mcp__higgsfield__*`.
> **Как использует движок:** reference-слой для `model-router` и решения «где рендерить». Прямого runtime нет — движок ходит в Higgsfield напрямую через MCP, а не через Supercomputer. Пока не подключён в `lib/corpus.js`.
> **Дата:** 2026-07-11 · **Источник:** higgsfield.ai + офиц. доки + _SEED-mcp-catalog.md

---

## TL;DR — три ответа одной строкой
1. **Подключиться из нашего Claude Code?** — Уже подключены. Supercomputer и наш `mcp__higgsfield__*` бьют в один backend (`https://mcp.higgsfield.ai`), одна библиотека, один кредитный счётчик. Отдельного «Supercomputer API» для внешних агентов нет — это веб-фронтенд поверх того же движка.
2. **Гонять carousel-engine через Supercomputer?** — Нет. Прямой MCP/CLI дешевле и короче: в Supercomputer даже текстовые шаги оркестратора тратят кредиты, у нас — только сами генерации. Заходить в веб-Supercomputer точечно (демо-апп для контеста, референс Skills/Employees, Connectors к соцсетям).
3. **«Unlimited»-модели там бесплатны?** — Нет. Безлимитные/free-модели работают ТОЛЬКО на самом сайте higgsfield.ai, НЕ в MCP/CLI/Canvas/Supercomputer. Экономика прямого MCP = экономике Supercomputer.

---

## Что такое Supercomputer
`higgsfield.ai/supercomputer` — агентный чат-воркспейс: «опиши, что хочешь» → агент планирует шаги, сам выбирает модели/пресеты, показывает кредит-стоимость ДО рендера, ждёт Approve, исполняет. Позиционируется как «creative director + production coordinator + marketer» в одном агенте. **Это НЕ отдельная платформа с другим API** — UI/оркестратор над тем же бэкендом, что у нас.

| Механика | Суть | Метка |
|---|---|---|
| **Orchestrator** | Слой авто-роутинга модели на каждый шаг («дешевле и быстрее») | ⚠ проверить в MCP — метрики выигрыша не приведено |
| **Approve-флоу** | Перед платным шагом: модель/качество/длительность/AR + кредит-цена; кредиты тратятся только после Approve | — |
| **Efficient / Smart** | Черновик vs качественный финал; Smart недоступен на Basic/Starter | — |
| **Model picker (LLM-мозг)** | Claude Opus 4.6/4.7, Sonnet 4.6, Gemini 3.1 Pro/3.5/3.0 Flash, GPT-5.5, Grok 4.3, Kimi K2.6, DeepSeek V4 Pro | ⚠ фронтир на 2026-07, сверять |
| Не realtime-редактор | Отдаёт готовые ассеты; фрейм-левел монтаж — уже в другом инструменте | — |

**Рекомендация LLM-мозга (по Higgsfield):** Sonnet 4.6 — дефолт продакшена, Opus 4.6 — сложные многошаговые кампании/контент-планы, Grok 4.3 — research-first брифы.
**Кредит-математика (офиц. пример):** анимация Seedance 2.0 (10с/1080p/High) ≈ 90 кредитов (~$4.50); полный e2e (картинка+анимация) ≈ 200 кредитов (~$10).

---

## MCP & CLI — главный вопрос: то же самое, что наш коннектор?
**Да.** Три способа подключения, один backend:

| Способ | URL / команда | Для кого | Метка |
|---|---|---|---|
| **MCP-коннектор** | `https://mcp.higgsfield.ai/mcp` (стр. `/mcp`) ИЛИ `https://mcp.higgsfield.ai` (блог, без суффикса) | web-Claude/ChatGPT/Cursor/OpenClaw/Hermes | ⚠ проверить в MCP какой суффикс актуален |
| **CLI** | `npm i -g @higgsfield/cli` → `higgsfield auth login`; skills: `npx skills add higgsfield-ai/skills`; репо `github.com/higgsfield-ai/cli` | **рекомендован для Claude Code/Codex** | ⚠ проверить, на CLI мы или web-MCP; мигрировать ли |
| **Supercomputer** | веб-чат higgsfield.ai | non-tech юзер, их фирменный UI | — |

Офиц. цитата (блог MCP+Claude): «*one shared library and credit pool*» для любого MCP-совместимого клиента (Cowork/OpenClaw/Hermes/NemoClaw) — то есть **наш `mcp__higgsfield__*` и Supercomputer используют один счётчик кредитов и одну библиотеку генераций**, разница только во фронтенде.

Через MCP/CLI доступно 30+ моделей image/video (полный ground-truth id — `_SEED-mcp-catalog.md`), Soul Character training, face swap/de-aging, motion brushes, first/last-frame interpolation, v2v-restyle, batch/parallel для кампаний. Требования: Claude с custom connectors + Higgsfield-аккаунт с кредитами; на managed/enterprise Anthropic-планах админ добавляет URL в allowlist.

**Ограничение экономики:** «*Unlimited models and Free Generations are accessible only via higgsfield.ai and are not accessible on MCP/CLI, Canvas or Supercomputer*». Внутри самого Supercomputer безлимит тоже НЕ работает → прямой MCP не дороже.

---

## Apps / Websites / Games (билдер внутри Supercomputer)
«Опиши на естественном языке» → агент пишет фронт+бэк+БД+auth и подключает 15+ генеративных моделей Higgsfield без API-ключей.

| Параметр | Значение |
|---|---|
| Типы | Custom · Simple App · Studio · Preset App |
| Стили | Custom · Higgsfield · Y2K · Modern |
| Режимы сборки | Efficient (быстрее) · Smart (сложная логика) |
| URL публикации | `<name>.higgsfield.app` |
| Лимит | до 20 приложений/день |
| Монетизация автора | юзеры генерят на СВОИХ кредитах → автору billing = $0 |
| Из MCP? | Да: «build apps directly from Claude or Cursor via Higgsfield MCP» |

Публикация → авто-модерация (malicious/NSFW/IP) → авто-SEO + security-чек → авто cover/иконка/описание. 500+ приложений в маркетплейсе (Prompt Tycoon, FaceSplainer, Plushies).
Ground-truth тулы (SEED стр. 85): `create_website`/`deploy_website`/`publish_website`/`website_*`, `deploy_game`/`publish_game`/`get_game_creation_instructions`, `get_workflow_instructions`. ⚠ проверить в MCP полные схемы.
**When-to-use для нас:** быстрый прототип генеративного мини-аппа для промо/лид-магнита без своего стека. Для самого carousel-engine НЕ подходит — у нас свой пайплайн.

---

## AI Employees — референс паттернов промптинга
Предустановленные «роли»-агенты = Skills + Memory + Connectors под функцию. Ценность для нас — **как референс структуры промптов**, не как инструмент.

| Employee | Назначение | Наш аналог |
|---|---|---|
| Shorts Maker | 1 видео (4с–2мин) → вертикаль 9:16 в пресете | video-craft рестайлинг |
| Personal Clipper | YouTube URL → Shorts/Reels + субтитры | `personal_clipper_create` (уже в MCP) |
| Cinematic Marketing Director | Бриф → кино-маркетинг (TV ad/brand film/reel) | референс для N08 |
| Ai Cinematographer | Скрипт → cinema-промпты, 9:16 TikTok | наш 6-слойный промпт (video-craft M10) |
| Script Writer | 3 формата: кино-драматургия / zero-punct YT storytime / true-crime доку | скрипт-этап карусели/видео |
| Researcher | Independent research/fact-check + cited-отчёты + confidence | паттерн наших research-модулей |
| Tiktok Retention Editor | Сцены → TikTok edit plan + retention scoring | `virality_predictor` (уже в MCP) |

Flagship-примеры на `/supercomputer-intro`: Cartoon Generator, Motion Designer, Podcast Producer, Product Photographer (24–43 skills внутри).

---

## Skills — MCP-совместимы by design
«Skill = одна готовая способность» (монтаж и т.п.), триггер слэш-командой (`/montage`, `/cinematic`), комбинируются в employee.

Ключевой факт: **Higgsfield Explainer** запускается и в Supercomputer (`skill[video-explainer-workflow] ...`), и напрямую в Claude через MCP (кнопка «Try in Claude» → `claude.ai/new?q=...` с готовым промптом) → skills изначально проектируются MCP-совместимыми, не привязаны к веб-чату. (Пересечение с N05/N07.)

Топ маркетинг-skills по установкам: Social Content (5436), Ad Creative (4701), Content Strategy (4169), Marketing Ideas (4149), Marketing Psychology (3891), Paid Ads (3279).

**Импорт своих skills:** «Import your skills and memory from Claude, Claude Code, Codex and ChatGPT» — наши Claude Code skills в теории импортируемы одним кликом. ⚠ LOW-CONFIDENCE — механизм конвертации markdown-skill не описан публично.

---

## Memory & Connectors
- **Memory** (`/supercomputer/memory`) — проприетарный граф памяти (узлы/связи, ручное удаление, Import). Отличие от нашей `memory/*.md`: НЕ экспортируемый markdown, нельзя утащить в репозиторий 1-в-1; направление переноса Claude→Higgsfield подтверждено, обратное — нет.
- **Connectors** — 30+ (Slack/Google Drive/Notion/Gmail/Figma): агент читает бриф из документа, кладёт файлы, постит в канал.
- **Social Connectors** (X/Threads/Instagram, 32 тула: `get_x_profile`, `publish_instagram_carousel`, `publish_threads_video`, `list_x_mentions`, `get_instagram_container_status` и др.) — карта возможностей для автопостинга минуя наш Upload-Post/Buffer стек. ⚠ проверить в MCP: **ни один social-connector тул НЕ в нашем `_SEED-mcp-catalog.md`** → либо только внутри Supercomputer-воркспейса, либо не включён в наш стандартный коннектор. Не считать доступными без проверки.

---

## Тарификация / лимиты
Supercomputer есть на ВСЕХ платных планах (включая базовый). ⚠ LOW-CONFIDENCE: страница pricing пришла двумя разными сетками (A/B-тест или устаревший кэш) — **не использовать как финальные цифры, сверять через `show_plans_and_credits`/`balance` в живом MCP**.

| План | /мес | Кредиты/мес | Параллельно | Smart supercomputer | Scheduled |
|---|---|---|---|---|---|
| Basic | $9 | 120 | 2в/2ф | нет | нет |
| Pro | $23 | 600–900 | 3в/4ф | да | ⚠ |
| Max | $59 | 1800–5400 | 8в/8ф | да | ⚠ |
| Starter | $19 | 270 | 2в/4ф | нет | нет |
| Plus | $47 | 1200 | 6в/8ф | да | до 2 |
| Ultra | $99 | 3000–9000 | 8в/8ф | да | до 10 |
| Team | $65/место | 1000/место | до 16в/16ф | да | — |

**Кредитный курс (актуален и для MCP/CLI-генераций):** Seedance 2.0 — 22 кр/5с@720p · 45/5с@1080p · 110/5с@4K; Kling 3.0 — 7/5с@720p; Nano Banana Pro — 2 кр/изобр (4/изобр@4K); GPT Image — 1 кр/изобр; Sora 2 Pro Max — 54 кр/4с@1080p. Дублируется в MCP через `show_plans_and_credits`.
**Важно:** в Supercomputer текстовые шаги оркестратора тоже тратят кредиты («*credits are also used for text requests*»). Для прямого MCP/CLI это НЕ применимо (наши Claude-токены не идут через кредиты Higgsfield) → аргумент за прямой MCP при экономии кредитов.

---

## $100K App Contest (ситуативно)
- Собрать генеративное приложение на моделях Higgsfield (через Supercomputer ИЛИ Claude/Cursor + MCP — оба разрешены), паблиш на `*.higgsfield.app`, пост `#HiggsfieldApp`, сабмит «Submit an App» на `/supercomputer/apps`.
- Фонд $100k: 1-е $25k · 2-е $15k · 3-е $10k · 10× по $5k (13 мест). Участие бесплатно.
- ⚠ LOW-CONFIDENCE даты: дедлайн «July 21» (блог) vs «July 22» (Instagram/виджет); победители 28 или 29 июля. Ориентироваться на актуальный баннер `/supercomputer` в момент решения. Правила — `/supercomputer/apps?tab=prizes` ⚠ проверить перед подачей.
- **Для IKIGAI PROMOTION:** если участвуем — собрать демо (например, генератор карусельных обложек на базе наших промпт-паттернов @ваш_аккаунт) прямо через уже подключённый `mcp__higgsfield__*`, без захода в веб-Supercomputer.

---

## Практика: Supercomputer или наш Claude Code + MCP?
1. **Модельная база и кредит-счётчик идентичны** в обоих путях (офиц. «one shared library and credit pool»).
2. **Supercomputer = прослойка**: свой LLM-оркестратор, approve-степ с credit-preview, память-граф, Apps/Websites/Games, Employees/Skills marketplace, Connectors. Полезно non-tech юзеру в их UI, избыточно нам — у нас свой пайплайн и управление моделями через `_SEED-mcp-catalog.md`.
3. **Прямой MCP/CLI дешевле по факту**: там текстовые шаги стоят кредиты, у нас платим только за генерации.
4. **Рекомендация:** основной путь — напрямую `mcp__higgsfield__*` (уже подключён). Веб-Supercomputer точечно: (а) быстрый демо-прототип через Apps-builder для контеста/презентации; (б) референс Skills/Employees в Marketplace (Higgsfield Explainer, Ai Cinematographer); (в) Connectors к Slack/Notion/соцсетям, если понадобится автопостинг минуя текущий стек.

**Грабли:** разночтение MCP-endpoint (`/mcp` vs без суффикса) · противоречивая pricing-сетка (сверять в MCP) · social-connectors не в SEED (не считать доступными) · «unlimited»-модели не работают нигде кроме сайта · механизм import skills/memory не описан.

---

## Связь с движком
| Куда встроить | Что добавить |
|---|---|
| **model-router** | Правило по умолчанию: рендер через прямой `mcp__higgsfield__*`, НЕ через Supercomputer (экономия кредитов на текстовых шагах). Ссылка на кредитный курс выше для оценки cost/шаг. |
| **art-director.md** | Референс паттернов промптинга из AI Employees (Ai Cinematographer → структура cinema-промпта; Script Writer → форматы скрипта). Кросс-ссылка, не дублировать. |
| **video-craft.md §M10/M11** | НЕ дублировать 6-слойный промпт — здесь только указатель, что Ai Cinematographer/Higgsfield Explainer — внешние аналоги того же приёма. |
| **creo-formats** | Social Connectors как потенциальный путь автопостинга (`publish_instagram_carousel` и др.) — пометка «⚠ проверить в MCP, недоступно в текущем коннекторе». |
| **`lib/corpus.js`-цепочка** | Пока reference-слой, в runtime не подключать: Supercomputer не даёт движку ничего, чего нет в прямом MCP. |
