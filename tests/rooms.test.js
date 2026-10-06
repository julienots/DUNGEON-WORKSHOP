import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROOMS, ROOM_CATEGORIES } from '../src/data/rooms.js';
import { ROOM_SYNERGIES } from '../src/data/roomSynergies.js';
import { TRAPS } from '../src/data/traps.js';
import { newGame, addRoom, rich } from './helpers.js';
import { cellKey } from '../src/utils/helpers.js';

const unlockAll = (g) => {
  for (let i = 0; i < 9; i++) g.state.floors.push({ ...g.state.floors[0], number: i + 2, cells: { '0,0': { room: 'entrance', level: 1, trap: null } } });
  for (const r of Object.values(ROOMS)) if (r.unlock?.research) g.state.research.levels[r.unlock.research] = 1;
};

test('données : catégories et synergies valides', () => {
  for (const r of Object.values(ROOMS)) if (r.buildable) assert.ok(ROOM_CATEGORIES[r.category], `${r.id} sans catégorie`);
  const tags = ['@any', '@monster', '@elemental'];
  for (const s of ROOM_SYNERGIES) {
    assert.ok(ROOMS[s.room] || tags.includes(s.room), `${s.id}: room ${s.room}`);
    if (s.with) assert.ok(ROOMS[s.with] || tags.includes(s.with), `${s.id}: with ${s.with}`);
    if (s.trap && s.trap !== 'any') assert.ok(Object.values(TRAPS).some((t) => t.element === s.trap), `${s.id}: trap ${s.trap}`);
    assert.ok(Object.keys(s.effect).length > 0);
  }
  assert.ok(ROOM_SYNERGIES.length >= 25);
});

test('synergie de production : forge à côté de la lave +20%', () => {
  const g = newGame();
  addRoom(g, 0, 0, 1, 'forge');
  const base = g.dungeon.productionPerMin(0).metal;
  addRoom(g, 0, 1, 1, 'lava');
  const boosted = g.dungeon.productionPerMin(0).metal;
  assert.ok(Math.abs(boosted / base - 1.2) < 1e-6, `${boosted / base}`);
  const syn = g.dungeon.synergiesAt(0, 0, 1);
  assert.equal(syn[0].syn.id, 'lava_forge');
  assert.deepEqual(syn[0].partner, { x: 1, y: 1 });
});

test('synergie de monstres : stats et XP appliquées en raid', () => {
  const g = newGame();
  const m = g.state.monsters[0];
  const loc = m.location;
  const base = g.monsters.computeStats(m, { roomId: 'basic', level: 1, eff: g.dungeon.roomEffects(0, loc.x, loc.y) });
  addRoom(g, 0, loc.x + 1, loc.y, 'master');
  const eff = g.dungeon.roomEffects(0, loc.x, loc.y);
  assert.ok(eff.hp > 0);
  const boosted = g.monsters.computeStats(m, { roomId: 'basic', level: 1, eff });
  assert.ok(boosted.hp > base.hp);
  addRoom(g, 0, loc.x - 1, loc.y, 'lab');
  assert.ok(g.dungeon.xpMultAt(m) > 1.1);
  const res = g.raids.simulate(0, { seed: 5 });
  if (res.participants.includes(m.uid)) assert.ok(res.xpBonus[m.uid] > 1);
});

test('synergie salle + piège : chambre toxique + gaz toxique +30%', () => {
  const g = newGame();
  addRoom(g, 0, 0, 1, 'toxic', 1, { id: 'poison', level: 1 });
  addRoom(g, 0, 0, 2, 'basic', 1, { id: 'poison', level: 1 });
  const a = g.traps.trapUnit(0, 0, 1).damage;
  const b = g.traps.trapUnit(0, 0, 2).damage;
  assert.ok(a >= b * 1.2, `${a} vs ${b}`);
});

test('aperçu avant construction : synergies gagnées', () => {
  const g = newGame();
  addRoom(g, 0, 0, 1, 'forge');
  assert.equal(g.dungeon.cell(0, 0, 2), null);
  const prev = g.dungeon.previewSynergies(0, 0, 2, 'lava');
  assert.ok(prev.some((p) => p.syn.id === 'lava_forge' && p.x === 0 && p.y === 1));
  assert.equal(g.dungeon.cell(0, 0, 2), null, 'aucune modification réelle');
});

test('nouvelles salles : limite globale, danger, bonus globaux, arène, portails', () => {
  const g = newGame();
  unlockAll(g);
  rich(g);
  const f = g.state.floors[0];
  const ex = Object.entries(f.cells).find(([, c]) => c.room === 'entrance')[0].split(',').map(Number);
  // Salle du maître : une seule dans tout le donjon
  const free = [];
  for (let y = 0; y < f.rows; y++) for (let x = 0; x < f.cols; x++) if (!f.cells[cellKey(x, y)] && g.dungeon.hasRoomNeighbor(0, x, y)) free.push([x, y]);
  const [mx, my] = free[0];
  const r1 = g.dungeon.build(0, mx, my, 'master');
  assert.ok(r1.ok, r1.reason);
  const hp0 = g.mods.get().monsterHp;
  assert.ok(hp0 >= 0.05, 'bonus global de la salle du maître');
  const others = [];
  for (let y = 0; y < f.rows; y++) for (let x = 0; x < f.cols; x++) if (!f.cells[cellKey(x, y)] && g.dungeon.hasRoomNeighbor(0, x, y)) others.push([x, y]);
  assert.equal(g.dungeon.canBuild(0, others[0][0], others[0][1], 'master').ok, false);
  // Chambre maudite : aventuriers plus forts
  const lvl0 = g.adventurers.partyLevel(1, 0);
  addRoom(g, 0, ex[0], ex[1] + 5, 'cursed');
  assert.equal(g.adventurers.partyLevel(1, 0), lvl0 + 3);
  // Arène : boss d'événement disponibles
  assert.equal(g.bosses.arenaBosses().length, 0);
  addRoom(g, 0, ex[0] + 1, ex[1] + 5, 'arena');
  assert.ok(g.bosses.arenaBosses().length >= 3);
  // Portails : bonus de récompenses des modes
  addRoom(g, 0, ex[0] + 2, ex[1] + 5, 'portal');
  assert.ok(g.dungeon.runRewardBonus() >= 0.1);
  assert.ok(g.dungeon.productionPerMin(0).dimensionalFragments > 0);
});

test('salle d’entraînement : XP passive, y compris hors ligne', () => {
  const g = newGame();
  const m = g.state.monsters[0];
  addRoom(g, 0, 0, 1, 'training');
  m.location = { floor: 0, x: 0, y: 1 };
  const lv = m.level;
  const ups = g.dungeon.trainTick(3600);
  assert.ok(ups > 0 && m.level > lv);
  // Hors ligne : même mécanique
  const lv2 = m.level;
  const report = g.offline.run(Date.now() - 4 * 3600e3, Date.now());
  assert.ok(m.level > lv2 || report.levelUps > 0);
});
