/**
 * lessons.mjs — петля дообучения фабрики.
 *
 * Это и есть «дообучение» в нашем смысле: веса модели никто не трогает,
 * но фабрика перестаёт повторять свои ошибки и держит вашу планку.
 *
 * Работает так:
 *   - забраковали слайд и сказали почему → урок ложится в knowledge/lessons.jsonl;
 *   - приняли слайд → он ложится в knowledge/exemplars/ как эталон.
 *
 * Перед следующей генерацией скилл подаёт уроки и эталоны обратно в контекст,
 * и та же ошибка уже не проходит. Чем дольше работаете — тем точнее фабрика
 * попадает именно в ваш вкус, а не в средний по интернету.
 *
 * Хранилище — обычные текстовые файлы JSONL и копии картинок. Без баз данных:
 * всё видно глазами, всё правится руками, ничего не ломается.
 *
 * Командная строка:
 *
 *   node lib/lessons.mjs add "текст не влез в кадр" --fix "стало короче 40 знаков" --tags слайд,текст
 *   node lib/lessons.mjs list                 — все уроки
 *   node lib/lessons.mjs list слайд           — только по тегу
 *   node lib/lessons.mjs keep ./out/slide-1.png --tags хук,тёмный
 *   node lib/lessons.mjs brief "тёмный люкс"  — блок для подстановки в генерацию
 */

import { appendFile, readFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(__dirname);
// Хранилище можно переопределить (тесты/изоляция) через CAROUSEL_KNOWLEDGE_DIR.
const KNOW_DIR = process.env.CAROUSEL_KNOWLEDGE_DIR || path.join(ROOT, 'knowledge');
const LESSONS_PATH = path.join(KNOW_DIR, 'lessons.jsonl');
const EXEMPLARS_DIR = path.join(KNOW_DIR, 'exemplars');
const EXEMPLARS_INDEX = path.join(EXEMPLARS_DIR, 'index.jsonl');

/**
 * Записать урок (что пошло не так → как чинить).
 * @param {{tags?: string[], what_was_wrong: string, fix?: string, slide_ref?: string}} lesson
 */
export async function recordLesson(lesson) {
  if (!lesson?.what_was_wrong) throw new Error('recordLesson: what_was_wrong обязателен');
  await mkdir(KNOW_DIR, { recursive: true });
  const rec = {
    tags: normTags(lesson.tags),
    what_was_wrong: String(lesson.what_was_wrong),
    fix: lesson.fix ? String(lesson.fix) : '',
    slide_ref: lesson.slide_ref ? String(lesson.slide_ref) : '',
    at: nowISO(),
  };
  await appendFile(LESSONS_PATH, JSON.stringify(rec) + '\n', 'utf8');
}

/**
 * Загрузить уроки, отфильтрованные по тегам/нише брифа.
 * @param {string|Object} [filter] - строка/ниша или { tags?, niche? }; пусто → все.
 * @returns {Promise<Array>}
 */
export async function loadLessons(filter) {
  const all = await readJSONL(LESSONS_PATH);
  const keys = filterKeys(filter);
  if (!keys.length) return all;
  return all.filter((l) => matchesTags(l.tags, keys));
}

/**
 * Записать эталон (одобренный слайд) — копирует PNG в exemplars/ и пишет индекс.
 * @param {{specSlide?: Object, pngPath: string, tags?: string[]}} ex
 */
export async function recordExemplar(ex) {
  if (!ex?.pngPath) throw new Error('recordExemplar: pngPath обязателен');
  await mkdir(EXEMPLARS_DIR, { recursive: true });
  const fname = `${Date.now()}_${path.basename(ex.pngPath)}`;
  const dest = path.join(EXEMPLARS_DIR, fname);
  await copyFile(ex.pngPath, dest);
  const rec = {
    file: fname,
    tags: normTags(ex.tags),
    role: ex.specSlide?.role || '',
    big_idea: ex.specSlide?.big_idea || '',
    engine: ex.specSlide?.engine || '',
    execution: ex.specSlide?.execution || '',
    at: nowISO(),
  };
  await appendFile(EXEMPLARS_INDEX, JSON.stringify(rec) + '\n', 'utf8');
  return { file: dest };
}

/**
 * Загрузить эталоны по тегам (топ-N свежих).
 * @param {string|Object} [filter]
 * @param {number} [topN=6]
 * @returns {Promise<Array>}
 */
export async function loadExemplars(filter, topN = 6) {
  const all = await readJSONL(EXEMPLARS_INDEX);
  const keys = filterKeys(filter);
  const matched = keys.length ? all.filter((e) => matchesTags(e.tags, keys)) : all;
  return matched.slice(-topN).reverse();
}

// ── helpers ──────────────────────────────────────────────────────────

async function readJSONL(p) {
  let text;
  try {
    text = await readFile(p, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  return text
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function normTags(tags) {
  if (!tags) return [];
  const arr = Array.isArray(tags) ? tags : [tags];
  return arr.map((t) => String(t).toLowerCase().trim()).filter(Boolean);
}

function filterKeys(filter) {
  if (!filter) return [];
  if (typeof filter === 'string') return normTags(filter.split(/[,\s]+/));
  return normTags([...(filter.tags || []), ...(filter.niche ? [filter.niche] : [])]);
}

function matchesTags(tags, keys) {
  const t = (tags || []).join(' ').toLowerCase();
  return keys.some((k) => k && t.includes(k));
}

function nowISO() {
  // new Date() в воркфлоу запрещён, но здесь обычный рантайм — ок.
  return new Date().toISOString();
}

export const _paths = { LESSONS_PATH, EXEMPLARS_DIR, EXEMPLARS_INDEX };

/**
 * Готовый блок для подстановки в промпт генерации: чего не повторять и на что равняться.
 * Именно его скилл подмешивает в контекст перед тем, как рисовать следующий слайд.
 * @param {string|Object} [filter] - тема/теги; пусто → всё
 * @returns {Promise<string>} markdown; пустая строка, если опыта ещё нет
 */
export async function buildLessonsBlock(filter) {
  const [lessons, exemplars] = await Promise.all([
    loadLessons(filter),
    loadExemplars(filter),
  ]);
  if (!lessons.length && !exemplars.length) return '';

  const parts = ['# ОПЫТ ЭТОЙ ФАБРИКИ (приоритетнее общих правил — это правки её владельца)'];

  if (lessons.length) {
    parts.push('', '## Чего НЕ повторять', ...lessons.slice(-25).map((l) => {
      const tags = l.tags?.length ? ` _[${l.tags.join(', ')}]_` : '';
      return `- **Было не так:** ${l.what_was_wrong}${l.fix ? ` → **как надо:** ${l.fix}` : ''}${tags}`;
    }));
  }

  if (exemplars.length) {
    parts.push('', '## Эталоны — планка, ниже которой нельзя', ...exemplars.map((e) => {
      const bits = [e.role, e.execution, e.engine].filter(Boolean).join(' · ');
      return `- \`knowledge/exemplars/${e.file}\`${bits ? ` — ${bits}` : ''}${e.big_idea ? `: ${e.big_idea}` : ''}`;
    }));
    parts.push('', 'Открой эти файлы и посмотри на них перед генерацией — это принятые работы.');
  }

  return parts.join('\n');
}

/* ────────────────────────── запуск из командной строки ────────────────────────── */

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , cmd, ...rest] = process.argv;
  const positional = rest.filter((a, i) => !a.startsWith('--') && !rest[i - 1]?.startsWith('--'));
  const tags = (arg('--tags') || '').split(',').map((t) => t.trim()).filter(Boolean);

  const run = async () => {
    switch (cmd) {
      case 'add': {
        const what = positional.join(' ').trim();
        if (!what) throw new Error('Скажите, что именно пошло не так: node lib/lessons.mjs add "текст съехал за поле"');
        await recordLesson({ what_was_wrong: what, fix: arg('--fix'), tags, slide_ref: arg('--slide') });
        console.log('Урок записан. Следующая генерация его учтёт.');
        break;
      }
      case 'keep': {
        const png = positional[0];
        if (!png) throw new Error('Укажите файл принятого слайда: node lib/lessons.mjs keep ./out/slide-1.png');
        const { file } = await recordExemplar({ pngPath: png, tags });
        console.log(`Эталон сохранён: ${file}`);
        break;
      }
      case 'list': {
        const filter = positional.join(' ').trim() || undefined;
        const lessons = await loadLessons(filter);
        const exemplars = await loadExemplars(filter, 100);
        if (!lessons.length && !exemplars.length) {
          console.log('Опыта пока нет. Он появится, когда вы начнёте принимать и бракчить слайды.');
          break;
        }
        console.log(`Уроков: ${lessons.length}, эталонов: ${exemplars.length}\n`);
        lessons.forEach((l, i) => {
          console.log(`${String(i + 1).padStart(3)}. ${l.what_was_wrong}${l.fix ? `\n     → ${l.fix}` : ''}${l.tags?.length ? `\n     теги: ${l.tags.join(', ')}` : ''}`);
        });
        break;
      }
      case 'brief': {
        const block = await buildLessonsBlock(positional.join(' ').trim() || undefined);
        console.log(block || 'Опыта пока нет — фабрика работает на общих правилах корпуса.');
        break;
      }
      default:
        console.error('Команды: add | keep | list | brief');
        console.error('');
        console.error('  add "что пошло не так" --fix "как надо" --tags тема,слой');
        console.error('  keep ./out/slide-1.png --tags хук,тёмный');
        console.error('  list [тег]');
        console.error('  brief [тема]   — блок опыта для подстановки в генерацию');
        process.exit(1);
    }
  };

  run().catch((e) => { console.error('ОШИБКА:', e.message); process.exit(1); });
}
