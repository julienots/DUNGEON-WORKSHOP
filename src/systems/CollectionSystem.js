import { CHESTS, CHEST_IDS, CHEST_SHOP } from '../data/chests.js';
import { SKINS, SKIN_IDS, DECORATIONS, DECORATION_IDS } from '../data/cosmetics.js';
import { MONSTERS } from '../data/monsters.js';
import { floorEconomyScale } from '../data/floors.js';
import { RNG, hashString } from '../utils/rng.js';
import { cellKey } from '../utils/helpers.js';

/** Ressources dont la quantité suit l'économie de l'étage atteint. */
const SCALED = ['gold', 'stone', 'metal', 'essence'];

export function createCollectionState() {
  return {
    chests: Object.fromEntries(CHEST_IDS.map((id) => [id, 0])),
    serums: 0,
    skins: { classic: true },
    decorations: {},
    opened: 0,
  };
}

/**
 * COLLECTION (V2) : coffres (commun → ancien), sérums de mutation, skins et décorations.
 */
export class CollectionSystem {
  constructor(game) {
    this.game = game;
  }

  get c() {
    return this.game.state.collection;
  }

  // ------------------------------------------------------------------ coffres
  addChest(rarity, n = 1) {
    if (!CHESTS[rarity] || n <= 0) return;
    this.c.chests[rarity] = (this.c.chests[rarity] || 0) + n;
    this.game.bus.emit('collectionChanged');
  }

  totalChests() {
    return CHEST_IDS.reduce((a, id) => a + (this.c.chests[id] || 0), 0);
  }

  /** Ouvre un coffre : retourne la liste des récompenses (déjà accordées). */
  open(rarity, rng = new RNG(hashString(`chest:${rarity}:${Date.now()}:${Math.random()}`))) {
    const def = CHESTS[rarity];
    if (!def) return { ok: false, reason: 'Coffre inconnu' };
    if (!(this.c.chests[rarity] > 0)) return { ok: false, reason: 'Aucun coffre de ce type' };
    this.c.chests[rarity]--;
    const items = [];
    for (let i = 0; i < def.rolls; i++) items.push(this.roll(def, rng));
    this.c.opened++;
    this.game.stats.add('chestsOpened', 1);
    this.game.bus.emit('collectionChanged');
    this.game.bus.emit('resources');
    this.game.requestSave(true);
    return { ok: true, rarity, items };
  }

  roll(def, rng) {
    const g = this.game;
    const kind = rng.weighted(Object.entries(def.loot));
    switch (kind) {
      case 'monster': {
        if (g.state.monsters.length >= g.monsters.rosterLimit()) return this.resources(def, rng, 1.5);
        const rarity = rng.weighted(Object.entries(def.monster));
        const pool = MONSTERS.filter((m) => m.rarity === rarity && !m.guardian && m.id !== 'goblin_emperor');
        if (!pool.length) return this.resources(def, rng);
        const sp = rng.pick(pool);
        const isNew = !g.codex.has('monsters', sp.id);
        const m = g.monsters.create(sp.id, { silent: true });
        g.bus.emit('monstersChanged');
        return { type: 'monster', id: sp.id, uid: m.uid, rarity, isNew };
      }
      case 'equipment': {
        const rarity = rng.weighted(Object.entries(def.equip));
        const it = g.equipment.add(g.equipment.generate(new RNG(rng.int(1, 2 ** 30)), { ilvl: g.state.floors.length + 2, rarity }), { silent: true });
        g.bus.emit('equipmentChanged');
        if (!it) return this.resources(def, rng);
        return { type: 'equipment', uid: it.uid, baseId: it.baseId, rarity: it.rarity };
      }
      case 'serum':
        this.c.serums++;
        return { type: 'serum', amount: 1, rarity: 'epic' };
      case 'skin': {
        const missing = SKIN_IDS.filter((id) => !this.c.skins[id]);
        if (!missing.length) return this.duplicate(def, 'skin');
        const id = rng.weighted(missing.map((x) => [x, rarityWeight(SKINS[x].rarity)]));
        this.c.skins[id] = true;
        return { type: 'skin', id, rarity: SKINS[id].rarity };
      }
      case 'decoration': {
        const id = rng.weighted(DECORATION_IDS.map((x) => [x, rarityWeight(DECORATIONS[x].rarity)]));
        this.c.decorations[id] = (this.c.decorations[id] || 0) + 1;
        return { type: 'decoration', id, rarity: DECORATIONS[id].rarity };
      }
      case 'fragments': {
        const n = 1 + rng.int(0, 1);
        g.economy.add({ dimensionalFragments: n });
        return { type: 'resources', res: { dimensionalFragments: n }, rarity: 'legendary' };
      }
      default:
        return this.resources(def, rng);
    }
  }

  resources(def, rng, mult = 1) {
    const scale = floorEconomyScale(Math.max(1, this.game.state.floors.length));
    const res = {};
    for (const [k, v] of Object.entries(def.res)) {
      const s = SCALED.includes(k) ? scale : 1;
      res[k] = Math.max(1, Math.round(v * s * mult * rng.range(0.8, 1.25)));
    }
    this.game.economy.add(res);
    return { type: 'resources', res, rarity: 'common' };
  }

  duplicate(def, what) {
    const n = Math.max(1, Math.round((def.res.legendaryEssence || 1) * 2));
    this.game.economy.add({ legendaryEssence: n });
    return { type: 'resources', res: { legendaryEssence: n }, rarity: 'rare', duplicate: what };
  }

  canBuy(rarity) {
    const s = CHEST_SHOP[rarity];
    if (!s) return { ok: false, reason: 'Non vendu' };
    if (!this.game.economy.canAfford(s.cost)) return { ok: false, reason: 'Ressources insuffisantes', cost: s.cost };
    return { ok: true, cost: s.cost };
  }

  buy(rarity) {
    const check = this.canBuy(rarity);
    if (!check.ok) return check;
    this.game.economy.spend(check.cost);
    this.addChest(rarity);
    this.game.requestSave(true);
    return { ok: true };
  }

  // ------------------------------------------------------------------ sérums
  /** Mutation gratuite grâce à un sérum (Salle de mutation requise). */
  useSerum(uid) {
    if (!(this.c.serums > 0)) return { ok: false, reason: 'Aucun sérum' };
    const m = this.game.monsters.get(uid);
    const check = this.game.monsters.canMutate(m);
    if (!check.ok && check.reason !== 'Ressources insuffisantes') return check;
    this.c.serums--;
    const cost = check.cost;
    // Le sérum paie la mutation : on crédite son coût juste avant
    if (cost) this.game.economy.add(cost, false);
    const r = this.game.monsters.mutate(uid);
    if (!r.ok) this.c.serums++;
    this.game.bus.emit('collectionChanged');
    return r;
  }

  // ------------------------------------------------------------------ skins
  hasSkin(id) {
    return !!this.c.skins[id];
  }

  setSkin(uid, skin) {
    const m = this.game.monsters.get(uid);
    if (!m) return { ok: false, reason: 'Monstre introuvable' };
    if (!SKINS[skin] || !this.hasSkin(skin)) return { ok: false, reason: 'Skin non débloqué' };
    m.skin = skin;
    this.game.bus.emit('monstersChanged');
    this.game.bus.emit('dungeonChanged', m.location?.floor);
    this.game.requestSave();
    return { ok: true };
  }

  // ------------------------------------------------------------------ décorations
  decorationsUsed(id) {
    let n = 0;
    for (const f of this.game.state.floors) for (const d of Object.values(f.decor || {})) if (d === id) n++;
    return n;
  }

  decorationsFree(id) {
    return (this.c.decorations[id] || 0) - this.decorationsUsed(id);
  }

  placeDecoration(fi, x, y, id) {
    const f = this.game.state.floors[fi];
    const k = cellKey(x, y);
    if (!f?.cells[k]) return { ok: false, reason: 'Aucune salle ici' };
    f.decor = f.decor || {};
    if (id === null) {
      delete f.decor[k];
    } else {
      if (!DECORATIONS[id]) return { ok: false, reason: 'Décoration inconnue' };
      if (f.decor[k] !== id && this.decorationsFree(id) <= 0) return { ok: false, reason: 'Aucun exemplaire libre' };
      f.decor[k] = id;
    }
    this.game.bus.emit('dungeonChanged', fi);
    this.game.requestSave();
    return { ok: true };
  }
}

function rarityWeight(r) {
  return { common: 10, rare: 6, epic: 3, legendary: 1.2, mythic: 0.4, ancient: 0.1 }[r] || 1;
}
