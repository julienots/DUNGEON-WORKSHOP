import { SAVE_KEY, SAVE_BACKUP_KEY, SAVE_VERSION, SAVE_V1_BACKUP_KEY, SAVE_CORRUPT_PREFIX, EXPORT_PREFIX } from '../utils/constants.js';
import { createNewState } from '../core/GameState.js';
import { migrate as runMigrations, checkIntegrity } from '../core/migrations.js';
import { deepDefaults } from '../utils/helpers.js';

/** Stockage en mémoire (tests Node ou navigateur sans localStorage). */
export class MemoryStorage {
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
    /** Infos du dernier chargement : { migratedFrom, fixes, preservedKey, error } (affichées à l'écran). */
    this.loadInfo = null;
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

  /** Décode l'enveloppe { v, c, d } et retourne l'état brut (non migré). */
  decodePayload(raw) {
    const wrapper = JSON.parse(raw);
    if (!wrapper || typeof wrapper.d !== 'string') throw new Error('Format invalide');
    if (checksum(wrapper.d) !== wrapper.c) throw new Error('Sauvegarde corrompue (somme de contrôle)');
    return JSON.parse(wrapper.d);
  }

  parsePayload(raw) {
    if (!raw) return null;
    return this.validate(this.decodePayload(raw));
  }

  /**
   * Charge la sauvegarde (ou la copie de secours). Retourne null si aucune.
   * Sauvegarde ancienne : 1) copie intacte conservée, 2) migration, 3) valeurs par défaut,
   * 4) vérification d'intégrité, 5) chargement. Une sauvegarde illisible est copiée à part
   * avant toute création de nouvelle partie : elle n'est jamais écrasée.
   */
  load() {
    this.loadInfo = { migratedFrom: null, fixes: [], preservedKey: null, error: null };
    let firstRaw = null;
    for (const key of [SAVE_KEY, SAVE_BACKUP_KEY]) {
      let raw = null;
      try {
        raw = this.storage.getItem(key);
        if (!raw) continue;
        if (firstRaw === null) firstRaw = raw;
        const data = this.decodePayload(raw);
        const from = Number.isFinite(data?.version) ? data.version : 1;
        if (from < SAVE_VERSION) this.preserveOldVersion(raw, from);
        const state = this.validate(data);
        if (state) {
          if (from < SAVE_VERSION) this.loadInfo.migratedFrom = from;
          if (key !== SAVE_KEY) this.loadInfo.fromBackup = true;
          return state;
        }
      } catch (err) {
        console.warn(`[SaveSystem] impossible de lire ${key}`, err);
        this.loadInfo.error = err.message;
        // La sauvegarde principale illisible serait écrasée à la prochaine sauvegarde : on la met à l'abri.
        if (key === SAVE_KEY && raw) this.loadInfo.preservedKey = this.preserveCorrupt(raw);
      }
    }
    if (firstRaw !== null && !this.loadInfo.preservedKey) this.loadInfo.preservedKey = this.preserveCorrupt(firstRaw);
    return null;
  }

  /** Conserve une copie intacte d'une sauvegarde d'ancienne version (une seule fois). */
  preserveOldVersion(raw, version) {
    const key = version === 1 ? SAVE_V1_BACKUP_KEY : `${SAVE_KEY}_v${version}_backup`;
    try {
      if (!this.storage.getItem(key)) this.storage.setItem(key, raw);
    } catch (err) {
      console.warn('[SaveSystem] copie de la sauvegarde ancienne impossible', err);
    }
  }

  /** Copie une sauvegarde illisible sous une clé dédiée avant qu'une nouvelle partie ne la remplace. */
  preserveCorrupt(raw, now = Date.now()) {
    const key = SAVE_CORRUPT_PREFIX + now;
    try {
      this.storage.setItem(key, raw);
      return key;
    } catch (err) {
      console.error('[SaveSystem] impossible de conserver la sauvegarde illisible', err);
      return null;
    }
  }

  /** Copie V1 conservée (chaîne brute) ou null. */
  v1Backup() {
    return this.storage.getItem(SAVE_V1_BACKUP_KEY);
  }

  /** Code d'export de la copie V1 d'origine (importable : il sera re-migré), ou null. */
  exportV1Backup() {
    const raw = this.v1Backup();
    if (!raw) return null;
    try {
      return this.exportString(this.decodePayload(raw));
    } catch {
      return null;
    }
  }

  hasSave() {
    return !!this.storage.getItem(SAVE_KEY);
  }

  /** Valide, migre, complète et répare un état chargé. */
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
    const fixes = checkIntegrity(state);
    if (fixes.length) {
      console.warn('[SaveSystem] corrections d’intégrité', fixes);
      if (this.loadInfo) this.loadInfo.fixes = fixes;
    }
    return state;
  }

  /** Applique les migrations de version (voir core/migrations.js). Retourne la version d'origine. */
  migrate(state) {
    return runMigrations(state);
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
    const data = JSON.parse(wrapper.d);
    return this.validate(data);
  }

  reset() {
    this.storage.removeItem(SAVE_KEY);
    this.storage.removeItem(SAVE_BACKUP_KEY);
  }
}
