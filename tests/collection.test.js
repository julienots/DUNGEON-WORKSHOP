import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHEST_IDS, CHESTS } from '../src/data/chests.js';
import { SKIN_IDS, DECORATION_IDS } from '../src/data/cosmetics.js';
import { BOSSES } from '../src/data/bosses.js';
import { UNIQUE_ARTIFACTS } from '../src/data/equipment.js';
import { PASSIVES } from '../src/data/passives.js';
import { RNG } from '../src/utils/rng.js';
import { newGame, rich, addRoom } from './helpers.js';

test('coffres : 6 raretés, ouverture et récompenses réelles', () => {
  assert.equal(CHEST_IDS.length, 6);
  const g = newGame();
  for (const id of CHEST_IDS) {
    g.collection.addChest(id, 2);
    const before = JSON.stringify(g.state.resources) + g.state.monsters.length + g.state.equipment.length;
    const r = g.collection.open(id, new RNG(7));
    assert.ok(r.ok);
    assert.equal(r.items.length, CHESTS[id].rolls);
    assert.notEqual(JSON.stringify(g.state.resources) + g.state.monsters.length + g.state.equipment.length + JSON.stringify(g.state.collection), before);
    assert.equal(g.state.collection.chests[id], 1);
  }
  assert.equal(g.collection.open('rare').ok, true);
  assert.equal(g.collection.open('rare').ok, false, 'plus de coffre');
});

test('coffres : sources (boss, niveaux du Maître) et achat', () => {
  const g = newGame();
  rich(g);
  const n0 = g.collection.totalChests();
  g.master.addXp(1e7);
  assert.ok(g.collection.totalChests() > n0, 'paliers de niveau');
  assert.ok(g.collection.buy('epic').ok);
});

test('skins et décorations : déblocage, application, pose', () => {
  const g = newGame();
  const m = g.state.monsters[0];
  assert.equal(g.collection.setSkin(m.uid, 'lava').ok, false);
  g.state.collection.skins.lava = true;
  assert.ok(g.collection.setSkin(m.uid, 'lava').ok);
  assert.equal(g.monsters.toUnit(m).sprite, `mon_${m.speciesId}__lava`);
  assert.deepEqual(g.monsters.computeStats(m).hp, g.monsters.computeStats({ ...m, skin: 'classic' }).hp, 'aucun effet en jeu');
  const cell = Object.keys(g.state.floors[0].cells)[0].split(',').map(Number);
  assert.equal(g.collection.placeDecoration(0, cell[0], cell[1], 'statue').ok, false);
  g.state.collection.decorations.statue = 1;
  assert.ok(g.collection.placeDecoration(0, cell[0], cell[1], 'statue').ok);
  assert.equal(g.collection.decorationsFree('statue'), 0);
  assert.ok(SKIN_IDS.length >= 6 && DECORATION_IDS.length >= 10);
});

test('sérum : mutation gratuite', () => {
  const g = newGame();
  addRoom(g, 0, 0, 1, 'mutation');
  g.state.collection.serums = 1;
  const r = g.collection.useSerum(g.state.monsters[0].uid);
  assert.ok(r.ok, r.reason);
  assert.equal(g.state.collection.serums, 0);
  assert.equal(g.state.monsters[0].mutations.length, 1);
});

test('nouveaux boss épiques : passifs et artefacts valides', () => {
  for (const id of ['vampire_queen', 'king_of_the_dead']) {
    const b = BOSSES[id];
    assert.ok(PASSIVES[b.passive]);
    assert.ok(UNIQUE_ARTIFACTS[b.rewards.first.artifact]);
    assert.equal(b.phases.length, 3);
  }
});

test('codex 2.0 et lore : 8 catégories, déblocage par la progression', async () => {
  const { CODEX_CATEGORIES } = await import('../src/systems/CodexSystem.js');
  for (const c of ['monsters', 'rooms', 'traps', 'bosses', 'equipment', 'mutations', 'biomes', 'lore']) assert.ok(CODEX_CATEGORIES.includes(c));
  const g = newGame();
  for (const c of CODEX_CATEGORIES) assert.ok(g.codex.count(c).total > 0, c);
  let pages = [];
  g.bus.on('loreDiscovered', (l) => pages.push(l.id));
  g.codex.checkLore();
  assert.ok(g.codex.has('lore', 'l_first_stone'), 'première page connue dès le départ');
  g.state.stats.maxFloor = 6;
  g.codex.checkLore();
  assert.ok(pages.includes('l_mag_2'));
  const n = pages.length;
  g.codex.checkLore();
  assert.equal(pages.length, n, 'pas de doublon');
});
