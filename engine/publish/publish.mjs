/**
 * publish.mjs — публикация готового пакета выпуска в несколько каналов сразу.
 *
 * Вход — папка, которую собрал `reels/release.mjs`. Скрипт НИЧЕГО не придумывает
 * и ничего не переписывает: он берёт уже принятые вами файлы и тексты и отдаёт их
 * в Upload-Post — сервис-посредник, у которого один API на два десятка площадок.
 *
 * Почему через посредника, а не напрямую в соцсети. Прямая интеграция — это
 * отдельное приложение-разработчика, ревью и живой токен на КАЖДОЙ площадке.
 * У нас на этом сгорели недели: токен LinkedIn протухает и без client_id/secret
 * не обновляется, а приложение Meta ревьюит доступ к публикации отдельно. Один
 * платный посредник дешевле пяти интеграций, которые надо чинить поодиночке.
 *
 * ЧТО СКРИПТ НЕ ДЕЛАЕТ. Он не решает, готов ли выпуск. Приёмка глазами —
 * на человеке, и её нельзя выкинуть: автопилот без приёмки штампует брак быстрее
 * и в бóльших количествах, чем руки. Это не теория — на этом мы выключили свою
 * первую ферму. Поэтому по умолчанию скрипт показывает план и требует --yes.
 *
 *   node publish/publish.mjs <папка-пакета>                     # план, ничего не шлёт
 *   node publish/publish.mjs <папка-пакета> --yes               # каждая папка → своя площадка
 *   node publish/publish.mjs <папка-пакета> --to=instagram --yes
 *   node publish/publish.mjs <пакет>/03-telegram --to=telegram,linkedin --yes
 *
 * Ключи в engine/.env:
 *   UPLOAD_POST_API_KEY — upload-post.com → Settings → API Keys
 *   UPLOAD_POST_USER    — имя профиля там же (профиль = связка ваших аккаунтов)
 *
 * Коды выхода: 0 — всё ушло · 2 — часть площадок не приняла · 1 — не смог запуститься.
 */

import { readFile, writeFile, mkdir, stat, readdir, access, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const ENGINE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(ENGINE_ROOT, '.env') });

const API = process.env.UPLOAD_POST_API_URL || 'https://api.upload-post.com';

/**
 * Лимиты, на которых упирается загрузка. Это не наши выдумки, а потолки площадок:
 * файл тяжелее просто не примут, и узнать об этом на 40-й секунде аплоада обидно.
 */
const MAX_PHOTO_MB = 8;      // Instagram режет фото больше 8 МБ
const MAX_VIDEO_MB = 500;    // консервативный общий потолок посредника
const POLL_EVERY_MS = 5000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Сколько публикаций в сутки скрипт согласен отправить. Это предохранитель от
 * зацикленного расписания, а не лимит площадки: сорвавшийся cron способен за ночь
 * выложить полсотни постов и угробить аккаунт. Считаем по своему логу.
 */
const MAX_POSTS_PER_DAY = Number(process.env.MAX_POSTS_PER_DAY || 6);

// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('--'));
const DRY = !args.includes('--yes');

function flag(name, dflt = null) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
}

if (!target) {
  console.error('Использование: node publish/publish.mjs <папка-пакета> [--to=instagram,linkedin] [--yes]');
  console.error('Папку пакета собирает node reels/release.mjs <release.json>.');
  process.exit(1);
}

const profile = flag('user') || process.env.UPLOAD_POST_USER || '';
const onlyTo = (flag('to') || '').split(',').map((s) => s.trim()).filter(Boolean);
const root = path.resolve(target);

// ── Что публикуем ──
const entries = await loadEntries(root, onlyTo);
if (!entries.length) {
  console.error('Публиковать нечего: под указанные условия не попала ни одна папка.');
  console.error('Проверьте --to= и то, что пакет собран (в нём должен быть manifest.json).');
  process.exit(1);
}

console.log(`=== Публикация: ${path.basename(root)} ===`);
console.log(`профиль Upload-Post: ${profile || '(не задан)'}\n`);

// Одна и та же площадка дважды за прогон — почти всегда ошибка, а не замысел.
// Reels и карусель в один час делят охват между собой, и второй пост съедает первый.
const perPlatform = new Map();
for (const e of entries) for (const p of e.targets) {
  perPlatform.set(p, [...(perPlatform.get(p) || []), e.name]);
}
const clashes = [...perPlatform].filter(([, who]) => who.length > 1);
for (const [p, who] of clashes) {
  console.log(`⚠ ${p}: за один прогон уходит ${who.length} поста (${who.join(', ')}).`);
  console.log(`   Два поста в один час делят охват. Лучше разнести: --to= по одному.\n`);
}

// ── План ──
for (const e of entries) {
  console.log(`${e.name}  [${e.dir}]`);
  console.log(`  → ${e.targets.join(', ')}`);
  console.log(`  тип: ${e.kind === 'video' ? 'видео' : e.kind === 'photos' ? `фото (${e.media.length})` : 'текст'}`);
  for (const m of e.media) console.log(`  файл: ${path.basename(m)} (${await sizeMb(m)} МБ)`);
  console.log(`  текст: ${preview(e.title)}`);
  if (e.description) console.log(`  описание: ${preview(e.description)}`);
  if (e.borrowed.length) {
    console.log(`  ⚠ тексты писались под ${e.name}, а уходят ещё и в ${e.borrowed.join(', ')} —`);
    console.log(`     лимиты и тон там другие, перечитайте перед отправкой`);
  }
  console.log();
}

if (DRY) {
  console.log('Это только план — ничего не отправлено.');
  console.log('Посмотрели, согласны — повторите ту же команду с флагом --yes.');
  process.exit(0);
}

// ── Предполётные проверки: до первого запроса, а не после ──
if (!process.env.UPLOAD_POST_API_KEY) {
  console.error('UPLOAD_POST_API_KEY не задан в engine/.env.');
  console.error('Ключ: upload-post.com → Settings → API Keys.');
  process.exit(1);
}
if (!profile) {
  console.error('Не задан профиль: UPLOAD_POST_USER в engine/.env или флаг --user=.');
  console.error('Профиль — это связка ваших аккаунтов в Upload-Post, её видно в их интерфейсе.');
  process.exit(1);
}
for (const e of entries) {
  for (const m of e.media) {
    const mb = Number(await sizeMb(m));
    const limit = e.kind === 'photos' ? MAX_PHOTO_MB : MAX_VIDEO_MB;
    if (mb > limit) {
      console.error(`${path.basename(m)} весит ${mb} МБ — потолок ${limit} МБ. Площадка не примет.`);
      process.exit(1);
    }
  }
}

const already = await postsToday();
if (already + entries.length > MAX_POSTS_PER_DAY) {
  console.error(`Сегодня уже ушло ${already} публикаций, в этом прогоне ещё ${entries.length}.`);
  console.error(`Предохранитель стоит на ${MAX_POSTS_PER_DAY} в сутки (MAX_POSTS_PER_DAY в .env).`);
  console.error('Если это не сорвавшееся расписание, а осознанный залп — поднимите значение.');
  process.exit(1);
}

// ── Отправка ──
let failed = 0;
for (const e of entries) {
  console.log(`— ${e.name} → ${e.targets.join(', ')}`);
  try {
    const res = await send(e);
    const rows = normalizeResults(res);
    const bad = rows.filter((r) => !r.success);
    for (const r of rows) {
      console.log(r.success
        ? `  ✓ ${r.platform}${r.url ? ` ${r.url}` : ''}`
        : `  ✗ ${r.platform}${r.error ? `: ${r.error}` : ''}`);
    }
    failed += bad.length;
    if (!rows.length) console.log(`  · ответ без разбивки по площадкам: ${JSON.stringify(res).slice(0, 300)}`);
    await log({ entry: e.name, targets: e.targets, ok: rows.length > 0 && bad.length === 0, results: res.results || res });
  } catch (err) {
    failed += 1;
    console.log(`  ✗ ${err.message}`);
    await log({ entry: e.name, targets: e.targets, ok: false, error: err.message });
  }
}

console.log();
if (failed) {
  console.log(`Не прошло: ${failed}. Разбор — в publish/log/${today()}.jsonl.`);
  console.log('Частые причины: аккаунт не подключён к профилю · формат площадке не подходит ·');
  console.log('кончился лимит тарифа · токен площадки в Upload-Post требует переподключения.');
  process.exit(2);
}
console.log('Опубликовано. Проверьте посты глазами в самих приложениях — API рапортует об');
console.log('успехе загрузки, но не о том, что пост выглядит так, как вы задумали.');

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Читаем, что собрал release.mjs. Работаем и с корнем пакета, и с одной папкой
 * площадки: человеку удобнее «выложи только телеграм», чем вспоминать флаги.
 */
async function loadEntries(dir, only) {
  const manifestPath = await findManifest(dir);
  if (!manifestPath) {
    console.error(`В ${dir} нет manifest.json.`);
    console.error('Пакет собирается командой node reels/release.mjs <release.json> —');
    console.error('манифест появляется в нём автоматически. Старые пакеты нужно пересобрать.');
    process.exit(1);
  }
  const pkgRoot = path.dirname(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const single = path.resolve(dir) !== pkgRoot ? path.basename(path.resolve(dir)) : null;

  const out = [];
  for (const p of manifest.platforms || []) {
    if (single && p.dir !== single) continue;

    // Куда шлём. По умолчанию — родная площадка папки. Если человек назвал
    // площадки явно, для одной папки это прямое указание, а для всего пакета —
    // фильтр: «из всего пакета выложи только то, что идёт в инстаграм».
    let targets = [p.uploadPost].filter(Boolean);
    if (only.length) targets = single ? only : targets.filter((t) => only.includes(t));
    if (!targets.length) continue;

    const dirAbs = path.join(pkgRoot, p.dir);
    const media = [];
    for (const m of p.media || []) media.push(path.join(dirAbs, m));
    for (const m of media) await mustExist(m);

    out.push({
      name: p.name,
      dir: p.dir,
      kind: p.kind,
      media,
      targets,
      // Заголовок и описание — разные поля только у YouTube: там title это имя
      // ролика (100 знаков), а весь текст живёт в описании. У остальных площадок
      // подпись одна, и она едет в title.
      title: p.titleFile ? (await readFile(path.join(dirAbs, p.titleFile), 'utf8')).trim() : '',
      description: p.descriptionFile ? (await readFile(path.join(dirAbs, p.descriptionFile), 'utf8')).trim() : '',
      borrowed: targets.filter((t) => t !== p.uploadPost),
    });
  }
  return out;
}

/** Манифест лежит в корне пакета — ищем его в самой папке и на уровень выше. */
async function findManifest(dir) {
  const here = path.join(path.resolve(dir), 'manifest.json');
  if (await exists(here)) return here;
  const up = path.join(path.dirname(path.resolve(dir)), 'manifest.json');
  if (await exists(up)) return up;
  return null;
}

/**
 * Один вызов Upload-Post на папку: все выбранные площадки уходят одним запросом
 * массивом platform[]. Эндпоинт выбирается типом медиа.
 *
 * Режим async обязателен для каруселей: синхронная multipart-загрузка нескольких
 * картинок рвётся на прокси с 504/499 — сервис отвечает сразу request_id и грузит
 * в фоне, а мы опрашиваем статус. Это выяснилось живым прогоном, не из документации.
 */
async function send(e) {
  const form = new FormData();
  form.append('user', profile);
  for (const t of e.targets) form.append('platform[]', t);
  form.append('title', e.title || e.description);
  if (e.description && e.title) form.append('description', e.description);
  form.append('async_upload', 'true');

  let endpoint = '/api/upload_text';
  if (e.kind === 'video') {
    endpoint = '/api/upload';
    form.append('video', await blobOf(e.media[0]), path.basename(e.media[0]));
  } else if (e.kind === 'photos') {
    endpoint = '/api/upload_photos';
    for (const m of e.media) form.append('photos[]', await blobOf(m), path.basename(m));
  }

  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Apikey ${process.env.UPLOAD_POST_API_KEY}` },
    body: form,
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(`Upload-Post ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);

  if (data?.request_id && !data?.results) {
    console.log(`  ⏳ загрузка идёт в фоне (request_id ${data.request_id}), ждём…`);
    return await poll(data.request_id, data.job_id);
  }
  return data;
}

/**
 * Опрос статуса фоновой загрузки. Сетевую икоту не считаем провалом — повторяем.
 *
 * Ждём ровно `status: completed|failed` и ничего кроме. Живой прогон 02.08.2026:
 * первый же ответ пришёл со `status: processing` и уже заполненным `results`, где
 * у площадки стояло `success: false`. Прежнее условие «есть results — значит готово»
 * приняло это за отказ и напечатало ✗, хотя через полминуты пост благополучно вышел.
 * Ложный провал хуже молчания: человек идёт чинить то, что работает.
 */
async function poll(requestId, jobId) {
  const until = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
    try {
      const qs = new URLSearchParams({ request_id: requestId, ...(jobId ? { job_id: jobId } : {}) });
      const res = await fetch(`${API}/api/uploadposts/status?${qs}`, {
        headers: { Authorization: `Apikey ${process.env.UPLOAD_POST_API_KEY}` },
      });
      const data = await safeJson(res);
      const st = data?.status || data?.state;
      if (st === 'completed' || st === 'failed') return data;
      // Строку прогресса перерисовываем на месте, но только в живом терминале:
      // в логе cron возврат каретки не работает и превращается в простыню повторов.
      if (data?.total && process.stdout.isTTY) {
        process.stdout.write(`  … готово ${data.completed || 0} из ${data.total}\r`);
      }
    } catch {
      // молчим и пробуем ещё: обрыв опроса не означает, что публикация не идёт
    }
  }
  throw new Error(`Статус не пришёл за ${POLL_TIMEOUT_MS / 60000} минут. Проверьте ленту руками: пост мог уйти.`);
}

/**
 * Ответ приходит в двух формах, и обе живые: статус фоновой загрузки отдаёт
 * `results` МАССИВОМ объектов с полем `platform`, а синхронный ответ — объектом,
 * где ключ и есть площадка. Приводим к одному виду: иначе разбор молча ломается
 * на одной из веток и печатает «✗ 0» вместо имени площадки (поймано боем 02.08.2026).
 */
function normalizeResults(res) {
  const raw = res?.results;
  const pick = (r, platform) => ({
    platform,
    success: Boolean(r?.success),
    url: r?.post_url || r?.permalink || '',
    error: r?.error_message || r?.error || '',
  });
  if (Array.isArray(raw)) return raw.map((r) => pick(r, r?.platform || '?'));
  if (raw && typeof raw === 'object') return Object.entries(raw).map(([p, r]) => pick(r, p));
  return [];
}

/** Свой лог публикаций. Нужен и для предохранителя, и чтобы понять, что вчера ушло. */
async function log(row) {
  const dir = path.join(ENGINE_ROOT, 'publish', 'log');
  await mkdir(dir, { recursive: true });
  await appendFile(path.join(dir, `${today()}.jsonl`),
    JSON.stringify({ at: new Date().toISOString(), ...row }) + '\n', 'utf8');
}

async function postsToday() {
  try {
    const txt = await readFile(path.join(ENGINE_ROOT, 'publish', 'log', `${today()}.jsonl`), 'utf8');
    return txt.split('\n').filter((l) => l.trim() && JSON.parse(l).ok).length;
  } catch { return 0; }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function blobOf(p) {
  return new Blob([await readFile(p)]);
}

async function sizeMb(p) {
  return ((await stat(p)).size / 1024 / 1024).toFixed(1);
}

async function safeJson(res) {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { raw: txt.slice(0, 500) }; }
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function mustExist(p) {
  if (!(await exists(p))) {
    console.error(`Не нашёл файл пакета: ${p}`);
    console.error('Пересоберите пакет: node reels/release.mjs <release.json>');
    process.exit(1);
  }
}

function preview(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t ? `${t.slice(0, 70)}${t.length > 70 ? '…' : ''}  (${[...t].length} зн.)` : '(пусто)';
}
