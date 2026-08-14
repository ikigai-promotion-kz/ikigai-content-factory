/**
 * hf-cli.mjs — тонкий клиент командной строки Higgsfield.
 *
 * Почему CLI, а не MCP-коннектор: Higgsfield сам рекомендует CLI для Claude Code, и
 * только он работает в скрипте — коннектор живёт в чате. Через него доступен НАСТОЯЩИЙ
 * `gpt_image_2` (проверено 14.08.2026: `model list --image` содержит его, `generate cost`
 * отвечает 7 credits), тогда как fal-путь на нём до сих пор фолбэчится на Gemini Pro.
 *
 * Локальные файлы CLI заливает сам: `--image ./board.png` принимает путь. Отдельного
 * шага загрузки нет — поэтому и media_id здесь не появляется.
 *
 * Здесь НЕТ ни одной проверки качества и ни одного решения о трате: клиент только
 * выполняет. Гейты живут в раннере, чтобы «выполнить» и «решить» не смешивались.
 */

import { writeFile } from 'node:fs/promises';
import { runBin } from './bin.mjs';

/**
 * Баланс кредитов числом. Нужен, чтобы сверять смету с ФАКТОМ списания, а не
 * с оценкой: цена монтажа считается по фактической длине клипа, а не по заказанной.
 * @returns {Promise<number|null>} null — если CLI не установлен или не залогинен
 */
export async function hfBalance() {
  try {
    const r = await runBin('higgsfield', ['account', 'status']);
    const m = r.stdout.match(/([\d.]+)\s*credits/i);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

/** Установлен ли CLI и есть ли сессия. */
export async function hfReady() {
  return (await hfBalance()) !== null;
}

/**
 * Оценка стоимости до траты. Модель считает по своим параметрам, поэтому передаём
 * ровно то же, что уйдёт в create.
 * @returns {Promise<number|null>} кредиты или null, если оценка недоступна
 */
export async function hfCost(model, params = {}) {
  try {
    const r = await runBin('higgsfield', ['generate', 'cost', model, ...flatten(params)]);
    const m = r.stdout.match(/([\d.]+)\s*credits?/i);
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Создать задание и дождаться результата.
 *
 * @param {Object} o
 * @param {string} o.model - job_type CLI (gpt_image_2, gemini_omni, …)
 * @param {Object} o.params - параметры модели: {prompt, aspect_ratio, resolution, …}
 * @param {Object} [o.medias] - {image: [пути], video: [пути]} — CLI зальёт сам
 * @param {string} [o.waitTimeout='20m']
 * @returns {Promise<{urls: string[], stdout: string}>}
 */
export async function hfGenerate({ model, params = {}, medias = {}, waitTimeout = '20m' }) {
  const argv = ['generate', 'create', model, ...flatten(params)];
  for (const p of medias.image || []) argv.push('--image', p);
  for (const p of medias.video || []) argv.push('--video', p);
  argv.push('--wait', '--wait-timeout', waitTimeout);

  const r = await runBin('higgsfield', argv);
  const urls = extractUrls(r.stdout);
  if (!urls.length) {
    throw new Error(`CLI не вернул ссылку на результат. Вывод целиком:\n${r.stdout}\n${r.stderr || ''}`);
  }
  return { urls, stdout: r.stdout };
}

/** Скачать результат по ссылке в файл. */
export async function hfDownload(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`скачивание ${url}: HTTP ${res.status}`);
  await writeFile(outPath, Buffer.from(await res.arrayBuffer()));
  return outPath;
}

/**
 * Ссылки на результат из вывода CLI.
 *
 * Разбираем и JSON, и текст: формат вывода принадлежит чужому инструменту и может
 * поменяться с его версией, а падать из-за этого посреди оплаченного прогона нельзя.
 * Служебные ссылки на документацию отсекаем по расширению файла.
 */
function extractUrls(stdout) {
  const out = new Set();
  try {
    const j = JSON.parse(stdout);
    collectUrls(j, out);
  } catch {
    // не JSON — идём по тексту
  }
  for (const m of stdout.matchAll(/https?:\/\/\S+/g)) {
    const url = m[0].replace(/[),.]+$/, '');
    if (/\.(png|jpe?g|webp|mp4|mov|mp3|wav|glb)(\?|$)/i.test(url)) out.add(url);
  }
  return [...out];
}

function collectUrls(node, acc) {
  if (!node) return;
  if (typeof node === 'string') {
    if (/^https?:\/\//.test(node) && /\.(png|jpe?g|webp|mp4|mov|mp3|wav|glb)(\?|$)/i.test(node)) acc.add(node);
    return;
  }
  if (Array.isArray(node)) return node.forEach((n) => collectUrls(n, acc));
  if (typeof node === 'object') return Object.values(node).forEach((n) => collectUrls(n, acc));
}

/** {prompt: 'x', aspect_ratio: '9:16'} → ['--prompt', 'x', '--aspect_ratio', '9:16'] */
function flatten(params) {
  return Object.entries(params).flatMap(([k, v]) => (v == null ? [] : [`--${k}`, String(v)]));
}
