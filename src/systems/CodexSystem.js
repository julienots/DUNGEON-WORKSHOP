import { MONSTERS } from '../data/monsters.js';
import { BOSSES } from '../data/bosses.js';
import { ROOM_LIST } from '../data/rooms.js';
import { TRAP_LIST } from '../data/traps.js';
import { EQUIPMENT_BASES, UNIQUE_ARTIFACTS } from '../data/equipment.js';
import { ADVENTURER_LIST } from '../data/adventurers.js';
import { MUTATIONS } from '../data/mutations.js';
import { BIOMES } from '../data/biomes.js';
import { LORE } from '../data/lore.js';
import { TRAITS } from '../data/traits.js';

/** Catégories du Codex 2.0 (les « traits » et « héros » restent consultables en plus). */
export const CODEX_CATEGORIES = ['monsters', 'rooms', 'traps', 'bosses', 'equipment', 'mutations', 'biomes', 'lore', 'adventurers', 'traits'];

/** Codex : enregistre chaque découverte. */
export class CodexSystem {
  constructor(game) {
    this.game = game;
  }

  get c() {
    return this.game.state.codex;
  }

  discover(cat, id) {
    if (!this.c[cat]) this.c[cat] = {};
    if (this.c[cat][id]) return false;
    this.c[cat][id] = true;
    this.game.bus.emit('codexDiscovered', cat, id);
    if (cat === 'monsters') this.game.stats.emitChange('speciesDiscovered');
    return true;
  }

  /** Enregistre (sans notification) ce que le joueur possède déjà : biomes des étages, traits des monstres. */
  syncOwned() {
    const s = this.game.state;
    for (const cat of ['biomes', 'traits', 'mutations']) if (!this.c[cat]) this.c[cat] = {};
    for (const f of s.floors) if (f.biome) this.c.biomes[f.biome] = true;
    for (const m of s.monsters) {
      for (const t of m.traits || []) this.c.traits[t] = true;
      for (const mu of m.mutations || []) this.c.mutations[mu.id || mu] = true;
    }
  }

  // ------------------------------------------------------------------ lore (V2)
  /** Débloque les pages de lore dont la condition est remplie. Retourne les nouvelles pages. */
  checkLore(silent = false) {
    const g = this.game;
    const s = g.state;
    if (!this.c.lore) this.c.lore = {};
    const best = Math.max(s.stats.maxFloor || 1, s.prestige.bestFloor || 1, s.floors.length);
    const found = [];
    for (const l of LORE) {
      if (this.c.lore[l.id]) continue;
      const u = l.unlock;
      let ok = false;
      if (u.floor) ok = best >= u.floor;
      else if (u.boss) ok = !!this.c.bosses?.[u.boss];
      else if (u.biome) ok = !!this.c.biomes?.[u.biome];
      else if (u.ascensions) ok = (s.prestige.count || 0) >= u.ascensions;
      else if (u.mode) ok = (s.modes?.records?.[u.mode]?.runs || 0) > 0;
      else if (u.monsters) ok = this.count('monsters').found >= u.monsters;
      else if (u.mutation) ok = Object.keys(this.c.mutations || {}).length > 0;
      else if (u.master) ok = s.player.level >= u.master;
      if (ok) {
        this.c.lore[l.id] = true;
        found.push(l);
      }
    }
    if (!silent) for (const l of found) g.bus.emit('loreDiscovered', l);
    if (found.length) g.bus.emit('codexDiscovered', 'lore');
    return found;
  }

  has(cat, id) {
    return !!this.c[cat]?.[id];
  }

  entries(cat) {
    switch (cat) {
      case 'monsters':
        return MONSTERS;
      case 'bosses':
        return Object.values(BOSSES);
      case 'rooms':
        return ROOM_LIST;
      case 'traps':
        return TRAP_LIST;
      case 'equipment':
        return [...EQUIPMENT_BASES, ...Object.values(UNIQUE_ARTIFACTS)];
      case 'adventurers':
        return ADVENTURER_LIST;
      case 'mutations':
        return Object.entries(MUTATIONS).map(([id, m]) => ({ id, ...m }));
      case 'biomes':
        return Object.entries(BIOMES).map(([id, b]) => ({ id, ...b }));
      case 'lore':
        return LORE.map((l) => ({ ...l, name: l.title }));
      case 'traits':
        return Object.entries(TRAITS).map(([id, t]) => ({ id, ...t }));
      default:
        return [];
    }
  }

  count(cat) {
    const list = this.entries(cat);
    return { found: list.filter((e) => this.has(cat, e.id)).length, total: list.length };
  }

  totalCount() {
    let found = 0;
    let total = 0;
    for (const cat of CODEX_CATEGORIES) {
      const c = this.count(cat);
      found += c.found;
      total += c.total;
    }
    return { found, total };
  }
}
