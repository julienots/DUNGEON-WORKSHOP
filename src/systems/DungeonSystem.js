import { ROOMS } from '../data/rooms.js';
import { RESEARCH_MAP } from '../data/research.js';
import { floorDef } from '../data/floors.js';
import { ECONOMY } from '../config/economy.js';
import { cellKey, parseCellKey, DIRS4, scaleCost } from '../utils/helpers.js';
import { createFloorState } from '../core/GameState.js';

/**
 * Gestion de la grille du donjon : construction, amélioration, déplacement, suppression,
 * agrandissement, étages, chemin des aventuriers.
 */
export class DungeonSystem {
  constructor(game) {
    this.game = game;
  }

  get floors() {
    return this.game.state.floors;
  }

  floor(fi) {
    return this.floors[fi];
  }

  def(fi) {
    return floorDef(fi + 1);
  }

  cell(fi, x, y) {
    const f = this.floor(fi);
    return f ? f.cells[cellKey(x, y)] || null : null;
  }

  inBounds(fi, x, y) {
    const f = this.floor(fi);
    return !!f && x >= 0 && y >= 0 && x < f.cols && y < f.rows;
  }

  roomCells(fi) {
    const f = this.floor(fi);
    if (!f) return [];
    return Object.entries(f.cells).map(([k, c]) => ({ ...parseCellKey(k), cell: c }));
  }

  findRoom(fi, roomId) {
    return this.roomCells(fi).find((r) => r.cell.room === roomId) || null;
  }

  countRooms(roomId, fi = null) {
    let n = 0;
    const list = fi === null ? this.floors.map((_, i) => i) : [fi];
    for (const i of list) for (const r of this.roomCells(i)) if (r.cell.room === roomId) n++;
    return n;
  }

  roomCapacity(cell) {
    const rd = ROOMS[cell.room];
    if (!rd) return 0;
    let cap = rd.capacity;
    if (rd.guardianOnly) return cap;
    for (const ms of rd.milestones || []) if (cell.level >= ms.level && ms.capacity) cap += ms.capacity;
    const rc = this.game.mods.get().roomCapacity || 0;
    if (rd.capacity > 0) {
      if (rc >= 1 && cell.room === 'combat') cap += 1;
      if (rc >= 2 && cell.room !== 'combat') cap += 1;
    }
    return cap;
  }

  // ------------------------------------------------------------------ déblocages
  isRoomUnlocked(roomId) {
    const rd = ROOMS[roomId];
    if (!rd || !rd.buildable) return false;
    if (!rd.unlock) return true;
    if (rd.unlock.research) return (this.game.state.research.levels[rd.unlock.research] || 0) > 0;
    if (rd.unlock.floor) return this.floors.length >= rd.unlock.floor;
    return true;
  }

  unlockText(roomId) {
    const rd = ROOMS[roomId];
    if (rd?.unlock?.research) return `Recherche : ${RESEARCH_MAP[rd.unlock.research]?.name}`;
    if (rd?.unlock?.floor) return `Étage ${rd.unlock.floor}`;
    return '';
  }

  // ------------------------------------------------------------------ coûts
  floorScale(fi) {
    return Math.pow(1.9, fi);
  }

  buildCost(fi, roomId) {
    const rd = ROOMS[roomId];
    const count = this.roomCells(fi).filter((r) => !ROOMS[r.cell.room].special).length;
    const mult = this.floorScale(fi) * Math.pow(1.07, count);
    return this.game.economy.applyCostMods(scaleCost(rd.cost, mult), 'roomCost');
  }

  upgradeCost(fi, cell) {
    const rd = ROOMS[cell.room];
    const mult = this.floorScale(fi) * Math.pow(ECONOMY.rooms.upgradeGrowth, cell.level) * 0.8;
    const base = { ...rd.cost };
    if (!base.gold) base.gold = 100;
    // Les cristaux et essences obscures ne sont demandés qu'à la construction.
    delete base.crystals;
    if (base.darkEssence) base.darkEssence = Math.ceil(base.darkEssence * 0.2);
    return this.game.economy.applyCostMods(scaleCost(base, mult), 'roomCost');
  }

  // ------------------------------------------------------------------ construction
  hasRoomNeighbor(fi, x, y, ignore = null) {
    return DIRS4.some(([dx, dy]) => {
      const k = cellKey(x + dx, y + dy);
      if (ignore && ignore === k) return false;
      return !!this.floor(fi).cells[k];
    });
  }

  checkRules(fi, x, y, roomId, cells) {
    const rd = ROOMS[roomId];
    if (rd.rules?.notAdjacent) {
      for (const [dx, dy] of DIRS4) {
        const n = cells[cellKey(x + dx, y + dy)];
        if (n && rd.rules.notAdjacent.includes(n.room)) return `${rd.name} ne peut pas être à côté d’une ${ROOMS[n.room].name}.`;
      }
    }
    // Règle inverse (ex : une salle gelée à côté de la lave)
    for (const [dx, dy] of DIRS4) {
      const n = cells[cellKey(x + dx, y + dy)];
      if (n && ROOMS[n.room].rules?.notAdjacent?.includes(roomId)) return `${rd.name} ne peut pas être à côté d’une ${ROOMS[n.room].name}.`;
    }
    return null;
  }

  canBuild(fi, x, y, roomId) {
    const rd = ROOMS[roomId];
    if (!rd || !rd.buildable) return { ok: false, reason: 'Salle inconnue' };
    if (!this.isRoomUnlocked(roomId)) return { ok: false, reason: `Verrouillé (${this.unlockText(roomId)})` };
    if (!this.inBounds(fi, x, y)) return { ok: false, reason: 'Hors de la grille' };
    if (this.cell(fi, x, y)) return { ok: false, reason: 'Case déjà occupée' };
    if (!this.hasRoomNeighbor(fi, x, y)) return { ok: false, reason: 'Doit être adjacente à une salle existante' };
    if (rd.maxPerFloor && this.countRooms(roomId, fi) >= rd.maxPerFloor) return { ok: false, reason: `Maximum ${rd.maxPerFloor} par étage` };
    const ruleErr = this.checkRules(fi, x, y, roomId, this.floor(fi).cells);
    if (ruleErr) return { ok: false, reason: ruleErr };
    const cost = this.buildCost(fi, roomId);
    if (!this.game.economy.canAfford(cost)) return { ok: false, reason: 'Ressources insuffisantes', cost };
    return { ok: true, cost };
  }

  build(fi, x, y, roomId) {
    const check = this.canBuild(fi, x, y, roomId);
    if (!check.ok) return check;
    this.game.economy.spend(check.cost);
    this.floor(fi).cells[cellKey(x, y)] = { room: roomId, level: 1, trap: null };
    this.game.codex.discover('rooms', roomId);
    this.game.stats.add('roomsBuilt', 1);
    this.game.master.addXp(5 + fi * 3);
    this.afterChange(fi, 'build');
    return { ok: true };
  }

  canUpgrade(fi, x, y) {
    const cell = this.cell(fi, x, y);
    if (!cell) return { ok: false, reason: 'Aucune salle' };
    const rd = ROOMS[cell.room];
    if (cell.level >= rd.maxLevel) return { ok: false, reason: 'Niveau maximum' };
    const cost = this.upgradeCost(fi, cell);
    if (!this.game.economy.canAfford(cost)) return { ok: false, reason: 'Ressources insuffisantes', cost };
    return { ok: true, cost };
  }

  upgrade(fi, x, y) {
    const check = this.canUpgrade(fi, x, y);
    if (!check.ok) return check;
    this.game.economy.spend(check.cost);
    const cell = this.cell(fi, x, y);
    cell.level++;
    this.game.stats.add('roomUpgrades', 1);
    this.game.stats.add('upgrades', 1);
    this.game.master.addXp(2 + fi);
    this.afterChange(fi, 'upgrade');
    return { ok: true, level: cell.level };
  }

  /** Vérifie que toutes les salles restent reliées à l'entrée. */
  isConnected(cells) {
    const keys = Object.keys(cells);
    const start = keys.find((k) => cells[k].room === 'entrance');
    if (!start) return false;
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const { x, y } = parseCellKey(queue.shift());
      for (const [dx, dy] of DIRS4) {
        const k = cellKey(x + dx, y + dy);
        if (cells[k] && !seen.has(k)) {
          seen.add(k);
          queue.push(k);
        }
      }
    }
    return seen.size === keys.length;
  }

  canRemove(fi, x, y) {
    const cell = this.cell(fi, x, y);
    if (!cell) return { ok: false, reason: 'Aucune salle' };
    if (ROOMS[cell.room].special) return { ok: false, reason: 'Cette salle ne peut pas être détruite.' };
    const cells = { ...this.floor(fi).cells };
    delete cells[cellKey(x, y)];
    if (!this.isConnected(cells)) return { ok: false, reason: 'Détruire cette salle couperait le donjon en deux.' };
    return { ok: true, refund: this.removeRefund(fi, cell) };
  }

  removeRefund(fi, cell) {
    const base = scaleCost(ROOMS[cell.room].cost, this.floorScale(fi) * ECONOMY.rooms.sellRefund);
    delete base.crystals;
    return base;
  }

  remove(fi, x, y) {
    const check = this.canRemove(fi, x, y);
    if (!check.ok) return check;
    const cell = this.cell(fi, x, y);
    for (const m of this.game.monsters.monstersAt(fi, x, y)) m.location = null;
    if (cell.trap) this.game.economy.add(this.game.traps.sellValue(fi, cell.trap), false);
    delete this.floor(fi).cells[cellKey(x, y)];
    this.game.economy.add(check.refund, false);
    this.game.bus.emit('monstersChanged');
    this.afterChange(fi, 'remove');
    return { ok: true, refund: check.refund };
  }

  canMove(fi, fx, fy, tx, ty) {
    const cell = this.cell(fi, fx, fy);
    if (!cell) return { ok: false, reason: 'Aucune salle' };
    if (cell.room === 'entrance') return { ok: false, reason: 'L’entrée ne peut pas être déplacée.' };
    if (!this.inBounds(fi, tx, ty)) return { ok: false, reason: 'Hors de la grille' };
    if (this.cell(fi, tx, ty)) return { ok: false, reason: 'Case de destination occupée' };
    const cells = { ...this.floor(fi).cells };
    delete cells[cellKey(fx, fy)];
    cells[cellKey(tx, ty)] = cell;
    if (!this.isConnected(cells)) return { ok: false, reason: 'La salle doit rester reliée au donjon.' };
    const ruleErr = this.checkRules(fi, tx, ty, cell.room, cells);
    if (ruleErr) return { ok: false, reason: ruleErr };
    const cost = this.game.economy.applyCostMods({ gold: Math.round(ECONOMY.rooms.moveCostGold * this.floorScale(fi)) });
    if (!this.game.economy.canAfford(cost)) return { ok: false, reason: 'Ressources insuffisantes', cost };
    return { ok: true, cost };
  }

  move(fi, fx, fy, tx, ty) {
    const check = this.canMove(fi, fx, fy, tx, ty);
    if (!check.ok) return check;
    this.game.economy.spend(check.cost);
    const f = this.floor(fi);
    const cell = f.cells[cellKey(fx, fy)];
    delete f.cells[cellKey(fx, fy)];
    f.cells[cellKey(tx, ty)] = cell;
    for (const m of this.game.monsters.monstersAt(fi, fx, fy)) m.location = { floor: fi, x: tx, y: ty };
    this.game.bus.emit('monstersChanged');
    this.afterChange(fi, 'move');
    return { ok: true };
  }

  /** Changer le type d'une salle (garde son niveau). */
  canChange(fi, x, y, roomId) {
    const cell = this.cell(fi, x, y);
    if (!cell) return { ok: false, reason: 'Aucune salle' };
    if (ROOMS[cell.room].special) return { ok: false, reason: 'Cette salle ne peut pas être transformée.' };
    if (cell.room === roomId) return { ok: false, reason: 'Même type de salle' };
    const rd = ROOMS[roomId];
    if (!this.isRoomUnlocked(roomId)) return { ok: false, reason: `Verrouillé (${this.unlockText(roomId)})` };
    if (rd.maxPerFloor && this.countRooms(roomId, fi) >= rd.maxPerFloor) return { ok: false, reason: `Maximum ${rd.maxPerFloor} par étage` };
    const cells = { ...this.floor(fi).cells };
    delete cells[cellKey(x, y)];
    const ruleErr = this.checkRules(fi, x, y, roomId, cells);
    if (ruleErr) return { ok: false, reason: ruleErr };
    const cost = scaleCost(this.buildCost(fi, roomId), 0.75);
    if (!this.game.economy.canAfford(cost)) return { ok: false, reason: 'Ressources insuffisantes', cost };
    return { ok: true, cost };
  }

  change(fi, x, y, roomId) {
    const check = this.canChange(fi, x, y, roomId);
    if (!check.ok) return check;
    this.game.economy.spend(check.cost);
    const cell = this.cell(fi, x, y);
    cell.room = roomId;
    if (ROOMS[roomId].trapSlots === 0 && cell.trap) {
      this.game.economy.add(this.game.traps.sellValue(fi, cell.trap), false);
      cell.trap = null;
    }
    // Monstres en trop / incompatibles retirés
    const cap = this.roomCapacity(cell);
    const occupants = this.game.monsters.monstersAt(fi, x, y);
    occupants.forEach((m, i) => {
      const sp = this.game.monsters.species(m);
      if (i >= cap || !!sp.guardian !== !!ROOMS[roomId].guardianOnly) m.location = null;
    });
    this.game.codex.discover('rooms', roomId);
    this.game.bus.emit('monstersChanged');
    this.afterChange(fi, 'change');
    return { ok: true };
  }

  // ------------------------------------------------------------------ agrandissement
  expandCost(fi, dir) {
    const f = this.floor(fi);
    const d = this.def(fi);
    const steps = f.cols - d.startCols + (f.rows - d.startRows);
    const e = ECONOMY.floors;
    return this.game.economy.applyCostMods(scaleCost(e.expandBaseCost, this.floorScale(fi) * Math.pow(e.expandGrowth, steps)), 'expandCost');
  }

  canExpand(fi, dir) {
    const f = this.floor(fi);
    const d = this.def(fi);
    if (dir === 'right' && f.cols >= d.maxCols) return { ok: false, reason: 'Largeur maximale atteinte' };
    if (dir === 'down' && f.rows >= d.maxRows) return { ok: false, reason: 'Profondeur maximale atteinte' };
    const cost = this.expandCost(fi, dir);
    if (!this.game.economy.canAfford(cost)) return { ok: false, reason: 'Ressources insuffisantes', cost };
    return { ok: true, cost };
  }

  expand(fi, dir) {
    const check = this.canExpand(fi, dir);
    if (!check.ok) return check;
    this.game.economy.spend(check.cost);
    const f = this.floor(fi);
    if (dir === 'right') f.cols++;
    else f.rows++;
    this.game.stats.add('upgrades', 1);
    this.afterChange(fi, 'expand');
    return { ok: true };
  }

  // ------------------------------------------------------------------ étages
  floorUnlockCost(n) {
    const e = ECONOMY.floors;
    const cost = scaleCost(e.unlockBaseCost, Math.pow(e.unlockGrowth, n - 2));
    if (n >= 6) cost.darkEssence = Math.round(e.darkEssenceFromFloor * Math.pow(1.35, n - 6));
    return this.game.economy.applyCostMods(cost, 'floorCost');
  }

  nextFloorInfo() {
    const n = this.floors.length + 1;
    const prev = this.floor(n - 2);
    const prevDef = this.def(n - 2);
    const reasons = [];
    const needRaids = ECONOMY.floors.raidsToUnlockNext;
    if (prev.raidsDefended < needRaids) reasons.push(`Repousser ${needRaids} raids à l’étage ${n - 1} (${prev.raidsDefended}/${needRaids})`);
    let boss = null;
    if (prevDef.boss) {
      boss = prevDef.boss;
      const key = this.game.bosses.bossKey(n - 1);
      if (!this.game.state.bosses.defeated[key]) reasons.push(`Vaincre le gardien : ${boss.boss.name}`);
    }
    const cost = this.floorUnlockCost(n);
    const affordable = this.game.economy.canAfford(cost);
    return { number: n, cost, reasons, affordable, boss, ok: reasons.length === 0 && affordable };
  }

  unlockNextFloor() {
    const info = this.nextFloorInfo();
    if (!info.ok) return { ok: false, reason: info.reasons[0] || 'Ressources insuffisantes' };
    this.game.economy.spend(info.cost);
    const extra = this.game.mods.get().floorSize || 0;
    const f = createFloorState(info.number, extra);
    f.lastRaidAt = Date.now();
    this.floors.push(f);
    const s = this.game.state;
    s.stats.maxFloor = Math.max(s.stats.maxFloor, this.floors.length);
    s.prestige.bestFloor = Math.max(s.prestige.bestFloor, this.floors.length);
    this.game.stats.add('floorsUnlocked', 1);
    this.game.stats.emitChange('maxFloor');
    this.game.master.addXp(50 * info.number);
    this.game.bus.emit('floorsChanged');
    this.game.bus.emit('sfx', 'unlock');
    this.game.requestSave(true);
    return { ok: true, floor: this.floors.length - 1 };
  }

  // ------------------------------------------------------------------ production & bonus
  productionPerMin(fi = null) {
    const out = {};
    const prod = 1 + (this.game.mods.get().productionGain || 0);
    const list = fi === null ? this.floors.map((_, i) => i) : [fi];
    for (const i of list) {
      for (const r of this.roomCells(i)) {
        const rd = ROOMS[r.cell.room];
        if (!rd.production) continue;
        const lvl = Math.pow(1.15, r.cell.level - 1) * (1 + i * 0.5);
        for (const [k, v] of Object.entries(rd.production)) out[k] = (out[k] || 0) + v * lvl * prod;
      }
    }
    return out;
  }

  rewardBonus(fi) {
    let b = 0;
    for (const r of this.roomCells(fi)) {
      const rd = ROOMS[r.cell.room];
      if (rd.rewardBonus) b += rd.rewardBonus + (rd.rewardPerLevel || 0) * (r.cell.level - 1);
    }
    return b;
  }

  // ------------------------------------------------------------------ chemin des aventuriers
  /**
   * Parcours des aventuriers : exploration en profondeur depuis l'entrée, la branche menant
   * au coffre est explorée en dernier ; le parcours se termine sur le coffre.
   * Retourne une liste de cases adjacentes successives.
   */
  computeTour(fi) {
    const f = this.floor(fi);
    const cells = f.cells;
    const entranceKey = Object.keys(cells).find((k) => cells[k].room === 'entrance');
    const coreKey = Object.keys(cells).find((k) => cells[k].room === 'core');
    if (!entranceKey) return [];
    // Arbre BFS
    const parent = { [entranceKey]: null };
    const order = [entranceKey];
    for (let i = 0; i < order.length; i++) {
      const { x, y } = parseCellKey(order[i]);
      for (const [dx, dy] of DIRS4) {
        const k = cellKey(x + dx, y + dy);
        if (cells[k] && !(k in parent)) {
          parent[k] = order[i];
          order.push(k);
        }
      }
    }
    const children = {};
    for (const k of order) children[k] = [];
    for (const k of order) if (parent[k]) children[parent[k]].push(k);
    // Branche du coffre
    const corePath = new Set();
    let c = coreKey && coreKey in parent ? coreKey : null;
    while (c) {
      corePath.add(c);
      c = parent[c];
    }
    const tour = [];
    const visit = (k) => {
      tour.push(parseCellKey(k));
      if (k === coreKey) return true;
      const kids = children[k].slice().sort((a, b) => (corePath.has(a) ? 1 : 0) - (corePath.has(b) ? 1 : 0));
      for (const ch of kids) {
        const reachedCore = visit(ch);
        if (reachedCore) return true;
        tour.push(parseCellKey(k));
      }
      return false;
    };
    visit(entranceKey);
    return tour;
  }

  afterChange(fi, kind) {
    this.game.bus.emit('dungeonChanged', fi);
    if (kind === 'build' || kind === 'upgrade' || kind === 'expand') this.game.bus.emit('sfx', 'build');
    this.game.requestSave();
  }
}
