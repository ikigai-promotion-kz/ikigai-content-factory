/**
 * Сборка «до/после»: сырой дубль слева, смонтированный ролик справа, в одном кадре.
 *
 *   node reels/montage/side-by-side.mjs <исходник> <результат> [--out=файл.mp4]
 *                                        [--no-caption] [--panel=608]
 *
 * Зачем отдельный инструмент. Словами разница между «снял на телефон» и «прогнал
 * через конвейер» не передаётся: читатель видит два аккуратных ролика и не понимает,
 * что изменилось. В одном кадре она читается за две секунды.
 *
 * Три решения, каждое стоило отладки:
 *
 * 1. Разная длительность НЕ подгоняется. Смонтированный ролик короче исходника
 *    ровно на вырезанную тишину — это и есть главный пруф, обрезать его нельзя.
 *    Правая панель гаснет в чёрное (tpad), пока левая ещё дописывает паузы.
 *    Читается мгновенно и без единой подписи.
 *
 * 2. Граф фильтров уходит в файл, а не в аргумент. Не из-за длины — из-за
 *    экранирования: внутри и `#` в цветах, и двоеточие в пути к шрифту, и кириллица.
 *    Тот же приём, что в base.mjs.
 *
 * 3. Подписи подаются через `textfile=`, а не `text=`. Кириллица, пройденная
 *    через оболочку Windows, приезжает в кадр мусором.
 *
 * Грабля, на которую здесь стоит защита: drawtext с несуществующим шрифтом
 * НЕ роняет ffmpeg. Он возвращает ноль и молча ничего не рисует — брак виден
 * только глазами на готовом файле. Поэтому шрифт проверяется до рендера,
 * и если ни одного пригодного нет, подписи снимаются осознанно, с предупреждением.
 */

import fs from 'node:fs';
import path from 'node:path';
import { runBin } from '../lib/bin.mjs';

const BG = '0x0B0B0C';
const OUT_W = 1920;
const OUT_H = 1080;

const FONTS = [
  'C:/Windows/Fonts/arialbd.ttf',
  'C:/Windows/Fonts/segoeuib.ttf',
  'C:/Windows/Fonts/seguisb.ttf',
  'C:/Windows/Fonts/tahomabd.ttf',
];

async function probeDuration(file) {
  const out = await runBin('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ]);
  const sec = Number(String(out.stdout).trim());
  if (!Number.isFinite(sec)) throw new Error(`не читается длительность: ${file}`);
  return sec;
}

/**
 * Путь внутри графа фильтров — три обязательных шага, каждый проверен отказом:
 *  · прямые слэши: обратные парсер графа принимает за экранирование и рассыпает строку;
 *  · экранированное двоеточие диска: иначе оно читается как разделитель опций;
 *  · кавычки вокруг всего: без них ffmpeg всё равно спотыкается сразу после «C\:»
 *    и ругается «No option name near '/Windows/Fonts/...'».
 */
const filterPath = (p) => `'${p.replace(/\\/g, '/').replace(/:/g, '\\:')}'`;

export async function buildSideBySide({
  src, result, out,
  panelW = 608,
  caption = true,
  captionLeft = 'снял на телефон',
  captionRight = 'агент смонтировал сам',
} = {}) {
  if (!fs.existsSync(src)) throw new Error(`нет исходника: ${src}`);
  if (!fs.existsSync(result)) throw new Error(`нет результата: ${result}`);

  const outFile = out || path.join(path.dirname(result), 'before-after.mp4');
  const dir = path.dirname(outFile);
  fs.mkdirSync(dir, { recursive: true });

  const srcSec = await probeDuration(src);
  const resSec = await probeDuration(result);
  const cut = srcSec - resSec;

  const font = FONTS.find((f) => fs.existsSync(f));
  const withCaption = caption && Boolean(font);
  if (caption && !font) {
    console.log('[до/после] ⚠ ни одного шрифта из списка не нашлось — собираю без подписей.');
    console.log('[до/после]   Гашение правой панели несёт то же сообщение, поэтому это не блокер.');
  }

  const gap = OUT_W - panelW * 2;
  const rightX = OUT_W - panelW;

  const capFiles = [];
  const drawtext = () => {
    if (!withCaption) return 'null';
    const write = (name, text) => {
      const f = path.join(dir, name);
      fs.writeFileSync(f, text, 'utf8'); // без BOM: ffmpeg отдаёт его в кадр как символ
      capFiles.push(f);
      return filterPath(f);
    };
    const left = write('_cap-left.txt', captionLeft);
    const right = write('_cap-right.txt', captionRight);
    const ff = filterPath(font);
    const x = `${panelW}+(${gap}-text_w)/2`;
    return [
      `drawtext=fontfile=${ff}:textfile=${left}:fontcolor=0x8A8378:fontsize=38:x=${x}:y=430`,
      `drawtext=fontfile=${ff}:textfile=${right}:fontcolor=0xF2E8D5:fontsize=38:x=${x}:y=560`,
    ].join(',');
  };

  const graph = [
    `color=c=${BG}:s=${OUT_W}x${OUT_H}:r=30[bg]`,
    `[0:v]fps=30,scale=${panelW}:${OUT_H}:force_original_aspect_ratio=increase,crop=${panelW}:${OUT_H},setsar=1[L]`,
    // stop_duration с запасом: точную разницу считать не нужно, лишнее срежет shortest.
    `[1:v]fps=30,scale=${panelW}:${OUT_H}:force_original_aspect_ratio=increase,crop=${panelW}:${OUT_H},setsar=1,tpad=stop_mode=add:color=${BG}:stop_duration=15[R]`,
    // shortest на первом overlay: фон бесконечен, длину задаёт левая панель — то есть исходник.
    `[bg][L]overlay=0:0:shortest=1[b1]`,
    `[b1][R]overlay=${rightX}:0[b2]`,
    // trim, а не shortest. `shortest=1` на первом overlay ограничивает только его:
    // второй наследует длину от правой панели, растянутой tpad'ом, и ролик уезжает
    // на лишние секунды чёрного. Обрезаем по длительности исходника явно.
    `[b2]trim=duration=${srcSec.toFixed(3)},setpts=PTS-STARTPTS,${drawtext()},format=yuv420p[v]`,
    // Звук берём у результата — он уже приведён к −14 LUFS — и добиваем тишиной до конца кадра.
    //
    // whole_dur обязателен. Голый apad тишину НЕ ограничивает: поток становится
    // бесконечным, видео давно кончилось, а ffmpeg продолжает писать файл и никогда
    // не закрывает контейнер. Снаружи это выглядит как «рендер завис» — на самом деле
    // он честно работает вечно. Час на диагностику, одна опция на лечение.
    `[1:a]apad=whole_dur=${srcSec.toFixed(3)},asetpts=PTS-STARTPTS[a]`,
  ].join(';\n');

  const graphFile = path.join(dir, '_sbs-filter.txt');
  fs.writeFileSync(graphFile, graph, 'utf8');

  console.log(`[до/после] слева ${srcSec.toFixed(2)} сек, справа ${resSec.toFixed(2)} сек — вырезано ${cut.toFixed(2)} сек тишины`);
  console.log(`[до/после] панели ${panelW}×${OUT_H}, подписи: ${withCaption ? 'да' : 'нет'}`);

  await runBin('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', src, '-i', result,
    '-filter_complex_script', graphFile,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-crf', '23', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
    '-movflags', '+faststart',
    outFile,
  ]);

  for (const f of [graphFile, ...capFiles]) fs.rmSync(f, { force: true });

  console.log(`[до/после] готово: ${outFile}`);
  return outFile;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const args = process.argv.slice(2);
  const positional = args.filter((a) => !a.startsWith('--'));
  const flag = (n, d) => { const h = args.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : d; };
  if (positional.length < 2) {
    console.error('Использование: node reels/montage/side-by-side.mjs <исходник> <результат> [--out=файл.mp4] [--panel=608] [--no-caption]');
    process.exit(1);
  }
  buildSideBySide({
    src: path.resolve(positional[0]),
    result: path.resolve(positional[1]),
    out: flag('out') ? path.resolve(flag('out')) : undefined,
    panelW: Number(flag('panel', '608')),
    caption: !args.includes('--no-caption'),
  }).catch((err) => { console.error(`[до/после] ${err.message}`); process.exit(1); });
}
