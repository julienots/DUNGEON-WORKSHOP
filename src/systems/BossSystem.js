import { BOSSES, bossForFloor } from '../data/bosses.js';
import { floorDef } from '../data/floors.js';
import { levelMult } from '../config/balance.js';
import { PASSIVES } from '../data/passives.js';
import { makeUnit, simulateBattle } from './CombatSystem.js';
import { RNG } from '../utils/rng.js';
import { dayKey } from '../utils/helpers.js';

export const BOSS_TEAM_SIZE = 5;

/** Combats de boss : gardiens d'étages et boss d'événements. */
export class BossSystem {
  constructor(game) {
    this.game = game;
  }

  bossKey(floorNumber) {
    return `f${floorNumber}`;
  }

  /** Liste des combats de gardien accessibles (étages atteints). */
  floorBosses() {
    const out = [];
    const floors = this.game.state.floors.length;
    for (let n = 1; n <= floors; n++) {
      const b = bossForFloor(n);
      if (!b) continue;
      const key = this.bossKey(n);
      const defeated = !!this.game.state.bosses.defeated[key];
      out.push({ key, floor: n, boss: b.boss, tier: b.tier, defeated, level: this.bossLevel(n, b), repeatAvailable: defeated && this.game.state.bosses.lastRepeat[key] !== dayKey() });
    }
    return out;
  }

  bossLevel(floorNumber, b) {
    return floorDef(floorNumber).level + (b.boss.levelOffset || 2) + b.tier * 5;
  }

  eventBoss() {
    const ev = this.game.events.current();
    if (!ev?.boss) return null;
    const boss = BOSSES[ev.boss];
    const level = floorDef(this.game.state.floors.length).level + 1;
    return { key: `event:${ev.boss}`, boss, tier: 0, level, event: ev, available: this.game.events.eventBossAvailable(), firstDone: !!this.game.state.bosses.defeated[`event:${ev.boss}`] };
  }

  bossUnit(boss, level, tier = 0) {
    const lm = levelMult('boss', level) * (1 + tier * 0.6);
    return makeUnit({
      id: 'boss', side: 'B', name: tier ? `${boss.name} éveillé${tier > 1 ? ' ' + tier : ''}` : boss.name, family: boss.family, element: boss.element,
      level, rarity: 'legendary', role: 'tank', isBoss: true,
      hp: Math.round(boss.hp * lm), atk: Math.round(boss.attack * lm), def: Math.round(boss.defense * lm), spd: boss.speed,
      basic: boss.basic, skills: boss.skills, mods: { ...(PASSIVES[boss.passive]?.mods || {}) },
      phases: boss.phases, sprite: `boss_${boss.id}`, size: 1.6,
    });
  }

  /**
   * Lance le combat (résultat immédiat et déterministe) puis applique les récompenses en cas de victoire.
   * @param {string} key  clé du combat (f5, event:xxx)
   * @param {string[]} teamUids  monstres engagés (max 5)
   */
  fight(key, teamUids) {
    const g = this.game;
    const team = teamUids.map((u) => g.monsters.get(u)).filter(Boolean).slice(0, BOSS_TEAM_SIZE);
    if (!team.length) return { ok: false, reason: 'Choisissez au moins un monstre.' };
    let entry;
    if (key.startsWith('event:')) {
      entry = this.eventBoss();
      if (!entry || entry.key !== key) return { ok: false, reason: 'Événement terminé' };
      if (!entry.available) return { ok: false, reason: 'Déjà affronté aujourd’hui. Revenez demain !' };
    } else {
      entry = this.floorBosses().find((b) => b.key === key);
      if (!entry) return { ok: false, reason: 'Boss inconnu' };
      if (entry.defeated && !entry.repeatAvailable) return { ok: false, reason: 'Déjà vaincu aujourd’hui. Revenez demain pour une nouvelle récompense.' };
    }
    const boss = this.bossUnit(entry.boss, entry.level, entry.tier);
    const allies = team.map((m) => makeUnit(g.monsters.toUnit(m)));
    const m = g.mods.get();
    const result = simulateBattle({
      rng: new RNG((Date.now() ^ 0x5bd1e995) >>> 0),
      sideA: allies,
      sideB: [boss],
      record: true,
      maxTime: 120,
      sideMods: { A: { elementPower: m.elementPower, skillCooldown: m.skillCooldown, bossDamage: m.bossDamage }, B: {} },
    });
    const win = result.winner === 'A';
    let granted = null;
    let first = false;
    const bs = g.state.bosses;
    if (win) {
      first = !bs.defeated[key];
      const reward = first ? entry.boss.rewards.first : entry.boss.rewards.repeat;
      granted = this.grant(reward, entry);
      bs.defeated[key] = (bs.defeated[key] || 0) + 1;
      g.stats.add('bossesDefeated', 1);
      if (entry.event) g.stats.add('eventBossKills', 1);
      g.codex.discover('bosses', entry.boss.id);
      if (first && entry.boss.guardian) {
        granted.guardian = g.monsters.create(entry.boss.guardian);
      }
      g.master.addXp(100 * entry.level);
    }
    if (entry.event) bs.eventLast[entry.boss.id] = dayKey();
    else if (win && !first) bs.lastRepeat[key] = dayKey();
    // XP pour l'équipe, même en cas de défaite
    const xp = Math.round(30 * entry.level * (win ? 2 : 0.5) * (1 + (m.xpGain || 0)));
    for (const mon of team) g.monsters.addXp(mon, xp);
    g.bus.emit('monstersChanged');
    g.bus.emit('bossFought', { key, win });
    g.requestSave(true);
    return { ok: true, win, first, granted, result, boss: entry.boss, entry, xp };
  }

  grant(reward, entry) {
    const g = this.game;
    const scale = 1 + (entry.tier || 0) * 1.5;
    const res = {};
    const out = {};
    for (const [k, v] of Object.entries(reward)) {
      if (k === 'artifact') {
        const has = g.state.equipment.some((i) => i.unique && i.baseId === v);
        if (!has) out.artifact = g.equipment.add(g.equipment.createUnique(v));
      } else if (k === 'species') {
        out.monster = g.monsters.create(v);
      } else {
        res[k] = Math.round(v * scale);
      }
    }
    g.economy.add(res);
    out.resources = res;
    return out;
  }

  /** Recommandation de puissance pour l'interface. */
  recommendedPower(entry) {
    const u = this.bossUnit(entry.boss, entry.level, entry.tier);
    return Math.round((u.maxHp * 0.25 + u.baseAtk * 2 + u.baseDef * 1.5 + u.baseSpd * 4) * 1.3);
  }
}
