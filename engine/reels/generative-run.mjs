/**
 * generative-run.mjs — сквозной прогон генеративного монтажа: дубль → готовый ролик.
 *
 * До 14.08.2026 генеративная ветка существовала только пошагово: `storyboard-live.mjs`
 * печатал две команды на ОДИН кусок, человек копировал их руками. Ролик на 40 секунд —
 * четыре куска по три ручных операции. Из-за этой цены усилия ветка почти не
 * использовалась, и вместо неё раз за разом брался бесплатный оверлей с плашками.
 *
 * Здесь тот же путь, но выполняется сам — с ДВУМЯ остановками, на которых смотрит
 * человек. Кредит-дисциплина автора метода («первый кусок → приёмка → остальные»)
 * не ослаблена, а зашита в код: пропустить остановку нельзя, её снимает только
 * повторный запуск с --resume.
 *
 *   node reels/generative-run.mjs <видео> [words.json] --style=<ключ>
 *        [--out=папка] [--segments=1,2] [--keep-background] [--resume] [--objects=файл]
 *
 * Файл дубля (`--objects`) несёт две вещи, которых не знает ни код, ни модель: предметы
 * панелей под смысл фраз и `_внешность` — описание спикера словами. Внешность уходит
 * одинаковой строкой во ВСЕ куски и держит континьюити между ними: кадры-вложения у
 * каждого куска свои, поэтому текст — единственный общий якорь.
 *
 * Первый запуск  : нарезка → борд куска 1 (≈7 кр) → СТОП, смотрим борд глазами.
 * --resume        : монтаж куска 1 (≈30 кр) → свой звук → кадры → СТОП, смотрим ролик.
 * --resume ещё раз: остальные куски тем же циклом → склейка → финал.
 *
 * Состояние лежит в <out>/state.json, поэтому прогон переживает закрытие терминала
 * и не пересчитывает уже оплаченное.
 */

import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { planSegments, preparePart } from './lib/prepare-part.mjs';
import { hfBalance, hfGenerate, hfDownload, hfReady } from './lib/hf-cli.mjs';
import { concatParts, probe, grabFrame } from './lib/assemble.mjs';
import { softenForFilter } from './lib/montage.mjs';
import { finishPart } from './finish-part.mjs';
import { STYLES, STYLE_KEYS } from './lib/styles.mjs';
import { runBin } from './lib/bin.mjs';
import * as journal from './lib/journal.mjs';
import { reviewMark, wordsOf } from './lib/transcript.mjs';

// Борд рисует НАСТОЯЩИЙ GPT Image 2 — он доступен в CLI (проверено 14.08.2026).
// Именно он держит кириллицу в подписях панелей; видео-модель её не печатает вовсе.
const BOARD_MODEL = 'gpt_image_2';
const BOARD_PARAMS = { aspect_ratio: '9:16', resolution: '2k', quality: 'high' };

/**
 * @param {Object} o
 * @param {string} o.src - дубль
 * @param {string} o.wordsPath - пословный транскрипт
 * @param {string} o.styleKey
 * @param {string} o.outDir
 * @param {number[]} [o.only] - какие куски делать; пусто — все
 * @param {boolean} [o.keepBackground]
 * @param {boolean} [o.resume] - снять остановку и идти дальше
 * @param {boolean} [o.dry] - дойти до первой траты и остановиться, ничего не оплачивая
 * @param {Object} [o.objects] - предметы панелей под смысл: {"<номер куска>": ["предмет", …]}
 * @param {boolean} [o.skipTranscriptCheck] - осознанно пропустить приёмку расшифровки
 * @param {string} [o.appearance] - внешность спикера словами, ОДНА на весь прогон:
 *   якорь континьюити между кусками, кадры-вложения у каждого куска свои
 */
export async function generativeRun({ src, wordsPath, styleKey, outDir, only = [], keepBackground = false, resume = false, dry = false, objects = {}, appearance = '', skipTranscriptCheck = false }) {
  const style = STYLES[styleKey];
  if (!style) throw new Error(`нет стиля «${styleKey}». Есть: ${STYLE_KEYS.join(', ')}`);
  if (!(await hfReady())) {
    throw new Error('higgsfield CLI не отвечает. Проверьте: higgsfield account status (нужен вход: higgsfield auth login)');
  }

  await mkdir(outDir, { recursive: true });
  const statePath = path.join(outDir, 'state.json');
  const state = (await readJson(statePath)) || {
    src, wordsPath, styleKey, stage: 'new', parts: {}, spentTotal: 0,
  };

  const wordsRaw = JSON.parse(await readFile(wordsPath, 'utf8'));

  // ── Расшифровка: без подписи платных вызовов не делаем ──
  //
  // Два дефекта готовых роликов 15–16.08 были ошибками РАСШИФРОВКИ, а не генерации:
  // «обходило» вместо «обходилось» и «однако Русель» вместо «одна карусель». Титр
  // повторяет расшифровку дословно, поэтому её ошибка гарантированно станет ошибкой
  // в кадре — но увидим мы её только после того, как заплатили за монтаж.
  //
  // Текст лежит на диске и стоит ноль. Это самое дешёвое место, где ошибку можно поймать,
  // и единственное, где её ещё можно поймать бесплатно.
  const mark = reviewMark(wordsRaw);
  if (!mark.ok && !skipTranscriptCheck && !dry) {
    throw new Error(
      'расшифровка не проверена — платных вызовов не делаю.\n'
      + `  Проверить и подписать: node reels/transcript-check.mjs "${wordsPath}"\n`
      + '  Обойти осознанно: --skip-transcript-check',
    );
  }
  log(mark.ok
    ? `расшифровка: проверена ${String(mark.at).slice(0, 10)}${mark.note ? ` — ${mark.note}` : ''}`
    : 'расшифровка: БЕЗ ПОДПИСИ');

  const allSegments = planSegments(wordsOf(wordsRaw));
  const segments = only.length ? allSegments.filter((s) => only.includes(s.n)) : allSegments;
  if (!segments.length) throw new Error('после фильтра --segments не осталось ни одного куска');

  state.segments = segments.map((s) => ({ n: s.n, start: s.start, end: s.end, duration: s.duration, text: s.text }));

  log(`стиль: ${style.name} (${styleKey}) · режим ${style.mode} · ${style.tier}`);
  log(`кусков к работе: ${segments.length} из ${allSegments.length}`);
  segments.forEach((s) => log(`  кусок ${s.n}: ${s.duration.toFixed(2)} сек — «${s.text}»`));

  const balance0 = await hfBalance();
  // Точку отсчёта запоминаем ОДИН раз на весь прогон, а не на запуск: между
  // остановками терминал закрывается, и «сколько всего стоило» иначе считалось бы
  // от баланса на момент --resume, то есть занижалось на всё уже оплаченное.
  if (state.balanceStart == null) state.balanceStart = balance0;

  // Смета до первой траты. Цифры — замеренные, не из документации: борд ≈7,
  // монтаж ≈3 кредита за секунду и списывается по ФАКТИЧЕСКОЙ длине клипа.
  const estimate = segments.reduce((sum, s) => sum + 7 + Math.round(s.duration * 3), 0);
  log(`смета: ≈${estimate} кредитов на ${segments.length} кусок(ов). Баланс сейчас: ${balance0}`);

  // Журнал открывается ДО первой траты: если прогон упадёт на гейте или на фильтре,
  // запись о попытке должна остаться. Молчаливо провалившийся прогон разобрать нельзя.
  if (state.stage === 'new') {
    await journal.openRun(outDir, {
      styleKey, style: style.name, src, segments: segments.length,
      estimate, balance: balance0, расшифровкаПроверена: mark.ok,
    });
    // Обход приёмки — решение человека, и оно должно остаться в журнале. Иначе на
    // разборе непонятно, почему в титрах ерунда: модель напутала или текст был кривой.
    if (!mark.ok && skipTranscriptCheck) {
      await journal.note(outDir, {
        stage: 'расшифровка', kind: 'решение',
        what: 'приёмка расшифровки обойдена флагом --skip-transcript-check',
        where: wordsPath,
      });
    }
  }

  // ── Кусок-разведчик: борд, затем остановка ──
  const probeSeg = segments[0];
  const probeKey = String(probeSeg.n);

  if (!state.parts[probeKey]?.board) {
    const prep = await preparePart({ src, segments: allSegments, segNo: probeSeg.n, styleKey, keepBackground, outDir, objects: objects[probeSeg.n] || [], appearance });
    printPrep(prep);
    if (!prep.gate.ok) {
      prep.gate.problems.forEach((p) => log(`  ✗ ${p}`));
      // Провал гейта пишем в журнал ДО падения: иначе на разборе видно только, что
      // прогона не случилось, и приходится воспроизводить причину заново.
      await journal.note(outDir, {
        stage: 'подготовка', kind: 'дефект',
        what: `гейт не пропустил: ${prep.gate.problems.join('; ')}`,
        where: prep.promptFile,
      });
      throw new Error('гейт не пройден — платных вызовов не делаю');
    }

    // Противоречие в промпте — всегда НАША ошибка и всегда воспроизводима. Блокируем
    // так же жёстко, как провал гейта: заплатить за то, что мы сами себе противоречим,
    // мы уже дважды успели (бейджи движения 03.08, карточка-цитата 16.08).
    if (!prep.checks.ok) {
      await journal.note(outDir, {
        stage: 'подготовка', kind: 'дефект',
        what: `линт нашёл противоречие: ${prep.checks.blockers.join('; ')}`,
        where: prep.promptFile,
      });
      throw new Error(`противоречие в промпте — платных вызовов не делаю:\n  ${prep.checks.blockers.join('\n  ')}`);
    }

    // Борд гейтится наравне с монтажом: ошибка на нём уезжает в видео целиком, а стоит
    // он те же деньги. До 16.08 борд не проверялся вообще ничем.
    if (!prep.boardGate.ok) {
      prep.boardGate.problems.forEach((p) => log(`  ❌ борд: ${p}`));
      await journal.note(outDir, {
        stage: 'борд', kind: 'дефект',
        what: `гейт борда не пропустил: ${prep.boardGate.problems.join('; ')}`,
        where: prep.boardFile,
      });
      throw new Error('гейт борда не пройден — платных вызовов не делаю');
    }
    if (prep.checks.warnings.length) {
      await journal.note(outDir, {
        stage: 'подготовка', kind: 'подозрение',
        what: `линт предупредил: ${prep.checks.warnings.join('; ')}`,
        where: prep.promptFile,
      });
    }

    const preflightFile = await writePreflight({
      outDir, prep, segments, estimate, balance: balance0, mark, appearance,
    });
    log(`\nПРЕДПОЛЁТНЫЙ ЛИСТ: ${preflightFile}`);

    if (dry) {
      // `appearance` сюда передаётся обязательно: writeObjectsTemplate ПЕРЕЗАПИСЫВАЕТ
      // файлы промптов, и без неё сухой прогон показывал человеку промпт без внешности,
      // а платный уходил бы в модель с ней — то есть смотрели бы не то, что отправляем.
      // Ровно так же 15.08.2026 терялись осмысленные предметы; грабля та же, поле новое.
      const tpl = await writeObjectsTemplate({ src, segments, allSegments, styleKey, keepBackground, outDir, objects, appearance });
      log(`\n⏹  СУХОЙ ПРОГОН: дошли до первой траты и остановились, кредиты не списаны.`);
      log(`   Промпт борда: ${prep.boardFile}`);
      log(`   Промпт монтажа: ${prep.promptFile}`);
      log(`\n   ФАЙЛ ДУБЛЯ. Заготовка: ${tpl}`);
      // Подсказку печатаем по ФАКТУ заполненности, а не всегда: раньше строка «сейчас
      // стоят дежурные предметы» выводилась даже с полным файлом предметов и врала.
      const filled = (objects[probeSeg.n] || []).filter((x) => String(x).trim()).length;
      if (filled) {
        log(`   Предметы под смысл заданы: ${filled} из ${prep.panels.length} панелей куска ${probeSeg.n}.`);
      } else {
        log('   Сейчас на панелях стоят дежурные предметы — они одинаковы для любой фразы,');
        log('   поэтому кадр заполняется, но не дополняет сказанное. Заполните заготовку:');
        log('   на каждую панель предмет ПРО ЭТУ фразу, короткой английской фразой.');
        log(`   Затем: node reels/generative-run.mjs … --objects=${path.basename(tpl)}`);
      }
      if (!appearance) {
        log('   Внешность спикера НЕ задана: впишите `_внешность` в файл дубля, иначе');
        log('   между кусками модель перекрасит одежду и волосы.');
      }
      log('\n   Убрать --dry, чтобы собрать борд (≈7 кр) с тем, что есть сейчас.');
      return { stage: 'dry', prep, objectsTemplate: tpl };
    }

    log(`\nБОРД куска ${probeSeg.n} — ≈7 кредитов, ${prep.frames.length} реальных кадров в работу`);
    // Замер вокруг вызова: в журнал уходит ПРИРАЩЕНИЕ, а не нарастающий итог, иначе
    // сумма записей врёт. `state.spentTotal` остаётся кумулятивным — он про состояние.
    const beforeBoard = await hfBalance();
    const board = await genBoard(prep, outDir);
    state.parts[probeKey] = { board, cut: prep.cut, duration: probeSeg.duration };
    state.stage = 'board-done';
    state.spentTotal = await spentSince(state.balanceStart);
    await writeJson(statePath, state);

    await journal.note(outDir, {
      stage: 'борд', kind: 'трата',
      what: `борд куска ${probeSeg.n} собран`,
      where: board,
      cost: Math.max(0, Math.round((beforeBoard - (await hfBalance())) * 100) / 100),
      extra: { model: BOARD_MODEL, ...BOARD_PARAMS, frames: prep.frames.length },
    });

    log(`\n⏸  ОСТАНОВКА ПЕРВАЯ. Борд собран: ${board}`);
    log('   Посмотрите его ГЛАЗАМИ до монтажа — ошибка на борде уезжает в видео целиком.');
    log('   Проверить: панелей столько же, русские подписи без ошибок, лицо узнаваемо,');
    log('   нет шапки, нет английских подписей и номеров панелей.');
    log(`   Дальше: node reels/generative-run.mjs … --resume`);
    return { stage: 'board-done', board, state };
  }

  if (state.stage === 'board-done' && !resume) {
    log('\n⏸  Борд уже собран и ждёт вашего взгляда. Продолжить: тот же вызов с --resume');
    return { stage: 'board-done', board: state.parts[probeKey].board, state };
  }

  // ── Монтаж куска-разведчика, затем вторая остановка ──
  if (!state.parts[probeKey].final) {
    const prep = await preparePart({ src, segments: allSegments, segNo: probeSeg.n, styleKey, keepBackground, outDir, objects: objects[probeSeg.n] || [], appearance });
    const beforeMontage = await hfBalance();
    const final = await montageOne({ prep, board: state.parts[probeKey].board, outDir });
    state.parts[probeKey].final = final.finalPath;
    state.parts[probeKey].raw = final.rawPath;
    state.stage = 'probe-done';
    state.spentTotal = await spentSince(state.balanceStart);
    await writeJson(statePath, state);

    const frames = await extractQaFrames(final.finalPath, path.join(outDir, `qa-part-${probeSeg.n}`), 1.0);
    await journal.note(outDir, {
      stage: 'монтаж', kind: 'трата',
      what: `кусок ${probeSeg.n} смонтирован, кадров приёмки ${frames.length}`,
      where: final.finalPath,
      cost: Math.max(0, Math.round((beforeMontage - (await hfBalance())) * 100) / 100),
      extra: { model: prep.params.model, duration: prep.params.duration },
    });

    log(`\n⏸  ОСТАНОВКА ВТОРАЯ. Кусок ${probeSeg.n} готов: ${final.finalPath}`);
    log(`   Кадры для приёмки (${frames.length} шт): ${path.join(outDir, `qa-part-${probeSeg.n}`)}`);
    log('   Смотреть ПОДРЯД, а не один кадр. Проверить: лицо не стёрто нигде, титры');
    log('   совпадают с речью буква в букву, нет служебных подписей с борда, план меняется.');
    // Наблюдения не чинятся в моменте — записываются. Разбор идёт пачкой потом.
    log('   Что увидели — В ЖУРНАЛ, не в правку:');
    log(`     node reels/note.mjs "${outDir}" --kind=дефект --what="..." --where="qa-part-${probeSeg.n}/qa-3.0.jpg"`);
    log(`   Баланс: ${await hfBalance()} (было ${balance0})`);
    if (segments.length === 1) {
      log('   Кусок был один — на этом прогон закончен.');
      state.stage = 'done';
      await writeJson(statePath, state);
      return { stage: 'done', final: final.finalPath, state };
    }
    log('   Дальше (остальные куски): тот же вызов с --resume');
    return { stage: 'probe-done', final: final.finalPath, state };
  }

  if (state.stage === 'probe-done' && !resume) {
    log('\n⏸  Кусок-разведчик готов и ждёт приёмки. Продолжить: тот же вызов с --resume');
    return { stage: 'probe-done', state };
  }

  // ── Остальные куски пачкой ──
  const rest = segments.slice(1);
  for (const seg of rest) {
    const key = String(seg.n);
    if (state.parts[key]?.final) { log(`кусок ${seg.n} уже готов — пропускаю`); continue; }
    log(`\n── кусок ${seg.n} из ${segments.length} ──`);
    const prep = await preparePart({ src, segments: allSegments, segNo: seg.n, styleKey, keepBackground, outDir, objects: objects[seg.n] || [], appearance });
    if (!prep.gate.ok) {
      prep.gate.problems.forEach((p) => log(`  ✗ ${p}`));
      await journal.note(outDir, {
        stage: 'подготовка', kind: 'дефект',
        what: `гейт не пропустил кусок ${seg.n}: ${prep.gate.problems.join('; ')}`,
        where: prep.promptFile,
      });
      throw new Error(`гейт не пройден на куске ${seg.n} — прогон остановлен, оплаченное сохранено`);
    }
    const before = await hfBalance();
    const board = await genBoard(prep, outDir);
    const final = await montageOne({ prep, board, outDir });
    state.parts[key] = { board, cut: prep.cut, raw: final.rawPath, final: final.finalPath, duration: seg.duration };
    await writeJson(statePath, state);
    await journal.note(outDir, {
      stage: 'монтаж', kind: 'трата',
      what: `кусок ${seg.n} готов (борд и монтаж)`,
      where: final.finalPath,
      cost: Math.max(0, Math.round((before - (await hfBalance())) * 100) / 100),
      extra: { duration: seg.duration },
    });
  }

  // ── Склейка ──
  const ordered = segments.map((s) => state.parts[String(s.n)]?.final).filter(Boolean);
  const finalPath = path.join(outDir, `final-${styleKey}.mp4`);
  if (ordered.length > 1) {
    await concatParts(ordered, finalPath);
  } else {
    await runBin('ffmpeg', ['-y', '-loglevel', 'error', '-i', ordered[0], '-c', 'copy', finalPath]);
  }
  const meta = await probe(finalPath);
  state.stage = 'done';
  state.final = finalPath;
  await writeJson(statePath, state);

  const frames = await extractQaFrames(finalPath, path.join(outDir, 'qa-final'), 1.0);
  const spent = await spentSince(state.balanceStart);
  const runLog = await journal.closeRun(outDir, {
    styleKey, spent, balance: await hfBalance(), final: finalPath,
    duration: Math.round(meta.duration * 100) / 100, parts: ordered.length,
  });

  log(`\n✓ ГОТОВО: ${finalPath} · ${meta.duration.toFixed(2)} сек`);
  log(`  Кадры финальной приёмки (${frames.length}): ${path.join(outDir, 'qa-final')}`);
  log(`  Баланс: ${await hfBalance()} (было ${balance0})`);
  log(`  Бортжурнал: ${runLog}`);
  log('  Что увидите на кадрах — записывайте, НЕ чините сейчас:');
  log(`    node reels/note.mjs "${outDir}" --kind=дефект --what="..." --where="qa-final/qa-N.jpg"`);
  log('  Разбор пачкой потом: node reels/debrief.mjs');
  return { stage: 'done', final: finalPath, state, runLog };
}

/** Борд куска: платный вызов + скачивание. Повтор один раз на ложном nsfw. */
export async function genBoard(prep, outDir) {
  const prompt = await readFile(prep.boardFile, 'utf8');
  return withNsfwRetry('борд', (text) => hfGenerate({
    model: BOARD_MODEL,
    params: { prompt: text, ...BOARD_PARAMS },
    medias: { image: prep.frames },
  }), prompt, outDir).then(async (res) => {
    await hfDownload(res.urls[0], prep.board);
    log(`  борд: ${prep.board}`);
    return prep.board;
  });
}

/**
 * Повтор при ложном срабатывании фильтра, со сменой формулировки на втором заходе.
 *
 * Формула сохранения спикера содержит «cut him out from his room» и «his body» —
 * фильтр читает это буквально и возвращает статус nsfw. Кредиты за такое задание
 * не списываются (проверено 14.08.2026: баланс вернулся с 728 до 752).
 *
 * Простого повтора мало: в том же прогоне три стиля из пяти отказывали подряд,
 * то есть срабатывание не случайное. Поэтому второй заход идёт со смягчённым
 * промптом (`softenForFilter`) — тот же смысл, другие слова.
 *
 * @param {string} what - что генерим, для лога
 * @param {(prompt: string) => Promise<any>} run - принимает промпт, возвращает результат
 * @param {string} prompt
 */
async function withNsfwRetry(what, run, prompt, outDir = null) {
  try {
    return await run(prompt);
  } catch (e) {
    if (!/nsfw/i.test(String(e.message))) throw e;
    log(`  ${what}: фильтр вернул nsfw — повторяю со смягчённой формулировкой`);
    // Ложное срабатывание фильтра — событие, которое иначе не остаётся нигде: кредиты
    // возвращаются, прогон едет дальше, и на разборе непонятно, почему стиль «странный».
    // Замер 14.08: так молча потерялось пять стилей из тринадцати.
    if (outDir) {
      await journal.note(outDir, {
        stage: what === 'борд' ? 'борд' : 'монтаж', kind: 'механика',
        what: `фильтр вернул nsfw на «${what}», ушёл повтор со смягчённой формулировкой`,
        where: outDir,
      });
    }
    return run(softenForFilter(prompt));
  }
}

/** Монтаж куска по борду + возврат своей звуковой дорожки. */
export async function montageOne({ prep, board, outDir }) {
  const prompt = await readFile(prep.promptFile, 'utf8');
  const p = prep.params;
  log(`  монтаж: ${p.model} · ${p.duration} сек · ${p.aspect_ratio} · ${p.resolution}`);
  const res = await withNsfwRetry('монтаж', (text) => hfGenerate({
    model: p.model,
    params: { prompt: text, duration: p.duration, resolution: p.resolution, aspect_ratio: p.aspect_ratio },
    medias: { video: [prep.cut], image: [board] },
  }), prompt, outDir);
  const rawPath = path.join(outDir, `part-${prep.seg.n}-raw.mp4`);
  await hfDownload(res.urls[0], rawPath);

  // Звук модели не берём никогда: Omni задваивает слова и режет хвост, несмотря на
  // «keep original audio». finishPart вернёт нашу дорожку и добьёт длину стоп-кадром.
  const finalPath = path.join(outDir, `part-${prep.seg.n}-final.mp4`);
  await finishPart({ model: rawPath, source: prep.cut, out: finalPath });
  log(`  кусок готов: ${finalPath}`);
  return { rawPath, finalPath };
}

/**
 * Заготовка файла дубля: внешность спикера плюс по строке на панель каждого куска.
 *
 * Формат придумывать не надо — файл уже правильной формы, остаётся вписать предметы.
 * Фраза лежит в ключе `_фраза` именно затем, чтобы предмет писался ПОД НЕЁ, а не
 * абстрактно: дежурный предмет из SHOTS одинаково подходит к любому тексту и потому
 * не подходит ни к какому.
 *
 * `_внешность` стоит первым ключом: это единственное, что обязано быть ОДИНАКОВЫМ во
 * всех кусках, и без него модель перекрашивает одежду на стыке (замерено 15.08.2026).
 */
async function writeObjectsTemplate({ src, segments, allSegments, styleKey, keepBackground, outDir, objects = {}, appearance = '' }) {
  const tpl = { _внешность: appearance };
  for (const seg of segments) {
    // Панели считает та же preparePart — иначе заготовка разъедется с прогоном.
    // Предметы передаём те же, что у прогона: эта функция ПЕРЕЗАПИСЫВАЕТ файлы
    // промптов, и без них заготовка затирала бы осмысленные предметы дежурными —
    // прогон уходил бы в модель не с тем, что показал человеку (поймано 15.08.2026).
    const p = await preparePart({
      src, segments: allSegments, segNo: seg.n, styleKey, keepBackground, outDir,
      objects: objects[seg.n] || [], appearance,
    });
    // Уже заполненный предмет показываем в заготовке, чтобы её можно было
    // перечитать и поправить, а не собирать заново с нуля.
    tpl[seg.n] = p.panels.map((panel, i) => ({
      _фраза: panel.words,
      предмет: (objects[seg.n] || [])[i] || '',
    }));
  }
  const file = path.join(outDir, 'objects-template.json');
  await writeFile(file, JSON.stringify(tpl, null, 1), 'utf8');
  return file;
}

/**
 * Предметы из файла-заготовки в вид, который понимает generativeRun.
 * Принимает и заполненную заготовку ({_фраза, предмет}), и голый массив строк.
 */
export function readObjectsFile(raw) {
  const out = {};
  for (const [seg, list] of Object.entries(raw || {})) {
    out[seg] = (Array.isArray(list) ? list : []).map((x) => (typeof x === 'string' ? x : x?.предмет || x?.object || ''));
  }
  return out;
}

/**
 * Внешность спикера из того же файла дубля.
 *
 * Отдельной функцией, а не полем в `readObjectsFile()`: её выход разбирают ещё
 * `scripts/style-showcase.mjs` и `scripts/storyboard-live.mjs`, и смена формы возврата
 * сломала бы обоих ради одной строки.
 */
export function readAppearance(raw) {
  return String(raw?._внешность || raw?.appearance || '').trim();
}

/**
 * Кадры для приёмки: ролик раскладывается по секунде, смотрит их Claude Code.
 *
 * Своя реализация вместо `lib/qa-video.mjs` намеренно: тот ходит в Claude API и
 * требует ANTHROPIC_API_KEY, которого в комплекте студента нет и не будет. Раннер
 * обязан работать одинаково у нас и у студента, поэтому здесь только ffmpeg.
 */
export async function extractQaFrames(videoPath, outDir, stepSec = 1.0) {
  await mkdir(outDir, { recursive: true });
  const { duration } = await probe(videoPath);
  const out = [];
  for (let t = 0; t < duration - 0.05; t += stepSec) {
    out.push(await grabFrame(videoPath, t, path.join(outDir, `qa-${t.toFixed(1)}.jpg`)));
  }
  return out;
}

/**
 * Предполётный лист: всё, что смотрится глазами до траты, одним файлом.
 *
 * Сухой прогон печатал это в консоль, откуда оно уезжало вверх и пропадало. Промпты
 * лежали двумя отдельными .txt, панели — в терминале, смета — в третьем месте. Собрать
 * картину целиком было негде, и смысловые ошибки проскакивали именно поэтому.
 */
async function writePreflight({ outDir, prep, segments, estimate, balance, mark, appearance }) {
  const L = [];
  L.push(`# Предполётный лист — ${prep.style.name} (${prep.seg.n}-й кусок)`, '');
  L.push('> Всё ниже стоит НОЛЬ и правится бесплатно. После первой траты — уже нет.', '');

  L.push('## Деньги', '', `- смета: ≈${estimate} кредитов на ${segments.length} кусок(ов)`,
    `- баланс сейчас: ${balance}`, '');

  L.push('## Расшифровка', '',
    mark.ok
      ? `- проверена ${String(mark.at).slice(0, 10)}${mark.note ? ` — ${mark.note}` : ''}`
      : '- **БЕЗ ПОДПИСИ.** Титры повторяют её дословно: ошибка здесь станет ошибкой в кадре',
    '');

  L.push('## Куски', '');
  segments.forEach((s) => L.push(`- кусок ${s.n}: ${s.duration.toFixed(2)} сек — «${s.text}»`));
  L.push('');

  L.push(`## Панели куска ${prep.seg.n} — титр против предмета`, '');
  prep.panels.forEach((p, i) => {
    L.push(`${i + 1}. \`${p.t.toFixed(2)}с\` **${p.shot}**`);
    L.push(`   - титр: «${p.words}»`);
    L.push(`   - предмет: ${p.object}`);
  });
  L.push('');

  L.push('## Мир кадра', '',
    `- фон за спикером: ${prep.keepBg ? 'оставляем как снят' : prep.style.background}`,
    `- текст на предметах: ${prep.style.textAsObject === true ? 'разрешён, по одному короткому слову' : 'запрещён'}`,
    `- внешность: ${appearance || '**НЕ ЗАДАНА** — между кусками уедет одежда и волосы'}`, '');

  const { blockers, warnings } = prep.checks;
  L.push('## Проверки', '', `- гейт монтажа: ${prep.gate.summary}`,
    `- гейт борда: ${prep.boardGate.summary}${prep.boardGate.ok ? '' : ' — ОТКАЗ'}`, '');
  if (!prep.boardGate.ok) prep.boardGate.problems.forEach((p) => L.push(`- ❌ борд: ${p}`));
  if (blockers.length) {
    L.push('### Отказы — трата заблокирована', '');
    blockers.forEach((b) => L.push(`- ❌ ${b}`));
    L.push('');
  }
  if (warnings.length) {
    L.push('### Предупреждения — решает человек', '');
    warnings.forEach((w) => L.push(`- ⚠ ${w}`));
    L.push('');
  }
  if (!blockers.length && !warnings.length) L.push('Отказов и предупреждений нет.', '');

  L.push('## Промпт борда', '', '```', prep.boardPrompt, '```', '');
  L.push('## Промпт монтажа', '', '```', prep.prompt, '```', '');

  const file = path.join(outDir, 'PREFLIGHT.md');
  await writeFile(file, L.join('\n'), 'utf8');
  return file;
}

function printPrep(prep) {
  log(`\nпанели куска ${prep.seg.n}:`);
  prep.panels.forEach((p, i) => log(`  ${i + 1}. ${p.t.toFixed(2)}с · ${p.shot} · «${p.words}» · ${p.role}`));
  log(`фон за спикером: ${prep.keepBg ? 'оставляем как снят' : prep.style.background}`);
  log(`текст на предметах: ${prep.style.textAsObject === true ? 'разрешён, по одному короткому слову' : 'запрещён'}`);
  // Внешность печатаем ДО оплаты: пустая строка означает, что между кусками якоря нет
  // и модель вольна перекрасить одежду — это надо увидеть до траты, а не на приёмке.
  log(`внешность спикера: ${prep.appearance ? prep.appearance : 'НЕ ЗАДАНА — между кусками может уехать одежда и цвет волос'}`);
  log(`гейт: ${prep.gate.summary}`);
  // Линт печатается ВСЕГДА, а не только в сухом прогоне: предупреждение, которое видно
  // лишь при --dry, не увидит тот, кто сразу запустил платный прогон.
  prep.checks.blockers.forEach((b) => log(`  ❌ ${b}`));
  prep.checks.warnings.forEach((w) => log(`  ⚠ ${w}`));
}

/** Сколько списалось с прошлого замера. Считаем по балансу, а не по оценке модели. */
async function spentSince(before) {
  const now = await hfBalance();
  if (before == null || now == null) return 0;
  return Math.max(0, Math.round((before - now) * 100) / 100);
}

async function readJson(p) {
  try { await access(p); } catch { return null; }
  return JSON.parse(await readFile(p, 'utf8'));
}

async function writeJson(p, obj) {
  await writeFile(p, JSON.stringify(obj, null, 1), 'utf8');
}

function log(msg) { console.log(`[генмонтаж] ${msg}`); }

/* ────────────────────────── CLI ────────────────────────── */

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith('--'));
  const flag = (name, dflt = null) => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : dflt;
  };

  const src = positional[0];
  const styleKey = flag('style');
  if (!src || !styleKey) {
    console.error('Использование: node reels/generative-run.mjs <видео> [words.json] --style=<ключ> [--out=папка] [--segments=1,2] [--keep-background] [--resume] [--dry] [--objects=файл.json] [--appearance="внешность спикера"] [--skip-transcript-check]');
    console.error(`Стили: ${STYLE_KEYS.join(', ')}`);
    console.error('Транскрипт: node reels/transcribe-local.mjs <видео>  (бесплатно, офлайн)');
    process.exit(1);
  }

  // Транскрипт кладётся рядом с видео и называется так же — если путь не дали,
  // ищем его там, а не заставляем человека печатать очевидное.
  const wordsPath = positional[1] || src.replace(/\.[^.]+$/, '.words.json');
  const outDir = flag('out') || `./out/genmontage/${styleKey}`;
  const only = (flag('segments') || '').split(',').filter(Boolean).map(Number);

  const objectsFile = flag('objects');
  const objectsRaw = objectsFile ? JSON.parse(await readFile(objectsFile, 'utf8')) : null;
  const objects = objectsRaw ? readObjectsFile(objectsRaw) : {};

  // Внешность живёт в файле дубля рядом с предметами — это свойство ОДНОГО дубля,
  // как и они. Флаг оставлен ручным переопределением для быстрых прогонов без файла.
  const appearance = flag('appearance') || readAppearance(objectsRaw);

  generativeRun({
    src, wordsPath, styleKey, outDir, only, objects, appearance,
    keepBackground: args.includes('--keep-background'),
    resume: args.includes('--resume'),
    dry: args.includes('--dry'),
    skipTranscriptCheck: args.includes('--skip-transcript-check'),
  }).catch((e) => {
    console.error(`[генмонтаж] ОШИБКА: ${e.message}`);
    process.exit(1);
  });
}
