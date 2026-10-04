export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
export const lerp = (a, b, t) => a + (b - a) * t;

export function deepClone(obj) {
  return obj === undefined ? undefined : JSON.parse(JSON.stringify(obj));
}

/** Fusion profonde : complète `target` avec les clés manquantes de `defaults`. */
export function deepDefaults(target, defaults) {
  if (target === null || typeof target !== 'object' || Array.isArray(target)) return target;
  for (const key of Object.keys(defaults)) {
    const dv = defaults[key];
    if (!(key in target) || target[key] === undefined) {
      target[key] = deepClone(dv);
    } else if (dv && typeof dv === 'object' && !Array.isArray(dv) && target[key] && typeof target[key] === 'object') {
      deepDefaults(target[key], dv);
    }
  }
  return target;
}

export const cellKey = (x, y) => `${x},${y}`;
export function parseCellKey(key) {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export const DIRS4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Clé de jour local "YYYY-MM-DD" (basée sur l'heure du téléphone). */
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Numéro de semaine ISO (lundi = début de semaine). */
export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function weekKey(date = new Date()) {
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Timestamp du prochain minuit local. */
export function nextMidnight(now = Date.now()) {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

/** Timestamp du prochain lundi 00:00 local. */
export function nextMonday(now = Date.now()) {
  const d = new Date(now);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + (8 - day));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Additionne des coûts {gold: x, stone: y}. */
export function addCosts(a, b) {
  const out = { ...a };
  for (const k of Object.keys(b)) out[k] = (out[k] || 0) + b[k];
  return out;
}

export function scaleCost(cost, mult) {
  const out = {};
  for (const k of Object.keys(cost)) out[k] = Math.max(0, Math.round(cost[k] * mult));
  return out;
}

export function sumBy(arr, fn) {
  let s = 0;
  for (const x of arr) s += fn(x);
  return s;
}

export function groupBy(arr, fn) {
  const out = {};
  for (const x of arr) (out[fn(x)] ||= []).push(x);
  return out;
}
