import { BIOMES, BIOME_IDS, CORRUPTED_ANOMALIES, biomeChangeCost, defaultBiomeForFloor } from '../data/biomes.js';
import { RNG } from '../utils/rng.js';

/** Bonus d'affinité : monstres de l'élément du biome. */
export const BIOME_AFFINITY = 0.1;
/** Bonus de dégâts de l'élément du biome (des deux côtés). */
export const BIOME_ELEMENT_DAMAGE = 0.2;

/**
 * BIOMES (V2) : règles propres à chaque étage (combat, production, butin, ambiance).
 * Les effets sont calculés à la demande à partir des données (data/biomes.js).
 */
export class BiomeSystem {
  constructor(game) {
    this.game = game;
  }

  id(fi) {
    const f = this.game.state.floors[fi];
    return f?.biome && BIOMES[f.biome] ? f.biome : defaultBiomeForFloor(fi + 1);
  }

  get(fi) {
    return BIOMES[this.id(fi)];
  }

  /** Règles du biome pour un raid. La Dimension corrompue tire une anomalie (graine du raid). */
  rules(fi, seed = 0) {
    const b = this.get(fi);
    if (!b.rules.random) return { ...b.rules, anomaly: null };
    const an = new RNG((seed ^ 0x9e3779b9) >>> 0).pick(CORRUPTED_ANOMALIES);
    return { ...b.rules, ...an.rules, anomaly: an };
  }

  /** Mods de camp pour le combat ({ A, B }). */
  sideMods(fi, rules = this.rules(fi)) {
    const b = this.get(fi);
    const out = { A: {}, B: {} };
    for (const side of ['A', 'B']) {
      out[side].elementDamage = { [b.element]: BIOME_ELEMENT_DAMAGE };
      if (rules.healMult !== undefined) out[side].healMult = rules.healMult;
      if (rules.spdMult) out[side].spdMult = rules.spdMult[side];
      if (rules.skillCooldown) out[side].skillCooldown = rules.skillCooldown;
    }
    return out;
  }

  /** Bonus d'un monstre sur l'étage : affinité élémentaire + mods du biome. */
  monsterBonus(fi, element) {
    const b = this.get(fi);
    return {
      affinity: element === b.element ? BIOME_AFFINITY : 0,
      mods: b.rules.monsterMods?.[element] || null,
    };
  }

  trapPower(fi, element) {
    const tb = this.get(fi).rules.trapBoost;
    return tb && tb.element === element ? tb.power : 0;
  }

  productionMult(fi, res) {
    return this.get(fi).production?.[res] || 1;
  }

  rewardMult(fi, res) {
    return this.get(fi).rewards?.[res] || 1;
  }

  // ------------------------------------------------------------------ changement de biome
  unlocked() {
    const best = this.game.runs ? this.game.runs.bestFloor() : this.game.state.floors.length;
    return BIOME_IDS.filter((id) => BIOMES[id].unlockFloor <= best);
  }

  canChange(fi, biomeId) {
    const f = this.game.state.floors[fi];
    if (!f) return { ok: false, reason: 'Étage inconnu' };
    if (!BIOMES[biomeId]) return { ok: false, reason: 'Biome inconnu' };
    if (f.biome === biomeId) return { ok: false, reason: 'Biome déjà actif' };
    if (!this.unlocked().includes(biomeId)) return { ok: false, reason: `Atteignez l’étage ${BIOMES[biomeId].unlockFloor}` };
    const cost = biomeChangeCost(fi + 1);
    if (!cost.dimensionalFragments) delete cost.dimensionalFragments;
    if (!this.game.economy.canAfford(cost)) return { ok: false, reason: 'Ressources insuffisantes', cost };
    return { ok: true, cost };
  }

  change(fi, biomeId) {
    const check = this.canChange(fi, biomeId);
    if (!check.ok) return check;
    this.game.economy.spend(check.cost);
    this.game.state.floors[fi].biome = biomeId;
    this.game.codex.discover('biomes', biomeId);
    this.game.raids.flush?.(fi);
    this.game.bus.emit('biomeChanged', fi);
    this.game.bus.emit('dungeonChanged', fi);
    this.game.requestSave(true);
    return { ok: true };
  }
}
