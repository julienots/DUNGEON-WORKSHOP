import { MONSTER_MAP, EVOLUTION_RULES, getSpecies } from '../data/monsters.js';
import { PASSIVES } from '../data/passives.js';
import { ROOMS } from '../data/rooms.js';
import { EQUIP_EFFECTS } from '../data/equipment.js';
import { BALANCE, levelMult } from '../config/balance.js';
import { ECONOMY } from '../config/economy.js';
import { RARITIES } from '../utils/constants.js';
import { scaleCost } from '../utils/helpers.js';

/** Fusionne des sacs de mods de passifs (additif, onHit : le plus fort l'emporte). */
export function mergeMods(...list) {
  const out = {};
  for (const m of list) {
    if (!m) continue;
    for (const [k, v] of Object.entries(m)) {
      if (k === 'onHit') {
        if (!out.onHit || (v.chance || 0) > (out.onHit.chance || 0)) out.onHit = v;
      } else if (k === 'bonusVs') {
        out.bonusVs = { ...(out.bonusVs || {}), ...v };
      } else if (typeof v === 'boolean') {
        out[k] = out[k] || v;
      } else if (k === 'undying') {
        out[k] = Math.max(out[k] || 0, v);
      } else {
        out[k] = (out[k] || 0) + v;
      }
    }
  }
  return out;
}

export class MonsterSystem {
  constructor(game) {
    this.game = game;
  }

  get list() {
    return this.game.state.monsters;
  }

  get(uid) {
    return this.list.find((m) => m.uid === uid);
  }

  species(m) {
    return getSpecies(m.speciesId);
  }

  rosterLimit() {
    return ECONOMY.monsters.maxRosterBase + (this.game.mods.get().rosterSize || 0);
  }

  maxLevel(m) {
    const sp = this.species(m);
    return BALANCE.rarityMaxLevel[sp.rarity] + (this.game.mods.get().levelCap || 0);
  }

  // ------------------------------------------------------------------ création
  create(speciesId, { silent = false, level = 1 } = {}) {
    if (!MONSTER_MAP[speciesId]) throw new Error(`Espèce inconnue: ${speciesId}`);
    const s = this.game.state;
    const m = { uid: `m${s.uidSeq++}`, speciesId, level, xp: 0, equipment: {}, location: null, favorite: false, obtainedAt: Date.now() };
    s.monsters.push(m);
    this.game.stats.add('monstersOwnedTotal', 1);
    this.game.codex.discover('monsters', speciesId);
    if (!silent) this.game.bus.emit('monstersChanged');
    return m;
  }

  release(uid) {
    const m = this.get(uid);
    if (!m) return { ok: false, reason: 'Monstre introuvable' };
    if (this.list.length <= 1) return { ok: false, reason: 'Vous devez garder au moins un monstre.' };
    for (const itemUid of Object.values(m.equipment)) {
      const it = this.game.equipment.get(itemUid);
      if (it) it.equippedBy = null;
    }
    const refund = scaleCost(ECONOMY.monsters.releaseRefund, 1 + m.level * 0.5 + RARITIES.indexOf(this.species(m).rarity) * 3);
    this.game.state.monsters = this.list.filter((x) => x.uid !== uid);
    this.game.economy.add(refund, false);
    this.game.bus.emit('monstersChanged');
    this.game.bus.emit('dungeonChanged', m.location?.floor);
    return { ok: true, refund };
  }

  // ------------------------------------------------------------------ statistiques
  /**
   * Statistiques finales d'un monstre. `room` (optionnel) = { roomId, level } pour les bonus de salle.
   */
  computeStats(m, room = null) {
    const sp = this.species(m);
    const mods = this.game.mods.get();
    const lm = levelMult('monster', m.level);
    let hp = sp.hp * lm;
    let atk = sp.attack * lm;
    let def = sp.defense * lm;
    let spd = sp.speed * (1 + (m.level - 1) * 0.004);
    let crit = BALANCE.combat.baseCrit;
    let flat = { hp: 0, attack: 0, defense: 0, speed: 0, crit: 0, lifesteal: 0, attackPct: 0, hpPct: 0 };
    const equipMods = [];

    for (const itemUid of Object.values(m.equipment || {})) {
      const it = this.game.equipment.get(itemUid);
      if (!it) continue;
      const st = this.game.equipment.itemStats(it);
      for (const [k, v] of Object.entries(st)) flat[k] = (flat[k] || 0) + v;
      if (it.effect && EQUIP_EFFECTS[it.effect]) equipMods.push(EQUIP_EFFECTS[it.effect].mods);
    }
    hp = (hp + flat.hp) * (1 + flat.hpPct);
    atk = (atk + flat.attack) * (1 + flat.attackPct);
    def += flat.defense;
    spd += flat.speed;
    crit += flat.crit + (mods.critChance || 0);

    hp *= 1 + mods.monsterHp;
    atk *= 1 + mods.monsterAtk;
    def *= 1 + mods.monsterDef;
    spd *= 1 + mods.monsterSpd;

    const eb = mods.elementBoost?.[sp.element];
    if (eb) {
      hp *= 1 + eb;
      atk *= 1 + eb;
    }

    if (room) {
      const rd = ROOMS[room.roomId];
      if (rd) {
        if (rd.levelStat) {
          const bonus = BALANCE.roomLevelBonus(room.level);
          if (rd.levelStat === 'hp') hp *= 1 + bonus;
          else if (rd.levelStat === 'atk') atk *= 1 + bonus * 0.6;
          else if (rd.levelStat === 'def') def *= 1 + bonus * 0.8;
        }
        if (rd.elementBonus && rd.elementBonus.element === sp.element) {
          const lvlMult = 1 + 0.02 * (room.level - 1);
          hp *= 1 + rd.elementBonus.hp * lvlMult;
          atk *= 1 + rd.elementBonus.atk * lvlMult;
        }
      }
    }

    const passive = PASSIVES[sp.passive]?.mods || {};
    const combined = mergeMods(passive, ...equipMods, flat.lifesteal ? { lifesteal: flat.lifesteal } : null);
    return {
      hp: Math.round(hp), atk: Math.round(atk), def: Math.round(def), spd: +spd.toFixed(1), crit,
      mods: combined,
      power: Math.round(hp * 0.25 + atk * 2 + def * 1.5 + spd * 4),
    };
  }

  power(m) {
    return this.computeStats(m).power;
  }

  /** Construit une unité de combat. */
  toUnit(m, room = null, idPrefix = '') {
    const sp = this.species(m);
    const st = this.computeStats(m, room);
    return {
      id: `${idPrefix}${m.uid}`, side: 'A', name: sp.name, family: sp.family, element: sp.element, level: m.level,
      rarity: sp.rarity, rarityRank: RARITIES.indexOf(sp.rarity) + 1, role: sp.role,
      hp: st.hp, atk: st.atk, def: st.def, spd: st.spd, crit: st.crit,
      basic: sp.basic, skills: sp.skills, mods: st.mods, sprite: `mon_${sp.id}`, monsterUid: m.uid, size: sp.size,
    };
  }

  // ------------------------------------------------------------------ niveaux
  levelUpCost(m) {
    const sp = this.species(m);
    const rarityMult = 1 + RARITIES.indexOf(sp.rarity) * 0.35;
    const base = scaleCost(ECONOMY.monsters.levelUpCost, Math.pow(ECONOMY.monsters.levelUpGrowth, m.level - 1) * rarityMult);
    let cost = this.game.economy.applyCostMods(base, 'levelCost');
    // Laboratoire : -10% par labo construit (max -30%)
    const labs = this.game.dungeon.countRooms('lab');
    if (labs > 0) cost = scaleCost(cost, 1 - Math.min(0.3, labs * 0.1));
    return cost;
  }

  xpToNext(m) {
    return Math.round(ECONOMY.monsters.xpToLevel * Math.pow(ECONOMY.monsters.xpGrowth, m.level - 1));
  }

  canLevelUp(m) {
    if (m.level >= this.maxLevel(m)) return { ok: false, reason: 'Niveau maximum atteint (évoluez !)' };
    const cost = this.levelUpCost(m);
    if (!this.game.economy.canAfford(cost)) return { ok: false, reason: 'Ressources insuffisantes', cost };
    return { ok: true, cost };
  }

  levelUp(uid) {
    const m = this.get(uid);
    if (!m) return { ok: false };
    const check = this.canLevelUp(m);
    if (!check.ok) return check;
    this.game.economy.spend(check.cost);
    m.level++;
    m.xp = 0;
    this.game.stats.add('monsterLevelUps', 1);
    this.game.stats.add('upgrades', 1);
    this.game.bus.emit('monstersChanged');
    this.game.bus.emit('sfx', 'levelup');
    this.game.requestSave();
    return { ok: true };
  }

  /** Ajoute de l'XP de combat (peut faire monter plusieurs niveaux, gratuitement). */
  addXp(m, amount) {
    if (!m || m.level >= this.maxLevel(m)) return 0;
    m.xp += amount;
    let gained = 0;
    while (m.level < this.maxLevel(m) && m.xp >= this.xpToNext(m)) {
      m.xp -= this.xpToNext(m);
      m.level++;
      gained++;
    }
    if (m.level >= this.maxLevel(m)) m.xp = 0;
    if (gained) this.game.stats.add('monsterLevelUps', gained);
    return gained;
  }

  // ------------------------------------------------------------------ évolution
  evolutionOptions(m) {
    const sp = this.species(m);
    return sp.evolutions.map((e) => this.evolutionCheck(m, e));
  }

  evolutionCheck(m, evo) {
    const target = getSpecies(evo.to);
    const rule = EVOLUTION_RULES[target.rarity] || EVOLUTION_RULES.rare;
    const cost = this.game.economy.applyCostMods(rule.cost, 'evolveCost');
    const reasons = [];
    if (m.level < rule.level) reasons.push(`Niveau ${rule.level} requis`);
    if (this.game.dungeon.countRooms('lab') === 0) reasons.push('Un Laboratoire est requis');
    if (evo.extra?.roomLevel) {
      const { room, level } = evo.extra.roomLevel;
      const loc = m.location;
      const cell = loc ? this.game.dungeon.cell(loc.floor, loc.x, loc.y) : null;
      if (!cell || cell.room !== room || cell.level < level) reasons.push(`Doit être placé dans une ${ROOMS[room].name} niveau ${level}`);
    }
    if (!this.game.economy.canAfford(cost)) reasons.push('Ressources insuffisantes');
    return { to: evo.to, target, cost, levelRequired: rule.level, ok: reasons.length === 0, reasons };
  }

  evolve(uid, toId) {
    const m = this.get(uid);
    if (!m) return { ok: false, reason: 'Monstre introuvable' };
    const evo = this.species(m).evolutions.find((e) => e.to === toId);
    if (!evo) return { ok: false, reason: 'Évolution impossible' };
    const check = this.evolutionCheck(m, evo);
    if (!check.ok) return { ok: false, reason: check.reasons[0] };
    this.game.economy.spend(check.cost);
    m.speciesId = toId;
    this.game.codex.discover('monsters', toId);
    this.game.stats.add('evolutions', 1);
    this.game.bus.emit('monstersChanged');
    this.game.bus.emit('dungeonChanged', m.location?.floor);
    this.game.bus.emit('sfx', 'evolve');
    this.game.requestSave();
    return { ok: true, species: getSpecies(toId) };
  }

  // ------------------------------------------------------------------ placement
  monstersAt(floor, x, y) {
    return this.list.filter((m) => m.location && m.location.floor === floor && m.location.x === x && m.location.y === y);
  }

  assign(uid, floor, x, y) {
    const m = this.get(uid);
    if (!m) return { ok: false, reason: 'Monstre introuvable' };
    const cell = this.game.dungeon.cell(floor, x, y);
    if (!cell) return { ok: false, reason: 'Aucune salle ici' };
    const rd = ROOMS[cell.room];
    const sp = this.species(m);
    if (rd.guardianOnly && !sp.guardian) return { ok: false, reason: 'Seul un gardien (boss vaincu) peut occuper l’Antre.' };
    if (!rd.guardianOnly && sp.guardian) return { ok: false, reason: 'Les gardiens doivent être placés dans l’Antre du gardien.' };
    const cap = this.game.dungeon.roomCapacity(cell);
    const occupants = this.monstersAt(floor, x, y).filter((o) => o.uid !== uid);
    if (occupants.length >= cap) return { ok: false, reason: cap === 0 ? 'Cette salle n’accueille pas de monstres.' : 'Salle pleine' };
    const prev = m.location;
    m.location = { floor, x, y };
    this.game.bus.emit('monstersChanged');
    this.game.bus.emit('dungeonChanged', floor);
    if (prev && prev.floor !== floor) this.game.bus.emit('dungeonChanged', prev.floor);
    this.game.requestSave();
    return { ok: true };
  }

  unassign(uid) {
    const m = this.get(uid);
    if (!m || !m.location) return;
    const f = m.location.floor;
    m.location = null;
    this.game.bus.emit('monstersChanged');
    this.game.bus.emit('dungeonChanged', f);
    this.game.requestSave();
  }

  /** Réinitialisation lors d'une Ascension : retour au niveau 1, retrait du donjon. */
  resetForAscension() {
    for (const m of this.list) {
      m.level = 1;
      m.xp = 0;
      m.location = null;
    }
  }
}
