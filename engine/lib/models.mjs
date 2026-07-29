/**
 * models-config.js — единая точка чтения config/models.json.
 *
 * До 28.07.2026 модели жили в двух местах: дефолт в lib/genimage.js и роутер
 * ENGINE_MODEL в renderers/generative.js. Следствие (записано в BACKLOG как
 * известная дыра): интент-слуги recraft/seedream/flux молча фолбэчились на PRO,
 * хотя рабочие slug'и лежали в knowledge/fal-models-catalog.md.
 *
 * Приоритет: env-переменная из поля `env` > значение в конфиге.
 * Конфиг читается один раз и кешируется — он не меняется в рантайме.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG_PATH = process.env.MODELS_CONFIG || path.join(ROOT, 'config/models.json');

let _config;

function load() {
  if (_config) return _config;
  _config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  return _config;
}

/**
 * Модель под интент генерации изображения.
 * @param {string} intent - ключ из config.image (nano-banana, gpt-image, recraft, …)
 * @returns {{model: string, edit: string|null, intent: string}}
 */
export function imageModel(intent) {
  const cfg = load().image;
  const entry = cfg[intent] || cfg[cfg._default];
  return resolve(entry);
}

/** Премиум-модель (render='generate-pro'). */
export function proImageModel() {
  const cfg = load().image;
  return resolve(cfg[cfg._pro]);
}

/**
 * Модель под интент генерации видео.
 * @param {string} intent - ключ из config.video (seedance, wan, kling-edit)
 * @returns {{model: string, backend: string, duration: number[], refs: Object|null}}
 */
export function videoModel(intent) {
  const cfg = load().video;
  const entry = cfg[intent] || cfg[cfg._default];
  return {
    model: entry.model,
    backend: entry.backend,
    duration: entry.duration || null,
    refs: entry.refs || null,
    intent: entry.intent || '',
  };
}

/** Все интенты изображений — для валидации спеки арт-директора. */
export function listImageIntents() {
  return Object.keys(load().image).filter((k) => !k.startsWith('_'));
}

/** Все интенты видео. */
export function listVideoIntents() {
  return Object.keys(load().video).filter((k) => !k.startsWith('_'));
}

function resolve(entry) {
  if (!entry) throw new Error('models-config: интент не найден и нет дефолта');
  const model = (entry.env && process.env[entry.env]) || entry.model;
  // edit-модель переопределяется своей парой env — например GEN_EDIT_MODEL_PRO.
  const editEnv = entry.env ? `${entry.env.replace('GEN_MODEL', 'GEN_EDIT_MODEL')}` : null;
  const edit = (editEnv && process.env[editEnv]) || entry.edit || null;
  return { model, edit, intent: entry.intent || '' };
}
