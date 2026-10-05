import { PRESTIGE_UPGRADES, ASCENSION_TITLES } from '../data/prestige.js';
import { ECONOMY } from '../config/economy.js';
import { createFloorState } from '../core/GameState.js';
import { RESOURCE_KEYS } from '../utils/constants.js';
import { RESEARCH_MAP } from '../data/research.js';

const P = ECONOMY.prestige;

/** Ascension : réinitialisation partielle contre de l'Essence du Maître. */
export class PrestigeSystem {
  constructor(game) {
    this.game = game;
  }

  get p() {
    return this.game.state.prestige;
  }

  minFloor() {
    // Chaque Ascension demande d'aller un peu plus loin
    return P.minFloor + Math.min(20, this.p.count * 2);
  }

  previewGain() {
    const floors = this.game.state.floors.length;
    const min = this.minFloor();
    if (floors < min) return 0;
    const goldFactor = 1 + Math.log10(Math.max(10, this.p.runGold)) / P.goldLogDiv;
    return Math.floor(P.base * Math.pow(floors - min + 1, P.exponent) * goldFactor);
  }

  canAscend() {
    const floors = this.game.state.floors.length;
    if (floors < this.minFloor()) return { ok: false, reason: `Atteindre l’étage ${this.minFloor()}` };
    return { ok: true, gain: this.previewGain() };
  }

  title(count = this.p.count) {
    let t = ASCENSION_TITLES[0].title;
    for (const x of ASCENSION_TITLES) if (count >= x.count) t = x.title;
    return t;
  }

  ascend() {
    const check = this.canAscend();
    if (!check.ok) return check;
    const g = this.game;
    const s = g.state;
    g.raids.reset();
    this.p.count++;
    this.p.masterEssence += check.gain;
    this.p.totalMasterEssence += check.gain;
    this.p.runGold = 0;
    g.stats.add('ascensions', 1);

    // Ce qui est réinitialisé : étages, salles, pièges, ressources (sauf cristaux), recherche, trésorerie, niveaux des monstres.
    const heritage = s.prestige.upgrades.pr_heritage || 0;
    const startMult = Math.pow(2, heritage) * (1 + this.p.count * 0.5);
    const crystals = s.resources.crystals;
    for (const k of RESOURCE_KEYS) s.resources[k] = Math.round(ECONOMY.resources[k].startingAmount * startMult);
    s.resources.crystals = crystals;
    // La recherche « Magie » est conservée (savoir permanent du Maître)
    const kept = {};
    for (const [id, lvl] of Object.entries(s.research.levels)) if (RESEARCH_MAP[id]?.cat === 'magic') kept[id] = lvl;
    s.research = { levels: kept, active: [] };
    s.treasury = { level: 1, vault: 0 };
    g.mods.invalidate();
    const extra = g.mods.get().floorSize || 0;
    s.floors = [createFloorState(1, extra)];
    s.currentFloor = 0;
    g.monsters.resetForAscension();
    // Le meilleur monstre garde l'entrée du nouvel étage 1
    const f = s.floors[0];
    const basic = Object.entries(f.cells).find(([, c]) => c.room === 'basic');
    if (basic && s.monsters.length) {
      const [x, y] = basic[0].split(',').map(Number);
      const best = s.monsters.filter((m) => !g.monsters.species(m).guardian).sort((a, b) => g.monsters.power(b) - g.monsters.power(a))[0];
      if (best) best.location = { floor: 0, x, y };
    }
    g.viewFloor = 0;
    g.mods.invalidate();
    g.bus.emit('ascended', check.gain);
    g.bus.emit('floorsChanged');
    g.bus.emit('dungeonChanged', 0);
    g.bus.emit('monstersChanged');
    g.bus.emit('resources');
    g.bus.emit('sfx', 'ascend');
    g.requestSave(true);
    return { ok: true, gain: check.gain };
  }

  upgradeLevel(id) {
    return this.p.upgrades[id] || 0;
  }

  upgradeCost(id) {
    const u = PRESTIGE_UPGRADES.find((x) => x.id === id);
    return Math.ceil(u.baseCost * Math.pow(u.growth, this.upgradeLevel(id)));
  }

  buy(id) {
    const u = PRESTIGE_UPGRADES.find((x) => x.id === id);
    if (!u) return { ok: false };
    if (this.upgradeLevel(id) >= u.maxLevel) return { ok: false, reason: 'Niveau maximum' };
    const cost = this.upgradeCost(id);
    if (this.p.masterEssence < cost) return { ok: false, reason: 'Essence du Maître insuffisante' };
    this.p.masterEssence -= cost;
    this.p.upgrades[id] = this.upgradeLevel(id) + 1;
    this.game.mods.invalidate();
    this.game.bus.emit('prestigeChanged');
    this.game.bus.emit('sfx', 'upgrade');
    this.game.requestSave();
    return { ok: true };
  }
}
