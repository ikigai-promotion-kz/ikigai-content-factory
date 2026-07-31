/**
 * release.mjs — папка выпуска: ролик, обложка, слайды, тексты под каждую площадку, README.
 *
 * Публикация РУЧНАЯ и это решение, а не недоделка. Автопостинг требует либо наших
 * профилей и платного тарифа (Upload-Post), либо второго платного сервиса у студента.
 * Ни то, ни другое в комплект не входит, поэтому здесь нет ни токенов, ни обращений
 * к API соцсетей: скрипт готовит папку, человек открывает приложение и заливает.
 *
 * ТЕКСТЫ СКРИПТ НЕ ПРИДУМЫВАЕТ. Их пишет Claude Code — у него контекст бренда,
 * голоса и оффера. Движок принимает готовые из JSON и раскладывает по файлам,
 * проверяя лимиты площадок. Причина та же, что у звука в монтаже: `ANTHROPIC_API_KEY`
 * в комплекте студента нет и не будет, значит смысл живёт в скилле, а не в коде.
 *
 * Лимит превышен — скрипт СКАЖЕТ и вернёт код 2. Молча обрезать нельзя: обрезка
 * съедает CTA (он всегда в конце) и никто этого не замечает до публикации.
 *
 * node reels/release.mjs <release.json> [--out=путь] [--cover-at=0.0]
 *
 * Коды выхода: 0 — папка собрана, лимиты в норме · 2 — собрана, но есть превышения
 *              · 1 — не смог запуститься.
 */

import { mkdir, writeFile, copyFile, link, rm, access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBin } from './lib/bin.mjs';

const ENGINE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Лимиты площадок. Источники — по строкам ниже; всё это грабли, на которых
 * спотыкаются руками, а не теория.
 */
const PLATFORMS = [
  {
    key: 'instagram',
    dir: '01-instagram-reels',
    name: 'Instagram Reels',
    video: 'reel.mp4',
    cover: 'cover.jpg',
    maxHashtags: 30,
    files: (t) => [{ name: 'caption.txt', label: 'подпись', limit: 2200, text: withTags(t) }],
    // Хештеги живут в той же подписи и съедают тот же лимит — частая ошибка
    // «текст влез, а с хештегами уже нет». Больше 30 Instagram игнорирует целиком.
    limitsNote: 'подпись до 2200 знаков ВМЕСТЕ с хештегами; хештегов не больше 30',
    how: [
      'Создать → Reels → выбрать reel.mp4',
      'Обложка: «Изменить обложку» → «Добавить из галереи» → cover.jpg',
      'Подпись: скопировать целиком из caption.txt',
      'Ссылку в тексте Instagram не делает кликабельной — вести на «ссылку в шапке»',
    ],
  },
  {
    key: 'tiktok',
    dir: '02-tiktok',
    name: 'TikTok',
    video: 'reel.mp4',
    maxHashtags: 30,
    files: (t) => [{ name: 'caption.txt', label: 'описание', limit: 2200, text: withTags(t) }],
    // 2200 — консервативное значение, которое приложение принимает гарантированно.
    // Хештеги здесь тоже часть описания, отдельного поля под них нет.
    limitsNote: 'описание до 2200 знаков вместе с хештегами; отдельного поля под хештеги нет',
    how: [
      'Загрузить reel.mp4',
      'Описание: скопировать из caption.txt',
      'Обложку TikTok даёт выбрать только кадром из самого ролика — файл не грузится',
      'Проверить, что подпись не залезла под кнопки: у TikTok низ кадра занят UI',
    ],
  },
  {
    key: 'telegram',
    dir: '03-telegram',
    name: 'Telegram',
    video: 'reel.mp4',
    maxHashtags: 10,
    files: (t) => [{ name: 'caption.txt', label: 'подпись к медиа', limit: 1024, text: withTags(t) }],
    // Самая частая грабля выпуска: подпись к МЕДИА в Telegram — 1024 знака
    // (4096 только с Premium), тогда как обычное текстовое сообщение — 4096.
    // Источник по нашей базе: knowledge/creo-formats.md, §5.2, строка про альбом.
    limitsNote: 'подпись к медиа всего 1024 знака (4096 — только с Premium); длинный текст сюда не влезет',
    how: [
      'Отправить reel.mp4 в канал как ВИДЕО (не файлом), подпись — из caption.txt',
      'Если текст длиннее 1024: видео без подписи, а текст следующим сообщением',
      'Проверить в канале, что видео проигрывается кружком превью, а не открывается плеером-файлом',
    ],
    // Выпуск бывает без ролика (только карусель). Раньше площадка целиком
    // выпадала и готовый текст терялся, хотя в Telegram он живёт сам по себе.
    // Тогда это обычное сообщение, а его лимит 4096, а не 1024.
    textOnly: {
      video: null,
      files: (t) => [{ name: 'post.txt', label: 'текст поста', limit: 4096, text: withTags(t) }],
      limitsNote: 'обычное сообщение до 4096 знаков (1024 — только если текст идёт подписью к медиа)',
      how: [
        'Ролика в этом выпуске нет — идём текстовым постом',
        'Скопировать post.txt в сообщение канала',
        'Прикладываете слайды карусели альбомом — текст станет подписью к медиа, и лимит упадёт до 1024',
      ],
    },
  },
  {
    key: 'youtube',
    dir: '04-youtube-shorts',
    name: 'YouTube Shorts',
    video: 'reel.mp4',
    cover: 'cover.jpg',
    maxHashtags: 15,
    files: (t) => [
      { name: 'title.txt', label: 'заголовок', limit: 100, text: (t.title || '').trim() },
      { name: 'description.txt', label: 'описание', limit: 5000, text: withTags({ caption: t.description, hashtags: t.hashtags }) },
    ],
    // Больше 15 хештегов — YouTube перестаёт учитывать ВСЕ, а не только лишние.
    // Первые три хештега описания показываются над заголовком, поэтому порядок важен.
    limitsNote: 'заголовок до 100 знаков, описание до 5000; хештегов не больше 15 (иначе игнорируются все)',
    how: [
      'Загрузить reel.mp4 (вертикальный + до 3 минут = попадает в Shorts автоматически)',
      'Название: из title.txt, описание: из description.txt',
      'Первые 3 хештега описания видны над заголовком — держать их самыми точными',
      'Если площадка даёт загрузить свою обложку — cover.jpg; если нет, выбрать кадр',
    ],
  },
  {
    key: 'carousel',
    dir: '05-instagram-carousel',
    name: 'Instagram — карусель',
    slides: true,
    maxHashtags: 30,
    files: (t) => [{ name: 'caption.txt', label: 'подпись', limit: 2200, text: withTags(t) }],
    limitsNote: 'подпись до 2200 знаков вместе с хештегами; до 10 слайдов в посте',
    how: [
      'Создать → Публикация → выбрать слайды ПО ПОРЯДКУ (slide-01 … slide-NN)',
      'Подпись: из caption.txt',
      'Карусель и Reels лучше не выкладывать в один час: они делят охват друг с другом',
    ],
  },
];

const args = process.argv.slice(2);
const configArg = args.find((a) => !a.startsWith('--'));

function flag(name, dflt = null) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
}

if (!configArg) {
  console.error('Использование: node reels/release.mjs <release.json> [--out=путь] [--cover-at=0.0]');
  console.error('Образец конфига с пояснениями: reels/release.example.json');
  process.exit(1);
}

const cfg = JSON.parse(await readFile(path.resolve(configArg), 'utf8'));
if (!cfg.texts || !Object.keys(cfg.texts).length) {
  console.error('В конфиге нет блока "texts". Тексты пишет Claude Code (у него контекст бренда),');
  console.error('движок их только раскладывает. Формат — reels/release.example.json.');
  process.exit(1);
}

const name = cfg.name || 'release';
const outDir = path.resolve(flag('out') || cfg.outDir || path.join(ENGINE_ROOT, 'tmp', `release-${name}`));
const coverAt = Number(flag('cover-at') ?? cfg.coverAt ?? 0);

const videoPath = cfg.video ? path.resolve(cfg.video) : null;
if (videoPath) await mustExist(videoPath, 'ролик');

const slides = await resolveSlides(cfg.slides);

console.log(`=== Пакет к выпуску: ${name} ===`);
console.log(`Публикация ручная: ни токенов, ни обращений к соцсетям здесь нет.\n`);

// ── Ролик: сразу говорим правду о кадре, чтобы не узнать про поля уже в приложении ──
let videoInfo = null;
if (videoPath) {
  const { w, h } = await probeSize(videoPath);
  const dur = await probeDuration(videoPath);
  videoInfo = { w, h, dur };
  const ar = (w / h).toFixed(3);
  console.log(`ролик:  ${w}×${h} (AR ${ar}), ${dur.toFixed(1)} сек`);
  if (Math.abs(w / h - 9 / 16) > 0.02) {
    console.log(`  ⚠ кадр не 9:16 — площадки добавят поля или обрежут по своему усмотрению`);
  }
  if (dur > 180) console.log(`  ⚠ длиннее 3 минут — в Shorts не попадёт`);
}

// Папка пересобирается с нуля: остаток прошлого прогона (лишний слайд, старая
// подпись) уедет в публикацию и никто не заметит. Но чистим только СВОЮ папку —
// признак свои/чужие = README.txt нашей раскладки. Чужое молча не удаляем.
if (await exists(outDir)) {
  if (await exists(path.join(outDir, 'README.txt'))) {
    await rm(outDir, { recursive: true, force: true });
  } else if ((await readdir(outDir)).length) {
    console.error(`Папка ${outDir} не пустая и не похожа на пакет выпуска (нет README.txt).`);
    console.error('Ничего не удаляю. Указать другой путь через --out= или очистить руками.');
    process.exit(1);
  }
}
await mkdir(outDir, { recursive: true });

// Обложка снимается один раз и раздаётся площадкам, которые дают её загрузить.
let coverPath = null;
if (videoPath) {
  coverPath = path.join(outDir, 'cover-9x16.jpg');
  await runBin('ffmpeg', ['-y', '-ss', coverAt.toFixed(2), '-i', videoPath,
    '-frames:v', '1', '-q:v', '2', '-update', '1', coverPath]);
  console.log(`обложка: кадр на ${coverAt.toFixed(2)} сек → cover-9x16.jpg`);
}

// ── Раскладка по площадкам ──
const problems = [];
// Советы по тексту: подпись формально проходит лимит, но работает вполсилы.
const advice = [];
const report = [];

const usedPlatforms = [];

for (const base of PLATFORMS) {
  const t = cfg.texts[base.key] || (base.key === 'carousel' && cfg.texts.instagram ? cfg.texts.instagram : null);
  if (!t) { console.log(`\n${base.name}: пропущено — в конфиге нет texts.${base.key}`); continue; }
  if (base.slides && !slides.length) { console.log(`\n${base.name}: пропущено — слайды не переданы`); continue; }

  const videoMissing = Boolean(base.video) && !videoPath;
  if (videoMissing && !base.textOnly) { console.log(`\n${base.name}: пропущено — ролик не передан`); continue; }
  // Площадка без ролика публикуется по своим правилам: другой файл, лимит и порядок.
  const p = videoMissing ? { ...base, ...base.textOnly } : base;
  usedPlatforms.push(p);
  if (videoMissing) console.log(`\n${p.name}: ролика нет — текст сохранён как пост, а не как подпись к медиа`);

  const dir = path.join(outDir, p.dir);
  await mkdir(dir, { recursive: true });
  console.log(`\n${p.name} → ${p.dir}/`);

  if (p.key === 'carousel' && !cfg.texts.carousel) {
    console.log(`  подпись взята из texts.instagram — у карусели своей нет`);
  }

  if (p.video) {
    console.log(`  ${p.video} (${await placeMedia(videoPath, path.join(dir, p.video))})`);
  }
  if (p.cover && coverPath) {
    await placeMedia(coverPath, path.join(dir, p.cover));
    console.log(`  ${p.cover}`);
  }
  if (p.slides) {
    // Ноль в имени обязателен: в загрузчике порядок = порядок имён,
    // и «slide-10» без нуля встаёт между первым и вторым слайдом.
    for (const [i, src] of slides.entries()) {
      const dest = path.join(dir, `slide-${String(i + 1).padStart(2, '0')}${path.extname(src)}`);
      await placeMedia(src, dest);
    }
    console.log(`  слайдов: ${slides.length} (переименованы в slide-01…, иначе порядок в загрузчике поедет)`);
    if (slides.length > 10) problems.push(`${p.name}: слайдов ${slides.length}, в пост влезает 10`);
  }

  for (const f of p.files(t)) {
    const len = [...f.text].length;
    const over = len > f.limit;
    await writeFile(path.join(dir, f.name), f.text, 'utf8');
    console.log(`  ${f.name}: ${f.label} ${len} / ${f.limit} знаков${over ? '  ✗ ПРЕВЫШЕНИЕ' : ''}`);
    if (over) problems.push(`${p.name} · ${f.label}: ${len} знаков вместо ${f.limit} — лишние ${len - f.limit} площадка обрежет или не примет`);
    if (!f.text.trim()) problems.push(`${p.name} · ${f.label}: пусто`);
    report.push({ platform: p.name, file: `${p.dir}/${f.name}`, label: f.label, len, limit: f.limit, over });
  }

  const tags = countTags(p.files(t).map((f) => f.text).join('\n'));
  if (tags) {
    const over = tags > p.maxHashtags;
    console.log(`  хештегов: ${tags} / ${p.maxHashtags}${over ? '  ✗ ПРЕВЫШЕНИЕ' : ''}`);
    if (over) problems.push(`${p.name}: хештегов ${tags}, лимит ${p.maxHashtags} — сверх лимита площадка игнорирует все`);
  }
  for (const bad of (t.hashtags || []).filter((h) => /\s/.test(h.trim()))) {
    problems.push(`${p.name}: хештег «${bad}» с пробелом — площадка обрежет его по первому слову`);
  }
  for (const warn of captionWarnings(t.caption || t.description || '', p.name)) advice.push(warn);
}

// Замечания к тексту — не то же самое, что превышение лимита: лимит площадка
// накажет механически, а слабую подпись — молча. Поэтому они советы, а не блокировка.
if (advice.length) {
  console.log('\nК ТЕКСТУ (не блокирует выпуск):');
  [...new Set(advice)].forEach((a) => console.log(`  • ${a}`));
}

await writeFile(path.join(outDir, 'README.txt'), buildReadme({ name, cfg, videoInfo, coverAt, slides, report, problems, usedPlatforms }), 'utf8');

if (problems.length) {
  await writeFile(path.join(outDir, 'ПРОБЛЕМЫ.txt'),
    ['Публиковать в таком виде нельзя, пока не поправлены тексты в конфиге:', '',
      ...problems.map((p) => `• ${p}`), '',
      'Тексты правит Claude Code в release.json, потом прогон повторить — он бесплатный.'].join('\n'), 'utf8');
}

console.log(`\nпапка: ${outDir}`);
if (problems.length) {
  console.log(`\nНЕ ГОТОВО К ВЫПУСКУ, замечаний: ${problems.length} (список в ПРОБЛЕМЫ.txt)`);
  problems.forEach((p) => console.log(`  • ${p}`));
  console.log(`\nТексты обрезать сам не стал: обрезка съедает CTA, он всегда в конце.`);
  process.exit(2);
}
console.log(`\nГОТОВО — лимиты в норме. Порядок заливки в README.txt.`);
console.log(videoPath
  ? `Перед публикацией обязательно: посмотреть ролик на телефоне и послушать звук.`
  : `Перед публикацией обязательно: посмотреть слайды на телефоне — мелкий текст там пропадает.`);

// ─────────────────────────────────────────────────────────────────────────────

/** Подпись + хештеги одним текстом: на всех площадках это одно поле. */
function withTags(t) {
  const tags = (t.hashtags || []).map((h) => (h.trim().startsWith('#') ? h.trim() : `#${h.trim()}`));
  return [(t.caption || '').trim(), tags.join(' ')].filter(Boolean).join('\n\n');
}

/** Считаем хештеги в готовом тексте, а не в массиве: часть их пишут прямо в подпись. */
/**
 * Формула подписи — проверяемая часть.
 *
 * Первые 125 знаков решают: дальше площадка прячет текст под «ещё», и до второго
 * абзаца доходят единицы. Призыв должен быть ровно один — «два призыва равны нулю
 * призывов». Остальное (личный опыт от первого лица, живая интонация) машиной не
 * измеряется и живёт в скилле, где текст пишет Claude.
 *
 * Это советы, а не блокировка: подпись может сознательно нарушать правило.
 */
function captionWarnings(caption, platform) {
  const text = String(caption).trim();
  if (!text) return [];
  const out = [];
  const head = [...text].slice(0, 125).join('');
  // Смысл в первых 125 знаках: если там нет ни точки, ни вопроса, ни восклицания —
  // мысль не закончена, и в ленте видно обрывок.
  if (!/[.!?…]/.test(head) && [...text].length > 125) {
    out.push(`${platform}: в первых 125 знаках нет законченной мысли — в ленте будет виден обрывок`);
  }
  const calls = (text.match(/(напиши|пиши|переходи|подпишись|забирай|забери|жми|ставь|оставь|regis|ссылк[аи])/gi) || []).length;
  if (calls > 1) out.push(`${platform}: призывов в тексте ${calls} — два призыва равны нулю призывов, оставить один`);
  if (calls === 0) out.push(`${platform}: призыва нет вовсе — читатель дочитал и не знает, что делать`);
  return out;
}

function countTags(text) {
  return (text.match(/#[\p{L}\p{N}_]+/gu) || []).length;
}

/**
 * Файл в папке площадки. Жёсткая ссылка вместо копии: ролик уезжает в четыре папки,
 * и на длинном видео это четыре сотни мегабайт впустую. При переносе или загрузке
 * ссылка ведёт себя как обычный файл. Другой диск — ссылку сделать нельзя, копируем.
 */
async function placeMedia(src, dest) {
  await rm(dest, { force: true });
  try {
    await link(src, dest);
    return 'жёсткая ссылка, места не занимает';
  } catch {
    await copyFile(src, dest);
    return 'копия';
  }
}

/** Слайды: папка (берём slide-*.png по номеру) или готовый список файлов. */
async function resolveSlides(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    const list = input.map((s) => path.resolve(s));
    for (const f of list) await mustExist(f, 'слайд');
    return list;
  }
  const dir = path.resolve(input);
  await mustExist(dir, 'папка со слайдами');
  // Дефис И подчёркивание: конвейер каруселей пишет slide_01.png, руками чаще
  // называют slide-1.png. Прогон 31.07.2026: папка выпуска собралась без единого
  // слайда и отрапортовала «ГОТОВО» — расхождение в одном символе.
  const files = (await readdir(dir))
    .filter((f) => /^slide[-_]\d+\.(png|jpe?g)$/i.test(f))
    // Сортировка по числу, а не по строке: иначе slide-10 встанет перед slide-2.
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  if (!files.length) {
    // Молчать нельзя: «слайды не переданы» при указанной папке читается как
    // «их и не просили», и брак уезжает в публикацию.
    console.error(`В папке ${dir} нет файлов вида slide_01.png / slide-1.png — карусель собрать не из чего.`);
    process.exit(1);
  }
  return files.map((f) => path.join(dir, f));
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function mustExist(p, what) {
  try { await access(p); } catch {
    console.error(`Не нашёл ${what}: ${p}`);
    process.exit(1);
  }
}

async function probeSize(src) {
  const r = await runBin('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', src]);
  const [w, h] = r.stdout.trim().split('x').map(Number);
  if (!w || !h) throw new Error(`ffprobe не отдал размеры кадра для ${src}`);
  return { w, h };
}

async function probeDuration(src) {
  const r = await runBin('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', src]);
  return Number(r.stdout.trim());
}

/** README для человека, который будет заливать руками. Без жаргона. */
function buildReadme({ name, cfg, videoInfo, coverAt, slides, report, problems, usedPlatforms }) {
  const L = [];
  // Именно те площадки, что легли в папку: у площадки без ролика свои инструкции.
  const used = usedPlatforms.filter((p) => report.some((r) => r.platform === p.name));

  L.push(`ПАКЕТ К ВЫПУСКУ — ${name}`);
  L.push(`собран ${new Date().toLocaleString('ru-RU')}`);
  L.push('');
  L.push('Публикация руками. Автопостинга здесь намеренно нет: он требует платного');
  L.push('сервиса и доступа к вашим аккаунтам. Ниже — что куда заливать по шагам.');
  L.push('');
  L.push('─── ЧТО ВНУТРИ ───');
  L.push('');
  for (const p of used) {
    L.push(`  ${p.dir}/`.padEnd(28) + p.name);
  }
  if (videoInfo) L.push(`  cover-9x16.jpg`.padEnd(28) + `обложка (кадр на ${coverAt.toFixed(2)} сек)`);
  if (problems.length) L.push(`  ПРОБЛЕМЫ.txt`.padEnd(28) + `сначала прочитать это`);
  L.push('');
  if (videoInfo) {
    L.push(`Ролик: ${videoInfo.w}×${videoInfo.h}, ${videoInfo.dur.toFixed(1)} сек.`);
  }
  if (slides.length) L.push(`Слайдов карусели: ${slides.length}.`);
  L.push('');
  L.push('─── ПОРЯДОК ───');
  L.push('');
  L.push('Папки пронумерованы в том порядке, в котором их удобно заливать: сначала');
  L.push('видео-площадки одна за другой, карусель — отдельным постом и не в тот же час,');
  L.push('иначе два поста делят охват между собой.');
  L.push('');
  let n = 0;
  for (const p of used) {
    n += 1;
    L.push(`${n}. ${p.name}   [папка ${p.dir}/]`);
    p.how.forEach((h) => L.push(`     • ${h}`));
    L.push(`     Лимиты: ${p.limitsNote}`);
    L.push('');
  }
  L.push('─── ПЕРЕД ПУБЛИКАЦИЕЙ (проверить руками, это не заменяется скриптом) ───');
  L.push('');
  L.push('  1. Посмотреть ролик НА ТЕЛЕФОНЕ, а не на мониторе: мелкий титр,');
  L.push('     читаемый на большом экране, на телефоне превращается в шум.');
  L.push('  2. Послушать звук. Провал громкости и музыку, забивающую речь,');
  L.push('     автопроверка не поймает.');
  L.push('  3. Первый кадр: он же превью в ленте. Если на нём ничего не понятно —');
  L.push('     сменить обложку (--cover-at=<секунда> и прогон заново, он бесплатный).');
  L.push('  4. Safe-zone: у Reels верх ~150 px и низ ~300-350 px закрыты интерфейсом.');
  L.push('     Проверить, что там нет текста и лица.');
  L.push('  5. Прочитать подпись глазами: в первых двух строках должно быть понятно,');
  L.push('     о чём речь — остальное площадка спрячет под «ещё».');
  L.push('  6. Ссылка: в подписи Instagram она не кликабельна. Если ведёте на сайт —');
  L.push('     поставить ссылку в шапку профиля ДО публикации.');
  L.push('');
  L.push('─── ГРАБЛИ ПЛОЩАДОК, НА КОТОРЫХ ЛОМАЮТСЯ ЧАЩЕ ВСЕГО ───');
  L.push('');
  L.push('  • Telegram: подпись к видео — 1024 знака, а не 4096. Длинный текст');
  L.push('    просто не вставится. Решение: видео без подписи + текст отдельным');
  L.push('    сообщением сразу под ним.');
  L.push('  • Instagram и TikTok: хештеги считаются в тот же лимит подписи.');
  L.push('  • Instagram: больше 30 хештегов — игнорируются все, а не только лишние.');
  L.push('  • YouTube: больше 15 хештегов — тоже игнорируются все.');
  L.push('  • Эмодзи на части площадок считается за два знака. Если текст упирается');
  L.push('    в лимит вплотную — оставить запас 5%.');
  L.push('  • TikTok обложку файлом не принимает: кадр выбирается в приложении.');
  L.push('');
  L.push('─── ЛИМИТЫ, ФАКТ ЭТОГО ВЫПУСКА ───');
  L.push('');
  for (const r of report) {
    L.push(`  ${r.over ? '✗' : '·'} ${r.platform} — ${r.label}: ${r.len} из ${r.limit} знаков`);
  }
  L.push('');
  if (problems.length) {
    L.push('ВНИМАНИЕ: есть замечания, см. ПРОБЛЕМЫ.txt. Тексты правятся в конфиге');
    L.push('release.json, после чего папка собирается заново.');
  } else {
    L.push('Лимиты в норме. Можно заливать.');
  }
  L.push('');
  return L.join('\n');
}
