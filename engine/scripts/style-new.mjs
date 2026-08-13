/**
 * style-new.mjs — завести новый видео-стиль: проверить черновик и напечатать всё,
 * что нужно вставить в каталог.
 *
 * Кредитов не тратит и файлов не правит: печатает готовую запись, черновик темы,
 * промпт картинки-фона и чек-лист приёмки. Вставляет человек — осознанно, глядя
 * на замечания.
 *
 *   node scripts/style-new.mjs draft.json
 *   node scripts/style-new.mjs --check <ключ>      проверить стиль, уже лежащий в каталоге
 *   node scripts/style-new.mjs --check-all         прогнать весь каталог
 *   node scripts/style-new.mjs --list              оглавление каталога
 *
 * Формат draft.json — { "key": "...", "style": { … } }; поля описаны в
 * reels/knowledge/style-recipes.md.
 */

import { readFile } from 'node:fs/promises';
import { STYLES, STYLE_KEYS, styleProfile, listStyles } from '../reels/lib/styles.mjs';
import { validateStyle, themeDraft, backdropPrompt, acceptanceChecklist } from '../reels/lib/style-new.mjs';

const args = process.argv.slice(2);

if (args.includes('--list')) {
  console.log(listStyles());
  process.exit(0);
}

if (args.includes('--check-all')) {
  let bad = 0;
  for (const key of STYLE_KEYS) {
    const { ok, problems, warnings } = validateStyle(key, STYLES[key], { isNew: false });
    if (!ok) bad += 1;
    const mark = ok ? '✓' : '✗';
    console.log(`${mark} ${key} — ${STYLES[key].name}`);
    problems.forEach((p) => console.log(`    ✗ ${p}`));
    if (!ok) warnings.forEach((w) => console.log(`    · ${w}`));
  }
  console.log(`\nПроверено ${STYLE_KEYS.length}, с замечаниями ${bad}.`);
  process.exit(bad ? 2 : 0);
}

const checkIdx = args.indexOf('--check');
if (checkIdx !== -1) {
  const key = args[checkIdx + 1];
  if (!STYLES[key]) {
    console.error(`Нет стиля «${key}». Есть: ${STYLE_KEYS.join(', ')}`);
    process.exit(1);
  }
  report(key, STYLES[key], { isNew: false });
  process.exit(0);
}

const draftPath = args.find((a) => !a.startsWith('--'));
if (!draftPath) {
  console.error('Использование: node scripts/style-new.mjs <draft.json>');
  console.error('               node scripts/style-new.mjs --check <ключ> | --check-all | --list');
  console.error('');
  console.error('Как собрать черновик — reels/knowledge/style-recipes.md');
  process.exit(1);
}

const draft = JSON.parse(await readFile(draftPath, 'utf8'));
const { key, style } = draft;
if (!key || !style) {
  console.error('В файле должны быть поля "key" и "style".');
  process.exit(1);
}
report(key, style, { isNew: true });

/** Печать разбора: замечания, предупреждения, готовые куски для вставки. */
function report(key, style, opts) {
  const { ok, problems, warnings } = validateStyle(key, style, opts);

  console.log(`СТИЛЬ «${style.name || key}» (${key})`);
  console.log('');

  if (problems.length) {
    console.log('ЗАМЕЧАНИЯ — пока они есть, стиль в каталог не кладём:');
    problems.forEach((p) => console.log(`  ✗ ${p}`));
    console.log('');
  }
  if (warnings.length) {
    console.log('ПРЕДУПРЕЖДЕНИЯ — не блокируют, но знать про них надо:');
    warnings.forEach((w) => console.log(`  · ${w}`));
    console.log('');
  }
  if (!ok) {
    console.log('Готовые куски не печатаю: сначала уберите замечания выше.');
    process.exitCode = 2;
    return;
  }

  console.log('ПРОВЕРКА ПРОЙДЕНА.');
  console.log('');
  console.log('── ПРОФИЛЬ (так стиль увидит подбор и человек) ──');
  console.log(opts.isNew ? profileOf(key, style) : styleProfile(key));
  console.log('');

  const theme = themeDraft(style);
  if (theme) {
    console.log(`── ЧЕРНОВИК ТЕМЫ для PRESETS в reels/montage/overlay.mjs (ключ «${style.theme}») ──`);
    console.log('Цвета плашек дошлифовать глазами на контрольных кадрах — это старт, не результат.');
    console.log(`  '${style.theme}': ${JSON.stringify(theme, null, 4).replace(/\n/g, '\n  ')},`);
    console.log('');
  }

  if (style.tier === 'scene') {
    console.log('── ПРОМПТ КАРТИНКИ-ФОНА (одна на ролик, стоит центы) ──');
    console.log(backdropPrompt(style));
    console.log(`Сохранить в reels/knowledge/scene-backdrops/fon-${style.theme || key}.png, 9:16.`);
    console.log('');
  }

  console.log('── ЧЕК-ЛИСТ ПРИЁМКИ ──');
  acceptanceChecklist(key, style).forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  console.log('');
  console.log(`Прогон: node scripts/storyboard-live.mjs <дубль> <words.json> --style=${key}`);
}

/** Профиль ещё не добавленного стиля — styleProfile() читает каталог, а его там нет. */
function profileOf(key, s) {
  const a = s.axes || {};
  return [
    `## ${s.name} (${key})`,
    `- **Настроение:** ${s.mood}`,
    `- **Когда брать:** ${s.whenToUse}`,
    `- **Режим:** ${s.mode} · **Цена:** ${s.tier}`,
    `- **Ключевой приём:** ${s.signature}`,
    `- **Оси:** ${a.napravlenie} · ${a.medium} · ${a.faktura} · ${a.kompoziciya} · ${a.tipografika} · ${a.cvet}`,
    `- **Движение:** ${a.motion}`,
    `- **Риск:** ${s.risk}`,
  ].join('\n');
}
