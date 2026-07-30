/**
 * clip-from-slide.mjs — мост «готовый слайд → клип по пресету».
 *
 * Зачем: у нас накоплены слайды карусели, а Stories и Reels просят движение.
 * Пресет Higgsfield оживляет одну картинку без брифинга — и это самый дешёвый по
 * труду способ получить видео из уже принятой статики.
 *
 * ЧТО ДЕЛАЕТ ЭТОТ СКРИПТ: готовит вход. Приводит слайд к пропорции, которую модель
 * принимает (16:9 / 9:16 / 1:1), потому что наш рабочий формат 4:5 в список не входит,
 * и печатает готовые параметры вызова.
 *
 * ЧЕГО НЕ ДЕЛАЕТ: не генерирует. REST platform.higgsfield.ai отдаёт только
 * soul-семейство (проверено 01.07.2026, пресеты там 404), а пресеты живут в MCP.
 * Поэтому генерацию делает агент вызовом mcp__…__generate_video по напечатанным
 * параметрам. Обёртки вокруг несуществующего эндпоинта здесь нет намеренно.
 *
 * node reels/clip-from-slide.mjs <слайд.png> [--preset=sticker-peel] [--ar=9:16] [--bg=#0E0E12]
 */
import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { runBin } from './lib/bin.mjs';
import { resolvePreset, PRESETS, SAFE_FOR_TEXT } from './presets.mjs';

/** Размеры картинки через ffprobe — чтобы не тянуть sharp ради двух чисел. */
async function probeImage(file) {
  const r = await runBin('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file]);
  const [width, height] = r.stdout.trim().split('x').map(Number);
  if (!width || !height) throw new Error(`ffprobe не отдал размеры картинки: ${file}`);
  return { width, height };
}

const args = process.argv.slice(2);
const slideArg = args.find((a) => !a.startsWith('--'));

function flag(name, dflt = null) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
}

if (!slideArg) {
  console.error('Использование: node reels/clip-from-slide.mjs <слайд.png> [--preset=sticker-peel] [--ar=9:16]');
  console.error(`\nПресеты нашего среза:`);
  for (const [key, p] of Object.entries(PRESETS)) console.error(`  ${key.padEnd(17)} ${p.what}\n${' '.repeat(19)}${p.when}`);
  process.exit(1);
}

const slidePath = path.resolve(slideArg);
try {
  await access(slidePath);
} catch {
  console.error(`Файла нет: ${slidePath}`);
  process.exit(1);
}

const preset = resolvePreset(flag('preset', 'sticker-peel'));
const ar = flag('ar', '9:16');
const bg = flag('bg', '#0E0E12');

// Модель принимает только эти три пропорции. Наш 4:5 сюда не входит, поэтому
// слайд вписывается в кадр целиком (contain), а не обрезается: у слайда есть
// текст по краям, кроп съел бы смысл.
const SIZES = { '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080] };
const size = SIZES[ar];
if (!size) {
  console.error(`Пропорция ${ar} не поддерживается моделью. Только: ${Object.keys(SIZES).join(', ')}`);
  process.exit(1);
}

const meta = await probeImage(slidePath);
const outDir = path.join(path.dirname(slidePath), 'clip-input');
await mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, `${path.parse(slidePath).name}-${ar.replace(':', 'x')}.png`);

// Вписываем слайд целиком и заливаем поля. ffmpeg, а не sharp: ffmpeg в фабрике
// обязателен и стоит у всех, а sharp — лишние 30 МБ зависимости ради одного ресайза.
await runBin('ffmpeg', ['-y', '-i', slidePath,
  '-vf', `scale=${size[0]}:${size[1]}:force_original_aspect_ratio=decrease,`
    + `pad=${size[0]}:${size[1]}:(ow-iw)/2:(oh-ih)/2:${bg.replace('#', '0x')}`,
  '-frames:v', '1', '-update', '1', outPath]);

const srcAR = (meta.width / meta.height).toFixed(3);
const dstAR = (size[0] / size[1]).toFixed(3);

console.log(`=== Вход для клипа готов ===`);
console.log(`слайд:  ${meta.width}×${meta.height} (AR ${srcAR})`);
console.log(`кадр:   ${size[0]}×${size[1]} (AR ${dstAR})${srcAR === dstAR ? '' : ' — поля залиты ' + bg}`);
console.log(`файл:   ${outPath}`);
console.log(`\nпресет: ${preset.name} — ${preset.what}`);
console.log(`когда:  ${preset.when}`);
if (preset.verified) console.log(`факт:   ${preset.verified}`);
if (!preset.safeForText) {
  console.log(`\n⚠ Этот пресет ПЕРЕПИСЫВАЕТ содержимое кадра. Если на слайде есть текст —`);
  console.log(`  он исчезнет к середине клипа (проверено). Для текстовых слайдов: ${SAFE_FOR_TEXT.join(', ')}.`);
}
console.log(`\nДальше генерирует агент (REST пресеты не отдаёт, только MCP):`);
console.log(`  1. media_upload → PUT байты файла выше → media_confirm`);
console.log(`  2. generate_video:`);
console.log(JSON.stringify({
  model: 'higgsfield_preset',
  preset_id: preset.id,
  aspect_ratio: ar,
  medias: [{ role: 'image', value: '<media_id из шага 1>' }],
}, null, 2).split('\n').map((l) => '     ' + l).join('\n'));
console.log(`\nЧто отдаёт модель: 10 сек, 720p, со звуком. Промпт зашит в пресет —`);
console.log(`свой текст не подставляется, поэтому и «без брифинга».`);
console.log(`Приёмка глазами обязательна: пресет не знает, что на слайде.`);
