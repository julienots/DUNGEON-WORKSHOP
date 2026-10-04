import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Battle, makeUnit, simulateBattle, elementMultiplier } from '../src/systems/CombatSystem.js';
import { RNG } from '../src/utils/rng.js';
import { newGame } from './helpers.js';
import { BOSSES } from '../src/data/bosses.js';

function unit(id, side, over = {}) {
  return makeUnit({ id, side, name: id, family: 'goblin', element: 'neutral', level: 5, hp: 200, atk: 30, def: 10, spd: 12, basic: 'basic_melee', skills: [], mods: {}, ...over });
}

test('le combat se termine avec un vainqueur et des événements lisibles', () => {
  const r = simulateBattle({ rng: new RNG(1), sideA: [unit('a', 'A', { atk: 60 })], sideB: [unit('b', 'B')] });
  assert.equal(r.winner, 'A');
  assert.ok(r.events.some((e) => e.type === 'dmg'));
  assert.ok(r.events.some((e) => e.type === 'death' && e.tgt === 'b'));
  assert.equal(r.events.at(-1).type, 'end');
});

test('le combat est déterministe pour une même graine', () => {
  const run = (seed) => simulateBattle({ rng: new RNG(seed), sideA: [unit('a', 'A', { skills: ['goblin_stab'] })], sideB: [unit('b', 'B', { skills: ['hero_cleave'] })], record: true });
  const a = run(42);
  const b = run(42);
  assert.equal(a.winner, b.winner);
  assert.deepEqual(a.events.map((e) => [e.type, e.amount]), b.events.map((e) => [e.type, e.amount]));
});

test('avantages élémentaires', () => {
  assert.ok(elementMultiplier('fire', 'ice') > 1);
  assert.ok(elementMultiplier('fire', 'fire') < 1);
  assert.equal(elementMultiplier('neutral', 'fire'), 1);
});

test('statuts : le poison inflige des dégâts périodiques', () => {
  const b = new Battle({ rng: new RNG(3), record: true });
  const target = unit('t', 'B', { hp: 1000 });
  b.addUnits([unit('s', 'A', { atk: 1, spd: 0.01 }), target]);
  b.start();
  b.applyStatus(b.units[0], target, { id: 'poison', duration: 5, power: 1 });
  const before = target.hp;
  b.advanceStatuses(3);
  assert.ok(target.hp < before, 'le poison doit faire des dégâts');
});

test('les boss changent de phase et invoquent', () => {
  const g = newGame();
  const boss = g.bosses.bossUnit(BOSSES.colossal_golem, 5, 0);
  const heroes = Array.from({ length: 5 }, (_, i) => unit(`m${i}`, 'A', { atk: 400, hp: 5000, def: 50 }));
  const r = simulateBattle({ rng: new RNG(9), sideA: heroes, sideB: [boss], maxTime: 120 });
  assert.ok(r.events.filter((e) => e.type === 'phase').length >= 1, 'au moins une phase');
  assert.ok(r.events.some((e) => e.type === 'summon'), 'invocation en phase finale');
});

test('pièges : synergie détectée et dégâts appliqués', () => {
  const g = newGame();
  const fi = 0;
  g.state.floors[0].cells['2,1'] = { room: 'toxic', level: 1, trap: { id: 'fire', level: 1 } };
  const syn = g.traps.synergiesAt(fi, 2, 1);
  assert.ok(syn.some((s) => s.id === 'burning_poison'), 'feu + poison = poison brûlant');
  const t = g.traps.trapUnit(fi, 2, 1);
  const b = new Battle({ rng: new RNG(5), record: true });
  const hero = unit('h', 'B', { hp: 500 });
  b.addUnits([hero]);
  b.trapStrike(t);
  assert.ok(hero.hp < 500);
  assert.equal(b.stats.synergyTriggers, 1);
});
