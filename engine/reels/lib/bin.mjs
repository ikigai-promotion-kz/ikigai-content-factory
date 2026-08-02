/**
 * bin.mjs — поиск внешних бинарей (ffmpeg/ffprobe/yt-dlp) с фолбэком мимо PATH.
 *
 * Зачем: на Windows PATH протухает молча. Живой случай 28.07.2026 — winget обновил
 * ffmpeg до 8.1.1, а в PATH остался путь на `ffmpeg-8.1-full_build`, которого больше
 * нет: `ffmpeg -version` падал «command not found», хотя бинарь лежал рядом.
 * Ровно эта грабля описана в STACK-FABRIKI.md как типовая.
 *
 * Поэтому конвейер не зовёт голое `ffmpeg`, а спрашивает путь здесь: сначала PATH,
 * потом типовые места установки. Найденное кешируется на процесс.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const exec = promisify(execFile);
const _cache = new Map();

// Флаг проверки версии отличается: ffmpeg/ffprobe понимают -version, yt-dlp — только --version.
const VERSION_FLAG = { 'yt-dlp': '--version', higgsfield: '--version' };
// Имя пакета, в поставке которого лежит инструмент (ffprobe приходит вместе с ffmpeg).
const PACKAGE_OF = { ffprobe: 'ffmpeg' };

/** Каталоги, где инструмент может лежать помимо PATH (по убыванию вероятности). */
function candidateDirs(tool) {
  const home = os.homedir();
  const dirs = [];
  // ffprobe ищем в пакете ffmpeg — они приходят одной поставкой.
  const pkgName = (PACKAGE_OF[tool] || tool).replace('-', '');

  if (process.platform === 'win32') {
    // winget распаковывает в версионированную подпапку — её имя меняется при апдейте,
    // поэтому раскрываем маской, а не хардкодим версию.
    const winget = path.join(home, 'AppData/Local/Microsoft/WinGet/Packages');
    for (const pkg of safeList(winget)) {
      if (!pkg.toLowerCase().includes(pkgName)) continue;
      const pkgDir = path.join(winget, pkg);
      for (const sub of safeList(pkgDir)) {
        dirs.push(path.join(pkgDir, sub, 'bin'), path.join(pkgDir, sub));
      }
      dirs.push(pkgDir);
    }
    dirs.push('C:/ProgramData/chocolatey/bin', path.join(home, 'scoop/shims'));
    // Глобальные пакеты npm. Сюда ставится higgsfield и вообще всё, что через npm i -g:
    // без этой строки проверка окружения говорила «программы нет», хотя она работала.
    dirs.push(path.join(home, 'AppData/Roaming/npm'));
  } else {
    dirs.push('/usr/local/bin', '/usr/bin', '/opt/homebrew/bin', path.join(home, '.local/bin'));
    dirs.push(path.join(home, '.npm-global/bin'), '/usr/local/lib/node_modules/.bin');
  }
  return dirs;
}

function safeList(dir) {
  try { return readdirSync(dir); } catch { return []; }
}

/**
 * Абсолютный путь к инструменту (или само имя, если он доступен через PATH).
 * @param {'ffmpeg'|'ffprobe'|'yt-dlp'|string} tool
 * @returns {Promise<string|null>} null — не найден нигде.
 */
export async function resolveBin(tool) {
  if (_cache.has(tool)) return _cache.get(tool);

  // 1. PATH — если работает, ничего не выдумываем.
  const flag = VERSION_FLAG[tool] || '-version';
  try {
    await exec(tool, [flag]);
    _cache.set(tool, tool);
    return tool;
  } catch { /* ищем дальше */ }

  // 2. Типовые места установки.
  // На Windows искали только .exe — а всё, что ставится через npm (higgsfield и ему
  // подобные), лежит как .cmd рядом с .ps1. Из-за этого проверка окружения говорила
  // «программы нет», когда она стояла и работала.
  const names = process.platform === 'win32'
    ? [`${tool}.exe`, `${tool}.cmd`, `${tool}.bat`, tool]
    : [tool];
  for (const dir of candidateDirs(tool)) {
    for (const name of names) {
      const full = path.join(dir, name);
      if (existsSync(full)) {
        _cache.set(tool, full);
        return full;
      }
    }
  }

  _cache.set(tool, null);
  return null;
}

/**
 * Запустить инструмент, разрешив путь. Бросает понятную ошибку, если не найден.
 * @param {string} tool
 * @param {string[]} args
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
export async function runBin(tool, args, opts = {}) {
  const bin = await resolveBin(tool);
  if (!bin) {
    throw new Error(
      `${tool} не найден ни в PATH, ни в типовых местах установки. ` +
      `Установить или починить PATH (частая причина на Windows — апдейт winget сменил версию в пути).`
    );
  }
  return exec(bin, args, { maxBuffer: 1024 * 1024 * 64, ...opts });
}
