import { Battle, makeUnit, snapshotUnit } from './CombatSystem.js';
import { ROOMS } from '../data/rooms.js';
import { ADVENTURERS } from '../data/adventurers.js';
import { ECONOMY } from '../config/economy.js';
import { BALANCE } from '../config/balance.js';
import { RNG } from '../utils/rng.js';
import { cellKey } from '../utils/helpers.js';
import { floorDef, depthMult } from '../data/floors.js';

const R = ECONOMY.raid;
const RW = ECONOMY.rewards;

/** Facteur d'XP selon l'écart de niveau monstre / aventuriers (empêche le sur-niveau facile). */
export function xpLevelFactor(monsterLevel, partyLevel) {
  const gap = monsterLevel - partyLevel - RW.xpLevelGapFree;
  return Math.max(0.05, Math.min(1, 1 - Math.max(0, gap) * RW.xpLevelGapPenalty));
}

/**
 * RAID SYSTEM
 * Un raid = un groupe d'aventuriers qui parcourt un étage salle par salle.
 * Le raid est entièrement pré-calculé (déterministe) : la scène du donjon ne fait que
 * rejouer la chronologie d'événements. Les étages non affichés sont résolus sans enregistrement.
 */
export class RaidSystem {
  constructor(game) {
    this.game = game;
    /** État transitoire par étage : { nextAt, current, elapsed } */
    this.runtime = [];
    this.seq = 0;
  }

  interval(fi) {
    const rate = this.game.mods.get().raidRate || 0;
    return Math.max(R.minInterval, R.baseInterval / (1 + rate)) + Math.min(fi, 10);
  }

  rt(fi, now = Date.now()) {
    if (!this.runtime[fi]) this.runtime[fi] = { nextAt: now + 3000 + (fi % 6) * 2500, current: null, elapsed: 0 };
    return this.runtime[fi];
  }

  sideMods() {
    const m = this.game.mods.get();
    return { A: { elementPower: m.elementPower, skillCooldown: m.skillCooldown, bossDamage: m.bossDamage }, B: {} };
  }

  // ------------------------------------------------------------------ simulation
  simulate(fi, { seed = (Date.now() ^ (++this.seq * 2654435761)) >>> 0, record = true } = {}) {
    const g = this.game;
    const floor = g.dungeon.floor(fi);
    const fnum = fi + 1;
    const rng = new RNG(seed);
    const party = g.adventurers.generateParty(fnum, floor.threat, rng);
    const heroes = party.members.map(makeUnit);
    // Biome de l'étage (V2) : règles de combat, anomalies
    const brules = g.biomes.rules(fi, seed);
    const bsm = g.biomes.sideMods(fi, brules);
    const base = this.sideMods();
    const sideMods = {
      A: { ...base.A, ...bsm.A, skillCooldown: (base.A.skillCooldown || 0) + (bsm.A.skillCooldown || 0) },
      B: { ...base.B, ...bsm.B },
    };
    const battle = new Battle({ rng, record, sideMods });
    battle.addUnits(heroes);
    const tour = g.dungeon.computeTour(fi);
    battle.emit({ type: 'spawn', party: { name: party.name, level: party.level }, units: heroes.map(snapshotUnit), anomaly: brules.anomaly ? { name: brules.anomaly.name, icon: brules.anomaly.icon } : null });

    const cleared = new Set();
    const trapReady = {};
    const participants = new Set();
    const deadMonsters = [];
    const xpBonus = {};
    let outcome = null;
    const heroesAlive = () => heroes.some((h) => h.alive);

    for (let i = 0; i < tour.length && !outcome; i++) {
      const { x, y } = tour[i];
      const key = cellKey(x, y);
      if (i > 0) {
        battle.advanceStatuses(R.walkStepTime);
        if (!heroesAlive()) {
          outcome = 'victory';
          break;
        }
      }
      battle.emit({ type: 'move', x, y, step: i });
      const cell = g.dungeon.cell(fi, x, y);
      if (!cell) continue;
      const trapDef = cell.trap ? g.traps.trapUnit(fi, x, y) : null;

      // Piège à l'entrée de la salle
      if (trapDef && battle.t >= (trapReady[key] || 0)) {
        battle.trapStrike(trapDef);
        trapReady[key] = battle.t + trapDef.cooldown;
        battle.t += 0.3;
        if (!heroesAlive()) {
          outcome = 'victory';
          break;
        }
      }

      // Combat contre les monstres de la salle
      if (!cleared.has(key)) {
        cleared.add(key);
        const mons = g.monsters.monstersAt(fi, x, y);
        if (mons.length) {
          const eff = g.dungeon.roomEffects(fi, x, y);
          const room = { roomId: cell.room, level: cell.level, eff, fi };
          const units = mons.map((m) => makeUnit(g.monsters.toUnit(m, room)));
          if (eff.list.length) battle.stats.synergyTriggers += eff.list.length;
          for (const m of mons) if (eff.xp) xpBonus[m.uid] = 1 + eff.xp;
          battle.units = heroes.concat(units);
          battle.traps = [];
          if (trapDef) battle.addTrap({ ...trapDef, nextFire: trapReady[key] || 0 });
          const rd = ROOMS[cell.room];
          battle.emit({ type: 'combatStart', x, y });
          battle.start([...(rd.onCombat || []), ...eff.onCombat, ...(brules.onCombat || [])], rd.allyStatuses || []);
          const res = battle.run(R.maxCombatTime);
          if (trapDef) trapReady[key] = battle.traps[0]?.nextFire || trapReady[key];
          for (const u of units) {
            participants.add(u.monsterUid);
            if (!u.alive) deadMonsters.push(u.monsterUid);
          }
          battle.units = heroes.slice();
          battle.traps = [];
          battle.emit({ type: 'combatEnd', x, y, winner: res.winner });
          if (res.winner === 'A') outcome = 'victory';
          else if (res.winner === 'timeout') outcome = 'retreat';
          battle.t += 0.4;
        }
      }
      if (!outcome && cell.room === 'core') outcome = heroesAlive() ? 'looted' : 'victory';
    }
    if (!outcome) outcome = heroesAlive() ? 'looted' : 'victory';
    battle.emit({ type: 'raidEnd', outcome });

    // ---------------------------------------------------------------- récompenses
    const rewards = { gold: 0, stone: 0, metal: 0, essence: 0, crystals: 0, darkEssence: 0 };
    const killsByClass = {};
    const itemSeeds = [];
    let kills = 0;
    let eliteKills = 0;
    let monsterXp = 0;
    const dropMult = 1 + (g.mods.get().dropChance || 0);
    const depth = depthMult(fnum);
    for (const h of heroes) {
      if (h.alive) continue;
      kills++;
      if (h.elite) eliteKills++;
      killsByClass[h.heroClass] = (killsByClass[h.heroClass] || 0) + 1;
      const c = ADVENTURERS[h.heroClass];
      const growth = Math.pow(RW.bountyGrowth, h.level - 1) * depth * (h.elite ? BALANCE.eliteRewardMult : 1);
      const loot = c.loot || {};
      rewards.gold += RW.bounty.gold * growth * (loot.gold || 1);
      rewards.stone += RW.bounty.stone * growth * (loot.stone || 1);
      rewards.metal += RW.bounty.metal * growth * (loot.metal || 1);
      rewards.essence += RW.bounty.essence * growth * (loot.essence || 1);
      if (rng.chance(RW.crystalDropChance * (loot.crystals || 1) * (h.elite ? 4 : 1))) rewards.crystals += 1 + Math.floor(fnum / 8);
      if (fnum >= RW.darkEssenceFromFloor && rng.chance(RW.darkEssenceChance * (loot.darkEssence || 1))) rewards.darkEssence += 1 + Math.floor(fnum / 10);
      if (rng.chance(RW.equipmentDropChance * dropMult * (h.elite ? 4 : 1))) itemSeeds.push(rng.int(1, 2 ** 30));
      monsterXp += RW.monsterXpPerKill * Math.pow(RW.monsterXpGrowth, h.level - 1) * (h.elite ? 2 : 1);
    }
    for (const k of Object.keys(rewards)) rewards[k] *= g.biomes.rewardMult(fi, k);
    const wiped = kills === heroes.length;
    let goldBonus = g.dungeon.rewardBonus(fi);
    for (const uid of participants) {
      const m = g.monsters.get(uid);
      if (m) goldBonus += g.monsters.computeStats(m).mods.goldBonus || 0;
    }
    if (wiped) for (const k of Object.keys(rewards)) rewards[k] *= 1 + RW.wipeBonus;
    const gained = g.economy.applyGainMods(rewards, goldBonus);
    for (const k of Object.keys(gained)) gained[k] = Math.floor(gained[k]);

    const xpMult = 1 + (g.mods.get().xpGain || 0);
    const nPart = Math.max(1, participants.size);
    const xpEach = Math.round((monsterXp * xpMult) / Math.sqrt(nPart));

    return {
      id: ++this.seq,
      floor: fi,
      seed,
      party: { name: party.name, level: party.level, size: heroes.length, classes: heroes.map((h) => h.heroClass) },
      outcome,
      duration: battle.t + 1,
      events: battle.events,
      rewards: gained,
      itemSeeds,
      kills,
      eliteKills,
      killsByClass,
      wiped,
      participants: [...participants],
      deadMonsters,
      xpEach,
      xpBonus,
      masterXp: Math.round(kills * RW.masterXpPerKill * (1 + fi * 0.5) * xpMult),
      battleStats: battle.stats,
    };
  }

  // ------------------------------------------------------------------ application
  apply(res, { silent = false, offline = false } = {}) {
    const g = this.game;
    const floor = g.dungeon.floor(res.floor);
    if (!floor) return null;
    const def = floorDef(res.floor + 1);
    g.economy.add(res.rewards);
    const items = [];
    for (const seed of res.itemSeeds) {
      const it = g.equipment.add(g.equipment.generate(new RNG(seed), { ilvl: res.floor + 1 }), { silent: true });
      if (it) items.push(it);
    }
    if (items.length) g.bus.emit('equipmentChanged');
    let levelUps = 0;
    for (const uid of res.participants) {
      const m = g.monsters.get(uid);
      if (m) levelUps += g.monsters.addXp(m, Math.round(res.xpEach * (res.xpBonus?.[uid] || 1) * xpLevelFactor(m.level, res.party.level)));
    }
    if (levelUps) g.bus.emit('monstersChanged');
    g.master.addXp(res.masterXp);

    const st = g.stats;
    st.add('raidsTotal', 1);
    st.add('adventurersKilled', res.kills);
    g.state.lifetime.adventurersKilled += res.kills;
    st.add('eliteKilled', res.eliteKills);
    st.add('trapTriggers', res.battleStats.trapTriggers);
    st.add('synergyTriggers', res.battleStats.synergyTriggers);
    st.add('critHits', res.battleStats.crits);
    for (const [cls, n] of Object.entries(res.killsByClass)) st.add(`kill_${cls}`, n);
    for (const cls of res.party.classes) g.codex.discover('adventurers', cls);

    let stolen = 0;
    if (res.outcome === 'looted') {
      st.add('raidsLost', 1);
      floor.raidsLost++;
      floor.threat = Math.max(0, floor.threat + R.threatPerLoss);
      const t = g.state.treasury;
      const theft = R.lootStealRatio * (1 - (g.mods.get().theftReduction || 0));
      stolen = Math.floor(Math.min(t.vault * Math.max(0.02, theft), t.vault * R.lootStealMax));
      t.vault -= stolen;
    } else {
      st.add('raidsDefended', 1);
      floor.raidsDefended++;
      floor.threat = Math.min(def.maxThreat, floor.threat + R.threatPerWin);
    }
    floor.lastRaidAt = Date.now();

    const summary = {
      t: Date.now(), floor: res.floor, outcome: res.outcome, party: res.party, kills: res.kills,
      rewards: res.rewards, items: items.length, stolen, offline,
    };
    if (!offline) {
      g.state.log.unshift(summary);
      if (g.state.log.length > R.historySize) g.state.log.length = R.historySize;
    }
    if (!silent) g.bus.emit('raidEnd', { result: res, summary, items, levelUps });
    g.requestSave();
    return { summary, items, levelUps };
  }

  // ------------------------------------------------------------------ boucle temps réel
  /** Appelé par GameCore à chaque frame. dt en secondes. */
  update(dt, now) {
    const g = this.game;
    const view = g.viewFloor;
    const speed = g.state.settings.speed || 1;
    for (let fi = 0; fi < g.state.floors.length; fi++) {
      const rt = this.rt(fi, now);
      const watched = fi === view && g.watching;
      if (rt.current) {
        // La scène de combat détaillée pilote elle-même le temps du raid qu'elle affiche
        if (!rt.locked) rt.elapsed += dt * (watched ? speed : 4);
        if (rt.elapsed >= rt.current.duration) {
          const res = rt.current;
          rt.current = null;
          this.apply(res);
        }
        continue;
      }
      if (now < rt.nextAt) continue;
      rt.nextAt = now + this.interval(fi) * 1000;
      if (!this.canRaid(fi)) continue;
      if (watched) {
        rt.current = this.simulate(fi, { record: true });
        rt.elapsed = 0;
        g.bus.emit('raidStart', { floor: fi, raid: rt.current });
      } else {
        this.apply(this.simulate(fi, { record: false }), { silent: false });
      }
    }
  }

  /** Un étage peut être attaqué s'il a un coffre relié à l'entrée. */
  canRaid(fi) {
    return this.game.dungeon.computeTour(fi).length > 0;
  }

  /** Termine immédiatement le raid affiché (changement d'étage, sauvegarde...). */
  flush(fi) {
    const rt = this.runtime[fi];
    if (rt?.current) {
      const res = rt.current;
      rt.current = null;
      this.apply(res);
    }
  }

  flushAll() {
    for (let i = 0; i < this.runtime.length; i++) this.flush(i);
  }

  current(fi) {
    return this.runtime[fi]?.current || null;
  }

  reset() {
    this.runtime = [];
  }
}
