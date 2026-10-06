import { BALANCE } from '../config/balance.js';
import { SKILLS } from '../data/skills.js';
import { STATUSES } from '../data/statuses.js';
import { ELEMENTS } from '../data/elements.js';
import { REACTIONS, AURA_DURATION, REACTION_COOLDOWN, COMBO_WINDOW, COMBO_TIERS, reactionKey } from '../data/reactions.js';

/**
 * COMBAT SYSTEM
 * -------------
 * Simulation déterministe en "temps réel simulé" (pas fixes). Totalement générique :
 * les unités, compétences, passifs, statuts et phases de boss viennent des données.
 * Ajouter un monstre ne nécessite jamais de modifier ce fichier.
 *
 * Côté 'A' = donjon (monstres + pièges), côté 'B' = aventuriers (ou boss).
 *
 * Unit def attendue :
 * { id, side, name, family, element, level, rarity, role, isBoss, phases,
 *   hp, atk, def, spd, crit, critDmg, basic, skills[], mods{}, sprite, palette }
 */

const C = BALANCE.combat;

/** Élément porté par certains statuts sans élément propre (pour les réactions). */
const STATUS_ELEMENT = { freeze: 'ice', slow: 'ice', shock: 'lightning', blind: 'shadow' };

export function elementMultiplier(attackEl, defendEl) {
  if (!attackEl || attackEl === 'neutral') return 1;
  const a = ELEMENTS[attackEl];
  if (a && a.strong.includes(defendEl)) return C.elementStrong;
  if (attackEl === defendEl) return C.elementSame;
  return 1;
}

export function makeUnit(def) {
  const mods = def.mods || {};
  return {
    ...def,
    maxHp: Math.max(1, Math.round(def.hp)),
    hp: Math.max(1, Math.round(def.hpCurrent ?? def.hp)),
    baseAtk: def.atk,
    baseDef: def.def,
    baseSpd: def.spd,
    crit: (def.crit ?? C.baseCrit) + (mods.crit || 0),
    critDmg: (def.critDmg ?? C.baseCritDamage) + (mods.critDmg || 0),
    alive: (def.hpCurrent ?? def.hp) > 0,
    gauge: 0,
    cds: {},
    statuses: [],
    usedUndying: false,
    phaseIndex: 0,
    statMult: { atk: 1, def: 1, spd: 1 },
    skills: (def.skills || []).slice(),
    mods,
  };
}

/** Instantané léger d'une unité pour le rendu. */
export function snapshotUnit(u) {
  return {
    id: u.id, side: u.side, name: u.name, family: u.family, element: u.element, level: u.level,
    rarity: u.rarity, maxHp: u.maxHp, hp: u.hp, sprite: u.sprite, isBoss: !!u.isBoss, elite: !!u.elite,
    heroClass: u.heroClass, monsterUid: u.monsterUid, size: u.size || 1, summoned: !!u.summoned,
  };
}

export class Battle {
  /**
   * @param {object} opts
   *  rng        RNG déterministe
   *  record     enregistrer les événements (pour l'affichage)
   *  events     tableau partagé d'événements (raids multi-salles)
   *  timeOffset décalage temporel des événements
   *  sideMods   { A: {critChance, elementPower, skillCooldown, bossDamage, elementDamage, healMult}, B: {...} }
   *             elementDamage : { fire: 0.5 } dégâts infligés par élément (règles de modes / biomes)
   *             healMult      : multiplicateur des soins reçus (0 = aucun soin)
   *             spdMult       : multiplicateur de vitesse (biome Glacier…)
   */
  constructor(opts) {
    this.rng = opts.rng;
    this.record = opts.record !== false;
    this.events = opts.events || [];
    this.timeOffset = opts.timeOffset || 0;
    this.sideMods = opts.sideMods || { A: {}, B: {} };
    this.units = [];
    this.traps = [];
    this.t = 0;
    this.stats = { crits: 0, trapTriggers: 0, synergyTriggers: 0, kills: [], damageA: 0, damageB: 0, reactions: 0, maxCombo: 0 };
    // Combo des monstres : coups enchaînés sans pause (V2). Les aventuriers n'en bénéficient pas.
    this.combo = { A: { count: 0, last: -99 } };
    this.summonSeq = 0;
  }

  emit(ev) {
    if (!this.record || this.events.length > C.maxEvents) return;
    ev.t = +(this.timeOffset + this.t).toFixed(2);
    this.events.push(ev);
  }

  addUnits(units) {
    for (const u of units) this.units.push(u);
  }

  side(side) {
    return this.units.filter((u) => u.side === side && u.alive);
  }

  enemiesOf(u) {
    return this.side(u.side === 'A' ? 'B' : 'A');
  }

  alliesOf(u) {
    return this.side(u.side);
  }

  // ------------------------------------------------------------------ stats effectives
  hasStatus(u, kind) {
    return u.statuses.some((s) => STATUSES[s.id].kind === kind);
  }

  effStat(u, stat) {
    let v = stat === 'atk' ? u.baseAtk : stat === 'def' ? u.baseDef : u.baseSpd;
    v *= u.statMult[stat] || 1;
    for (const s of u.statuses) {
      const d = STATUSES[s.id];
      if (d.kind === 'stat' && d.stat === stat) v *= d.mult;
    }
    if (stat === 'atk' && u.mods.enrage && u.hp / u.maxHp < 0.4) v *= 1 + u.mods.enrage;
    if (stat === 'spd') v *= this.sideMods[u.side]?.spdMult ?? 1;
    return v;
  }

  vulnerability(u) {
    let v = 0;
    for (const s of u.statuses) {
      const d = STATUSES[s.id];
      if (d.kind === 'vuln') v += s.power || 0.2;
      if (d.alsoVuln) v += d.alsoVuln;
    }
    return v;
  }

  missChance(u) {
    let m = 0;
    for (const s of u.statuses) if (STATUSES[s.id].kind === 'miss') m = Math.max(m, s.power || 0.3);
    return m;
  }

  // ------------------------------------------------------------------ mise en place
  start(roomStatuses = [], allyStatuses = []) {
    this.emit({ type: 'start', units: this.units.map(snapshotUnit) });
    // Auras
    for (const side of ['A', 'B']) {
      const team = this.side(side);
      let auraAtk = 0;
      let auraHp = 0;
      for (const u of team) {
        auraAtk += u.mods.auraAtk || 0;
        auraHp += u.mods.auraHp || 0;
      }
      for (const u of team) {
        if (u.started) {
          u.gauge = this.rng.range(0, 40);
          continue;
        }
        u.started = true;
        // Tactique de meute
        if (u.mods.packAtk) {
          const same = team.filter((o) => o !== u && o.family === u.family).length;
          u.statMult.atk *= 1 + u.mods.packAtk * same;
        }
        if (auraAtk) u.statMult.atk *= 1 + auraAtk;
        if (auraHp) {
          const ratio = u.hp / u.maxHp;
          u.maxHp = Math.round(u.maxHp * (1 + auraHp));
          u.hp = Math.round(u.maxHp * ratio);
        }
        if (u.mods.firstStrike) u.gauge = C.gaugeMax;
        else u.gauge = this.rng.range(0, 40);
        // Recharges initiales
        for (const sid of u.skills) {
          const sk = SKILLS[sid];
          if (!sk) continue;
          const cd = this.cooldownOf(u, sk);
          u.cds[sid] = this.t + (sk.initialCooldown ?? cd * 0.45);
        }
      }
    }
    // Effets de salle
    for (const st of roomStatuses) {
      for (const h of this.side('B')) this.applyStatus(null, h, st);
    }
    for (const st of allyStatuses) {
      for (const m of this.side('A')) this.applyStatus(null, m, st);
    }
  }

  cooldownOf(u, sk) {
    const mod = this.sideMods[u.side]?.skillCooldown || 0;
    return (sk.cooldown || 0) * (1 + mod);
  }

  // ------------------------------------------------------------------ boucle
  /** Lance le combat jusqu'à la fin. Retourne { winner, time }. */
  run(maxTime = 60) {
    const tick = C.tick;
    const end = this.t + maxTime;
    let nextStatusTick = this.t + C.statusTick;
    for (const trap of this.traps) trap.nextFire = Math.max(trap.nextFire, this.t + trap.cooldown * 0.3);
    let guard = 0;
    while (this.t < end && guard++ < 100000) {
      this.t += tick;
      if (this.t >= nextStatusTick) {
        nextStatusTick += C.statusTick;
        this.tickStatuses();
        const w = this.checkWinner();
        if (w) return this.finish(w);
      }
      // Pièges
      for (const trap of this.traps) {
        if (this.t >= trap.nextFire) {
          trap.nextFire = this.t + trap.cooldown;
          this.trapStrike(trap);
          const w = this.checkWinner();
          if (w) return this.finish(w);
        }
      }
      // Unités
      for (const u of this.units) {
        if (!u.alive) continue;
        if (this.hasStatus(u, 'stun')) continue;
        u.gauge += this.effStat(u, 'spd') * tick * C.gaugeRate;
        if (u.gauge >= C.gaugeMax) {
          u.gauge -= C.gaugeMax;
          this.act(u);
          const w = this.checkWinner();
          if (w) return this.finish(w);
        }
      }
    }
    return this.finish('timeout');
  }

  checkWinner() {
    const a = this.units.some((u) => u.side === 'A' && u.alive);
    const b = this.units.some((u) => u.side === 'B' && u.alive);
    if (!b) return 'A';
    if (!a) return 'B';
    return null;
  }

  finish(winner) {
    this.emit({ type: 'end', winner });
    // Nettoyage des statuts temporaires (les PV restent)
    for (const u of this.units) u.statuses = [];
    return { winner, time: this.t };
  }

  /** Fait avancer uniquement les statuts (ex : poison pendant la marche dans le donjon). */
  advanceStatuses(seconds) {
    let elapsed = 0;
    while (elapsed + C.statusTick <= seconds + 1e-6) {
      elapsed += C.statusTick;
      this.t += C.statusTick;
      this.tickStatuses();
    }
    this.t += seconds - elapsed;
  }

  tickStatuses() {
    for (const u of this.units) {
      if (!u.alive) continue;
      // Régénération passive
      if (u.mods.regen) this.heal(null, u, u.maxHp * u.mods.regen, true);
      for (const s of u.statuses) {
        const d = STATUSES[s.id];
        if (d.kind === 'dot') {
          const dmg = Math.max(1, Math.round((s.srcAtk || 10) * (s.power || 0.2) * (s.stacks || 1)));
          this.dealRaw(s.srcUnit, u, dmg, { dot: true, statusId: s.id, element: d.element });
          if (!u.alive) break;
        } else if (d.kind === 'hot') {
          this.heal(null, u, u.maxHp * (s.power || 0.02), true);
        }
      }
      u.statuses = u.statuses.filter((s) => s.until > this.t);
    }
  }

  // ------------------------------------------------------------------ actions
  pickSkill(u) {
    for (const sid of u.skills) {
      const sk = SKILLS[sid];
      if (!sk || sk.basic) continue;
      if ((u.cds[sid] || 0) > this.t) continue;
      if (sk.condition === 'allyHurt' && !this.alliesOf(u).some((a) => a.hp / a.maxHp < 0.75)) continue;
      if (sk.condition === 'selfHurt' && u.hp / u.maxHp > 0.65) continue;
      return sid;
    }
    return u.basic || 'basic_melee';
  }

  pickTargets(u, sk) {
    const enemies = this.enemiesOf(u);
    const allies = this.alliesOf(u);
    switch (sk.target) {
      case 'self':
        return [u];
      case 'allies':
        return allies;
      case 'lowestAlly':
        return allies.length ? [allies.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b))] : [];
      case 'enemies':
        return enemies;
      case 'lowestEnemy':
        return enemies.length ? [enemies.reduce((a, b) => (a.hp <= b.hp ? a : b))] : [];
      case 'highestEnemy':
        return enemies.length ? [enemies.reduce((a, b) => (a.atk * (a.rarityRank || 1) >= b.atk * (b.rarityRank || 1) ? a : b))] : [];
      case 'randomEnemies': {
        const n = Math.min(sk.count || 2, enemies.length);
        return this.rng.shuffle(enemies).slice(0, n);
      }
      case 'enemy':
      default: {
        if (!enemies.length) return [];
        // Pondération : les tanks attirent l'attention
        const w = enemies.map((e) => [e, e.role === 'tank' ? C.tauntWeightTank : 1]);
        return [this.rng.weighted(w)];
      }
    }
  }

  act(u) {
    const sid = this.pickSkill(u);
    const sk = SKILLS[sid] || SKILLS.basic_melee;
    if (!sk.basic) u.cds[sid] = this.t + this.cooldownOf(u, sk);
    const targets = this.pickTargets(u, sk);
    if (!targets.length) return;
    const element = sk.element || u.element || 'neutral';
    this.emit({ type: 'act', src: u.id, skill: sid, targets: targets.map((x) => x.id), fx: sk.fx, element, basic: !!sk.basic });

    const hits = sk.hits || 1;
    for (const tgt of targets) {
      if (sk.power) {
        for (let h = 0; h < hits && tgt.alive; h++) this.attack(u, tgt, sk, element);
        if (sk.basic && u.mods.splash && u.alive) {
          const others = this.enemiesOf(u).filter((e) => e !== tgt);
          if (others.length) this.attack(u, this.rng.pick(others), { ...sk, power: sk.power * u.mods.splash, splash: true }, element);
        }
      }
      if (sk.heal) this.heal(u, tgt, this.effStat(u, 'atk') * sk.heal);
      if (sk.healMaxHp) this.heal(u, tgt, tgt.maxHp * sk.healMaxHp);
      if (sk.statuses && tgt.alive) {
        for (const st of sk.statuses) {
          const target = st.self ? u : tgt;
          this.applyStatus(u, target, st);
        }
      }
    }
  }

  attack(src, tgt, sk, element) {
    if (!tgt.alive) return;
    // Esquive / aveuglement
    const dodge = (tgt.mods.dodge || 0) * (1 - Math.min(1, src.mods.trueSight || 0));
    if (this.rng.chance(dodge) || this.rng.chance(this.missChance(src))) {
      this.emit({ type: 'miss', src: src.id, tgt: tgt.id });
      return;
    }
    const sideMod = this.sideMods[src.side] || {};
    let dmg = this.effStat(src, 'atk') * sk.power * this.rng.range(1 - C.variance, 1 + C.variance);
    let em = elementMultiplier(element, tgt.element);
    if (em > 1) em += sideMod.elementPower || 0;
    dmg *= em;
    const def = this.effStat(tgt, 'def') * (1 - Math.min(0.9, (sk.pierce || 0) + (src.mods.pierce || 0)));
    const reduction = def / (def + C.defenseConstant + C.defensePerLevel * (src.level || 1));
    dmg *= 1 - reduction;
    dmg *= 1 + (src.mods.damageBonus || 0);
    if (src.mods.bonusVs && tgt.rarity && src.mods.bonusVs[tgt.rarity]) dmg *= 1 + src.mods.bonusVs[tgt.rarity];
    if (tgt.isBoss && sideMod.bossDamage) dmg *= 1 + sideMod.bossDamage;
    if (sideMod.elementDamage?.[element]) dmg *= 1 + sideMod.elementDamage[element];
    if (sk.execute && tgt.hp / tgt.maxHp < 0.3) dmg *= 1 + sk.execute;
    dmg *= 1 + this.vulnerability(tgt);
    dmg *= 1 - Math.min(0.75, tgt.mods.damageReduction || 0);
    // Résistances élémentaires (mutations, biomes…)
    if (tgt.mods.resist?.[element]) dmg *= 1 - Math.min(0.6, tgt.mods.resist[element]);
    dmg *= 1 + this.comboBonus(src.side);
    let crit = false;
    if (this.rng.chance(src.crit + (sideMod.critChance || 0))) {
      crit = true;
      dmg *= src.critDmg;
      this.stats.crits += src.side === 'A' ? 1 : 0;
    }
    dmg = Math.max(1, Math.round(dmg));
    const dealt = this.dealRaw(src, tgt, dmg, { crit, element, eff: em > 1 ? 'strong' : em < 1 ? 'weak' : null });
    this.countHit(src.side);
    if (dealt > 0 && tgt.alive) this.elementHit(src, tgt, element);

    // Vol de vie
    const ls = (sk.lifesteal || 0) + (src.mods.lifesteal || 0);
    if (ls > 0 && src.alive && dealt > 0) this.heal(src, src, dealt * ls, true);
    // Épines
    if (tgt.mods.thorns && src.alive && dealt > 0) {
      this.dealRaw(tgt, src, Math.max(1, Math.round(dealt * tgt.mods.thorns)), { thorns: true, element: 'neutral' });
    }
    // Effet à l'impact
    if (sk.basic && src.mods.onHit && tgt.alive) {
      const oh = src.mods.onHit;
      this.applyStatus(src, tgt, { id: oh.status, chance: oh.chance, duration: oh.duration, power: oh.power });
    }
  }

  /** Inflige des dégâts déjà calculés (gère bouclier, mort, renaissance, phases). */
  dealRaw(src, tgt, amount, info = {}) {
    if (!tgt.alive) return 0;
    let dmg = amount;
    const shield = tgt.statuses.find((s) => s.id === 'shield');
    let absorbed = 0;
    if (shield) {
      absorbed = Math.min(shield.amount, dmg);
      shield.amount -= absorbed;
      dmg -= absorbed;
      if (shield.amount <= 0) tgt.statuses = tgt.statuses.filter((s) => s !== shield);
    }
    // Dégâts d'environnement (pièges et leurs statuts) sur un aventurier : plafonnés sur l'ensemble du raid
    if (!src && tgt.side === 'B' && C.trapMaxHpShare < 1) {
      const room = Math.max(0, tgt.maxHp * C.trapMaxHpShare - (tgt.envDamage || 0));
      dmg = Math.min(dmg, Math.floor(room));
      tgt.envDamage = (tgt.envDamage || 0) + dmg;
    }
    tgt.hp = Math.max(0, tgt.hp - dmg);
    if (src && src.side === 'A') this.stats.damageA += dmg;
    else if (src) this.stats.damageB += dmg;
    this.emit({
      type: 'dmg', src: src ? src.id : null, tgt: tgt.id, amount: dmg, absorbed, hp: tgt.hp,
      crit: !!info.crit, element: info.element, dot: !!info.dot, reaction: info.reaction, statusId: info.statusId, eff: info.eff, trap: info.trap, thorns: !!info.thorns,
    });
    if (tgt.hp <= 0) {
      if (tgt.mods.undying && !tgt.usedUndying) {
        tgt.usedUndying = true;
        tgt.hp = Math.round(tgt.maxHp * tgt.mods.undying);
        tgt.statuses = [];
        this.emit({ type: 'revive', tgt: tgt.id, hp: tgt.hp });
      } else {
        tgt.alive = false;
        tgt.statuses = [];
        this.stats.kills.push({ id: tgt.id, by: src ? src.id : null, side: tgt.side });
        this.emit({ type: 'death', tgt: tgt.id });
      }
    } else if (tgt.phases) {
      this.checkPhase(tgt);
    }
    return dmg;
  }

  heal(src, tgt, amount, silent = false) {
    if (!tgt.alive) return 0;
    const boost = src ? 1 + (src.mods.healBoost || 0) : 1;
    const hm = this.sideMods[tgt.side]?.healMult;
    const value = Math.round(amount * boost * (hm ?? 1));
    if (value <= 0) return 0;
    const before = tgt.hp;
    tgt.hp = Math.min(tgt.maxHp, tgt.hp + value);
    const healed = tgt.hp - before;
    if (healed > 0 && (!silent || healed >= tgt.maxHp * 0.04)) this.emit({ type: 'heal', src: src ? src.id : null, tgt: tgt.id, amount: healed, hp: tgt.hp });
    return healed;
  }

  applyStatus(src, tgt, st) {
    if (!tgt.alive || !STATUSES[st.id]) return;
    if (st.chance !== undefined && !this.rng.chance(st.chance + (st.bonusChance || 0))) return;
    const d = STATUSES[st.id];
    const duration = st.duration || 4;
    const existing = tgt.statuses.find((s) => s.id === st.id);
    const srcAtk = src ? this.effStat(src, 'atk') : st.srcAtk || 10;
    if (existing) {
      existing.until = Math.max(existing.until, this.t + duration);
      if (d.maxStacks && (existing.stacks || 1) < d.maxStacks) existing.stacks = (existing.stacks || 1) + 1;
      if (d.kind === 'shield') existing.amount = Math.max(existing.amount, tgt.maxHp * (st.power || 0.1));
      existing.srcAtk = Math.max(existing.srcAtk || 0, srcAtk);
    } else {
      const s = { id: st.id, until: this.t + duration, power: st.power, stacks: 1, srcAtk, srcUnit: src };
      if (d.kind === 'shield') s.amount = tgt.maxHp * (st.power || 0.1);
      tgt.statuses.push(s);
    }
    const cur = tgt.statuses.find((x) => x.id === st.id);
    this.emit({ type: 'status', tgt: tgt.id, id: st.id, dur: +((cur ? cur.until : this.t + duration) - this.t).toFixed(2) });
    const el = d.element || STATUS_ELEMENT[st.id];
    if (el && tgt.alive) this.elementHit(src, tgt, el, srcAtk);
  }

  // ------------------------------------------------------------------ réactions et combos (V2)
  comboBonus(side) {
    const c = this.combo[side];
    if (!c || this.t - c.last > COMBO_WINDOW) return 0;
    let b = 0;
    for (const tier of COMBO_TIERS) if (c.count >= tier.hits) b = tier.bonus;
    return b;
  }

  countHit(side) {
    const c = this.combo[side];
    if (!c) return;
    c.count = this.t - c.last <= COMBO_WINDOW ? c.count + 1 : 1;
    c.last = this.t;
    if (side === 'A') this.stats.maxCombo = Math.max(this.stats.maxCombo, c.count);
    const tier = COMBO_TIERS.find((x) => x.hits === c.count);
    if (tier) this.emit({ type: 'combo', side, count: c.count, name: tier.name, bonus: tier.bonus });
  }

  /** Aura élémentaire : un second élément différent déclenche une réaction. */
  elementHit(src, tgt, element, srcAtk = null) {
    if (!element || element === 'neutral' || this.inReaction) return;
    const aura = tgt.aura;
    if (aura && aura.until > this.t && aura.element !== element && this.t >= (tgt.reactionReady || 0)) {
      const r = REACTIONS[reactionKey(aura.element, element)];
      if (r) {
        tgt.aura = null;
        tgt.reactionReady = this.t + REACTION_COOLDOWN;
        this.triggerReaction(r, reactionKey(aura.element, element), src, tgt, srcAtk);
        return;
      }
    }
    tgt.aura = { element, until: this.t + AURA_DURATION };
  }

  triggerReaction(r, id, src, tgt, srcAtk = null) {
    this.inReaction = true;
    this.stats.reactions++;
    const sideMod = (src && this.sideMods[src.side]) || {};
    const atk = src ? this.effStat(src, 'atk') : srcAtk || 10;
    const power = 1 + (sideMod.elementPower || 0) + (src?.mods.reactionPower || 0);
    this.emit({ type: 'reaction', id, name: r.name, icon: r.icon, color: r.color, src: src ? src.id : null, tgt: tgt.id });
    if (r.burst) {
      const dmg = Math.max(1, Math.round(atk * r.burst * power * (1 - Math.min(0.75, tgt.mods.damageReduction || 0))));
      this.dealRaw(src, tgt, dmg, { element: 'neutral', reaction: id });
      if (r.splash) {
        for (const o of this.side(tgt.side)) if (o !== tgt) this.dealRaw(src, o, Math.max(1, Math.round(dmg * r.splash)), { element: 'neutral', reaction: id });
      }
    }
    const targets = r.spread ? this.side(tgt.side) : [tgt];
    for (const t of targets) for (const st of r.statuses || []) if (t.alive) this.applyStatus(src, t, { ...st, srcAtk: atk });
    this.inReaction = false;
  }

  checkPhase(u) {
    const phase = u.phases[u.phaseIndex];
    if (!phase || u.hp / u.maxHp > phase.hpBelow) return;
    u.phaseIndex++;
    if (phase.statMult) {
      for (const [k, v] of Object.entries(phase.statMult)) u.statMult[k] = (u.statMult[k] || 1) * v;
    }
    if (phase.addSkills) {
      for (const s of phase.addSkills) {
        if (!u.skills.includes(s)) {
          u.skills.unshift(s);
          u.cds[s] = this.t + 1.5;
        }
      }
    }
    if (phase.heal) this.heal(null, u, u.maxHp * phase.heal);
    u.statuses = u.statuses.filter((s) => STATUSES[s.id].kind !== 'stun');
    this.emit({ type: 'phase', tgt: u.id, name: phase.name, msg: phase.msg, index: u.phaseIndex });
    if (phase.summon) {
      for (const sm of phase.summon) {
        for (let i = 0; i < (sm.count || 1); i++) {
          const unit = makeUnit({
            id: `${u.id}_s${++this.summonSeq}`, side: u.side, name: sm.name, family: sm.family, element: sm.element,
            level: u.level, rarity: u.rarity, role: 'dps', summoned: true,
            hp: u.maxHp * (sm.hp || 0.1), atk: u.baseAtk * (sm.atk || 0.5), def: u.baseDef * (sm.def || 0.5), spd: u.baseSpd * (sm.spd || 1),
            basic: sm.basic || 'basic_melee', skills: sm.skills || [], mods: {}, palette: sm.palette, sprite: sm.sprite || `summon_${sm.family}`,
          });
          unit.gauge = 50;
          this.units.push(unit);
          this.emit({ type: 'summon', unit: snapshotUnit(unit), by: u.id });
        }
      }
    }
  }

  // ------------------------------------------------------------------ pièges
  /**
   * trap = { id, cell, trapId, name, damage, cooldown, range, element, effects[], synergies[], nextFire }
   */
  addTrap(trap) {
    this.traps.push({ ...trap, nextFire: trap.nextFire ?? trap.cooldown * 0.3 });
  }

  trapStrike(trap) {
    const heroes = this.side('B');
    if (!heroes.length) return;
    const targets = trap.range >= heroes.length ? heroes : this.rng.shuffle(heroes).slice(0, trap.range);
    const synergy = trap.synergies && trap.synergies.length ? trap.synergies : null;
    this.stats.trapTriggers++;
    if (synergy) this.stats.synergyTriggers += synergy.length;
    this.emit({ type: 'trap', trap: trap.trapId, cell: trap.cell, targets: targets.map((x) => x.id), synergy: synergy ? synergy.map((s) => s.id) : null, element: trap.element });
    for (const tgt of targets) {
      // Les pièges ignorent la moitié de la défense
      const def = this.effStat(tgt, 'def') * 0.5;
      const reduction = def / (def + C.defenseConstant + C.defensePerLevel * (trap.level || 1));
      let dmg = trap.damage * this.rng.range(0.9, 1.1) * (1 - reduction);
      dmg *= elementMultiplier(trap.element, tgt.element);
      dmg *= 1 + this.vulnerability(tgt);
      dmg *= 1 - Math.min(0.75, tgt.mods.damageReduction || 0);
      dmg = Math.max(1, Math.round(dmg));
      this.dealRaw(null, tgt, dmg, { trap: trap.trapId, element: trap.element });
      if (tgt.alive) {
        for (const ef of trap.effects || []) {
          this.applyStatus(null, tgt, { ...ef, srcAtk: trap.damage, bonusChance: trap.effectBonus || 0 });
        }
      }
    }
  }
}

/** Utilitaire : combat complet en une fois. */
export function simulateBattle({ rng, sideA, sideB, traps = [], record = true, maxTime = 60, sideMods, roomStatuses = [], allyStatuses = [], timeOffset = 0, events }) {
  const battle = new Battle({ rng, record, sideMods, timeOffset, events });
  battle.addUnits(sideA);
  battle.addUnits(sideB);
  for (const t of traps) battle.addTrap(t);
  battle.start(roomStatuses, allyStatuses);
  const result = battle.run(maxTime);
  return { ...result, events: battle.events, stats: battle.stats, units: battle.units };
}
