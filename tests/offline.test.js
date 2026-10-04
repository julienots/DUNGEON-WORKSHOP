import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, addRoom } from './helpers.js';
import { ECONOMY } from '../src/config/economy.js';

const H = 3600 * 1000;

function setup() {
  const g = newGame();
  addRoom(g, 0, 2, 1, 'combat', 3, { id: 'spikes', level: 3 });
  for (const sp of ['skeleton', 'slime']) {
    const m = g.monsters.create(sp);
    m.level = 8;
    m.location = { floor: 0, x: 2, y: 1 };
  }
  g.state.monsters[0].level = 8;
  return g;
}

test('8h hors ligne : raids simulés, gains et rapport', () => {
  const g = setup();
  const now = Date.now();
  const gold = g.state.resources.gold;
  const r = g.offline.run(now - 8 * H, now);
  assert.ok(r.raids > 500, `nombre de raids (${r.raids})`);
  assert.equal(r.raids, r.defeated + r.succeeded);
  assert.ok(r.rewards.gold > 0);
  assert.ok(g.state.resources.gold > gold);
  assert.ok(r.vault > 0, 'le trésor se remplit');
  assert.equal(g.state.stats.offlineReturns, 1);
});

test('le temps hors ligne est plafonné', () => {
  const g = setup();
  const now = Date.now();
  const r = g.offline.run(now - 100 * H, now);
  assert.ok(r.capped);
  assert.equal(r.seconds, ECONOMY.offline.baseCapHours * 3600);
});

test('horloge reculée : aucun gain', () => {
  const g = setup();
  const now = Date.now();
  const gold = g.state.resources.gold;
  const r = g.offline.run(now + H, now);
  assert.ok(r.suspicious);
  assert.equal(g.state.resources.gold, gold);
});

test('les recherches se terminent hors ligne', () => {
  const g = setup();
  const now = Date.now();
  assert.ok(g.research.start('eco_income', now - 2 * H).ok);
  const r = g.offline.run(now - H, now);
  assert.deepEqual(r.researchDone, ['eco_income']);
  assert.equal(g.research.level('eco_income'), 1);
});

test('absence trop courte : pas de rapport', () => {
  const g = setup();
  const now = Date.now();
  assert.equal(g.offline.run(now - 10 * 1000, now), null);
});
