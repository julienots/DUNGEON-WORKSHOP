import { RESEARCH_MAP } from '../data/research.js';
import { PRESTIGE_UPGRADES } from '../data/prestige.js';
import { ECONOMY } from '../config/economy.js';

export const MOD_KEYS = [
  'monsterHp', 'monsterAtk', 'monsterDef', 'monsterSpd', 'critChance',
  'trapDamage', 'trapCooldown', 'trapEffectChance', 'synergyPower',
  'goldGain', 'materialGain', 'essenceGain', 'darkGain', 'crystalGain', 'xpGain', 'dropChance',
  'offlineHours', 'raidRate', 'roomCapacity', 'rosterSize', 'levelCap', 'levelCost', 'evolveCost',
  'roomCost', 'floorCost', 'expandCost', 'globalCost', 'researchSpeed', 'researchSlots',
  'summonQuality', 'summonLuck', 'summonTier', 'treasuryCapacity', 'theftReduction', 'productionGain',
  'elementPower', 'skillCooldown', 'bossDamage', 'startingResources', 'floorSize', 'masterEssenceGain',
];

/**
 * Agrège tous les bonus (recherche, Ascension, trésorerie, événements, niveau du Maître)
 * en un seul objet de modificateurs. Mis en cache et invalidé via `invalidate()`.
 */
export class ModifierSystem {
  constructor(game) {
    this.game = game;
    this.cache = null;
  }

  invalidate() {
    this.cache = null;
    this.game.bus.emit('modsChanged');
  }

  get() {
    if (!this.cache) this.cache = this.compute();
    return this.cache;
  }

  compute() {
    const s = this.game.state;
    const m = {};
    for (const k of MOD_KEYS) m[k] = 0;
    m.elementBoost = {};
    const sources = [];

    // Recherche
    for (const [id, lvl] of Object.entries(s.research.levels)) {
      const r = RESEARCH_MAP[id];
      if (!r || !r.effects || !lvl) continue;
      for (const e of r.effects) m[e.mod] = (m[e.mod] || 0) + e.value * lvl;
    }
    // Ascension
    for (const u of PRESTIGE_UPGRADES) {
      const lvl = s.prestige.upgrades[u.id] || 0;
      if (!lvl) continue;
      for (const e of u.effects) m[e.mod] = (m[e.mod] || 0) + e.value * lvl;
    }
    // Trésorerie
    for (const ms of ECONOMY.treasury.milestones) {
      if (s.treasury.level >= ms.level) {
        for (const [k, v] of Object.entries(ms.mods)) m[k] = (m[k] || 0) + v;
      }
    }
    // Salles à bonus globaux (V2 : Salle du maître)
    if (this.game.dungeon) for (const [k, v] of Object.entries(this.game.dungeon.globalRoomMods())) m[k] = (m[k] || 0) + v;
    // Prestige 2.0 (Renaissance, Transcendance, Maître dimensionnel)
    if (this.game.tiers) for (const e of this.game.tiers.effects()) m[e.mod] = (m[e.mod] || 0) + e.value;
    // Maîtrise (V2)
    if (this.game.progression) for (const e of this.game.progression.effects()) m[e.mod] = (m[e.mod] || 0) + e.value;
    // Niveau du Maître
    m.goldGain += (s.player.level - 1) * ECONOMY.master.goldBonusPerLevel;

    // Événement en cours
    const ev = this.game.events ? this.game.events.activeModifiers() : [];
    for (const src of ev) {
      for (const [k, v] of Object.entries(src.mods || {})) m[k] = (m[k] || 0) + v;
      for (const [el, v] of Object.entries(src.elementBoost || {})) m.elementBoost[el] = (m.elementBoost[el] || 0) + v;
      sources.push(src.name);
    }

    // Plafonds de sécurité
    m.globalCost = Math.max(-0.45, m.globalCost);
    m.trapCooldown = Math.max(-0.5, m.trapCooldown);
    m.skillCooldown = Math.max(-0.4, m.skillCooldown);
    m.researchSpeed = Math.min(0.8, m.researchSpeed);
    m.theftReduction = Math.min(0.5, m.theftReduction);
    m.sources = sources;
    return m;
  }

  /** Multiplicateur de coût pour une catégorie (roomCost, floorCost, levelCost...). */
  costMult(kind) {
    const m = this.get();
    const specific = kind ? m[kind] || 0 : 0;
    return Math.max(0.2, (1 + m.globalCost) * (1 + specific));
  }
}
