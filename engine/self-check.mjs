/**
 * self-check.mjs — отчёт о состоянии установки одной командой.
 *
 *   node self-check.mjs
 *
 * Зачем. После боевого прогона обновления на чужой машине надо понять, что именно
 * там встало: те же ли файлы, тот же ли коммит, работают ли команды, уцелело ли
 * своё. Скриншоты для этого не годятся — они показывают экран, а не состав.
 * Пересказ по телефону тем более: 16.08.2026 комплект двое суток был сломан ровно
 * потому, что «выглядело нормально».
 *
 * Скрипт печатает отчёт и кладёт его рядом файлом `otchet-ustanovki.md` — файл
 * можно просто отправить, ничего не переписывая.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И НЕ БУДЕТ: значений ключей. Проверяется только ФАКТ, что
 * переменная задана. Секрет не должен уезжать ни в чат, ни в файл.
 *
 * Ни одного платного вызова: скрипт ничего не генерирует и никуда не ходит,
 * кроме локальной файловой системы и git.
 */

import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';

const exec = promisify(execFile);
const HERE = process.cwd();
const out = [];

function say(line = '') { console.log(line); out.push(line); }
function head(t) { say(''); say(`## ${t}`); say(''); }

const ok = (v) => (v ? '✓' : '✗');

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

/**
 * Запустить команду и вернуть ВЕСЬ вывод.
 *
 * Целиком, а не первую строку: ошибка модуля у node прячется в середине стека, и
 * проверка по первой строке пропускала настоящую поломку, показывая «✓». Поймано
 * на собственном прогоне 16.08.2026 — скрипт соврал «годно» ровно там, ради чего
 * и написан.
 *
 * Ненулевой код выхода тут НЕ означает беду: наши команды без аргументов печатают
 * подсказку и выходят с единицей. Поэтому вердикт выносится по содержимому.
 */
async function tryRun(cmd, args, cwd = HERE) {
  try {
    const { stdout, stderr } = await exec(cmd, args, { cwd, timeout: 60000, windowsHide: true });
    return String(stdout || stderr).trim();
  } catch (e) {
    return String(e.stdout || e.stderr || e.message || '').trim() || null;
  }
}

/**
 * Разобрать вывод команды. Три исхода, и путать их нельзя:
 *   ok      — команда живёт (подсказка, отчёт, что угодно осмысленное)
 *   сломано — нет файла или экспорта: обновление приехало не полностью
 *   зависимости — нет npm-пакета: лечится установкой, комплект тут ни при чём
 */
function classify(text) {
  if (!text) return { state: 'сломано', why: 'команда не ответила вовсе' };
  if (/Cannot find package/i.test(text)) {
    const pkg = (text.match(/Cannot find package '([^']+)'/) || [])[1] || '';
    return { state: 'зависимости', why: `нет npm-пакета ${path.basename(pkg).replace(/\.js$/, '') || '—'}` };
  }
  if (/ERR_MODULE_NOT_FOUND|Cannot find module|does not provide an export/i.test(text)) {
    const m = text.match(/Cannot find module '([^']+)'|does not provide an export named '([^']+)'/);
    return { state: 'сломано', why: m ? `не хватает ${m[1] || m[2]}` : 'ошибка модуля' };
  }
  return { state: 'ok', why: text.split('\n')[0].slice(0, 100) };
}

// ── 1. Где я нахожусь ────────────────────────────────────────────────────────
// Первый вопрос любой диагностики. Пустая или чужая папка объясняет большинство
// жалоб «ничего не установилось» — и объясняет их до того, как начнём копать.
head('Где стоит фабрика');
say(`- папка: \`${HERE}\``);
say(`- система: ${os.platform()} ${os.release()} · ${os.arch()}`);
say(`- node: ${process.version}`);

const isEngine = await exists(path.join(HERE, 'reels')) && await exists(path.join(HERE, 'lib'));
say(`- ${ok(isEngine)} запущено из папки engine ${isEngine ? '' : '— запустите ИЗ НЕЁ: cd factory/engine'}`);

// ── 2. Версия комплекта ──────────────────────────────────────────────────────
head('Версия комплекта');
const gitDir = path.dirname(HERE);
const commit = await tryRun('git', ['log', '--oneline', '-1'], gitDir);
const branch = await tryRun('git', ['rev-parse', '--abbrev-ref', 'HEAD'], gitDir);
say(`- коммит: ${commit || 'git не отвечает или это не репозиторий'}`);
say(`- ветка: ${branch || '—'}`);
const ident = await tryRun('git', ['config', 'user.email'], gitDir);
say(`- личность git: ${ident && !ident.startsWith('ОШИБКА') ? ident : 'НЕ ЗАДАНА — коммит перед обновлением не пройдёт'}`);

const status = await tryRun('git', ['status', '--porcelain'], gitDir);
const dirty = status && !status.startsWith('ОШИБКА') ? status.split('\n').filter(Boolean).length : 0;
say(`- незакоммиченных изменений: ${dirty === 0 ? 'нет' : dirty}`);

// ── 3. Внешние программы ─────────────────────────────────────────────────────
head('Внешние программы');
for (const [name, args] of [['ffmpeg', ['-version']], ['ffprobe', ['-version']], ['git', ['--version']]]) {
  const v = await tryRun(name, args);
  say(`- ${ok(v && !v.startsWith('ОШИБКА'))} ${name}: ${v ? v.slice(0, 60) : 'не найден'}`);
}

// ── 4. Файлы, без которых ветки не работают ──────────────────────────────────
// Список нарочно короткий: сюда попадает только то, отсутствие чего ЛОМАЕТ ветку.
// Полноту состава проверяет не этот список, а запуск команд ниже — он не стареет.
head('Ключевые файлы');
const MUST = [
  'reels/generative-run.mjs', 'reels/finish-part.mjs', 'reels/transcript-check.mjs',
  'reels/note.mjs', 'reels/debrief.mjs', 'reels/lib/prepare-part.mjs', 'reels/lib/journal.mjs',
  'reels/lib/transcript.mjs', 'reels/lib/lint.mjs', 'reels/lib/styles.mjs', 'reels/lib/montage.mjs',
  'reels/montage/run.mjs', 'reels/transcribe-local.mjs', 'lib/lessons.mjs',
];
let missing = 0;
for (const f of MUST) {
  const has = await exists(path.join(HERE, f));
  if (!has) missing += 1;
  say(`- ${ok(has)} ${f}`);
}

// ── 5. Команды, которые обязаны отвечать ─────────────────────────────────────
// Главная проверка отчёта. Запуск поднимает весь граф импортов: не хватает файла
// или экспорта — падает здесь, а не через неделю на платном прогоне. Такая
// проверка не стареет: ловит и то, чего не существовало, когда её писали.
head('Команды отвечают');
const CMDS = [
  ['генеративный монтаж', ['reels/generative-run.mjs']],
  ['приёмка расшифровки', ['reels/transcript-check.mjs']],
  ['разбор журналов', ['reels/debrief.mjs']],
  ['петля уроков', ['lib/lessons.mjs', 'list']],
  ['монтаж оверлеем', ['reels/montage/run.mjs']],
];
let broken = 0;
let needDeps = 0;
for (const [label, args] of CMDS) {
  const { state, why } = classify(await tryRun(process.execPath, args));
  if (state === 'сломано') broken += 1;
  if (state === 'зависимости') needDeps += 1;
  const mark = state === 'ok' ? '✓' : state === 'зависимости' ? '⚙' : '✗';
  say(`- ${mark} ${label}: ${state === 'ok' ? why : `${state.toUpperCase()} — ${why}`}`);
}
if (needDeps) {
  say('');
  say(`⚙ — это НЕ поломка комплекта: не установлены npm-пакеты. Лечится \`npm install\``);
  say('  в папке engine, а браузер для титров — \`npx playwright install chromium\`.');
}

// ── 6. Скиллы ────────────────────────────────────────────────────────────────
head('Скиллы');
for (const dir of [path.join(HERE, '..', 'plugins', 'content-factory', 'skills'), path.join(HERE, '..', '..', '.claude', 'skills'), path.join(HERE, '..', '.claude', 'skills')]) {
  try {
    const list = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
    say(`- \`${path.relative(path.dirname(HERE), dir)}\`: ${list.length} шт — ${list.join(', ')}`);
  } catch {
    say(`- \`${path.relative(path.dirname(HERE), dir)}\`: папки нет`);
  }
}

// ── 7. Знания: уцелело ли своё ───────────────────────────────────────────────
head('Знания фабрики');
for (const [label, file] of [['уроки', 'knowledge/lessons.jsonl'], ['эталоны', 'knowledge/exemplars/index.jsonl']]) {
  const p = path.join(HERE, file);
  if (!(await exists(p))) { say(`- ${label}: файла нет`); continue; }
  const n = (await readFile(p, 'utf8')).split('\n').filter((l) => l.trim()).length;
  say(`- ${label}: ${n}`);
}

// ── 8. Ключи: только факт, никогда значения ──────────────────────────────────
head('Ключи');
const envPath = path.join(HERE, '.env');
if (await exists(envPath)) {
  const names = (await readFile(envPath, 'utf8'))
    .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => l.split('=')[0].trim());
  say(`- файл .env есть, переменных задано: ${names.length}`);
  say(`- имена (БЕЗ значений): ${names.join(', ') || '—'}`);
} else {
  say('- файла .env нет — часть возможностей будет недоступна');
}

// ── 9. Итог ──────────────────────────────────────────────────────────────────
head('Итог');
const verdict = broken === 0 && missing === 0 && isEngine;
say(verdict
  ? '**ГОДНО.** Все ключевые файлы на месте, все команды отвечают.'
  : '**ЕСТЬ ПРОБЛЕМЫ.** Смотрите строки со знаком ✗ выше.');
say(`- недостающих файлов: ${missing} · сломанных команд: ${broken} · ждут npm install: ${needDeps}`);
say('');
say('Отправьте этот файл целиком — по нему видно состав установки, а не впечатление о ней.');

const file = path.join(HERE, 'otchet-ustanovki.md');
await writeFile(file, ['# Отчёт об установке контент-фабрики', '', `Собран: ${new Date().toISOString()}`, ...out].join('\n'), 'utf8');
console.log(`\n[отчёт] файл готов: ${file}`);
process.exit(verdict ? 0 : 2);
