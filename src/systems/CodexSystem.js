import { MONSTERS } from '../data/monsters.js';
import { BOSSES } from '../data/bosses.js';
import { ROOM_LIST } from '../data/rooms.js';
import { TRAP_LIST } from '../data/traps.js';
import { EQUIPMENT_BASES, UNIQUE_ARTIFACTS } from '../data/equipment.js';
import { ADVENTURER_LIST } from '../data/adventurers.js';

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
    for (const cat of ['monsters', 'bosses', 'rooms', 'traps', 'equipment', 'adventurers']) {
      const c = this.count(cat);
      found += c.found;
      total += c.total;
    }
    return { found, total };
  }
}
