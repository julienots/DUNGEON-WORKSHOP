import { MONSTERS } from '../data/monsters.js';
import { ECONOMY } from '../config/economy.js';
import { RARITIES } from '../utils/constants.js';
import { scaleCost } from '../utils/helpers.js';
import { RNG } from '../utils/rng.js';

const S = ECONOMY.shop;

/** Boutique (100% hors ligne) : portails d'invocation, coffres et échanges. */
export class ShopSystem {
  constructor(game) {
    this.game = game;
    this.rng = new RNG(Date.now());
  }

  get shop() {
    return this.game.state.shop;
  }

  floorScale() {
    return Math.pow(1.8, this.game.state.floors.length - 1);
  }

  // ------------------------------------------------------------------ invocations
  isPortalUnlocked(type) {
    if (type === 'dark') return (this.game.state.research.levels.magic_dimensional || 0) > 0;
    return true;
  }

  summonCost(type) {
    const def = S.summons[type];
    if (type === 'basic') {
      const steps = Math.min(def.maxGrowthSteps, this.shop.basicSummons || 0);
      return this.game.economy.applyCostMods(scaleCost(def.cost, Math.pow(def.costGrowth, steps)));
    }
    return { ...def.cost };
  }

  rarityWeights(pool) {
    const m = this.game.mods.get();
    const luck = 1 + (m.summonLuck || 0);
    const tier = m.summonTier || 0;
    const q = m.summonQuality || 0;
    let w;
    if (pool === 'basic') w = { common: 92 - q * 4, rare: 8 + q * 4, epic: q >= 2 ? 0.5 * q : 0 };
    else if (pool === 'advanced') w = { rare: 62, epic: 31, legendary: 6.5, mythic: tier >= 1 ? 0.5 : 0, ancient: tier >= 3 ? 0.05 : 0 };
    else w = { epic: 40, legendary: 45, mythic: 13, ancient: tier >= 3 ? 2 : tier >= 1 ? 0.5 : 0 };
    for (const r of ['epic', 'legendary', 'mythic', 'ancient']) if (w[r]) w[r] *= luck;
    return w;
  }

  speciesPool(rarity, pool) {
    const boost = this.game.events.current()?.summonBoost || [];
    return MONSTERS.filter((m) => m.rarity === rarity && !m.guardian && m.id !== 'goblin_emperor')
      .map((m) => {
        let weight = m.pool !== 'none' ? 3 : 1;
        if (pool === 'basic' && m.pool === 'none') weight = 0.4;
        if (boost.includes(m.family)) weight *= 3;
        return { id: m.id, weight };
      });
  }

  rollSpecies(pool, rng = this.rng) {
    const weights = this.rarityWeights(pool);
    const entries = Object.entries(weights).filter(([, v]) => v > 0);
    const rarity = rng.weighted(entries);
    const list = this.speciesPool(rarity, pool);
    if (!list.length) return this.rollSpecies(pool, rng);
    return rng.weighted(list).id;
  }

  canSummon(type) {
    const def = S.summons[type];
    if (!def) return { ok: false, reason: 'Portail inconnu' };
    if (!this.isPortalUnlocked(type)) return { ok: false, reason: 'Verrouillé (Recherche : Portails dimensionnels)' };
    const count = def.count || 1;
    if (this.game.state.monsters.length + count > this.game.monsters.rosterLimit()) return { ok: false, reason: 'Bestiaire plein : libérez des monstres ou recherchez « Grand bestiaire ».' };
    const cost = this.summonCost(type);
    if (!this.game.economy.canAfford(cost)) return { ok: false, reason: 'Ressources insuffisantes', cost };
    return { ok: true, cost };
  }

  summon(type) {
    const check = this.canSummon(type);
    if (!check.ok) return check;
    const def = S.summons[type];
    this.game.economy.spend(check.cost);
    const results = [];
    for (let i = 0; i < (def.count || 1); i++) {
      const sid = this.rollSpecies(def.pool);
      const isNew = !this.game.codex.has('monsters', sid);
      const m = this.game.monsters.create(sid, { silent: true });
      results.push({ monster: m, isNew });
    }
    // Garantie du ×10 : au moins un épique
    if ((def.count || 1) >= 10 && !results.some((r) => RARITIES.indexOf(this.game.monsters.species(r.monster).rarity) >= 2)) {
      const sid = this.rng.weighted(this.speciesPool('epic', 'advanced')).id;
      const last = results[results.length - 1].monster;
      last.speciesId = sid;
      results[results.length - 1].isNew = !this.game.codex.has('monsters', sid);
      this.game.codex.discover('monsters', sid);
    }
    if (type === 'basic') this.shop.basicSummons = (this.shop.basicSummons || 0) + 1;
    this.game.stats.add('monstersSummoned', results.length);
    this.game.bus.emit('monstersChanged');
    this.game.bus.emit('sfx', 'summon');
    this.game.requestSave();
    return { ok: true, results };
  }

  // ------------------------------------------------------------------ coffres
  freeChestReadyAt() {
    return (this.shop.lastFreeChest || 0) + S.freeChestCooldownHours * 3600000;
  }

  openFreeChest(now = Date.now()) {
    if (now < this.freeChestReadyAt()) return { ok: false, reason: 'Pas encore disponible' };
    this.shop.lastFreeChest = now;
    const fs = this.floorScale();
    const rng = this.rng;
    const loot = {
      gold: Math.round(rng.range(800, 1500) * fs),
      essence: Math.round(rng.range(10, 25) * Math.sqrt(fs)),
      crystals: rng.chance(0.5) ? rng.int(5, 15) : 0,
    };
    this.game.economy.add(loot);
    let item = null;
    if (rng.chance(0.5)) item = this.game.equipment.add(this.game.equipment.generate(rng, { ilvl: this.game.state.floors.length }));
    this.game.stats.add('chestsOpened', 1);
    this.game.bus.emit('sfx', 'chest');
    this.game.requestSave();
    return { ok: true, loot, item };
  }

  equipmentChestCost() {
    const def = S.equipmentChest;
    return this.game.economy.applyCostMods(scaleCost(def.cost, this.floorScale() * Math.pow(def.costGrowth, Math.min(50, this.shop.equipChests || 0))));
  }

  openEquipmentChest() {
    const cost = this.equipmentChestCost();
    if (this.game.state.equipment.length >= ECONOMY.equipment.maxInventory) return { ok: false, reason: 'Inventaire plein' };
    if (!this.game.economy.spend(cost)) return { ok: false, reason: 'Ressources insuffisantes' };
    this.shop.equipChests = (this.shop.equipChests || 0) + 1;
    const item = this.game.equipment.add(this.game.equipment.generate(this.rng, { ilvl: this.game.state.floors.length + 2 }));
    this.game.stats.add('chestsOpened', 1);
    this.game.bus.emit('sfx', 'chest');
    this.game.requestSave();
    return { ok: true, item };
  }

  // ------------------------------------------------------------------ échanges
  exchangeDeal(ex) {
    const fs = ex.scaleWithFloor ? this.floorScale() : 1;
    const giveIsCrystals = Object.keys(ex.give).every((k) => k === 'crystals');
    return {
      give: giveIsCrystals ? { ...ex.give } : scaleCost(ex.give, fs),
      get: scaleCost(ex.get, fs),
    };
  }

  exchange(id) {
    const ex = S.exchanges.find((e) => e.id === id);
    if (!ex) return { ok: false };
    if (ex.minFloor && this.game.state.floors.length < ex.minFloor) return { ok: false, reason: `Étage ${ex.minFloor} requis` };
    const deal = this.exchangeDeal(ex);
    if (!this.game.economy.spend(deal.give)) return { ok: false, reason: 'Ressources insuffisantes' };
    this.game.economy.add(deal.get, false);
    this.game.bus.emit('sfx', 'coins');
    this.game.requestSave();
    return { ok: true, deal };
  }
}
