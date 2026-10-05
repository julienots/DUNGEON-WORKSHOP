import { RESOURCE_KEYS } from '../utils/constants.js';
import { ECONOMY } from '../config/economy.js';

const EARN_STAT = {
  gold: 'goldEarned', stone: 'stoneEarned', metal: 'metalEarned', essence: 'essenceEarned',
  crystals: 'crystalsEarned', darkEssence: 'darkEssenceEarned',
  legendaryEssence: 'legendaryEssenceEarned', dimensionalFragments: 'dimensionalFragmentsEarned',
};

/** Gestion des ressources : vérification, dépense, gain, application des réductions de coûts. */
export class EconomySystem {
  constructor(game) {
    this.game = game;
  }

  get res() {
    return this.game.state.resources;
  }

  /** Applique les réductions (globales + catégorie) à un coût brut. */
  applyCostMods(cost, kind) {
    const mult = this.game.mods.costMult(kind);
    const out = {};
    for (const [k, v] of Object.entries(cost)) {
      if (!v) continue;
      // Les cristaux ne sont jamais réduits (monnaie précieuse, prix fixes).
      out[k] = k === 'crystals' ? Math.ceil(v) : Math.max(1, Math.ceil(v * mult));
    }
    return out;
  }

  canAfford(cost) {
    for (const [k, v] of Object.entries(cost)) {
      if ((this.res[k] || 0) < v) return false;
    }
    return true;
  }

  missing(cost) {
    const out = {};
    for (const [k, v] of Object.entries(cost)) {
      const have = this.res[k] || 0;
      if (have < v) out[k] = v - have;
    }
    return out;
  }

  spend(cost) {
    if (!this.canAfford(cost)) return false;
    for (const [k, v] of Object.entries(cost)) this.res[k] -= v;
    this.game.bus.emit('resources');
    return true;
  }

  /** Ajoute des ressources (déjà multipliées). `track` : compte dans les statistiques de gains. */
  add(amounts, track = true) {
    let changed = false;
    for (const [k, v] of Object.entries(amounts)) {
      if (!RESOURCE_KEYS.includes(k) || !v) continue;
      const val = Math.floor(v);
      if (val <= 0) continue;
      this.res[k] = (this.res[k] || 0) + val;
      changed = true;
      if (track && EARN_STAT[k]) {
        this.game.stats.add(EARN_STAT[k], val);
        if (k === 'gold') {
          this.game.state.lifetime.goldEarned += val;
          this.game.state.prestige.runGold += val;
        }
      }
    }
    if (changed) this.game.bus.emit('resources');
  }

  /** Applique les multiplicateurs de gain globaux (recherche, prestige, événements). */
  applyGainMods(amounts, extraGold = 0) {
    const m = this.game.mods.get();
    const out = {};
    for (const [k, v] of Object.entries(amounts)) {
      if (!v) continue;
      let mult = 1;
      if (k === 'gold') mult += m.goldGain + extraGold;
      else if (k === 'stone' || k === 'metal') mult += m.materialGain;
      else if (k === 'essence') mult += m.essenceGain;
      else if (k === 'darkEssence') mult += m.darkGain;
      else if (k === 'crystals') mult += m.crystalGain;
      out[k] = v * mult;
    }
    return out;
  }

  resourceName(key) {
    return ECONOMY.resources[key]?.name || key;
  }
}
