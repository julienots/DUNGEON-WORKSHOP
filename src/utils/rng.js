/**
 * Générateur pseudo-aléatoire déterministe (mulberry32).
 * Utilisé par le combat et les raids pour que la simulation hors-ligne
 * et la simulation visible produisent exactement le même résultat.
 */
export class RNG {
  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
    this.state = this.seed || 0x9e3779b9;
  }

  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Flottant dans [min, max) */
  range(min, max) {
    return min + (max - min) * this.next();
  }

  /** Entier dans [min, max] */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  chance(p) {
    return this.next() < p;
  }

  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** items: [{ weight, ... }] ou [[value, weight]] */
  weighted(items, weightKey = 'weight') {
    let total = 0;
    for (const it of items) total += Array.isArray(it) ? it[1] : it[weightKey];
    let r = this.next() * total;
    for (const it of items) {
      r -= Array.isArray(it) ? it[1] : it[weightKey];
      if (r <= 0) return Array.isArray(it) ? it[0] : it;
    }
    const last = items[items.length - 1];
    return Array.isArray(last) ? last[0] : last;
  }

  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

/** Hash de chaîne -> entier 32 bits (pour des graines stables, ex: date du jour). */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
