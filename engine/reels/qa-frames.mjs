/**
 * qa-frames.mjs — приёмка ролика БЕЗ единого платного вызова.
 *
 * Раскладывает готовый ролик на кадры и печатает чек-лист. Смотрит кадры не
 * модель по API, а сам Claude Code — он умеет открывать картинки, и за него уже
 * заплачено подпиской. Поэтому приёмка стоит ноль.
 *
 * Машинная приёмка (кадры уходят в Claude API, ≈$0,13 за ролик) в комплект
 * студента намеренно НЕ входит: она требует отдельного платного ключа и нужна
 * только там, где человека в цикле нет — пакетный прогон, автоматика, CI.
 * Это серверный режим, про него отдельный чек-лист.
 *
 * node reels/qa-frames.mjs <видео> [--step=1.0] [--out=папка]
 */
import { mkdir, access, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { runBin } from './lib/bin.mjs';

const args = process.argv.slice(2);
const videoArg = args.find((a) => !a.startsWith('--'));

function flag(name, dflt = null) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
}

if (!videoArg) {
  console.error('Использование: node reels/qa-frames.mjs <видео> [--step=1.0] [--out=папка]');
  process.exit(1);
}

const videoPath = path.resolve(videoArg);
try {
  await access(videoPath);
} catch {
  console.error(`Файла нет: ${videoPath}`);
  process.exit(1);
}

const stepSec = Number(flag('step')) || 1.0;
const outDir = path.resolve(flag('out') || path.join(path.dirname(videoPath), 'qa-frames'));

// Чистим папку: кадры прошлого прогона в приёмке нового ролика — прямой путь
// к вердикту по чужой картинке.
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const probe = await runBin('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
  '-of', 'default=noprint_wrappers=1:nokey=1', videoPath]);
const duration = Number(probe.stdout.trim());

await runBin('ffmpeg', ['-y', '-i', videoPath, '-vf', `fps=1/${stepSec}`,
  '-q:v', '3', path.join(outDir, 'f-%03d.jpg')]);

const frames = (await readdir(outDir)).filter((f) => f.endsWith('.jpg')).sort();

console.log('=== Кадры для приёмки готовы ===');
console.log(`ролик:  ${videoPath}`);
console.log(`${duration.toFixed(1)} сек, кадров ${frames.length} с шагом ${stepSec} сек`);
console.log(`папка:  ${outDir}\n`);
console.log('Открой кадры и ответь по списку. Приёмка стоит ноль — смотрит Claude Code,');
console.log('а не платный API.\n');

console.log('РЕМЕСЛО:');
console.log('  1. Голова в кадре не обрезана (особенно в боксовых сценах).');
console.log('  2. Текст не заходит в занятые зоны: снизу 430 px (ник, подпись, прогресс-бар),');
console.log('     сверху 200 px (шапка), справа 150 px (кнопки лайк/коммент/репост).');
console.log('     Числа из боевой публикации, а не из документации — на телефоне зоны шире.');
console.log('  3. Титр не перекрывает лицо.');
console.log('  4. Кириллица в титрах целая: ни подменённых, ни удвоенных букв.');
console.log('  5. Надписи не наезжают друг на друга, текст читается на телефоне.');
console.log('  6. Графика не скачет: палитра, шрифт и тип карточек одни на весь ролик.');

console.log('\nДРАМАТУРГИЯ:');
console.log('  7. В первые полторы секунды есть хук — то, ради чего не листают дальше.');
console.log('  8. В финале понятно, что делать: призыв, имя бренда или ссылка.');
console.log('  9. Ритм: стимул меняется каждые 3–6 секунд. Два одинаковых плана подряд — брак.');

console.log('\nЕСЛИ В РОЛИКЕ ЕСТЬ СГЕНЕРИРОВАННЫЕ ВСТАВКИ:');
console.log(' 10. Герой не плывёт: между кадрами те же черты лица, причёска, крой и цвет одежды.');
console.log(' 11. Геометрия держится: предметы не всплывают, не размножаются, линии не гнутся.');
console.log(' 12. Нет признаков слопа: градиентное золото, восковая кожа, свет без теней,');
console.log('     «почти правдоподобные» сломанные объекты, эффект только в части кадра.');

console.log('\nСмаз движения, расфокус и смена ракурса — это съёмка, а не брак.');
console.log('Сомневаешься между «сломано» и «так снято» — значит не сломано.');
console.log('\nИ послушай звук целиком: провал громкости и музыку, забившую голос,');
console.log('по кадрам не увидишь.');
