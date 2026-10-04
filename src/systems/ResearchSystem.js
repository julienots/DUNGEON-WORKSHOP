import { RESEARCH, RESEARCH_MAP } from '../data/research.js';
import { ECONOMY } from '../config/economy.js';
import { scaleCost } from '../utils/helpers.js';

/** Arbre technologique : recherches à durée réelle (continuent hors ligne). */
export class ResearchSystem {
  constructor(game) {
    this.game = game;
  }

  get r() {
    return this.game.state.research;
  }

  level(id) {
    return this.r.levels[id] || 0;
  }

  slots() {
    return 1 + (this.game.mods.get().researchSlots || 0);
  }

  cost(id) {
    const def = RESEARCH_MAP[id];
    const lvl = this.level(id);
    return this.game.economy.applyCostMods(scaleCost(def.cost, Math.pow(def.costGrowth || 1, lvl)));
  }

  duration(id) {
    const def = RESEARCH_MAP[id];
    const lvl = this.level(id);
    const speed = this.game.mods.get().researchSpeed || 0;
    return Math.max(5, Math.round(def.time * Math.pow(def.timeGrowth || 1, lvl) * (1 - speed)));
  }

  isActive(id) {
    return this.r.active.some((a) => a.id === id);
  }

  status(id) {
    const def = RESEARCH_MAP[id];
    const lvl = this.level(id);
    if (lvl >= def.maxLevel) return { state: 'max' };
    if (this.isActive(id)) return { state: 'active' };
    const reasons = [];
    for (const req of def.requires || []) {
      if (this.level(req.id) < req.level) reasons.push(`${RESEARCH_MAP[req.id].name} niv. ${req.level}`);
    }
    if (def.minFloor && this.game.state.floors.length < def.minFloor) reasons.push(`Étage ${def.minFloor}`);
    if (reasons.length) return { state: 'locked', reasons };
    const cost = this.cost(id);
    if (this.r.active.length >= this.slots()) return { state: 'busy', cost };
    if (!this.game.economy.canAfford(cost)) return { state: 'poor', cost };
    return { state: 'ready', cost };
  }

  start(id, now = Date.now()) {
    const st = this.status(id);
    if (st.state !== 'ready') return { ok: false, reason: { locked: 'Prérequis manquants', busy: 'Laboratoire occupé', poor: 'Ressources insuffisantes', max: 'Niveau maximum', active: 'Déjà en cours' }[st.state] };
    this.game.economy.spend(st.cost);
    const dur = this.duration(id);
    this.r.active.push({ id, startedAt: now, endsAt: now + dur * 1000 });
    this.game.bus.emit('researchChanged');
    this.game.bus.emit('sfx', 'research');
    this.game.requestSave();
    return { ok: true };
  }

  rushCost(active, now = Date.now()) {
    const minutes = Math.max(0, (active.endsAt - now) / 60000);
    return Math.max(ECONOMY.research.rushMinCrystals, Math.ceil(minutes * ECONOMY.research.rushCrystalsPerMinute));
  }

  rush(id, now = Date.now()) {
    const a = this.r.active.find((x) => x.id === id);
    if (!a) return { ok: false };
    const cost = { crystals: this.rushCost(a, now) };
    if (!this.game.economy.spend(cost)) return { ok: false, reason: 'Cristaux insuffisants' };
    a.endsAt = now;
    this.update(now);
    return { ok: true };
  }

  /** Termine les recherches arrivées à échéance. Retourne la liste des recherches terminées. */
  update(now = Date.now(), silent = false) {
    const done = [];
    for (const a of this.r.active.slice()) {
      if (now >= a.endsAt) {
        this.r.active = this.r.active.filter((x) => x !== a);
        this.r.levels[a.id] = (this.r.levels[a.id] || 0) + 1;
        done.push(a.id);
        this.game.stats.add('researchCompleted', 1);
      }
    }
    if (done.length) {
      this.game.mods.invalidate();
      if (!silent) {
        for (const id of done) this.game.bus.emit('researchDone', RESEARCH_MAP[id], this.level(id));
        this.game.bus.emit('sfx', 'research_done');
      }
      this.game.bus.emit('researchChanged');
      this.game.requestSave();
    }
    return done;
  }

  byCategory(cat) {
    return RESEARCH.filter((r) => r.cat === cat);
  }

  /** Nombre de recherches lançables (badge de l'onglet). */
  readyCount() {
    if (this.r.active.length >= this.slots()) return 0;
    return RESEARCH.filter((r) => this.status(r.id).state === 'ready').length;
  }
}
