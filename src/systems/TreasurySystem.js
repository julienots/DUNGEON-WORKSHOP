import { ECONOMY } from '../config/economy.js';
import { scaleCost } from '../utils/helpers.js';
import { floorEconomyScale } from '../data/floors.js';

const T = ECONOMY.treasury;

/** Trésorerie : coffre qui accumule de l'or passif, à récolter. Améliorable. */
export class TreasurySystem {
  constructor(game) {
    this.game = game;
    this.prodAccum = {};
  }

  get t() {
    return this.game.state.treasury;
  }

  capacity(level = this.t.level) {
    return Math.round(T.baseCapacity * Math.pow(T.capacityGrowth, level - 1) * (1 + (this.game.mods.get().treasuryCapacity || 0)));
  }

  incomePerMin(level = this.t.level) {
    const m = this.game.mods.get();
    const floors = this.game.state.floors.length;
    return T.baseIncomePerMin * Math.pow(T.incomeGrowth, level - 1) * Math.pow(floorEconomyScale(floors), 0.6) * (1 + m.goldGain);
  }

  upgradeCost() {
    return this.game.economy.applyCostMods(scaleCost(T.upgradeCost, Math.pow(T.upgradeGrowth, this.t.level - 1)));
  }

  canUpgrade() {
    if (this.t.level >= T.maxLevel) return { ok: false, reason: 'Niveau maximum' };
    const cost = this.upgradeCost();
    if (!this.game.economy.canAfford(cost)) return { ok: false, reason: 'Ressources insuffisantes', cost };
    return { ok: true, cost };
  }

  upgrade() {
    const c = this.canUpgrade();
    if (!c.ok) return c;
    this.game.economy.spend(c.cost);
    this.t.level++;
    this.game.stats.add('treasuryUpgrades', 1);
    this.game.stats.add('upgrades', 1);
    this.game.mods.invalidate();
    this.game.bus.emit('treasuryChanged');
    this.game.bus.emit('sfx', 'upgrade');
    this.game.requestSave();
    return { ok: true };
  }

  collect() {
    const amount = Math.floor(this.t.vault);
    if (amount <= 0) return { ok: false, reason: 'Le coffre est vide' };
    this.t.vault -= amount;
    this.game.economy.add({ gold: amount });
    this.game.stats.add('treasuryCollects', 1);
    this.game.bus.emit('treasuryChanged');
    this.game.bus.emit('sfx', 'coins');
    this.game.requestSave();
    return { ok: true, amount };
  }

  nextMilestone() {
    return T.milestones.find((m) => m.level > this.t.level) || null;
  }

  /** Accumulation passive (coffre + production des salles). dt en secondes. */
  update(dt) {
    const cap = this.capacity();
    if (this.t.vault < cap) {
      this.t.vault = Math.min(cap, this.t.vault + (this.incomePerMin() / 60) * dt);
    }
    const prod = this.game.dungeon.productionPerMin();
    const gains = this.game.economy.applyGainMods(prod);
    const out = {};
    for (const [k, v] of Object.entries(gains)) {
      this.prodAccum[k] = (this.prodAccum[k] || 0) + (v / 60) * dt;
      if (this.prodAccum[k] >= 1) {
        out[k] = Math.floor(this.prodAccum[k]);
        this.prodAccum[k] -= out[k];
      }
    }
    if (Object.keys(out).length) this.game.economy.add(out);
  }

  /** Simulation hors ligne : retourne { vault, production } gagnés. */
  simulateOffline(seconds) {
    const cap = this.capacity();
    const before = this.t.vault;
    this.t.vault = Math.min(cap, this.t.vault + (this.incomePerMin() / 60) * seconds);
    const prod = this.game.economy.applyGainMods(this.game.dungeon.productionPerMin());
    const production = {};
    for (const [k, v] of Object.entries(prod)) production[k] = Math.floor((v / 60) * seconds * ECONOMY.offline.efficiency);
    return { vault: Math.floor(this.t.vault - before), production };
  }
}
