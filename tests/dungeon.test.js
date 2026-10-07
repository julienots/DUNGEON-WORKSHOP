import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, rich, addRoom } from './helpers.js';

test('construction : adjacence, coût et sauvegarde demandée', () => {
  const g = newGame();
  const gold = g.state.resources.gold;
  assert.equal(g.dungeon.canBuild(0, 3, 4, 'combat').ok, false, 'case isolée refusée');
  const r = g.dungeon.build(0, 2, 1, 'combat');
  assert.ok(r.ok, r.reason);
  assert.ok(g.state.resources.gold < gold, 'or dépensé');
  assert.equal(g.dungeon.cell(0, 2, 1).room, 'combat');
  assert.equal(g.state.stats.roomsBuilt, 1);
  assert.ok(g.saveDirty, 'sauvegarde demandée');
});

test('règles de placement : lave et glace ne se touchent pas', () => {
  const g = newGame();
  rich(g);
  g.state.research.levels.arch_elemental_rooms = 1;
  assert.ok(g.dungeon.build(0, 2, 1, 'lava').ok);
  const r = g.dungeon.canBuild(0, 3, 1, 'frozen');
  assert.equal(r.ok, false);
});

test('destruction impossible si elle coupe le donjon', () => {
  const g = newGame();
  rich(g);
  // La salle basique relie l'entrée au coffre
  const r = g.dungeon.canRemove(0, 1, 1);
  assert.equal(r.ok, false);
  g.dungeon.build(0, 2, 1, 'combat');
  assert.ok(g.dungeon.remove(0, 2, 1).ok);
});

test('déplacement et agrandissement', () => {
  const g = newGame();
  rich(g);
  g.dungeon.build(0, 2, 1, 'combat');
  assert.ok(g.dungeon.move(0, 2, 1, 0, 1).ok);
  assert.equal(g.dungeon.cell(0, 0, 1).room, 'combat');
  const cols = g.state.floors[0].cols;
  assert.ok(g.dungeon.expand(0, 'right').ok);
  assert.equal(g.state.floors[0].cols, cols + 1);
});

test('le parcours des aventuriers visite tout et finit au coffre', () => {
  const g = newGame();
  addRoom(g, 0, 2, 1, 'combat');
  addRoom(g, 0, 0, 1, 'basic');
  addRoom(g, 0, 0, 2, 'basic');
  const tour = g.dungeon.computeTour(0);
  const last = tour.at(-1);
  assert.equal(g.dungeon.cell(0, last.x, last.y).room, 'core');
  for (const key of Object.keys(g.state.floors[0].cells)) {
    const [x, y] = key.split(',').map(Number);
    assert.ok(tour.some((t) => t.x === x && t.y === y), `case ${key} visitée`);
  }
  for (let i = 1; i < tour.length; i++) {
    assert.equal(Math.abs(tour[i].x - tour[i - 1].x) + Math.abs(tour[i].y - tour[i - 1].y), 1, 'pas adjacents');
  }
});

test("déblocage d'étage : conditions puis création", () => {
  const g = newGame();
  rich(g);
  assert.equal(g.dungeon.unlockNextFloor().ok, false, 'raids requis');
  g.state.floors[0].raidsDefended = 1000;
  const r = g.dungeon.unlockNextFloor();
  assert.ok(r.ok, r.reason);
  assert.equal(g.state.floors.length, 2);
  assert.ok(g.dungeon.findRoom(1, 'entrance') && g.dungeon.findRoom(1, 'core'));
});

test('étage 6 bloqué par le gardien de l’étage 5', () => {
  const g = newGame();
  rich(g);
  for (let i = 0; i < 4; i++) {
    g.state.floors[g.state.floors.length - 1].raidsDefended = 1000;
    assert.ok(g.dungeon.unlockNextFloor().ok);
  }
  g.state.floors[4].raidsDefended = 1000;
  const info = g.dungeon.nextFloorInfo();
  assert.equal(info.ok, false);
  assert.ok(info.reasons.some((r) => r.includes('gardien')));
});

test('reconquête : un étage déjà atteint lors d’une partie précédente exige 4× moins de raids', () => {
  const g = newGame();
  rich(g);
  const normal = g.dungeon.nextFloorInfo();
  assert.equal(normal.reconquest, false);
  assert.ok(normal.reasons[0].includes('8 raids'), normal.reasons[0]);
  g.state.prestige.bestFloor = 20;
  const re = g.dungeon.nextFloorInfo();
  assert.equal(re.reconquest, true);
  assert.ok(re.reasons[0].includes('2 raids'), re.reasons[0]);
  g.state.floors[0].raidsDefended = 2;
  assert.ok(g.dungeon.unlockNextFloor().ok);
});
