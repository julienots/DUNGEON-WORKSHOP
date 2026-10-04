import { DAILY_MISSIONS, WEEKLY_MISSIONS, PERMANENT_CHAINS } from '../data/missions.js';
import { MONSTER_MAP } from '../data/monsters.js';
import { RNG, hashString } from '../utils/rng.js';
import { dayKey, weekKey } from '../utils/helpers.js';

/** Missions quotidiennes, hebdomadaires, permanentes et d'événement. */
export class MissionSystem {
  constructor(game) {
    this.game = game;
  }

  get m() {
    return this.game.state.missions;
  }

  floors() {
    return this.game.state.floors.length;
  }

  targetFor(def) {
    if (!def.scale) return def.target;
    const f = this.floors();
    const factor = def.stat === 'goldEarned' ? Math.pow(1.8, f - 1) : 1 + 0.3 * (f - 1);
    return Math.round(def.target * factor);
  }

  rewardFor(reward, scale = true) {
    const f = this.floors();
    const out = { ...reward };
    if (scale) {
      const mult = Math.pow(1.7, f - 1);
      for (const k of ['gold', 'stone', 'metal', 'essence']) if (out[k]) out[k] = Math.round(out[k] * (k === 'essence' ? Math.sqrt(mult) : mult));
    }
    return out;
  }

  makeInstance(def) {
    return { id: def.id, base: this.game.stats.get(def.stat), target: this.targetFor(def), claimed: false };
  }

  /** Renouvelle les missions si le jour / la semaine / l'événement a changé (heure locale). */
  refresh(now = new Date()) {
    let changed = false;
    const dk = dayKey(now);
    if (this.m.dailyKey !== dk) {
      const rng = new RNG(hashString('daily' + dk));
      this.m.daily = rng.shuffle(DAILY_MISSIONS).slice(0, 4).map((d) => this.makeInstance(d));
      this.m.dailyKey = dk;
      changed = true;
    }
    const wk = weekKey(now);
    if (this.m.weeklyKey !== wk) {
      const rng = new RNG(hashString('weekly' + wk));
      this.m.weekly = rng.shuffle(WEEKLY_MISSIONS).slice(0, 3).map((d) => this.makeInstance(d));
      this.m.weeklyKey = wk;
      changed = true;
    }
    const ev = this.game.events.current(now);
    const ek = ev ? `${ev.id}:${ev.periodKey}` : '';
    if (this.m.eventKey !== ek) {
      this.m.event = ev ? ev.missions.map((d) => this.makeInstance(d)) : [];
      this.m.eventKey = ek;
      changed = true;
    }
    if (changed) {
      this.game.bus.emit('missionsChanged');
      this.game.requestSave();
    }
  }

  defOf(kind, id) {
    if (kind === 'daily') return DAILY_MISSIONS.find((d) => d.id === id);
    if (kind === 'weekly') return WEEKLY_MISSIONS.find((d) => d.id === id);
    if (kind === 'event') return this.game.events.current()?.missions.find((d) => d.id === id);
    return null;
  }

  progress(kind, inst) {
    const def = this.defOf(kind, inst.id);
    if (!def) return { value: 0, target: inst.target, done: false };
    const value = Math.max(0, this.game.stats.get(def.stat) - inst.base);
    return { value: Math.min(value, inst.target), target: inst.target, done: value >= inst.target };
  }

  list(kind) {
    const arr = this.m[kind] || [];
    return arr.map((inst) => {
      const def = this.defOf(kind, inst.id);
      if (!def) return null;
      const p = this.progress(kind, inst);
      return { kind, inst, def, name: def.name.replace('{n}', inst.target.toLocaleString('fr-FR')), reward: this.rewardFor(def.reward, kind !== 'event'), ...p };
    }).filter(Boolean);
  }

  claim(kind, id) {
    const inst = (this.m[kind] || []).find((x) => x.id === id);
    if (!inst || inst.claimed) return { ok: false };
    const def = this.defOf(kind, id);
    const p = this.progress(kind, inst);
    if (!p.done) return { ok: false, reason: 'Mission non terminée' };
    inst.claimed = true;
    const granted = this.grant(this.rewardFor(def.reward, kind !== 'event'));
    this.game.bus.emit('missionsChanged');
    this.game.bus.emit('sfx', 'reward');
    this.game.requestSave();
    return { ok: true, granted };
  }

  // ------------------------------------------------------------------ chaînes permanentes
  chains() {
    return PERMANENT_CHAINS.map((c) => {
      const idx = this.m.chains[c.id] || 0;
      const done = idx >= c.targets.length;
      const target = done ? c.targets[c.targets.length - 1] : c.targets[idx];
      const value = this.game.stats.get(c.stat);
      const reward = done ? null : c.reward(idx);
      return { chain: c, index: idx, total: c.targets.length, target, value: Math.min(value, target), complete: done, done: !done && value >= target, reward };
    });
  }

  claimChain(id) {
    const c = PERMANENT_CHAINS.find((x) => x.id === id);
    const info = this.chains().find((x) => x.chain.id === id);
    if (!c || !info || !info.done) return { ok: false };
    this.m.chains[id] = info.index + 1;
    const granted = this.grant(info.reward);
    this.game.bus.emit('missionsChanged');
    this.game.bus.emit('sfx', 'reward');
    this.game.requestSave();
    return { ok: true, granted };
  }

  /** Accorde une récompense (ressources, monstre, équipement). */
  grant(reward) {
    const g = this.game;
    const res = {};
    const extra = {};
    for (const [k, v] of Object.entries(reward)) {
      if (v === undefined || v === null || v === 0) continue;
      if (k === 'monster') {
        let sid = v;
        if (v === 'basic' || v === 'advanced') sid = g.shop.rollSpecies(v);
        if (MONSTER_MAP[sid]) extra.monster = g.monsters.create(sid);
      } else if (k === 'equipment') {
        extra.item = g.equipment.add(g.equipment.generate(null, { ilvl: this.floors() + 1, rarity: v }));
      } else {
        res[k] = Math.round(v);
      }
    }
    g.economy.add(res);
    return { resources: res, ...extra };
  }

  claimableCount() {
    let n = 0;
    for (const kind of ['daily', 'weekly', 'event']) n += this.list(kind).filter((x) => x.done && !x.inst.claimed).length;
    n += this.chains().filter((c) => c.done).length;
    return n;
  }
}

