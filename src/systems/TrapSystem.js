import { TRAPS, TRAP_SYNERGIES } from '../data/traps.js';
import { ROOMS } from '../data/rooms.js';
import { RESEARCH_MAP } from '../data/research.js';
import { ECONOMY } from '../config/economy.js';
import { levelMult } from '../config/balance.js';
import { floorEconomyScale, floorDef } from '../data/floors.js';
import { cellKey, DIRS4, scaleCost } from '../utils/helpers.js';

/** Pièges : placement, amélioration, statistiques et synergies de placement. */
export class TrapSystem {
  constructor(game) {
    this.game = game;
  }

  isUnlocked(trapId) {
    const t = TRAPS[trapId];
    if (!t) return false;
    if (!t.unlock) return true;
    return (this.game.state.research.levels[t.unlock.research] || 0) > 0;
  }

  unlockText(trapId) {
    const t = TRAPS[trapId];
    return t?.unlock?.research ? `Recherche : ${RESEARCH_MAP[t.unlock.research]?.name}` : '';
  }

  placeCost(fi, trapId) {
    const count = this.game.dungeon.roomCells(fi).filter((r) => r.cell.trap).length;
    return this.game.economy.applyCostMods(scaleCost(TRAPS[trapId].cost, floorEconomyScale(fi + 1) * Math.pow(1.1, count)));
  }

  upgradeCost(fi, trap) {
    const base = { ...TRAPS[trap.id].cost };
    delete base.crystals;
    delete base.darkEssence;
    return this.game.economy.applyCostMods(scaleCost(base, floorEconomyScale(fi + 1) * Math.pow(ECONOMY.traps.upgradeGrowth, trap.level) * 0.7));
  }

  sellValue(fi, trap) {
    const v = scaleCost(TRAPS[trap.id].cost, floorEconomyScale(fi + 1) * ECONOMY.traps.sellRefund);
    delete v.crystals;
    delete v.darkEssence;
    return v;
  }

  canPlace(fi, x, y, trapId) {
    const cell = this.game.dungeon.cell(fi, x, y);
    if (!cell) return { ok: false, reason: 'Aucune salle ici' };
    if (!ROOMS[cell.room].trapSlots) return { ok: false, reason: 'Cette salle n’accepte pas de piège.' };
    if (cell.trap) return { ok: false, reason: 'Un piège est déjà installé.' };
    if (!this.isUnlocked(trapId)) return { ok: false, reason: `Verrouillé (${this.unlockText(trapId)})` };
    const cost = this.placeCost(fi, trapId);
    if (!this.game.economy.canAfford(cost)) return { ok: false, reason: 'Ressources insuffisantes', cost };
    return { ok: true, cost };
  }

  place(fi, x, y, trapId) {
    const check = this.canPlace(fi, x, y, trapId);
    if (!check.ok) return check;
    this.game.economy.spend(check.cost);
    this.game.dungeon.cell(fi, x, y).trap = { id: trapId, level: 1 };
    this.game.codex.discover('traps', trapId);
    this.game.stats.add('trapsPlaced', 1);
    this.game.bus.emit('dungeonChanged', fi);
    this.game.bus.emit('sfx', 'trap_place');
    this.game.requestSave();
    return { ok: true };
  }

  canUpgrade(fi, x, y) {
    const cell = this.game.dungeon.cell(fi, x, y);
    if (!cell?.trap) return { ok: false, reason: 'Aucun piège' };
    if (cell.trap.level >= TRAPS[cell.trap.id].maxLevel) return { ok: false, reason: 'Niveau maximum' };
    const cost = this.upgradeCost(fi, cell.trap);
    if (!this.game.economy.canAfford(cost)) return { ok: false, reason: 'Ressources insuffisantes', cost };
    return { ok: true, cost };
  }

  upgrade(fi, x, y) {
    const check = this.canUpgrade(fi, x, y);
    if (!check.ok) return check;
    this.game.economy.spend(check.cost);
    this.game.dungeon.cell(fi, x, y).trap.level++;
    this.game.stats.add('trapUpgrades', 1);
    this.game.stats.add('upgrades', 1);
    this.game.bus.emit('dungeonChanged', fi);
    this.game.bus.emit('sfx', 'upgrade');
    this.game.requestSave();
    return { ok: true };
  }

  remove(fi, x, y) {
    const cell = this.game.dungeon.cell(fi, x, y);
    if (!cell?.trap) return { ok: false };
    this.game.economy.add(this.sellValue(fi, cell.trap), false);
    cell.trap = null;
    this.game.bus.emit('dungeonChanged', fi);
    this.game.requestSave();
    return { ok: true };
  }

  /** Éléments "présents" autour d'une case : élément de la salle et des pièges voisins. */
  elementsAround(fi, x, y) {
    const out = [];
    const f = this.game.dungeon.floor(fi);
    const here = f.cells[cellKey(x, y)];
    if (here && ROOMS[here.room].roomElement) out.push({ element: ROOMS[here.room].roomElement, source: 'room' });
    for (const [dx, dy] of DIRS4) {
      const n = f.cells[cellKey(x + dx, y + dy)];
      if (!n) continue;
      if (ROOMS[n.room].roomElement) out.push({ element: ROOMS[n.room].roomElement, source: 'room' });
      if (n.trap) out.push({ element: TRAPS[n.trap.id].element, trapId: n.trap.id, source: 'trap' });
    }
    return out;
  }

  /** Synergies actives pour le piège de la case (x,y). */
  synergiesAt(fi, x, y) {
    const cell = this.game.dungeon.cell(fi, x, y);
    if (!cell?.trap) return [];
    const t = TRAPS[cell.trap.id];
    const around = this.elementsAround(fi, x, y);
    const found = [];
    for (const syn of TRAP_SYNERGIES) {
      const matchSelf = (el, id) => (syn.trapA ? id === syn.trapA : el === syn.a);
      let ok = false;
      if (matchSelf(t.element, t.id) && around.some((a) => a.element === syn.b)) ok = true;
      if (t.element === syn.b && around.some((a) => (syn.trapA ? a.trapId === syn.trapA : a.element === syn.a))) ok = true;
      if (ok && !found.includes(syn)) found.push(syn);
    }
    return found;
  }

  /** Statistiques finales d'un piège pour le combat. */
  trapUnit(fi, x, y) {
    const cell = this.game.dungeon.cell(fi, x, y);
    if (!cell?.trap) return null;
    const t = TRAPS[cell.trap.id];
    const mods = this.game.mods.get();
    const synergies = this.synergiesAt(fi, x, y);
    const synPower = 1 + (mods.synergyPower || 0);
    let damage = t.damage * levelMult('trap', cell.trap.level) * (1 + mods.trapDamage);
    // Les pièges profonds suivent la résistance des aventuriers de l'étage
    damage *= Math.max(1, levelMult('adventurer', floorDef(fi + 1).level) * 0.5);
    const effects = t.effect ? [t.effect] : [];
    for (const s of synergies) {
      damage *= 1 + s.bonus.damage * synPower;
      for (const e of s.bonus.effects || []) effects.push(e);
    }
    return {
      trapId: t.id, name: t.name, cell: { x, y }, level: cell.trap.level + floorDef(fi + 1).level,
      damage: Math.round(damage), cooldown: Math.max(1, t.cooldown * (1 + mods.trapCooldown)),
      range: t.range, element: t.element, effects, synergies, effectBonus: mods.trapEffectChance || 0,
    };
  }
}
