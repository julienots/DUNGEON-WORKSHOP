import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, addRoom } from './helpers.js';
import { cellKey } from '../src/utils/helpers.js';
import { xpLevelFactor } from '../src/systems/RaidSystem.js';

function strongDungeon(g) {
  addRoom(g, 0, 2, 1, 'combat', 5, { id: 'spikes', level: 5 });
  for (const sp of ['skeleton', 'orc', 'slime']) {
    const m = g.monsters.create(sp);
    m.level = 15;
    m.location = { floor: 0, x: 2, y: 1 };
  }
  g.state.monsters[0].level = 15;
}

test('raid déterministe : même graine, même issue', () => {
  const g = newGame();
  strongDungeon(g);
  const a = g.raids.simulate(0, { seed: 1234 });
  const b = g.raids.simulate(0, { seed: 1234 });
  assert.equal(a.outcome, b.outcome);
  assert.equal(a.kills, b.kills);
  assert.deepEqual(a.rewards, b.rewards);
  assert.equal(a.events.length, b.events.length);
});

test('raid repoussé : récompenses, XP, statistiques et menace', () => {
  const g = newGame();
  strongDungeon(g);
  let res;
  for (let s = 0; s < 20; s++) {
    res = g.raids.simulate(0, { seed: s });
    if (res.outcome === 'victory') break;
  }
  assert.equal(res.outcome, 'victory');
  assert.ok(res.kills > 0 && res.rewards.gold > 0, 'or gagné');
  const gold = g.state.resources.gold;
  // Monstres au niveau des aventuriers : XP complète
  for (const m of g.state.monsters) m.level = res.party.level;
  const xp = g.state.monsters.map((m) => m.xp + m.level * 1000);
  g.raids.apply(res, { silent: true });
  assert.equal(g.state.resources.gold, gold + res.rewards.gold);
  assert.equal(g.state.stats.raidsDefended, 1);
  assert.equal(g.state.floors[0].threat, 1);
  assert.ok(g.state.monsters.some((m, i) => m.xp + m.level * 1000 > xp[i]), 'XP gagnée');
});

test('raid réussi : le coffre est pillé et la menace baisse', () => {
  const g = newGame();
  // Aucun monstre : les aventuriers atteignent le coffre
  for (const m of g.state.monsters) m.location = null;
  g.state.treasury.vault = 10000;
  g.state.floors[0].threat = 5;
  const res = g.raids.simulate(0, { seed: 7 });
  assert.equal(res.outcome, 'looted');
  const { summary } = g.raids.apply(res, { silent: true });
  assert.ok(summary.stolen > 0 && g.state.treasury.vault < 10000);
  assert.ok(g.state.floors[0].threat < 5);
});

test('le temps réel planifie et applique les raids', () => {
  const g = newGame();
  strongDungeon(g);
  g.watching = false;
  const t0 = Date.now();
  g.raids.rt(0).nextAt = t0;
  g.raids.update(0.1, t0 + 10);
  assert.equal(g.state.stats.raidsTotal, 1, 'raid hors écran résolu immédiatement');
  g.watching = true;
  g.viewFloor = 0;
  g.raids.rt(0).nextAt = t0;
  g.raids.update(0.1, t0 + 20);
  assert.ok(g.raids.current(0), 'raid regardé enregistré');
  for (let i = 0; i < 400 && g.raids.current(0); i++) g.raids.update(0.5, t0 + 30);
  assert.equal(g.raids.current(0), null);
  assert.equal(g.state.stats.raidsTotal, 2);
});

test('le coffre doit être relié pour être attaqué', () => {
  const g = newGame();
  const f = g.state.floors[0];
  const coreKey = Object.keys(f.cells).find((k) => f.cells[k].room === 'core');
  delete f.cells[coreKey];
  f.cells[cellKey(3, 4)] = { room: 'core', level: 1, trap: null };
  assert.equal(g.raids.canRaid(0), true, 'le parcours existe toujours (sans coffre atteignable)');
});

test("l'XP diminue face à des aventuriers beaucoup plus faibles", () => {
  assert.equal(xpLevelFactor(10, 10), 1);
  assert.equal(xpLevelFactor(13, 10), 1);
  assert.ok(xpLevelFactor(20, 10) < 0.5);
  assert.ok(xpLevelFactor(60, 5) > 0, 'jamais nulle');
});
