/**
 * audio.mjs — музыка и озвучка поверх смонтированной дорожки.
 *
 * Работает между базой и оверлеем: на входе `base.mp4` со звуком исходника, на
 * выходе тот же кадр с подмешанной музыкой и, если нужно, закадровым голосом.
 * Итоговую громкость выравнивает `loudnorm` в композите — здесь только баланс.
 *
 * ОТКУДА БЕРУТСЯ ФАЙЛЫ. Этот модуль ничего не генерирует и никуда не ходит: он
 * принимает готовые mp3/wav. Причина не в лени — MCP-инструменты доступны агенту,
 * а не коду (REST Higgsfield отдаёт только soul-семейство, проверено), и ключа
 * ANTHROPIC_API_KEY в комплекте студента нет и не будет. Поэтому «чем озвучить»
 * решает скилл: Higgsfield `text2speech_v2` variant `elevenlabs` для русского
 * голоса, `sonilo_music` для лицензированной музыки, `mirelo_text_to_audio` для
 * SFX под ASMR — либо файл, скачанный руками с любого сайта. Код принимает любой.
 *
 * ПРИГЛУШЕНИЕ ПОД ГОЛОС сделано по известным речевым интервалам, а не через
 * `sidechaincompress`. Причина: компрессор судит по уровню сигнала, а речь в
 * телефонном дубле идёт на −27 LUFS — порог приходилось бы угадывать под каждый
 * файл. Интервалы речи у нас посчитаны точно (фразы монтажного листа), поэтому
 * огибающая строится детерминированно и повторяется от прогона к прогону.
 * Переходы плавные: резкое переключение громкости слышно как щелчок.
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { runBin } from '../lib/bin.mjs';

/** Баланс по умолчанию. Музыка фоном, под речью проседает ещё сильнее. */
export const AUDIO = {
  musicGainDb: -16,     // насколько тише речи звучит музыка в паузах
  duckDb: -12,          // дополнительное приглушение на речи
  // Склон приглушения. 0.2 сек: паузы между фразами после вырезки мёртвого воздуха
  // короткие (в замере — от 0.24 сек), и на склоне 0.35 музыка не успевала подняться.
  rampSec: 0.2,
  fadeInSec: 0.8,
  fadeOutSec: 1.5,
  voiceGainDb: 0,
};

/**
 * Подмешать музыку и/или озвучку в дорожку смонтированного видео.
 *
 * @param {Object} args
 * @param {string} args.videoPath - вход (обычно base.mp4)
 * @param {string} args.outPath
 * @param {Array<{t0:number,t1:number}>} [args.speechRanges] - интервалы речи в шкале
 *   смонтированного ролика (у нас это `edl.phrases`). Пусто — приглушать нечего.
 * @param {{path:string, gainDb?:number, duckDb?:number, fadeInSec?:number, fadeOutSec?:number}} [args.music]
 * @param {{path:string, gainDb?:number}} [args.voice] - закадровый голос, когда в кадре нет живого
 * @param {number} args.duration - длительность ролика
 * @param {string} args.workDir - куда положить граф фильтров
 * @returns {Promise<{outPath:string, applied:string[]}>} applied — что реально подмешано
 */
export async function mixAudio({ videoPath, outPath, speechRanges = [], music, voice, duration, workDir }) {
  if (!music?.path && !voice?.path) {
    // Нечего подмешивать — не гоняем ffmpeg вхолостую и не перекодируем звук зря.
    return { outPath: videoPath, applied: [] };
  }
  await mkdir(path.dirname(outPath), { recursive: true });
  await mkdir(workDir, { recursive: true });

  const inputs = ['-i', videoPath];
  const parts = [];
  const applied = [];
  const mixLabels = ['[speech]'];

  // Дорожка исходника. Если есть закадровый голос — она остаётся как атмосфера
  // сцены, но уходит на второй план: два голоса на равных не разобрать.
  parts.push(voice?.path
    ? `[0:a]volume=${db(-9)}[speech]`
    : `[0:a]anull[speech]`);

  if (voice?.path) {
    inputs.push('-i', voice.path);
    const g = voice.gainDb ?? AUDIO.voiceGainDb;
    // apad + atrim: озвучка почти никогда не совпадает с видео по длине.
    // Короткую дотягиваем тишиной, длинную обрезаем — иначе amix растянет ролик.
    parts.push(`[1:a]volume=${db(g)},apad,atrim=0:${f(duration)},asetpts=PTS-STARTPTS[voice]`);
    mixLabels.push('[voice]');
    applied.push(`озвучка ${path.basename(voice.path)}`);
  }

  if (music?.path) {
    const idx = voice?.path ? 2 : 1;
    inputs.push('-i', music.path);
    const gain = music.gainDb ?? AUDIO.musicGainDb;
    const duck = music.duckDb ?? AUDIO.duckDb;
    const fadeIn = music.fadeInSec ?? AUDIO.fadeInSec;
    const fadeOut = music.fadeOutSec ?? AUDIO.fadeOutSec;
    const ranges = voice?.path ? [{ t0: 0, t1: duration }] : speechRanges;

    // aloop=-1 — короткий трек повторяется до конца ролика; трек длиннее просто обрежется.
    parts.push(
      `[${idx}:a]aloop=loop=-1:size=2e9,atrim=0:${f(duration)},asetpts=PTS-STARTPTS,`
      + `volume=${db(gain)},`
      + `volume='${duckExpr(ranges, duck, music.rampSec ?? AUDIO.rampSec)}':eval=frame,`
      + `afade=t=in:st=0:d=${f(fadeIn)},afade=t=out:st=${f(Math.max(0, duration - fadeOut))}:d=${f(fadeOut)}[music]`
    );
    mixLabels.push('[music]');
    // Доля времени под приглушением. Монтаж вырезает мёртвый воздух, поэтому речь
    // идёт плотно и приглушение может занимать почти весь ролик — тогда оно не
    // читается как приём, и честнее просто выставить общий gainDb. Замер 30.07 на
    // принятом ролике: 13 фраз покрывают 99% длительности, пауз длиннее 0.5 сек нет.
    const covered = ranges.reduce((a, r) => a + (r.t1 - r.t0), 0);
    const share = duration > 0 ? Math.min(1, covered / duration) : 0;
    applied.push(ranges.length
      ? `музыка ${path.basename(music.path)} (${gain} dB, под речью ${duck} dB на ${ranges.length} интервалах — ${(share * 100).toFixed(0)}% ролика)`
      : `музыка ${path.basename(music.path)} (${gain} dB, приглушать нечего — речь не размечена)`);
    if (share > 0.9) {
      applied.push(`⚠ речь занимает ${(share * 100).toFixed(0)}% ролика — приглушение слышно только на входе и в финале.`
        + ` Если музыка мешает голосу, опускай music.gainDb, а не duckDb`);
    }
  }

  // normalize=0 обязателен: amix по умолчанию делит громкость на число входов,
  // и аккуратно выставленный баланс превращается в кашу вдвое тише.
  parts.push(`${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=first:normalize=0[aout]`);

  const graphPath = path.join(workDir, 'audio-filter.txt');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(graphPath, parts.join(';\n'), 'utf8');

  await runBin('ffmpeg', [
    '-y', ...inputs,
    '-filter_complex_script', graphPath,
    '-map', '0:v', '-map', '[aout]',
    '-c:v', 'copy',                     // видео не трогаем: кадр уже собран, перекодировать незачем
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart',
    outPath,
  ]);

  return { outPath, applied };
}

/**
 * Выражение громкости для приглушения на интервалах речи.
 *
 * Каждый интервал даёт трапецию с плавными склонами длиной ramp; трапеции
 * складываются и обрезаются по единице (соседние фразы могут перекрыться
 * склонами). Итог: 1 в паузах, коэффициент приглушения на речи.
 * max/min в ffmpeg двухаргументные, поэтому clip разворачивается вручную.
 */
function duckExpr(ranges, duckDb, ramp) {
  if (!ranges.length) return '1';
  const depth = 1 - Math.pow(10, duckDb / 20);
  const trapezoids = ranges.map(({ t0, t1 }) => {
    const up = `min(1\\,max(0\\,(t-${f(t0 - ramp)})/${f(ramp)}))`;
    const down = `min(1\\,max(0\\,(${f(t1 + ramp)}-t)/${f(ramp)}))`;
    return `${up}*${down}`;
  });
  return `1-${f(depth)}*min(1\\,${trapezoids.join('+')})`;
}

/** Децибелы в множитель: фильтр volume принимает и dB, но в выражении нужен коэффициент. */
function db(x) { return `${Number(x).toFixed(2)}dB`; }
function f(x) { return Number(x).toFixed(3); }
