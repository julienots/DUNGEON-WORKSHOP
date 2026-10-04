import { SAVE_KEY, SAVE_BACKUP_KEY, SAVE_VERSION, EXPORT_PREFIX } from '../utils/constants.js';
import { createNewState } from '../core/GameState.js';
import { deepDefaults } from '../utils/helpers.js';

/** Stockage en mémoire (tests Node ou navigateur sans localStorage). */
class MemoryStorage {
  constructor() {
    this.data = {};
  }
  getItem(k) {
    return k in this.data ? this.data[k] : null;
  }
  setItem(k, v) {
    this.data[k] = String(v);
  }
  removeItem(k) {
    delete this.data[k];
  }
}

function getDefaultStorage() {
  try {
    if (typeof localStorage !== 'undefined') {
      const k = '__dw_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      return localStorage;
    }
  } catch {
    /* stockage indisponible (navigation privée) */
  }
  return new MemoryStorage();
}

function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function b64ToUtf8(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function checksum(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * SaveSystem / LoadSystem / ExportSave / ImportSave / ResetSave
 * Sauvegarde locale (localStorage) avec copie de secours et validation.
 */
export class SaveSystem {
  constructor(game, storage = getDefaultStorage()) {
    this.game = game;
    this.storage = storage;
    this.saveCount = 0;
    this.lastError = null;
  }

  serialize(state) {
    return JSON.stringify(state);
  }

  save(state = this.game.state, now = Date.now()) {
    try {
      state.lastSaveTimestamp = now;
      const json = this.serialize(state);
      const payload = JSON.stringify({ v: SAVE_VERSION, c: checksum(json), d: json });
      this.storage.setItem(SAVE_KEY, payload);
      this.saveCount++;
      if (this.saveCount % 10 === 1) this.storage.setItem(SAVE_BACKUP_KEY, payload);
      this.lastError = null;
      return true;
    } catch (err) {
      this.lastError = err;
      console.error('[SaveSystem] échec de sauvegarde', err);
      return false;
    }
  }

  parsePayload(raw) {
    if (!raw) return null;
    const wrapper = JSON.parse(raw);
    if (!wrapper || typeof wrapper.d !== 'string') throw new Error('Format invalide');
    if (checksum(wrapper.d) !== wrapper.c) throw new Error('Sauvegarde corrompue (somme de contrôle)');
    return this.validate(JSON.parse(wrapper.d));
  }

  /** Charge la sauvegarde (ou la copie de secours). Retourne null si aucune. */
  load() {
    for (const key of [SAVE_KEY, SAVE_BACKUP_KEY]) {
      try {
        const raw = this.storage.getItem(key);
        if (!raw) continue;
        const state = this.parsePayload(raw);
        if (state) return state;
      } catch (err) {
        console.warn(`[SaveSystem] impossible de lire ${key}`, err);
      }
    }
    return null;
  }

  hasSave() {
    return !!this.storage.getItem(SAVE_KEY);
  }

  /** Valide et migre un état chargé. */
  validate(state) {
    if (!state || typeof state !== 'object') throw new Error('État vide');
    if (!state.resources || !Array.isArray(state.floors) || !state.floors.length || !Array.isArray(state.monsters)) {
      throw new Error('État incomplet');
    }
    this.migrate(state);
    deepDefaults(state, createNewState(state.createdAt || Date.now()));
    // Champs dont les valeurs par défaut ne doivent pas être "fusionnées"
    if (!Array.isArray(state.research.active)) state.research.active = state.research.active ? [state.research.active] : [];
    if (!Array.isArray(state.equipment)) state.equipment = [];
    if (!Array.isArray(state.log)) state.log = [];
    if (state.currentFloor >= state.floors.length) state.currentFloor = 0;
    for (const k of Object.keys(state.resources)) {
      if (!Number.isFinite(state.resources[k]) || state.resources[k] < 0) state.resources[k] = 0;
    }
    return state;
  }

  migrate(state) {
    const v = state.version || 0;
    // Exemple de migration future : if (v < 2) { ... }
    state.version = Math.max(v, SAVE_VERSION);
    return state;
  }

  exportString(state = this.game.state) {
    const json = this.serialize(state);
    return EXPORT_PREFIX + utf8ToB64(JSON.stringify({ c: checksum(json), d: json }));
  }

  /** Retourne un état validé à partir d'une chaîne exportée (lève une erreur si invalide). */
  importString(str) {
    const clean = (str || '').trim();
    if (!clean.startsWith(EXPORT_PREFIX)) throw new Error('Code de sauvegarde invalide');
    const wrapper = JSON.parse(b64ToUtf8(clean.slice(EXPORT_PREFIX.length)));
    if (checksum(wrapper.d) !== wrapper.c) throw new Error('Code de sauvegarde corrompu');
    return this.validate(JSON.parse(wrapper.d));
  }

  reset() {
    this.storage.removeItem(SAVE_KEY);
    this.storage.removeItem(SAVE_BACKUP_KEY);
  }
}
