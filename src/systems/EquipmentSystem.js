import { EQUIPMENT_BASES, UNIQUE_ARTIFACTS, AFFIXES, EQUIP_EFFECTS, EQUIP_RARITY, dropRarityWeights } from '../data/equipment.js';
import { ECONOMY } from '../config/economy.js';
import { RARITIES } from '../utils/constants.js';
import { scaleCost } from '../utils/helpers.js';
import { RNG } from '../utils/rng.js';

const BASE_MAP = Object.fromEntries(EQUIPMENT_BASES.map((b) => [b.id, b]));

export function getItemBase(item) {
  return item.unique ? UNIQUE_ARTIFACTS[item.baseId] : BASE_MAP[item.baseId];
}

/** Équipements des monstres : génération, équipement, amélioration, fusion, recyclage. */
export class EquipmentSystem {
  constructor(game) {
    this.game = game;
  }

  get list() {
    return this.game.state.equipment;
  }

  get(uid) {
    return this.list.find((i) => i.uid === uid);
  }

  base(item) {
    return getItemBase(item);
  }

  /** Génère un objet. `ilvl` = puissance (étage d'origine). */
  generate(rng, { ilvl = 1, rarity = null, slot = null } = {}) {
    rng = rng || new RNG();
    rarity = rarity || rng.weighted(dropRarityWeights(ilvl));
    const maxTier = Math.min(4, 1 + Math.floor(ilvl / 6));
    let candidates = EQUIPMENT_BASES.filter((b) => b.tier <= maxTier && (!slot || b.slot === slot));
    if (!slot) {
      // Les artefacts sont plus rares
      const nonArt = candidates.filter((b) => b.slot !== 'artifact');
      if (!rng.chance(0.12) && nonArt.length) candidates = nonArt;
    }
    if (!candidates.length) candidates = EQUIPMENT_BASES.filter((b) => !slot || b.slot === slot);
    const base = rng.pick(candidates);
    const r = EQUIP_RARITY[rarity];
    const affixes = [];
    const pool = AFFIXES.filter((a) => a.stat !== base.main.stat);
    for (let i = 0; i < r.affixes; i++) {
      const a = rng.pick(pool);
      affixes.push({ stat: a.stat, value: +(a.value * rng.range(0.7, 1.3)).toFixed(3) });
    }
    let effect = null;
    if (r.effectChance && rng.chance(r.effectChance)) {
      const effects = Object.keys(EQUIP_EFFECTS).filter((e) => !['stoneskin', 'spellbook', 'inferno', 'tyrant', 'frost', 'abyss'].includes(e));
      effect = rng.pick(effects);
    }
    return { uid: null, baseId: base.id, slot: base.slot, rarity, level: 1, ilvl, affixes, effect, equippedBy: null };
  }

  createUnique(artifactId) {
    const a = UNIQUE_ARTIFACTS[artifactId];
    return { uid: null, baseId: a.id, slot: a.slot, rarity: a.rarity, level: 1, ilvl: 10, affixes: [], effect: a.effect, unique: true, equippedBy: null };
  }

  /** Ajoute un objet à l'inventaire (recyclage automatique si plein). */
  add(item, { silent = false } = {}) {
    const s = this.game.state;
    if (this.list.length >= ECONOMY.equipment.maxInventory && !item.unique) {
      const refund = this.recycleValue(item);
      this.game.economy.add(refund, false);
      return null;
    }
    item.uid = `i${s.uidSeq++}`;
    this.list.push(item);
    this.game.codex.discover('equipment', item.baseId);
    this.game.stats.add('itemsFound', 1);
    if (RARITIES.indexOf(item.rarity) >= 3) this.game.stats.add('legendaryItems', 1);
    if (!silent) this.game.bus.emit('equipmentChanged');
    return item;
  }

  itemStats(item) {
    const base = this.base(item);
    if (!base) return {};
    const r = EQUIP_RARITY[item.rarity];
    const lvlMult = 1 + 0.12 * (item.level - 1);
    const ilvlMult = 1 + 0.18 * (item.ilvl - 1);
    const out = {};
    const pct = (stat) => stat === 'crit' || stat === 'lifesteal' || stat.endsWith('Pct');
    const addStat = (stat, value) => {
      out[stat] = (out[stat] || 0) + value;
    };
    const mainMult = item.unique ? lvlMult : r.statMult * lvlMult * (pct(base.main.stat) ? 1 : ilvlMult);
    addStat(base.main.stat, base.main.value * mainMult);
    if (base.sub) addStat(base.sub.stat, base.sub.value * mainMult);
    for (const a of item.affixes) {
      addStat(a.stat, a.value * lvlMult * (pct(a.stat) ? 1 : ilvlMult));
    }
    for (const k of Object.keys(out)) out[k] = pct(k) ? +out[k].toFixed(3) : Math.round(out[k]);
    return out;
  }

  itemPower(item) {
    const st = this.itemStats(item);
    return Math.round((st.attack || 0) * 2 + (st.hp || 0) * 0.25 + (st.defense || 0) * 1.5 + (st.speed || 0) * 4 + (st.crit || 0) * 300 + (st.attackPct || 0) * 400 + (st.hpPct || 0) * 300 + (st.lifesteal || 0) * 300 + (item.effect ? 40 : 0));
  }

  maxLevel(item) {
    return EQUIP_RARITY[item.rarity].maxLevel;
  }

  // ------------------------------------------------------------------ équiper
  equip(itemUid, monsterUid) {
    const item = this.get(itemUid);
    const m = this.game.monsters.get(monsterUid);
    if (!item || !m) return { ok: false, reason: 'Introuvable' };
    if (item.equippedBy && item.equippedBy !== monsterUid) {
      const prev = this.game.monsters.get(item.equippedBy);
      if (prev) delete prev.equipment[item.slot];
    }
    const current = m.equipment[item.slot];
    if (current) {
      const cur = this.get(current);
      if (cur) cur.equippedBy = null;
    }
    m.equipment[item.slot] = item.uid;
    item.equippedBy = m.uid;
    this.game.bus.emit('equipmentChanged');
    this.game.bus.emit('monstersChanged');
    this.game.bus.emit('sfx', 'equip');
    this.game.requestSave();
    return { ok: true };
  }

  unequip(itemUid) {
    const item = this.get(itemUid);
    if (!item || !item.equippedBy) return;
    const m = this.game.monsters.get(item.equippedBy);
    if (m) delete m.equipment[item.slot];
    item.equippedBy = null;
    this.game.bus.emit('equipmentChanged');
    this.game.bus.emit('monstersChanged');
    this.game.requestSave();
  }

  // ------------------------------------------------------------------ améliorer
  upgradeCost(item) {
    const e = ECONOMY.equipment;
    const rm = 1 + RARITIES.indexOf(item.rarity) * 0.6;
    let cost = scaleCost(e.upgradeBaseCost, Math.pow(e.upgradeGrowth, item.level - 1) * rm * (1 + 0.1 * (item.ilvl - 1)));
    if (this.game.dungeon.countRooms('forge') > 0) cost = scaleCost(cost, 0.8);
    return this.game.economy.applyCostMods(cost);
  }

  upgrade(itemUid) {
    const item = this.get(itemUid);
    if (!item) return { ok: false, reason: 'Introuvable' };
    if (item.level >= this.maxLevel(item)) return { ok: false, reason: 'Niveau maximum (fusionnez pour monter en rareté)' };
    const cost = this.upgradeCost(item);
    if (!this.game.economy.spend(cost)) return { ok: false, reason: 'Ressources insuffisantes' };
    item.level++;
    this.game.stats.add('itemsUpgraded', 1);
    this.game.stats.add('upgrades', 1);
    this.game.bus.emit('equipmentChanged');
    this.game.bus.emit('monstersChanged');
    this.game.bus.emit('sfx', 'upgrade');
    this.game.requestSave();
    return { ok: true };
  }

  // ------------------------------------------------------------------ fusion
  fuseCost(rarity) {
    const e = ECONOMY.equipment;
    return this.game.economy.applyCostMods(scaleCost(e.fuseCost, Math.pow(e.fuseCostGrowth, RARITIES.indexOf(rarity))));
  }

  /** Candidats de fusion : même emplacement et même rareté, non équipés, non uniques. */
  fuseCandidates(item) {
    return this.list.filter((i) => i.uid !== item.uid && !i.unique && !i.equippedBy && i.slot === item.slot && i.rarity === item.rarity);
  }

  fuse(itemUids) {
    const e = ECONOMY.equipment;
    const items = itemUids.map((u) => this.get(u)).filter(Boolean);
    if (items.length !== e.fuseCount) return { ok: false, reason: `Il faut ${e.fuseCount} objets.` };
    const { slot, rarity } = items[0];
    if (items.some((i) => i.slot !== slot || i.rarity !== rarity || i.unique)) return { ok: false, reason: 'Même emplacement et même rareté requis.' };
    const idx = RARITIES.indexOf(rarity);
    if (idx >= RARITIES.length - 1) return { ok: false, reason: 'Rareté maximale atteinte.' };
    const cost = this.fuseCost(rarity);
    if (!this.game.economy.spend(cost)) return { ok: false, reason: 'Ressources insuffisantes' };
    for (const it of items) if (it.equippedBy) this.unequip(it.uid);
    const ilvl = Math.max(...items.map((i) => i.ilvl));
    this.game.state.equipment = this.list.filter((i) => !itemUids.includes(i.uid));
    const created = this.add(this.generate(new RNG(Date.now() ^ idx), { ilvl, rarity: RARITIES[idx + 1], slot }), { silent: true });
    this.game.stats.add('itemsFused', 1);
    this.game.bus.emit('equipmentChanged');
    this.game.bus.emit('sfx', 'fuse');
    this.game.requestSave();
    return { ok: true, item: created };
  }

  // ------------------------------------------------------------------ recyclage
  recycleValue(item) {
    const e = ECONOMY.equipment;
    const mult = Math.pow(e.recycleRarityMult, RARITIES.indexOf(item.rarity)) * (1 + 0.15 * (item.ilvl - 1)) * (1 + 0.2 * (item.level - 1));
    const out = scaleCost(e.recycleBase, mult);
    if (RARITIES.indexOf(item.rarity) >= 3) out.darkEssence = RARITIES.indexOf(item.rarity) * 2;
    return out;
  }

  recycle(itemUids) {
    let total = {};
    for (const uid of itemUids) {
      const item = this.get(uid);
      if (!item || item.unique) continue;
      if (item.equippedBy) this.unequip(uid);
      const v = this.recycleValue(item);
      for (const [k, n] of Object.entries(v)) total[k] = (total[k] || 0) + n;
      this.game.state.equipment = this.list.filter((i) => i.uid !== uid);
      this.game.stats.add('itemsRecycled', 1);
    }
    this.game.economy.add(total, false);
    this.game.bus.emit('equipmentChanged');
    this.game.bus.emit('sfx', 'recycle');
    this.game.requestSave();
    return { ok: true, gained: total };
  }

  /** Meilleur objet libre pour un emplacement (équipement automatique). */
  bestFreeFor(slot) {
    let best = null;
    for (const it of this.list) {
      if (it.slot !== slot || it.equippedBy) continue;
      if (!best || this.itemPower(it) > this.itemPower(best)) best = it;
    }
    return best;
  }
}
